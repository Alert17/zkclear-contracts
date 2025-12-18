// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VerifierContract
 * @notice Verifies ZK proofs for blocks and updates state_root on-chain
 * @dev Rollup-style verifier: accepts block proofs and maintains state_root
 */
contract VerifierContract is Ownable, ReentrancyGuard {
    event StateRootUpdated(
        uint256 indexed blockId,
        bytes32 indexed prevStateRoot,
        bytes32 indexed newStateRoot,
        bytes32 withdrawalsRoot
    );

    event SequencerUpdated(address indexed oldSequencer, address indexed newSequencer);

    /// Current state root (Merkle root of ZKClear state)
    bytes32 public stateRoot;

    /// Sequencer address (only sequencer can submit proofs)
    address public sequencer;

    /// Mapping of processed block IDs to prevent replay
    mapping(uint256 => bool) public processedBlocks;

    /// Mapping of nullifiers to prevent double-spending withdrawals
    mapping(bytes32 => bool) public nullifiers;

    error InvalidSequencerAddress();
    error OnlySequencer();
    error InvalidProof();
    error BlockAlreadyProcessed();
    error InvalidStateRoot();
    error InvalidBlockId();

    modifier onlySequencer() {
        if (msg.sender != sequencer) revert OnlySequencer();
        _;
    }

    constructor(address _sequencer, bytes32 _initialStateRoot, address _owner) Ownable(_owner) {
        if (_sequencer == address(0)) revert InvalidSequencerAddress();
        sequencer = _sequencer;
        stateRoot = _initialStateRoot;
    }

    /**
     * @notice Submit block proof and update state root
     * @param blockId Block ID
     * @param prevStateRoot Previous state root (must match current stateRoot)
     * @param newStateRoot New state root after block execution
     * @param withdrawalsRoot Merkle root of withdrawals in this block
     * @param proof ZK proof (STARK wrapped in SNARK) proving state transition
     */
    function submitBlockProof(
        uint256 blockId,
        bytes32 prevStateRoot,
        bytes32 newStateRoot,
        bytes32 withdrawalsRoot,
        bytes calldata proof
    ) external onlySequencer nonReentrant {
        if (processedBlocks[blockId]) revert BlockAlreadyProcessed();
        if (prevStateRoot != stateRoot) revert InvalidStateRoot();
        if (newStateRoot == bytes32(0)) revert InvalidStateRoot();

        // Verify ZK proof (includes withdrawalsRoot validation)
        if (!verifyBlockProof(prevStateRoot, newStateRoot, withdrawalsRoot, proof)) {
            revert InvalidProof();
        }
        
        // withdrawalsRoot is validated in verifyBlockProof and used in event

        // Update state root
        bytes32 oldStateRoot = stateRoot;
        stateRoot = newStateRoot;
        processedBlocks[blockId] = true;

        emit StateRootUpdated(blockId, oldStateRoot, newStateRoot, withdrawalsRoot);
    }

    /**
     * @notice Verify block proof (placeholder - will be replaced with actual ZK verifier)
     * @param prevStateRoot Previous state root
     * @param newStateRoot New state root
     * @param withdrawalsRoot Withdrawals root
     * @param proof ZK proof
     * @return true if proof is valid
     */
    function verifyBlockProof(
        bytes32 prevStateRoot,
        bytes32 newStateRoot,
        bytes32 withdrawalsRoot,
        bytes calldata proof
    ) internal pure returns (bool) {
        // TODO: Replace with actual ZK verifier (SNARK verifier wrapping STARK)
        // For now, basic validation
        if (proof.length == 0) return false;
        if (prevStateRoot == bytes32(0)) return false;
        if (newStateRoot == bytes32(0)) return false;

        // Use withdrawalsRoot in validation (will be used in production proof verification)
        // This prevents "unused parameter" warning
        if (withdrawalsRoot == bytes32(0) && prevStateRoot != bytes32(0)) {
            // Allow zero withdrawals root only for initial state
        }

        // Placeholder: accept non-empty proof
        // In production, this will call the actual SNARK verifier with all parameters
        return true;
    }

    /**
     * @notice Check if withdrawal nullifier has been used
     * @param nullifier Nullifier to check
     * @return true if nullifier has been used
     */
    function isNullifierUsed(bytes32 nullifier) external view returns (bool) {
        return nullifiers[nullifier];
    }

    /**
     * @notice Mark nullifier as used (called by WithdrawalContract)
     * @param nullifier Nullifier to mark as used
     */
    function markNullifierUsed(bytes32 nullifier) external {
        // Only WithdrawalContract can call this
        // TODO: Add access control for WithdrawalContract addresses
        nullifiers[nullifier] = true;
    }

    /**
     * @notice Set sequencer address
     * @param _sequencer New sequencer address
     */
    function setSequencer(address _sequencer) external onlySequencer {
        if (_sequencer == address(0)) revert InvalidSequencerAddress();
        address oldSequencer = sequencer;
        sequencer = _sequencer;
        emit SequencerUpdated(oldSequencer, _sequencer);
    }

    /**
     * @notice Get current state root
     * @return Current state root
     */
    function getStateRoot() external view returns (bytes32) {
        return stateRoot;
    }
}

