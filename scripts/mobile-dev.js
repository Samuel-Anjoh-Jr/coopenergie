/**
 * Mobile dev launcher — prefers offline Expo startup by default in the
 * Bun-based dev workflow, while still allowing explicit online mode.
 */
const { spawn } = require("node:child_process");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");

function shouldPreferOffline() {
  const mode = (process.env.EXPO_DEV_NETWORK_MODE || "offline").trim().toLowerCase();

  if (mode === "online") {
    return false;
  }

  if (mode === "offline") {
    return true;
  }

  return process.platform === "win32";
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, "127.0.0.1");
  });
}

function isPrivateIpv4(address) {
  return (
    /^10\./.test(address) ||
    /^192\.168\./.test(address) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  );
}

function getPreferredLanAddress() {
  if (process.env.MOBILE_LAN_IP && process.env.MOBILE_LAN_IP.trim()) {
    return process.env.MOBILE_LAN_IP.trim();
  }

  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, addresses] of Object.entries(interfaces)) {
    for (const address of addresses || []) {
      if (address.family !== "IPv4" || address.internal || !isPrivateIpv4(address.address)) {
        continue;
      }

      const lowered = name.toLowerCase();
      let score = 0;

      if (lowered.includes("wi-fi") || lowered.includes("wireless") || lowered.includes("wlan")) {
        score += 50;
      }

      if (lowered === "ethernet" || lowered.includes("ethernet")) {
        score += 30;
      }

      if (/^192\.168\.\d+\.\d+$/.test(address.address)) {
        score += 5;
      }

      if (lowered.includes("vmware") || lowered.includes("virtual") || lowered.includes("vethernet") || lowered.includes("wsl") || lowered.includes("hyper-v")) {
        score -= 100;
      }

      candidates.push({ address: address.address, score });
    }
  }

  candidates.sort((left, right) => right.score - left.score);
  return candidates[0]?.address;
}

function rewriteLoopbackUrl(value, host) {
  if (!value || !host) {
    return value;
  }

  return value.replace(/(https?|wss?):\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/i, `$1://${host}`);
}

async function pickExpoPort(startPort = 8081, maxAttempts = 20) {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const candidate = startPort + offset;
    const free = await isPortFree(candidate);
    if (free) {
      return candidate;
    }
  }

  return startPort;
}

function run(extraArgs, expoPort) {
  return new Promise((resolve) => {
    const env = { ...process.env };
    const preferredHost = process.env.REACT_NATIVE_PACKAGER_HOSTNAME || getPreferredLanAddress();

    if (!env.EXPO_NO_METRO_WORKSPACE_ROOT) {
      env.EXPO_NO_METRO_WORKSPACE_ROOT = "1";
    }

    if (preferredHost) {
      env.REACT_NATIVE_PACKAGER_HOSTNAME = preferredHost;
      env.EXPO_PACKAGER_PROXY_URL = `http://${preferredHost}:${expoPort}`;
      env.EXPO_PUBLIC_API_URL = rewriteLoopbackUrl(env.EXPO_PUBLIC_API_URL, preferredHost);
      env.EXPO_PUBLIC_GRAPHQL_URL = rewriteLoopbackUrl(
        env.EXPO_PUBLIC_GRAPHQL_URL,
        preferredHost,
      );
      env.EXPO_PUBLIC_GRAPHQL_WS_URL = rewriteLoopbackUrl(
        env.EXPO_PUBLIC_GRAPHQL_WS_URL,
        preferredHost,
      );
    }

    const child = spawn(
      "bun",
      ["run", "--cwd", "apps/mobile", "start", "--port", String(expoPort), ...extraArgs],
      {
        cwd: rootDir,
        stdio: "inherit",
        env,
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
  const startPort = Number.parseInt(process.env.EXPO_PORT || "8081", 10) || 8081;
  const expoPort = await pickExpoPort(startPort);
  const preferOffline = shouldPreferOffline();

  if (expoPort !== startPort) {
    process.stdout.write(
      `[mobile-dev] Port ${startPort} is busy; using ${expoPort}.\n`,
    );
  }

  const preferredHost = process.env.REACT_NATIVE_PACKAGER_HOSTNAME || getPreferredLanAddress();
  if (preferredHost) {
    process.stdout.write(`[mobile-dev] Using LAN host ${preferredHost} for Expo Go.\n`);
  }

  const initialArgs = preferOffline ? ["--offline"] : [];

  if (preferOffline) {
    process.stdout.write(
      "[mobile-dev] Starting Expo in offline mode to avoid Bun fetch instability. Set EXPO_DEV_NETWORK_MODE=online to force online startup.\n",
    );
  }

  const result = await run(initialArgs, expoPort);

  // Non-zero exit with no signal usually indicates startup/runtime failure.
  // Retry once in offline mode to bypass Expo dependency fetch failures.
  const isStartupFail = result.code !== 0 && !result.signal;

  if (isStartupFail && !preferOffline) {
    process.stdout.write(
      "\n[mobile-dev] Expo startup failed — retrying in offline mode (skipping dependency check)…\n\n",
    );
    const offline = await run(["--offline"], expoPort);
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
