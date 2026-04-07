# Change: IDE Auth Compatibility Fix for 1.16.5+

## Why

- The target IDE changed OAuth token persistence format starting from 1.16.5.
- The current JS implementation only supports the legacy format, causing account detection and switching failures.
- The verified behavior needs to be fully migrated into the current code path to reduce regression risk.

## What Changes

- Add IDE version detection and route injection by legacy/new format.
- Support encoding/decoding and account detection for the new OAuth token format.
- Apply dual-write fallback (legacy + new) when version detection fails.
- Extend backup/restore logic to include new-format keys.

## Constraints

- Keep existing behavior semantics; do not introduce new strategy layers or business fields.
- This stage only covers the default runtime configuration path.

## Impact

- Affected specs: `ide-auth-compat`
- Affected code:
  - `src/ipc/database/cloudHandler.ts`
  - `src/utils/protobuf.ts`
  - `src/ipc/database/handler.ts`
  - `src/utils/paths.ts`

## Risks

- Protobuf encoding/decoding mismatch may break injection or parsing.
- Version detection failure may route to the wrong injection path.
- DB lock conflicts during injection may cause write failures.
