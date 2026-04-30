const DEFAULT_CELOSCAN_BASE = "https://celo-sepolia.blockscout.com";

export function getCeloScanBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_CELOSCAN_BASE?.trim() || DEFAULT_CELOSCAN_BASE
  ).replace(/\/+$/, "");
}

export function buildCeloScanTxUrl(txHash: string): string {
  const url = new URL(`${getCeloScanBaseUrl()}/tx/${txHash}`);
  url.searchParams.set("tab", "logs");
  return url.toString();
}
