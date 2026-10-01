# WayLink deployment runbook

## Required inputs

- A MongoDB replica-set connection string.
- A random JWT secret of at least 32 characters.
- Exact HTTPS origins for Login, Dispatcher, Loader, Driver, and Store Manager.
- The official CSC product CSV with the columns documented by the seed error output.
- The reference CSV directory from `Drive Data`.

## Local Compose

1. Copy `.env.example` to `.env` and set `JWT_SECRET`.
2. Place the approved CSC export under `CSC/` and set `CSC_PRODUCTS_FILE=/csc/<filename>.csv`.
3. Keep `ALLOW_DEMO_PRODUCTS=false`. Enable it only for an explicitly approved non-production demo.
4. Run `docker compose config`.
5. Run `docker compose up --build`.
6. Confirm `http://localhost:3000/health/ready` and each web `/health` endpoint.
7. Open Login at `http://localhost:5173`.

The local services use separate origins specifically to exercise the real CORS and one-time handoff flow.

## Production order

1. Deploy MongoDB and prove transaction support.
2. Deploy the API with production `NODE_ENV`, MongoDB URI, JWT secret, and exact five origins.
3. Run the reference/user seed once and retain its JSON report.
4. Deploy each frontend with `VITE_API_BASE_URL` and the final Login/role origins.
5. Smoke-test login and handoff for all roles.
6. Run the end-to-end operational scenario before freezing the release.

## Limitations

- This workstation does not currently have Docker or MongoDB installed, so Compose and replica-set transaction execution must be verified on a Docker/Atlas-capable host.
- `CSC_PRODUCTS_FILE` remains mandatory unless the explicit demo fixture switch is enabled.
