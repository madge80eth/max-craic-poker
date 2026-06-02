// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title CraicHomeGame
/// @notice Trustless bracket poker tournaments for web3 communities
///
/// Flow:
///   1. Creator calls createGame() — sets buy-in token/amount and protocol fee
///   2. Players call join() — buy-in transferred to escrow
///   3. Sponsors call sponsor() — add any ERC-20 or ETH to the prize pool
///   4. Backend signer calls completeGame() — records payouts, takes protocol fee
///   5. Winners call claim() to collect their tokens
///   6. After 48h unclaimed window, anyone can call refundUnclaimed() → remainder to creator
contract CraicHomeGame is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public signer;
    address public owner;
    address public protocolWallet;

    uint16 public constant MIN_FEE_BPS = 100; // 1%
    uint16 public constant MAX_FEE_BPS = 500; // 5%
    uint256 public constant CLAIM_WINDOW = 48 hours;

    enum GameStatus {
        Open,
        Active,
        Completed,
        Cancelled
    }

    struct Game {
        string gameId;
        address creator;
        address buyInToken; // address(0) = ETH buy-in, or ERC-20 address
        uint256 buyInAmount; // 0 = free game
        uint16 protocolFeeBps;
        uint8 playerCount;
        GameStatus status;
        uint256 createdAt;
        uint256 completedAt;
    }

    struct Deposit {
        address depositor;
        address token; // address(0) = ETH
        uint256 amount;
    }

    mapping(bytes32 => Game) public games;
    mapping(bytes32 => address[]) internal _players;
    mapping(bytes32 => mapping(address => bool)) public hasJoined;

    // Token tracking per game
    mapping(bytes32 => address[]) internal _gameTokens;
    mapping(bytes32 => mapping(address => bool)) internal _tokenTracked;
    mapping(bytes32 => mapping(address => uint256)) public tokenBalance;

    // Deposit log for cancel refunds
    mapping(bytes32 => Deposit[]) internal _deposits;

    // Payout records (set by completeGame, withdrawn by claim)
    mapping(bytes32 => address[]) internal _winners;
    mapping(bytes32 => mapping(address => mapping(address => uint256))) internal _payoutAmount;
    mapping(bytes32 => mapping(address => bool)) public hasClaimed;

    // ─── Events ───

    event GameCreated(
        bytes32 indexed gameHash,
        string gameId,
        address indexed creator,
        address buyInToken,
        uint256 buyInAmount,
        uint16 protocolFeeBps
    );
    event PlayerJoined(bytes32 indexed gameHash, address indexed player, uint8 playerCount);
    event GameStarted(bytes32 indexed gameHash, uint8 playerCount);
    event GameCompleted(bytes32 indexed gameHash, uint256 completedAt);
    event PayoutClaimed(bytes32 indexed gameHash, address indexed winner, address indexed token, uint256 amount);
    event ProtocolFeeCollected(bytes32 indexed gameHash, address indexed token, uint256 amount);
    event GameCancelled(bytes32 indexed gameHash, string reason);
    event DepositRefunded(bytes32 indexed gameHash, address indexed depositor, address indexed token, uint256 amount);
    event SponsorDeposit(bytes32 indexed gameHash, address indexed sponsor, address indexed token, uint256 amount);
    event UnclaimedRefunded(bytes32 indexed gameHash, address indexed creator, uint256 tokenCount);

    // ─── Errors ───

    error NotAuthorized();
    error GameNotFound();
    error GameNotOpen();
    error GameNotActive();
    error GameNotCompleted();
    error AlreadyJoined();
    error AlreadyClaimed();
    error InvalidParams();
    error InvalidFee();
    error DistributionExceedsBalance();
    error ClaimWindowOpen();
    error NothingToClaim();
    error NothingToRefund();
    error WrongETHAmount();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }

    modifier onlySigner() {
        if (msg.sender != signer) revert NotAuthorized();
        _;
    }

    constructor(address _signer, address _protocolWallet) {
        require(_signer != address(0) && _protocolWallet != address(0), "zero addr");
        signer = _signer;
        owner = msg.sender;
        protocolWallet = _protocolWallet;
    }

    // ──────────────────────────── Game Lifecycle ────────────────────────────

    function createGame(
        string calldata gameId,
        address buyInToken,
        uint256 buyInAmount,
        uint16 protocolFeeBps
    ) external returns (bytes32 gameHash) {
        if (bytes(gameId).length == 0) revert InvalidParams();
        if (protocolFeeBps < MIN_FEE_BPS || protocolFeeBps > MAX_FEE_BPS) revert InvalidFee();

        gameHash = keccak256(abi.encodePacked(gameId, block.timestamp, msg.sender));
        if (games[gameHash].createdAt != 0) revert InvalidParams();

        games[gameHash] = Game({
            gameId: gameId,
            creator: msg.sender,
            buyInToken: buyInToken,
            buyInAmount: buyInAmount,
            protocolFeeBps: protocolFeeBps,
            playerCount: 0,
            status: GameStatus.Open,
            createdAt: block.timestamp,
            completedAt: 0
        });

        emit GameCreated(gameHash, gameId, msg.sender, buyInToken, buyInAmount, protocolFeeBps);
    }

    function join(bytes32 gameHash) external payable nonReentrant {
        Game storage g = games[gameHash];
        if (g.createdAt == 0) revert GameNotFound();
        if (g.status != GameStatus.Open) revert GameNotOpen();
        if (hasJoined[gameHash][msg.sender]) revert AlreadyJoined();

        if (g.buyInAmount > 0) {
            if (g.buyInToken == address(0)) {
                if (msg.value != g.buyInAmount) revert WrongETHAmount();
                _trackDeposit(gameHash, msg.sender, address(0), msg.value);
            } else {
                if (msg.value > 0) revert InvalidParams();
                IERC20(g.buyInToken).safeTransferFrom(msg.sender, address(this), g.buyInAmount);
                _trackDeposit(gameHash, msg.sender, g.buyInToken, g.buyInAmount);
            }
        }

        hasJoined[gameHash][msg.sender] = true;
        _players[gameHash].push(msg.sender);
        g.playerCount++;

        emit PlayerJoined(gameHash, msg.sender, g.playerCount);
    }

    function sponsor(bytes32 gameHash, address token, uint256 amount) external payable nonReentrant {
        Game storage g = games[gameHash];
        if (g.createdAt == 0) revert GameNotFound();
        if (g.status == GameStatus.Completed || g.status == GameStatus.Cancelled) revert InvalidParams();

        if (token == address(0)) {
            if (msg.value == 0) revert InvalidParams();
            _trackDeposit(gameHash, msg.sender, address(0), msg.value);
            emit SponsorDeposit(gameHash, msg.sender, address(0), msg.value);
        } else {
            if (amount == 0 || msg.value > 0) revert InvalidParams();
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            _trackDeposit(gameHash, msg.sender, token, amount);
            emit SponsorDeposit(gameHash, msg.sender, token, amount);
        }
    }

    function startGame(bytes32 gameHash) external {
        Game storage g = games[gameHash];
        if (msg.sender != signer && msg.sender != g.creator) revert NotAuthorized();
        if (g.status != GameStatus.Open) revert GameNotOpen();
        if (g.playerCount < 2) revert InvalidParams();

        g.status = GameStatus.Active;
        emit GameStarted(gameHash, g.playerCount);
    }

    /// @notice Records payouts and takes protocol fee. Winners then call claim().
    /// @param winners   Addresses of paid finishers (ordered by placement)
    /// @param tokens    All token addresses in the prize pool
    /// @param amounts   amounts[w][t] = payout of tokens[t] for winners[w]
    function completeGame(
        bytes32 gameHash,
        address[] calldata winners,
        address[] calldata tokens,
        uint256[][] calldata amounts
    ) external nonReentrant onlySigner {
        Game storage g = games[gameHash];
        if (g.status != GameStatus.Active) revert GameNotActive();
        if (winners.length == 0 || winners.length != amounts.length) revert InvalidParams();

        g.status = GameStatus.Completed;
        g.completedAt = block.timestamp;

        // Store winner list for refundUnclaimed
        for (uint256 w = 0; w < winners.length; w++) {
            if (amounts[w].length != tokens.length) revert InvalidParams();
            _winners[gameHash].push(winners[w]);
        }

        // Per-token: deduct fee, verify distribution, record payouts
        for (uint256 t = 0; t < tokens.length; t++) {
            address token = tokens[t];
            uint256 balance = tokenBalance[gameHash][token];

            uint256 fee = (balance * g.protocolFeeBps) / 10000;
            uint256 distributable = balance - fee;

            uint256 totalDistributed;
            for (uint256 w = 0; w < winners.length; w++) {
                totalDistributed += amounts[w][t];
                if (amounts[w][t] > 0) {
                    _payoutAmount[gameHash][winners[w]][token] += amounts[w][t];
                }
            }
            if (totalDistributed > distributable) revert DistributionExceedsBalance();

            if (fee > 0) {
                _transferOut(token, protocolWallet, fee);
                emit ProtocolFeeCollected(gameHash, token, fee);
            }

            // Tracked balance = what remains in the contract for claims
            tokenBalance[gameHash][token] = distributable;
        }

        emit GameCompleted(gameHash, block.timestamp);
    }

    // ──────────────────────────── Claim ────────────────────────────

    function claim(bytes32 gameHash) external nonReentrant {
        Game storage g = games[gameHash];
        if (g.status != GameStatus.Completed) revert GameNotCompleted();
        if (hasClaimed[gameHash][msg.sender]) revert AlreadyClaimed();

        address[] storage tokens = _gameTokens[gameHash];
        bool hasPayout;

        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 amount = _payoutAmount[gameHash][msg.sender][tokens[i]];
            if (amount > 0) {
                hasPayout = true;
                _payoutAmount[gameHash][msg.sender][tokens[i]] = 0;
                tokenBalance[gameHash][tokens[i]] -= amount;
                _transferOut(tokens[i], msg.sender, amount);
                emit PayoutClaimed(gameHash, msg.sender, tokens[i], amount);
            }
        }

        if (!hasPayout) revert NothingToClaim();
        hasClaimed[gameHash][msg.sender] = true;
    }

    // ──────────────────────────── Cancel / Refund ────────────────────────────

    function cancelGame(bytes32 gameHash, string calldata reason) external nonReentrant {
        Game storage g = games[gameHash];
        if (msg.sender != signer && msg.sender != g.creator) revert NotAuthorized();
        if (g.status == GameStatus.Completed || g.status == GameStatus.Cancelled) revert InvalidParams();

        g.status = GameStatus.Cancelled;

        Deposit[] storage deps = _deposits[gameHash];
        for (uint256 i = 0; i < deps.length; i++) {
            if (deps[i].amount > 0) {
                _transferOut(deps[i].token, deps[i].depositor, deps[i].amount);
                emit DepositRefunded(gameHash, deps[i].depositor, deps[i].token, deps[i].amount);
            }
        }

        address[] storage tokens = _gameTokens[gameHash];
        for (uint256 i = 0; i < tokens.length; i++) {
            tokenBalance[gameHash][tokens[i]] = 0;
        }

        emit GameCancelled(gameHash, reason);
    }

    function refundUnclaimed(bytes32 gameHash) external nonReentrant {
        Game storage g = games[gameHash];
        if (g.status != GameStatus.Completed) revert GameNotCompleted();
        if (block.timestamp < g.completedAt + CLAIM_WINDOW) revert ClaimWindowOpen();

        address[] storage tokens = _gameTokens[gameHash];
        uint256 refundedCount;

        for (uint256 t = 0; t < tokens.length; t++) {
            uint256 remaining = tokenBalance[gameHash][tokens[t]];
            if (remaining > 0) {
                tokenBalance[gameHash][tokens[t]] = 0;
                _transferOut(tokens[t], g.creator, remaining);
                refundedCount++;
            }
        }

        if (refundedCount == 0) revert NothingToRefund();

        // Zero out unclaimed payout records
        address[] storage winners = _winners[gameHash];
        for (uint256 w = 0; w < winners.length; w++) {
            if (!hasClaimed[gameHash][winners[w]]) {
                for (uint256 t = 0; t < tokens.length; t++) {
                    _payoutAmount[gameHash][winners[w]][tokens[t]] = 0;
                }
            }
        }

        emit UnclaimedRefunded(gameHash, g.creator, refundedCount);
    }

    // ──────────────────────────── Views ────────────────────────────

    function getGame(bytes32 gameHash) external view returns (Game memory) {
        return games[gameHash];
    }

    function getPlayers(bytes32 gameHash) external view returns (address[] memory) {
        return _players[gameHash];
    }

    function getGameTokens(bytes32 gameHash) external view returns (address[] memory) {
        return _gameTokens[gameHash];
    }

    function getDeposits(bytes32 gameHash) external view returns (Deposit[] memory) {
        return _deposits[gameHash];
    }

    function getWinners(bytes32 gameHash) external view returns (address[] memory) {
        return _winners[gameHash];
    }

    function getPayoutAmount(
        bytes32 gameHash,
        address winner,
        address token
    ) external view returns (uint256) {
        return _payoutAmount[gameHash][winner][token];
    }

    // ──────────────────────────── Admin ────────────────────────────

    function setSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "zero addr");
        signer = _signer;
    }

    function setProtocolWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "zero addr");
        protocolWallet = _wallet;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero addr");
        owner = newOwner;
    }

    // ──────────────────────────── Internal ────────────────────────────

    function _trackDeposit(bytes32 gameHash, address depositor, address token, uint256 amount) internal {
        if (!_tokenTracked[gameHash][token]) {
            _gameTokens[gameHash].push(token);
            _tokenTracked[gameHash][token] = true;
        }
        tokenBalance[gameHash][token] += amount;
        _deposits[gameHash].push(Deposit(depositor, token, amount));
    }

    function _transferOut(address token, address to, uint256 amount) internal {
        if (token == address(0)) {
            (bool success,) = to.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }
}
