# WayLink Comprehensive Implementation Plan

**Status:** Build-ready plan; no implementation is performed by this document  
**Architecture source of truth:** `SYSTEM_REQUIREMENTS_AND_ARCHITECTURE.md`  
**Target deadline:** October 4 at 23:59 Asia/Colombo, if the hackathon deadline in the approved brief still applies  
**Execution style:** Vertical slices, contract-first APIs, incremental verification, and deployable checkpoints

---

## 1. Purpose

This plan turns the approved system requirements and architecture into an ordered implementation backlog. It covers the Fastify/MongoDB backend, the five existing Vite/React frontends, authentication across separate origins, offline-first Driver and Loader behavior, PWA integration, Docker, deployment, testing, demo data, and release gates.

The architecture document remains authoritative. If implementation reveals a conflict, record the proposed change as an ADR and update the architecture before changing behavior.

## 2. Definition of done

The system is complete when all of the following are true:

- One shared Login accepts employee ID, password, and the recorded email.
- A one-use handoff code safely opens the correct role application without putting a bearer token in a URL.
- Dispatcher, Loader, Driver, and Store Manager authorization is enforced on the server.
- Store Managers create orders from the CSC catalogue and can view persistent Order History and Delivery History.
- The 16:00 Asia/Colombo order cutoff is calculated by the server and displayed consistently.
- Dispatchers can draft, validate, publish, defer, and monitor trips with explainable constraint results.
- The maximum of two routes per operating day is enforced per vehicle, not per driver.
- Loaders can claim atomically, unclaim only before loading starts, account for every item, and confirm the load.
- Drivers can claim and confirm a vehicle online, download the complete manifest, execute an active trip offline, and synchronize idempotently.
- Active-trip GPS capture is mandatory, with visible degraded/gap states and honest browser background limitations.
- Fresh deliveries are validated against the earlier of 08:00 and the outlet delivery-window close.
- PIN proof, receipt confirmation, issue reporting, image evidence, and histories persist across sessions.
- All five frontends are installable PWAs with role-appropriate graceful degradation.
- MongoDB, seed, API, and five Nginx frontend services run through Docker Compose.
- Production deployments pass health, security, contract, integration, offline, and end-to-end smoke tests.
- Demo accounts and a deterministic end-to-end scenario are documented and repeatable.

## 3. Scope boundaries

### In scope

- Fastify + TypeScript + Mongoose REST API under `/api/v1`.
- MongoDB persistence, indexes, transactions, and idempotent seed/import tooling.
- Existing Login, Dispatcher, Loader, Driver, and Store Manager applications.
- JWT access sessions plus one-time cross-origin handoff codes.
- Cloudinary-style direct uploads through signed server authorization.
- Polling for connected updates and batched GPS upload.
- IndexedDB offline data and mutation queues for Driver; local device memory for Loader.
- OpenAPI documentation, tests, structured logs, Docker, and deployment configuration.

### Explicitly out of scope

- Forgot-password, login OTP, OTP resend, or change-OTP features.
- Cash collection, cash-in-season, payment processing, or customer accounts.
- Silent editing of official fleet quotas without an audited override endpoint.
- Guaranteed continuous GPS reporting while a browser/PWA is suspended or the device has no connectivity.
- Device-to-device transfer of unsynchronized Driver work.
- Native mobile applications, advanced route optimization, or a production message broker.

## 4. Non-negotiable implementation decisions

| Area | Decision |
|---|---|
| Package layout | Keep the five current frontend packages independent. Add a separate `backend/`; do not spend hackathon time migrating to a monorepo package manager. |
| Time | Store instants in UTC. Calculate operating dates, the 16:00 cutoff, and before-08:00 rules in `Asia/Colombo`. |
| Products | The supplied CSC data is the product source of truth. Seeded fallback products must never silently replace it. |
| Auth redirect | Redirect with a random, hashed, one-use, 60-second handoff code only. Exchange it for the access token at the destination origin. |
| Server authority | The server owns roles, ownership, statuses, deadlines, totals, allocation rules, and valid state transitions. |
| Concurrency | Use resource versions, `If-Match`, atomic compare-and-set claims, idempotency keys, and transactions where multiple records change. |
| Driver offline | Online claim, vehicle confirmation, and bootstrap are required before offline execution. IndexedDB holds the complete active-trip working set. |
| Loader offline | IndexedDB may preserve a device's working memory, but server claim and final confirmation remain authoritative. |
| PWA | Each frontend has its own manifest/service worker. Static assets may be cached; authenticated API responses must not be put in a shared HTTP cache. |
| Deployment | Local parity uses Docker Compose. Production may use Vercel frontends, Render API, Atlas, and Cloudinary, with the same environment contract. |

## 5. Required preflight decisions

Complete these before feature coding. Any unresolved item gets a named owner and a deadline; it must not be hidden in application code.

| ID | Decision/evidence required | Output |
|---|---|---|
| PF-01 | Locate the official CSC file, confirm format, columns, units, brands, order types, weight/volume/temperature fields, and stable product key. | Checked-in schema note plus import fixture path. |
| PF-02 | Confirm official outlet names, codes, depots, delivery windows, coordinates, and brand ownership. | Validated outlet import file. |
| PF-03 | Confirm vehicle IDs, depot, type, capacities, temperature capability, fuel quota, `kmPerL`, and availability. | Validated fleet import file. |
| PF-04 | Confirm demonstration operating date and whether weekend/holiday rules apply. | Demo clock/date configuration. |
| PF-05 | Define employee IDs, recorded emails, temporary demo passwords, roles, and Store Manager outlet assignments. | Non-production seed credentials sheet. |
| PF-06 | Confirm production URLs for all five origins and API, including exact HTTPS schemes. | CORS and redirect allowlist. |
| PF-07 | Confirm Atlas transaction support on the selected cluster and deployment region. | Transaction smoke-test result. |
| PF-08 | Confirm image provider account, upload limits, allowed MIME types, and retention expectations. | File environment variables and policy. |
| PF-09 | Decide whether vehicle quota editing is removed for the demo or implemented as an audited override. | UI/API scope decision. |
| PF-10 | Freeze API error codes, status enums, and the OpenAPI contract before frontend integration. | Versioned OpenAPI baseline. |

Preflight exit criteria:

- No mock identifier is assumed to be an official code without a mapping.
- Required secrets are represented in `.env.example`, never committed as values.
- Every external origin is present in an exact allowlist; wildcard credentialed CORS is prohibited.
- CSC and reference imports fail loudly on missing required columns or invalid units.

## 6. Delivery strategy and dependency graph

