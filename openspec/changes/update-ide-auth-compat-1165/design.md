## Context

- The target IDE changed account OAuth token persistence format starting from version 1.16.5.
- Existing JS logic only covers the legacy format, causing account detection and switching failures.
- Version detection, new/legacy routing, and dual-write fallback need to be completed.

## Goals / Non-Goals

- Goals:
  - Ensure compatibility for versions 1.16.5+.
  - Apply dual-format injection fallback when version detection fails.
  - Extend backup/restore coverage to include new-format keys.

## Decisions

- Decision: Write a single format when version detection succeeds; dual-write when detection fails.
- Decision: Prefer reading the new format for account detection, with legacy fallback.
- Decision: Keep protobuf encode/decode behavior and field ordering consistent.

## Risks / Trade-offs

- Risk: Protobuf encode/decode mismatch may cause injection failure.
  - Mitigation: Per-field validation and regression test coverage.
- Risk: Version detection failure.
  - Mitigation: Dual-write fallback.
- Risk: DB lock conflicts.
  - Mitigation: Keep existing flow: close IDE -> backup -> inject -> restart.

## Migration Plan

1. Implement version-detection module (JS).
2. Implement protobuf encode/decode for new format.
3. Implement routed injection/detection logic with dual-write fallback.
4. Extend backup/restore key set.

## Open Questions

- None.
