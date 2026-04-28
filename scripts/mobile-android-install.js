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

const repoRoot = path.resolve(__dirname, "..");
const mobileDir = path.resolve(__dirname, "..", "apps", "mobile");
const androidDir = path.join(mobileDir, "android");
const adb = `${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe`;
const gradleJournalCacheFile = path.join(
  process.env.USERPROFILE || "",
  ".gradle",
  "caches",
  "journal-1",
  "file-access.bin",
);

// Prefer JDK 17 for Android/Gradle toolchain compatibility.
const jdk17Path = "C:\\Program Files\\Java\\jdk-17";
if (fs.existsSync(jdk17Path)) {
  process.env.JAVA_HOME = jdk17Path;
  process.env.PATH = `${path.join(jdk17Path, "bin")};${process.env.PATH}`;
}

// Patch nitro-modules bun cache: hardcode minSdkVersion=24 in build.gradle and
// update Nitro_minSdkVersion in gradle.properties.
// nitro-modules ships its own buildscript { classpath "AGP:9.2.0" } which creates
// a separate classloader where rootProject.ext properties are NOT visible, so
// getExtOrIntegerDefault falls back to project.properties["Nitro_minSdkVersion"]
// from its own gradle.properties (=23), resulting in ANDROID_PLATFORM=android-22.
const bunCacheDir = path.resolve(__dirname, "..", "node_modules", ".bun");
if (fs.existsSync(bunCacheDir)) {
  (function patchNitroModules(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Don't recurse into .cxx or build dirs (speed)
        if (entry.name === ".cxx" || entry.name === "build") continue;
        patchNitroModules(full);
      } else if (full.includes("react-native-nitro-modules") && full.includes(`${path.sep}android${path.sep}`)) {
        if (entry.name === "gradle.properties") {
          const content = fs.readFileSync(full, "utf8");
          const patched = content.replace(/Nitro_minSdkVersion=\d+/g, "Nitro_minSdkVersion=24");
          if (patched !== content) {
            fs.writeFileSync(full, patched);
            console.log(`[mobile] Patched gradle.properties: ${full}`);
          }
        } else if (entry.name === "build.gradle") {
          const content = fs.readFileSync(full, "utf8");
          // Hardcode minSdkVersion 24 and force native API 24 in the CMake arguments
          // so AGP/Prefab cannot silently downgrade to android-22 for this module.
          let patched = content.replace(
            /minSdkVersion\s+getExtOrIntegerDefault\("minSdkVersion"\)/g,
            "minSdkVersion 24",
          );
          patched = patched.replace(
            /arguments\s+"-DANDROID_STL=c\+\+_shared",\s*"-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON"/g,
            'arguments "-DANDROID_PLATFORM=android-24", "-DCMAKE_SYSTEM_VERSION=24", "-DANDROID_STL=c++_shared", "-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON"',
          );
          if (patched !== content) {
            fs.writeFileSync(full, patched);
            console.log(`[mobile] Patched build.gradle native API/minSdkVersion: ${full}`);
          }
        } else if (entry.name === "fix-prefab.gradle") {
          const isNitroOrMmkv =
            full.includes("react-native-nitro-modules") || full.includes("react-native-mmkv");
          if (!isNitroOrMmkv) continue;
          const content = fs.readFileSync(full, "utf8");
          const patched = content.replace(
            /def variants = proj\.android\.hasProperty\('applicationVariants'\) \? proj\.android\.applicationVariants : proj\.android\.libraryVariants/g,
            "def androidExt = proj.extensions.findByName('android')\n    if (androidExt == null || androidExt instanceof String) return\n    def variants = androidExt.hasProperty('applicationVariants') ? androidExt.applicationVariants : (androidExt.hasProperty('libraryVariants') ? androidExt.libraryVariants : null)\n    if (variants == null) return",
          );
          if (patched !== content) {
            fs.writeFileSync(full, patched);
            console.log(`[mobile] Patched fix-prefab.gradle variants lookup: ${full}`);
          }
        } else if (entry.name === "CMakeLists.txt" && full.includes("react-native-nitro-modules")) {
          const content = fs.readFileSync(full, "utf8");
          let patched = content;
          if (patched.includes("CMAKE_OBJECT_PATH_MAX")) {
            patched = patched.replace(/set\(CMAKE_OBJECT_PATH_MAX\s+\d+\)/g, "set(CMAKE_OBJECT_PATH_MAX 128)");
          } else {
            patched = patched.replace(
              /cmake_minimum_required\(VERSION\s+3\.9\.0\)\r?\n/,
              'cmake_minimum_required(VERSION 3.9.0)\n\n# Keep this low so CMake hashes object paths and avoids Windows path-limit churn.\nset(CMAKE_OBJECT_PATH_MAX 128)\n',
            );
          }
          if (patched !== content) {
            fs.writeFileSync(full, patched);
            console.log(`[mobile] Patched CMakeLists object path max: ${full}`);
          }
        }
      }
    }
  })(bunCacheDir);

  // Remove stale .cxx CMake caches so they are regenerated with the corrected API level
  (function removeCxxCaches(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      if (entry.name === ".cxx") {
        fs.rmSync(full, { recursive: true, force: true });
        console.log(`[mobile] Removed stale CMake cache: ${full}`);
      } else {
        removeCxxCaches(full);
      }
    }
  })(bunCacheDir);
}