```text
Preflight and contract freeze
        |
Backend foundation + database models + deterministic seed
        |
Authentication/handoff + shared frontend session client
        |
Store order slice ---> Dispatcher planning/publish ---> Loader execution
                              |                           |
                              +---------------------------+
                                          |
                           Driver bootstrap/offline execution
                                          |
                    PIN, receipt, histories, tracking, audit
                                          |
                   PWA hardening + Docker + production deploy
                                          |
                         End-to-end rehearsal and release
```

Build one usable vertical path early:

```text
Login -> create order -> publish trip -> claim/load -> claim/drive
      -> arrive/PIN/complete -> manager receipt -> histories
```

Do not build all database models, then all routes, then all screens in isolation. Each slice must include persistence, authorization, API contract, frontend integration, tests, and observability.

## 7. Target repository additions

The implementation should converge on this structure without moving the existing frontend source trees unnecessarily:

```text
backend/
  src/
    app.ts
    server.ts
    config/
    plugins/
    common/
      auth/
      errors/
      idempotency/
      logging/
      time/
      validation/
    modules/
      auth/
      users/
      reference/
      catalogue/
      orders/
      planning/
      trips/
      loading/
      deliveries/
      tracking/
      files/
      sync/
      audit/
    database/
      models/
      indexes/
      seed/
      migrations/
    tests/
      unit/
      integration/
      contract/
  Dockerfile
  package.json
  tsconfig.json
  vitest.config.ts
  .env.example
docker/
  nginx/
  mongo-init/
docker-compose.yml
.env.example
docs/
  openapi.json
  demo-runbook.md
  deployment-runbook.md
  data-dictionary.md
```

Each frontend should gain equivalent integration boundaries:

```text
src/api/client.ts
src/api/contracts.ts
src/auth/session.ts
src/auth/AuthProvider.tsx
src/routes/AuthCallback.tsx
src/offline/              # only role-specific content
src/pwa/
public/manifest.webmanifest
public/icons/
.env.example
Dockerfile
nginx.conf
```

Prefer generated or shared OpenAPI types where practical, but do not introduce a workspace migration solely for type sharing. A generated contract file can be copied into each app by a documented script.

## 8. Workstream ownership model

Assign one accountable owner per workstream even if one person covers several roles.

| Workstream | Accountable for | Required coordination |
|---|---|---|
| Architecture/API | Contract, state machines, error codes, ADRs | All workstreams |
| Backend platform | App bootstrap, plugins, auth primitives, observability | API, DevOps |
| Data/domain | Models, indexes, imports, seeds, allocation rules | Backend, Dispatcher |
| Store/Login frontend | Auth callback, catalogue, ordering, histories | Backend API |
| Dispatcher frontend | Planning, validation, monitoring, audit | Domain, tracking |
| Loader frontend | Claim state, loading workflow, reconciliation | Domain, offline |
| Driver frontend | Bootstrap, IndexedDB, sync, GPS, proof | Backend, Store |
| QA/release | Test matrix, demo rehearsal, release checklist | Everyone |
| DevOps | Compose, environments, health checks, deployment | Backend, frontend owners |

Daily integration rule: merge or integrate a working vertical increment at least twice per day. Avoid long-lived feature branches that redefine the same contracts independently.

## 9. Phase 0 — Contract freeze and implementation baseline

### Tasks

1. Record current build commands and run a clean build for all five frontends.
2. Inventory every mock service, hard-coded account, localStorage key, fake timeout, generated ID, and static role route.
3. Convert architecture endpoint tables to an OpenAPI 3.1 skeleton containing:
   - request/response schemas;
   - auth requirements and role annotations;
   - status and domain error codes;
   - pagination shape;
   - idempotency and `If-Match` headers;
   - example payloads for every vertical slice.
4. Freeze enums for roles, order types, statuses, trip states, load states, delivery outcomes, event types, and file kinds.
5. Draw explicit state-transition tables for Order, Trip, LoadRecord, and DeliveryRecord.
6. Add an ADR for separate frontend packages and the chosen offline/PWA libraries.
7. Create a traceability table linking every architecture requirement to at least one backlog item and test.

### Recommended library decisions

- Fastify, TypeScript, Mongoose, Zod or TypeBox for validation, `@fastify/swagger`, `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`, Pino, Argon2, and a JWT library.
- Vitest for unit/integration tests and Playwright for cross-app end-to-end tests.
- `vite-plugin-pwa`/Workbox for frontend service workers.
- Dexie for Driver and Loader IndexedDB access.
- Luxon or date-fns-tz for explicit `Asia/Colombo` calculations.

Use one validation schema as the runtime source for route validation and OpenAPI generation when possible. Pin dependency versions after the first green build.

### Exit criteria

- All existing frontend builds are green or existing failures are documented.
- The OpenAPI skeleton validates.
- State machines and error codes have no contradictions with the architecture.
- Preflight blockers are visible and assigned.

## 10. Phase 1 — Backend foundation

### Tasks

1. Scaffold `backend/` with strict TypeScript and separate `build`, `start`, `dev`, `lint`, `typecheck`, `test`, and `seed` scripts.
2. Implement environment parsing that terminates startup on missing or malformed required values.
3. Build `createApp()` separately from `server.ts` so integration tests can inject requests without binding a port.
4. Register plugins in a deterministic order:
   - request ID and logger context;
   - security headers and body limits;
   - exact-origin CORS;
   - authentication parsing;
   - rate limiting;
   - OpenAPI/docs;
   - centralized error mapping;
   - routes.
5. Implement `/health/live` and `/health/ready`; readiness must check MongoDB and essential configuration without exposing secrets.
6. Define a common success/error envelope and typed domain errors.
7. Add graceful shutdown for HTTP and MongoDB connections.
8. Redact passwords, tokens, handoff codes, PINs, upload signatures, and authorization headers from logs.
9. Add API versioning and a startup log containing version, environment, port, and sanitized dependency status.

### Acceptance criteria

- Invalid configuration prevents startup with a useful key-level error.
- Every response contains a `requestId`.
- Unknown routes and unexpected exceptions use the standard error envelope.
- Logs correlate request, authenticated user ID, role, entity IDs, and outcome without leaking secrets.
- Liveness remains successful during a transient database fault; readiness becomes unsuccessful.

### Verification

```powershell
npm --prefix backend run typecheck
npm --prefix backend run test
npm --prefix backend run build
curl.exe http://localhost:3000/health/live
curl.exe http://localhost:3000/health/ready
```

## 11. Phase 2 — MongoDB schema, indexes, import, and seed

### Model order

Implement models in dependency order:

