const path = require("node:path");

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

const repoRoot = path.resolve(__dirname, "..", "..");
const mobileNodeModules = path.resolve(__dirname, "node_modules");
const bunNodeModules = path.resolve(repoRoot, "node_modules", ".bun", "node_modules");

config.watchFolders = [
	path.join(repoRoot, "packages", "config"),
	path.join(repoRoot, "packages", "graphql-schema"),
	path.join(repoRoot, "packages", "types"),
];

config.resolver.useWatchman = false;
config.resolver.unstable_enableSymlinks = true;
config.resolver.nodeModulesPaths = [
	mobileNodeModules,
	bunNodeModules,
	path.resolve(repoRoot, "node_modules"),
];
if (!config.resolver.assetExts.includes("wasm")) {
	config.resolver.assetExts.push("wasm");
}
config.resolver.extraNodeModules = {
	...(config.resolver.extraNodeModules || {}),
	"@expo/metro-runtime": path.join(bunNodeModules, "@expo", "metro-runtime"),
	"expo-router": path.join(mobileNodeModules, "expo-router"),
};

module.exports = withNativeWind(config, { input: "./global.css" });
