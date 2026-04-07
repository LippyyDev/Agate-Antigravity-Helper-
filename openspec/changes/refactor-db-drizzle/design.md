## Context
Current SQLite access mainly relies on native `better-sqlite3` APIs, without unified typing and runtime validation strategy. This raises maintenance cost and regression risk. Introducing Drizzle ORM aims to improve type safety and maintainability while preserving existing behavior and compatibility.

## Goals / Non-Goals
- Goals:
  - Provide structured schema and type inference
  - Unify DB access and validation patterns, reducing `any/as`
  - Preserve WAL, `busy_timeout`, transactions, and compatibility logic
- Non-Goals:
  - Do not change existing database schema
  - Do not introduce a new database engine or remote storage

## Decisions
- Decision: Adopt Drizzle ORM while keeping `better-sqlite3` as the driver.
- Decision: Keep runtime validation and compatibility logic for external IDE DB (`ItemTable`).
- Decision: Migrate in order: internal DB first, external DB second.

## Alternatives Considered
- Continue with `better-sqlite3 + Zod`: limited type-safety gains and higher long-term maintenance cost.
- Prisma: heavyweight footprint and higher Electron integration cost.

## Risks / Trade-offs
- Packaging compatibility risk (Electron + native module ABI): requires cross-platform validation.
- Temporary complexity increase while dual stacks coexist during migration.
- Drizzle provides static typing only; runtime validation is still required to avoid dirty data.

## Migration Plan
1. Define Drizzle schema (`accounts`/`settings`/`ItemTable`).
2. Migrate `cloudHandler.ts` (internal DB).
3. Migrate `database/handler.ts` (external IDE DB).
4. Update unit tests and mocks.
5. Run cross-platform smoke verification.

## Open Questions
- Loose compatibility mode is confirmed; stronger runtime schema is not introduced for now.
