// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LeaderboardNFT
 * @dev NFT that represents a coaching session voucher for top leaderboard performers
 * Top 5 wallets on monthly leaderboard can claim this NFT
 * NFT entitles holder to one free hour of coaching
 * Can be burned when used (future implementation)
 */
contract LeaderboardNFT is ERC721, ERC721URIStorage, ERC721Burnable, Ownable {
    uint256 private _nextTokenId;

    // Mapping from wallet address to month (YYYY-MM format) to token ID
    mapping(address => mapping(string => uint256)) public walletMonthTokens;

    // Mapping from token ID to month and rank
    struct TokenInfo {
        string month; // Format: "2025-10"
        uint256 rank; // 1-5
        bool used; // Track if coaching session has been used
    }
    mapping(uint256 => TokenInfo) public tokenInfo;

    // Events
    event NFTClaimed(address indexed wallet, uint256 indexed tokenId, string month, uint256 rank);
    event CoachingUsed(uint256 indexed tokenId, address indexed wallet);

    constructor() ERC721("Max Craic Coaching Voucher", "MCCV") Ownable(msg.sender) {}

    /**
     * @dev Mint an NFT to a leaderboard winner
     * @param to Address of the winner
     * @param month Month in YYYY-MM format (e.g., "2025-10")
     * @param rank Position on leaderboard (1-5)
     * @param uri Metadata URI for the NFT
     */
    function mintLeaderboardNFT(
        address to,
        string memory month,
        uint256 rank,
        string memory uri
    ) public onlyOwner returns (uint256) {
        require(rank >= 1 && rank <= 5, "Rank must be between 1 and 5");
        require(walletMonthTokens[to][month] == 0, "Already claimed for this month");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        walletMonthTokens[to][month] = tokenId;
        tokenInfo[tokenId] = TokenInfo({
            month: month,
            rank: rank,
            used: false
        });

        emit NFTClaimed(to, tokenId, month, rank);

        return tokenId;
    }

    /**
     * @dev Check if a wallet has already claimed NFT for a specific month
     * @param wallet Address to check
     * @param month Month in YYYY-MM format
     */
    function hasClaimedForMonth(address wallet, string memory month) public view returns (bool) {
        return walletMonthTokens[wallet][month] != 0;
    }

    /**
     * @dev Mark coaching session as used (doesn't burn yet, just marks)
     * @param tokenId Token ID to mark as used
     */
    function markCoachingUsed(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(!tokenInfo[tokenId].used, "Already marked as used");

        tokenInfo[tokenId].used = true;
        emit CoachingUsed(tokenId, msg.sender);
    }

    /**
     * @dev Get token information
     * @param tokenId Token ID to query
     */
    function getTokenInfo(uint256 tokenId) public view returns (
        string memory month,
        uint256 rank,
        bool used
    ) {
        TokenInfo memory info = tokenInfo[tokenId];
        return (info.month, info.rank, info.used);
    }

    /**
     * @dev Get all tokens owned by an address
     * @param owner Address to query
     */
    function tokensOfOwner(address owner) public view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokens = new uint256[](tokenCount);
        uint256 index = 0;

        for (uint256 tokenId = 0; tokenId < _nextTokenId; tokenId++) {
            if (_ownerOf(tokenId) == owner) {
                tokens[index] = tokenId;
                index++;
            }
        }

        return tokens;
    }

    // Override required functions
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
