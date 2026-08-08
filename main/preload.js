const { contextBridge, ipcRenderer } = require('electron');

// Inject canvas fingerprinting blocker
const script = document.createElement('script');
script.textContent = `
  (function() {
    const canvasSeed = Math.random();
    
    HTMLCanvasElement.prototype.toDataURL = (function() {
      const original = HTMLCanvasElement.prototype.toDataURL;
      return function(type, quality) {
        if (this.width > 0 && this.height > 0) {
          const canvas = document.createElement('canvas');
          canvas.width = this.width;
          canvas.height = this.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
            gradient.addColorStop(0, 'hsl(' + (canvasSeed * 360) + ', 60%, 50%)');
            gradient.addColorStop(1, 'hsl(' + ((canvasSeed * 360 + 180) % 360) + ', 60%, 50%)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, this.width, this.height);
          }
          return canvas.toDataURL(type, quality);
        }
        return original.call(this, type, quality);
      };
    })();

    CanvasRenderingContext2D.prototype.getImageData = (function() {
      const original = CanvasRenderingContext2D.prototype.getImageData;
      return function(sx, sy, sw, sh) {
        const imageData = original.call(this, sx, sy, sw, sh);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 128;
          data[i + 1] = 128;
          data[i + 2] = 128;
          data[i + 3] = 255;
        }
        return imageData;
      };
    })();

    if (WebGLRenderingContext) {
      WebGLRenderingContext.prototype.getParameter = (function() {
        const original = WebGLRenderingContext.prototype.getParameter;
        return function(parameter) {
          if (parameter === WebGLRenderingContext.RENDERER) {
            return 'WebKit WebGL';
          }
          if (parameter === WebGLRenderingContext.VENDOR) {
            return 'WebKit';
          }
          return original.call(this, parameter);
        };
      })();
    }
  })();
`;
document.documentElement.insertBefore(script, document.documentElement.firstChild);

contextBridge.exposeInMainWorld('blckboltAPI', {
  send: (channel, data) => {
    // Only allow specific channels for security
    const validChannels = ['vpn-connect', 'vpn-disconnect', 'navigate'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  on: (channel, func) => {
    const validChannels = ['vpn-status', 'vpn-log', 'protocol-url', 'navigate', 'header-data', 'ssl-data', 'update-available', 'doh-updated', 'dpi-results', 'stats-update', 'privacy-log'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  invoke: (channel, data) => {
    // Tor and other IPC methods
    const validInvoke = [
      'tor-enable', 'tor-disable', 'tor-status', 'tor-test',
      'adblock-enable', 'adblock-disable', 'adblock-status',
      'fingerprint-randomize', 'fingerprint-status', 'fingerprint-set',
      'webrtc-test', 'webrtc-status',
      'doh-get-resolvers', 'doh-get-current', 'doh-set-resolver', 'doh-test-resolver', 'doh-status',
      'canvas-blocker-enable', 'canvas-blocker-disable', 'canvas-blocker-status',
      'dpi-detector-start', 'dpi-detector-status', 'dpi-detector-recommendations'
    ];
    if (validInvoke.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
  }
});

