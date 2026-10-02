const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const config = getDefaultConfig(__dirname);
const workspaceRoot = path.resolve(__dirname, "..");
config.watchFolders = [...new Set([...config.watchFolders, workspaceRoot])];
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "@pool-safety/shared": path.join(workspaceRoot, "shared"),
};

module.exports = config;
