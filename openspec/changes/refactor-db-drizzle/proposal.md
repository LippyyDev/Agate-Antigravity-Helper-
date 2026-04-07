# Change: Refactor SQLite Access with Drizzle ORM

## Why

Current `better-sqlite3` usage relies heavily on `any/as`, lacks unified typing and runtime validation, and increases long-term maintenance cost. Introducing Drizzle ORM provides structured schema definitions and more consistent type constraints.

## What Changes

- Introduce Drizzle ORM and define schema for the internal database.
- Incrementally migrate read/write paths in `cloudHandler` and `database/handler`.
- Preserve existing WAL, `busy_timeout`, and transaction behavior to avoid regressions.
- Keep runtime validation and compatibility logic for the external IDE DB (`ItemTable`).

## Impact

- Affected code: `src/ipc/database/cloudHandler.ts`, `src/ipc/database/handler.ts`, tests, and DB utility layer
- Affected behavior: data-access typing and runtime validation approach changes (regression validation required)
