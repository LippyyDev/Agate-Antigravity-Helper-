## 1. Scope and Planning Confirmation

- [x] 1.1 Review `proposal.md`.
- [x] 1.2 Confirm this stage covers default runtime configuration path only.
- [x] 1.3 Define behavior-consistency constraints.

## 2. Implementation

- [x] 2.1 Add IDE version-detection module.
- [x] 2.2 Add encode/decode support for new-format OAuth token.
- [x] 2.3 Add routed injection logic and dual-write fallback on detection failure.
- [x] 2.4 Prefer new format for account detection, with legacy fallback.
- [x] 2.5 Extend backup/restore to cover new-format keys.

## 3. Verification

- [ ] 3.1 Self-test injection paths for both new and legacy formats.
- [ ] 3.2 Verify dual-write behavior when version detection fails.
- [ ] 3.3 Verify account availability after backup/restore.
