// vpn.js - VPN integration module for BLCKBOLT-BROWSER
// Accepts OpenVPN .ovpn configs, manages connection via CLI
// Placeholder: implement OpenVPN child_process logic here
// TODO: Add IPC handlers and system permission checks


const { spawn } = require('child_process');
const fs = require('fs');
const EventEmitter = require('events');
class VpnManager extends EventEmitter {
  constructor() {
    super();
    this.proc = null;
    this.mode = null; // "system" or "proxy"
  }

  connectWithFile(ovpnPath, mode = 'proxy', proxyPort = 1080) {
    if (!fs.existsSync(ovpnPath)) throw new Error('ovpn missing');
    if (this.proc) return; // already connected - guard double-connect
    this.mode = mode;
    if (mode === 'system') {
      this._startSystemOpenVPN(ovpnPath);
    } else {
      // Launch openvpn with --management or spawn a helper that creates SOCKS proxy (see README)
      this._startOpenVPNProxy(ovpnPath, proxyPort);
    }
  }

  _startSystemOpenVPN(ovpnPath) {
    this.proc = spawn('openvpn', ['--config', ovpnPath], { detached: true });
    this._wireProcess();
  }

  _startOpenVPNProxy(ovpnPath, proxyPort) {
    // Example pattern: run openvpn --config file --dev tunX,
    // then run dante/socks server bound to tun or local mapping.
    // For quick dev: assume user runs container that exposes socks:1080
    // Spawn openvpn directly with the config as an argument (no shell
    // interpolation, so the path cannot be treated as extra flags/commands).
    this.proc = spawn('openvpn', ['--config', ovpnPath], { detached: true });
    this._wireProcess();
    // Note: You must instruct user to run a tiny container combining openvpn + dante for browser-only mode.
  }

  _wireProcess() {
    if (!this.proc) return;
    let connectedEmitted = false;
    const proc = this.proc;
    proc.stdout.on('data', d => this.emit('log', d.toString()));
    proc.stderr.on('data', d => this.emit('log', d.toString()));
    proc.on('error', (err) => {
      this.emit('log', `openvpn error: ${err.message}`);
      this.emit('error', err);
      if (this.proc === proc) this.proc = null;
    });
    proc.on('exit', (code, sig) => {
      this.emit('exit', { code, sig });
      if (this.proc === proc) this.proc = null;
    });
    // Only report 'connected' once the tunnel is actually up, not on spawn.
    const onData = (d) => {
      if (!connectedEmitted && /Initialization Sequence Completed/.test(d.toString())) {
        connectedEmitted = true;
        this.emit('connected');
      }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
  }

  disconnect() {
    if (this.proc) {
      const proc = this.proc;
      this.proc = null;
      try { process.kill(-proc.pid); } catch (e) { try { proc.kill(); } catch (e2) {} }
      this.emit('disconnected');
    }
  }

  status() {
    return { running: !!this.proc, mode: this.mode };
  }
}

module.exports = new VpnManager();