1. `users`, `outlets`, `vehicles`, and `products`.
2. `orders` with embedded item snapshots and status history.
3. `trips` with ordered stops, route metrics, and saved constraint results.
4. `load_records` and `delivery_records`.
5. `auth_handoffs`, `trip_locations`, `file_assets`, and `operational_events`.
6. Idempotency/sync receipt persistence if it is not represented inside operational events.

### Required data safeguards

- Unique indexes for employee ID, normalized email where policy requires uniqueness, outlet code, vehicle code, and product source key.
- TTL indexes for expired auth handoffs and any short-lived challenge material.
- Compound indexes matching planning queue, role histories, active trips, tracking, and audit filters.
- `version` on operational aggregates for optimistic concurrency.
- Immutable snapshots of product description, unit, planning attributes, and price where the order requires historical accuracy.
- Server-generated status history entries and audit events for material transitions.
- Store plaintext delivery PINs nowhere; store a salted hash, expiry, attempt count, and rotation metadata.

### Seed/import behavior

Create distinct commands:

```text
seed:reference  -> validated outlets, vehicles, CSC products
seed:users      -> demo identities and role mappings
seed:demo       -> deterministic orders/trips/history scenario
seed:reset-demo -> explicitly destructive, non-production only
```

All normal seed commands must be idempotent upserts keyed by stable official identifiers. `seed:reset-demo` must refuse to run unless `NODE_ENV` and an explicit confirmation environment flag identify a non-production database.

Import reports must include inserted, updated, unchanged, rejected, and warning counts. Reject duplicate keys, unknown units, impossible capacities, invalid coordinates, and missing planning attributes before partially importing a file.

### Acceptance criteria

- A second seed run produces no duplicates.
- Index creation is verified against a clean database.
- Transactions are proven with an integration test that rolls back a deliberately failed trip publication.
- Historical order items do not change when the product catalogue is re-imported.
- Query plans for the main planning/history filters use the intended indexes.

## 12. Phase 3 — Authentication, authorization, and cross-origin handoff

### Backend tasks

1. Implement password hashing with Argon2 and constant-time verification behavior.
2. `POST /auth/login` validates employee ID, password, and normalized recorded email together.
3. Apply stricter rate limits to login and exchange, returning generic credential failures.
4. Create a cryptographically random handoff code; persist only its hash, intended role/origin, user, expiry, and consumed state.
5. Build the redirect URL exclusively from a server-side role-to-origin allowlist.
6. `POST /auth/exchange` atomically consumes an unexpired, unused code and returns the access token plus user projection.
7. `GET /auth/me`, profile email update, and logout follow the approved contract.
8. Add reusable authorization guards for role, outlet ownership, depot assignment, driver assignment, and entity relationship.
9. Ensure response projections never expose password hashes, PIN hashes, handoff hashes, internal provider secrets, or unrelated user data.

### Frontend tasks

1. Update the shared Login form to require employee ID, password, and email.
2. Remove forgot-password and all login/change OTP links, screens, state, and dead routes.
3. Add `/auth/callback` in all four role applications.
4. Exchange the handoff code immediately, remove it from browser history with `replaceState`, then restore the intended in-app route.
5. Centralize bearer attachment, `401` handling, logout, and current-user restoration in each app.
6. Remove the Driver application's duplicate login path.
7. Gate role routes by the server-returned user role, not by URL or local mock state.

### Security and acceptance tests

- Correct password with wrong email fails identically to other invalid credentials.
- A code can be exchanged once only, expires after 60 seconds, and cannot be exchanged by the wrong destination origin.
- Open redirect attempts fail.
- Tokens never appear in URLs, analytics, logs, or referrers.
- Store Managers cannot access another outlet; Drivers and Loaders cannot claim out-of-scope work.
- Refreshing each role app restores the session or cleanly returns to Login.
- All four callbacks work from their production and local allowlisted origins.

## 13. Phase 4 — Shared frontend integration and PWA foundation

### API integration boundary

For each frontend:

- Create one API client using `VITE_API_BASE_URL`.
- Attach bearer tokens and request IDs consistently.
- Normalize standard API errors into user-safe messages while retaining `requestId` for support.
- Support `Idempotency-Key` and `If-Match` on relevant mutations.
- Replace direct mock imports behind feature-level repositories so mock removal can be incremental.
- Add loading, empty, retryable error, forbidden, conflict, stale-version, and offline states.
- Abort obsolete requests when filters or routes change.

### PWA baseline for all five origins

1. Add a unique application name, short name, scope, start URL, theme, display mode, and icon set per role.
2. Precache only versioned application-shell assets.
3. Use network-first navigation with an offline fallback shell.
4. Do not runtime-cache authenticated API JSON in Workbox; role data belongs in explicitly managed IndexedDB stores.
5. Show a visible update prompt when a new service worker is ready. Never activate a new version in the middle of an unsynchronized Driver trip without warning.
6. Show connectivity and last-successful-sync state in role applications that degrade offline.
7. Clear role IndexedDB and sensitive session state on explicit logout, subject to a guarded warning if unsynchronized Driver mutations exist.

### Exit criteria

- Lighthouse or equivalent recognizes each app as installable over HTTPS/localhost.
- The shell opens without network after one successful visit.
- A service-worker update cannot silently discard an active offline queue.
- No authenticated response is visible across users through a browser cache.

## 14. Phase 5 — Store Manager ordering vertical slice

### Backend tasks

1. Implement CSC-backed catalogue search and filters.
2. Implement the operating calendar endpoint with `serverNow`, `cutoffDeadlineAt`, and `secondsRemaining` calculated in `Asia/Colombo`.
3. Implement order submission with:
   - authenticated outlet ownership;
   - server-side product lookup;
   - positive quantities and supported units;
   - order-type/product compatibility;
   - service-date and operating-day validation;
   - authoritative before/after-16:00 bucket;
   - item snapshots and initial status event;
   - idempotency protection.
4. Implement Store dashboard, own-order list/detail, Order History, upcoming deliveries, Delivery History, and delivery detail projections.
5. Ensure pagination and filters are executed in MongoDB rather than in memory.

### Frontend tasks

1. Replace static catalogue data with `GET /catalog/products`.
2. Use the server calendar response for the countdown; display the server-derived deadline and periodically correct local clock drift.
3. Preserve a local draft order, but revalidate catalogue records and deadline at submission.
4. Disable duplicate submits while retaining the same idempotency key for retries.
5. Replace mock dashboard/history/detail records with APIs and proper empty/error states.
6. Implement installable shell and read-only graceful degradation:
   - show previously stored own orders/deliveries when offline;
   - label cached data and last sync time;
   - do not claim a new order was submitted until the server accepts it.

### Acceptance scenarios

