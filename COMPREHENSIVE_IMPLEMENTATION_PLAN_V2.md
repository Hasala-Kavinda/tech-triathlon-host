# WayLink comprehensive implementation plan — completion and release recovery

Updated: 2026-10-01  
Repository: `poornamg/hackathon-host`  
Branch baseline: `codex` at `c44aef8`

## 1. Purpose

This plan supersedes the execution order in the original implementation plan without replacing the original architecture decisions. It converts the current partially integrated repository into a reproducible, tested, demo-ready system.

The work is ordered around five facts discovered in the current repository:

1. The source contains most of the online backend workflow.
2. The relocated repository cannot currently run its root build as written.
3. The default Docker seed path and service-date data are inconsistent.
4. Driver and Loader offline requirements are not complete.
5. Automated proof of authorization, transactions, races and end-to-end behavior is still missing.

## 2. Definition of done

WayLink is complete only when all P0 gates below pass from a clean clone:

- dependencies install using documented commands and committed lock files;
- `npm run typecheck`, `npm test` and `npm run build` pass from the repository root;
- `docker compose config` succeeds;
- `docker compose up --build` starts MongoDB, seed, API and all five web applications;
- the reference and approved CSC/demo datasets import repeatedly without duplicate records;
- all four roles complete login through the one-time cross-origin handoff;
- the persisted online story passes from Store order through receipt and histories;
- Driver work survives an offline reload and synchronizes without duplicate domain changes;
- Loader active work survives a same-device refresh and exposes conflicts honestly;
- authorization, transaction, claim-race, PIN and file-access integration tests pass;
- every production-visible core screen uses server data or is explicitly removed from the demo path;
- production origins, secrets and Cloudinary credentials are configured outside source control;
- the release runbook is rehearsed twice against the release candidate.

## 3. Priority definitions

| Priority | Meaning |
|---|---|
| P0 | Required for a truthful judged demonstration and release candidate |
| P1 | Required to complete the approved operational scope |
| P2 | Useful polish that must not delay correctness or verification |

## 4. Current baseline

### Implemented

- Fastify/TypeScript modular backend with 61 HTTP endpoints.
- MongoDB models for users, reference data, orders, trips, loads, deliveries, locations, files, events, idempotency and sync receipts.
- Auth login, one-time handoff, exchange, JWT authentication and role guards.
- Store order, Dispatcher allocation, Loader confirmation and Driver online delivery APIs.
- Cloudinary authenticated upload-signature and completion flow.
- API bridges for the main online workflow in all role applications.
- Basic installable PWA shells for all five applications.
- Dockerfiles, Nginx SPA configuration and a Compose topology.
- Structurally valid outlet, vehicle, calendar and four-row demo product CSVs.

### Not yet release-proven

- clean-clone build and install;
- Docker configuration and full-stack startup;
- deterministic October 2026 data seed;
- official CSC data authenticity;
- transaction behavior on a MongoDB replica set;
- Driver non-location offline replay;
- Driver bootstrap restoration after reload;
- Loader local recovery;
- complete live projections for dashboards, histories and monitoring;
- required integration, browser, offline, security and race tests;
- production deployment and rehearsal.

## 5. Delivery strategy

Work proceeds through seven gates. A later gate may be developed in parallel, but it cannot be marked complete until its dependency gate passes.

```text
Gate 0: repository reproducibility
   ↓
Gate 1: deterministic data and Compose
   ↓
Gate 2: contracts, security and domain rules
   ↓
Gate 3: complete online vertical slice
   ↓
Gate 4: offline recovery and synchronization
   ↓
Gate 5: automated verification and hardening
   ↓
Gate 6: production deployment and demo freeze
```

## 6. Gate 0 — Repository reproducibility

Priority: P0  
Objective: make the relocated repository buildable from its own root.

### REP-01 — Repair root scripts

- Change frontend prefixes from `hackathon-host/<app>` to `<app>`.
- Add explicit scripts for each application:
  - `build:login`;
  - `build:dispatcher`;
  - `build:loader`;
  - `build:driver`;
  - `build:store`.
