function normalizePrivacyResult(result) {
  if (!result || typeof result !== 'object') {
    return { status: 'failed', details: 'invalid-result' };
  }
  if (result.testError) {
    return { status: 'unknown', details: result.testError };
  }
  if (result.protected === true) return { status: 'protected' };
  if (result.protected === false) return { status: 'leaked' };
  return { status: 'unknown' };
}

describe('privacy result semantics', () => {
  test('does not convert test errors into protected', () => {
    expect(normalizePrivacyResult({ protected: true, testError: 'timeout' }).status)
      .toBe('unknown');
  });

  test('distinguishes protected from leaked', () => {
    expect(normalizePrivacyResult({ protected: true }).status).toBe('protected');
    expect(normalizePrivacyResult({ protected: false }).status).toBe('leaked');
  });

  test('unknown is the safe result for incomplete evidence', () => {
    expect(normalizePrivacyResult({}).status).toBe('unknown');
  });
});

module.exports = { normalizePrivacyResult };
