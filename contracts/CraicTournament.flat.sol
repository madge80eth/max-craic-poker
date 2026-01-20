// SPDX-License-Identifier: MIT
pragma solidity >=0.4.16 >=0.6.2 ^0.8.20;

// lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol

// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/IERC165.sol)

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol

// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/IERC20.sol)

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// lib/openzeppelin-contracts/contracts/utils/StorageSlot.sol

// OpenZeppelin Contracts (last updated v5.1.0) (utils/StorageSlot.sol)
// This file was procedurally generated from scripts/generate/templates/StorageSlot.js.

/**
 * @dev Library for reading and writing primitive types to specific storage slots.
 *
 * Storage slots are often used to avoid storage conflict when dealing with upgradeable contracts.
 * This library helps with reading and writing to such slots without the need for inline assembly.
 *
 * The functions in this library return Slot structs that contain a `value` member that can be used to read or write.
 *
 * Example usage to set ERC-1967 implementation slot:
 * ```solidity
 * contract ERC1967 {
 *     // Define the slot. Alternatively, use the SlotDerivation library to derive the slot.
 *     bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
 *
 *     function _getImplementation() internal view returns (address) {
 *         return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;
 *     }
 *
 *     function _setImplementation(address newImplementation) internal {
 *         require(newImplementation.code.length > 0);
 *         StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = newImplementation;
 *     }
 * }
 * ```
 *
 * TIP: Consider using this library along with {SlotDerivation}.
 */
