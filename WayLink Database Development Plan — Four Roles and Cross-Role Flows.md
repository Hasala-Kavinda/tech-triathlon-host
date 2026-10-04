# WayLink Database Development Plan — Four Roles and Cross-Role Flows

Oct 2, 2026 · @Dew

## Purpose and scope

One MongoDB database serves all four roles — Store Manager, Dispatcher, Loader, Driver — plus the shared Login shell. This plan turns the data model in `SYSTEM_REQUIREMENTS_AND_ARCHITECTURE.md` (section 6) into a build sequence, closes the gaps it leaves open, and defines exactly which collections each role touches at every handoff.

The architecture already fixes the big choices: Node 22, Fastify, Mongoose, MongoDB 8, Atlas in production, Docker Compose locally. This plan does not revisit them. It closes 16 gaps — including 9 collections the spec implies but never defines — and specifies the transaction boundary for each cross-role transition.

Read sections 2–4 for the shape of the database, 6–7 for how data moves between roles, 8 for per-role work you can assign to developers, and 13–14 for schedule and open decisions.

## How the four roles share one database

No role owns a private copy of anything: each role writes a narrow slice and reads the rest through scoped projections. The backend, not the frontend, enforces every scope below using the JWT claims `role`, `outletId`, `depot`, and `sub`.

Key: **C** create · **R** read · **U** update · **sys** written by a server-side side effect of another role's action (never by a direct client call).

| Collection | Store Manager | Dispatcher | Loader | Driver | Server side effects |
| --- | --- | --- | --- | --- | --- |
| `users` | R self | R self; R active drivers for assignment | R self | R self | Login updates `lastLoginAt`, `failedLoginCount`, `lockedUntil` |
| `auth_handoffs` | — | — | — | — | Auth module only (C on login, U `usedAt` on exchange) |
| `outlets` | R own outlet | R all | R via trip snapshot | R via manifest snapshot | Seed only |
| `vehicles` | — | R all | R assigned summary | R assigned | Seed only |
| `products` | R own brand | R planning attributes | — | — | Seed from CSC |
| `operating_calendar`, `travel_matrix`, `service_allowances`, `route_conditions` | R calendar (cutoff) | R all | — | R route snapshot | Seed from Drive Data CSVs |
| `orders` | C; R own outlet; U before cutoff/allocation; cancel | R all; U defer | R via load items | R via manifest | sys status propagation from every downstream step |
| `trips` | R own-outlet stops (ETA, last location) | C/U drafts; publish; cancel | R assigned | R assigned; U claim, vehicle, start, stops, finish | sys `loading` / `load_confirmed` from Loader |
| `vehicle_weekly_usage` | — | R; U audited override | — | — | sys planned use on publish, actual use on finish |
| `load_records` | — | R | U while claimed | R final snapshot | sys C on publish |
| `delivery_records` | R own outlet; U receipt | R all | — | U assigned stops | sys C on publish (one per stop) |
| `delivery_pin_challenges` | C issue/rotate | — | — | verify only (attempts) | TTL expiry |
| `trip_locations` | — (sees `trips.lastLocation` only) | R trail | — | C own active trip | sys projects newest point to `trips.lastLocation` |
| `file_assets` | C receipt evidence | R related | — | C meter photos | Provider verification sets `status` |
| `remarks` | C; R related | C; R all; U review/response | C; R related | C; R related | Each remark also emits an event |
| `operational_events` | R scoped to own outlet | R all | R scoped to own depot/claims | R scoped to own trips | sys C on every state transition |
| `mutation_ledger` | — | — | via sync | via sync | Dedup store for idempotency keys and offline mutations |
| `counters` | — | — | — | — | Generates `orderNumber`, `tripNumber` |

Two rules keep this safe. A role never writes another role's collection directly; it calls a service in the owning module, which applies the side effect. And every read is filtered by ownership in the repository layer, so a missing frontend guard can never leak another outlet's data.

## Gaps to close before coding

The spec's data model is sound but has 16 holes that would surface mid-build as broken flows. Items 1–4, 11, and 16 block the judge walkthrough and must be fixed in Phase 1.

