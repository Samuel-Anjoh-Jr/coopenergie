const { execSync } = require("node:child_process");
const { rmSync } = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const buildArtifacts = [
  "apps/web/.next",
  "apps/web/out",
  "apps/backend/dist",
  "apps/mobile/.expo",
  "contracts/artifacts",
  "contracts/cache",
];

for (const relativePath of buildArtifacts) {
  rmSync(path.join(rootDir, relativePath), { recursive: true, force: true });
}

try {
  execSync('pkill -f "bun run"', { stdio: "ignore", shell: true });
} catch {}

try {
  execSync('pkill -f "next dev"', { stdio: "ignore", shell: true });
} catch {}

try {
  execSync('pkill -f "nest start"', { stdio: "ignore", shell: true });
} catch {}

console.log("🛑 Stopping all node processes...");

try {
  if (process.platform === "win32") {
    execSync('cmd /c "taskkill /F /IM node.exe /T 2>nul || exit /b 0"', {
      shell: true,
      stdio: "inherit",
    });
    execSync('cmd /c "taskkill /F /IM bun.exe /T 2>nul || exit /b 0"', {
      shell: true,
      stdio: "inherit",
    });
  } else {
    execSync("pkill -f node || true", { shell: true, stdio: "inherit" });
    execSync("pkill -f bun || true", { shell: true, stdio: "inherit" });
  }

  console.log("✅ Processes stopped\n");
} catch {
  console.log("⚠️  No processes to kill\n");
}

console.log("Build artifacts cleared. node_modules preserved.");