- Keep aggregate `build`, `test` and `typecheck` commands.
- Add `verify` to run typecheck, tests and builds in order.

Acceptance:

- `npm run build` starts every package from the relocated repository root.
- Failure output identifies the failing package.

### REP-02 — Establish dependency installation

- Use `npm ci` within each package that owns a lock file.
- Add a root bootstrap script that installs backend and all five frontends.
- Do not generate conflicting package-manager locks.
- Record supported Node and npm versions in the root README/package metadata.

Acceptance:

- A clean clone can install dependencies with one documented command.
- Repeated installation does not alter committed lock files.

### REP-03 — Repository hygiene

- Expand `.gitignore` for `.env`, `node_modules`, `dist`, coverage, Playwright output, logs and OS/editor files.
- Move useful Store Manager migration/measurement scripts under a clearly labelled `tools/legacy-ui/` directory or remove obsolete scripts after review.
- Remove `old-App.tsx`, temporary text files and generated artifacts if they are no longer required.
- Add a concise root `README.md` with application map, ports and common commands.

Acceptance:

- `git status --short` stays clean after install, test and build.
- No production package imports legacy helper scripts.

### REP-04 — Environment templates

- Add or correct `.env.example` for Login and Store Manager.
- Add `VITE_USE_MOCK_AUTH=false` explicitly to Login production examples.
- Add `VITE_SERVICE_DATE` where deterministic demo dates are required.
- Document which variables are build-time Vite values and which are API runtime values.

Exit gate:

```powershell
npm run bootstrap
npm run verify
git status --short
```

All commands pass from a clean checkout, with only documented non-blocking bundle warnings.

## 7. Gate 1 — Deterministic data and Docker Compose

Priority: P0  
Objective: start a usable full stack without undocumented manual database edits.

### DATA-01 — Classify and validate product data

- Treat `CSC/products.csv` as an explicit demo fixture while its rows use `DEMO-` identifiers.
- Rename it to an unambiguous name such as `CSC/products.demo.csv`, unless stakeholders approve it as the official input.
- When the official CSC extract arrives, validate and map it without inventing missing planning fields silently.
- Add a CSV preflight command that validates:
  - required headers;
  - unique business keys;
  - numeric ranges;
  - supported brands/order types/temperature classes;
  - outlet and depot references;
  - calendar date continuity;
  - source classification: official or approved demo fixture.

Acceptance:

- Invalid rows produce row-level actionable errors.
- Seed output states the exact source and count for each dataset.

### DATA-02 — Align service dates

- Choose one deterministic demo service date covered by the seed.
- Preferred current choice: `2026-10-01`.
- Ensure the normal demo seed inserts all required days around that date.
- Pass the same date to Store and Dispatcher builds with `VITE_SERVICE_DATE`.
- Keep production behavior based on server time and imported operating calendar; do not hard-code the demo date in production code.

Acceptance:

- Store order creation and Dispatcher validation agree on the same operating date.
- Driver `today` behavior is testable through an injected clock or explicit demo seed policy.

### DATA-03 — Build a deterministic scenario seed

Create a guarded demo seed containing:

- one Dispatcher;
- two Loaders in the same depot for claim-race testing;
- two eligible Drivers;
- two Store Managers at different outlets;
- Fresh, Style and Tech products;
- at least three vehicles representing feasible, temperature/capacity-infeasible and quota-constrained choices;
- submitted and deferred orders;
- one feasible route candidate;
- prior completed deliveries for histories;
- a vehicle with two routes to prove the third-route rejection.

Add a guarded reset command that refuses non-demo database names.

Acceptance:

- Reset and seed are repeatable.
- The demo story starts from the same identifiers every time.

### OPS-01 — Repair Compose