| # | Gap | Where it shows | What breaks | Fix in this plan |
| --- | --- | --- | --- | --- |
| 1 | No collection for the delivery PIN challenge | `delivery_records.proof.pinChallengeId` points at nothing | PIN issue, expiry, 3-attempt lock cannot be stored | New `delivery_pin_challenges` with TTL |
| 2 | `load_records` indexed on `tripSnapshot.depot`, but the field is not defined | 6.3 `load_records` indexes | Loader "available jobs at my depot" query has nothing to filter on | Add `tripSnapshot` document |
| 3 | `load_records.items[]` has no item ID | API `PATCH /load-jobs/:tripId/items/:itemId` | Item updates cannot address an item | Add `items[].itemId` ObjectId |
| 4 | Local Compose runs standalone MongoDB | Section 14 Compose target | Publish and every multi-collection transition fail: transactions need a replica set | Run `mongo` as single-node replica set `rs0` |
| 5 | `operational_events` has no ownership scope | 6.3 events; permission matrix | Store Manager feed cannot be limited to own outlet; Loader to own depot | Add `scope` {outletIds, depot, tripId, driverId} |
| 6 | Order `status` enum never listed; no cancelled or failed-delivery path | 6.3 orders; 4.4 state diagram vs. Order History | Cancelled and failed orders have no legal state | Full enum in section 6 |
| 7 | Remarks are reviewed (`PATCH`) but stored in append-only events | 7.5 remarks APIs | Review mutates an immutable record | New `remarks` collection; events stay append-only |
| 8 | No storage for weekly fuel/distance use or quota overrides | 6.5 fuel rule; 7.5 quota override | Fuel-quota rule cannot be evaluated cheaply or audited | New `vehicle_weekly_usage` |
| 9 | Calendar, travel, service allowance, traffic, road CSVs have no collections | Section 2 sources; 6.5 rules | Operating-day, ETA, and window checks have no data | 4 reference collections |
| 10 | `Idempotency-Key` required but no store; `clientMutationIds[]` exists only on delivery records | 7.1; 7.7 sync | Retried trip start, load confirm, location batches can double-apply | New `mutation_ledger` |
| 11 | `delivery_records` creation time unspecified | 6.3; Store dashboard | Store "upcoming deliveries" and ETA have nothing to read before arrival | Create one per stop at publish |
| 12 | `orderNumber`, `tripNumber` generation unspecified | 6.3 | Duplicate human IDs under concurrent submits | New `counters` with atomic `$inc` |
| 13 | `trips.driverId` required at draft, yet Driver "claims an eligible assignment" | 6.3 trips vs. 7.7 claim | Unclear who may claim | `driverId` = planned driver; claim must match (decision D3) |
| 14 | Unbounded arrays: `statusHistory[]`, `clientMutationIds[]` | 6.3 | Documents grow without limit on long-lived orders | Cap at 50; full history lives in events |
| 15 | GPS volume vs. Atlas M0 512 MB | 13.2; section 14 | At 15 s sampling, about 1,920 points per 8-hour trip, roughly 0.8 MB with indexes; 120 trips/day is about 90 MB/day, so M0 fills in under a week | 30 s sampling, demo-only retention, or Flex tier (decision D5) |
| 16 | PIN proof assumes a live server check, but the Driver is offline in Stage 2 | 7.7 verify-pin; 13.1 offline-first; 24 must-work offline completion | Offline stop cannot be proven; must-work demo fails | Verify at sync against the challenge valid at device time (section 5) |

## Final collection inventory

The database ends with 21 collections: 12 from the spec (4 of them changed) and 9 new. Each has exactly one owning module; only that module's repository may query it.

| Collection | Owning module | Kind | Change vs. spec | Demo volume |
| --- | --- | --- | --- | --- |
| `users` | users / auth | Identity | As spec | 4+ role accounts, more drivers/loaders as seeded |
| `auth_handoffs` | auth | Ephemeral, TTL 60 s | As spec | Near zero |
| `outlets` | reference | Reference | As spec | 120 |
| `vehicles` | reference | Reference | As spec | 60 |
| `products` | catalog | Reference (CSC) | As spec | CSC catalogue size |
| `operating_calendar` | reference | Reference | **New** | One row per date in calendar CSV |
| `travel_matrix` | reference | Reference | **New** | Depot–outlet and outlet–outlet pairs from travel CSV |
| `service_allowances` | reference | Reference | **New** | Per brand/dock type |
| `route_conditions` | reference | Reference | **New** (traffic + road CSVs) | Per district/time band |
| `counters` | shared | System | **New** | 2 (`order`, `trip`) |
| `orders` | orders | Operational | **Changed**: status enum, cancel fields | Tens per demo day |
| `trips` | planning, trips | Operational | **Changed**: driver eligibility rule | Up to 120/day (60 vehicles × 2) |
| `vehicle_weekly_usage` | planning | Operational | **New** | 60 per ISO week |
| `load_records` | loading | Operational | **Changed**: `tripSnapshot`, `items[].itemId` | 1 per published trip |
| `delivery_records` | delivery | Operational | **Changed**: created at publish | 1 per stop |
| `delivery_pin_challenges` | delivery | Ephemeral, TTL | **New** | 1 active per stop |
| `trip_locations` | delivery | Append-only | As spec | See gap 15 |
| `file_assets` | files | Metadata | As spec | 2 meter photos per trip + receipt evidence |
| `remarks` | audit | Operational | **New** | Tens per day |
| `operational_events` | audit | Append-only | **Changed**: `scope` field | Hundreds per day |
| `mutation_ledger` | shared (sync) | Dedup, TTL 7 days | **New** | One per retried write or offline mutation |

## New and changed collection schemas

