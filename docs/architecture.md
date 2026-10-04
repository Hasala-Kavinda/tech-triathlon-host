# WayLink architecture and data model

The diagrams are [Mermaid](https://mermaid.js.org/) and render on GitHub and in most Markdown viewers.

## 1. System architecture

```mermaid
flowchart LR
  subgraph Browser["Browsers (React + Vite PWAs, served by nginx)"]
    LOGIN["Login :5173"]
    DSP["Dispatcher :5174"]
    LDR["Loader :5175"]
    DRV["Driver :5176<br/>IndexedDB offline queue + GPS"]
    STM["Store Manager :5177"]
  end

  subgraph API["API :3000 - Fastify modular monolith (/api/v1)"]
    direction TB
    AUTH["auth<br/>login, handoff, JWT"]
    REF["reference<br/>outlets, vehicles, products, calendar"]
    STORE["store / orders<br/>ordering, order lifecycle"]
    PLAN["planning<br/>trips, engine context, driver assignment"]
    LOAD["loading<br/>claim, items, exceptions, confirm"]
    DEL["delivery + driver<br/>arrive, PIN, complete, GPS, sync"]
    OPS["operations<br/>monitor, remarks, notices, accept, audit"]
    FILES["files<br/>signed upload + metadata"]
    DEV["dev (development only)<br/>scenario tool"]
    ENGINE["route-engine<br/>pure TypeScript, 22 rules"]
    CLOCK["common/clock<br/>Asia/Colombo, scoped time"]
  end

  DB[("MongoDB 8<br/>replica set rs0<br/>transactions")]
  CLD["Cloudinary<br/>meter + receipt photos"]
  CSV["Reference CSVs<br/>Drive Data/ + CSC/"]

  LOGIN -- "handoff code + Origin" --> AUTH
  DSP & LDR & DRV & STM -- "Bearer JWT, REST/JSON" --> API
  LOGIN -. "redirect with one-time code" .-> DSP & LDR & DRV & STM

  PLAN -- "builds engine context" --> ENGINE
  DSP -. "imports the same engine<br/>(@route-engine alias)" .-> ENGINE
  STORE & PLAN & LOAD & DEL & OPS --> CLOCK
  AUTH & REF & STORE & PLAN & LOAD & DEL & OPS & FILES --> DB
  FILES -- "signature check + metadata" --> CLD
  DRV -- "direct signed upload" --> CLD
  CSV -- "seed (preflight validated)" --> DB
  CSV -- "travel + allowance tables read at runtime" --> PLAN
```

Key points:

- **One backend, one database.** Each role app is a thin client over the same API. The backend owns `Order`, `Trip`, `LoadRecord` and `DeliveryRecord`, so a status seen by one role is the same record every other role sees.
- **Module boundaries.** Each module owns its collections. Writes go through command ports and reads through read ports (for example `RemarkCommandPort` / `RemarkReadPort`); other modules do not query a collection they do not own.
- **Authentication across origins.** The Login app calls `POST /auth/login` (employee ID + email + password) and receives a one-time `handoffCode`; the target role app exchanges it at `POST /auth/exchange` with its `Origin` header for a short-lived JWT. Handoff codes are stored hashed and are single use.
- **Route engine.** Pure TypeScript with no database access, living in `backend/src/route-engine`. The Dispatcher imports the same source through the `@route-engine` alias to suggest packs and routes; the API builds the engine's input (`planning/engine-context.ts`: outlets, travel and allowance tables, vehicle usage) and the dev scenario tool runs it. The server still validates every trip it saves with its own rules, so the engine only proposes.
- **Time.** All "now" decisions (16:00 order cutoff, the Driver's "today", PIN expiry) read `common/clock`, which is the real clock except when the dev scenario tool runs one request "as of" another instant.
- **Offline.** The Driver app queues arrivals, completions and GPS points in IndexedDB and syncs them later; the `mutationledgers` collection makes replays idempotent.
- **Photos.** Binary files live in Cloudinary. MongoDB stores only metadata (`file_assets`); the API verifies the Cloudinary signature before it records an asset.

## 2. Delivery lifecycle across the roles

```mermaid
sequenceDiagram
  actor SM as Store Manager
  actor DP as Dispatcher
  actor LD as Loader
  actor DR as Driver
  participant API
  participant DB as MongoDB

  SM->>API: POST /orders
  API->>DB: orders (submitted, cutoffBucket)
  DP->>API: POST /planning/trips (engine-validated)
  API->>DB: trips (draft) + orders.allocatedTripId
  DP->>API: publish trip
  API->>DB: trips.published, loadrecords (available), delivery_records (pending)
  LD->>API: claim, mark items, exceptions, confirm
  API->>DB: loadrecords.confirmed, trips.load_confirmed
  LD-->>DB: exception => remarks (via operations)
  DR->>API: claim trip, start (meter photo)
  API->>DB: trips.in_transit, file_assets
  DR->>API: location-batch (GPS)
  API->>DB: trip_locations
  DR->>API: arrive at stop
  API->>DB: delivery_records.arrived
  SM->>API: issue PIN
  API->>DB: delivery_pin_challenges (hash only)
  DR->>API: verify PIN, complete stop
  API->>DB: delivery_records.delivered, orders.delivered
  DR->>API: finish trip (end meter photo)
  API->>DB: trips.completed
  SM->>API: receipt (full or issue)
  API->>DB: delivery_records.receipt_*, remarks if issue
  DP->>API: GET /trips/:id/monitor, review remarks, accept
  API->>DB: remarks.reviewed (+notice), trips.acceptedAt
```

## 3. Data model

MongoDB database `waylink`. Collection names below are the real ones (Mongoose pluralises models that do not name their collection).

```mermaid
erDiagram
  users ||--o{ orders : "storeManagerId"
  outlets ||--o{ orders : "outletId"
  outlets ||--o{ users : "outletId (store managers)"
  products ||--o{ orders : "items.productId"
  orders }o--o| trips : "allocatedTripId"
  users ||--o{ trips : "driverId, dispatcherId, claimedByDriverId"
  vehicles ||--o{ trips : "vehicleId"
  trips ||--|| loadrecords : "tripId (unique)"
  users ||--o{ loadrecords : "claimedBy (loader)"
  trips ||--o{ delivery_records : "tripId + tripStopId (unique)"
  outlets ||--o{ delivery_records : "outletId"
  users ||--o{ delivery_records : "driverId"
  delivery_records ||--o{ delivery_pin_challenges : "deliveryRecordId"
  trips ||--o{ trip_locations : "tripId"
  trips ||--o{ file_assets : "tripId"
  delivery_records ||--o{ file_assets : "deliveryId"
  trips ||--o{ remarks : "tripId"
  users ||--o{ remarks : "actorId, reviewedBy, notice.recipientIds"
  users ||--o{ authhandoffs : "userId"
  users ||--o{ mutationledgers : "actorId"

  users {
    string employeeId UK
    string email UK
    string name
    string role "dispatcher|loader|driver|store_manager"
    string passwordHash "argon2, never selected"
    string outletId "store managers"
    string depot "loaders, drivers"
    string phoneE164 "optional"
    bool active
  }
  outlets {
    string outletId UK "OUT001..."
    string brand "Fresh|Style|Tech"
    string district
    string depot
    string windowOpenTime
    string windowCloseTime
    object coordinates "optional"
  }
  vehicles {
    string vehicleId UK "VEH001..."
    string type
    string temperatureClass "reefer|ambient"
    number weightCapacityKg
    number volumeCapacityM3
    number kmPerL
    number weeklyFuelQuotaL
    string depot
  }
  products {
    string sku UK
    string brand
    string unit
    number weightKg
    number volumeM3
    string temperatureClass
    bool fragile
  }
  calendardays {
    string date UK "YYYY-MM-DD"
    bool isOperating
    bool isHoliday
    bool isPayday
  }
  orders {
    string orderNumber "ORD-yymmdd-nnnnnn"
    string outletId
    objectId storeManagerId
    string orderType
    string requestedDate "YYYY-MM-DD"
    string cutoffBucket "before_cutoff|after_cutoff"
    array items "product snapshot: sku, name, quantity, weight, volume"
    string status "submitted..delivered"
    objectId allocatedTripId
    array statusHistory
  }
  trips {
    string tripNumber "TRP-yyyymmdd-nnnnnn"
    string serviceDate
    date departureAt
    string depot
    string vehicleId
    objectId driverId
    string status "draft..completed"
    array stops "tripStopId, orderIds, outletId, sequence, plannedArrivalAt"
    date startedAt
    date completedAt
    date acceptedAt "dispatcher acceptance"
    object lastLocation
    array statusHistory
  }
  loadrecords {
    objectId tripId UK
    string depot
    string status "available|claimed|loading|reconciled|confirmed"
    objectId claimedBy
    array items "itemId, tripStopId, expected, loaded, status, exception"
    array planChanges
  }
  delivery_records {
    objectId tripId
    objectId tripStopId
    string outletId
    objectId driverId
    string status "pending|arrived|delivered|failed|receipt_confirmed|receipt_issue"
    string outcome "delivered|partial|refused|closed|failed"
    date arrivedAt
    date completedAt
    string timingResult "on_time|late"
    object proof "PIN verification state"
    object receipt "store receipt"
    array items "expected, delivered, short, damaged"
  }
  delivery_pin_challenges {
    objectId deliveryRecordId
    string pinHash "HMAC-SHA256"
    number attempts
    number maxAttempts "3"
    string status "issued|verified|locked|expired|revoked"
    date expiresAt
  }
  trip_locations {
    string pointId UK
    objectId tripId
    objectId driverId
    point location "GeoJSON [lng, lat]"
    number speed "m/s"
    date recordedAt
    date receivedAt
  }
  file_assets {
    string publicId UK "Cloudinary id"
    string kind "start_meter|end_meter|evidence"
    objectId ownerId
    objectId tripId
    objectId deliveryId
    number bytes
  }
  remarks {
    objectId tripId
    objectId stopId "trips.stops.tripStopId"
    string itemId "loadrecords.items.itemId"
    objectId actorId
    string actorRole
    string text
    string status "pending|reviewed"
    string reviewResponse
    object notice "text, sentAt, recipientIds"
  }
  operationalevents {
    string eventType "e.g. delivery.completed"
    string entityType
    string entityId
    objectId actorId
    object scope "outletIds, depot, tripId, driverId"
    mixed data
  }
  mutationledgers {
    string mutationId
    string namespace "api|sync"
    objectId actorId
    string result "applied|duplicate|conflict|rejected"
  }
  authhandoffs {
    string codeHash UK
    objectId userId
    string intendedOrigin
    date expiresAt
    date consumedAt
  }
  counters {
    string _id "sequence name"
    number seq
  }
```

### How the data is connected

| From | To | Link | Notes |
| --- | --- | --- | --- |
| `orders` | `outlets`, `users`, `products` | `outletId` (business id), `storeManagerId`, `items.productId` | Items **snapshot** name, unit, weight, volume and temperature class at order time, so later catalogue edits cannot change a placed order. |
| `orders` | `trips` | `allocatedTripId` and `trips.stops[].orderIds` | Both directions are kept; a stop can carry several orders for the same outlet. |
| `trips` | `vehicles`, `users` | `vehicleId` (business id), `driverId`, `dispatcherId`, `claimedByDriverId` | At most two routes per vehicle per day (`vehicleId + serviceDate + routeIndex`); drivers are not limited this way. |
| `loadrecords` | `trips` | `tripId` (unique, one per trip) | The loader is `claimedBy`, so a trip has at most one loader. `items[].tripStopId` ties each load line to a trip stop. |
| `delivery_records` | `trips` | `tripId + tripStopId` (unique) | One per stop; arrival/completion timestamps and the receipt live here, not on the trip's embedded stop. |
| `delivery_pin_challenges` | `delivery_records` | `deliveryRecordId` | A partial unique index allows only one `issued` PIN per delivery. Only the hash is stored. |
| `trip_locations` | `trips` | `tripId` | Append-only GPS history, 2dsphere indexed; the newest row drives live tracking. |
| `file_assets` | `trips`, `delivery_records` | `tripId`, `deliveryId` | Metadata only; the image lives in Cloudinary. |
| `remarks` | `trips`, stop, load item | `tripId`, `stopId`, `itemId` | Loader exceptions join to their load lines through `tripId + itemId`. `notice.recipientIds` is the inbox read by `GET /notices`. |
| `operationalevents` | any entity | `entityType + entityId` (loose) | Append-only audit trail; never updated. Remarks are **not** events, but create and review each emit one. |

Business keys: outlets and vehicles are referenced by their official string ids (`OUT###`, `VEH###`) everywhere; documents that belong to the running system (users, orders, trips, records) use ObjectIds.

### Status models

- **Order** (`orders.status`): `submitted` -> `allocated` -> `loading` -> `load_confirmed` -> `in_transit` -> `delivered`, with `deferred`, `delivery_failed` and `cancelled`. There is no "arrived" order status; arrival lives in `delivery_records.status`.
- **Trip**: `draft` -> `published` -> `loading` -> `load_confirmed` -> `claimed` -> `in_transit` -> `completed` (or `cancelled`). Dispatcher acceptance is recorded as `acceptedAt` / `acceptedBy` without changing the status.
- **Delivery record**: `pending` -> `arrived` -> `delivered` or `failed` -> `receipt_confirmed` or `receipt_issue`.
- **Remark**: `pending` -> `reviewed` (optionally with a notice to named users).

The order timeline shown to the Store Manager is derived on read from these records by `deriveOrderLifecycle`, so there is one source of truth for it.

### Integrity and consistency

- **Transactions.** Multi-document changes (creating and publishing trips, confirming a load, completing a stop, placing an order) run in MongoDB transactions, which is why MongoDB runs as a replica set even locally.
- **Optimistic concurrency.** `trips`, `loadrecords`, `delivery_records` and `delivery_pin_challenges` carry a `version`; writers send `expectedVersion` or `If-Match`, and a stale write gets a 409 instead of overwriting.
- **Idempotency.** `mutationledgers` records each offline/sync mutation by `mutationId`, so a replayed request returns the original result.
- **Uniqueness.** Unique indexes enforce the one-load-record-per-trip, one-delivery-record-per-stop and one-active-PIN rules in the database itself, not only in code.
- **Append-only audit.** `operationalevents` rows are only inserted. State lives in the entity documents; events describe what happened.
- **Secrets.** Passwords are argon2 hashes with `select: false`; PINs and handoff codes are stored only as hashes.
- **Sequences.** `counters` allocates the readable numbers (`ORD-...`, `TRP-...`).

### Reference data and seeding

`outlets`, `vehicles`, `calendardays` and `products` are loaded from `Drive Data/*.csv` and `CSC/products.demo.csv` by the seed after a preflight check that fails loudly on missing columns. The travel, traffic, road-condition and service-allowance tables are not stored in MongoDB: the route engine reads them from `REFERENCE_DATA_DIR` at runtime. The seed also creates the seven demo users (see the README) and, in the demo scenario, a window of synthetic calendar days.