- Default the demo seed to `/csc/products.demo.csv`, or require the value with a clear startup error.
- Remove the nonexistent `./docker/mongo-init` bind mount unless initialization scripts are added.
- Keep replica-set initialization in the one-shot `mongo-init` service.
- Add `VITE_SERVICE_DATE` and `VITE_USE_MOCK_AUTH=false` build arguments where applicable.
- Add missing frontend environment build arguments.
- Ensure seed waits for replica-set readiness, not only Mongo ping.
- Ensure API waits for successful seed completion.
- Keep credentials in `.env`, never Compose source defaults for production.

### OPS-02 — Compose verification

Run on a Docker-capable host:

```powershell
docker compose config
docker compose build
docker compose up -d
docker compose ps
```

Verify:

- Mongo replica set is primary;
- seed exits successfully;
- API readiness is 200;
- five frontend health endpoints are 200;
- Login can call the API through exact CORS rules.

Exit gate:

- A clean `docker compose up --build` produces a usable deterministic environment.
- The full seed report is retained as an artifact.

## 8. Gate 2 — Contracts, authorization and planning correctness

Priority: P0  
Objective: complete rules and secure the APIs before expanding UI behavior.

### API-01 — Machine-readable OpenAPI

- Add request, parameter, response and error schemas to every route.
- Define shared enums and lifecycle states once.
- Include pagination, version, request ID and error envelopes.
- Generate a committed OpenAPI snapshot in CI.
- Add a breaking-contract comparison step.

Acceptance:

- Every public route appears with typed request and response schemas.
- Contract tests validate live responses against the document.

### SEC-01 — Authorization matrix

Add integration tests for:

- no token;
- wrong role;
- wrong Store outlet;
- wrong Loader depot;
- wrong Driver assignment;
- guessed trip, delivery and file IDs;
- inactive users;
- expired and replayed handoff codes.

### SEC-02 — Restrict file access

- Permit the owner to access their uploaded file.
- Permit a Dispatcher only when the file belongs to an in-scope operational record.
- Permit a Loader only for the Loader's depot/claimed load when applicable.
- Permit a Driver only for assigned trips/deliveries.
- Permit a Store Manager only for their outlet delivery.
- Return not-found-style responses where revealing existence would leak information.

### SEC-03 — Login and session cleanup

- Make mock API selection and prototype credential visibility use the same explicit flag.
- Ensure demo credentials never appear in production builds.
- On 401, clear the expired session and redirect to Login without redirect loops.
- Warn before logout when offline mutations are pending.
- Document that stateless logout clears the client token but does not revoke already issued JWTs.

### PLAN-01 — Complete the constraint engine

Add stable rules for:

- vehicle depot equals the route/order depot;
- authoritative cutoff bucket consistency;
- driver active/eligible state;
- route distance/range assumptions;
- stop IDs and sequence consistency;
- outlet window and planned route timing feasibility;
- depot/dock/parking compatibility where the supplied data supports it;
- all existing capacity, temperature, route-count, overlap, fuel and Fresh rules.

Refactor rule evaluation into testable domain functions where possible.

### PLAN-02 — Dispatcher planning inputs

- Replace automatic first-Driver selection with explicit Driver selection or a documented recommendation the user confirms.
- Replace `orderCount × 12 km` with a documented route-distance input or deterministic route estimator.
- Display every failed server rule in the review/publish UI.
- Keep drafts separate from published routes.
- Poll monitor projections with visibility-aware backoff.

Exit gate:

- Authorization tests pass for every protected resource family.
- Every hard planning rule has pass, boundary and fail coverage.
- OpenAPI describes deployed behavior.

## 9. Gate 3 — Complete the online vertical slice

Priority: P0  
Objective: make every screen used in the judge story server-backed and truthful.

### STORE-01 — Store Manager live projections

- Replace mock Home counts with `/store/dashboard`.
- Replace mock Order list/detail/history with server queries.
- Replace mock Delivery list/detail/history with server queries.
- Show tracking freshness from server timestamps.
- Connect full and issue receipt flows.
- Upload receipt issue evidence through the file API.
- Show server cutoff context instead of static countdown text.

