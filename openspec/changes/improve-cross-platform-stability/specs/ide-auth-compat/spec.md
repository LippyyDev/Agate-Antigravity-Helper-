## ADDED Requirements
### Requirement: Atomic Injection Writes
The system SHALL use transactions when writing IDE state to ensure atomic updates.

#### Scenario: Injection write consistency
- **WHEN** injecting new/legacy token formats
- **THEN** related keys are committed in a single transaction to avoid partial writes

### Requirement: DB Lock Retry
The system SHALL perform short backoff retries on SQLITE_BUSY or SQLITE_LOCKED.

#### Scenario: Successful DB lock retry
- **WHEN** a write encounters a lock
- **THEN** the system retries for a limited number of attempts and records logs

### Requirement: Version Detection Cache
The system SHALL cache IDE version-detection results in-process to reduce repeated system calls.

#### Scenario: Version cache hit
- **WHEN** IDE version is requested multiple times
- **THEN** the system call is executed only once

### Requirement: Windows Version Detection Fallback
The system SHALL read `package.json` as a fallback source when Windows version detection fails.

#### Scenario: Windows version detection failure
- **WHEN** PowerShell fails to read version
- **THEN** version is obtained by falling back to `package.json`

### Requirement: Strategy-Based Injection
The system SHALL use a strategy pattern to split new/legacy/dual-write injection paths for clearer structure.

#### Scenario: Strategy selection
- **WHEN** version-based and capability-based routing differ
- **THEN** the system selects the corresponding injection implementation via strategy objects

### Requirement: Prefer New Format via Capability Probing
The system SHALL prefer new-format injection when new-format keys are detected.

#### Scenario: New-format key exists
- **WHEN** `antigravityUnifiedStateSync.oauthToken` exists
- **THEN** injection uses new format with higher priority
