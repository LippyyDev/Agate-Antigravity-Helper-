## 1. Scope and Migration Confirmation
- [x] 1.1 Confirm migration scope (internal DB vs external IDE DB).
- [x] 1.2 Confirm Drizzle driver choice (keep `better-sqlite3`).
- [x] 1.3 Confirm no changes to existing database schema.

## 2. Design and Preparation
- [x] 2.1 Build Drizzle schema (`accounts`/`settings`/`ItemTable`).
- [x] 2.2 Define connection initialization and pragma strategy (WAL, `busy_timeout`).
- [x] 2.3 Define runtime validation strategy (external IDE DB, loose compatibility).

## 3. Implementation
- [x] 3.1 Migrate read/write paths in `cloudHandler.ts`.
- [x] 3.2 Migrate read/write paths in `database/handler.ts`.
- [x] 3.3 Preserve existing transaction and retry semantics.

## 4. Testing and Verification
- [x] 4.1 Update unit tests and mocks.
- [ ] 4.2 Run regression checks for account backup/restore and injection flow.
- [ ] 4.3 Complete cross-platform smoke verification (Win/macOS/Linux).
