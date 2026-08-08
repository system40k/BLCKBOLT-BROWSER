// main/modules/settings.js - Persistent user settings for BLCKBOLT-BROWSER
// Loads from /configs/settings.json, merges with defaults, and exposes
// pure helpers used by the main process to decorate requests.
const fs = require('fs');
const path = require('path');

const DEFAULT_SETTINGS = {
  theme: 'dark',
  accent: '#7c3aed',
  autoUpdate: true,
  blockThirdPartyCookies: true,
  dntHeader: true,
  defaultSearchEngine: 'duckduckgo',
  customSearchUrl: '',
  homePage: 'https://example.com',
  adblockEnabled: true,
  canvasBlocking: true,
  fingerprintRandomizeOnStart: false,
  clearCacheOnExit: false,
  clearCookiesOnExit: false,
  devMode: true,
  blockWebRtc: true,
};

let cache = null;

function settingsPath() {
  return path.join(__dirname, '..', '..', 'configs', 'settings.json');
}

function get() {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(settingsPath(), 'utf8');
    cache = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    cache = { ...DEFAULT_SETTINGS };
  }
  return cache;
}

function set(patch) {
  const next = { ...get(), ...patch };
  cache = next;
  try {
    fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
    fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2), 'utf8');
  } catch (e) {
    console.warn('settings: failed to persist:', e.message);
  }
  return next;
}

function isThirdPartyRequest(details) {
  // Main-frame and sub-frame navigations are treated as first-party.
  if (details.resourceType === 'mainFrame' || details.resourceType === 'subFrame') return false;
  try {
    const url = new URL(details.url);
    const initiator = details.initiator || '';
    if (!initiator || initiator === 'null') return true;
    const initUrl = new URL(initiator);
    return initUrl.origin !== url.origin;
  } catch (e) {
    return true;
  }
}

// Returns a copy of requestHeaders with privacy headers applied.
function decorateRequestHeaders(details, requestHeaders) {
  const s = get();
  const headers = { ...requestHeaders };
  if (s.dntHeader) headers['DNT'] = '1';
  if (s.blockThirdPartyCookies && isThirdPartyRequest(details)) {
    delete headers['Cookie'];
  }
  return headers;
}

// Returns a copy of responseHeaders with Set-Cookie stripped when the
// request is third-party and cookie blocking is enabled.
function sanitizeResponseHeaders(details, responseHeaders) {
  const s = get();
  const headers = { ...responseHeaders };
  if (s.blockThirdPartyCookies && isThirdPartyRequest(details)) {
    delete headers['Set-Cookie'];
  }
  return headers;
}

module.exports = {
  DEFAULT_SETTINGS,
  get,
  set,
  decorateRequestHeaders,
  sanitizeResponseHeaders,
};


