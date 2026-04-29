import { PublicClient, decodeEventLog } from "viem";

/**
 * Robustly fetches logs for a given event, falling back to receipt.logs if needed.
 * @param publicClient The viem public client
 * @param params { address, abi, eventName, fromBlock, toBlock, txHash, receipt }
 * @returns Array of decoded logs (with args)
 */
export async function getEventLogsRobust({
  publicClient,
  address,
  abi,
  eventName,
  fromBlock,
  toBlock,
  txHash,
  receipt,
}: {
  publicClient: PublicClient;
  address: string;
  abi: any;
  eventName: string;
  fromBlock: bigint;
  toBlock: bigint;
  txHash?: string;
  receipt?: { logs?: readonly any[] } | null;
}): Promise<any[]> {
  // Try getLogs first
  let logs: any[] = [];
  try {
    logs = await publicClient.getLogs({
      address: address as `0x${string}`,
      event: abi.find((item: any) => item.name === eventName),
      fromBlock,
      toBlock,
    });
  } catch (err) {
    console.warn(`[getEventLogsRobust] getLogs error:`, err);
  }
  if (logs.length) return logs;

  if (!txHash || !receipt?.logs?.length) {
    return [];
  }

  console.warn(
    `[getEventLogsRobust] getLogs returned empty, falling back to receipt.logs for ${eventName}`,
  );
  const decodedLogs: any[] = [];
  for (const log of (receipt?.logs || []) as any[]) {
    try {
      if (
        typeof log.address === "string" &&
        typeof log.transactionHash === "string" &&
        log.address.toLowerCase() === address.toLowerCase() &&
        log.transactionHash === txHash
      ) {
        const decoded = decodeEventLog({
          abi,
          data: log.data,
          topics: log.topics,
        }) as { eventName: string; args: any };
        if (decoded && decoded.eventName === eventName) {
          decodedLogs.push({ ...log, args: decoded.args });
        }
      }
    } catch (err) {
      console.error(`[getEventLogsRobust] Error decoding log:`, err, log);
    }
  }
  return decodedLogs;
}
