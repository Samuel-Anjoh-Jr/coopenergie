const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const metroFamilyPackages = [
  "metro",
  "metro-cache",
  "metro-config",
  "metro-core",
  "metro-file-map",
  "metro-resolver",
  "metro-runtime",
  "metro-source-map",
  "metro-symbolicate",
  "metro-transform-plugins",
  "metro-transform-worker",
];

let patchedCount = 0;

for (const packageName of metroFamilyPackages) {
  const packageJsonPath = path.join(
    rootDir,
    "node_modules",
    ".bun",
    "node_modules",
    packageName,
    "package.json",
  );

  if (!fs.existsSync(packageJsonPath)) {
    continue;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  packageJson.exports = packageJson.exports || {};

  if (packageJson.exports["./src/*"] === "./src/*.js") {
    continue;
  }

  packageJson.exports["./src/*"] = "./src/*.js";
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
  patchedCount += 1;
}

if (patchedCount === 0) {
  console.log("[patch-metro-exports] metro family exports already patched.");
} else {
  console.log(
    `[patch-metro-exports] patched exports for ${patchedCount} metro package(s).`,
  );
}
