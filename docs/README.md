# WayLink

WayLink is a delivery planning and execution system for Waypoint Group, built for the Tech-Triathlon 2026 Designathon. One Fastify API and one MongoDB database serve five web apps (a shared login plus one app per operational role), so an order is the same record from the shop that places it to the driver who delivers it.

```
Store Manager --order--> Dispatcher --trip--> Loader --load confirmed--> Driver --PIN + delivery--> Store Manager (receipt)
                              ^                                              |
                              +----------- remarks, tracking, audit ---------+
```

## Contents

1. [Applications](#applications)
2. [Quick start (Docker)](#quick-start-docker)
3. [Configuration](#configuration)
4. [Local development without Docker](#local-development-without-docker)
5. [Seeded accounts and data](#seeded-accounts-and-data)
6. [Judge walkthrough](#judge-walkthrough)
7. [Architecture and data model](docs/architecture.md)
8. [Departures from the Designathon submission](#departures-from-the-designathon-submission)
9. [Known limitations](#known-limitations)
10. [Further documentation](#further-documentation)

## Applications

| Application | Directory | URL | Purpose |
| --- | --- | --- | --- |
| API | `backend` | http://localhost:3000 | Auth, planning, loading, delivery, remarks and audit (`/api/v1`) |
| Login | `Login` | http://localhost:5173 | Shared sign-in; hands the session to the right role app |
| Dispatcher | `dispatcher` | http://localhost:5174 | Order review, route suggestion, scheduling, live route monitoring, remark review |
| Loader | `loader` | http://localhost:5175 | Claim a load, account for every item, confirm the load |
| Driver | `delivery-driver` | http://localhost:5176 | Route execution, GPS tracking, PIN proof, offline queue |
| Store Manager | `Store-Manager` | http://localhost:5177 | Ordering, order timeline, delivery PIN, receipt |

## Quick start (Docker)

Prerequisites: Docker with Compose. (Node.js 24+ and npm 11+ are only needed for the optional local workflow and the scenario tool.)

1. **Create the environment file.** Copy `.env.example` to `.env` in the repository root.
2. **Add Cloudinary credentials to `.env`** (free account; Settings -> API Keys). Driver meter photos and receipt evidence are uploaded there, and the API refuses to start while these are empty or still placeholders:
   ```
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```
   The API key needs permission to create (upload) assets.
3. **Start everything:**
   ```powershell
   docker compose up -d --build
   docker compose ps
   ```
   Compose starts MongoDB as a replica set (transactions require it), runs the seed, then the API and the five web apps.
4. **Check health.** `http://localhost:3000/health/ready` should report ready and every app in the table above should load.
5. **Open the Login app** at http://localhost:5173 and sign in with an account below.

To wipe all data and re-seed: `docker compose down -v` then `docker compose up -d --build`.

## Configuration

Root `.env` (read by Docker Compose; copy from `.env.example`):

| Variable | Default | Meaning |
| --- | --- | --- |
| `JWT_SECRET` | example value | Signing secret, 32+ characters. Change it outside a local demo. |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | placeholders | **Required.** The API will not boot without real values. |
| `DEV_MODE` | `true` | Relaxes the order-date, closed-day and Fresh-deadline rules so the flow can be tested on any day. Set `false` for the real rules. The API refuses `true` when `NODE_ENV=production`. |
| `SEED_DEMO_SCENARIO` | `true` | Adds 124 synthetic calendar days around the seed date (see below). |
| `CSC_PRODUCTS_FILE` | `/csc/products.demo.csv` | Product catalogue the seed imports. |
| `ALLOW_DEMO_PRODUCTS` | `false` | Explicit opt-in to demo (`DEMO-`) products outside the standard fixture. |

Notes:

- Variables beginning with `VITE_` are baked into a front end at build time; rebuild that app after changing one (`docker compose up -d --build <service>`).
- `VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE` and `VITE_USE_MOCK_AUTH` must stay `false`.
- Real `.env` files are git-ignored. Never put real secrets in any `.env.example`.
- Compose runs the API with `NODE_ENV=development`, which also enables the dev scenario tool (see the walkthrough). It is not registered in any other environment.
- Time zone is Asia/Colombo; the order cutoff is 16:00 local time.

## Local development without Docker

```powershell
npm run bootstrap        # npm ci in every package
npm run data:preflight   # validate the reference CSVs (Drive Data/, CSC/)
npm run verify           # typecheck + backend tests + all builds
```

Run the backend with a MongoDB **replica set** reachable at `MONGODB_URI` and `backend/.env` copied from `backend/.env.example` (same Cloudinary variables), then `npm --prefix backend run dev`. Each front end has its own `.env.example`; start one with `npm --prefix <dir> run dev`. Backend tests that touch the database need the replica set and will time out against a standalone MongoDB.

## Seeded accounts and data

Sign in at the Login app with **employee ID, the recorded email, and the password**. Demo data only; do not reuse these anywhere real.

| Role | Employee ID | Email | Password | Notes |
| --- | --- | --- | --- | --- |
| Dispatcher | `DSP-1001` | `nuwan.perera@waypoint.lk` | `Dispatch@123` | |
| Loader | `LDR-2001` | `kasun.silva@waypoint.lk` | `Loader@123` | Peliyagoda depot |
| Loader | `LDR-2002` | `amal.perera@waypoint.lk` | `Loader@123` | Peliyagoda depot |
| Driver | `DRV-3001` | `ruwan.fernando@waypoint.lk` | `Driver@123` | Peliyagoda depot |
| Driver | `DRV-3002` | `ishara.senanayake@waypoint.lk` | `Driver@123` | Peliyagoda depot |
| Store Manager | `STM-4001` | `dilani.j@waypoint.lk` | `Store@123` | Outlet `OUT001` |
| Store Manager | `STM-4002` | `chathuri.r@waypoint.lk` | `Store@123` | Outlet `OUT002` |

Reference data comes from the challenge CSVs in `Drive Data/`: 120 outlets (`OUT001`-`OUT120`; Fresh, Style and Tech brands across the Peliyagoda and Kandy depots), 60 vehicles (`VEH001`-`VEH060`, reefer and ambient) and the travel, traffic, road-condition and service-allowance tables the route engine uses. The product catalogue is `CSC/products.demo.csv`: four `DEMO-` SKUs, deliberately labelled as a non-authoritative fixture.

The challenge calendar ends in June 2026, so with `SEED_DEMO_SCENARIO=true` the seed adds synthetic days (3 back, 120 ahead of the seed date): Monday to Saturday operate, Sunday is closed, no holidays.

## Judge walkthrough

The full flow below takes roughly 15 minutes. Use a separate browser profile or window per role. Keep `DEV_MODE=true` (the default) so it works on any day, including Sundays and after the 16:00 cutoff.

### Fast path: put the system in any state

Instead of walking every step, create an order/trip/delivery already at a stage, using the real API routes as the real users (needs Node.js, from `backend/`):

```powershell
npm --prefix backend run scenario -- --stage in_transit --outlet OUT002 --loader-exception
```

Stages: `submitted`, `scheduled`, `load_confirmed`, `in_transit`, `arrived`, `delivered`, `receipt_confirmed`. It never bypasses a business rule; if a real rule rejects a step it prints that error. See `docs/dev-testing.md`.

### Full path

1. **Store Manager places an order.** Sign in as `STM-4002`. Choose New order, pick a delivery date (in dev mode the offered dates include today and closed days, marked), add a catalogue product and submit. The order appears in Order history with a status timeline.
2. **Dispatcher reviews demand.** Sign in as `DSP-1001`. The Home calendar widget shows due orders for today and the next days, filterable by brand (Fresh / Tech / Style). Open "Schedule orders" for the day.
3. **Route suggestion and scheduling.** Choose a vehicle (the list shows why a vehicle is unavailable, e.g. wrong temperature class or no capacity), let the engine suggest a pack of orders and a stop order, adjust if you like, and create the trip. Failed constraints are shown with the reason in plain words. Assign a driver (the engine picks a free driver at the same depot) and publish.
4. **Loader loads the trip.** Sign in as `LDR-2001`. Claim the load (confirm the prompt), start loading, mark each item loaded or flag a missing/damaged exception, reconcile, and confirm. The trip becomes `load_confirmed`.
5. **Driver starts the route.** Sign in as `DRV-3001` or the driver the engine assigned (shown on the trip). Claim the trip, confirm the vehicle, take the start-meter photo (uploaded to Cloudinary) and start. Keep this tab in the foreground: GPS positions are sampled and queued.
6. **Arrival and unpacking.** At the stop, press "I've arrived", then check each item off. Use "Report a remark to dispatch" if something is wrong.
7. **PIN proof.** As the Store Manager, open the order and press **Issue PIN** (a 4-digit PIN is shown once and is not retrievable afterwards). The driver enters it; three wrong attempts lock it and the Store Manager must issue a new one. Complete the stop.
8. **Offline behaviour (optional).** In the Driver app, switch the browser to offline, complete work, then go back online and watch the queue sync.
9. **Finish and receipt.** The driver takes the end-meter photo and finishes the trip. The Store Manager confirms the receipt (full, or with an issue, which becomes a remark for the dispatcher).
10. **Dispatcher monitors and reviews.** Open the route from Home to see **Route monitoring**: crew hover cards, a click-through live position for the driver (real last tracked point, speed, and a live / delayed / not-synced state), real stop progress, and the **Remarks** badge. Open Review remarks (loader exceptions show the linked flagged items), send a notice to the driver and/or mark reviewed, then **Accept route**, which is disabled until every remark is reviewed. The driver sees the notice as a banner on their dashboard. For a finished route, Route summary shows planned vs actual times.

Shortcut: run the fast-path scenario command above, then go straight to step 10 to see monitoring and remark review without doing steps 1-9.

## Departures from the Designathon submission

The submission defined the look, layout and screens of the four role apps (`dispatcher/src/imports/WayLink_Design_System.md`) with prototype data. Turning it into a working system required these significant changes. The reasoning for most is recorded in `SYSTEM_REQUIREMENTS_AND_ARCHITECTURE.md`, section 21.

| Area | Submission / prototype | This implementation | Why |
| --- | --- | --- | --- |
| Data | Hardcoded mock orders, routes, people | One MongoDB-backed source of truth; the same order, trip and delivery records feed every role | One record, four views |
| Identifiers | Mock ids and plates (`WP LB-4521`, `ORD-1045`) | Official `OUT###` / `VEH###` ids from the challenge CSVs | Mock ids cannot be validated |
| Outlets | Friendly shop names | Synthetic or id-based display names; no coordinates in the data | The outlet CSV has no names or coordinates |
| Products | Invented product names per app | Single catalogue (`CSC/`), demo fixture with `DEMO-` SKUs | One product master; approved CSC extract not supplied |
| Sign-in | Mock users; forgot-password / OTP screens | Employee ID + recorded email + password, with a one-time cross-origin handoff code; forgot-password and login OTP removed | Five separate origins, no shared cookies |
| Delivery PIN | A fixed PIN shown in screens | Server-generated 4-digit PIN, hashed at rest, shown once to the Store Manager, three attempts, one active PIN per delivery | Fixed PINs were inconsistent across screens and unsafe |
| Delivery outcomes | Checklist only | Delivered, partial, refused, closed and failed, with arrival and completion timing (on time / late) | Real deliveries have more outcomes |
| Scheduling | Manual drag of orders onto a vehicle | A deterministic route suggestion engine (rule-based, 22 rules: capacity, temperature class, windows, drive time, fuel, turns) used by the Dispatcher, with every failed rule explained | Valid plans cannot depend on eyeballing |
| Route monitoring | Static page: two loaders, fixed times, a demo "Synced / Not synced" toggle | One real page for any trip: the real driver and the loader who claimed the load (one per trip), real stops and arrivals, a sync state computed from the last GPS point, no toggle | Nothing in the page may be fake |
| Remarks | Remarks and notices lived only in screen state | Loader exceptions, store receipt issues, failed or partial stops and free-text driver remarks are stored, reviewed by the Dispatcher and gate **Accept route**. A "notice" is delivered to the driver's dashboard banner (polled), not by push or SMS | Needed an auditable path between roles |
| Tracking | Live map | Positions are polled every 15 s; the map is schematic (no tile map or reverse geocoding), and "near ..." falls back to the next stop's district | Outlet coordinates are not provided; a web PWA cannot track while suspended |
| Photos | Placeholder images | Real Cloudinary uploads for meter photos; the Store Manager's "Add photo" on receipts is still a placeholder | See limitations |
| Time rules | Fixed prototype date | Asia/Colombo clock with the 16:00 order cutoff; a **development mode** and a **dev scenario tool** (both disabled outside development) that relax date rules or create data in any lifecycle stage | Lets judges test on any day without weakening production logic |
| Calendar | Prototype dates | Synthetic Monday-Saturday calendar around the seed date | Challenge calendar ends 2026-06-28 |

## Known limitations

- The Store Manager receipt "Add photo" button is a placeholder; receipts are saved without evidence files.
- The Kandy depot has outlets and vehicles but no seeded driver or loader; in development mode the driver picker falls back to other depots.
- Crew phone numbers are optional and none are seeded, so hover cards show "No phone on file" until a number is stored on the user (`phoneE164`).
- A stop completed through the Driver app's offline sync path does not raise a remark automatically.
- The Order Log route text and some Dispatcher home items are still sample content.
- Browsers suspend background tabs; keep the Driver app in the foreground for tracking, or expect a "Tracking degraded" state.
- Verification so far is API-level, builds and unit tests; the user interfaces have not been exercised in an automated browser run.

## Further documentation

- `docs/architecture.md` - architecture diagram, lifecycle sequence and data model
- `docs/demo-runbook.md` - demo accounts and pre-demo checks
- `docs/dev-testing.md` - the dev scenario tool
- `docs/deployment-runbook.md` - deployment inputs and Compose notes
- `SYSTEM_REQUIREMENTS_AND_ARCHITECTURE.md` - requirements, data model, API contract and decisions
- `WayLink Database Development Plan — Four Roles and Cross-Role Flows.md` - collections and cross-role handoffs
- `dispatcher/src/imports/WayLink_Design_System.md` - the submitted design system
