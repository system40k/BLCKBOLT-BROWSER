// Security-first Electron bootstrap.
// This module is loaded before main/main.js so security policy is installed
// before any BrowserWindow or <webview> can be created.
const { app, ipcMain, session } = require('electron');
const path = require('path');

const APP_ROOT = path.resolve(__dirname, '..');
const RENDERER_ROOT = path.join(APP_ROOT, 'renderer', 'out');
const isDev = process.env.NODE_ENV === 'development' || Boolean(process.env.ELECTRON_START_URL);

function isTrustedUiUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl) return false;
  if (isDev) {
    try {
      const u = new URL(rawUrl);
      if ((u.protocol === 'http:' || u.protocol === 'https:') &&
          (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '::1')) {
        return true;
      }
    } catch (_) {}
  }

  try {
    const u = new URL(rawUrl);
    if (u.protocol !== 'file:') return false;
    const filePath = path.resolve(decodeURIComponent(u.pathname));
    return filePath === path.join(RENDERER_ROOT, 'index.html') || filePath.startsWith(`${RENDERER_ROOT}${path.sep}`);
  } catch (_) {
    return false;
  }
}

function isAllowedWebUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'about:';
  } catch (_) {
    return false;
  }
}

function assertTrustedIpc(event) {
  const senderFrame = event && event.senderFrame;
  const senderUrl = senderFrame && senderFrame.url;
  if (!isTrustedUiUrl(senderUrl)) {
    throw new Error('Blocked IPC request from untrusted renderer');
  }
}

// Enforce sender validation on every IPC channel registered by main.js.
const originalHandle = ipcMain.handle.bind(ipcMain);
const originalOn = ipcMain.on.bind(ipcMain);
ipcMain.handle = (channel, listener) => originalHandle(channel, async (event, ...args) => {
  assertTrustedIpc(event);
  return listener(event, ...args);
});
ipcMain.on = (channel, listener) => originalOn(channel, (event, ...args) => {
  assertTrustedIpc(event);
  return listener(event, ...args);
});

app.on('web-contents-created', (_event, contents) => {
  // Keep the application renderer on its own local origin.
  contents.on('will-navigate', (event, url) => {
    if (contents.getType() === 'webview') {
      if (!isAllowedWebUrl(url)) event.preventDefault();
      return;
    }

    if (!isTrustedUiUrl(url)) event.preventDefault();
  });

  // Validate and harden every dynamically-created <webview>.
  contents.on('will-attach-webview', (event, webPreferences, params) => {
    delete webPreferences.preload;
    delete webPreferences.preloadURL;
    webPreferences.nodeIntegration = false;
    webPreferences.nodeIntegrationInSubFrames = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
    webPreferences.webSecurity = true;
    webPreferences.allowRunningInsecureContent = false;
    webPreferences.experimentalFeatures = false;
    webPreferences.enableBlinkFeatures = '';
    webPreferences.disableBlinkFeatures = '';

    if (!isAllowedWebUrl(params.src)) event.preventDefault();
  });
});

app.whenReady().then(() => {
  const ses = session.defaultSession;

  // Deny powerful permissions by default. A future permission UI can grant
  // individual permissions after an explicit user gesture.
  ses.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  ses.setPermissionCheckHandler(() => false);
});

// main.js owns application lifecycle and IPC registration; load it only after
// the bootstrap hooks above have been installed.
require('./main');
