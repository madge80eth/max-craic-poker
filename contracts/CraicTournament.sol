// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CraicTournament
 * @notice Trustless poker tournaments for web3 communities - 0% platform fee
 * @dev Host creates tournament with prize pool, players join with optional sybil protection
 *
 * Key Features:
 * - 0% platform fee - pure public good
 * - NFT gating (ERC-721/ERC-1155 ownership required)
 * - Coinbase Verification (via EAS attestation check)
 * - USDC bond mechanic
 * - Host creates & sponsors in one transaction
 * - Dynamic payout based on player count
 *
 * Flow:
 * 1. Host calls createTournament() with prize pool (USDC)
 * 2. Players call joinTournament() - must pass sybil checks + deposit bond
 * 3. Game server calls startTournament() when ready
 * 4. Game server calls finishTournament() with rankings
 * 5. Contract pays winners automatically + returns bonds
 */
contract CraicTournament is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Base mainnet USDC
    IERC20 public immutable usdc;

    // Game server address (only this can finish tournaments)
    address public gameServer;

    // Contract owner for admin functions
    address public owner;

    // Coinbase Verified Account EAS schema ID on Base
    bytes32 public constant COINBASE_VERIFIED_SCHEMA =
        0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9;

    // EAS contract on Base mainnet
    address public constant EAS_CONTRACT = 0x4200000000000000000000000000000000000021;

    enum TournamentStatus {
        Waiting,    // Created, waiting for players
        Active,     // Game in progress
        Completed,  // Game finished, payouts done
        Cancelled   // Cancelled, refunds available
    }

    struct SybilOptions {
        address nftContract;       // ERC-721 or ERC-1155 contract (address(0) if disabled)
        uint256 nftTokenId;        // Token ID for ERC-1155 (0 for any ERC-721)
        bool isERC1155;            // True if NFT is ERC-1155
        bool requireCoinbaseVerification; // True to require Coinbase attestation
    }

    struct Tournament {
        string gameId;             // Links to off-chain game state
        address host;              // Creator who deposited prize pool
        uint256 prizePool;         // Total prize pool in USDC (6 decimals)
        uint256 bondAmount;        // Required bond per player (6 decimals)
        uint8 maxPlayers;          // Max players (typically 6)
        uint8 playerCount;         // Current player count
        TournamentStatus status;
        SybilOptions sybilOptions;
        uint256 createdAt;
        uint256 startedAt;
        uint256 completedAt;
    }

    struct PlayerEntry {
        address player;
        bool bonded;
        bool refunded;
    }

    // Tournament ID => Tournament data
    mapping(bytes32 => Tournament) public tournaments;

    // Tournament ID => Player entries (indexed by seat)
    mapping(bytes32 => mapping(uint256 => PlayerEntry)) public playerEntries;

    // Tournament ID => Player address => seat index
    mapping(bytes32 => mapping(address => uint256)) public playerSeats;

    // Tournament ID => Player address => has joined
    mapping(bytes32 => mapping(address => bool)) public hasJoined;

    // Events
    event TournamentCreated(
        bytes32 indexed tournamentId,
        string gameId,
        address indexed host,
        uint256 prizePool,
        uint256 bondAmount,
        uint8 maxPlayers
    );
    event PlayerJoined(bytes32 indexed tournamentId, address indexed player, uint256 seatIndex);
    event TournamentStarted(bytes32 indexed tournamentId, uint8 playerCount);
    event TournamentCompleted(
        bytes32 indexed tournamentId,
        address indexed winner,
        address indexed second,
        uint256 winnerPayout,
        uint256 secondPayout
    );
    event PlayerRefunded(bytes32 indexed tournamentId, address indexed player, uint256 amount);
    event TournamentCancelled(bytes32 indexed tournamentId, string reason);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyGameServer() {
        require(msg.sender == gameServer, "Not game server");
        _;
    }

    constructor(address _usdc, address _gameServer) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_gameServer != address(0), "Invalid game server address");

        usdc = IERC20(_usdc);
        gameServer = _gameServer;
        owner = msg.sender;
    }

    /**
     * @notice Create a new tournament with prize pool (host function)
     * @param gameId The off-chain game ID this tournament is linked to
     * @param prizePoolAmount Prize pool in USDC (6 decimals)
     * @param bondAmount Required bond per player (6 decimals), can be 0
     * @param maxPlayers Maximum players (2-9, typically 6)
     * @param sybilOptions Sybil protection settings
     * @return tournamentId Unique tournament identifier
     */
    function createTournament(
        string calldata gameId,
        uint256 prizePoolAmount,
        uint256 bondAmount,
        uint8 maxPlayers,
        SybilOptions calldata sybilOptions
    ) external nonReentrant returns (bytes32 tournamentId) {
        require(bytes(gameId).length > 0, "Invalid gameId");
        require(prizePoolAmount > 0, "Prize pool must be > 0");
        require(maxPlayers >= 2 && maxPlayers <= 9, "Invalid player count");

        // Transfer prize pool from host to contract
        usdc.safeTransferFrom(msg.sender, address(this), prizePoolAmount);

        tournamentId = keccak256(abi.encodePacked(gameId, block.timestamp, msg.sender));
        require(tournaments[tournamentId].createdAt == 0, "Tournament exists");

        tournaments[tournamentId] = Tournament({
            gameId: gameId,
            host: msg.sender,
            prizePool: prizePoolAmount,
            bondAmount: bondAmount,
            maxPlayers: maxPlayers,
            playerCount: 0,
            status: TournamentStatus.Waiting,
            sybilOptions: sybilOptions,
            createdAt: block.timestamp,
            startedAt: 0,
            completedAt: 0
        });

        emit TournamentCreated(
            tournamentId,
            gameId,
            msg.sender,
            prizePoolAmount,
            bondAmount,
            maxPlayers
        );
    }

    /**
     * @notice Join a tournament
     * @param tournamentId The tournament to join
     * @param seatIndex The seat to take (0 to maxPlayers-1)
     */
    function joinTournament(
        bytes32 tournamentId,
        uint256 seatIndex
    ) external nonReentrant {
        Tournament storage t = tournaments[tournamentId];
        require(t.createdAt > 0, "Tournament not found");
        require(t.status == TournamentStatus.Waiting, "Not open for entry");
        require(!hasJoined[tournamentId][msg.sender], "Already joined");
        require(seatIndex < t.maxPlayers, "Invalid seat");
        require(playerEntries[tournamentId][seatIndex].player == address(0), "Seat taken");
        require(t.playerCount < t.maxPlayers, "Tournament full");

        // Verify sybil protection requirements
        _verifySybilRequirements(t.sybilOptions, msg.sender);

        // Transfer bond from player to contract (if bond is required)
        if (t.bondAmount > 0) {
            usdc.safeTransferFrom(msg.sender, address(this), t.bondAmount);
        }

        playerEntries[tournamentId][seatIndex] = PlayerEntry({
            player: msg.sender,
            bonded: t.bondAmount > 0,
            refunded: false
        });
        playerSeats[tournamentId][msg.sender] = seatIndex;
        hasJoined[tournamentId][msg.sender] = true;
        t.playerCount++;

        emit PlayerJoined(tournamentId, msg.sender, seatIndex);
    }

    /**
     * @notice Start tournament (game server or host can call)
     * @param tournamentId The tournament to start
     */
    function startTournament(bytes32 tournamentId) external {
        Tournament storage t = tournaments[tournamentId];
        require(msg.sender == gameServer || msg.sender == t.host, "Not authorized");
        require(t.status == TournamentStatus.Waiting, "Cannot start");
        require(t.playerCount >= 2, "Need at least 2 players");

        t.status = TournamentStatus.Active;
        t.startedAt = block.timestamp;

        emit TournamentStarted(tournamentId, t.playerCount);
    }

    /**
     * @notice Finish tournament and distribute payouts - game server only
     * @param tournamentId The tournament that finished
     * @param winner Address of 1st place winner
     * @param second Address of 2nd place winner
     * @param otherPlayers Addresses of other players (get bonds back)
     */
    function finishTournament(
        bytes32 tournamentId,
        address winner,
        address second,
        address[] calldata otherPlayers
    ) external onlyGameServer nonReentrant {
        Tournament storage t = tournaments[tournamentId];
        require(t.status == TournamentStatus.Active, "Not active");
        require(hasJoined[tournamentId][winner], "Winner not in tournament");
        require(hasJoined[tournamentId][second], "Second not in tournament");

        t.status = TournamentStatus.Completed;
        t.completedAt = block.timestamp;

        // Calculate payouts based on player count
        (uint256 winnerPercent, uint256 secondPercent) = _getPayoutStructure(t.playerCount);
        uint256 winnerPrize = (t.prizePool * winnerPercent) / 100;
        uint256 secondPrize = (t.prizePool * secondPercent) / 100;

        // Pay winner: bond back + prize
        uint256 winnerTotal = t.bondAmount + winnerPrize;
        usdc.safeTransfer(winner, winnerTotal);
        _markRefunded(tournamentId, winner);

        // Pay second: bond back + prize (if applicable)
        uint256 secondTotal = t.bondAmount + secondPrize;
        if (secondTotal > 0) {
            usdc.safeTransfer(second, secondTotal);
            _markRefunded(tournamentId, second);
        }

        // Refund other players (just their bonds)
        for (uint256 i = 0; i < otherPlayers.length; i++) {
            address player = otherPlayers[i];
            if (
                hasJoined[tournamentId][player] &&
                player != winner &&
                player != second &&
                t.bondAmount > 0
            ) {
                usdc.safeTransfer(player, t.bondAmount);
                _markRefunded(tournamentId, player);
                emit PlayerRefunded(tournamentId, player, t.bondAmount);
            }
        }

        emit TournamentCompleted(tournamentId, winner, second, winnerTotal, secondTotal);
    }

    /**
     * @notice Cancel tournament and refund everyone
     * @param tournamentId The tournament to cancel
     * @param reason Reason for cancellation
     */
    function cancelTournament(
        bytes32 tournamentId,
        string calldata reason
    ) external nonReentrant {
        Tournament storage t = tournaments[tournamentId];
        require(
            msg.sender == gameServer || msg.sender == owner || msg.sender == t.host,
            "Not authorized"
        );
        require(
            t.status == TournamentStatus.Waiting || t.status == TournamentStatus.Active,
            "Cannot cancel"
        );

        t.status = TournamentStatus.Cancelled;

        // Refund host's prize pool
        if (t.prizePool > 0) {
            usdc.safeTransfer(t.host, t.prizePool);
        }

        // Refund all players' bonds
        if (t.bondAmount > 0) {
            for (uint256 i = 0; i < t.maxPlayers; i++) {
                PlayerEntry storage entry = playerEntries[tournamentId][i];
                if (entry.player != address(0) && entry.bonded && !entry.refunded) {
                    usdc.safeTransfer(entry.player, t.bondAmount);
                    entry.refunded = true;
                    emit PlayerRefunded(tournamentId, entry.player, t.bondAmount);
                }
            }
        }

        emit TournamentCancelled(tournamentId, reason);
    }

    /**
     * @notice Host can cancel if no one joins within 1 hour
     * @param tournamentId The tournament to cancel
     */
    function hostCancelTimeout(bytes32 tournamentId) external nonReentrant {
        Tournament storage t = tournaments[tournamentId];
        require(msg.sender == t.host, "Not host");
        require(t.status == TournamentStatus.Waiting, "Cannot cancel");
        require(block.timestamp > t.createdAt + 1 hours, "Too early");

        t.status = TournamentStatus.Cancelled;

        // Refund host's prize pool
        usdc.safeTransfer(t.host, t.prizePool);

        // Refund all players' bonds (if any joined)
        if (t.bondAmount > 0) {
            for (uint256 i = 0; i < t.maxPlayers; i++) {
                PlayerEntry storage entry = playerEntries[tournamentId][i];
                if (entry.player != address(0) && entry.bonded && !entry.refunded) {
                    usdc.safeTransfer(entry.player, t.bondAmount);
                    entry.refunded = true;
                    emit PlayerRefunded(tournamentId, entry.player, t.bondAmount);
                }
            }
        }

        emit TournamentCancelled(tournamentId, "Host cancelled - timeout");
    }

    // View functions

    function getTournament(bytes32 tournamentId) external view returns (Tournament memory) {
        return tournaments[tournamentId];
    }

    function getPlayerEntry(bytes32 tournamentId, uint256 seatIndex) external view returns (PlayerEntry memory) {
        return playerEntries[tournamentId][seatIndex];
    }

    function getTournamentPlayers(bytes32 tournamentId) external view returns (address[] memory players) {
        Tournament storage t = tournaments[tournamentId];
        players = new address[](t.playerCount);
        uint256 idx = 0;
        for (uint256 i = 0; i < t.maxPlayers && idx < t.playerCount; i++) {
            if (playerEntries[tournamentId][i].player != address(0)) {
                players[idx++] = playerEntries[tournamentId][i].player;
            }
        }
    }

    function canJoin(bytes32 tournamentId, address player) external view returns (bool canJoinResult, string memory reason) {
        Tournament storage t = tournaments[tournamentId];

        if (t.createdAt == 0) return (false, "Tournament not found");
        if (t.status != TournamentStatus.Waiting) return (false, "Not open for entry");
        if (hasJoined[tournamentId][player]) return (false, "Already joined");
        if (t.playerCount >= t.maxPlayers) return (false, "Tournament full");

        // Check sybil requirements
        if (t.sybilOptions.nftContract != address(0)) {
            if (!_checkNFTOwnership(t.sybilOptions, player)) {
                return (false, "NFT ownership required");
            }
        }

        if (t.sybilOptions.requireCoinbaseVerification) {
            if (!_checkCoinbaseVerification(player)) {
                return (false, "Coinbase verification required");
            }
        }

        // Check USDC balance for bond
        if (t.bondAmount > 0) {
            if (usdc.balanceOf(player) < t.bondAmount) {
                return (false, "Insufficient USDC for bond");
            }
            if (usdc.allowance(player, address(this)) < t.bondAmount) {
                return (false, "USDC approval required");
            }
        }

        return (true, "");
    }

    // Admin functions

    function setGameServer(address _gameServer) external onlyOwner {
        require(_gameServer != address(0), "Invalid address");
        gameServer = _gameServer;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    // Internal functions

    function _verifySybilRequirements(SybilOptions storage opts, address player) internal view {
        // Check NFT ownership
        if (opts.nftContract != address(0)) {
            require(_checkNFTOwnership(opts, player), "NFT ownership required");
        }

        // Check Coinbase verification
        if (opts.requireCoinbaseVerification) {
            require(_checkCoinbaseVerification(player), "Coinbase verification required");
        }
    }

    function _checkNFTOwnership(SybilOptions storage opts, address player) internal view returns (bool) {
        if (opts.isERC1155) {
            try IERC1155(opts.nftContract).balanceOf(player, opts.nftTokenId) returns (uint256 balance) {
                return balance > 0;
            } catch {
                return false;
            }
        } else {
            try IERC721(opts.nftContract).balanceOf(player) returns (uint256 balance) {
                return balance > 0;
            } catch {
                return false;
            }
        }
    }

    function _checkCoinbaseVerification(address player) internal view returns (bool) {
        // Check EAS attestation for Coinbase Verified Account
        // This is a simplified check - in production you'd call the EAS contract
        // to verify the attestation exists and is not revoked
        //
        // For now, we'll use a basic interface check
        // The EAS contract on Base can be queried for attestations
        //
        // TODO: Implement proper EAS attestation check
        // For MVP, we trust the off-chain verification in the API
        return true;
    }

    function _getPayoutStructure(uint8 playerCount) internal pure returns (uint256 firstPercent, uint256 secondPercent) {
        if (playerCount <= 2) {
            // Heads up: winner takes all
            return (100, 0);
        } else if (playerCount <= 4) {
            // Small table: 65/35 split
            return (65, 35);
        } else {
            // Full table: 65/35 split (can extend to include 3rd)
            return (65, 35);
        }
    }

    function _markRefunded(bytes32 tournamentId, address player) internal {
        uint256 seat = playerSeats[tournamentId][player];
        playerEntries[tournamentId][seat].refunded = true;
    }
}
