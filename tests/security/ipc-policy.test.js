const {
  assertTrustedSender,
  assertPlainObject,
  assertString,
} = require('../../security/ipc-policy');

describe('IPC policy', () => {
  test('accepts the expected trusted sender', () => {
    const sender = {};
    const event = {
      sender,
      senderFrame: { url: 'blckbolt://app' },
    };
    expect(assertTrustedSender(event, sender)).toBe(true);
  });

  test('rejects a different WebContents sender', () => {
    const trusted = {};
    const attacker = {};
    expect(() => assertTrustedSender({
      sender: attacker,
      senderFrame: { url: 'blckbolt://app' },
    }, trusted)).toThrow('Untrusted IPC sender');
  });

  test('rejects remote IPC origins', () => {
    expect(() => assertTrustedSender({
      sender: {},
      senderFrame: { url: 'https://evil.example/' },
    })).toThrow('Untrusted IPC origin');
  });

  test('validates primitive arguments', () => {
    expect(() => assertString(42, 'url')).toThrow();
    expect(() => assertPlainObject([])).toThrow();
    expect(assertString('https://example.com', 'url')).toBe('https://example.com');
  });
});
