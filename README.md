# Petal monorepo

Private, offline pill companion prototype. [PRD](PRD.md) defines the product; [AGENTS.md](AGENTS.md) defines required collaboration rules.

[Team Kanban and Agent Assignments](https://github.com/orgs/DheKode/projects/1)

## Shared domain contracts

`packages/domain` provides PRD entity types and validation, an unsupported guidance stub, offline evidence ID lookup, and complete version-1 backup validation/JSON Schema. Build with `pnpm --filter @petal/domain build` before consuming it. See [domain contracts](docs/domain-contracts.md). The approved evidence corpus is empty pending review; no clinical branches or native app integration are claimed.

## Optional login and encrypted sync

This scaffold implements an Express/Clerk/Turso sync service, a shared client-side encryption package, and a **development UI using fictional notes**. It does not yet implement the native pill-tracking apps or connect their SQLite data to sync.

Use Node.js 22+ and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

Copy each app's `.env.example` to `.env.local` and populate keys locally. Do not commit these files. See [setup and security boundaries](docs/encrypted-sync.md).

```sh
pnpm db:migrate
pnpm dev:sync
# In a second terminal:
pnpm dev:sync-demo
```

The API binds localhost:3001; the development UI uses localhost:5173. Configure the Clerk development app for this origin. Deploy the API behind HTTPS before remote use. No deployment is included here.

## Layout

- `apps/sync-api`: authenticated ciphertext storage; Turso credentials stay here.
- `apps/sync-demo`: optional account and opt-in sync development interface.
- `packages/domain`: shared records, validation, evidence and backup contracts.
- `packages/encrypted-sync`: portable Web Crypto encryption and explicit-action sync client.
- `lib`: standalone utilities not published as workspace packages; shared versioned interfaces belong in `packages`.
- `docs`: decisions and integration contracts.
- `scripts`: maintenance tooling.

Android/desktop adapters must satisfy the documented crypto and secure-storage requirements before claiming cross-device health-record sync works.