- A submission at 15:59:59 Asia/Colombo receives the before-cutoff bucket; one at or after 16:00:00 follows the approved after-cutoff behavior.
- Changing the browser clock does not change the server result.
- A Store Manager cannot submit for another outlet or an unknown CSC product.
- Retrying the same idempotent request creates one order.
- Order History and Delivery History survive logout, refresh, and a different device.
- Cached offline views are visibly stale and cannot be mistaken for live tracking.

## 15. Phase 6 — Dispatcher planning, allocation, and monitoring

### Constraint engine

Implement a pure, unit-tested domain service that returns every rule result rather than stopping at the first error. At minimum validate:

- service date is an operating day;
- order is submitted/deferred and not allocated to another published trip;
- order cutoff bucket is authoritative;
- vehicle is available at the correct depot;
- vehicle supports order temperature/type requirements;
- capacity weight and volume are not exceeded;
- planned distance is compatible with range assumptions;
- weekly fuel use plus planned consumption remains within quota;
- each vehicle has no more than two routes on the service date;
- the Driver may operate multiple vehicles, subject to schedule overlap and assignment eligibility;
- stop order is explicit and internally consistent;
- Fresh verification completes by `min(outlet.windowClose, 08:00)`;
- route timing is feasible under the documented travel-time assumptions.

Persist `trip.constraintCheck.rules[]` with stable rule codes, pass/fail, measured values, thresholds, and a user-facing explanation. Re-run all hard rules within the publish transaction; never trust an earlier browser validation.

### API and data tasks

1. Build planning queue, reference outlet/vehicle queries, draft creation, edit, validate, publish, deferral, and batch deferral.
2. Publish in a transaction that:
   - verifies the expected trip version;
   - revalidates constraints;
   - allocates every order conditionally;
   - changes trip state;
   - creates the load record/job;
   - emits audit events.
3. Return `409` for stale/claimed/duplicate state and `422` with rule results for domain infeasibility.
4. Build trip calendar/detail, monitor projection, remarks, review, order audit, delivery audit, and CSV export.
5. Implement connected tracking projection using latest valid location and `lastSeenAt`; clearly identify stale or missing positions.

### Dispatcher frontend tasks

1. Replace mock queues, routes, vehicle cards, metrics, maps, and histories feature by feature.
2. Present every failed rule next to the affected trip/order/vehicle.
3. Keep draft editing distinct from published operations.
4. Require an explicit deferral reason and new date.
5. Poll active monitor data with backoff and stop polling on hidden/unmounted views.
6. Show `Live`, `Delayed`, `GPS gap`, `Offline/unknown`, and `Completed` based on server timestamps—not animation.
7. Keep CSV export server-driven and preserve active filters.

### Acceptance scenarios

- Two routes for one vehicle succeed; a third route for that vehicle on the same date fails even if assigned to another driver.
- One driver can use different vehicles when times do not overlap.
- Concurrent publish attempts cannot allocate one order twice.
- A stale draft edit returns a conflict and prompts a refresh rather than overwriting.
- Fresh stop timing after the applicable deadline is rejected with the exact failing rule.
- Weekly quota calculations include already published/completed trips for the correct operating week.

## 16. Phase 7 — Loader claim, offline memory, and reconciliation

### Workflow and API tasks

1. List only depot-scoped load jobs visible to the authenticated Loader.
2. Before claim, show the exact confirmation text:

   > Are you sure you really need to claim this load?

3. Implement claim as an atomic transition from available to claimed. A competing claim receives `409` and refreshes the card.
4. Allow only the claiming Loader to unclaim, and only before loading begins; require a reason and expected version.
5. `start-loading` permanently closes the unclaim path.
6. Load in reverse-stop order and track each expected item as pending, loaded, missing, or damaged.
7. Require quantity and reason validation for exceptions.
8. Reconciliation must account for every expected quantity before confirmation.
9. Confirmation locks the load record, updates the trip, and exposes it to the assigned Driver.
10. Generate or serve the loading summary PDF from persisted data.

### IndexedDB tasks

Use a small Loader database containing job summary, manifest, local item edits, local exceptions, base version, claim identity, and last sync state. The UI may recover an interrupted device session, but it must display when local state has not reached the server.

Suggested stores:

```text
loaderJobs        key: tripId
loaderItems       key: [tripId, itemId]
loaderMutations   key: clientMutationId
loaderMeta        key: key
```

Do not advertise cross-device recovery for unsynchronized edits. Server state wins on another device, and conflicts require an explicit reconciliation screen.

### Acceptance scenarios

- Two Loaders clicking claim simultaneously yield one owner.
- The owner can unclaim before `start-loading`; nobody can unclaim afterward.
- Refresh/offline restores the last local checklist on the same browser.
- Confirmation fails until all quantities are loaded or explained by an exception.
- A stale local edit does not silently overwrite a newer server version.

## 17. Phase 8 — Driver online bootstrap and offline-first execution

Treat this as two explicit stages.

### Stage A: online eligibility, claim, vehicle confirmation, bootstrap

1. List only assigned, load-confirmed routes.
2. Before claim, use the same exact confirmation text:

   > Are you sure you really need to claim this load?

3. Claim atomically and allow guarded unclaim only before trip start.
4. Confirm the actual assigned vehicle online and revalidate eligibility/state.
5. Download one versioned bootstrap payload containing:
   - trip and assignment;
   - vehicle and route metadata;
   - ordered stops and coordinates;
   - order/item snapshots;
   - delivery windows and Fresh deadlines;
   - proof requirements and current versions;
   - relevant local history projection;
   - server time and bootstrap version.
6. Commit the complete payload to IndexedDB in one transaction, then mark it offline-ready.
7. Prevent trip start until required bootstrap data and start-meter evidence are available.

### Stage B: offline execution

Suggested Driver IndexedDB schema:

| Store | Key | Purpose |
|---|---|---|
| `driverMeta` | `key` | Device ID, schema version, last sync, server clock offset |
| `assignments` | `tripId` | Claim, vehicle confirmation, base version |
| `trips` | `tripId` | Active trip and lifecycle state |
| `stops` | `[tripId, stopId]` | Ordered route stops and delivery state |
| `orders` | `orderId` | Immutable order/item snapshots |
| `mutations` | `clientMutationId` | Ordered offline operation queue |
| `locations` | `[tripId, sequence]` | Timestamped GPS points awaiting upload |
| `fileDrafts` | `localFileId` | Evidence metadata/blob until upload succeeds |
| `history` | `[type, id]` | Cached Driver Order/Delivery History pages |
| `syncReceipts` | `clientMutationId` | Applied/duplicate/conflict/rejected results |

Every offline mutation must contain `clientMutationId`, entity type/ID, operation, base version, client-recorded time, payload, queue time, and retry count. The server derives user and role from authentication.

