const { withAndroidManifest } = require('@expo/config-plugins');

// Keep LAN HTTP strictly opt-in for local development builds.
module.exports = (config, { enabled = false } = {}) => withAndroidManifest(config, mod => {
  const application = mod.modResults.manifest.application?.[0];
  if (application) application.$['android:usesCleartextTraffic'] = enabled ? 'true' : 'false';
  return mod;
});
