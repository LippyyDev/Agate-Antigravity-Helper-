## ADDED Requirements
### Requirement: New-Format Injection for 1.16.5+
The system SHALL write only the new format `antigravityUnifiedStateSync.oauthToken` when IDE version is >= 1.16.5.

#### Scenario: New-version injection
- **WHEN** IDE version is 1.16.5 or above
- **THEN** the system writes the new format and completes account switching

### Requirement: Legacy Injection for Older Versions
The system SHALL write only the legacy format `jetskiStateSync.agentManagerInitState` when IDE version is < 1.16.5.

#### Scenario: Legacy-version injection
- **WHEN** IDE version is below 1.16.5
- **THEN** the system writes the legacy format and completes account switching

### Requirement: Dual-Write Fallback on Version Detection Failure
The system SHALL attempt both new and legacy format injection when IDE version cannot be detected.

#### Scenario: Version detection fails
- **WHEN** the system cannot read IDE version
- **THEN** the system writes both new and legacy formats and must not abort due to one path failing

### Requirement: Account Detection via New Format
The system SHALL read OAuth token from the new format and complete account detection.

#### Scenario: Only new format exists
- **WHEN** IDE database contains only the new-format key
- **THEN** the system still recognizes accounts and completes synchronization

### Requirement: Backup/Restore Includes New-Format Keys
The system SHALL include new-format keys in account backup and restore.

#### Scenario: Backup and restore for new format
- **WHEN** users perform backup and restore
- **THEN** new-format keys are fully saved and restored
