'use strict';

const BLOCKED_PROTOCOLS = new Set(['javascript:', 'data:', 'file:', 'vbscript:']);
const ALLOWED_PROTOCOLS = new Set(['https:', 'http:', 'about:', 'blckbolt:']);

function evaluateNavigation(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return { allowed: false, reason: 'invalid-url' };
  }

  if (BLOCKED_PROTOCOLS.has(url.protocol)) {
    return { allowed: false, reason: `blocked-protocol:${url.protocol}` };
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return { allowed: false, reason: `unsupported-protocol:${url.protocol}` };
  }

  if (url.protocol === 'blckbolt:' && url.hostname !== 'app') {
    return { allowed: false, reason: 'invalid-internal-origin' };
  }

  return { allowed: true, url: url.toString() };
}

function installNavigationPolicy(webContents, { onDenied } = {}) {
  webContents.on('will-navigate', (event, details) => {
    const result = evaluateNavigation(details.url);
    if (!result.allowed) {
      event.preventDefault();
      onDenied?.(details.url, result.reason);
    }
  });

  webContents.setWindowOpenHandler(({ url }) => {
    const result = evaluateNavigation(url);
    if (!result.allowed) {
      onDenied?.(url, result.reason);
      return { action: 'deny' };
    }

    // Never permit a renderer to create an uncontrolled BrowserWindow.
    // The browser UI should turn allowed popup requests into managed tabs.
    return { action: 'deny' };
  });
}

module.exports = { evaluateNavigation, installNavigationPolicy };
