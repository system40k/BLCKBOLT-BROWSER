// main/modules/adblocker.js - Advanced ad/tracker blocking module for BLCKBOLT-BROWSER
// Uses Electron session.webRequest to intercept and block ads

const { session } = require('electron');

/**
 * Basic AdBlocker implementation using a hardcoded common list for demonstration.
 * In a full production app, this would fetch and parse EasyList / EasyPrivacy.
 */
class AdBlocker {
  constructor() {
    this.enabled = false;
    this.blockedCount = 0;
    this._listener = null;
    this.blockPatterns = [
      '*://*.doubleclick.net/*',
      '*://*.google-analytics.com/*',
      '*://*.googlesyndication.com/*',
      '*://*.googleadservices.com/*',
      '*://*.googletagservices.com/*',
      '*://*.googletagmanager.com/*',
      '*://*.facebook.net/*',
      '*://*.amazon-adsystem.com/*',
      '*://*.adnxs.com/*',
      '*://*.casalemedia.com/*',
      '*://*.criteo.com/*',
      '*://*.pubmatic.com/*',
      '*://*.rubiconproject.com/*',
      '*://*.scorecardresearch.com/*',
      '*://*.ads-twitter.com/*',
    ];
  }

  enable(ses = session.defaultSession) {
    if (this.enabled) return;
    this.enabled = true;

    this._listener = (details, callback) => {
      if (this.enabled) {
        this.blockedCount++;
        // Optionally notify renderer of blocked request
        return callback({ cancel: true });
      }
      callback({ cancel: false });
    };
    ses.webRequest.onBeforeRequest({ urls: this.blockPatterns }, this._listener);
    console.log('AdBlocker enabled');
  }

  disable(ses = session.defaultSession) {
    this.enabled = false;
    // Remove the registered listener (null filter removes the adblocker's listener).
    // The adblocker is the only onBeforeRequest consumer in this app.
    ses.webRequest.onBeforeRequest(null);
    this._listener = null;
    console.log('AdBlocker disabled');
  }

  getBlockedCount() {
    return this.blockedCount;
  }

  resetCount() {
    this.blockedCount = 0;
  }
}

module.exports = new AdBlocker();

