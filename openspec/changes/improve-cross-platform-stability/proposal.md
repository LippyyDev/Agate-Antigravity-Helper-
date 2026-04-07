# Change: Cross-Platform Stability and Robustness Improvements (P0+P1+P2)

## Why

- Account injection and detection across platforms are vulnerable to DB locks, version-detection failures, and OS-level differences.
- Stability, diagnosability, and maintainability must improve without changing business semantics.

## What Changes

- Make the write flow atomic (transaction-wrapped).
- Add DB lock retry and `busy_timeout`.
- Add cache and lower-noise logging for version detection.
- Add a more robust Windows fallback for version detection (read from `package.json`).
- Introduce strategy-based injection routing (new/legacy/dual-write).
- Add capability probing: prefer new format when new-format keys are detected.

## Impact

- Affected specs: `ide-auth-compat`
- Affected code:
  - `src/ipc/database/cloudHandler.ts`
  - `src/ipc/database/handler.ts`
  - `src/utils/antigravityVersion.ts`
  - `src/utils/paths.ts` (this stage covers default runtime configuration path only)
  - `src/types/db.ts`

## Constraints

- Do not change existing business semantics; only improve stability and structure.
- This stage only covers the default runtime configuration path.

## Risks

- Transaction and retry logic may change when errors surface.
- Capability probing may conflict with version detection unless priority is clearly defined.
