## 1. Proposal Consolidation

- [x] 1.1 Merge duplicate device-fingerprint proposals into `update-device-fingerprint-hardening`.
- [x] 1.2 Unify scope and terminology across proposal/design/spec.
- [ ] 1.3 Complete proposal archival strategy (archive after release).

## 2. Feature Completeness (Backend)

- [x] 2.1 Provide APIs for querying/binding/restoring/deleting fingerprint history.
- [x] 2.2 Provide API to restore original device fingerprint.
- [x] 2.3 Provide API to open fingerprint storage folder.
- [x] 2.4 Reuse unified fingerprint-apply chain for local and cloud switching.

## 3. Feature Completeness (UI)

- [x] 3.1 Provide management entry via `DeviceFingerprintDialog`.
- [x] 3.2 Support generate-and-bind, capture-and-bind, restore history, and delete history.
- [x] 3.3 Support restore original fingerprint and open storage folder.
- [x] 3.4 Complete i18n copy and error messaging.

## 4. Robustness Hardening

- [x] 4.1 Implement two-phase apply in `src/ipc/device/handler.ts` (`prepare -> verify -> commit`).
- [x] 4.2 Perform deterministic rollback on pre-commit failure.
- [x] 4.3 Introduce failure-reason classification and integrate with `src/ipc/switchMetrics.ts`.
- [x] 4.4 Introduce versioned payload and strict boundary validation.
- [x] 4.5 Introduce safe mode and recovery strategy.
- [x] 4.6 Extend diagnostics snapshot (failure-reason counts, latest failure metadata, safe-mode status).

## 5. Verification

- [x] 5.1 Run `npm run type-check`.
- [x] 5.2 Run targeted unit tests:
  - `npm run test:unit src/tests/unit/account.test.ts`
  - `npm run test:unit src/tests/unit/cloudHandler-sync.test.ts`
- [ ] 5.3 Add/extend rollback invariant unit tests.
- [ ] 5.4 Add/extend abnormal history-data behavior unit tests.
- [ ] 5.5 Add/extend unit tests for platform-constrained generation rules.
- [ ] 5.6 Complete manual acceptance matrix across Windows/macOS/Linux.

## 6. Delivery Documentation

- [ ] 6.1 Produce a unified acceptance checklist and mark status item by item.
- [ ] 6.2 Archive merged proposals after release.
