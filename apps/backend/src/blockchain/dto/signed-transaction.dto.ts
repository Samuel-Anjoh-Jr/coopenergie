import { IsOptional, Matches } from "class-validator";
import { Hex } from "viem";

/**
 * DTO for blockchain transaction requests with optional user signature.
 * If signature is provided, it will be used for the meta-transaction.
 * If not provided, the backend will sign with the relayer wallet (temporary measure).
 */
export class SignedTransactionDto {
  @IsOptional()
  @Matches(/^0x[0-9a-fA-F]+$/)
  userSignature?: Hex;

  @IsOptional()
  @Matches(/^0x[0-9a-fA-F]+$/)
  signingDigest?: Hex;
}
