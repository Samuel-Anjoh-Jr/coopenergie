import { Injectable, Logger } from "@nestjs/common";
import { Wallet } from "ethers";

import { EncryptionService } from "../common/encryption/encryption.service";

export type CeloWallet = {
  address: string;
  encryptedPrivateKey: string;
};

/**
 * Service for generating and managing Celo wallets.
 * Generates random wallets and encrypts private keys before storage.
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly encryptionService: EncryptionService) {}

  /**
   * Generate a new random Celo wallet.
   * Returns the public address and encrypted private key.
   * Private key is NEVER returned in plaintext.
   */
  generateWallet(): CeloWallet {
    try {
      // Generate a random wallet using ethers
      const wallet = Wallet.createRandom();

      // Encrypt the private key before returning
      const encryptedPrivateKey = this.encryptionService.encrypt(
        wallet.privateKey,
      );

      this.logger.debug(`Generated new wallet: ${wallet.address}`);

      return {
        address: wallet.address,
        encryptedPrivateKey,
      };
    } catch (error) {
      this.logger.error("Failed to generate wallet", error);
      throw error;
    }
  }

  /**
   * Retrieve the decrypted private key for a wallet.
   * CAUTION: Only use when necessary for signing transactions.
   * NEVER expose this in API responses.
   */
  getDecryptedPrivateKey(encryptedPrivateKey: string): string {
    try {
      return this.encryptionService.decrypt(encryptedPrivateKey);
    } catch (error) {
      this.logger.error("Failed to decrypt private key", error);
      throw error;
    }
  }

  /**
   * Verify that an encrypted key can be decrypted without returning the key.
   * Useful for checking key integrity.
   */
  verifyEncryptedKey(encryptedPrivateKey: string): boolean {
    try {
      const decrypted = this.encryptionService.decrypt(encryptedPrivateKey);
      // Basic validation: private key should be 66 characters (0x + 64 hex chars)
      return decrypted.startsWith("0x") && decrypted.length === 66;
    } catch {
      return false;
    }
  }
}
