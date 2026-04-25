import {
  encodeAbiParameters,
  getAddress,
  Hex,
  keccak256,
  recoverAddress,
  toHex,
} from "viem";

export type ForwardRequest = {
  from: `0x${string}`;
  to: `0x${string}`;
  nonce: bigint;
  deadline: bigint;
  data: Hex;
};

/**
 * Creates the digest/hash that should be signed for a ForwardRequest.
 * This matches the GasRelayer._hash() computation on-chain.
 */
export function createForwardRequestDigest(
  request: ForwardRequest,
  relayerAddress: `0x${string}`,
  chainId: number,
): Hex {
  const encoded = encodeAbiParameters(
    [
      { name: "relayer", type: "address" },
      { name: "chainId", type: "uint256" },
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "dataHash", type: "bytes32" },
    ],
    [
      relayerAddress,
      BigInt(chainId),
      request.from,
      request.to,
      request.nonce,
      request.deadline,
      keccak256(request.data),
    ],
  );

  return keccak256(encoded);
}

/**
 * Verifies that a signature was created by the expected signer using EIP-191 personal_sign.
 */
export async function verifySignature(
  digest: Hex,
  signature: Hex,
  expectedSigner: `0x${string}`,
): Promise<boolean> {
  try {
    // Create the message hash using EIP-191 personal_sign format
    const prefix = "\x19Ethereum Signed Message:\n32";
    const prefixedMessage = prefix + digest.slice(2);

    const messageHash = keccak256(toHex(prefixedMessage));

    const recoveredAddress = await recoverAddress({
      hash: messageHash,
      signature,
    });

    return getAddress(recoveredAddress) === getAddress(expectedSigner);
  } catch {
    return false;
  }
}

/**
 * Generate a signature for testing purposes (backend signing with relayer key).
 * In production, users would sign this with their private key via MetaMask/web3 wallet.
 * The frontend should:
 * 1. Call getMessageForSigning() on backend to get the digest
 * 2. Sign with wallet.signMessage(digest)
 * 3. Pass signature back to backend with the transaction
 */
export function createUserSigningPayload(digest: Hex): {
  message: string;
  digest: Hex;
} {
  return {
    message: `Sign this message to authorize the meta-transaction. Digest: ${digest}`,
    digest,
  };
}
