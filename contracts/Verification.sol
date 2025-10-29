// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title MaxCraicPokerVerification
 * @notice Simple contract for Base Batches 002 deployment verification
 * @dev Minimal contract to prove deployment and transaction capability
 */
contract MaxCraicPokerVerification {

    event Verified(address indexed user, uint256 timestamp, string message);

    mapping(address => uint256) public verifications;
    uint256 public totalVerifications;

    /**
     * @notice Verify deployment by sending a transaction
     * @param message Optional message for verification
     */
    function verify(string memory message) external {
        verifications[msg.sender] = block.timestamp;
        totalVerifications++;

        emit Verified(msg.sender, block.timestamp, message);
    }

    /**
     * @notice Check if an address has verified
     */
    function hasVerified(address user) external view returns (bool) {
        return verifications[user] > 0;
    }

    /**
     * @notice Get verification timestamp for an address
     */
    function getVerificationTime(address user) external view returns (uint256) {
        return verifications[user];
    }
}