Fields below extend spec section 6.3; unchanged fields are not repeated. All collections keep `_id` ObjectId, UTC `createdAt`/`updatedAt`, and `version` where optimistic concurrency applies.

### `delivery_pin_challenges` (new)

The Driver is offline at most stops, so the PIN cannot be checked live. The Store Manager issues the PIN online; the Driver enters it offline; the server verifies it when the mutation syncs, against the challenge that was valid at the device-recorded time.

| Field | Type | Rule |
| --- | --- | --- |
| `deliveryRecordId`, `tripId`, `stopId`, `outletId` | ObjectId | required; must match an `in_transit` trip stop |
| `issuedBy` | ObjectId | Store Manager of that outlet |
| `pinHash` | string | HMAC-SHA256 with server pepper; plaintext returned once, never stored |
| `validFrom`, `validUntil` | date | default window 30 min |
| `supersededAt` | date | set when rotated; old challenge still verifies entries recorded before this |
| `attemptsUsed` / `maxAttempts` | int | 0 / 3; counted at verification time, online or at sync |
| `status` | string | `active`, `verified`, `locked`, `expired`, `superseded` |
| `verifiedAt`, `verifiedBy` | date / ObjectId | Driver |
| `purgeAt` | date | set only on non-verified terminal states; TTL index |

Indexes: partial unique `{deliveryRecordId:1}` where `status:"active"` (one live PIN per stop); `{deliveryRecordId:1, validFrom:-1}`; TTL `{purgeAt:1}`. Verified challenges are kept as proof.

### `remarks` (new)

| Field | Type | Rule |
| --- | --- | --- |
| `entityType`, `entityId` | string / ObjectId | `order`, `trip`, `load_record`, `delivery_record` |
| `scope` | document | same shape as event `scope` (below) |
| `authorId`, `authorRole` | ObjectId / string | from token, never body |
| `text` | string | 1–1,000 chars |
| `audienceRoles[]` | string array | subset of the 4 roles |
| `shareWithCrew` | boolean | default `false` |
| `status` | string | `open`, `reviewed`, `closed` |
| `review` | document | `reviewedBy`, `reviewedAt`, `response`, `notifyRoles[]` — Dispatcher only |

Indexes: `{entityType:1, entityId:1, createdAt:-1}`, `{status:1, createdAt:-1}`, `{"scope.outletIds":1, createdAt:-1}`.

### `vehicle_weekly_usage` (new)

| Field | Type | Rule |
| --- | --- | --- |
| `vehicleId` | ObjectId | required |
| `isoWeek` | string | `YYYY-Www`, computed in Asia/Colombo |
| `quotaL` | double | copied from `vehicles.weeklyFuelQuotaL` at creation |
| `override` | document | nullable: `quotaL`, `reason` (required), `by`, `at` |
| `committedKm`, `committedFuelL` | double | sum of published, not-cancelled trips; updated in the publish/cancel transaction |
| `actualKm`, `actualFuelL` | double | from finished trips (meter readings) |
| `tripIds[]` | ObjectId array | bounded by 14 per week (2 per day) |

Index: unique `{vehicleId:1, isoWeek:1}`. The fuel rule reads one document instead of aggregating every trip of the week.

### Reference collections (new)

Field names must be finalised against the actual Drive Data CSV headers during Phase 1; the shapes are:

| Collection | Business key (unique) | Main fields |
| --- | --- | --- |
| `operating_calendar` | `date` (`YYYY-MM-DD`) | `isOperatingDay`, read-only `flags` (payday, festival, holiday) |
| `travel_matrix` | `{fromId, toId}` | `distanceKm`, `baseMinutes` |
| `service_allowances` | `{brand, dockType}` | `serviceMinutes` |
| `route_conditions` | `{kind, district, timeBand}` | `kind` traffic or road, `multiplier`, `note` |

### `counters` and `mutation_ledger` (new)

`counters`: `_id` (`order`, `trip`), `seq` int. Incremented with `findOneAndUpdate({_id}, {$inc:{seq:1}}, {upsert:true})` inside the creating transaction.

| `mutation_ledger` field | Type | Rule |
| --- | --- | --- |
| `userId`, `key` | ObjectId / string | `Idempotency-Key` or `clientMutationId` |
| `deviceId` | string | nullable |
| `operation` | string | e.g. `trip.start`, `stop.verifyPin`, `load.item` |
| `requestHash` | string | SHA-256 of normalised body; same key + different hash = `422 IDEMPOTENCY_KEY_REUSED` |
| `outcome` | string | `applied`, `conflict`, `rejected` |
| `response` | document | small saved response replayed on duplicate |
| `expiresAt` | date | TTL, 7 days |

Index: unique `{userId:1, key:1}`; TTL `{expiresAt:1}`. This replaces `delivery_records.clientMutationIds[]`.

### Changes to existing collections

