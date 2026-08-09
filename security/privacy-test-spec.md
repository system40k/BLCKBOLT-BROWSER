# External Privacy Test Contract

A privacy feature is considered **enforced** only when an external observer verifies it.

## DNS

1. Start an observer that records resolver traffic.
2. Load a controlled HTTPS page from the browser.
3. Resolve a unique per-test hostname.
4. Verify resolver traffic uses only the configured policy.
5. Verify no direct system resolver receives the query.

## WebRTC

1. Open a controlled page that creates ICE candidates.
2. Collect host, server-reflexive, and relay candidates.
3. Compare candidates against the expected proxy/VPN/Tor egress policy.
4. Fail if an unintended local/public address is exposed.
5. A timeout or instrumentation failure is `unknown`, never `protected`.

## Proxy/Tor/VPN

1. Record baseline external egress IP.
2. Enable the routing mode.
3. Request a controlled endpoint that records source IP.
4. Verify source IP matches the expected egress.
5. Test DNS separately.
6. Test WebRTC separately.
7. Disable routing and verify the browser returns to the expected baseline state.

## Test result contract

`protected` requires positive evidence.

`leaked` requires positive evidence of a bypass.

`unknown` means the test could not establish either condition.

Never infer `protected` from a test exception, timeout, missing response, or failed instrumentation.
