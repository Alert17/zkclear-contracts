# ZKClear Contracts

Smart contracts for ZKClear deposit and withdrawal functionality. Currently supports Ethereum and Mantle for v1.

## Contracts

### DepositContract
Handles user deposits on each supported EVM chain. Supports both ERC20 tokens and native ETH.

**Functions:**
- `deposit(uint256 assetId, uint256 amount)` - Deposit ERC20 tokens
- `depositNative(uint256 assetId)` - Deposit native ETH (payable)
- `registerAsset(uint256 assetId, address tokenAddress)` - Register asset (owner only)
- `withdrawTokens(address tokenAddress, uint256 amount)` - Withdraw tokens (owner only)
- `withdrawNative(uint256 amount)` - Withdraw native ETH (owner only)

**Events:**
- `Deposit(address indexed user, uint256 indexed assetId, uint256 amount, bytes32 indexed txHash)`

**Event Format (for watcher):**
- `topics[0]` = event signature hash
- `topics[1]` = user address (padded to 32 bytes)
- `topics[2]` = assetId (uint256)
- `data` = amount (uint256, 32 bytes)

### VerifierContract
Handles block proof verification and maintains state_root on-chain (rollup-style).

**Functions:**
- `submitBlockProof(uint256 blockId, bytes32 prevStateRoot, bytes32 newStateRoot, bytes32 withdrawalsRoot, bytes calldata proof)` - Submit block proof (sequencer only)
- `isNullifierUsed(bytes32 nullifier)` - Check if nullifier has been used
- `markNullifierUsed(bytes32 nullifier)` - Mark nullifier as used (called by WithdrawalContract)
- `getStateRoot()` - Get current state root
- `setSequencer(address _sequencer)` - Update sequencer address (sequencer only)

**Events:**
- `StateRootUpdated(uint256 indexed blockId, bytes32 indexed prevStateRoot, bytes32 indexed newStateRoot, bytes32 withdrawalsRoot)`

### WithdrawalContract
Handles withdrawals with ZK proof verification (rollup-style).

**Functions:**
- `withdraw(WithdrawalData calldata withdrawalData, bytes calldata merkleProof, bytes32 nullifier, bytes calldata zkProof, bytes32 withdrawalsRoot_)` - Withdraw with ZK proof
- `updateWithdrawalsRoot(bytes32 newWithdrawalsRoot)` - Update withdrawals root (owner only)
- `getWithdrawalsRoot()` - Get current withdrawals root
- `setVerifier(address _verifier)` - Update verifier contract (owner only)

**Events:**
- `Withdrawal(address indexed user, uint256 indexed assetId, uint256 amount, bytes32 indexed nullifier, bytes32 withdrawalsRoot)`

**Note:** ZK proof verification is currently a placeholder. Will be implemented with actual ZK verifier.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Set your private key and RPC URLs in `.env`:
```env
PRIVATE_KEY=your_private_key_here

ETHEREUM_RPC=https://eth.llamarpc.com
MANTLE_RPC=https://rpc.mantle.xyz

ETHERSCAN_API_KEY=your_etherscan_api_key
```

## Deployment

### Deploy to single network:
```bash
npm run deploy:ethereum
npm run deploy:mantle
```

Each deployment will:
- Deploy DepositContract, VerifierContract, and WithdrawalContract
- Verify contracts on block explorer (Ethereum only)
- Display deployment summary

### Save deployment addresses:
```bash
npm run save-addresses
```

This saves addresses to `deployments-{chainId}.json` files.

## Testing

```bash
npm test
```

Tests cover:
- Deposit functionality (ERC20 and native)
- Asset registration
- Withdrawal functionality
- Access control

## Network Configuration

All networks are configured via environment variables in `hardhat.config.js`:
- `PRIVATE_KEY` - Deployer private key (same for all networks)
- `ETHEREUM_RPC`, `MANTLE_RPC` - RPC URLs
- `ETHERSCAN_API_KEY` - Block explorer API key for verification (Ethereum only)

## Chain IDs

- Ethereum: 1
- Mantle: 5000

## Integration with Core

After deployment, update watcher configuration in `core/zkclear-core/crates/watcher/src/config.rs`:
- Set `deposit_contract_address` for each chain
- Watcher will automatically monitor deposit events
- Events will be converted to Deposit transactions in sequencer

## Contract Addresses

After deployment, addresses are saved to `deployments-{chainId}.json` files (gitignored).