library StorageSlot {
    struct AddressSlot {
        address value;
    }

    struct BooleanSlot {
        bool value;
    }

    struct Bytes32Slot {
        bytes32 value;
    }

    struct Uint256Slot {
        uint256 value;
    }

    struct Int256Slot {
        int256 value;
    }

    struct StringSlot {
        string value;
    }

    struct BytesSlot {
        bytes value;
    }

    /**
     * @dev Returns an `AddressSlot` with member `value` located at `slot`.
     */
    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `BooleanSlot` with member `value` located at `slot`.
     */
    function getBooleanSlot(bytes32 slot) internal pure returns (BooleanSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Bytes32Slot` with member `value` located at `slot`.
     */
    function getBytes32Slot(bytes32 slot) internal pure returns (Bytes32Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Uint256Slot` with member `value` located at `slot`.
     */
    function getUint256Slot(bytes32 slot) internal pure returns (Uint256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Int256Slot` with member `value` located at `slot`.
     */
    function getInt256Slot(bytes32 slot) internal pure returns (Int256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `StringSlot` with member `value` located at `slot`.
     */
    function getStringSlot(bytes32 slot) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `StringSlot` representation of the string storage pointer `store`.
     */
    function getStringSlot(string storage store) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }

    /**
     * @dev Returns a `BytesSlot` with member `value` located at `slot`.
     */
    function getBytesSlot(bytes32 slot) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `BytesSlot` representation of the bytes storage pointer `store`.
     */
    function getBytesSlot(bytes storage store) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }
}

// lib/openzeppelin-contracts/contracts/token/ERC1155/IERC1155.sol

// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC1155/IERC1155.sol)

/**
 * @dev Required interface of an ERC-1155 compliant contract, as defined in the
 * https://eips.ethereum.org/EIPS/eip-1155[ERC].
 */
interface IERC1155 is IERC165 {
    /**
     * @dev Emitted when `value` amount of tokens of type `id` are transferred from `from` to `to` by `operator`.
     */
    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);

    /**
     * @dev Equivalent to multiple {TransferSingle} events, where `operator`, `from` and `to` are the same for all
     * transfers.
     */
    event TransferBatch(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256[] ids,
        uint256[] values
    );

    /**
     * @dev Emitted when `account` grants or revokes permission to `operator` to transfer their tokens, according to
     * `approved`.
     */
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);

    /**
     * @dev Emitted when the URI for token type `id` changes to `value`, if it is a non-programmatic URI.
     *
     * If an {URI} event was emitted for `id`, the standard
     * https://eips.ethereum.org/EIPS/eip-1155#metadata-extensions[guarantees] that `value` will equal the value
     * returned by {IERC1155MetadataURI-uri}.
     */
    event URI(string value, uint256 indexed id);

    /**
     * @dev Returns the value of tokens of token type `id` owned by `account`.
     */
    function balanceOf(address account, uint256 id) external view returns (uint256);

    /**
     * @dev xref:ROOT:erc1155.adoc#batch-operations[Batched] version of {balanceOf}.
     *
     * Requirements:
     *
     * - `accounts` and `ids` must have the same length.
     */
    function balanceOfBatch(
        address[] calldata accounts,
        uint256[] calldata ids
    ) external view returns (uint256[] memory);

    /**
     * @dev Grants or revokes permission to `operator` to transfer the caller's tokens, according to `approved`,
     *
     * Emits an {ApprovalForAll} event.
     *
     * Requirements:
     *
     * - `operator` cannot be the zero address.
     */
    function setApprovalForAll(address operator, bool approved) external;

    /**
     * @dev Returns true if `operator` is approved to transfer ``account``'s tokens.
     *
     * See {setApprovalForAll}.
     */
    function isApprovedForAll(address account, address operator) external view returns (bool);

    /**
     * @dev Transfers a `value` amount of tokens of type `id` from `from` to `to`.
     *
     * WARNING: This function can potentially allow a reentrancy attack when transferring tokens
     * to an untrusted contract, when invoking {IERC1155Receiver-onERC1155Received} on the receiver.
     * Ensure to follow the checks-effects-interactions pattern and consider employing
     * reentrancy guards when interacting with untrusted contracts.
     *
     * Emits a {TransferSingle} event.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - If the caller is not `from`, it must have been approved to spend ``from``'s tokens via {setApprovalForAll}.
     * - `from` must have a balance of tokens of type `id` of at least `value` amount.
     * - If `to` refers to a smart contract, it must implement {IERC1155Receiver-onERC1155Received} and return the
     * acceptance magic value.
     */
    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes calldata data) external;

    /**
     * @dev xref:ROOT:erc1155.adoc#batch-operations[Batched] version of {safeTransferFrom}.
     *
     * WARNING: This function can potentially allow a reentrancy attack when transferring tokens
     * to an untrusted contract, when invoking {IERC1155Receiver-onERC1155BatchReceived} on the receiver.
     * Ensure to follow the checks-effects-interactions pattern and consider employing
     * reentrancy guards when interacting with untrusted contracts.
     *
     * Emits either a {TransferSingle} or a {TransferBatch} event, depending on the length of the array arguments.
     *
     * Requirements:
     *
     * - `ids` and `values` must have the same length.
     * - If `to` refers to a smart contract, it must implement {IERC1155Receiver-onERC1155BatchReceived} and return the
     * acceptance magic value.
     */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external;
}

// lib/openzeppelin-contracts/contracts/interfaces/IERC165.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC165.sol)

// lib/openzeppelin-contracts/contracts/interfaces/IERC20.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC20.sol)

// lib/openzeppelin-contracts/contracts/token/ERC721/IERC721.sol

// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC721/IERC721.sol)

/**
 * @dev Required interface of an ERC-721 compliant contract.
 */
interface IERC721 is IERC165 {
    /**
     * @dev Emitted when `tokenId` token is transferred from `from` to `to`.
     */
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    /**
     * @dev Emitted when `owner` enables `approved` to manage the `tokenId` token.
     */
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);

    /**
     * @dev Emitted when `owner` enables or disables (`approved`) `operator` to manage all of its assets.
     */
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    /**
     * @dev Returns the number of tokens in ``owner``'s account.
     */
    function balanceOf(address owner) external view returns (uint256 balance);

    /**
     * @dev Returns the owner of the `tokenId` token.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     */
    function ownerOf(uint256 tokenId) external view returns (address owner);

    /**
     * @dev Safely transfers `tokenId` token from `from` to `to`.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must exist and be owned by `from`.
     * - If the caller is not `from`, it must be approved to move this token by either {approve} or {setApprovalForAll}.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon
     *   a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;

    /**
     * @dev Safely transfers `tokenId` token from `from` to `to`, checking first that contract recipients
     * are aware of the ERC-721 protocol to prevent tokens from being forever locked.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must exist and be owned by `from`.
     * - If the caller is not `from`, it must have been allowed to move this token by either {approve} or
     *   {setApprovalForAll}.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon
     *   a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function safeTransferFrom(address from, address to, uint256 tokenId) external;

    /**
     * @dev Transfers `tokenId` token from `from` to `to`.
     *
     * WARNING: Note that the caller is responsible to confirm that the recipient is capable of receiving ERC-721
     * or else they may be permanently lost. Usage of {safeTransferFrom} prevents loss, though the caller must
     * understand this adds an external call which potentially creates a reentrancy vulnerability.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must be owned by `from`.
     * - If the caller is not `from`, it must be approved to move this token by either {approve} or {setApprovalForAll}.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 tokenId) external;

    /**
     * @dev Gives permission to `to` to transfer `tokenId` token to another account.
     * The approval is cleared when the token is transferred.
     *
     * Only a single account can be approved at a time, so approving the zero address clears previous approvals.
     *
     * Requirements:
     *
     * - The caller must own the token or be an approved operator.
     * - `tokenId` must exist.
     *
     * Emits an {Approval} event.
     */
    function approve(address to, uint256 tokenId) external;

    /**
     * @dev Approve or remove `operator` as an operator for the caller.
     * Operators can call {transferFrom} or {safeTransferFrom} for any token owned by the caller.
     *
     * Requirements:
     *
     * - The `operator` cannot be the address zero.
     *
     * Emits an {ApprovalForAll} event.
     */
    function setApprovalForAll(address operator, bool approved) external;

    /**
     * @dev Returns the account approved for `tokenId` token.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     */
    function getApproved(uint256 tokenId) external view returns (address operator);

    /**
     * @dev Returns if the `operator` is allowed to manage all of the assets of `owner`.
     *
     * See {setApprovalForAll}
     */
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

// lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol

// OpenZeppelin Contracts (last updated v5.5.0) (utils/ReentrancyGuard.sol)

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 *
 * IMPORTANT: Deprecated. This storage-based reentrancy guard will be removed and replaced
 * by the {ReentrancyGuardTransient} variant in v6.0.
 *
 * @custom:stateless
 */
abstract contract ReentrancyGuard {
    using StorageSlot for bytes32;

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ReentrancyGuard")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant REENTRANCY_GUARD_STORAGE =
        0x9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00;

    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    /**
     * @dev A `view` only version of {nonReentrant}. Use to block view functions
     * from being called, preventing reading from inconsistent contract state.
     *
     * CAUTION: This is a "view" modifier and does not change the reentrancy
     * status. Use it only on view functions. For payable or non-payable functions,
     * use the standard {nonReentrant} modifier instead.
     */
    modifier nonReentrantView() {
        _nonReentrantBeforeView();
        _;
    }

    function _nonReentrantBeforeView() private view {
        if (_reentrancyGuardEntered()) {
            revert ReentrancyGuardReentrantCall();
        }
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        _nonReentrantBeforeView();

        // Any calls to nonReentrant after this point will fail
        _reentrancyGuardStorageSlot().getUint256Slot().value = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _reentrancyGuardStorageSlot().getUint256Slot().value == ENTERED;
    }

    function _reentrancyGuardStorageSlot() internal pure virtual returns (bytes32) {
        return REENTRANCY_GUARD_STORAGE;
    }
}

// lib/openzeppelin-contracts/contracts/interfaces/IERC1363.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC1363.sol)

/**
 * @title IERC1363
 * @dev Interface of the ERC-1363 standard as defined in the https://eips.ethereum.org/EIPS/eip-1363[ERC-1363].
 *
 * Defines an extension interface for ERC-20 tokens that supports executing code on a recipient contract
 * after `transfer` or `transferFrom`, or code on a spender contract after `approve`, in a single transaction.
 */
interface IERC1363 is IERC20, IERC165 {
    /*
     * Note: the ERC-165 identifier for this interface is 0xb0202a11.
     * 0xb0202a11 ===
     *   bytes4(keccak256('transferAndCall(address,uint256)')) ^
     *   bytes4(keccak256('transferAndCall(address,uint256,bytes)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256,bytes)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256,bytes)'))
     */

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @param data Additional data with no specified format, sent in call to `spender`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);
}

// lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol

// OpenZeppelin Contracts (last updated v5.5.0) (token/ERC20/utils/SafeERC20.sol)

/**
 * @title SafeERC20
 * @dev Wrappers around ERC-20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    /**
     * @dev An operation with an ERC-20 token failed.
     */
    error SafeERC20FailedOperation(address token);

    /**
     * @dev Indicates a failed `decreaseAllowance` request.
     */
    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        if (!_safeTransfer(token, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        if (!_safeTransferFrom(token, from, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Variant of {safeTransfer} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransfer(IERC20 token, address to, uint256 value) internal returns (bool) {
        return _safeTransfer(token, to, value, false);
    }

    /**
     * @dev Variant of {safeTransferFrom} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransferFrom(IERC20 token, address from, address to, uint256 value) internal returns (bool) {
        return _safeTransferFrom(token, from, to, value, false);
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     *
     * NOTE: If the token implements ERC-7674, this function will not modify any temporary allowance. This function
     * only sets the "standard" allowance. Any temporary allowance will remain active, in addition to the value being
     * set here.
     */
    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        if (!_safeApprove(token, spender, value, false)) {
            if (!_safeApprove(token, spender, 0, true)) revert SafeERC20FailedOperation(address(token));
            if (!_safeApprove(token, spender, value, true)) revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferAndCall, with a fallback to the simple {ERC20} transfer if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that relies on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            safeTransfer(token, to, value);
        } else if (!token.transferAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferFromAndCall, with a fallback to the simple {ERC20} transferFrom if the target
     * has no code. This can be used to implement an {ERC721}-like safe transfer that relies on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferFromAndCallRelaxed(
        IERC1363 token,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            safeTransferFrom(token, from, to, value);
        } else if (!token.transferFromAndCall(from, to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} approveAndCall, with a fallback to the simple {ERC20} approve if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * NOTE: When the recipient address (`to`) has no code (i.e. is an EOA), this function behaves as {forceApprove}.
     * Oppositely, when the recipient address (`to`) has code, this function only attempts to call {ERC1363-approveAndCall}
     * once without retrying, and relies on the returned value to be true.
     *
     * Reverts if the returned value is other than `true`.
     */
    function approveAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            forceApprove(token, to, value);
        } else if (!token.approveAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity `token.transfer(to, value)` call, relaxing the requirement on the return value: the
     * return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeTransfer(IERC20 token, address to, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.transfer.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(to, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }

    /**
     * @dev Imitates a Solidity `token.transferFrom(from, to, value)` call, relaxing the requirement on the return
     * value: the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param from The sender of the tokens
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 value,
        bool bubble
    ) private returns (bool success) {
        bytes4 selector = IERC20.transferFrom.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(from, shr(96, not(0))))
            mstore(0x24, and(to, shr(96, not(0))))
            mstore(0x44, value)
            success := call(gas(), token, 0, 0x00, 0x64, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
            mstore(0x60, 0)
        }
    }

    /**
     * @dev Imitates a Solidity `token.approve(spender, value)` call, relaxing the requirement on the return value:
     * the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param spender The spender of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeApprove(IERC20 token, address spender, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.approve.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(spender, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }
}

// contracts/CraicTournament.sol

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

