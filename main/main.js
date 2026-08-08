// Main Electron process for BLCKBOLT-BROWSER
const { app, BrowserWindow, ipcMain, session, Menu, Tray } = require('electron');
const path = require('path');
const fs = require('fs');

// Privacy Modules
const torManager = require('./modules/tor/torManager');
const torChecker = require('./modules/tor/torChecker');
const vpn = require('./modules/network/vpn');
const proxyAgent = require('./modules/network/proxy-agent');
const adblocker = require('./modules/adblocker');
const fingerprint = require('./modules/fingerprint');
const dohDot = require('./modules/network/doh-dot');
const { injectIntoWebContents } = require('./modules/fingerprint/canvas-inject');
const dpiDetector = require('./modules/network/dpi-detector');

let mainWindow = null;
let splash = null;
let tray = null;
let webviewContents = [];
let canvasBlockingEnabled = false;

const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_START_URL;

// Auto-updater (wired up in createWindow via main/updater.js)
let initAutoUpdater = null;
try {
  initAutoUpdater = require('./updater').initAutoUpdater;
} catch (e) {
  console.warn('Auto-updater unavailable:', e.message);
}

function getOvpnFile() {
  const vpnDir = path.join(__dirname, '../configs/vpn');
  if (!fs.existsSync(vpnDir)) return null;
  const files = fs.readdirSync(vpnDir).filter(f => f.endsWith('.ovpn'));
  if (files.length === 0) return null;
  return path.join(vpnDir, files[0]);
}

