## 1. Scope and Planning Confirmation
- [ ] 1.1 Review `proposal.md`.
- [ ] 1.2 Finalize priority: capability probing vs version detection.
- [ ] 1.3 Confirm this stage covers default runtime configuration path only.

## 2. Implementation
- [x] 2.1 Make write flow transactional (atomic).
- [x] 2.2 Add DB lock retry and `busy_timeout`.
- [x] 2.3 Add version-detection cache and lower-noise logs.
- [x] 2.4 Add Windows fallback for version detection (`package.json`).
- [x] 2.5 Split injection path by strategy pattern.
- [x] 2.6 Add capability probing: prefer new format when new key is detected.

## 3. Verification
- [x] 3.1 Simulate SQLITE_BUSY/LOCKED retry behavior.
- [x] 3.2 Verify fallback path for version-detection failure.
- [x] 3.3 Verify capability-probing priority behavior.
