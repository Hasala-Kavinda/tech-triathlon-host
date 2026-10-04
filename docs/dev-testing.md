# Dev testing: lifecycle scenarios

Use this instead of hand-editing MongoDB when you need an order, trip, load job or delivery in a particular state
for the Store Manager, Dispatcher, Loader or Driver screens.

It creates a complete, consistent chain (**order -> trip -> load record -> delivery records -> file assets**) up to the stage
you ask for. It does this by calling the **real API routes** as each real seeded user (Store Manager, Dispatcher, Loader,
Driver), so authentication, validation, transactions, audit and every business rule run exactly as in the app. It only
controls **inputs**: the stage, which seeded outlet/vehicle/driver/loader to use, and a simulated submission time. It never
skips a rule. If a real rule rejects a step, you get that step's real error back and everything created so far.

## Safety

- The endpoint (`POST /api/v1/dev/seed-scenario`) is **not registered at all** unless the API runs with `NODE_ENV=development`.
  With `NODE_ENV=production` or `test` it is a plain 404. Docker compose runs the API with `NODE_ENV=development`.
- Even in development it needs a Dispatcher login.
- It does not weaken or add exceptions to the cutoff, window or validation logic. The only production-code change is a time
  source (`backend/src/common/clock.ts`): the rules that read "now" (16:00 order cutoff, the Driver's "today", PIN expiry) call
  `clock.now()`, which is the real clock unless the scenario tool runs a request "as of" another instant (scoped to that request).

## Use

The API must be running (for example `docker compose up -d`). From `backend/`:

```bash
npm run scenario -- --stage load_confirmed
npm run scenario -- --stage load_confirmed --outlet OUT002 --driver DRV-3001
npm run scenario -- --stage receipt_confirmed --as-of 2026-10-04T14:00:00+05:30 --service-date 2026-10-06
```

Stages: `submitted`, `scheduled`, `load_confirmed`, `in_transit`, `arrived` (driver recorded arrival; no PIN yet), `delivered`, `receipt_confirmed`.

| Option | Meaning |
|---|---|
| `--outlet OUT001` | Seeded outlet; its Store Manager submits the order (seeded: `OUT001` / `STM-4001`, `OUT002` / `STM-4002`). |
| `--order-type`, `--sku`, `--quantity` | Order content (defaults: a `dry` product, 4 units). |
| `--vehicle VEH037` | Force a vehicle (default: the route engine's best eligible vehicle for the order). |
| `--driver DRV-3001` | Force a seeded Driver (default: the real assignment rule - depot match, free, fewest trips that day). |
| `--loader LDR-2001` | Seeded Loader (default: a Loader at the trip's depot). |
| `--as-of <ISO>` | Pretend the order is submitted at this instant, e.g. `2026-10-03T14:00:00+05:30`. The real cutoff rule evaluates against it. |
| `--service-date YYYY-MM-DD` | Delivery day, sent as the order's `requestedDate`. |
| `--departure HH:mm` | Style/Tech departure (Fresh departs per its own window). |
| `--arrived-at`, `--completed-at` | Device times at the stops; the real timing logic decides `on_time` / `late`. |
| `--api http://localhost:3000` | API base URL. `--dispatcher/--password/--email` override the seeded Dispatcher login. |

The output lists what was created (order number, trip number, assigned driver) and the **current status of every document**,
read back from the database, so you can go straight to the matching role's screen.

## Getting the real rules instead of the dev relaxations

The API's `DEV_MODE` (compose default `true`) relaxes the operating-day, Fresh-deadline and earliest-delivery-day rules so
everything can be tried at any time. To make a scenario run under the **strict** rules, start the API with `DEV_MODE=false`
(for example `DEV_MODE=false docker compose up -d api`) and pass `--as-of` and `--service-date`. For example, on a Sunday:

```bash
# Real rule rejects this: submitted Sun 14:00, Sunday delivery  -> REQUESTED_DATE_TOO_EARLY
npm run scenario -- --stage submitted --as-of 2026-10-04T14:00:00+05:30 --service-date 2026-10-04
# Real rule accepts this: next operating day (Monday)
npm run scenario -- --stage submitted --as-of 2026-10-04T14:00:00+05:30 --service-date 2026-10-05
```

## Things to know

- A Driver only sees a trip in "routes today" when the trip's service date is **today** (Colombo) and its status is
  `load_confirmed`, `claimed` or `in_transit`. For Driver screens use today's date (leave out `--service-date`) and stage
  `load_confirmed` or later.
- `in_transit` and later stages upload real start/end meter photos through the real Cloudinary flow, so Cloudinary must be
  configured with a key that may upload (see `docs/demo-runbook.md`). A tiny 1x1 test image is stored per photo.
- Two scenarios on the same day can collide through real rules (for example both Fresh trips at 03:30 need different drivers;
  a Driver cannot have overlapping trips). That is the real validation talking - pick another driver/day, or use other data.
- The Driver's arrival/completion times at a stop default to the stop's **planned** arrival time (so the delivery is `on_time` by construction).
  In an off-hours test that can be earlier than the "On the way" stamp, which is the real time the trip started. Pass `--arrived-at`
  / `--completed-at` to choose them (a late arrival makes the real timing logic mark the delivery `late`).
- Test data is not cleaned up automatically. Scenario orders are ordinary orders (`ORD-...`).
