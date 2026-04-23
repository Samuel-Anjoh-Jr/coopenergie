# Blockchain GasRelayer Meta-Transaction Refactoring

## Overview

Refactored all blockchain interactions to use the GasRelayer smart contract with signed meta-transactions instead of direct vault calls. This provides:

- **Replay protection** via nonce management
- **ERC-2771 compatibility** with user address context
- **User-initiated transactions** signed off-chain
- **Gas abstraction** via the relayer

## Architecture Changes

### 1. **GasRelayer.sol Execution Flow**

```
User → Signs ForwardRequest → Backend → GasRelayer.execute(request, signature)
         (off-chain)             (verifies)  → Vault (via ERC-2771)
```

### 2. **Key Components**

#### `signature-helper.ts` (NEW)

- `createForwardRequestDigest()` — Creates the message hash matching GasRelayer on-chain logic
- `verifySignature()` — EIP-191 personal_sign verification
- `createUserSigningPayload()` — Prepares message for frontend signing
- Exported `ForwardRequest` type for type safety

#### `relayer.service.ts` (REFACTORED)

**Breaking Changes:**

- ✅ `relayContribute()` — Now calls GasRelayer.execute() instead of vault directly
- ✅ `relayCreateProposal()` — Same refactoring
- ✅ `relayVote()` — Same refactoring
- ✅ `relayFundsReleased()` — Now uses relayer for funds release (no direct vault calls)

**New Methods:**

- `getMessageForSigning(vaultAddress, userAddress, functionData)` — Returns digest + nonce + deadline for frontend signing

**Internal Changes:**

- `signAndSubmit()` — Now calls `GasRelayer.execute()` via `walletClient.writeContract()`
- `signRequestWithRelayerWallet()` — Backend signing with relayer wallet (temporary, pending frontend implementation)
- `createDigestForRequest()` — Uses `createForwardRequestDigest()` from signature-helper

#### `signed-transaction.dto.ts` (NEW)

Allows services to accept user signatures:

```typescript
{
  userSignature?: Hex;      // User's EIP-191 signed message
  signingDigest?: Hex;      // The digest that was signed
}
```

### 3. **Nonce & Replay Protection**

- Each user has a nonce tracked on-chain in GasRelayer
- Incremented after successful execution
- Prevents replay attacks across multiple blockchains (chain ID included in hash)
- Request deadline (5-minute window) adds time-based expiration

### 4. **Service Integration**

All existing services continue to work without changes:

- `contributions.service.ts` — Still calls `relayerService.relayContribute()`
- `proposals.service.ts` — Still calls `relayerService.relayCreateProposal()`
- `votes.service.ts` — Still calls `relayerService.relayVote()`
- `withdrawals/disbursement.service.ts` — Still calls `relayerService.relayFundsReleased()`

Services can optionally pass user signatures in future updates.

### 5. **Backward Compatibility**

- If no user signature provided, backend signs with relayer wallet (current implementation)
- All relay methods maintain same signatures
- No breaking changes to consuming services

## Future: Frontend Signature Support

### Step 1: Request Message for Signing

```typescript
const { digest, nonce, deadline } = await relayerService.getMessageForSigning(
  vaultAddress,
  userAddress,
  encodedData,
);
```

### Step 2: Sign in Frontend

```typescript
const signature = await wallet.signMessage({
  message: { raw: digest },
  account: userAddress,
});
```

### Step 3: Submit with Signature

```typescript
await relayerService.relayContribute(
  vaultAddress,
  userAddress,
  amountXAF,
  signature,
);
```

## Verification

### On-Chain Guarantees

- ✅ GasRelayer verifies signature matches `request.from`
- ✅ Nonce incremented only after successful execution
- ✅ Deadline enforced (5-minute window)
- ✅ Only whitelisted targets (vaults) can be called
- ✅ ERC-2771 context ensures vault receives user address

### No Cross-Cooperative Leakage

- Each cooperative has separate vault contract
- Nonce tracked per-user in GasRelayer
- User can only sign for their own address
- Relay methods pass user's celoAddress explicitly

## File Changes Summary

- ✅ Created `signature-helper.ts` — Signature generation/verification
- ✅ Created `dto/signed-transaction.dto.ts` — DTO for user signatures
- ✅ Refactored `relayer.service.ts` — Now uses GasRelayer.execute()
- ✅ No changes needed to vault.service.ts (read-only operations)
- ✅ No changes needed to consuming services (backward compatible)
