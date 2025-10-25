const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for expo-router
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Ensure proper file resolution for expo-router
config.resolver.sourceExts = [...config.resolver.sourceExts, 'tsx', 'ts'];

module.exports = config;