### DISPATCH-01 — Dispatcher live projections

- Replace home routes, metrics, remarks and order logs with APIs.
- Connect trip calendar/detail and monitor states.
- Connect remark review and audit CSV download.
- Remove vehicle quota editing unless a real guarded API is implemented.
- Show stale/conflict errors with refresh actions.

### LOAD-01 — Loader workflow completion

- Connect guarded unclaim with reason and version.
- Preserve and display API errors instead of console-only failures.
- Prevent rapid item operations from using stale versions.
- Generate the persisted loading summary PDF or clearly document the client-generated alternative.
- Ensure confirmed records cannot be edited in the UI.

### DRIVER-01 — Driver online completion

- Remove unused legacy route context or migrate any required behavior into the active store.
- Use server route/order/delivery histories.
- Confirm arrival is recorded before Store PIN issuance.
- Ensure wrong PIN retries retain the latest delivery state.
- Surface GPS permission, accuracy and upload-gap states.
- Block trip finish until every server delivery and required evidence is complete.

### ONLINE-E2E-01 — Online judge path

Automate and manually verify:

1. Store Manager logs in and submits an approved product order.
2. Dispatcher selects Driver/vehicle, validates and publishes.
3. Loader claims, loads, reconciles and confirms.
4. Driver claims, confirms vehicle and stores bootstrap data.
5. Driver uploads start evidence and starts.
6. Driver records GPS, arrival and item outcomes.
7. Store Manager issues a PIN.
8. Driver verifies the PIN and completes the stop.
9. Driver uploads end evidence and finishes.
10. Store Manager records full or issue receipt.
11. Histories, monitor and audit show the completed flow.

Exit gate:

- No core demo screen displays sample records while authenticated in live mode.
- The complete online story passes twice from a reset database.

## 10. Gate 4 — Offline recovery and synchronization

Priority: P0 for Driver, P1 for Loader  
Objective: implement the offline behavior promised by the architecture.

### OFF-01 — Driver IndexedDB lifecycle

- Version the database schema and implement additive migrations.
- Persist device ID, server-clock offset, bootstrap version and active screen/stop.
- Add read functions for assignments, trips, stops, orders, mutations, locations, file drafts, histories and receipts.
- Restore the exact active route and stop without a network request after successful bootstrap.
- Mark cached projections with last-sync time.
- Keep sensitive data scoped to the signed-in Driver.

### OFF-02 — Mutation contract

Use canonical operations:

- `trip_start`;
- `stop_arrive`;
- `delivery_items_update`;
- `pin_submission`;
- `stop_complete`;
- `trip_finish`;
- remark/exception operations if included in the demo.

Every mutation must include:

- UUID mutation ID;
- entity type and ID;
- operation;
- base version;
- device-recorded timestamp;
- queue timestamp;
- payload;
- retry count;
- dependency mutation IDs where ordering matters.

### OFF-03 — Server sync domain handlers

- Reuse the same domain services as online endpoints.
- Store one durable receipt for every mutation result.
- Return applied, duplicate, conflict or rejected independently.
- Never treat an unsupported operation as successful.
- Enforce assignment, role and state on replay.
- Make arrival, completion and finish idempotent by mutation ID.

### OFF-04 — Sync worker

- Mount one active sync provider in the real application tree.
- Acquire a single-tab lease.
- Upload evidence blobs before dependent mutations.
- Send mutations in causal order.
- Stop dependent operations after conflict/rejection.
- Retry transient failures with exponential backoff and jitter.
- Preserve conflict/rejection records for an actionable recovery screen.
- Compact acknowledged work only after a safe retention period.

### OFF-05 — Offline PIN policy

- Do not mark PIN proof authoritative until the server verifies it.
- If PIN submission is queued offline, encrypt the sensitive payload locally using Web Crypto and delete it immediately after a terminal sync receipt.
- Never log, display after submission, or include the PIN in analytics.
- If product stakeholders reject queued PIN storage, explicitly require reconnection at proof time and adjust the demo claim accordingly.

