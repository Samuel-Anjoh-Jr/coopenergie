const { execSync, spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const children = new Set();
let shuttingDown = false;

function startProcess(name, args) {
  console.log(`Starting ${name}...`);

  const child = spawn("bun", args, {
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
    startProcess("backend", ["run", "--cwd", "apps/backend", "dev"]);
  } else {
    console.log("Skipping backend: apps/backend/src/main.ts or package.json is missing.");
  }

  const mobilePackage = path.join(rootDir, "apps/mobile/package.json");
  if (existsSync(mobilePackage)) {
    startProcess("mobile", ["run", "--cwd", "apps/mobile", "dev"]);
  } else {
    console.log("Skipping mobile: apps/mobile/package.json is missing.");
  }
}
