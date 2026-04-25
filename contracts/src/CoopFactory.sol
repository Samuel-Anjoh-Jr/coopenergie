// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./CooperativeVault.sol";
import "./GasRelayer.sol";

contract CoopFactory is Ownable {
    address public relayer;
    address[] public allVaults;
    mapping(address => bool) public isVault;

    event CooperativeDeployed(
        address indexed vault,
        string name,
        address indexed admin,
        uint256 timestamp
    );

    error InvalidAddress();

    constructor(address _relayer) Ownable(msg.sender) {
        if (_relayer == address(0)) {
            revert InvalidAddress();
        }

        relayer = _relayer;
    }

    function deployCooperative(
        string memory name,
        uint256 targetAmountXAF,
        address admin
    ) external onlyOwner returns (address vault) {
        if (admin == address(0)) {
            revert InvalidAddress();
        }

        CooperativeVault deployedVault = new CooperativeVault(
            name,
            targetAmountXAF,
            admin,
            relayer
        );

        vault = address(deployedVault);
        allVaults.push(vault);
        isVault[vault] = true;

        GasRelayer(relayer).addWhitelisted(vault);

        emit CooperativeDeployed(vault, name, admin, block.timestamp);
    }

    function getAllVaults() external view returns (address[] memory) {
        return allVaults;
    }

    function getVaultCount() external view returns (uint256) {
        return allVaults.length;
    }
}