### Sync engine

1. Acquire a single-browser sync lease to prevent duplicate concurrent workers.
2. Upload required evidence files first and replace local file references with server IDs.
3. Send mutations in causal order through `/sync/batch`.
4. Mark each result independently as applied, duplicate, conflict, or rejected.
5. Stop dependents after a conflict/rejection and show an actionable recovery screen.
6. Upload location batches separately with sequence/time deduplication and bounded batch sizes.
7. Use exponential backoff with jitter, but allow manual retry.
8. Preserve applied receipts so replay after a crash remains idempotent.
9. Compact acknowledged locations/mutations only after a safe retention interval.
10. Warn before logout, storage clear, or service-worker upgrade when pending work exists.

### GPS behavior

- Request location permission before starting the trip and explain why it is mandatory.
- Record `recordedAt`, latitude, longitude, accuracy, heading/speed when supplied, sequence, and acquisition state.
- Reject or flag impossible timestamps and grossly inaccurate points according to a documented threshold.
- Batch while online; queue while offline.
- Display permission denial, sensor error, stale fix, offline queue, and browser suspension gaps explicitly.
- Do not claim continuous background tracking when the OS suspends the PWA.
- Trip completion must report unresolved GPS gaps/pending points to the user and server policy.

### Trip execution tasks

1. Start route only after start-meter evidence is captured and queued/uploaded.
2. Navigate the ordered manifest locally and show map/stop information from the bootstrap.
3. Record explicit arrival, delivered quantities/outcomes, PIN verification request, and completion.
4. Require end-meter evidence before finish.
5. Persist Driver Order History and Delivery History from server projections; cached pages are read-only while offline.

### Acceptance scenarios

- Airplane mode after successful bootstrap still allows the full route workflow to be recorded.
- Reloading the PWA restores the exact active stop and pending queue.
- Replaying a submitted mutation cannot duplicate arrival/completion.
- A second device sees only last synchronized state, with no claim of recovering unsynchronized work.
- GPS points retain original device timestamps and upload later without becoming false live positions.
- Conflicting server state is surfaced, never silently overwritten.

## 18. Phase 9 — Delivery proof, receipt, evidence, histories, and audit

### PIN proof

1. Permit PIN issue/rotation only after the Driver has recorded arrival at the Store Manager's outlet.
2. Generate a four-digit PIN using a cryptographically secure source.
3. Return plaintext once; persist only hash, expiry, attempt limit, issued-by, and rotation metadata.
4. Rate-limit verification and invalidate old PINs on rotation or success.
5. Handle offline Driver verification honestly: queueing the entered PIN is sensitive and may expire. Prefer requiring connectivity for final server verification; if the demo requires offline capture, encrypt local sensitive data, set a short retention policy, and mark the stop pending proof until the server verifies it.

### Receipt and issues

- Store Manager can confirm full receipt or report per-item discrepancies with remark/evidence.
- Receipt submission is idempotent and version checked.
- Server validates that the caller owns the outlet and that the delivery is in a receivable state.
- Disputes create operational events visible to Dispatcher and Driver histories.

### File flow

1. Validate requested kind, ownership, MIME type, and byte limit before issuing an upload signature.
2. Bind upload metadata to the expected trip/delivery/user and a short expiry.
3. On completion, verify provider signature/resource metadata before saving `file_assets`.
4. Serve authorized, short-lived access only; never trust a client-provided public URL.
5. Strip or account for image metadata according to the privacy policy.

### History and audit rules

- Histories are database-backed, paginated, server-filtered, and scoped by role.
- Order, trip, load, delivery, PIN, file, conflict, and remark transitions create audit events.
- Audit events store actor, role, entity, action, timestamp, request ID, and safe before/after summaries.
- Sensitive credential/PIN/file signature material never appears in audit payloads.

## 19. Phase 10 — Observability, security, and resilience hardening

### Security checklist

- Exact CORS origin allowlist with only required methods/headers and no wildcard credentials.
- Helmet security headers and frontend CSP compatible with the map/image providers actually used.
- Body, file, pagination, date-range, and batch-size limits.
- Rate limits for login, exchange, PIN, upload signatures, CSV, and sync endpoints.
- Server-side schema validation with unknown-field policy.
- NoSQL/operator injection prevention and safe projection/sort allowlists.
- Ownership checks after resource lookup and before mutation.
- Generic production errors; no stack traces or database details returned.
- Dependency audit and secret scan before release.
- HTTPS-only production endpoints and secure provider credentials.

### Operational telemetry

Track at least:

- request count, latency, and errors by route/status;
- login/exchange failures and rate limits;
- published trips and constraint failures by rule;
- claim conflicts;
- sync batch applied/duplicate/conflict/rejected counts;
- pending mutation age and GPS last-seen age;
- upload failures;
- Mongo connection/transaction failures.

Create structured operational events for business facts; do not attempt to reconstruct critical history from ephemeral logs.

### Resilience tests

- API restart during a retried idempotent mutation.
- Mongo transient failure during trip publication.
- lost network during file upload and sync batch.
- stale resource version in each operational role.
- duplicate service-worker/background sync trigger.
- browser refresh during Loader reconciliation and Driver trip.

## 20. Phase 11 — Docker and deployment

### Docker Compose target

The final Compose topology contains:

```text
mongo
seed
api
login-web
dispatcher-web
loader-web
driver-web
store-manager-web
```

Requirements:

- Multi-stage builds and unprivileged runtime users where supported.
- Pinned base image versions.
- Health checks for Mongo, API, and each Nginx service.
- Seed waits for Mongo readiness and exits successfully after idempotent import.
- API waits for Mongo and reports readiness separately.
- Frontend runtime configuration is documented; build-time Vite variables must be supplied explicitly.
- Nginx uses SPA fallback, immutable caching for hashed assets, no-cache for `index.html`, compression, and security headers.
- Named Mongo volume for local persistence; no production secrets in Compose.
- Compose exposes clear local ports for all five origins to exercise real CORS/handoff behavior.

### Production deployment order

1. Provision Atlas and verify network access, indexes, and transactions.
2. Provision image provider and test signed upload/authorized read.
3. Deploy API to Render with health checks and exact environment values.
4. Run reference/user seed against the intended environment with an explicit database identifier in the log.
5. Deploy role frontends with their final API URL and callback origin.
6. Update API CORS and redirect allowlists with the exact deployed origins.
7. Run auth handoff smoke tests for every role.
8. Run one complete non-production delivery scenario.
9. Freeze seed data and capture deployment/version identifiers for the demo runbook.

### Planned verification commands

