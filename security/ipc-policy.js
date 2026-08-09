'use strict';

/**
 * Central IPC trust-boundary helpers.
 * Handlers should call assertTrustedSender before processing arguments.
 */

const TRUSTED_SCHEME = 'blckbolt:';

function isTrustedUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === TRUSTED_SCHEME;
  } catch {
    return false;
  }
}

function assertTrustedSender(event, expectedWebContents) {
  if (!event || !event.sender) {
    throw new Error('IPC sender unavailable');
  }

  if (expectedWebContents && event.sender !== expectedWebContents) {
    throw new Error('Untrusted IPC sender');
  }

  const senderFrame = event.senderFrame;
  if (!senderFrame || !isTrustedUrl(senderFrame.url)) {
    throw new Error('Untrusted IPC origin');
  }

  return true;
}

function assertPlainObject(value, name = 'argument') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be a plain object`);
  }
  return value;
}

function assertString(value, name, maxLength = 4096) {
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new TypeError(`${name} must be a string of <= ${maxLength} characters`);
  }
  return value;
}

function assertAllowedProtocol(rawUrl, protocols = ['https:', 'http:', 'about:', 'blckbolt:']) {
  const url = new URL(rawUrl);
  if (!protocols.includes(url.protocol)) {
    throw new Error(`Navigation protocol denied: ${url.protocol}`);
  }
  if (['javascript:', 'data:', 'file:'].includes(url.protocol)) {
    throw new Error(`Dangerous navigation protocol denied: ${url.protocol}`);
  }
  return true;
}

module.exports = {
  assertTrustedSender,
  assertPlainObject,
  assertString,
  assertAllowedProtocol,
  isTrustedUrl,
};
