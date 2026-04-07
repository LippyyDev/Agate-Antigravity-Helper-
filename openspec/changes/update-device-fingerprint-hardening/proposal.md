# Change: Device Fingerprint Consolidation and Hardening

## What Changes

- Unify backend scope:
  - Fingerprint read/write with synchronized updates to `storage.json` and `state.vscdb`
  - Account-level binding, revision history, and baseline restore
  - Fingerprint apply orchestration during switch flows (local/cloud)
- Unify management scope:
  - Device fingerprint management dialog
  - Generate-and-bind, capture-and-bind, restore revision, delete revision, restore baseline, and open storage folder
- Unify robustness scope:
  - Two-phase apply (`prepare -> verify -> commit`)
  - Deterministic rollback before commit on failure
  - Failure reason classification, safe mode, degradation strategy, and diagnostics snapshots
  - Versioned payload with boundary validation (lenient compatibility + strict failure for critical structure)
- Path scope: this stage focuses on the default runtime configuration path.

## Non-Goals

- Do not promise any anti-detection, anti-ban, or risk-control bypass outcome.
- Do not introduce token/protobuf semantic changes unrelated to device fingerprinting.
- Do not perform ORM or large database refactors in this change.

## Impact

- Affected specs: `device-fingerprint-hardening`
- Affected code:
  - `src/ipc/device/handler.ts`
  - `src/ipc/account/handler.ts`
  - `src/ipc/cloud/handler.ts`
  - `src/ipc/switchFlow.ts`
  - `src/ipc/switchMetrics.ts`
  - `src/ipc/database/cloudHandler.ts`
  - `src/components/DeviceFingerprintDialog.tsx`
  - `src/actions/account.ts`
  - `src/actions/cloud.ts`
  - `src/tests/unit/account.test.ts`
  - `src/tests/unit/cloudHandler-sync.test.ts`
