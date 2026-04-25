import { Injectable, BadRequestException } from "@nestjs/common";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

/**
 * Encryption service for storing sensitive data like private keys.
 * Uses AES-256-GCM for authenticated encryption.
 */
@Injectable()
export class EncryptionService {
  private readonly encryptionKey: Buffer;

  constructor() {
    // Use encryption key from environment variable.
    // In local development, fall back to a deterministic key to avoid boot failures.
    let keyString = process.env.ENCRYPTION_KEY;
    if (!keyString) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "ENCRYPTION_KEY environment variable not set. Please set a 64-character hex string.",
        );
      }

      const fallbackSeed =
        process.env.NEXTAUTH_SECRET || "coopenergie-local-dev-encryption-key";
      keyString = scryptSync(fallbackSeed, "coopenergie", 32).toString("hex");
      // eslint-disable-next-line no-console
      console.warn(
        "[EncryptionService] ENCRYPTION_KEY missing; using derived development fallback key.",
      );
    }

    if (keyString.length !== 64) {
      throw new Error(
        "ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes for AES-256).",
      );
    }

    this.encryptionKey = Buffer.from(keyString, "hex");
  }

  /**
   * Encrypt a plaintext string using AES-256-GCM.
   * Returns a JSON string containing: iv, authTag, ciphertext (all base64-encoded)
   */
  encrypt(plaintext: string): string {
    try {
      // Generate a random initialization vector (12 bytes for GCM)
      const iv = randomBytes(12);

      // Create cipher with AES-256-GCM
      const cipher = createCipheriv("aes-256-gcm", this.encryptionKey, iv);

      // Encrypt the plaintext
      let encrypted = cipher.update(plaintext, "utf8", "hex");
      encrypted += cipher.final("hex");

      // Get the authentication tag
      const authTag = cipher.getAuthTag();

      // Return JSON with all components base64-encoded for easy storage
      return JSON.stringify({
        iv: iv.toString("base64"),
        authTag: authTag.toString("base64"),
        ciphertext: encrypted,
      });
    } catch (error) {
      throw new BadRequestException("Failed to encrypt data.");
    }
  }

  /**
   * Decrypt a string encrypted with the encrypt() method.
   * Expects JSON format: { iv, authTag, ciphertext }
   */
  decrypt(encryptedData: string): string {
    try {
      const { iv, authTag, ciphertext } = JSON.parse(encryptedData);

      if (!iv || !authTag || !ciphertext) {
        throw new Error("Invalid encrypted data format.");
      }

      // Decode base64 components
      const ivBuffer = Buffer.from(iv, "base64");
      const authTagBuffer = Buffer.from(authTag, "base64");
      const ciphertextBuffer = Buffer.from(ciphertext, "hex");

      // Create decipher with same parameters
      const decipher = createDecipheriv(
        "aes-256-gcm",
        this.encryptionKey,
        ivBuffer,
      );

      // Set authentication tag for verification
      decipher.setAuthTag(authTagBuffer);

      // Decrypt the ciphertext
      const decrypted = Buffer.concat([
        decipher.update(ciphertextBuffer),
        decipher.final(),
      ]).toString("utf8");

      return decrypted;
    } catch (error) {
      throw new BadRequestException(
        "Failed to decrypt data. Invalid encrypted data or wrong key.",
      );
    }
  }
}
