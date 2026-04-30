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
const gradleVersion = "8.14.3";
const gradleVersionCacheDir = path.join(
  process.env.USERPROFILE || "",
  ".gradle",
  "caches",
  gradleVersion,
);
const gradleJournalCacheFile = path.join(
  process.env.USERPROFILE || "",
  ".gradle",
  "caches",
  "journal-1",
  "file-access.bin",
);
const gradleTransformsCacheDir = path.join(gradleVersionCacheDir, "transforms");
const gradleProblemsReportFile = path.join(
  androidDir,
  "build",
  "reports",
  "problems",
  "problems-report.html",
);
const appCxxCacheDir = path.join(androidDir, "app", ".cxx");
const minimumFreeDiskGb = 4;

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
      } else if (
        full.includes("react-native-nitro-modules") &&
        full.includes(`${path.sep}android${path.sep}`)
      ) {
        if (entry.name === "gradle.properties") {
          const content = fs.readFileSync(full, "utf8");
          const patched = content.replace(
            /Nitro_minSdkVersion=\d+/g,
            "Nitro_minSdkVersion=24",
          );
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
          if (
            !patched.includes('layout.buildDirectory.set(file("C:/.b/nitro"))')
          ) {
            patched = patched.replace(
              /apply from: "\.\/fix-prefab\.gradle"\r?\n/,
              'apply from: "./fix-prefab.gradle"\n\nif (System.properties["os.name"].toLowerCase().contains("windows")) {\n  // Keep generated code paths short enough for Windows MAX_PATH constraints.\n  layout.buildDirectory.set(file("C:/.b/nitro"))\n}\n',
            );
          }
          // Force CMake build staging to a very short absolute path on Windows.
          // This avoids build.ninja dirty loops caused by deep bun cache paths.
          if (!patched.includes("buildStagingDirectory")) {
            patched = patched.replace(
              /externalNativeBuild\s*\{\s*\r?\n\s*cmake\s*\{\s*\r?\n\s*path\s+"CMakeLists\.txt"\s*\r?\n\s*\}\s*\r?\n\s*\}/,
              'externalNativeBuild {\n    cmake {\n      path "CMakeLists.txt"\n      if (System.properties["os.name"].toLowerCase().contains("windows")) {\n        buildStagingDirectory "C:/.cxx/nitro"\n      }\n    }\n  }',
            );
          }
          if (patched !== content) {
            fs.writeFileSync(full, patched);
            console.log(
              `[mobile] Patched build.gradle native API/minSdkVersion: ${full}`,
            );
          }
        } else if (entry.name === "fix-prefab.gradle") {
          const isNitroOrMmkv =
            full.includes("react-native-nitro-modules") ||
            full.includes("react-native-mmkv");
          if (!isNitroOrMmkv) continue;
          const content = fs.readFileSync(full, "utf8");
          const patched = content.replace(
            /def variants = proj\.android\.hasProperty\('applicationVariants'\) \? proj\.android\.applicationVariants : proj\.android\.libraryVariants/g,
            "def androidExt = proj.extensions.findByName('android')\n    if (androidExt == null || androidExt instanceof String) return\n    def variants = androidExt.hasProperty('applicationVariants') ? androidExt.applicationVariants : (androidExt.hasProperty('libraryVariants') ? androidExt.libraryVariants : null)\n    if (variants == null) return",
          );
          if (patched !== content) {
            fs.writeFileSync(full, patched);
            console.log(
              `[mobile] Patched fix-prefab.gradle variants lookup: ${full}`,
            );
          }
        } else if (
          entry.name === "CMakeLists.txt" &&
          full.includes("react-native-nitro-modules")
        ) {
          const content = fs.readFileSync(full, "utf8");
          let patched = content;
          if (patched.includes("CMAKE_OBJECT_PATH_MAX")) {
            patched = patched.replace(
              /set\(CMAKE_OBJECT_PATH_MAX\s+\d+\)/g,
              "set(CMAKE_OBJECT_PATH_MAX 128)",
            );
          } else {
            patched = patched.replace(
              /cmake_minimum_required\(VERSION\s+3\.9\.0\)\r?\n/,
              "cmake_minimum_required(VERSION 3.9.0)\n\n# Keep this low so CMake hashes object paths and avoids Windows path-limit churn.\nset(CMAKE_OBJECT_PATH_MAX 128)\n",
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

  (function patchOtherNativeModules(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".cxx" || entry.name === "build") continue;
        patchOtherNativeModules(full);
        continue;
      }

      if (!full.includes(`${path.sep}android${path.sep}`)) continue;

      const isWorklets = full.includes("react-native-worklets");
      const isReanimated = full.includes("react-native-reanimated");
      const isExpoModulesCore = full.includes("expo-modules-core");

      if (
        entry.name === "build.gradle" &&
        (isWorklets || isReanimated || isExpoModulesCore)
      ) {
        const content = fs.readFileSync(full, "utf8");
        let patched = content;

        // Keep this idempotent across repeated runs.
        patched = patched.replace(
          /\r?\n\s*"-DCMAKE_OBJECT_PATH_MAX=128",/g,
          "",
        );
        patched = patched.replace(
          /\r?\n\s*"-DCMAKE_CXX_FLAGS_DEBUG=-g0 -O1",/g,
          "",
        );
        patched = patched.replace(
          /\r?\n\s*"-DCMAKE_C_FLAGS_DEBUG=-g0 -O1",/g,
          "",
        );

        patched = patched.replace(
          /arguments\s+"-DANDROID_STL=c\+\+_shared",/g,
          'arguments "-DANDROID_STL=c++_shared",\n                        "-DCMAKE_OBJECT_PATH_MAX=128",\n                        "-DCMAKE_CXX_FLAGS_DEBUG=-g0 -O1",\n                        "-DCMAKE_C_FLAGS_DEBUG=-g0 -O1",',
        );

        if (
          isWorklets &&
          !patched.includes('buildStagingDirectory "C:/.cxx/worklets"')
        ) {
          patched = patched.replace(
            /externalNativeBuild\s*\{\s*\r?\n\s*cmake\s*\{\s*\r?\n\s*version\s*=\s*System\.getenv\("CMAKE_VERSION"\)\s*\?:\s*"3\.22\.1"\s*\r?\n\s*path\s+"CMakeLists\.txt"\s*\r?\n\s*\}\s*\r?\n\s*\}/,
            'externalNativeBuild {\n        cmake {\n            version = System.getenv("CMAKE_VERSION") ?: "3.22.1"\n            path "CMakeLists.txt"\n            if (System.properties["os.name"].toLowerCase().contains("windows")) {\n                buildStagingDirectory "C:/.cxx/worklets"\n            }\n        }\n    }',
          );
        }

        if (
          isReanimated &&
          !patched.includes('buildStagingDirectory "C:/.cxx/reanimated"')
        ) {
          patched = patched.replace(
            /externalNativeBuild\s*\{\s*\r?\n\s*cmake\s*\{\s*\r?\n\s*version\s*=\s*System\.getenv\("CMAKE_VERSION"\)\s*\?:\s*"3\.22\.1"\s*\r?\n\s*path\s+"CMakeLists\.txt"\s*\r?\n\s*\}\s*\r?\n\s*\}/,
            'externalNativeBuild {\n        cmake {\n            version = System.getenv("CMAKE_VERSION") ?: "3.22.1"\n            path "CMakeLists.txt"\n            if (System.properties["os.name"].toLowerCase().contains("windows")) {\n                buildStagingDirectory "C:/.cxx/reanimated"\n            }\n        }\n    }',
          );
        }

        if (
          isExpoModulesCore &&
          !patched.includes('buildStagingDirectory "C:/.cxx/expo-core"')
        ) {
          patched = patched.replace(
            /externalNativeBuild\s*\{\s*\r?\n\s*cmake\s*\{\s*\r?\n\s*path\s+"CMakeLists\.txt"\s*\r?\n\s*\}\s*\r?\n\s*\}/,
            'externalNativeBuild {\n    cmake {\n      path "CMakeLists.txt"\n      if (System.properties["os.name"].toLowerCase().contains("windows")) {\n        buildStagingDirectory "C:/.cxx/expo-core"\n      }\n    }\n  }',
          );
        }

        if (patched !== content) {
          fs.writeFileSync(full, patched);
          console.log(
            `[mobile] Patched native build.gradle path settings: ${full}`,
          );
        }
      }

      if (
        entry.name === "CMakeLists.txt" &&
        (isWorklets || isReanimated || isExpoModulesCore)
      ) {
        const content = fs.readFileSync(full, "utf8");
        let patched = content;

        if (patched.includes("CMAKE_OBJECT_PATH_MAX")) {
          patched = patched.replace(
            /set\(CMAKE_OBJECT_PATH_MAX\s+\d+\)/g,
            "set(CMAKE_OBJECT_PATH_MAX 128)",
          );
        } else {
          patched = patched.replace(
            /cmake_minimum_required\(VERSION\s+\d+\.\d+\)\r?\n/,
            (m) =>
              `${m}\n# Keep low to force hashed object paths on Windows.\nset(CMAKE_OBJECT_PATH_MAX 128)\n`,
          );
        }

        if (isWorklets) {
          patched = patched.replace(
            /file\(GLOB_RECURSE WORKLETS_COMMON_CPP_SOURCES CONFIGURE_DEPENDS\s*\r?\n\s*"\$\{COMMON_CPP_DIR\}\/worklets\/\*\.cpp"\)/,
            'file(GLOB_RECURSE WORKLETS_COMMON_CPP_SOURCES CONFIGURE_DEPENDS\n     RELATIVE ${CMAKE_SOURCE_DIR}\n     "../Common/cpp/worklets/*.cpp")',
          );
          patched = patched.replace(
            /file\(GLOB_RECURSE WORKLETS_ANDROID_CPP_SOURCES CONFIGURE_DEPENDS\s*\r?\n\s*"\$\{ANDROID_CPP_DIR\}\/worklets\/\*\.cpp"\)/,
            'file(GLOB_RECURSE WORKLETS_ANDROID_CPP_SOURCES CONFIGURE_DEPENDS\n     RELATIVE ${CMAKE_SOURCE_DIR}\n     "src/main/cpp/worklets/*.cpp")',
          );
        }

        if (isReanimated) {
          patched = patched.replace(
            /file\(GLOB_RECURSE REANIMATED_COMMON_CPP_SOURCES CONFIGURE_DEPENDS\s*\r?\n\s*"\$\{COMMON_CPP_DIR\}\/reanimated\/\*\.cpp"\)/,
            'file(GLOB_RECURSE REANIMATED_COMMON_CPP_SOURCES CONFIGURE_DEPENDS\n     RELATIVE ${CMAKE_SOURCE_DIR}\n     "../Common/cpp/reanimated/*.cpp")',
          );
          patched = patched.replace(
            /file\(GLOB_RECURSE REANIMATED_ANDROID_CPP_SOURCES CONFIGURE_DEPENDS\s*\r?\n\s*"\$\{ANDROID_CPP_DIR\}\/reanimated\/\*\.cpp"\)/,
            'file(GLOB_RECURSE REANIMATED_ANDROID_CPP_SOURCES CONFIGURE_DEPENDS\n     RELATIVE ${CMAKE_SOURCE_DIR}\n     "src/main/cpp/reanimated/*.cpp")',
          );
        }

        if (
          isExpoModulesCore &&
          full.includes(`${path.sep}android${path.sep}CMakeLists.txt`)
        ) {
          // Restore original expo-modules-core globbing. Relative globs here can
          // resolve against the wrong CMake root and produce empty source lists.
          patched = patched.replace(
            /file\(GLOB sources_android RELATIVE \$\{CMAKE_SOURCE_DIR\} "src\/main\/cpp\/\*\.cpp"\)/g,
            'file(GLOB sources_android "${SRC_DIR}/main/cpp/*.cpp")',
          );
          patched = patched.replace(
            /file\(GLOB sources_android_types RELATIVE \$\{CMAKE_SOURCE_DIR\} "src\/main\/cpp\/types\/\*\.cpp"\)/g,
            'file(GLOB sources_android_types "${SRC_DIR}/main/cpp/types/*.cpp")',
          );
          patched = patched.replace(
            /file\(GLOB sources_android_javaclasses RELATIVE \$\{CMAKE_SOURCE_DIR\} "src\/main\/cpp\/javaclasses\/\*\.cpp"\)/g,
            'file(GLOB sources_android_javaclasses "${SRC_DIR}/main/cpp/javaclasses/*.cpp")',
          );
          patched = patched.replace(
            /file\(GLOB sources_android_decorators RELATIVE \$\{CMAKE_SOURCE_DIR\} "src\/main\/cpp\/decorators\/\*\.cpp"\)/g,
            'file(GLOB sources_android_decorators "${SRC_DIR}/main/cpp/decorators/*.cpp")',
          );
          patched = patched.replace(
            /file\(GLOB common_sources RELATIVE \$\{CMAKE_SOURCE_DIR\} "\.\.\/common\/cpp\/\*\.cpp"\)/g,
            'file(GLOB common_sources "${COMMON_DIR}/*.cpp")',
          );
          patched = patched.replace(
            /\s*\$\{sources_android_decorators\}\r?\n/g,
            "",
          );
        }

        if (
          isExpoModulesCore &&
          full.includes(
            `${path.sep}android${path.sep}src${path.sep}fabric${path.sep}CMakeLists.txt`,
          )
        ) {
          // Restore original fabric globs; RELATIVE with CMAKE_SOURCE_DIR breaks
          // source discovery in this nested CMake project.
          patched = patched.replace(
            /file\(GLOB SOURCES RELATIVE \$\{CMAKE_SOURCE_DIR\} "src\/fabric\/\*\.cpp"\)/g,
            'file(GLOB SOURCES "*.cpp")',
          );
          patched = patched.replace(
            /file\(GLOB COMMON_FABRIC_SOURCES RELATIVE \$\{CMAKE_SOURCE_DIR\} "\.\.\/common\/cpp\/fabric\/\*\.cpp"\)/g,
            'file(GLOB COMMON_FABRIC_SOURCES "${COMMON_FABRIC_DIR}/*.cpp")',
          );
        }

        if (patched !== content) {
          fs.writeFileSync(full, patched);
          console.log(`[mobile] Patched native CMake path settings: ${full}`);
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

  // Inject CMakeLists rewrite hooks into all native module build.gradle files
  // so that long absolute paths are rewritten to SUBST drive paths before CMake runs.
  (function patchNativeModuleBuildGradles(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);

      // Look for build.gradle files in the typical pattern: bun cache has
      // .bun/package@version+hash/node_modules/package/android/build.gradle
      const nodeModulesDir = path.join(full, "node_modules");
      if (fs.existsSync(nodeModulesDir)) {
        for (const pkgEntry of fs.readdirSync(nodeModulesDir, {
          withFileTypes: true,
        })) {
          if (!pkgEntry.isDirectory()) continue;
          const pkgFull = path.join(nodeModulesDir, pkgEntry.name);
          if (pkgEntry.name.startsWith("@")) {
            // scoped package (@namespace/package), look inside
            for (const scopedEntry of fs.readdirSync(pkgFull, {
              withFileTypes: true,
            })) {
              if (!scopedEntry.isDirectory()) continue;
              const scopedFull = path.join(pkgFull, scopedEntry.name);
              const scopedBuildGradle = path.join(
                scopedFull,
                "android",
                "build.gradle",
              );
              if (fs.existsSync(scopedBuildGradle)) {
                patchNativeModuleBuildGradleWithCMakeHook(scopedBuildGradle);
              }
            }
          } else {
            const buildGradle = path.join(pkgFull, "android", "build.gradle");
            if (fs.existsSync(buildGradle)) {
              patchNativeModuleBuildGradleWithCMakeHook(buildGradle);
            }
          }
        }
      }
    }
  })(bunCacheDir);
}

// Recover from Gradle journal index corruption that can occur on interrupted builds.
if (process.platform === "win32") {
  stopWindowsGradleCacheLockers();
}
if (gradleJournalCacheFile && fs.existsSync(gradleJournalCacheFile)) {
  removePathWithVerification(gradleJournalCacheFile, {
    label: "corrupted Gradle journal cache index",
    tolerateError: (error) => error && error.code === "EPERM",
  });
}

// Recover from corrupted Gradle transform metadata (metadata.bin) by clearing
// the transforms cache for the current Gradle version.
if (gradleTransformsCacheDir && fs.existsSync(gradleTransformsCacheDir)) {
  clearGradleTransformCaches(false);
}

// Gradle can fail to move a new problems report over an existing file on Windows.
if (gradleProblemsReportFile && fs.existsSync(gradleProblemsReportFile)) {
  removePathWithVerification(gradleProblemsReportFile, {
    label: "stale Gradle problems report",
    tolerateError: (error) => error && error.code === "EPERM",
  });
}

// Purge app-level CMake/Ninja state so old long paths are not reused.
if (appCxxCacheDir && fs.existsSync(appCxxCacheDir)) {
  removePathWithVerification(appCxxCacheDir, {
    recursive: true,
    label: "stale app CMake cache",
    tolerateError: (error) => error && error.code === "EPERM",
  });
}

const freeDiskGbAfterCleanup = getFreeDiskGb();
if (
  Number.isFinite(freeDiskGbAfterCleanup) &&
  freeDiskGbAfterCleanup < minimumFreeDiskGb
) {
  throw new Error(
    `[mobile] Not enough free disk on C: ${freeDiskGbAfterCleanup.toFixed(2)} GB available; ` +
      `${minimumFreeDiskGb} GB required for Android Gradle build. ` +
      `Free up space and rerun bun run mobile:android:install.`,
  );
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

function getFreeDiskGb() {
  if (process.platform !== "win32") return Number.POSITIVE_INFINITY;
  try {
    const out = execSync(
      'powershell -NoProfile -Command "(Get-PSDrive -Name C).Free"',
      { stdio: ["ignore", "pipe", "ignore"] },
    )
      .toString()
      .trim();
    const freeBytes = Number(out);
    if (Number.isFinite(freeBytes)) {
      return freeBytes / (1024 * 1024 * 1024);
    }
  } catch {
    // best-effort
  }
  return Number.NaN;
}

function removePathWithVerification(targetPath, options = {}) {
  const {
    recursive = false,
    label = targetPath,
    retries = 3,
    tolerateError = null,
  } = options;
  if (!targetPath || !fs.existsSync(targetPath)) return false;

  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      fs.rmSync(targetPath, { recursive, force: true });
      if (!fs.existsSync(targetPath)) {
        console.log(`[mobile] Cleared ${label}: ${targetPath}`);
        return true;
      }
    } catch (error) {
      if (typeof tolerateError === "function" && tolerateError(error)) {
        console.warn(
          `[mobile] Skipped clearing ${label}: ${targetPath} (${error.message})`,
        );
        return false;
      }

      if (process.platform === "win32" && error && error.code === "EPERM") {
        try {
          execSync("cmd /c taskkill /F /IM java.exe /T", { stdio: "ignore" });
        } catch {
          // Best-effort fallback to unlock cache files held by stale Java processes.
        }
      }

      lastError = error;
    }
  }

  const reason = lastError ? ` (${lastError.message})` : "";
  throw new Error(`Failed to clear ${label}: ${targetPath}${reason}`);
}

function clearGradleTransformCaches(strict = false) {
  if (!gradleVersionCacheDir || !fs.existsSync(gradleVersionCacheDir)) return;

  if (process.platform === "win32") {
    stopWindowsGradleCacheLockers();
  }

  const cacheEntries = fs
    .readdirSync(gradleVersionCacheDir, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && entry.name.startsWith("transforms"),
    );

  for (const entry of cacheEntries) {
    removePathWithVerification(path.join(gradleVersionCacheDir, entry.name), {
      recursive: true,
      label: "Gradle transforms cache",
      tolerateError:
        !strict && process.platform === "win32"
          ? (error) => error && error.code === "EPERM"
          : null,
    });
  }
}

function isGradleTransformMetadataError(error) {
  if (!error) return false;

  return [error.message, error.stdout?.toString?.(), error.stderr?.toString?.()]
    .filter(Boolean)
    .some(
      (text) =>
        text.includes("Could not read workspace metadata") ||
        text.includes("metadata.bin"),
    );
}

function stopWindowsGradleCacheLockers() {
  const psCommand = [
    "$targets = Get-CimInstance Win32_Process | Where-Object {",
    "  $_.Name -eq 'java.exe' -and (",
    `    $_.CommandLine -match 'GradleDaemon ${gradleVersion.replace(/\./g, "\\.")}' -or`,
    "    $_.CommandLine -match 'gradle-server.jar'",
    "  )",
    "}",
    "if ($targets) {",
    "  $targets | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
    "}",
  ].join(" ");

  try {
    execSync(`powershell -NoProfile -Command \"${psCommand}\"`, {
      stdio: "ignore",
    });
  } catch {
    // Best-effort: cache cleanup will still tell us if something remains locked.
  }
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

function restoreAutolinkingRealPaths(repoRootPath) {
  // Undo any prior SUBST-drive rewrite in the autolinking cmake so Gradle
  // always sees consistent real C: paths (avoids "different roots" in Path.relativize).
  const autolinkingCmakePath = path.join(
    androidDir,
    "app",
    "build",
    "generated",
    "autolinking",
    "src",
    "main",
    "jni",
    "Android-autolinking.cmake",
  );
  if (!fs.existsSync(autolinkingCmakePath)) return;

  const repoRootUnix = repoRootPath.replace(/\\/g, "/");
  let content = fs.readFileSync(autolinkingCmakePath, "utf8");
  let changed = false;
  for (const letter of ["X", "Y", "Z", "W", "V"]) {
    const substPrefix = `${letter}:`;
    if (content.includes(substPrefix)) {
      content = content.split(substPrefix).join(repoRootUnix);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(autolinkingCmakePath, content);
    console.log(
      `[mobile] Restored autolinking CMake to real paths: ${autolinkingCmakePath}`,
    );
  }
}

function rewriteNitroAutolinkingPathToShortBuildDir() {
  const autolinkingCmakePath = path.join(
    androidDir,
    "app",
    "build",
    "generated",
    "autolinking",
    "src",
    "main",
    "jni",
    "Android-autolinking.cmake",
  );
  if (!fs.existsSync(autolinkingCmakePath)) return;

  const shortNitroCodegenDir = "C:/.b/nitro/generated/source/codegen/jni/";
  const nitroAutolinkPathPattern =
    /[A-Za-z]:\/[^\"\n]*?react-native-nitro-modules[^\"\n]*?\/android\/build\/generated\/source\/codegen\/jni\//g;
  const content = fs.readFileSync(autolinkingCmakePath, "utf8");
  const rewritten = content.replace(
    nitroAutolinkPathPattern,
    shortNitroCodegenDir,
  );

  if (rewritten !== content) {
    fs.writeFileSync(autolinkingCmakePath, rewritten);
    console.log(
      `[mobile] Rewrote Nitro autolinking path to short build dir: ${autolinkingCmakePath}`,
    );
  }
}

function rewriteAutolinkingToSubstDrive(repoRootPath, driveLetter) {
  if (!driveLetter) return;
  const autolinkingCmakePath = path.join(
    androidDir,
    "app",
    "build",
    "generated",
    "autolinking",
    "src",
    "main",
    "jni",
    "Android-autolinking.cmake",
  );
  if (!fs.existsSync(autolinkingCmakePath)) return;

  const repoRootUnix = repoRootPath.replace(/\\/g, "/");
  const content = fs.readFileSync(autolinkingCmakePath, "utf8");
  const rewritten = content.split(repoRootUnix).join(`${driveLetter}:`);
  if (rewritten !== content) {
    fs.writeFileSync(autolinkingCmakePath, rewritten);
    console.log(
      `[mobile] Rewrote autolinking CMake paths to SUBST drive: ${autolinkingCmakePath}`,
    );
  }
}

/**
 * Rewrite all CMakeLists.txt files in the bun cache to use SUBST drive paths
 * instead of absolute paths. This prevents object file paths from exceeding
 * Windows' 260-char MAX_PATH limit during native compilation.
 */
function rewriteNativeCMakePaths(bunCacheDir, driveLetter) {
  if (!driveLetter) return;
  const repoRootUnix = path
    .normalize(path.join(bunCacheDir, "..", ".."))
    .replace(/\\/g, "/");

  (function walkDir(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Continue recursion, but skip large/uninteresting directories
        if (
          !["build", ".gradle", ".cxx", "build_output"].includes(entry.name)
        ) {
          walkDir(full);
        }
      } else if (entry.isFile() && entry.name === "CMakeLists.txt") {
        try {
          const content = fs.readFileSync(full, "utf8");
          const rewritten = content.split(repoRootUnix).join(`${driveLetter}:`);
          if (rewritten !== content) {
            fs.writeFileSync(full, rewritten);
            console.log(`[mobile] Rewrote CMakeLists.txt paths: ${full}`);
          }
        } catch {
          // skip files we can't read/write
        }
      }
    }
  })(bunCacheDir);
}

/**
 * Inject a Gradle task hook into app/build.gradle that rewrites the generated
 * Android-autolinking.cmake file after each generateAutolinkingNewArchitectureFiles
 * run.  This replaces long absolute bun-cache paths with the SUBST drive letter
 * so Ninja never sees >260-char source filenames.
 */
function patchAppBuildGradleWithAutolinkHook(appBuildGradlePath) {
  if (!fs.existsSync(appBuildGradlePath)) return;
  const marker = "// [WIN_PATH_FIX] autolinking cmake rewrite";
  const content = fs.readFileSync(appBuildGradlePath, "utf8");
  if (content.includes(marker)) return; // already injected

  const hook = `

${marker}
// Rewrite Nitro autolinking path to a short build dir so Ninja stays within
// Windows 260-char MAX_PATH limits.
if (org.apache.tools.ant.taskdefs.condition.Os.isFamily(org.apache.tools.ant.taskdefs.condition.Os.FAMILY_WINDOWS)) {
    afterEvaluate {
        tasks.matching { it.name.contains("generateAutolinking") || it.name.contains("GenerateAutolinking") }.configureEach {
            doLast {
                def autolinkingCmake = file("build/generated/autolinking/src/main/jni/Android-autolinking.cmake")
                if (autolinkingCmake.exists()) {
                    def text = autolinkingCmake.text
          def nitroPattern = /[A-Za-z]:\\/[^\"\\n]*?react-native-nitro-modules[^\"\\n]*?\\/android\\/build\\/generated\\/source\\/codegen\\/jni\\//
          def fixed = text.replaceAll(nitroPattern, "C:/.b/nitro/generated/source/codegen/jni/")
          if (fixed != text) {
                        autolinkingCmake.text = fixed
                        println("[WIN_PATH_FIX] Rewrote autolinking cmake: " + autolinkingCmake.absolutePath)
                    }
                }
            }
        }
    }
}
`;

  fs.writeFileSync(appBuildGradlePath, content + hook);
  console.log(
    `[mobile] Injected autolinking cmake path hook: ${appBuildGradlePath}`,
  );
}

/**
 * Inject a Gradle hook into a native module's build.gradle that rewrites its
 * CMakeLists.txt file(s) to use SUBST drive paths instead of long absolute
 * bun-cache paths before CMake is invoked. This prevents object file paths
 * from exceeding Windows' 260-char MAX_PATH limit.
 */
function patchNativeModuleBuildGradleWithCMakeHook(buildGradlePath) {
  if (!fs.existsSync(buildGradlePath)) return;
  const marker = "// [WIN_PATH_FIX] CMakeLists rewrite";
  const content = fs.readFileSync(buildGradlePath, "utf8");
  if (content.includes(marker)) return; // already injected

  const hook = `

${marker}
// Rewrite long absolute paths in CMakeLists.txt to use SUBST drive paths,
// so Ninja-generated object file paths stay within Windows 260-char MAX_PATH.
if (org.apache.tools.ant.taskdefs.condition.Os.isFamily(org.apache.tools.ant.taskdefs.condition.Os.FAMILY_WINDOWS)) {
    afterEvaluate {
        tasks.matching { it.name.contains("generateJsonModel") || it.name.contains("generateNinja") || it.name.contains("cmake") }.configureEach { currentTask ->
            doFirst {
                def substRoot = System.getenv("SUBST_REPO_ROOT")
                def longRoot = (rootDir.parentFile.parentFile.parentFile).absolutePath.replace(File.separatorChar, '/' as char)
                if (substRoot && longRoot) {
                    fileTree(dir: projectDir).visit { details ->
                        if (details.name == "CMakeLists.txt") {
                            def cmakelists = details.file
                            def text = cmakelists.text
                            if (text.contains(longRoot)) {
                                def fixed = text.replace(longRoot, substRoot)
                                cmakelists.text = fixed
                                println("[WIN_PATH_FIX] Rewrote CMakeLists.txt: " + cmakelists.absolutePath)
                            }
                        }
                    }
                }
            }
        }
    }
}
`;

  fs.writeFileSync(buildGradlePath, content + hook);
  console.log(`[mobile] Injected CMakeLists rewrite hook: ${buildGradlePath}`);
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
    "org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8",
  );
  if (!props.includes("org.gradle.internal.http.connectionTimeout")) {
    props +=
      "\norg.gradle.internal.http.connectionTimeout=120000\norg.gradle.internal.http.socketTimeout=120000\n";
  }
  props = upsertGradleProp(props, "android.minSdkVersion", "24");
  props = upsertGradleProp(props, "minSdkVersion", "24");
  props = upsertGradleProp(props, "minSdk", "24");
  props = upsertGradleProp(props, "Nitro_minSdkVersion", "24");
  props = upsertGradleProp(props, "org.gradle.parallel", "false");
  props = upsertGradleProp(props, "org.gradle.workers.max", "1");
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

const appBuildGradlePath = path.join(androidDir, "app", "build.gradle");
patchAppBuildGradleWithAutolinkHook(appBuildGradlePath);

// Step 2: Build APK via Gradle
console.log(`[mobile] Building ${variant} APK…`);
const gradleArgs = [
  "--no-daemon",
  "--max-workers=1",
  `assemble${variant}`,
  "-Pandroid.minSdkVersion=24",
  "-PminSdkVersion=24",
  "-PminSdk=24",
  "-PNitro_minSdkVersion=24",
];

if (!isRelease) {
  gradleArgs.push("-PreactNativeArchitectures=arm64-v8a");
}

// Use SUBST drive B: -> node_modules/.bun so Ninja sees short paths.
// The SUBST drive is only used inside the autolinking cmake file (Ninja sources)
// and not for Gradle's own file system which stays on C:.
const gradleCwd = androidDir;
const bunCachePathForSubst = path.join(repoRoot, "node_modules", ".bun");
if (process.platform === "win32" && fs.existsSync(bunCachePathForSubst)) {
  try {
    // Remove any existing B: subst first (ignore errors if not mapped).
    execSync("cmd /c subst B: /D", { stdio: "ignore" });
  } catch { /* ignore */ }
  try {
    execSync(`cmd /c subst B: "${bunCachePathForSubst}"`, { stdio: "inherit" });
    console.log(`[mobile] SUBST B: => ${bunCachePathForSubst}`);
  } catch (e) {
    console.warn(`[mobile] Warning: could not set SUBST B: — ${e.message}`);
  }
}

// Restore any autolinking cmake that a prior run may have rewritten,
// then apply the Nitro short path rewrite.
restoreAutolinkingRealPaths(repoRoot);
rewriteNitroAutolinkingPathToShortBuildDir();

process.env.CMAKE_BUILD_PARALLEL_LEVEL = "1";
process.env.NINJAFLAGS = "-j1";
delete process.env.SUBST_REPO_ROOT;

const gradleCmd = `cmd /c gradlew.bat ${gradleArgs.join(" ")}`;
const runGradleWithRetry = (cwd) => {
  try {
    run(gradleCmd, { cwd });
  } catch {
    console.log(
      "[mobile] Gradle assemble failed. Clearing transforms caches and retrying once…",
    );
    // Re-apply SUBST B: in case it was lost between attempts.
    if (process.platform === "win32" && fs.existsSync(bunCachePathForSubst)) {
      try { execSync("cmd /c subst B: /D", { stdio: "ignore" }); } catch { /* ignore */ }
      try { execSync(`cmd /c subst B: "${bunCachePathForSubst}"`, { stdio: "ignore" }); } catch { /* ignore */ }
    }
    rewriteNitroAutolinkingPathToShortBuildDir();
    // Kill stale java processes before aggressive cache clear to release locks.
    if (process.platform === "win32") {
      try {
        execSync("cmd /c taskkill /F /IM java.exe /T", { stdio: "ignore" });
      } catch {
        // best-effort
      }
    }
    // Tolerate EPERM on retry clear: the metadata.bin error is already cleared
    // after the first pass; remaining EPERM files won't block the second pass.
    clearGradleTransformCaches(false);
    run(gradleCmd, { cwd });
  }
};

runGradleWithRetry(gradleCwd);

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