```powershell
docker compose config
docker compose build
docker compose up -d
docker compose ps
curl.exe http://localhost:3000/health/ready
npm --prefix backend run test
npm --prefix backend run build
npm --prefix hackathon-host/Login run build
npm --prefix hackathon-host/dispatcher run build
npm --prefix hackathon-host/loader run build
npm --prefix hackathon-host/delivery-driver run build
npm --prefix hackathon-host/Store-Manager run build
```

Adjust package paths only to match the repository's actual capitalization and manifests; document any changed commands in the runbook.

## 21. Ordered implementation backlog

The following order minimizes blocked frontend work and repeatedly produces a demonstrable system. `P0` is essential for the judged end-to-end path, `P1` completes approved operational scope, and `P2` is polish or a safe fallback.

| ID | Priority | Deliverable | Depends on | Completion evidence |
|---|---:|---|---|---|
| BASE-01 | P0 | Baseline builds and mock inventory | Preflight | Build log and inventory |
| API-01 | P0 | OpenAPI skeleton, enums, state machines | BASE-01 | Validated contract |
| BE-01 | P0 | Fastify foundation, config, errors, logging, health | API-01 | Unit/injection tests |
| DB-01 | P0 | Reference/user models, indexes, idempotent imports | BE-01 | Clean + repeated seed tests |
| DB-02 | P0 | Order/trip/load/delivery/event models | DB-01 | Model/index tests |
| AUTH-01 | P0 | Login, one-time handoff, exchange, me, guards | DB-01 | Auth/security suite |
| FE-01 | P0 | Login UI and four role callbacks/session clients | AUTH-01 | Role callback smoke matrix |
| STORE-01 | P0 | Catalogue, calendar, order create/list/detail | DB-02, FE-01 | Order E2E test |
| PLAN-01 | P0 | Pure allocation constraint engine | DB-02 | Rule unit suite |
| PLAN-02 | P0 | Draft/validate/publish/defer APIs and UI | STORE-01, PLAN-01 | Publish transaction E2E |
| LOAD-01 | P0 | Atomic claim/unclaim/start/load/reconcile/confirm | PLAN-02 | Loader E2E + race test |
| DRIVER-01 | P0 | Route claim, vehicle confirm, bootstrap | LOAD-01 | Offline-ready assertion |
| DRIVER-02 | P0 | IndexedDB execution, mutation queue, sync batch | DRIVER-01 | Airplane-mode E2E |
| TRACK-01 | P0 | GPS capture/batch/latest projection/gap states | DRIVER-02 | Delayed-upload tracking test |
| PROOF-01 | P0 | Arrival, PIN, stop complete, receipt, evidence | DRIVER-02 | Delivery proof E2E |
| HIST-01 | P1 | Store/Driver histories and Dispatcher audit/CSV | PROOF-01 | Scope/filter tests |
| LOAD-02 | P1 | Loader IndexedDB recovery and summary PDF | LOAD-01 | Refresh/offline test |
| PWA-01 | P0 | Manifest/shell/update strategy for all apps | FE-01 | Install/offline-shell checks |
| PWA-02 | P1 | Role-specific cached projections and cleanup rules | HIST-01, DRIVER-02 | Offline/privacy tests |
| OBS-01 | P1 | Metrics/events/redaction/security hardening | BE-01 onward | Security/telemetry report |
| OPS-01 | P0 | Docker Compose and local full-stack parity | BE-01, FE-01 | Healthy Compose stack |
| OPS-02 | P0 | Production deploy and environment allowlists | OPS-01 | Deployment smoke report |
| QA-01 | P0 | End-to-end regression and deterministic demo seed | All P0 | Signed release checklist |
| POLISH-01 | P2 | Advanced map/route suggestions and visual polish | QA-01 | No regression |

### Endpoint implementation sequence

Within the backlog, implement endpoints in this order so the earliest end-to-end path remains usable:

1. Health and OpenAPI.
2. `/auth/login`, `/auth/exchange`, `/auth/me`, logout.
3. `/catalog/products`, `/calendar/:date`, `/orders`, `/orders/:orderId`.
4. `/planning/orders`, reference vehicles/outlets, draft/validate/publish.
5. `/load-jobs` claim through confirm.
6. `/driver/routes/today`, assignment claim/confirm/bootstrap representation.
7. Trip start, arrival, items, PIN verification, stop complete, trip finish.
8. `/sync/batch` and location batch before claiming offline support is complete.
9. Store receipt, delivery detail, tracking monitor.
10. Histories, remarks, audit, CSV, files, and PDF.

For each endpoint, complete schema, service, repository query, authorization, error mapping, OpenAPI example, unit test, integration test, and frontend consumer before calling it done.

## 22. Current-frontend migration procedure

Apply this sequence independently in each role app:

1. Identify the current component's mock source and all derived assumptions.
2. Define the corresponding API view model from the frozen contract.
3. Add a repository/hook boundary that can temporarily select mock or API data by development flag.
4. Implement API loading, empty, retry, forbidden, stale, conflict, and offline states.
5. Switch the default to API data.
6. Run the component and role-level flow tests.
7. Remove the replaced mock data, timers, duplicate type definitions, and feature flag.
8. Search for orphaned imports/text/routes before moving to the next feature.

Role order:

| App | Migration order |
|---|---|
| Login | Credentials -> redirect -> callback error recovery -> profile/logout |
| Store Manager | Catalogue/calendar -> create order -> order detail/history -> delivery detail/history -> PIN/receipt |
| Dispatcher | Queue/reference data -> draft/validate -> publish/defer -> calendar/detail -> monitor -> audit/CSV |
| Loader | Jobs -> claim/unclaim -> manifest/items -> exceptions/reconcile -> confirm/PDF -> local recovery |
| Driver | Remove duplicate login -> route list -> claim/vehicle/bootstrap -> active trip -> GPS/sync -> histories |

Do not leave production-visible hybrid screens where some totals are mock-derived and other records are live unless the screen labels the temporary state for developers only.

## 23. Test strategy and required matrix

### Unit tests

- Timezone cutoff boundaries, operating-day selection, week boundaries, and Fresh deadline selection.
- Every allocation rule with pass, boundary, and fail cases.
- State transition guards for Order, Trip, LoadRecord, and DeliveryRecord.
- Capacity/fuel arithmetic, including unit normalization and rounding policy.
- PIN hashing/expiry/attempts and handoff expiry/consumption.
- Sync dependency ordering, result classification, and backoff calculation.
- Error mapping and safe response projections.

### Integration tests with MongoDB

