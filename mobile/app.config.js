module.exports = ({ config }) => ({
  ...config,
  android: { ...config.android },
  plugins: [...(config.plugins || []), ['./plugins/withCleartextTraffic', { enabled: process.env.ALLOW_CLEARTEXT === 'true' }]],
  ios: { ...config.ios, ...(process.env.ALLOW_CLEARTEXT === 'true' ? { infoPlist: { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } } } : {}) }
});
