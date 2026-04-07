## Context

The stability of account injection and detection differs across platforms, with risks concentrated in:
- DB lock conflicts causing unstable writes.
- Version-detection failures causing incorrect injection-path routing.
- Compatibility boundaries introduced by OS behavior differences.

## Goals / Non-Goals

- Goals:
  - Improve cross-platform write and switching stability.
  - Define clear priority between version detection and capability probing.
  - Improve observability and troubleshooting efficiency.
- Non-Goals:
  - Extend support to non-default runtime configuration path parsing.
  - Introduce new business strategies.

## Decisions

- Decision: Transactionalize the write flow to reduce partial-success risk.
- Decision: Add DB busy retry and `busy_timeout`.
- Decision: On version-detection failure, use `package.json` as Windows fallback source.
- Decision: Give capability probing higher priority than version detection; prefer new format when a new-format key is detected.

## Risks / Trade-offs

- A stricter write flow may add minor latency.
- Running capability probing and version detection together increases implementation complexity.

## Migration Plan

1. Complete transactional writes and retry mechanisms.
2. Add version-detection cache and fallback.
3. Introduce strategy-based injection and capability probing.
4. Add corresponding tests and regression verification.