| Collection | Change | Why |
| --- | --- | --- |
| `orders` | Full `status` enum (section 6); `cancellation` {by, at, reason}; `allocation.deliveryRecordId`; `fulfilment` {shortQty, damagedQty, exceptionCount} | Cancel path; Store sees loader exceptions without reading load records |
| `trips` | `driverId` = planned driver; `trackingState` (`ok`, `degraded`, `offline`); `lastSyncAt`; `cancellation` | Claim eligibility; honest last-seen display; plus occupiesSlot (true from publish until cancel) for the vehicle-slot index in section 9 |
| `load_records` | `tripSnapshot` {tripNumber, serviceDate, depot, vehicleId, vehicleCode, plannedDepartureAt}; `items[].itemId`, `items[].stopSequence` | Depot query; item addressing; reverse-stop sort |
| `delivery_records` | Created at publish as `pending`; `proof.status` (`none`, `pending_verification`, `verified`, `failed`), `proof.enteredAt`; drop `clientMutationIds[]` | Upcoming deliveries for Store; offline PIN |
| `operational_events` | `scope` {outletIds\[\], depot, tripId, driverId, loaderId} + 3 indexes on it | Ownership-filtered feeds |

## Unified status model

The order is the thread every role follows, so its `status` is the one value all four apps display. It is never patched directly: each transition is a command on the owning aggregate (trip, load record, delivery record), and the same MongoDB transaction updates the affected orders and appends one `operational_events` row per order.

&#91;embedded content: order lifecycle · 8 main states, 4 exception states\]

A trip cancelled before the Driver starts returns its orders to `submitted`; a partial delivery stays `delivered` with `outcome: partial` and per-item shortfalls, so receipt still follows. `at_outlet` is optional on screen: an offline Driver may sync arrival and proof together.

### How each order status maps across collections

Order status is derived from, and must stay consistent with, the status of the trip, load record, and delivery record it belongs to. A nightly consistency check (section 12) flags any row that breaks this table.

| Order `status` | Store Manager label | `trips.status` | `load_records.status` | `delivery_records.status` |
| --- | --- | --- | --- | --- |
| `submitted` | Confirmed | — (or `draft`) | — | — |
| `deferred` | Deferred, with reason and next date | — | — | — |
| `cancelled` | Cancelled | — | — | — |
| `planned` | Scheduled | `published` | `available` or `claimed` | `pending` |
| `loading` | Scheduled (being loaded) | `loading` | `loading` or `reconciliation` | `pending` |
| `load_confirmed` | Scheduled (loaded) | `load_confirmed` | `confirmed` | `pending` |
| `in_transit` | On the way | `in_transit` | `confirmed` | `pending` |
| `at_outlet` | Arrived | `in_transit` | `confirmed` | `arrived` |
| `delivered` | Awaiting confirmation | `in_transit` or `completed` | `confirmed` | `delivered` |
| `delivery_failed` | Delivery failed | `in_transit` or `completed` | `confirmed` | `failed` |
| `receipt_confirmed` | Receipt complete | `completed` (usually) | `confirmed` | `receipt_confirmed` |
| `receipt_issue` | Receipt issue | `completed` (usually) | `confirmed` | `receipt_issue` |

Terminal order states: `cancelled`, `receipt_confirmed`, `receipt_issue`. A `delivery_failed` order is closed only when the Dispatcher re-plans it (new `deferral`) or closes it with a reason.

## Cross-role flows

Roles never message each other directly: one role's command writes the shared database, and the next role sees it on its next poll (10–15 s) or on its next screen load. Every handoff below is one MongoDB transaction plus one or more `operational_events` rows whose `scope` and `audienceRoles` decide who sees the notice.

&#91;embedded content: cross-role handoffs · 4 lanes, 8 steps\]

### Handoff table

