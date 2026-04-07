# Change: Add Multi-Architecture and Multi-Format Release Artifacts

## Why

Current release artifacts only cover part of the required architectures and formats. This does not meet demand for Linux arm64, macOS universal, and Windows MSI, and it lacks consistent naming and SHA-256 checksum outputs aligned with distribution requirements.

## What Changes

- Add Linux arm64 (`aarch64`) builds producing `.deb`, `.rpm`, and `.AppImage`.
- Add `macOS universal.dmg` (while keeping x64/arm64 dmg outputs).
- Add Windows MSI artifacts in parallel with existing Squirrel `.exe`.
- Standardize artifact naming and architecture identifiers, and generate SHA-256 checksum files.

## Impact

- Affected specs: `release-packaging`
- Affected code:
  - `E:\project\Crack\.Platform\workflows\publish.yaml`
  - `E:\project\Crack\forge.config.ts`
  - `E:\project\Crack\package.json`
