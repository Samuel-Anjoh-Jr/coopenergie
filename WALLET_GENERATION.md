# Automatic Celo Wallet Generation at Registration

## Overview

Every user automatically receives a Celo wallet on registration. The wallet's private key is encrypted before storage and never exposed in API responses.

## Architecture

### Components

#### 1. EncryptionService

**Location:** `apps/backend/src/common/encryption/encryption.service.ts`

Provides AES-256-GCM encryption for sensitive data:

- **encrypt(plaintext)** → Returns JSON string with base64-encoded components
  - IV: 12-byte random nonce (base64)
  - AuthTag: Authentication tag for tampering detection (base64)
  - Ciphertext: Encrypted payload (hex)
- **decrypt(encryptedData)** → Returns plaintext after verifying authentication

**Key Management:**

- Encryption key from `ENCRYPTION_KEY` environment variable
- Format: 64 hexadecimal characters (32 bytes for AES-256)
- Must be set before application startup

#### 2. WalletService

**Location:** `apps/backend/src/blockchain/wallet.service.ts`

Manages Celo wallet generation and storage:

- **generateWallet()** → Returns { address, encryptedPrivateKey }
  - Uses ethers.Wallet.createRandom()
  - Encrypts private key before returning
  - **Private key never returned in plaintext**
- **getDecryptedPrivateKey(encryptedKey)** → Recovers plaintext (internal use only)
- **verifyEncryptedKey(encryptedKey)** → Validates key integrity

#### 3. AuthService (Updated)

**Location:** `apps/backend/src/modules/auth/auth.service.ts`

Registration flow:

```typescript
async register(email, password, name) {
  // 1. Hash password
  const passwordHash = bcrypt.hash(password, 12)

  // 2. Generate wallet
  const wallet = walletService.generateWallet()

  // 3. Create user with wallet details
  const user = prisma.user.create({
    email, passwordHash, name,
    celoAddress: wallet.address,              // Store public address
    celoKeyEncrypted: wallet.encryptedPrivateKey  // Store encrypted key
  })

  // 4. Return sanitized user (never exposes encrypted key)
  return { user: sanitizeUser(user), token }
}
```

### Data Flow

```
User Registration
    ↓
AuthService.register()
    ├─ Generate random wallet (ethers.Wallet.createRandom())
    ├─ Encrypt private key (AES-256-GCM)
    ├─ Store in database:
    │  ├─ celoAddress: public address
    │  └─ celoKeyEncrypted: encrypted private key
    └─ Return sanitized user (no celoKeyEncrypted)
         ↓
    Response sent to client
    (Client has address but NOT private key)
```

## Security Model

### Threat Mitigations

| Threat              | Mitigation                                           |
| ------------------- | ---------------------------------------------------- |
| Database compromise | Private keys are encrypted, not readable             |
| API exposure        | celoKeyEncrypted excluded from responses             |
| Tampering           | Authentication tag prevents undetected modifications |
| Replay attacks      | IV is randomized per encryption                      |
| Key compromise      | Environment-variable key rotation possible           |

### Private Key Access

**Never Exposed:**

- API responses (excluded via @Exclude decorator)
- Logs or debugging output
- Frontend/client-side

**Accessible Only In:**

- RelayerService (for transaction signing)
- WalletService methods (internal)
- Blockchain operations that require signing

**Usage Pattern (Relayer Integration):**

```typescript
// In RelayerService when signing transactions
const encryptedKey = user.celoKeyEncrypted;
const privateKey = walletService.getDecryptedPrivateKey(encryptedKey);
const signer = new Wallet(privateKey, provider);
const signature = await signer.signMessage(digest);
```

## Database Schema

**User Model (Prisma):**

```prisma
model User {
  id                String    @id @default(cuid())
  celoAddress       String?   @unique        // Public wallet address
  celoKeyEncrypted  String?                  // Encrypted private key
  // ... other fields
}
```

## Environment Configuration

### Required Environment Variables

```bash
# AES-256 encryption key (64 hex chars = 32 bytes)
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Other required vars (existing)
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
CELO_RPC_URL=...
# etc.
```

### Generating an Encryption Key

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32

# Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

## Module Dependencies

### Import Chain

```
AuthService
  ├─ UsersService (for storeCeloKey)
  └─ WalletService (for wallet generation)
        └─ EncryptionService (for private key encryption)
```

### Module Exports

- **BlockchainModule** — Exports WalletService
- **CommonModule** — Exports EncryptionService
- **AuthModule** — Imports UsersModule, BlockchainModule

## API Response Behavior

### Registration Request

```bash
POST /auth/register
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "User Name"
}
```

### Registration Response

```json
{
  "user": {
    "id": "user-id-123",
    "email": "user@example.com",
    "name": "User Name",
    "celoAddress": "0x1234...5678",
    "createdAt": "2025-04-23T...",
    "updatedAt": "2025-04-23T..."
    // No celoKeyEncrypted
  },
  "token": "eyJhbGc..."
}
```

### Profile Fetch

```bash
GET /users/me
```

```json
{
  "id": "user-id-123",
  "email": "user@example.com",
  "name": "User Name",
  "celoAddress": "0x1234...5678",
  "createdAt": "2025-04-23T...",
  "updatedAt": "2025-04-23T..."
  // No celoKeyEncrypted
}
```

## Testing Checklist

- [ ] User registration creates wallet
- [ ] celoAddress is unique per user
- [ ] celoKeyEncrypted not exposed in responses
- [ ] Private key can be decrypted internally
- [ ] Encryption key validation on startup
- [ ] Database entries for wallet are created
- [ ] Error handling for encryption failures

## Future: MetaMask Integration

For user-initiated transactions via RelayerService:

1. Frontend calls `relayerService.getMessageForSigning(vaultAddress, userAddress, data)`
2. User signs digest with MetaMask/web3 wallet
3. Frontend submits signature with transaction request
4. Backend verifies signature via `verifySignature()` in signature-helper.ts
5. Backend submits to GasRelayer.execute() with user signature

See [GASRELAYER_REFACTORING.md](../GASRELAYER_REFACTORING.md) for meta-transaction flow.

## Acceptance Criteria Status

✅ **Wallet generated on signup** — ethers.Wallet.createRandom()
✅ **Private key encrypted before storing** — AES-256-GCM via EncryptionService
✅ **Address stored** — celoAddress column
✅ **Encrypted key stored** — celoKeyEncrypted column
✅ **Never exposed private key** — @Exclude decorator + sanitization
✅ **Relayer compatible** — WalletService.getDecryptedPrivateKey() for signing
