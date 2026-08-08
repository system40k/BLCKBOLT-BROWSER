// main/modules/fingerprint/canvas-inject.js
// Canvas fingerprinting protection injected into webview contents by the main process.
// Kept as a plain string so it can be run via webContents.executeJavaScript after
// every navigation; disabling the feature reloads the webview to drop the overrides.

const CANVAS_PROTECTION_SCRIPT = `
(function() {
  if (window.__blckboltCanvasInjected) return;
  window.__blckboltCanvasInjected = true;
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

  if (window.WebGLRenderingContext) {
    WebGLRenderingContext.prototype.getParameter = (function() {
      const original = WebGLRenderingContext.prototype.getParameter;
      return function(parameter) {
        if (parameter === WebGLRenderingContext.RENDERER) return 'WebKit WebGL';
        if (parameter === WebGLRenderingContext.VENDOR) return 'WebKit';
        return original.call(this, parameter);
      };
    })();
  }
})();
`;

function injectIntoWebContents(wc) {
  if (!wc || wc.isDestroyed()) return;
  wc.executeJavaScript(CANVAS_PROTECTION_SCRIPT).catch(() => {});
}

module.exports = { CANVAS_PROTECTION_SCRIPT, injectIntoWebContents };