- Unique and TTL indexes.
- Role and ownership guards on every protected resource family.
- Idempotent order create, trip start, arrival, completion, receipt, finish, and sync replay.
- Optimistic concurrency conflicts.
- Atomic Loader/Driver claims under parallel requests.
- Trip publish commit and forced rollback.
- Pagination/filter/index behavior.
- File authorization metadata checks.
- Audit events for success and rejected material transitions where required.

Use a real MongoDB replica set for transaction integration tests. Mocks are acceptable for isolated unit tests, not for proving transaction or index behavior.

### Contract tests

- Validate every success and error response against OpenAPI.
- Verify examples remain executable.
- Detect breaking field/enum changes before frontend merge.
- Ensure camelCase JSON, UTC timestamps, service-date format, pagination metadata, versions, and request IDs are consistent.

### End-to-end browser tests

Run at least this happy path:

1. Store Manager logs in through shared Login.
2. Store Manager submits a CSC-backed order before cutoff.
3. Dispatcher logs in, validates, and publishes a feasible trip.
4. Loader claims, loads, reconciles, and confirms.
5. Driver claims, confirms vehicle, and bootstraps.
6. Driver starts with meter evidence, records GPS, arrives, records items, and verifies the PIN.
7. Driver completes the stop and trip with end-meter evidence.
8. Store Manager confirms receipt.
9. Dispatcher sees completed status/audit; Store Manager and Driver see histories.

Run negative paths for wrong role, other outlet, duplicate claim, failed constraint, stale version, expired handoff, invalid/expired PIN, missing evidence, and premature confirmation.

### Offline/PWA tests

- Install all apps and load their shell offline after first visit.
- Bootstrap Driver online, switch browser context offline, reload, execute stops, reconnect, and verify exactly-once server state.
- Queue GPS points offline and confirm original timestamps and gap presentation after upload.
- Interrupt Driver sync halfway and prove safe replay.
- Refresh Loader during active checklist and reconcile local/server versions.
- Upgrade the service worker with pending mutations and verify the warning/preservation path.
- Log out and verify sensitive caches/IndexedDB are removed only under the documented pending-work rule.
- Use constrained/slow network profiles to verify timeouts and retry states.

### Security tests

- CORS preflight from allowed and hostile origins.
- Access without token, wrong role, wrong outlet/depot/assignment, and guessed IDs.
- Login/exchange/PIN rate limits and generic failures.
- NoSQL injection payloads, oversized bodies/batches/files, invalid MIME metadata, and CSV injection escaping.
- Expired/reused handoff and idempotency keys with changed payloads.
- Log/response scan for tokens, hashes, passwords, PINs, and provider secrets.

### Performance targets for the demo environment

Agree on measurable targets during preflight. Recommended minimums:

- Health response under 250 ms when dependencies are healthy.
- Typical list/detail API p95 under 750 ms for seeded demo volume.
- Planning validation under 1 second for a normal demo route.
- Sync batches bounded so one request does not monopolize the API; start with 100 mutations or 500 GPS points and tune from tests.
- First useful frontend render remains acceptable on the intended demo network/device.

These are release targets, not invented guarantees; record the actual test environment and results.

## 24. Deterministic demonstration dataset and script

Create a small, memorable dataset that exercises rules without relying on manual database edits:

- One Dispatcher.
- Two Loaders at one depot to demonstrate claim conflict.
- Two Drivers, with one eligible for multiple vehicles.
- Two Store Managers mapped to separate outlets.
- At least one Fresh and one non-Fresh product from the CSC import.
- At least three vehicles: one feasible, one capacity/temperature-infeasible, and one close to weekly quota.
- Submitted orders that form one feasible route.
- One deferred order with reason history.
- Prior completed records for Store and Driver histories.
- A vehicle already assigned two routes to prove the per-vehicle third-route rejection.

The demo runbook should give exact account IDs, URLs, expected records, and speaking cues, but credentials must be demo-only and stored outside version control where appropriate.

Demo rehearsal sequence:

1. Confirm all health checks and app versions.
2. Reset only the dedicated demo database using the guarded reset command.
3. Seed reference, users, and demo records.
4. Run the full story once online.
5. Reset and run the Driver airplane-mode segment.
6. Capture fallback screenshots/video only as presentation insurance; do not use them as completion evidence.
7. Record known limitations and avoid claims beyond tested browser behavior.

## 25. Compressed hackathon critical path

If work begins on October 1 for the October 4 deadline, use the following aggressive sequence. Parallelize by workstream only after API contracts and entity states are frozen.

### October 1 — Foundation and first order

- Morning: preflight, baseline builds, API/state contract, backend scaffold, Mongo Compose.
- Afternoon: reference imports/models, users, auth/handoff, frontend callbacks.
- Evening: catalogue/calendar/order create/list and first full Login-to-order demonstration.

Exit gate: a real Store Manager logs in and creates a persisted CSC-backed order.

### October 2 — Planning and loading

- Morning: constraint engine, planning queue, draft/validate.
- Afternoon: transactional publish, deferral, trip/load models.
- Evening: Loader atomic claim through reconciliation/confirm; begin Compose frontend services.

Exit gate: the persisted order becomes a published, fully confirmed load with audit history.

### October 3 — Driver offline path and proof

- Morning: Driver claim, vehicle confirmation, bootstrap, IndexedDB schema.
- Afternoon: active-trip workflow, mutation sync, evidence, GPS queue/batches.
- Evening: PIN, completion, receipt, Store/Driver histories, Dispatcher monitor.

Exit gate: the full route can be recorded through an offline interval and synchronize without duplicates.

### October 4 — Hardening, deployment, and rehearsal

- Early: PWA install/update behavior, security limits, role scope regression.
- Midday: production deployment, exact CORS/redirect values, production seed.
- Afternoon: full E2E/offline/security smoke; fix only release blockers.
- Evening: two clean demo rehearsals, freeze versions/configuration, retain rollback deployment.

Release gate: all P0 items pass, known limitations are documented, and no demo-critical step depends on an unverified manual database change.

### Scope-cut rule

When time is threatened, preserve correctness of the end-to-end path and cut in this order:

1. Visual polish and advanced animations.
2. Advanced route suggestions beyond explainable feasibility checks.
3. Server PDF if the existing client PDF is reliable for the demo.
4. Optional quota override UI/API—remove the edit control instead.
5. Nonessential P2 dashboards/metrics.

Do not cut authentication/authorization, atomic claims, authoritative cutoffs, transaction safety, Driver offline persistence/sync, proof, or auditability of the demonstrated path.

## 26. Risk register

