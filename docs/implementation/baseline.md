# Backend implementation baseline

Phase: `AUDIT-01`  
Recorded: 2026-10-02 (Asia/Colombo)  
Evidence level: CODE  
Baseline branch: `backend_foundation`  
Baseline commit: `2deee4c54312dec269f577cfc6474747d167b747`

## Scope and evidence boundary

This document records the repository before implementation phases change application behavior. Counts describe source presence, not feature completeness. The successful verification below proves compilation and the existing unit/HTTP-foundation tests only. It does not prove MongoDB behavior, transactions, authorization boundaries, end-to-end role workflows, offline replay, or deployment readiness.

The checkout was clean before this file was created. `backend_foundation` is two commits ahead of local `codex_2`; its merge base with `codex_2` is `f0b065b921fcbcc2c8ba0ded5d913ed79295e020`. No upstream is configured for `backend_foundation`.

## Toolchain and package inventory

| Item | Baseline value |
|---|---|
| Node.js | `v24.13.0` |
| npm | `11.6.2` |
| Root package | `waylink-system@1.0.0` |
| Package manager policy | `npm@11.6.2`; Node `>=24`; npm `>=11` |
| Tracked files | 455 before this document |
| Package roots | root, `backend`, `Login`, `dispatcher`, `loader`, `delivery-driver`, `Store-Manager` |
| Package lockfiles | 6, one `package-lock.json` in each application package; no root lockfile |

Tracked lockfiles:

- `backend/package-lock.json`
- `Login/package-lock.json`
- `dispatcher/package-lock.json`
- `loader/package-lock.json`
- `delivery-driver/package-lock.json`
- `Store-Manager/package-lock.json`

### Root scripts

| Script | Current command/purpose |
|---|---|
| `bootstrap` | Runs clean npm installs for the backend and five frontends |
| `build` | Builds the backend, then all five frontends |
| `build:backend` | Builds `backend` |
| `build:frontends` | Builds Login, Dispatcher, Loader, Driver, and Store Manager |
| `build:login` | Builds `Login` |
| `build:dispatcher` | Builds `dispatcher` |
| `build:loader` | Builds `loader` |
| `build:driver` | Builds `delivery-driver` |
| `build:store` | Builds `Store-Manager` |
| `data:preflight` | Runs the backend reference-data preflight |
| `test` | Runs backend Vitest tests |
| `typecheck` | Runs backend TypeScript checking |
| `verify` | Runs typecheck, tests, backend build, and all frontend builds |

The root also exposes six package-specific `bootstrap:*` scripts. Script counts by application are: backend 11, Login 4, Dispatcher 4, Loader 4, Driver 3, and Store Manager 4.

## Backend source inventory

### HTTP routes

Static search for direct `app.get/post/put/patch/delete` registrations finds 64 routes.

| Method | Count |
|---|---:|
| GET | 29 |
| POST | 29 |
| PATCH | 5 |
| PUT | 1 |
| DELETE | 0 |
| **Total** | **64** |

These include liveness, readiness, and OpenAPI routes plus Auth, Reference, Orders, Planning, Loading, Driver, Files, and Operations routes. This is a registration count only; it does not claim that request/response schemas, ownership checks, state transitions, or consumers are complete.

### Persistence models

Fifteen Mongoose models are exported from the single current file `backend/src/database/models/index.ts`:

1. User
2. AuthHandoff
3. Outlet
4. Vehicle
5. CalendarDay
6. Product
7. Order
8. Trip
9. LoadRecord
10. DeliveryRecord
11. TripLocation
12. OperationalEvent
13. FileAsset
14. IdempotencyRecord
15. SyncReceipt

The file contains 21 explicit `.index(...)` declarations. Index presence was counted statically; index creation, drift, uniqueness behavior, and replica-set semantics were not exercised in this phase.

### Existing automated tests

| Test file | Tests observed |
|---|---:|
| `backend/src/app.test.ts` | 2 |
| `backend/src/common/crypto.test.ts` | 2 |
| `backend/src/common/time.test.ts` | 4 |
| `backend/src/config/env.test.ts` | 3 |
| `backend/src/database/seed/preflight.test.ts` | 2 |
| **Total** | **13** |

The suite has no baseline database integration, transaction, concurrency, authorization-matrix, contract-compatibility, browser E2E, or offline replay tests.

## Docker Compose topology

