import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

function getLanIp() {
  if (process.env.MOBILE_LAN_IP?.trim()) {
    return process.env.MOBILE_LAN_IP.trim();
  }

  const candidates = [];

  for (const [name, ifaces] of Object.entries(networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family !== "IPv4" || iface.internal) continue;

      const lower = name.toLowerCase();
      let score = 0;

      if (lower.includes("wi-fi") || lower.includes("wireless") || lower.includes("wlan")) score += 50;
      else if (lower === "ethernet" || lower.includes("ethernet")) score += 30;

      if (/^192\.168\.\d+\.\d+$/.test(iface.address)) score += 5;

      if (lower.includes("vmware") || lower.includes("virtual") || lower.includes("vethernet") || lower.includes("wsl") || lower.includes("hyper-v")) score -= 100;

      candidates.push({ address: iface.address, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.address ?? "localhost";
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const sourceFile = process.argv[2] || ".env";
const sourcePath = path.join(rootDir, sourceFile);
const requestedTargets = process.argv.slice(3);

if (!existsSync(sourcePath)) {
  console.error(`Source env file not found: ${sourceFile}`);
  process.exit(1);
}

const envContent = readFileSync(sourcePath, "utf8");
const allTargets = [
  "apps/web/.env.local",
  "apps/backend/.env",
  "apps/mobile/.env",
  "contracts/.env",
];

const targets =
  requestedTargets.length > 0
    ? allTargets.filter((relativeTarget) =>
        requestedTargets.some(
          (requestedTarget) =>
            relativeTarget === requestedTarget ||
            relativeTarget.startsWith(`${requestedTarget}/`) ||
            relativeTarget.startsWith(`${requestedTarget}\\`),
        ),
      )
    : allTargets;

if (requestedTargets.length > 0 && targets.length === 0) {
  console.error(
    `No env sync targets matched: ${requestedTargets.join(", ")}. Known targets: ${allTargets.join(", ")}`,
  );
  process.exit(1);
}

for (const relativeTarget of targets) {
  const targetPath = path.join(rootDir, relativeTarget);
  const targetDir = path.dirname(targetPath);

  if (!existsSync(targetDir)) {
    console.log(`Skipping ${relativeTarget}: directory does not exist.`);
    continue;
  }

  const isMobile = relativeTarget.includes("mobile");
  const content = isMobile
    ? envContent.replace(/localhost/g, getLanIp())
    : envContent;
  writeFileSync(targetPath, content, "utf8");
  console.log(`Synced ${sourceFile} -> ${relativeTarget}`);
}
