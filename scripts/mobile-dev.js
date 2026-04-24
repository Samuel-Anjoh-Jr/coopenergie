/**
 * Mobile dev launcher — tries online mode first, falls back to offline
 * automatically if Expo's dependency fetch fails (e.g. no internet).
 */
const { spawn } = require("node:child_process");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");

// If Expo exits within this window with code 1, assume a startup failure
// (network check, etc.) rather than a deliberate user quit. Retry offline.
const QUICK_FAIL_WINDOW_MS = 30_000;

function run(extraArgs) {
  return new Promise((resolve) => {
    const startedAt = Date.now();

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
      resolve({ code: 1, elapsed: 0, signal: null });
    });

    child.on("exit", (code, signal) => {
      resolve({ code: code ?? 0, elapsed: Date.now() - startedAt, signal });
    });
  });
}

async function main() {
  const result = await run([]);

  // Quick non-zero exit with no signal = startup error (e.g. network fetch)
  const isStartupFail =
    result.code !== 0 &&
    result.elapsed < QUICK_FAIL_WINDOW_MS &&
    !result.signal;

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
