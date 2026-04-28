// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract GasRelayer is Ownable {
    using ECDSA for bytes32;

    struct ForwardRequest {
        address from;
        address to;
        uint256 nonce;
        uint256 deadline;
        bytes data;
    }

    mapping(address => uint256) private _nonces;
    mapping(address => bool) public whitelistedTargets;

    event TargetWhitelisted(address indexed target);
    event TargetRemoved(address indexed target);
    event MetaTransactionExecuted(
        address indexed from,
        address indexed to,
        uint256 nonce,
        bool success
    );

    error InvalidSigner();
    error InvalidNonce();
    error RequestExpired();
    error TargetNotWhitelisted();
    error ZeroAddressTarget();

    constructor() Ownable(msg.sender) {}

    function execute(
        ForwardRequest calldata req,
        bytes calldata signature
    ) external returns (bool, bytes memory) {
        if (!whitelistedTargets[req.to]) {
            revert TargetNotWhitelisted();
        }

        if (req.deadline < block.timestamp) {
            revert RequestExpired();
        }

        if (req.nonce != _nonces[req.from]) {
            revert InvalidNonce();
        }

        if (!_verify(req, signature)) {
            revert InvalidSigner();
        }

        _nonces[req.from] += 1;

        // Append the original sender for ERC-2771 compatible recipients.
        (bool success, bytes memory returndata) = req.to.call(
            abi.encodePacked(req.data, req.from)
        );

        emit MetaTransactionExecuted(req.from, req.to, req.nonce, success);

        return (success, returndata);
    }

    function getNonce(address from) external view returns (uint256) {
        return _nonces[from];
    }

    function addWhitelisted(address target) external onlyOwner {
        if (target == address(0)) {
            revert ZeroAddressTarget();
        }

        whitelistedTargets[target] = true;
        emit TargetWhitelisted(target);
    }

    function removeWhitelisted(address target) external onlyOwner {
        whitelistedTargets[target] = false;
        emit TargetRemoved(target);
    }

    function _verify(
        ForwardRequest calldata req,
        bytes calldata signature
    ) internal view returns (bool) {
        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(_hash(req));
        return digest.recover(signature) == req.from;
    }

    function _hash(ForwardRequest calldata req) internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                address(this),
                block.chainid,
                req.from,
                req.to,
                req.nonce,
                req.deadline,
                keccak256(req.data)
            )
        );
    }
}
