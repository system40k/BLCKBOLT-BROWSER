// proxy-agent.js: Set Electron session proxy for browser-only VPN mode

function setSocksProxy(ses, port = 1080) {
  return ses.setProxy({ proxyRules: `socks5://127.0.0.1:${port}` });
}

function clearProxy(ses) {
  return ses.setProxy({ proxyRules: '' });
}

module.exports = { setSocksProxy, clearProxy };
