## ADDED Requirements

### Requirement: Complete Device Fingerprint Management Capability

The system SHALL provide complete device-fingerprint management capability: view current storage fingerprint, account-bound fingerprint, history revisions, and baseline fingerprint, and execute generate/capture/bind/restore/delete operations.

#### Scenario: Open device fingerprint management

- **WHEN** an operator opens device fingerprint management for a specific account
- **THEN** the system returns current storage fingerprint, account-bound fingerprint, history revisions, and baseline fingerprint (if present)

#### Scenario: Generate and bind a new fingerprint

- **WHEN** the operator confirms "Generate and Bind"
- **THEN** the system generates a valid new fingerprint and binds it to the target account
- **AND** the new revision is appended to history and marked as current

#### Scenario: Capture current and bind

- **WHEN** the operator confirms "Capture Current and Bind"
- **THEN** the system reads the current storage fingerprint and binds it to the target account
- **AND** a new revision is appended to history

### Requirement: Switch Flow Must Apply Account-Bound Fingerprint

The system SHALL ensure the target account has a valid bound fingerprint before continuing switch flow for both local-account and cloud-account switching.

#### Scenario: Target account has no bound fingerprint during switching

- **GIVEN** the target account exists and has no bound fingerprint
- **WHEN** account switching is initiated
- **THEN** the system automatically generates and binds a usable fingerprint
- **AND** then continues with the switch flow

#### Scenario: Concurrent switch requests

- **WHEN** multiple switch requests are triggered while a switch is in progress
- **THEN** requests are queued and processed serially
- **AND** no concurrent write conflicts occur

### Requirement: Fingerprint Apply Must Preserve Storage Consistency

The system SHALL update `storage.json` and `state.vscdb` in sync when applying device fingerprint, and SHALL ensure `storage.serviceMachineId` equals `devDeviceId`.

#### Scenario: Normal fingerprint apply

- **WHEN** the system applies a device fingerprint
- **THEN** telemetry fields in `storage.json` are updated
- **AND** `storage.serviceMachineId` is updated to `devDeviceId`
- **AND** `ItemTable['storage.serviceMachineId']` in `state.vscdb` is updated accordingly

### Requirement: Device Fingerprint Apply Uses Two-Phase Protocol

The system SHALL execute device-fingerprint apply with a two-phase protocol (`prepare -> verify -> commit`), and SHALL perform deterministic rollback when failure occurs before commit.

#### Scenario: Failure during verify phase

- **WHEN** prepare writes succeed but verify detects inconsistent state
- **THEN** the system rolls back to pre-apply state
- **AND** returns a classifiable failure reason

#### Scenario: Write failure before commit

- **WHEN** any critical write fails before commit completes
- **THEN** the system performs rollback
- **AND** post-operation state equals pre-operation state

### Requirement: Fingerprint Data Uses Versioned Structure and Boundary Validation

The system SHALL use explicit schema versions for fingerprint and history data, and SHALL validate at read/write boundaries.

#### Scenario: Missing optional fields

- **WHEN** history payload lacks optional fields
- **THEN** the system fills default values and continues

#### Scenario: Critical structure corruption or type mismatch

- **WHEN** payload has critical structure corruption or critical field type mismatch
- **THEN** the system fails fast and returns a readable error

### Requirement: Consecutive Failures Trigger Safe Degradation

The system SHALL enter safe mode when consecutive device-fingerprint apply failures reach a threshold, temporarily disable fingerprint apply, keep switching available, and emit warnings.

#### Scenario: Consecutive-failure threshold reached

- **WHEN** consecutive failures reach the threshold
- **THEN** safe mode is activated and fingerprint apply is temporarily disabled
- **AND** switch flow remains available under warning conditions

### Requirement: Provide Observable Diagnostic Snapshot

The system SHALL expose a read-only diagnostics interface returning switch-guard state, switch counters, failure-reason counters, latest failure metadata, and safe-mode state.

#### Scenario: Query diagnostics after failures

- **WHEN** diagnostics are queried after one or more failures
- **THEN** reason-classified failure counters are returned
- **AND** latest failure details and safe-mode state are returned

### Requirement: Path Resolution Scope Constraint

The system SHALL use default runtime configuration paths for path resolution in this capability.

#### Scenario: Use default runtime configuration paths

- **WHEN** the system performs device-fingerprint-related path resolution
- **THEN** resolution is completed based on default runtime configuration paths
