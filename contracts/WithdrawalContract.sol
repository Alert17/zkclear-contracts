// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract WithdrawalContract is ReentrancyGuard {
    event Withdrawal(
        address indexed user,
        uint256 indexed assetId,
        uint256 amount,
        bytes32 proofHash
    );

    event SequencerUpdated(address indexed oldSequencer, address indexed newSequencer);

    address public sequencer;
    mapping(bytes32 => bool) public processedWithdrawals;

    struct WithdrawalData {
        address user;
        uint256 assetId;
        uint256 amount;
        uint256 nonce;
        bytes32 stateRoot;
    }

    error InvalidUser();
    error InvalidAmount();
    error WithdrawalAlreadyProcessed();
    error InvalidProof();
    error OnlySequencer();
    error InvalidSequencerAddress();

    modifier onlySequencer() {
        if (msg.sender != sequencer) revert OnlySequencer();
        _;
    }

    constructor(address _sequencer) {
        if (_sequencer == address(0)) revert InvalidSequencerAddress();
        sequencer = _sequencer;
    }

    function withdraw(
        bytes calldata proof,
        WithdrawalData calldata data
    ) external nonReentrant {
        if (data.amount == 0) revert InvalidAmount();
        if (data.user != msg.sender) revert InvalidUser();
        
        bytes32 proofHash = keccak256(proof);
        if (processedWithdrawals[proofHash]) revert WithdrawalAlreadyProcessed();
        
        if (!verifyProof(proof, data)) revert InvalidProof();
        
        processedWithdrawals[proofHash] = true;
        
        emit Withdrawal(data.user, data.assetId, data.amount, proofHash);
    }

    function verifyProof(
        bytes calldata proof,
        WithdrawalData calldata data
    ) internal pure returns (bool) {
        if (proof.length == 0) return false;
        
        return true;
    }

    function setSequencer(address _sequencer) external onlySequencer {
        if (_sequencer == address(0)) revert InvalidSequencerAddress();
        address oldSequencer = sequencer;
        sequencer = _sequencer;
        emit SequencerUpdated(oldSequencer, _sequencer);
    }
}

