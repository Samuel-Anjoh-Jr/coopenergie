/**
 * Build a debug APK for the Expo mobile app and install it on a connected
 * Android device via ADB. Runs expo prebuild first if the android/ directory
 * does not exist yet.
 *
 * Usage: node scripts/mobile-android-install.js
 *        node scripts/mobile-android-install.js --release   (release APK)
 *
 * NOTE: Update PACKAGE_NAME below if expo prebuild generates a different
 *       package name (check android/app/build.gradle → applicationId).
 */
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const mobileDir = path.resolve(__dirname, "..", "apps", "mobile");
const androidDir = path.join(mobileDir, "android");
const adb = `${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe`;

// Update this to match the applicationId in android/app/build.gradle
// after running expo prebuild for the first time.
const PACKAGE_NAME = "com.coopenergie.app";

const isRelease = process.argv.includes("--release");
const variant = isRelease ? "Release" : "Debug";
const variantLower = variant.toLowerCase();

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = isRelease ? "production" : "development";
}

const apkPath = path.join(
  androidDir,
  "app",
  "build",
  "outputs",
  "apk",
  variantLower,
  `app-${variantLower}.apk`,
);

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}\n`);
  execSync(cmd, { stdio: "inherit", ...opts });
}

// Step 1: Generate Android project if not yet prebuilt
if (!fs.existsSync(androidDir)) {
  console.log("[mobile] Generating Android native project (expo prebuild)…");
  run("bunx expo prebuild --platform android --no-install", { cwd: mobileDir });
}

// Patch gradle.properties to avoid OOM: limit heap and build only arm64-v8a for debug
const gradlePropsPath = path.join(androidDir, "gradle.properties");
if (fs.existsSync(gradlePropsPath)) {
  let props = fs.readFileSync(gradlePropsPath, "utf8");
  props = props.replace(
    /org\.gradle\.jvmargs=.*/,
    'org.gradle.jvmargs=-Xmx1024m -XX:MaxMetaspaceSize=256m -Dfile.encoding=UTF-8 -Dkotlin.daemon.jvm.options="-Xmx512m"',
  );
  if (!props.includes("org.gradle.internal.http.connectionTimeout")) {
    props += "\norg.gradle.internal.http.connectionTimeout=120000\norg.gradle.internal.http.socketTimeout=120000\n";
  }
  if (!isRelease) {
    props = props.replace(
      /reactNativeArchitectures=.*/,
      "reactNativeArchitectures=arm64-v8a",
    );
    props = props.replace(/newArchEnabled=.*/, "newArchEnabled=true");
    props = props.replace(/hermesEnabled=.*/, "hermesEnabled=true");
  }
  fs.writeFileSync(gradlePropsPath, props);
  console.log(
    "[mobile] gradle.properties patched (heap limited, arm64-v8a only for debug).",
  );
}

// Step 2: Build APK via Gradle
console.log(`[mobile] Building ${variant} APK…`);
run(`cmd /c gradlew.bat assemble${variant}`, { cwd: androidDir });

// Step 3: Install via ADB (reinstall if already installed)
console.log("[mobile] Installing APK on connected device…");
try {
  run(`"${adb}" install -r "${apkPath}"`);
} catch {
  console.log("[mobile] Install failed — uninstalling and retrying…");
  try {
    run(`"${adb}" uninstall ${PACKAGE_NAME}`);
  } catch {
    // ignore if not installed
  }
  run(`"${adb}" install "${apkPath}"`);
}

// Step 4: Launch
console.log("[mobile] Launching app…");
run(
  `"${adb}" shell monkey -p ${PACKAGE_NAME} -c android.intent.category.LAUNCHER 1`,
);

console.log(`\n[mobile] Done. App installed and launched (${variant}).`);
