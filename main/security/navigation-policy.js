'use strict';

const ALLOWED_REMOTE_PROTOCOLS = new Set(['https:']);
const ALLOWED_INTERNAL_PROTOCOLS = new Set(['blckbolt:', 'about:']);
const BLOCKED_PROTOCOLS = new Set(['javascript:', 'data:', 'file:', 'vbscript:', 'devtools:']);

function normalizeUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0 || rawUrl.length > 8192) return null;
  try {
    return new URL(rawUrl);
  } catch (_) {
    return null;
  }
}

function isAllowedNavigation(rawUrl, { allowInternal = true } = {}) {
  const parsed = normalizeUrl(rawUrl);
  if (!parsed) return false;

  const protocol = parsed.protocol.toLowerCase();
  if (BLOCKED_PROTOCOLS.has(protocol)) return false;
  if (ALLOWED_REMOTE_PROTOCOLS.has(protocol)) return true;
  if (allowInternal && ALLOWED_INTERNAL_PROTOCOLS.has(protocol)) return true;
  return false;
}

function isAllowedExternalNavigation(rawUrl) {
  return isAllowedNavigation(rawUrl, { allowInternal: false });
}

function installNavigationPolicy(webContents, { onBlocked } = {}) {
  if (!webContents || typeof webContents.on !== 'function') throw new TypeError('webContents required');

  const reportBlocked = (url, reason) => {
    try { onBlocked?.({ url, reason }); } catch (_) {}
  };

  webContents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url)) {
      event.preventDefault();
      reportBlocked(url, 'navigation-policy');
    }
  });

  webContents.setWindowOpenHandler(({ url }) => {
    if (!isAllowedExternalNavigation(url)) {
      reportBlocked(url, 'window-open-policy');
      return { action: 'deny' };
    }

    // Do not create an uncontrolled BrowserWindow. The renderer should turn
    // approved external targets into an explicit browser tab instead.
    reportBlocked(url, 'window-open-requires-tab-routing');
    return { action: 'deny' };
  });

  webContents.on('will-attach-webview', (event, webPreferences, params) => {
    // Never allow an attached guest to inherit Node.js or a caller-controlled preload.
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.nodeIntegrationInSubFrames = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;

    if (!isAllowedNavigation(params.src)) {
      event.preventDefault();
      reportBlocked(params.src, 'webview-attach-policy');
    }
  });
}

module.exports = {
  ALLOWED_REMOTE_PROTOCOLS,
  ALLOWED_INTERNAL_PROTOCOLS,
  BLOCKED_PROTOCOLS,
  normalizeUrl,
  isAllowedNavigation,
  isAllowedExternalNavigation,
  installNavigationPolicy,
};