### OFF-06 — GPS

- Continue separate bounded location batches.
- Preserve original recorded timestamps and sequence numbers.
- Validate impossible timestamps and very poor accuracy.
- Show queued count, last successful upload and GPS gaps.
- Warn before finish when points are pending according to the agreed policy.

### OFF-07 — Loader same-device recovery

Create Loader stores for:

- claimed job summary;
- manifest/items;
- local exceptions;
- base versions;
- pending mutations;
- last sync result.

Restore after refresh and force explicit reconciliation on stale versions.

Exit gate:

- Driver can bootstrap online, go offline, reload, record work, reconnect and synchronize exactly once.
- Interrupted sync resumes safely.
- Loader refresh restores the active checklist without claiming server confirmation for unsynced changes.

## 11. Gate 5 — Automated verification and hardening

Priority: P0  
Objective: replace implementation claims with repeatable evidence.

### QA-01 — Unit tests

Add tests for:

- all planning rules and boundaries;
- lifecycle transition guards;
- fuel, capacity and volume arithmetic;
- PIN expiry/attempts;
- handoff expiry/replay;
- sync dependency sorting/backoff/result handling;
- API error mapping;
- CSV validation.

### QA-02 — MongoDB replica-set integration tests

Test:

- unique, compound and TTL indexes;
- repeated seed/import;
- idempotent order creation;
- publish commit and forced rollback;
- Loader and Driver parallel claims;
- optimistic concurrency;
- PIN/receipt state guards;
- exactly-once sync replay;
- ownership and file authorization.

### QA-03 — Contract tests

- Validate representative success and error responses against OpenAPI.
- Test pagination, timestamps, versions and request IDs.
- Fail CI on breaking contract drift.

### QA-04 — Playwright tests

Cover:

- all four login handoffs across five origins;
- the full online judge path;
- wrong role and stale version behavior;
- duplicate claim races;
- invalid/expired PIN;
- missing evidence;
- issue receipt;
- histories and monitor completion.

### QA-05 — Offline/PWA tests

- install/reopen all app shells offline;
- Driver reload and replay;
- interrupted sync;
- queued GPS timestamp preservation;
- Loader refresh recovery;
- service-worker upgrade with pending work;
- logout/storage-clear protection.

### QA-06 — Security and resilience

- hostile-origin CORS tests;
- NoSQL injection and oversized input tests;
- token/PIN/secret log scans;
- Cloudinary signature and ownership tests;
- slow network and transient database failure behavior;
- process shutdown during in-flight work;
- performance measurements for list, planning and sync endpoints.

### CI-01 — Continuous integration

On every pull request:

1. install from lock files;
2. CSV preflight;
3. typecheck;
4. unit tests;
5. backend/frontend builds;
6. Compose configuration validation;
7. integration tests on a replica set;
8. contract tests;
9. selected Playwright smoke tests;
10. upload reports and build artifacts.

Exit gate:

- All P0 suites pass on the release commit.
- Known limitations are documented rather than hidden by mocks.

## 12. Gate 6 — Deployment and demo freeze

Priority: P0  
Objective: deploy the verified release candidate without changing behavior manually.

### REL-01 — Production configuration

- MongoDB replica-set/Atlas connection.
- Random production JWT secret.
- Exact HTTPS origins for all five applications.
- Cloudinary credentials and authenticated delivery settings.
- Production CSC/reference source paths.
- `NODE_ENV=production` and mock flags disabled.
- TLS and CSP validation.

### REL-02 — Deployment order

1. Deploy MongoDB.
2. Run transaction/index smoke tests.
3. Deploy API.
4. Run approved reference/user seed.
5. Deploy Login and role applications with exact build-time origins.
6. Run health, CORS and handoff smoke tests.
7. Run online and offline E2E smoke tests.

### REL-03 — Operational readiness

