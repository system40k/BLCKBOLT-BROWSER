// Security-first Electron bootstrap. Loaded before main/main.js.
const { app, ipcMain, session } = require('electron');
const path = require('path');
const { fileURLToPath } = require('url');

const APP_ROOT = path.resolve(__dirname, '..');
const RENDERER_ROOT = path.join(APP_ROOT, 'renderer', 'out');
const isDev = process.env.NODE_ENV === 'development' || Boolean(process.env.ELECTRON_START_URL);

function isTrustedUiUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl) return false;
  if (isDev) {
    try {
      const u = new URL(rawUrl);
      if ((u.protocol === 'http:' || u.protocol === 'https:') &&
          ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)) return true;
    } catch (_) {}
  }

  try {
    const filePath = path.resolve(fileURLToPath(rawUrl));
    const rendererRoot = path.resolve(RENDERER_ROOT);
    return filePath === path.join(rendererRoot, 'index.html') || filePath.startsWith(`${rendererRoot}${path.sep}`);
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
  const senderUrl = event && event.senderFrame && event.senderFrame.url;
  if (!isTrustedUiUrl(senderUrl)) throw new Error('Blocked IPC request from untrusted renderer');
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
  contents.on('will-navigate', (event, url) => {
    if (contents.getType() === 'webview') {
      if (!isAllowedWebUrl(url)) event.preventDefault();
      return;
    }
    if (!isTrustedUiUrl(url)) event.preventDefault();
  });

  contents.on('will-attach-webview', (event, webPreferences, params) => {
    // Never inherit or accept a renderer-supplied preload for remote content.
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
  // Privacy-first default: camera, microphone, geolocation, notifications,
  // MIDI/HID/USB and other powerful web permissions require an explicit grant
  // path to be implemented rather than being silently exposed.
  ses.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  ses.setPermissionCheckHandler(() => false);
});

require('./main');
