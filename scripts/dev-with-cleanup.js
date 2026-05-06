const { execSync, spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const children = new Set();
let shuttingDown = false;

function canConnect(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    const finish = (connected) => {
      socket.destroy();
      resolve(connected);
    };

    socket.setTimeout(1000);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

async function waitForPort(port, label, timeoutMs = 30000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    // eslint-disable-next-line no-await-in-loop
    const connected = await canConnect(port);
    if (connected) {
      return;
    }

    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`${label} did not become ready on port ${port} within ${timeoutMs}ms.`);
}

async function ensureLocalInfrastructure() {
  const composeFile = path.join(rootDir, "docker-compose.yml");
  if (!existsSync(composeFile)) {
    return;
  }

  const [postgresReady, redisReady] = await Promise.all([
    canConnect(5432),
    canConnect(6379),
  ]);

  if (postgresReady && redisReady) {
    return;
  }

  console.log("Starting local Postgres/Redis via docker compose...");

  try {
    execSync("docker compose up -d postgres redis", {
      cwd: rootDir,
      stdio: "inherit",
    });
  } catch (error) {
    console.error(
      "Failed to start docker compose services automatically. Run `bun run db:up` or start Postgres/Redis manually.",
    );
    throw error;
  }

  if (!postgresReady) {
    await waitForPort(5432, "Postgres");
  }

  if (!redisReady) {
    await waitForPort(6379, "Redis");
  }
}

function startProcess(name, args, command = "bun") {
  console.log(`Starting ${name}...`);

  const child = spawn(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  children.add(child);

  child.on("error", (error) => {
    console.error(`${name} failed to start:`, error.message);
    shutdown(1);
  });

  child.on("exit", (code, signal) => {
    children.delete(child);

    if (shuttingDown) {
      return;
    }

    if (signal) {
      console.log(`${name} exited with signal ${signal}.`);
    } else if (code !== 0) {
      console.log(`${name} exited with code ${code}.`);
    }

    shutdown(code ?? 0);
  });
}

function stopChild(child) {
  if (!child || child.killed || child.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    try {
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: "ignore" });
    } catch {}
    return;
  }

  try {
    child.kill("SIGTERM");
  } catch {}
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log("\nShutting down dev processes...");

  for (const child of children) {
    stopChild(child);
  }

  setTimeout(() => process.exit(exitCode), 250);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

async function main() {
  try {
    execSync("node scripts/patch-metro-exports.js", {
      cwd: rootDir,
      stdio: "inherit",
    });
  } catch (error) {
    console.error("Failed to patch metro exports:", error.message);
  }

  const webPackage = path.join(rootDir, "apps/web/package.json");
  if (!existsSync(webPackage)) {
    console.error("apps/web/package.json not found.");
    process.exit(1);
  }

  startProcess("web", ["run", "--cwd", "apps/web", "dev"]);

  const backendDir = path.join(rootDir, "apps/backend");
  if (!existsSync(backendDir)) {
    console.log("apps/backend does not exist yet; running web only.");
  } else {
    const backendEntry = path.join(rootDir, "apps/backend/src/main.ts");
    const backendPackage = path.join(rootDir, "apps/backend/package.json");

    if (existsSync(backendEntry) && existsSync(backendPackage)) {
      await ensureLocalInfrastructure();
      startProcess("backend", ["run", "--cwd", "apps/backend", "dev"]);
    } else {
      console.log(
        "Skipping backend: apps/backend/src/main.ts or package.json is missing.",
      );
    }

    const mobilePackage = path.join(rootDir, "apps/mobile/package.json");
    if (existsSync(mobilePackage)) {
      startProcess("mobile", ["scripts/mobile-dev.js"], "node");
    } else {
      console.log("Skipping mobile: apps/mobile/package.json is missing.");
    }
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Failed to start dev workflow:", message);
  shutdown(1);
});