| # | Handoff | Trigger (API) | Writes, in one transaction | Guard that prevents a bad write | Next role sees |
| --- | --- | --- | --- | --- | --- |
| 1 | Store → Dispatcher | `POST /orders` | `counters` $inc; `orders` insert with server-computed totals and `cutoffBucket` | Outlet = token `outletId`; brand matches outlet; SKUs active in CSC; server clock decides bucket | Order in `/planning/orders` for its run date |
| 2 | Store edits or cancels | `PATCH /orders/:id`, cancel | `orders` update | `status` in submitted/deferred, `allocation` null, `If-Match` version, before 16:00 | Dispatcher queue refreshes |
| 3 | Dispatcher drafts | `POST /planning/trips` | `trips` insert `draft` with `constraintCheck` | None on orders: drafts do not lock orders; publish does | Nothing outside Dispatcher |
| 4 | Dispatcher → Loader, Store | `POST /planning/trips/:id/publish` | `trips` → `published`; each order conditional update to `planned` + `allocation`; `load_records` insert; one `delivery_records` per stop; `vehicle_weekly_usage` $inc committed | Trip `version`; every order still `submitted`/`deferred` with null allocation (count must match, else abort `409`); all section 6.5 rules re-run inside the transaction | Loader job card; Store "Scheduled" + upcoming delivery with ETA |
| 5 | Dispatcher → Store | `POST /orders/defer-batch` | `orders` → `deferred` + `deferral` | Not allocated; `nextDate` is an operating day | Store deferral notice with reason |
| 6 | Loader claims | `POST /load-jobs/:tripId/claim` | `load_records` `available` → `claimed` | Single `findOneAndUpdate` on `status:"available"`; loader depot = `tripSnapshot.depot`; second claimant gets `409 LOAD_ALREADY_CLAIMED` | Dispatcher sees claimant |
| 7 | Loader releases | `POST /load-jobs/:tripId/unclaim` | `load_records` → `available` | `claimedBy` = caller; `loadingStartedAt` null; no item changed | Job back in available list |
| 8 | Loader starts | `POST /load-jobs/:tripId/start-loading` | `load_records` → `loading`; `trips` → `loading`; orders → `loading` | Claimed by caller; trip `published` | Store "being loaded" |
| 9 | Loader → Dispatcher, Store | `PUT /load-jobs/:tripId/items/:itemId/exception` | `load_records.items.$` update; event `load.exception` scoped to affected outlet | `version`; quantity ≤ expected | Dispatcher monitor; affected Store order |
| 10 | Loader → Driver | `POST /load-jobs/:tripId/confirm` | `load_records` → `confirmed`; `trips` → `load_confirmed`; orders → `load_confirmed` + `fulfilment`; `delivery_records.items[].expected` set to loaded quantity | Reconcile passed: every item `loaded` or has an exception | Route in `/driver/routes/today`; Store sees shortages before the truck leaves |
| 11 | Driver claims | `POST /driver/assignments/:tripId/claim`, `confirm-vehicle` | `trips.driverClaim` | Trip `load_confirmed`; `driverId` = caller; no existing claim; vehicle = trip vehicle | Response is the full manifest for IndexedDB |
| 12 | Driver → Store, Dispatcher | `POST /trips/:tripId/start` | `trips` → `in_transit`; orders → `in_transit`; `mutation_ledger` | Claimed by caller; `meter_start` file `ready` | Store "On the way"; monitor |
| 13 | Driver → Store, Dispatcher | `POST /trips/:tripId/location-batch` | `trip_locations` insertMany (unordered, dup `pointId` ignored); `trips.lastLocation` only if newer; `trackingState` | Trip `in_transit`; caller is driver | Monitor map; Store last-seen |
| 14 | Store → Driver | `POST /store/deliveries/:id/pin` | `delivery_pin_challenges`: supersede active, insert new | Own outlet; trip `in_transit`; stop not terminal | Driver hears the PIN in person |
| 15 | Driver → Store | `/sync/batch` or online stop APIs | Per mutation: `mutation_ledger`; `delivery_records` arrive/items/proof/complete; `trips.stops.$.status`; orders → `delivered`/`delivery_failed` | Ledger dedup; `baseVersion`; PIN valid at `clientRecordedAt`; server sets `timingResult` vs `windowDeadlineAt` | Store receipt form enabled |
| 16 | Driver closes route | `POST /trips/:tripId/finish` | `trips` → `completed`; `vehicle_weekly_usage` actual | All stops terminal; `meter_end` ready | Dispatcher day summary |
| 17 | Store → Dispatcher | `POST /store/deliveries/:id/receipt` | `delivery_records.receipt`; orders → `receipt_confirmed`/`receipt_issue`; `file_assets` linked | Delivery `delivered`; `receipt` null (no second submit) | Issue in Dispatcher queue; Driver history shows final result |
| 18 | Any role → Dispatcher | `POST /remarks`, `PATCH /remarks/:id/review` | `remarks` insert or review; event | Author relates to entity (ownership rules) | Dispatcher queue; response to `notifyRoles` |

Login (`POST /auth/login` → `/auth/exchange`) sits before all of these: it writes only `auth_handoffs`, `users` login fields, and a `login.success`/`login.failure` event.

## Per-role database work packages

Each package can go to one developer; all depend on the Shared package landing first. Every package ends with one acceptance test that proves its cross-role guarantee.

### Shared foundation (build first)

- [ ] Single-node replica set in Compose (`mongod --replSet rs0`, `rs.initiate()` in the healthcheck); Atlas already is one
- [ ] Mongoose connection, `withTransaction` helper with retry on `TransientTransactionError`
- [ ] `users`, `auth_handoffs` models; unique and TTL indexes
- [ ] `operational_events` with `scope`, an `emitEvent(session, ...)` helper every module calls inside its own transaction
- [ ] `counters`, `mutation_ledger` with an idempotency middleware for routes marked `Idempotency-Key`
- [ ] `file_assets` model and provider-verification service
- [ ] Repository base that injects ownership filters from the token (`outletId`, `depot`, `driverId`)

