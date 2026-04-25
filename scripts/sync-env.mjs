import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const sourcePath = path.join(rootDir, ".env");

if (!existsSync(sourcePath)) {
  console.error("Root .env file not found.");
  process.exit(1);
}

const envContent = readFileSync(sourcePath, "utf8");
const targets = [
  "apps/web/.env.local",
  "apps/backend/.env",
  "apps/mobile/.env",
  "contracts/.env",
];

for (const relativeTarget of targets) {
  const targetPath = path.join(rootDir, relativeTarget);
  const targetDir = path.dirname(targetPath);

  if (!existsSync(targetDir)) {
    console.log(`Skipping ${relativeTarget}: directory does not exist.`);
    continue;
  }

  writeFileSync(targetPath, envContent, "utf8");
  console.log(`Synced .env -> ${relativeTarget}`);
}
