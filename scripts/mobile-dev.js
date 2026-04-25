/**
 * Mobile dev launcher — tries online mode first, falls back to offline
 * automatically if Expo's dependency fetch fails (e.g. no internet).
 */
const { spawn } = require("node:child_process");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");

function run(extraArgs) {
  return new Promise((resolve) => {
    const child = spawn(
      "bun",
      ["run", "--cwd", "apps/mobile", "start", ...extraArgs],
      {
        cwd: rootDir,
        stdio: "inherit",
        shell: process.platform === "win32",
      },
    );

    child.on("error", (err) => {
      console.error("[mobile-dev] Spawn error:", err.message);
      resolve({ code: 1, signal: null });
    });

    child.on("exit", (code, signal) => {
      resolve({ code: code ?? 0, signal });
    });
  });
}

async function main() {
  const result = await run([]);

  // Non-zero exit with no signal usually indicates startup/runtime failure.
  // Retry once in offline mode to bypass Expo dependency fetch failures.
  const isStartupFail = result.code !== 0 && !result.signal;

  if (isStartupFail) {
    process.stdout.write(
      "\n[mobile-dev] Expo startup failed — retrying in offline mode (skipping dependency check)…\n\n",
    );
    const offline = await run(["--offline"]);
    if (offline.signal) {
      process.kill(process.pid, offline.signal);
    } else {
      process.exit(offline.code);
    }
    return;
  }

  if (result.signal) {
    process.kill(process.pid, result.signal);
  } else {
    process.exit(result.code);
  }
}

main();
