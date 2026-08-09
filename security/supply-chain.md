# Supply-chain controls

## Required for RC

- Commit `package-lock.json` and use `npm ci`.
- Pin third-party GitHub Actions to immutable commit SHAs.
- Generate an SBOM for every release artifact.
- Generate SHA-256 and SHA-512 checksums.
- Generate build provenance/attestation where supported by the publishing environment.
- Keep one authoritative release workflow.
- Do not store signing certificates or passwords in repository files.
- Inject signing credentials only through protected CI secrets/signing infrastructure.
- Verify signatures after signing and before publishing release metadata.
- Verify published artifacts against locally generated checksums.

## Release artifact evidence

Each release should retain:

- artifact filename
- platform/architecture
- SHA-256
- SHA-512
- signing status
- notarization status where applicable
- SBOM reference
- provenance/attestation reference
- build commit SHA
- Node version
- Electron version
