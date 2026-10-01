# WayLink hackathon system

WayLink is a multi-application delivery planning and execution system. A Fastify API and MongoDB database support five React applications for the operational roles.

## Applications

| Application | Directory | Local port | Purpose |
| --- | --- | ---: | --- |
| API | `backend` | 3000 | Authentication, planning, loading, delivery and audit APIs |
| Login | `Login` | 5173 | Shared role-aware sign-in |
| Dispatcher | `dispatcher` | 5174 | Order review, planning and dispatch |
| Loader | `loader` | 5175 | Load claiming, scanning and handoff |
| Driver | `delivery-driver` | 5176 | Route execution and delivery proof |
| Store Manager | `Store-Manager` | 5177 | Store ordering and delivery visibility |

## Prerequisites

- Node.js 24 or newer
- npm 11 or newer
- Docker with Compose support for the integrated environment

The repository standardizes on npm and the committed `package-lock.json` in each package. Do not introduce a second package-manager lockfile.

## Install and verify

Install every package from its lock file:

```powershell
npm run bootstrap
```

Run backend type checking and tests, then build the backend and all frontends:

```powershell
npm run verify
```

Individual builds are available as `build:backend`, `build:login`, `build:dispatcher`, `build:loader`, `build:driver` and `build:store`.

## Environment configuration

Copy `.env.example` to `.env` for Docker Compose. Each application also has its own `.env.example` for direct local development.

- Backend variables such as `MONGODB_URI`, `JWT_SECRET` and Cloudinary credentials are read at API runtime.
- Variables beginning with `VITE_` are embedded into a frontend at build time. Rebuild that frontend after changing them.
- `VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE` and `VITE_USE_MOCK_AUTH` must remain `false` outside explicit prototype sessions.
- `VITE_SERVICE_DATE` exists to make the hackathon demo deterministic. Production deployments should omit it and use the server/calendar date policy.

Never commit a real `.env` or production secret.

## Docker Compose

After environment and seed-data setup:

```powershell
docker compose config
docker compose build
docker compose up -d
docker compose ps
```

The integration stack includes MongoDB, replica-set initialization, deterministic seed execution, the API and all five web applications. See `COMPREHENSIVE_IMPLEMENTATION_PLAN_V2.md` for the remaining ordered implementation and verification work.

## Documentation

- `SYSTEM_REQUIREMENTS_AND_ARCHITECTURE.md` — required behavior and architecture
- `COMPREHENSIVE_IMPLEMENTATION_PLAN_V2.md` — current execution plan
- `IMPLEMENTATION_STATUS.md` — historical implementation snapshot; update it only after verified milestones
