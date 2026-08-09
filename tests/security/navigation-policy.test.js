const { evaluateNavigation } = require('../../security/navigation-policy');

describe('navigation policy', () => {
  test.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'vbscript:msgbox(1)',
    'chrome://settings',
    'devtools://devtools/bundled/inspector.html',
  ])('denies dangerous or unsupported URL %s', (url) => {
    expect(evaluateNavigation(url).allowed).toBe(false);
  });

  test.each([
    'https://example.com/',
    'http://example.com/',
    'about:blank',
    'blckbolt://app/settings',
  ])('allows explicitly supported URL %s', (url) => {
    expect(evaluateNavigation(url).allowed).toBe(true);
  });

  test('rejects malformed URLs', () => {
    expect(evaluateNavigation('not a valid url').allowed).toBe(false);
  });
});
