## ADDED Requirements
### Requirement: Use Drizzle ORM for Internal Database
The system SHALL use Drizzle ORM to access the internal database (`cloud_accounts.db`) and provide type constraints through schema.

#### Scenario: Read cloud account list
- **WHEN** the system reads the `accounts` table
- **THEN** returned data SHALL match Drizzle schema types

### Requirement: Keep Compatibility and Validation for External IDE Database
The system SHALL preserve compatibility logic and runtime validation when accessing the external IDE database (`ItemTable`).

#### Scenario: Read ItemTable key
- **WHEN** reading a specific key from `ItemTable`
- **THEN** data that fails validation SHALL be logged as warning and skipped

### Requirement: Maintain Database Connection Stability
The system SHALL preserve existing WAL, `busy_timeout`, and transaction strategies to avoid migration regressions.

#### Scenario: Transactional write consistency
- **WHEN** executing write operations
- **THEN** related updates SHALL be committed within the same transaction
