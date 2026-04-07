## Context

Device-fingerprint capability spans the data layer, switch-orchestration layer, and UI management layer.
Historical proposals split the same capability across multiple change IDs, which fragmented implementation and acceptance criteria.
This design combines "feature completeness + robustness" into a single constraint set to keep implementation, verification, and release aligned.

## Goals / Non-Goals

- Goals:
  - Unify scope and acceptance criteria for device-fingerprint capability.
  - Ensure behavioral consistency and diagnosability for local/cloud switching.
  - Keep consistent behavior on default paths across Windows/macOS/Linux.
  - Keep legacy-data compatibility predictable and verifiable.
- Non-Goals:
  - Support for non-default runtime configuration paths.
  - Business strategy expansion unrelated to this capability.

## Decisions

- Decision: Use a single change ID to manage the complete capability.
  - Rationale: Reduce governance overhead caused by duplicate proposals.
- Decision: Apply fingerprint using a two-phase flow with strict pre-commit verification.
  - Rationale: Reduce mixed-state risk caused by partial success.
- Decision: Use versioned payload + boundary validation for fingerprint/history data.
  - Rationale: Avoid silent data contamination and define clear compatibility/failure boundaries.
- Decision: Use fail-fast semantics for switch failures and return structured failure reasons.
  - Rationale: Make failure behavior predictable and observable.
- Decision: Trigger safe mode for temporary degradation after consecutive failures.
  - Rationale: Keep switching flow available during fault windows.

## Risks / Trade-offs

- Risk: Stricter validation may reject legacy dirty data.
  - Mitigation: Normalize missing optional fields; fail-fast only for critical structure errors.
- Risk: Validation and diagnostic extensions add minor performance cost.
  - Mitigation: Keep validation lightweight and limited to critical boundaries.
- Risk: More UI management actions may increase user misoperations.
  - Mitigation: Add confirmation interactions and unit-test coverage for failure branches.

## Migration Plan

1. Use `update-device-fingerprint-hardening` as the single active proposal.
2. Merge historical duplicate proposal content into this proposal (`proposal`/`design`/`tasks`/`spec`).
3. Close and remove duplicate proposal directories.
4. Deliver with unified task checklist and acceptance checklist.

## Open Questions

- Should safe mode exit only by time window, or also allow manual recovery?
- Should diagnostic snapshots be exposed in the renderer as a visual panel?