// Recover from Gradle journal index corruption that can occur on interrupted builds.
if (gradleJournalCacheFile && fs.existsSync(gradleJournalCacheFile)) {
  try {
    fs.rmSync(gradleJournalCacheFile, { force: true });
    console.log(`[mobile] Cleared corrupted Gradle journal cache index: ${gradleJournalCacheFile}`);
  } catch {
    // non-fatal; Gradle may recreate or continue using existing cache
  }
}

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

function getFreeSubstDrive() {
  for (const letter of ["X", "Y", "Z", "W", "V"]) {
    if (!fs.existsSync(`${letter}:\\`)) return letter;
  }
  return null;
}

function upsertGradleProp(content, key, value) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const line = `${key}=${value}`;
  const regex = new RegExp(`^${escapedKey}=.*$`, "m");
  if (regex.test(content)) {
    return content.replace(regex, line);
  }
  return `${content.trimEnd()}\n${line}\n`;
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
    'org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8',
  );
  if (!props.includes("org.gradle.internal.http.connectionTimeout")) {
    props += "\norg.gradle.internal.http.connectionTimeout=120000\norg.gradle.internal.http.socketTimeout=120000\n";
  }
  props = upsertGradleProp(props, "android.minSdkVersion", "24");
  props = upsertGradleProp(props, "minSdkVersion", "24");
  props = upsertGradleProp(props, "minSdk", "24");
  props = upsertGradleProp(props, "Nitro_minSdkVersion", "24");
  props = upsertGradleProp(props, "org.gradle.parallel", "false");
  props = upsertGradleProp(props, "org.gradle.workers.max", "2");
  // Remove in-process strategy to let Kotlin use a forked daemon with separate heap
  props = props.replace(/^kotlin\.compiler\.execution\.strategy=.*\n?/m, "");
  if (fs.existsSync(jdk17Path)) {
    props = upsertGradleProp(
      props,
      "org.gradle.java.installations.paths",
      jdk17Path.replace(/\\/g, "/"),
    );
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
const gradleArgs = [
  "--no-daemon",
  "--max-workers=2",
  `assemble${variant}`,
  "-Pandroid.minSdkVersion=24",
  "-PminSdkVersion=24",
  "-PminSdk=24",
  "-PNitro_minSdkVersion=24",
];

if (!isRelease) {
  gradleArgs.push("-PreactNativeArchitectures=arm64-v8a");
}

let gradleCwd = androidDir;
let substDrive = null;
if (process.platform === "win32") {
  const drive = getFreeSubstDrive();
  if (drive) {
    run(`cmd /c subst ${drive}: "${repoRoot}"`);
    substDrive = drive;
    gradleCwd = `${drive}:\\apps\\mobile\\android`;
    console.log(`[mobile] Using SUBST path for Gradle: ${gradleCwd}`);
  }
}

try {
  run(`cmd /c gradlew.bat ${gradleArgs.join(" ")}`, { cwd: gradleCwd });
} finally {
  if (substDrive) {
    try {
      run(`cmd /c subst ${substDrive}: /d`);
    } catch {
      // non-fatal cleanup failure
    }
  }
}

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
