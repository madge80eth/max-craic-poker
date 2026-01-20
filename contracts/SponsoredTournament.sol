// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SponsoredTournament
 * @notice Manages bonding + sponsored prize pools for MCP Poker tournaments
 * @dev Players deposit bonds, sponsors add prize pools, contract pays winners automatically
 *
 * Flow:
 * 1. Sponsor calls sponsorTournament() with prize pool amount
 * 2. Players call enterTournament() to deposit bonds
 * 3. Game server calls finishTournament() with results
 * 4. Contract automatically distributes: bonds back + prize pool to winners
 */
contract SponsoredTournament is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Base mainnet USDC
    IERC20 public immutable usdc;

    // Game server address (only this can call finishTournament)
    address public gameServer;

    // Contract owner for admin functions
    address public owner;

    enum TournamentStatus {
        Pending,    // Created, waiting for sponsor
        Sponsored,  // Sponsor deposited, waiting for players
        Active,     // All players joined, game in progress
        Completed,  // Game finished, payouts done
        Cancelled   // Cancelled, refunds available
    }

    struct Tournament {
        string tableId;          // Links to poker game table
        address sponsor;         // Who deposited prize pool
        uint256 prizePool;       // Total prize pool in USDC (6 decimals)
        uint256 bondAmount;      // Required bond per player (6 decimals)
        uint256 maxPlayers;      // Max players (6 for 6-max)
        uint256 playerCount;     // Current player count
        TournamentStatus status;
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

    // Payout structure: [1st place %, 2nd place %] (rest get bond back only)
    uint256 public firstPlacePercent = 65;
    uint256 public secondPlacePercent = 35;

    // Events
    event TournamentCreated(bytes32 indexed tournamentId, string tableId, uint256 bondAmount, uint256 maxPlayers);
    event TournamentSponsored(bytes32 indexed tournamentId, address indexed sponsor, uint256 prizePool);
    event PlayerEntered(bytes32 indexed tournamentId, address indexed player, uint256 seatIndex, uint256 bondAmount);
    event TournamentStarted(bytes32 indexed tournamentId, uint256 playerCount);
    event TournamentCompleted(bytes32 indexed tournamentId, address indexed winner, address indexed second, uint256 winnerPayout, uint256 secondPayout);
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
     * @notice Create a new tournament (can be called by anyone)
     * @param tableId The poker table ID this tournament is linked to
     * @param bondAmount Required bond per player (in USDC, 6 decimals)
     * @param maxPlayers Maximum players (typically 6)
     * @return tournamentId Unique tournament identifier
     */
    function createTournament(
        string calldata tableId,
        uint256 bondAmount,
        uint256 maxPlayers
    ) external returns (bytes32 tournamentId) {
        require(bytes(tableId).length > 0, "Invalid tableId");
        require(bondAmount > 0, "Bond must be > 0");
        require(maxPlayers >= 2 && maxPlayers <= 9, "Invalid player count");

        tournamentId = keccak256(abi.encodePacked(tableId, block.timestamp, msg.sender));

        require(tournaments[tournamentId].createdAt == 0, "Tournament exists");

        tournaments[tournamentId] = Tournament({
            tableId: tableId,
            sponsor: address(0),
            prizePool: 0,
            bondAmount: bondAmount,
            maxPlayers: maxPlayers,
            playerCount: 0,
            status: TournamentStatus.Pending,
            createdAt: block.timestamp,
            startedAt: 0,
            completedAt: 0
        });

        emit TournamentCreated(tournamentId, tableId, bondAmount, maxPlayers);
    }

    /**
     * @notice Sponsor a tournament with a prize pool
     * @param tournamentId The tournament to sponsor
     * @param prizePoolAmount Amount of USDC for prize pool (6 decimals)
     */
    function sponsorTournament(
        bytes32 tournamentId,
        uint256 prizePoolAmount
    ) external nonReentrant {
        Tournament storage t = tournaments[tournamentId];
        require(t.createdAt > 0, "Tournament not found");
        require(t.status == TournamentStatus.Pending, "Already sponsored");
        require(prizePoolAmount > 0, "Prize must be > 0");

        // Transfer USDC from sponsor to contract
        usdc.safeTransferFrom(msg.sender, address(this), prizePoolAmount);

        t.sponsor = msg.sender;
        t.prizePool = prizePoolAmount;
        t.status = TournamentStatus.Sponsored;

        emit TournamentSponsored(tournamentId, msg.sender, prizePoolAmount);
    }

    /**
     * @notice Enter a tournament by depositing bond
     * @param tournamentId The tournament to join
     * @param seatIndex The seat to take (0-5 for 6-max)
     */
    function enterTournament(
        bytes32 tournamentId,
        uint256 seatIndex
    ) external nonReentrant {
        Tournament storage t = tournaments[tournamentId];
        require(t.createdAt > 0, "Tournament not found");
        require(t.status == TournamentStatus.Sponsored, "Not open for entry");
        require(!hasJoined[tournamentId][msg.sender], "Already joined");
        require(seatIndex < t.maxPlayers, "Invalid seat");
        require(playerEntries[tournamentId][seatIndex].player == address(0), "Seat taken");
        require(t.playerCount < t.maxPlayers, "Tournament full");

        // Transfer bond from player to contract
        usdc.safeTransferFrom(msg.sender, address(this), t.bondAmount);

        playerEntries[tournamentId][seatIndex] = PlayerEntry({
            player: msg.sender,
            bonded: true,
            refunded: false
        });
        playerSeats[tournamentId][msg.sender] = seatIndex;
        hasJoined[tournamentId][msg.sender] = true;
        t.playerCount++;

        emit PlayerEntered(tournamentId, msg.sender, seatIndex, t.bondAmount);

        // If tournament is full, mark as active
        if (t.playerCount == t.maxPlayers) {
            t.status = TournamentStatus.Active;
            t.startedAt = block.timestamp;
            emit TournamentStarted(tournamentId, t.playerCount);
        }
    }

    /**
     * @notice Start tournament early (before full) - game server only
     * @param tournamentId The tournament to start
     */
    function startTournament(bytes32 tournamentId) external onlyGameServer {
        Tournament storage t = tournaments[tournamentId];
        require(t.status == TournamentStatus.Sponsored, "Cannot start");
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

        // Calculate payouts
        uint256 winnerPrize = (t.prizePool * firstPlacePercent) / 100;
        uint256 secondPrize = (t.prizePool * secondPlacePercent) / 100;

        // Pay winner: bond back + 65% of prize pool
        uint256 winnerTotal = t.bondAmount + winnerPrize;
        usdc.safeTransfer(winner, winnerTotal);
        _markRefunded(tournamentId, winner);

        // Pay second: bond back + 35% of prize pool
        uint256 secondTotal = t.bondAmount + secondPrize;
        usdc.safeTransfer(second, secondTotal);
        _markRefunded(tournamentId, second);

        // Refund other players (just their bonds)
        for (uint256 i = 0; i < otherPlayers.length; i++) {
            if (hasJoined[tournamentId][otherPlayers[i]] && otherPlayers[i] != winner && otherPlayers[i] != second) {
                usdc.safeTransfer(otherPlayers[i], t.bondAmount);
                _markRefunded(tournamentId, otherPlayers[i]);
                emit PlayerRefunded(tournamentId, otherPlayers[i], t.bondAmount);
            }
        }

        emit TournamentCompleted(tournamentId, winner, second, winnerTotal, secondTotal);
    }

    /**
     * @notice Cancel tournament and refund everyone - game server or owner only
     * @param tournamentId The tournament to cancel
     * @param reason Reason for cancellation
     */
    function cancelTournament(
        bytes32 tournamentId,
        string calldata reason
    ) external nonReentrant {
        require(msg.sender == gameServer || msg.sender == owner, "Not authorized");

        Tournament storage t = tournaments[tournamentId];
        require(t.status == TournamentStatus.Sponsored || t.status == TournamentStatus.Active, "Cannot cancel");

        t.status = TournamentStatus.Cancelled;

        // Refund sponsor's prize pool
        if (t.sponsor != address(0) && t.prizePool > 0) {
            usdc.safeTransfer(t.sponsor, t.prizePool);
        }

        // Refund all players' bonds
        for (uint256 i = 0; i < t.maxPlayers; i++) {
            PlayerEntry storage entry = playerEntries[tournamentId][i];
            if (entry.player != address(0) && entry.bonded && !entry.refunded) {
                usdc.safeTransfer(entry.player, t.bondAmount);
                entry.refunded = true;
                emit PlayerRefunded(tournamentId, entry.player, t.bondAmount);
            }
        }

        emit TournamentCancelled(tournamentId, reason);
    }

    /**
     * @notice Emergency withdraw for sponsor if tournament doesn't start within 24h
     * @param tournamentId The tournament to withdraw from
     */
    function emergencyWithdraw(bytes32 tournamentId) external nonReentrant {
        Tournament storage t = tournaments[tournamentId];
        require(msg.sender == t.sponsor, "Not sponsor");
        require(t.status == TournamentStatus.Sponsored, "Cannot withdraw");
        require(block.timestamp > t.createdAt + 24 hours, "Too early");

        t.status = TournamentStatus.Cancelled;

        // Refund sponsor's prize pool
        usdc.safeTransfer(t.sponsor, t.prizePool);

        // Refund all players' bonds
        for (uint256 i = 0; i < t.maxPlayers; i++) {
            PlayerEntry storage entry = playerEntries[tournamentId][i];
            if (entry.player != address(0) && entry.bonded && !entry.refunded) {
                usdc.safeTransfer(entry.player, t.bondAmount);
                entry.refunded = true;
                emit PlayerRefunded(tournamentId, entry.player, t.bondAmount);
            }
        }

        emit TournamentCancelled(tournamentId, "Sponsor emergency withdraw");
    }

    // View functions

    function getTournament(bytes32 tournamentId) external view returns (Tournament memory) {
        return tournaments[tournamentId];
    }

    function getPlayerEntry(bytes32 tournamentId, uint256 seatIndex) external view returns (PlayerEntry memory) {
        return playerEntries[tournamentId][seatIndex];
    }

    function getPlayerSeat(bytes32 tournamentId, address player) external view returns (uint256) {
        require(hasJoined[tournamentId][player], "Player not in tournament");
        return playerSeats[tournamentId][player];
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

    // Admin functions

    function setGameServer(address _gameServer) external onlyOwner {
        require(_gameServer != address(0), "Invalid address");
        gameServer = _gameServer;
    }

    function setPayoutStructure(uint256 _firstPlace, uint256 _secondPlace) external onlyOwner {
        require(_firstPlace + _secondPlace == 100, "Must equal 100%");
        firstPlacePercent = _firstPlace;
        secondPlacePercent = _secondPlace;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    // Internal functions

    function _markRefunded(bytes32 tournamentId, address player) internal {
        uint256 seat = playerSeats[tournamentId][player];
        playerEntries[tournamentId][seat].refunded = true;
    }
}
