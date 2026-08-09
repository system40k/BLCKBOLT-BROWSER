# BLCKBOLT Browser — Enterprise Release Gate

This gate must be green before `v1.0.0` production release.

## P0 security gates

- [ ] `<webview>` removed or fully isolated behind a documented migration exception
- [ ] `WebContentsView` migration complete
- [ ] Main-process navigation allowlist enforced
- [ ] `setWindowOpenHandler` enforced
- [ ] `will-navigate` enforced
- [ ] `javascript:`, `data:`, and untrusted `file:` navigation denied
- [ ] Every privileged IPC handler validates sender WebContents and expected origin
- [ ] Every IPC argument is schema-validated
- [ ] Permission requests default-deny and are origin scoped
- [ ] Download policy is explicit and tested
- [ ] Certificate/MITM policy is explicit and tested

## Privacy enforcement

- [ ] DNS requests cannot bypass configured resolver/proxy policy
- [ ] WebRTC ICE cannot expose unintended local/public addresses
- [ ] Proxy/Tor/VPN routing is verified by external observers, not UI state
- [ ] Failed privacy tests return `unknown`/`failed`, never `protected`
- [ ] Offline mode prevents unintended network access
- [ ] Captive portal behavior is documented and tested

## Adversarial security suite

- [ ] Malicious renderer → privileged IPC escalation
- [ ] Malicious preload injection
- [ ] Navigation scheme abuse
- [ ] Popup/new-window abuse
- [ ] Permission escalation
- [ ] Certificate interception
- [ ] Download abuse
- [ ] Settings injection
- [ ] Updater tampering/corruption

## Build and supply chain

- [ ] `npm ci` only; lockfile committed
- [ ] Dependency audit has zero Critical findings
- [ ] GitHub Actions third-party actions are SHA pinned
- [ ] SBOM generated for every release
- [ ] Artifact SHA-256/SHA-512 checksums generated
- [ ] Release provenance/attestation generated
- [ ] Exactly one authoritative release workflow
- [ ] Electron version is supported and security-reviewed

## Signing

### Windows
- [ ] Authenticode signing configured through CI secrets
- [ ] Timestamping enabled
- [ ] Installer and executable signatures verified after build

### macOS
- [ ] Developer ID Application signing configured
- [ ] Hardened Runtime enabled
- [ ] Notarization completed
- [ ] Stapled ticket verified

### Linux
- [ ] Release checksums published
- [ ] Repository/package metadata signed when distributed through a repository

## RC matrix

| Gate | Required |
|---|---|
| Critical findings | 0 |
| High findings | 0 |
| TypeScript | Pass |
| ESLint | Pass |
| Unit tests | Pass |
| Security tests | Pass |
| Dependency audit | 0 Critical |
| Linux packaging | Pass |
| Windows packaging | Pass |
| macOS packaging | Pass |
| Signing | Pass |
| Notarization | Pass |
| Updater | Pass |
| DNS leak | Pass |
| WebRTC leak | Pass |
| Proxy/Tor/VPN routing | Pass |

## Release rule

No production tag is permitted until all mandatory boxes are checked and the signed artifacts have been independently verified from the published checksums.