| Risk | Probability / impact | Early signal | Mitigation | Fallback |
|---|---|---|---|---|
| CSC schema is missing or ambiguous | High / High | PF-01 unresolved | Validate immediately; create explicit mapping and rejection report | Use a clearly labelled approved fixture only with stakeholder sign-off |
| Atlas transaction behavior differs from local | Medium / High | Transaction smoke fails | Test on target tier on day one; use replica-set local tests | Block publish unless atomicity can be guaranteed; do not simulate success |
| Cross-origin auth fails after deployment | Medium / High | Callback/CORS smoke fails | Freeze exact origins; automated four-role matrix | Redeploy allowlists; retain previous known-good deployment |
| Driver PWA background GPS is suspended | High / Medium | Mobile/browser test shows gaps | Honest UI, foreground guidance, gap events, batch upload | Demonstrate foreground capture and state limitation explicitly |
| Offline sync conflicts late | Medium / High | Mutations lack versions/IDs | Build sync contract before Driver UI; test crash/replay | Restrict offline actions to proven sequence; never discard queue |
| IndexedDB schema upgrade loses work | Medium / High | Upgrade tests fail | Versioned additive migrations, backup/export diagnostics | Defer schema change during active demo version |
| Mock/live hybrid produces false totals | Medium / Medium | UI counts disagree with API | Migrate one complete screen at a time; remove old mocks | Hide non-integrated panel rather than show false data |
| Map/geocoding service is unavailable | Medium / Medium | Tiles/routing fail | Store official coordinates and route order; cache appropriate shell assets | Show stop list and last coordinates without promising live map |
| File provider fails | Medium / Medium | Signature/upload errors | Retryable staged uploads and pending evidence state | Preserve local blob and block final action if proof is mandatory |
| Timezone/browser clock causes cutoff error | Medium / High | UI/API deadline mismatch | Server authority and clock-offset display | Show server deadline/result only |
| Seed reset touches wrong database | Low / Critical | Ambiguous database name | Non-production guard + explicit flag + logged target | Never provide reset in production configuration |
| Deadline drives unsafe feature claims | High / High | P0 tests skipped | Scope-cut order and release gates | Demo smaller verified flow with documented limits |

Review the risk register at each daily exit gate. Convert any realized risk into a tracked defect with owner and user-visible impact.

## 27. Feature flags and rollback

Use flags sparingly and only for incomplete integrations that can be cleanly hidden. Suitable flags include optional server PDF, advanced map display, or audited quota override. Never flag off authorization, validation, version checks, or audit events in production.

Rollback requirements:

- Keep the previous API/frontend deployment version available until the demo is accepted.
- Database changes before the deadline should be additive where possible.
- Every migration records its version and is safe to re-run or has a tested rollback/forward-fix strategy.
- Frontend and API expose build/commit version for support.
- Do not deploy a frontend contract incompatible with the live API; deploy additive API first, frontend second, then remove old behavior later.
- Seed and migration operations produce timestamped reports.

## 28. Module execution protocol

For each backlog item, the implementing agent/developer should follow this protocol:

1. State the requirement, affected files, API/data changes, and acceptance cases before editing.
2. Inspect existing code and preserve unrelated user changes.
3. Update the contract/ADR first if the behavior changes.
4. Implement the smallest complete vertical increment—no placeholder success paths.
5. Add or update tests in the same change.
6. Run focused typecheck/tests/build and report exact results.
7. Run the relevant role flow manually or through Playwright.
8. Update this plan's backlog status and the traceability matrix.
9. Stop at the module's exit gate if verification fails; do not build dependent behavior on an unproven foundation.

Each handoff should report:

- files changed;
- contract or schema changes;
- commands run and results;
- remaining limitations/risks;
- next unblocked backlog item.

## 29. Release checklist

### Data and backend

- [ ] CSC, outlet, vehicle, and demo imports validated and repeatable.
- [ ] Required unique, compound, and TTL indexes exist in the release database.
- [ ] Transaction and race-condition tests pass on the target MongoDB tier.
- [ ] OpenAPI matches deployed behavior.
- [ ] Health/readiness and graceful shutdown pass.
- [ ] Logs are structured, correlated, and secret-redacted.

### Authentication and authorization

- [ ] Employee ID + password + recorded email works for all four roles.
- [ ] One-use handoff exchange passes expiry/replay/wrong-origin tests.
- [ ] No forgot-password or OTP UI/API remains.
- [ ] Role, outlet, depot, and assignment access tests pass.
- [ ] Tokens/PINs/hashes/secrets do not appear in URLs, logs, or responses.

### Operations

- [ ] Store cutoff, order, Order History, Delivery History, PIN, and receipt flows pass.
- [ ] Dispatcher feasibility, two-routes-per-vehicle, fuel/capacity, publish, defer, monitor, and audit pass.
- [ ] Loader exact confirmation dialog, atomic claim, guarded unclaim, reconciliation, and confirm pass.
- [ ] Driver exact confirmation dialog, vehicle confirm, bootstrap, offline execution, GPS, sync, proof, finish, and histories pass.
- [ ] State and conflict messages are actionable and never pretend failed work succeeded.

### PWA and offline

- [ ] All five apps install and reopen their shell offline.
- [ ] Driver queue survives refresh/restart on the same device.
- [ ] Interrupted sync replays without duplicate domain changes.
- [ ] Pending work is protected during logout/update/storage cleanup.
- [ ] GPS gaps and offline/stale tracking are represented honestly.
- [ ] Store/Loader degraded states show last sync and do not create false server confirmations.

### Deployment and demo

- [ ] Compose starts all eight target services and reports healthy state.
- [ ] Production origins, callback URLs, CORS, and CSP are exact.
- [ ] TLS is valid and no mixed content occurs.
- [ ] Full E2E scenario passes against production-like deployment.
- [ ] Demo reset/seed/runbook has been rehearsed twice.
- [ ] Previous deployment and database recovery procedure are available.
- [ ] Known limitations are written in presenter-safe language.

## 30. Approval gate before implementation

Before coding begins, approve or explicitly amend these items:

1. `SYSTEM_REQUIREMENTS_AND_ARCHITECTURE.md` remains the authoritative behavior contract.
2. The preflight inputs—especially CSC schema, reference records, origins, demo identities, and target Mongo tier—are available.
3. P0/P1/P2 priorities and the scope-cut order are accepted.
4. Driver offline bootstrap and sync are treated as P0 architecture, not optional polish.
5. The implementation uses separate existing frontend packages plus a new `backend/`.
6. The team accepts the browser/PWA background GPS limitation and will describe it honestly.
7. Implementation proceeds module by module with verification evidence before dependent work starts.

Once this gate is approved, begin with **BASE-01**, **API-01**, and **BE-01**. Do not begin by editing visible frontend screens while authentication, contracts, authoritative time rules, and the persistence foundation remain undefined.