- Retain structured logs with request IDs and redaction.
- Define backup/restore procedure.
- Define rollback to the previous API/frontend version.
- Record seed report and deployed commit SHA.
- Prepare fallback screenshots/video only as presentation insurance.

### REL-04 — Rehearsal

Run twice from a reset demo database:

- all health checks;
- four-role login;
- online judge path;
- deliberate failed planning rule;
- claim conflict;
- Driver offline/reconnect segment;
- PIN and receipt;
- histories, monitoring and audit.

Exit gate:

- Both rehearsals pass without direct database edits.
- Presenter notes state any browser background-GPS limitation honestly.

## 13. Ordered implementation backlog

| Order | ID | Priority | Deliverable | Depends on |
|---:|---|---|---|---|
| 1 | REP-01 | P0 | Correct root scripts | — |
| 2 | REP-02 | P0 | Clean-clone install | REP-01 |
| 3 | REP-03 | P1 | Repository cleanup | REP-01 |
| 4 | REP-04 | P0 | Complete environment templates | REP-01 |
| 5 | DATA-01 | P0 | Validated product/reference inputs | REP-02 |
| 6 | DATA-02 | P0 | One authoritative demo date | DATA-01 |
| 7 | DATA-03 | P0 | Deterministic scenario/reset seed | DATA-02 |
| 8 | OPS-01 | P0 | Repaired Compose | REP-04, DATA-03 |
| 9 | OPS-02 | P0 | Healthy local full stack | OPS-01 |
| 10 | API-01 | P1 | Complete OpenAPI contract | REP-02 |
| 11 | SEC-01 | P0 | Authorization matrix | OPS-02 |
| 12 | SEC-02 | P0 | File ownership authorization | SEC-01 |
| 13 | SEC-03 | P0 | Login/session cleanup | REP-04 |
| 14 | PLAN-01 | P0 | Complete planning rules | DATA-03 |
| 15 | PLAN-02 | P0 | Real planning inputs and errors | PLAN-01 |
| 16 | STORE-01 | P0 | Live Store demo screens | OPS-02 |
| 17 | DISPATCH-01 | P0 | Live Dispatcher demo screens | PLAN-02 |
| 18 | LOAD-01 | P0 | Complete Loader online workflow | OPS-02 |
| 19 | DRIVER-01 | P0 | Complete Driver online workflow | OPS-02 |
| 20 | ONLINE-E2E-01 | P0 | Proven online story | 16–19 |
| 21 | OFF-01 | P0 | Driver restore from IndexedDB | DRIVER-01 |
| 22 | OFF-02 | P0 | Canonical mutation contract | API-01, OFF-01 |
| 23 | OFF-03 | P0 | Server sync handlers | OFF-02 |
| 24 | OFF-04 | P0 | Real sync worker and recovery | OFF-03 |
| 25 | OFF-05 | P0 | Approved offline PIN policy | OFF-02 |
| 26 | OFF-06 | P0 | GPS queue/gap completion | OFF-04 |
| 27 | OFF-07 | P1 | Loader local recovery | LOAD-01 |
| 28 | QA-01 | P0 | Domain unit suite | PLAN-01, OFF-02 |
| 29 | QA-02 | P0 | Mongo integration/race suite | OPS-02 |
| 30 | QA-03 | P1 | OpenAPI contract suite | API-01 |
| 31 | QA-04 | P0 | Browser E2E suite | ONLINE-E2E-01 |
| 32 | QA-05 | P0 | Offline/PWA suite | OFF-04, OFF-07 |
| 33 | QA-06 | P0 | Security/resilience evidence | SEC-01, QA-02 |
| 34 | CI-01 | P0 | Pull-request verification | QA-01–06 |
| 35 | REL-01 | P0 | Production configuration | CI-01 |
| 36 | REL-02 | P0 | Production deployment | REL-01 |
| 37 | REL-03 | P1 | Operations/rollback package | REL-02 |
| 38 | REL-04 | P0 | Two clean rehearsals | REL-02 |