* **Acceptance:** a request replayed with the same `Idempotency-Key` returns the stored response and writes nothing.

### Store Manager package

- [ ] `orders` model with full status enum, item snapshots, server totals, `cutoffBucket` computed in Asia/Colombo from `operating_calendar`
- [ ] Create, guarded edit, guarded cancel (handoffs 1–2)
- [ ] Dashboard projection: next delivery from `delivery_records` + trip ETA; attention items (deferred orders, pending receipts, load exceptions from `orders.fulfilment`); activity from events scoped to `outletIds`
- [ ] Order History and Delivery History read models with cursor pagination
- [ ] Delivery detail joining `trips.lastLocation`, `trackingState`, `windowDeadlineAt`
- [ ] PIN issue/rotate (handoff 14) and receipt submission (handoff 17)

* **Acceptance:** the manager of `OUT001` gets `404` on any `OUT002` order, delivery, PIN, or event.

### Dispatcher package

- [ ] Reference collections and importers (`operating_calendar`, `travel_matrix`, `service_allowances`, `route_conditions`)
- [ ] Planning queue query with outlet reachability join
- [ ] Constraint engine: one pure function per rule in spec 6.5, results written to `trips.constraintCheck.rules[]`
- [ ] `vehicle_weekly_usage` maintenance and audited quota override (if approved)
- [ ] Draft, validate, publish transaction (handoff 4); defer and defer-batch (handoff 5); trip cancel returning orders to `submitted`
- [ ] Monitor projection, remarks review, order log and CSV export via cursor stream

* **Acceptance:** two concurrent publishes containing the same order: exactly one succeeds, the other returns `409` and changes nothing.

### Loader package

- [ ] `load_records` model with `tripSnapshot`, `items[].itemId`, `items[].stopSequence`
- [ ] Load-record generation inside the publish transaction, items sorted by reverse stop sequence
- [ ] Available-jobs query by depot, status, service date
- [ ] Atomic claim, guarded unclaim, start-loading (handoffs 6–8)
- [ ] Item and exception updates with positional `$` and `version`; offline queue entries carry `Idempotency-Key`
- [ ] Server-side reconcile and confirm transaction (handoff 10), including `delivery_records.items[].expected` and `orders.fulfilment`

* **Acceptance:** two loaders claim the same job at the same instant: exactly one owns it.

### Driver package

- [ ] Routes-today query; claim, unclaim, vehicle confirm (handoff 11)
- [ ] Manifest bootstrap projection: trip, stops, delivery records, outlet snapshots, deadlines, recent history page — everything IndexedDB needs
- [ ] Start and finish with meter-photo checks (handoffs 12, 16)
- [ ] `trip_locations` batch insert and newest-wins `lastLocation` projection (handoff 13)
- [ ] `/sync/batch` processor: in order, per-mutation ledger, results `applied`/`duplicate`/`conflict`/`rejected` (handoff 15)
- [ ] PIN verification at sync against the challenge valid at `clientRecordedAt`
- [ ] Driver Order History and Delivery History read models

* **Acceptance:** replaying an identical sync batch returns `duplicate` for every mutation and leaves every document version unchanged.

## Indexes mapped to screens

Every screen that polls or paginates is served by one index, ordered equality → sort → range. Rows marked **new** or **changed** differ from spec 6.3; the rest are confirmed as written.

| Screen or query | Role | Filter and sort | Index |
| --- | --- | --- | --- |
| Planning queue | Dispatcher | orders by `status`, `requestedDeliveryDate`, `brand` | `{status:1, requestedDeliveryDate:1, brand:1}` |
| Vehicle availability | Dispatcher | vehicles by depot/type/temp, then week usage | `vehicles {depot:1, active:1, type:1, temperature:1}`; `vehicle_weekly_usage {vehicleId:1, isoWeek:1}` unique **new** |
| Two-routes-per-vehicle rule | Dispatcher | unique slot per vehicle per day | `trips {vehicleId:1, serviceDate:1, routeIndex:1}` unique, partial on `occupiesSlot:true` **changed** — drafts and cancelled trips must not hold a slot |
| Live monitor (every 10–15 s) | Dispatcher | trips by `serviceDate`, `status` | `{serviceDate:1, status:1}` |
| Order log, CSV | Dispatcher | events by entity, newest first | `{entityType:1, entityId:1, createdAt:-1}` |
| Receipt-issue queue | Dispatcher | delivery records by `receipt.result` | `{"receipt.result":1, updatedAt:-1}` |
| Remarks to review | Dispatcher | remarks by `status` | `{status:1, createdAt:-1}` **new** |
| Available load jobs | Loader | `status`, `tripSnapshot.depot`, `tripSnapshot.serviceDate` | `{status:1, "tripSnapshot.depot":1, "tripSnapshot.serviceDate":1}` **changed** |
| My claimed jobs | Loader | `claimedBy`, `status` | `{claimedBy:1, status:1}` |
| Routes today | Driver | trips by `driverId`, `serviceDate` | `{driverId:1, serviceDate:1}` |
| Driver Delivery History | Driver | delivery records by `driverId`, newest first | `{driverId:1, completedAt:-1}` **new** |
| Driver Order History | Driver | orders on the driver's trips | `orders {"allocation.tripId":1}` |
| Location trail | Dispatcher | points by trip, in time order | `trip_locations {tripId:1, recordedAt:1}` |
| Order History | Store Manager | orders by outlet, newest first | `{outletId:1, submittedAt:-1}` |
| Next and upcoming deliveries | Store Manager | delivery records by outlet, deadline | `{outletId:1, windowDeadlineAt:1}` **new** |
| Delivery History | Store Manager | delivery records by outlet/status | `{outletId:1, status:1, updatedAt:-1}` |
| Activity feed | Store Manager | events for own outlet | `{"scope.outletIds":1, createdAt:-1}` **new** |
| Active PIN lookup | Store, Driver | one active challenge per delivery | partial unique `{deliveryRecordId:1}` where `status:"active"` **new** |

