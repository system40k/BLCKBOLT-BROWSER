// main/modules/tor/torChecker.js
const net = require('net');
const https = require('https');
const { SocksProxyAgent } = require('socks-proxy-agent');

async function isSocksReachable(socksHost, socksPort, timeout = 2000) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    let done = false;
    s.setTimeout(timeout);
    s.on('connect', () => { done = true; s.destroy(); resolve(true); });
    s.on('error', () => { if (!done) { done = true; resolve(false); }});
    s.on('timeout', () => { if (!done) { done = true; s.destroy(); resolve(false); }});
    s.connect(socksPort, socksHost);
  });
}

async function getPublicIP({ socksHost, socksPort, timeout = 8000 }) {
  // Fetch the public IP through the Tor SOCKS proxy.
  return new Promise((resolve, reject) => {
    const agent = new SocksProxyAgent(`socks5://${socksHost}:${socksPort}`);
    const req = https.get({
      hostname: 'api.ipify.org',
      path: '/?format=json',
      agent,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const ip = JSON.parse(data).ip;
          resolve(ip);
        } catch (e) { reject(e); }
      });
    });
    req.setTimeout(timeout, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

module.exports = { isSocksReachable, getPublicIP };