## 14. Parallel work lanes

After Gate 1, work can proceed in four lanes:

| Lane | Focus |
|---|---|
| Backend/domain | OpenAPI, planning rules, authorization, sync handlers, integration tests |
| Store/Dispatcher | Live projections, planning errors, monitor, histories, audit |
| Loader/Driver | Online completion, IndexedDB, sync, GPS, recovery |
| Platform/QA | Compose, CI, Playwright, security, deployment and runbooks |

Contract and state changes must be merged before dependent frontend changes.

## 15. Required evidence per work item

Every completed item must record:

- changed files;
- API/schema/state impact;
- migrations or seed impact;
- commands executed;
- test results;
- remaining limitations;
- rollback approach where state or deployment changed.

“Code exists” is not sufficient evidence for transaction, offline, authorization or deployment completion.

## 16. Immediate first sprint

The first sprint should end with a healthy deterministic Docker environment.

### Sprint tasks

1. Fix root package paths and add bootstrap/verify scripts.
2. Install from lock files and prove all six builds.
3. Correct `.gitignore` and environment examples.
4. Classify the four-product CSV as demo or replace it with official CSC data.
5. Align the October service date across seed, API and frontend builds.
6. Create the deterministic multi-role demo seed.
7. Repair the Compose CSC path and Mongo initialization configuration.
8. Run Compose on a Docker-capable host.
9. Prove health, seed, login handoff and Store order submission.
10. Update `IMPLEMENTATION_STATUS.md` using the collected results.

### Sprint exit criteria

- clean clone installs and builds;
- Compose starts without manual database edits;
- seed output is repeatable;
- all four users can sign in;
- Store Manager can submit one persisted order for the authoritative service date;
- repository status and documentation accurately reflect the verified state.

## 17. Release checklist

### Repository and data

- [ ] Clean-clone bootstrap passes.
- [ ] Root verify command passes.
- [ ] CSV preflight passes.
- [ ] Product source is labelled official or approved demo.
- [ ] Demo reset and seed are deterministic.

### Backend and security

- [ ] OpenAPI matches behavior.
- [ ] Required indexes exist.
- [ ] Publish and confirmation transactions pass rollback tests.
- [ ] Claim races produce one winner.
- [ ] Role/outlet/depot/assignment/file authorization passes.
- [ ] Logs and responses contain no secrets, hashes or PINs.

### Online operations

- [ ] Store order and histories pass.
- [ ] Dispatcher planning/publish/defer/monitor/audit pass.
- [ ] Loader claim/unclaim/load/reconcile/confirm pass.
- [ ] Driver claim/bootstrap/start/GPS/proof/finish pass.
- [ ] Store PIN and full/issue receipt pass.

### Offline and PWA

- [ ] Five shells reopen offline.
- [ ] Driver restores the exact active route after reload.
- [ ] Mutations replay exactly once.
- [ ] Conflicts stop dependent work and are actionable.
- [ ] GPS timestamps and gaps remain honest.
- [ ] Loader checklist recovers on the same device.
- [ ] Pending work is protected during logout/update.

### Deployment

- [ ] Compose config/build/up passes.
- [ ] Production secrets and origins are externalized.
- [ ] Cloudinary upload/download is verified.
- [ ] TLS, CORS and callbacks pass.
- [ ] Online and offline production smoke tests pass.
- [ ] Backup and rollback procedures are recorded.
- [ ] Two demo rehearsals pass from reset state.

## 18. Scope-cut policy

If time is constrained, cut work in this order:

1. animation and visual polish;
2. advanced route recommendations beyond correct feasibility checks;
3. optional editable quota UI;
4. server PDF if a verified client PDF is sufficient;
5. secondary non-demo dashboards.

Do not cut:

- authentication and authorization;
- authoritative dates/cutoffs;
- transaction safety;
- atomic claims;
- Driver offline persistence and replay if it is demonstrated;
- delivery proof;
- auditability;
- release verification.