Create indexes from code with `syncIndexes()` in the seed job, never `autoIndex` on the production API, so a deploy cannot block on an index build.

## Concurrency, transactions, idempotency, offline sync

Three mechanisms carry all cross-role safety: multi-document transactions for handoffs, `version` checks for edits, and `mutation_ledger` for retries and offline replay.

### Transaction boundaries

| Needs a transaction (writes 2+ documents) | Single-document atomic update is enough |
| --- | --- |
| 1 order submit (counter + order) · 4 publish · 5 defer-batch (all or none) · 8 start loading · 10 load confirm · 12 trip start · 14 PIN rotate · 15 each synced mutation · 16 finish · 17 receipt · trip cancel | 2 order edit · 3 draft save · 6 claim · 7 unclaim · 9 item/exception · 11 driver claim · 13 location batch |

Run every transaction through `session.withTransaction()` with `readConcern: snapshot`, `writeConcern: majority`, and the built-in retry on transient errors. Keep each under about 1 second; publish touches roughly 1 trip + up to \~20 orders + 1 load record + stops, well inside limits. Events are written in the same transaction, so a rolled-back handoff leaves no phantom notice.

### Optimistic concurrency

- Every update to `orders`, `trips`, `load_records`, `delivery_records` filters on `{_id, version: expected}` and applies `$inc: {version: 1}`.
- Zero matched documents → re-read: missing = `404`; different version = `409 STALE_VERSION` with the current document so the client can redraw.
- Embedded `trips.stops[].version` lets an offline stop mutation conflict with only that stop, not the whole trip.

### Idempotency

Inside the same transaction as the business write, insert `{userId, key, requestHash}` into `mutation_ledger` first. A duplicate-key error means the request already ran: abort, read the stored `response`, return it. Same key with a different `requestHash` returns `422 IDEMPOTENCY_KEY_REUSED`.

### Offline sync algorithm (`POST /sync/batch`)

1. Authenticate; derive user, role, and allowed trips from the token, never from the payload.
2. Process mutations strictly in client order; stop the batch at the first mutation whose dependency failed and mark the rest `rejected: DEPENDENCY_FAILED`.
3. For each: ledger check → `duplicate` returns the saved result.
4. Validate `clientRecordedAt`: not later than server time + 2 min skew, not earlier than `trips.actualStartAt` − 5 min.
5. Load the target, compare `baseVersion`; apply the conflict rules below; write in a transaction with its event.
6. Return per-mutation `applied`, `duplicate`, `conflict` (with server state), or `rejected` (with code).

Conflict rules, from spec 13.3 and applied in this order:

- A verified-PIN delivery always lands; if the Dispatcher deferred or cancelled meanwhile, keep both facts and raise `sync.conflict` for review.
- A Dispatcher cancellation before arrival rejects later ordinary checklist updates.
- A duplicate completion returns the existing record.
- A late location point is stored but never replaces a newer `lastLocation`.

### Polling cost

Monitor and Store delivery polls send `If-None-Match`; the ETag is `max(updatedAt)` plus count of the result set, so an unchanged poll costs one indexed read and returns `304`.

## Seeding plan

The `mongo-seed` container runs once per `docker compose up` and must be safe to run again: every step upserts by business key and fails loudly on a count mismatch. Run in this order:

