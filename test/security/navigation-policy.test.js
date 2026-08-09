'use strict';

const assert = require('node:assert/strict');
const {
  isAllowedNavigation,
  isAllowedExternalNavigation,
  normalizeUrl,
} = require('../../main/security/navigation-policy');

const allowed = [
  'https://example.com/',
  'https://example.com/path?q=1',
  'blckbolt://settings',
  'about:blank',
];

const blocked = [
  'javascript:alert(document.domain)',
  'data:text/html,<script>alert(1)</script>',
  'file:///etc/passwd',
  'vbscript:msgbox(1)',
  'devtools://devtools/bundled/inspector.html',
  'chrome://settings',
  'http://example.com/',
  'ftp://example.com/file',
];

for (const url of allowed) assert.equal(isAllowedNavigation(url), true, `expected allowed: ${url}`);
for (const url of blocked) assert.equal(isAllowedNavigation(url), false, `expected blocked: ${url}`);

assert.equal(isAllowedExternalNavigation('https://example.com'), true);
assert.equal(isAllowedExternalNavigation('blckbolt://settings'), false);
assert.equal(isAllowedExternalNavigation('about:blank'), false);
assert.equal(normalizeUrl('not a URL'), null);
assert.equal(normalizeUrl(''), null);
assert.equal(normalizeUrl('x'.repeat(8193)), null);

console.log('security navigation-policy tests: PASS');
