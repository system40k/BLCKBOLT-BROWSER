// DPI (Deep Packet Inspection) Detection Module
// Tests for traffic analysis and censorship interference

const net = require('net');
const dns = require('dns').promises;
const https = require('https');

class DPIDetector {
  constructor() {
    this.isRunning = false;
    this.results = {
      dpiDetected: false,
      blockedDomains: [],
      slowDomains: [],
      certIssues: [],
      lastCheckTime: null,
      threatLevel: 'none', // none, low, medium, high
    };
    this.knownBlockedDomains = [
      // These are commonly censored domains used in testing
      // Using safe, well-known services for detection
      { domain: 'example.org', type: 'dns', isBlocked: false }, // Control - should always work
      { domain: 'test.torproject.org', type: 'https', isBlocked: false }, // Tor test
      { domain: 'dns.google', type: 'https', isBlocked: false }, // Public DNS
    ];
  }

  // Test DNS resolution consistency
  async testDNSResolution(domain) {
    try {
      const startTime = Date.now();
      const results = await dns.resolve4(domain);
      const latency = Date.now() - startTime;

      if (latency > 2000) {
        return {
          domain,
          success: true,
          latency,
          suspicious: true,
          reason: 'Unusual DNS latency detected',
        };
      }

      return {
        domain,
        success: true,
        latency,
        suspicious: false,
      };
    } catch (e) {
      return {
        domain,
        success: false,
        error: e.message,
        suspicious: true,
        reason: 'DNS resolution failed - possible blocking or filtering',
      };
    }
  }

  // Test HTTPS connectivity
  async testHTTPSConnection(domain) {
    return new Promise((resolve) => {
      const options = {
        hostname: domain,
        port: 443,
        path: '/',
        method: 'GET',
        timeout: 5000,
        rejectUnauthorized: false, // Allow self-signed for testing
      };

      const startTime = Date.now();
      const req = https.request(options, (res) => {
        const latency = Date.now() - startTime;
        req.abort();

        // Check for certificate issues
        const certIssue = res.socket.authorizationError ? true : false;

        resolve({
          domain,
          success: true,
          statusCode: res.statusCode,
          latency,
          certIssue,
          suspicious: res.statusCode === 403 || certIssue,
        });
      });

      // options.timeout is ignored by Node's https module; enforce it ourselves.
      req.setTimeout(5000, () => req.destroy(new Error('timeout')));

      req.on('error', (e) => {
        const latency = Date.now() - startTime;
        resolve({
          domain,
          success: false,
          error: e.message,
          latency,
          suspicious: true,
          reason: e.message.includes('timeout') ? 'Connection timeout - possible blocking' : 'Connection error',
        });
      });

      req.end();
    });
  }

  // Run full DPI detection scan
  async runDetectionScan() {
    if (this.isRunning) return this.results;
    this.isRunning = true;

    try {
      const dnsTests = [];
      const httpsTests = [];

      // Test DNS resolution
      for (const item of this.knownBlockedDomains) {
        dnsTests.push(this.testDNSResolution(item.domain));
      }

      const dnsResults = await Promise.all(dnsTests);

      // Test HTTPS connectivity
      for (const item of this.knownBlockedDomains) {
        httpsTests.push(this.testHTTPSConnection(item.domain));
      }

      const httpsResults = await Promise.all(httpsTests);

      // Analyze results
      this.analyzeResults(dnsResults, httpsResults);
    } catch (e) {
      console.error('DPI detection error:', e);
    } finally {
      this.isRunning = false;
    }

    return this.results;
  }

  analyzeResults(dnsResults, httpsResults) {
    this.results.blockedDomains = [];
    this.results.slowDomains = [];
    this.results.certIssues = [];
    this.results.dpiDetected = false;

    // Check for blocked domains
    for (const result of dnsResults) {
      if (!result.success && result.suspicious) {
        this.results.blockedDomains.push({
          domain: result.domain,
          reason: result.reason,
          type: 'dns',
        });
        this.results.dpiDetected = true;
      }
      if (result.latency > 1000) {
        this.results.slowDomains.push({
          domain: result.domain,
          latency: result.latency,
          type: 'dns',
        });
      }
    }

    // Check HTTPS results
    for (const result of httpsResults) {
      if (!result.success && result.suspicious) {
        this.results.blockedDomains.push({
          domain: result.domain,
          reason: result.reason,
          type: 'https',
        });
        this.results.dpiDetected = true;
      }
      if (result.certIssue) {
        this.results.certIssues.push({
          domain: result.domain,
          reason: 'Certificate validation issue - possible MITM',
        });
        this.results.dpiDetected = true;
      }
      if (result.latency > 3000) {
        this.results.slowDomains.push({
          domain: result.domain,
          latency: result.latency,
          type: 'https',
        });
      }
    }

    // Set threat level
    if (this.results.certIssues.length > 0) {
      this.results.threatLevel = 'high';
    } else if (this.results.blockedDomains.length >= 2) {
      this.results.threatLevel = 'high';
    } else if (this.results.blockedDomains.length === 1) {
      this.results.threatLevel = 'medium';
    } else if (this.results.slowDomains.length >= 2) {
      this.results.threatLevel = 'low';
    } else {
      this.results.threatLevel = 'none';
    }

    this.results.lastCheckTime = new Date();
  }

  getStatus() {
    return {
      dpiDetected: this.results.dpiDetected,
      threatLevel: this.results.threatLevel,
      blockedCount: this.results.blockedDomains.length,
      isRunning: this.isRunning,
      lastCheckTime: this.results.lastCheckTime,
      details: this.results,
    };
  }

  // Get recommendations based on detected threats
  getRecommendations() {
    const recommendations = [];

    if (this.results.threatLevel === 'none') {
      recommendations.push({
        level: 'info',
        message: 'No DPI interference detected. Your connection appears clean.',
      });
    } else if (this.results.threatLevel === 'low') {
      recommendations.push({
        level: 'low',
        message: 'Minor latency anomalies detected. Consider enabling DoH.',
        action: 'Enable DNS over HTTPS in Settings > DNS',
      });
    } else if (this.results.threatLevel === 'medium') {
      recommendations.push({
        level: 'medium',
        message: 'Possible DPI detected. Enable VPN and DoH immediately.',
        actions: [
          'Enable VPN in toolbar',
          'Enable DoH in Settings > DNS',
          'Consider using Tor for sensitive browsing',
        ],
      });
    } else if (this.results.threatLevel === 'high') {
      recommendations.push({
        level: 'high',
        message: '⚠️ CRITICAL: Possible MITM or heavy DPI interference detected!',
        actions: [
          'Enable VPN immediately',
          'Enable Tor for all traffic',
          'Verify certificate trust (Settings > Security)',
          'Consider changing network',
        ],
      });
    }

    return recommendations;
  }
}

module.exports = new DPIDetector();