function createWindow() {
  // Splash window
  splash = new BrowserWindow({
    width: 500,
    height: 320,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    center: true,
    resizable: false
  });
  const splashPath = path.join(__dirname, 'splash.html');
  if (fs.existsSync(splashPath)) {
    splash.loadFile(splashPath);
  }

  // Main window
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    title: 'BLCKBOLT BROWSER – Developer Mode',
    icon: process.platform === 'win32'
      ? path.join(__dirname, 'assets', 'icon.ico')
      : path.join(__dirname, 'assets', 'icon.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webRtcIPHandlingPolicy: 'disable_non_proxied_udp',
      webviewTag: true
    }
  });

  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '..', 'renderer', 'out', 'index.html')}`;
  mainWindow.loadURL(startUrl);

  // Transition from splash to main
  setTimeout(() => {
    if (splash && !splash.isDestroyed()) splash.close();
    if (mainWindow) mainWindow.show();
  }, 3000);

  // Auto-update check
  if (initAutoUpdater) {
    try { initAutoUpdater(mainWindow); } catch (e) { console.warn('Updater check failed', e.message); }
  }

  // Track webview contents for fingerprint/canvas protection injection
  mainWindow.webContents.on('did-attach-webview', (event, webContents) => {
    webviewContents.push(webContents);
    webContents.on('destroyed', () => {
      const idx = webviewContents.indexOf(webContents);
      if (idx !== -1) webviewContents.splice(idx, 1);
    });
    if (canvasBlockingEnabled) {
      webContents.once('dom-ready', () => injectIntoWebContents(webContents));
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    webviewContents = [];
  });

  // Header & SSL Interception
  session.defaultSession.webRequest.onCompleted((details) => {
    if (mainWindow && details.resourceType === 'mainFrame') {
      mainWindow.webContents.send('header-data', {
        url: details.url,
        method: details.method,
        statusCode: details.statusCode,
        responseHeaders: details.responseHeaders,
        ip: details.ip
      });
    }
  });

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    if (mainWindow && details.resourceType === 'mainFrame') {
      mainWindow.webContents.send('header-data', {
        requestHeaders: details.requestHeaders
      });
    }
    callback({ cancel: false });
  });

  // SSL Info via certificate-error (for verification) and potentially other means
  // In a real browser we might use more advanced APIs, but for now we'll capture cert errors at least
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (mainWindow) {
      mainWindow.webContents.send('ssl-data', {
        issuerName: certificate.issuerName,
        subjectName: certificate.subjectName,
        validExpiry: certificate.validTo,
        protocol: certificate.protocol,
        fingerprint: certificate.fingerprint,
        error: error
      });
    }
    callback(false);
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  if (!fs.existsSync(iconPath)) return;

  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show BLCKBOLT',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        } else {
          createWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('BLCKBOLT Browser');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
    } else {
      createWindow();
    }
  });
}

// Single instance handling
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (event, argv) => {
    const url = argv.find(a => a && a.startsWith && a.startsWith('blckbolt://'));
    if (url && mainWindow) mainWindow.webContents.send('protocol-url', url);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.on('ready', () => {
  createWindow();
  createTray();
  try { app.setAsDefaultProtocolClient('blckbolt'); } catch (e) { }
});

app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow) mainWindow.webContents.send('protocol-url', url);
});

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  }
});

app.on('window-all-closed', function () {
  // Keep the app running in the background even when all windows are closed
  // This matches modern privacy tools/browsers that stay ready for quick launch
  console.log('All windows closed, app staying active in background');
});

app.on('before-quit', () => {
  app.isQuitting = true;
});


// IPC Handlers: Tor
ipcMain.handle('tor-enable', async (event, { profileId, socksHost = '127.0.0.1', socksPort = 9050 }) => {
  torManager.setProfileTor(profileId, { enabled: true, socksHost, socksPort });
  await torManager.applyProxyToSession(session.defaultSession, profileId);
  return torManager.getProfile(profileId);
});

ipcMain.handle('tor-disable', async (event, { profileId }) => {
  torManager.setProfileTor(profileId, { enabled: false });
  await torManager.applyProxyToSession(session.defaultSession, profileId);
  return torManager.getProfile(profileId);
});

ipcMain.handle('tor-status', async (event, { profileId }) => {
  const p = torManager.getProfile(profileId);
  const reachable = await torManager.isSocksReachable(p.socksHost, p.socksPort);
  return { ...p, reachable };
});

ipcMain.handle('tor-test', async (event, { profileId, socksHost = '127.0.0.1', socksPort = 9050 } = {}) => {
  // Verify the SOCKS endpoint responds and fetch the egress IP through it.
  const reachable = await torChecker.isSocksReachable(socksHost, socksPort);
  if (!reachable) return { reachable: false, ip: null };
  try {
    const ip = await torChecker.getPublicIP({ socksHost, socksPort });
    return { reachable: true, ip };
  } catch (e) {
    console.warn('tor-test IP lookup failed:', e.message);
    return { reachable: true, ip: null };
  }
});

// IPC Handlers: VPN
ipcMain.on('vpn-connect', (event, opts = {}) => {
  const configPath = getOvpnFile();
  if (!configPath) {
    event.sender.send('vpn-status', 'error');
    return;
  }
  const mode = opts.mode || 'proxy';
  const proxyPort = opts.proxyPort || 1080;
  vpn.connectWithFile(configPath, mode, proxyPort);
  if (mode === 'proxy') {
    proxyAgent.setSocksProxy(session.defaultSession, proxyPort);
  }
});

ipcMain.on('vpn-disconnect', (event) => {
  vpn.disconnect();
  proxyAgent.clearProxy(session.defaultSession);
});

ipcMain.on('navigate', (event, { url }) => {
  if (mainWindow) {
    mainWindow.webContents.send('navigate', url);
  }
});

vpn.on('log', (msg) => { if (mainWindow) mainWindow.webContents.send('vpn-log', msg); });
vpn.on('connected', () => { if (mainWindow) mainWindow.webContents.send('vpn-status', 'connected'); });
vpn.on('disconnected', () => { if (mainWindow) mainWindow.webContents.send('vpn-status', 'disconnected'); });

// IPC Handlers: AdBlocker
ipcMain.handle('adblock-enable', () => {
  adblocker.enable(session.defaultSession);
  return { enabled: true };
});

ipcMain.handle('adblock-disable', () => {
  adblocker.disable(session.defaultSession);
  return { enabled: false };
});

ipcMain.handle('adblock-status', () => {
  return { enabled: adblocker.enabled, blockedCount: adblocker.getBlockedCount() };
});

// IPC Handlers: Fingerprint
ipcMain.handle('fingerprint-randomize', () => {
  const p = fingerprint.randomize();
  fingerprint.applyToSession(session.defaultSession);
  return p;
});

ipcMain.handle('fingerprint-status', () => {
  return fingerprint.getCurrent();
});

ipcMain.handle('fingerprint-set', (event, index) => {
  fingerprint.setProfile(index);
  fingerprint.applyToSession(session.defaultSession);
  return fingerprint.getCurrent();
});

// IPC Handlers: WebRTC Leak Detection & Prevention
ipcMain.handle('webrtc-test', async () => {
  // Test if WebRTC leaks local IPs from the active webview (fallback: main window).
  // Returns: { protected: boolean, ipAddresses: string[] }
  try {
    const target = webviewContents.find(wc => !wc.isDestroyed()) || (mainWindow && mainWindow.webContents);
    if (!target) return { protected: true, ipAddresses: [] };

    // Run in the page context. Note the template literal: \\.  ->  \. in the
    // executed source, so the regex correctly matches dotted IPv4 addresses.
    const result = await target.executeJavaScript(`
      (async () => {
        const peerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
        if (!peerConnection) return { protected: true, ipAddresses: [] };
        
        const ips = [];
        const pc = new peerConnection({ iceServers: [] });
        
        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            pc.close();
            resolve({ protected: ips.length === 0, ipAddresses: ips });
          }, 2000);
          
          pc.onicecandidate = (ice) => {
            if (!ice || !ice.candidate) return;
            const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
            const match = ice.candidate.candidate.match(ipRegex);
            if (match && !match[1].startsWith('127.')) {
              ips.push(match[1]);
            }
          };
          
          pc.createDataChannel('test');
          pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(() => {});
        });
      })()
    `);
    
    return result || { protected: true, ipAddresses: [] };
  } catch (e) {
    console.warn('WebRTC test error:', e.message);
    return { protected: true, ipAddresses: [] };
  }
});

ipcMain.handle('webrtc-status', () => {
  return {
    blocked: true,
    policy: 'disable_non_proxied_udp',
    timestamp: new Date().toISOString()
  };
});

// IPC Handlers: DoH/DoT (DNS over HTTPS/TLS)
ipcMain.handle('doh-get-resolvers', () => {
  return dohDot.getResolvers();
});

ipcMain.handle('doh-get-current', () => {
  return dohDot.getCurrentResolver();
});

ipcMain.handle('doh-set-resolver', (event, { resolverId, dohEnabled, dotEnabled }) => {
  const result = dohDot.setResolver(resolverId, { dohEnabled, dotEnabled });
  if (mainWindow) {
    dohDot.applyToSession(session.defaultSession);
    mainWindow.webContents.send('doh-updated', result);
  }
  return result;
});

ipcMain.handle('doh-test-resolver', async (event, resolverId) => {
  return await dohDot.testResolver(resolverId);
});

ipcMain.handle('doh-status', () => {
  return dohDot.getStatus();
});

// IPC Handlers: Canvas Fingerprinting Blocker
ipcMain.handle('canvas-blocker-enable', () => {
  canvasBlockingEnabled = true;
  for (const wc of webviewContents) {
    if (wc.isDestroyed()) continue;
    wc.once('dom-ready', () => injectIntoWebContents(wc));
    injectIntoWebContents(wc);
  }
  return { enabled: true };
});

ipcMain.handle('canvas-blocker-disable', () => {
  canvasBlockingEnabled = false;
  // Reload webviews so the injected prototype overrides are dropped.
  for (const wc of webviewContents) {
    if (!wc.isDestroyed()) wc.reload();
  }
  return { enabled: false };
});

ipcMain.handle('canvas-blocker-status', () => {
  return {
    enabled: canvasBlockingEnabled,
    timestamp: new Date().toISOString()
  };
});

// IPC Handlers: DPI Detection
ipcMain.handle('dpi-detector-start', async () => {
  const results = await dpiDetector.runDetectionScan();
  if (mainWindow) {
    mainWindow.webContents.send('dpi-results', results);
  }
  return results;
});

ipcMain.handle('dpi-detector-status', () => {
  return dpiDetector.getStatus();
});

ipcMain.handle('dpi-detector-recommendations', () => {
  return dpiDetector.getRecommendations();
});