`docker compose config --quiet` succeeds. The normalized topology contains nine services and one named volume.

| Service | Source | Published port | Dependency gate |
|---|---|---:|---|
| `mongo` | `mongo:8.0.14` | 27017 | none |
| `mongo-init` | `mongo:8.0.14` | none | healthy `mongo` |
| `seed` | `backend/Dockerfile` | none | successful `mongo-init` |
| `api` | `backend/Dockerfile` | 3000 | successful `seed` |
| `login-web` | `docker/frontend.Dockerfile` | 5173 | none |
| `dispatcher-web` | `docker/frontend.Dockerfile` | 5174 | none |
| `loader-web` | `docker/frontend.Dockerfile` | 5175 | none |
| `driver-web` | `docker/frontend.Dockerfile` | 5176 | none |
| `store-manager-web` | `docker/frontend.Dockerfile` | 5177 | none |

Named volume: `mongo-data`.

Compose validation emitted a host-only warning that `C:\Users\HP\.docker\config.json` could not be read due to access denial. Configuration still returned exit code 0. No `docker compose up`, seed run, container health, replica-set transaction, or HTTP smoke test was executed for this commit during AUDIT-01, so none is claimed as current runtime evidence.

## Validation results

Commands were run from the repository root without source changes.

| Command | Result | Evidence |
|---|---|---|
| `git status --short` | Clean before baseline creation | exact tree state |
| `git rev-parse HEAD` | `2deee4c54312dec269f577cfc6474747d167b747` | exact baseline commit |
| `npm run verify` | PASS, exit 0 | backend typecheck; 5 test files/13 tests; backend and five frontend builds |
| `docker compose config --quiet` | PASS, exit 0 with local credential-file warning | Compose syntax/interpolation only |

Build warnings retained as baseline facts:

- Login, Dispatcher, Loader, and Store Manager Vite configurations use `__dirname` and a JSON import pattern that Vite warns will be incompatible with a future native config loader default.
- Loader emits a chunk-size warning because at least one minified chunk exceeds 500 kB.
- These warnings do not fail the current build and were not modified in this audit phase.

## Named baseline work items and blockers

| ID | Finding | Required owning phase/disposition |
|---|---|---|
| BL-01 | `INCREMENTAL_BACKEND_IMPLEMENTATION_ROADMAP.md` declares `SYSTEM_REQUIREMENTS_AND_ARCHITECTURE.md` and `COMPREHENSIVE_BACKEND_PARALLEL_IMPLEMENTATION_PLAN.md` authoritative, but both are absent at this commit. Git history shows they were deleted on this branch. | Resolve decision D1 and restore/approve the intended authoritative revisions before AUDIT-02 is approved or disputed design work proceeds. |
| BL-02 | 64 direct HTTP registrations are covered by only two HTTP-foundation tests; route behavior and ownership are not comprehensively characterized. | AUDIT-02 route/model map and non-invasive characterization tests. |
| BL-03 | All 15 persistence models remain in one shared model file. | DB phases must split ownership without changing behavior prematurely. |
| BL-04 | No current-commit database runtime or E2E evidence was produced in AUDIT-01. | INFRA/DATA gates and later integration checkpoints must create repeatable runtime proof. |
| BL-05 | Docker CLI cannot read the current user's Docker config file in this execution environment. | Environment/operator follow-up; not a Compose-source failure. |
| BL-06 | Vite future-compatibility and Loader bundle-size warnings remain. | Frontend/tooling work after backend foundation priorities unless they become blocking. |
| BL-07 | The OpenAPI endpoint exists, but schema completeness and generated-client compatibility are unverified. | CONTRACT-06. |
| BL-08 | Existing route/model source presence must not be interpreted as completion of ownership, transition, security, transaction, or offline requirements. | Preserve this evidence boundary in every downstream phase. |

## Phase acceptance

- [x] Exact SHA and branch recorded.
- [x] Initial tree status recorded as clean.
- [x] Scripts, package roots, package locks, routes, models, indexes, tests, and Compose topology inventoried.
- [x] Existing repository verification executed without behavior changes.
- [x] Pass/fail results and build warnings recorded.
- [x] Runtime and E2E claims explicitly marked unverified.
- [x] Baseline failures and ambiguities converted into named work items.

AUDIT-01 is complete at CODE evidence once this document is reviewed and committed. AUDIT-02 must not silently resolve BL-01 or any roadmap decision.
