const path = require("node:path");

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

const repoRoot = path.resolve(__dirname, "..", "..");

config.watchFolders = [
	path.join(repoRoot, "packages", "config"),
	path.join(repoRoot, "packages", "graphql-schema"),
	path.join(repoRoot, "packages", "types"),
];

config.resolver.useWatchman = false;

module.exports = withNativeWind(config, { input: "./global.css" });