1. Wait for replica-set primary, then `syncIndexes()` on every model.
2. Reference data from Drive Data: `outlets` (expect 120), `vehicles` (expect 60), `operating_calendar`, `travel_matrix`, `service_allowances`, `route_conditions`. Generate documented synthetic `displayName` and district-level demo coordinates for outlets (spec assumption 4).
3. `products` from the CSC extract, with any seeded planning attribute flagged `attributeSource: "seed_assumption"` until CSC confirms it.
4. `users`: at least one Dispatcher, one Loader per depot (Peliyagoda, Kandy), two Drivers, and three Store Managers on one Fresh, one Style, and one Tech outlet. Employee IDs follow `^[A-Z]{3}-\d{4}$` (for example `DSP-0001`, `LDR-0001`, `DRV-0001`, `STM-0001`); passwords hashed with Argon2id from seed env variables, never committed.
5. `counters` initialised; `vehicle_weekly_usage` created at zero for the current ISO week.
6. Demo-day scenario (`seed-demo-day.ts`): two Fresh orders (dry + chilled) for the same outlet to show stop consolidation, one Style and one Tech order, one order stamped after 16:00 to show `following_run`, and one order sized to exceed a van to force an explained deferral. Trips are not seeded: the Dispatcher builds them live in the walkthrough.
7. Optional flag `--advance-to=published|load_confirmed|in_transit` creates trips through the real services, so Loader and Driver developers can test without clicking through earlier roles.
8. Print a count report and exit non-zero on any mismatch, so `api` never starts on a half-seeded database.

In production the seed runs once by hand against Atlas; the seed route and container are disabled afterwards (spec section 22). Export the seeded database before judging, because Atlas M0 has no backups.

## Validators, migrations, and data testing

Validation runs at two layers so a bug in one service cannot corrupt shared data: Mongoose schemas in the API, and MongoDB `$jsonSchema` collection validators (`validationLevel: strict`, `validationAction: error`) for required fields and every status enum. Validator JSON lives in `database/validators/` and is applied by the seed job with `collMod`.

Schema changes go through numbered scripts in `database/migrations/` (migrate-mongo or equivalent, which tracks applied steps in its own changelog collection). During the hackathon allow additive changes only; adding an enum value updates the Mongoose enum and the collection validator in the same migration.

| Test | Tool | What it proves |
| --- | --- | --- |
| Cutoff bucket at 15:59:59 and 16:00:00 Asia/Colombo | Unit | Server, not device, decides the run |
| Each allocation rule in spec 6.5, pass and fail | Unit | `constraintCheck.rules[]` explains every block |
| Publish, confirm, receipt transactions roll back on mid-way failure | Integration on `MongoMemoryReplSet` | No half-written handoff; no phantom event |
| Parallel claim (2 loaders, 2 drivers) and parallel publish of one order | Integration, `Promise.all` | Exactly one winner, others `409` |
| Sync batch replayed, reordered, and with stale `baseVersion` | Integration | `duplicate`, `rejected`, `conflict` as specified |
| Offline PIN entered before rotation, synced after | Integration | Verified against the challenge valid at device time |
| Cross-outlet, cross-depot, cross-driver reads | Contract, one per role | Ownership filters return `404` |
| Order/trip/load/delivery status consistency (section 6 table) | Script, CI and on demand | Derived states never drift |
| Seed run twice | Integration | Identical counts, no duplicates |

## Phased delivery schedule

The database work runs in six phases mapped onto the spec's roadmap; no phase starts until the previous gate passes. DB-3 is where the four roles first connect, so the per-role packages in section 8 run in parallel inside it once DB-2 is green.

&#91;embedded content: database roadmap · 6 phases, 5 gates\]

The spec's hackathon cut line still applies: if time runs short, keep DB-0 to DB-4 and trim only the CSV export, quota override, and richer history filters from DB-5.

## Decisions needing approval

These 8 choices extend the spec's approval gate (section 25). D1–D4 must be settled before Phase 1 ends; the rest by Phase 4.

| ID | Decision | Recommendation | Alternative | Needed by |
| --- | --- | --- | --- | --- |
| D1 | Add the 9 new collections and the schema changes in section 5 | Approve as written | Fold reference CSVs into one `reference_data` collection | Phase 1 |
| D2 | Order status enum adds `cancelled` and `delivery_failed` | Approve; failed orders return to the queue only through Dispatcher re-plan | Auto-defer failed orders to the next run | Phase 1 |
| D3 | Who may claim a Driver assignment | Only the planned `trips.driverId`; reassignment is a Dispatcher edit | Any active Driver at the trip's depot | Phase 1 |
| D4 | Offline PIN proof | Verify at sync against the challenge valid at device-recorded time, within skew bounds | Require connectivity for PIN entry (breaks the must-work offline completion) | Phase 1 |
| D5 | GPS volume on Atlas | 30 s sampling, Atlas Flex for the demo, purge trails after judging | 15 s sampling on M0 with daily purge | Phase 4 |
| D6 | Weekly fuel quota editing | Show computed use only; audited override hidden behind a flag | Remove the override UI entirely | Phase 3 |
| D7 | `timingResult` for stops synced late | Use bounded device time, store `timeSource: device` vs `server` | Use server receipt time (marks every offline stop late) | Phase 4 |
| D8 | Create `delivery_records` at publish | Approve, so Store sees upcoming deliveries and ETA | Create at Driver arrival (Store dashboard has no upcoming data) | Phase 1 |
