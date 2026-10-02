# FOLDER STRUCTURE BASELINE

## 1. Git Baseline
- **Current Branch**: `folder-structure`
- **Current Commit SHA**: `f0b065b`
- **Git Status**: 
  - Uncommitted changes (Staged for deletion): `COMPREHENSIVE_IMPLEMENTATION_PLAN.md`, `COMPREHENSIVE_IMPLEMENTATION_PLAN_V2.md`, `IMPLEMENTATION_STATUS.md`
- **Recent Commits**:
  - `f0b065b fix: set ownership for reference-data in Dockerfile`
  - `1e0fb6a fix: make compose seed portable across hosts`
  - `7afb646 feat: validate demo data and repair compose seed flow`
- **Branch Relationship**: `folder-structure` is derived directly from `codex_2` (both at `f0b065b`).
- **Changes relative to base**: Contains no source code modifications relative to its base yet, only the aforementioned documentation deletions in the staging area.

## 2. Actual Repository Tree
Top-level structures identified:
```text
/
├── .vscode/
├── backend/            # Consolidated Node.js backend
├── CSC/                
├── delivery-driver/    # Frontend: React/Vite
├── dispatcher/         # Frontend: React/Vite
├── docker/             
├── docs/               
├── Drive Data/         
├── frontend/           
├── loader/             # Frontend: React/Vite
├── Login/              # Frontend: React/Vite
└── Store-Manager/      # Frontend: React/Vite
```

## 3. Backend Structure
Backend source code resides in `backend/src/`.
- **Top-level files**: `app.ts`, `server.ts`, `app.test.ts`
- **Directories**: `common/`, `config/`, `database/`, `modules/`, `types/`
- **Modules (`backend/src/modules/`)**: 
  - `auth`, `driver`, `files`, `loading`, `operations`, `orders`, `planning`, `reference`
- **Module Internal Structure**: 
  - Modules do not contain nested models, repositories, or schemas. They primarily contain `routes.ts`, `services.ts`, and occasional domain logic (e.g. `constraints.ts` in `planning`).
  - **Ownership**: Decentralized routing logic, centralized database model coupling.

## 4. Frontend Structure
Frontends (`Login`, `dispatcher`, `loader`, `delivery-driver`, `Store-Manager`):
- All utilize a Vite + React application architecture (`src/`, `public/`).
- API consumption relies on standard `fetch` API.
- Rely on environment variables `VITE_API_URL` to connect to the monolith base URL.
- Auth tokens are injected as `Bearer ${session.accessToken}` headers.

## 5. Route Inventory
Extracted from `backend/src/modules/*/routes.ts`:
- **Auth**: `/auth/login`, `/auth/verify-handoff`
- **Reference**: `/reference/outlets`, `/reference/vehicles`, `/reference/drivers`, `/catalog/products`, `/calendar/:date`
- **Orders**: `/orders`, `/orders/:orderId`, `/store/order-history`
- **Planning**: `/planning/orders`, `/planning/trips`, `/planning/trips/:tripId/validate`, `/planning/trips/:tripId/publish`, `/orders/:orderId/defer`, `/orders/defer-batch`, `/trips/:tripId`
- **Loading**: `/load-jobs`, `/load-jobs/:tripId`, `/load-jobs/:tripId/claim`, `/load-jobs/:tripId/unclaim`, `/load-jobs/:tripId/start-loading`, `/load-jobs/:tripId/reconcile`, `/load-jobs/:tripId/confirm`
- **Operations**: `/store/dashboard`, `/store/deliveries`, `/store/deliveries/:deliveryId`, `/monitor/trips`, `/audit/orders`
- **Driver**: `/driver/routes/today`, `/driver/assignments/:tripId/claim`, `/trips/:tripId/start`, `/trips/:tripId/location-batch`, `/trips/:tripId/stops/:stopId/arrive`, `/store/deliveries/:deliveryId/pin`
- **Files**: `/files/upload-signature`, `/files/complete`, `/files/:fileId`

## 6. Model Inventory
All Mongoose schemas are centralized in `backend/src/database/models/index.ts`:
| Model | Collection | Current Location |
|-------|------------|------------------|
| `User` | users | `database/models/index.ts` |
| `AuthHandoff` | authhandoffs | `database/models/index.ts` |
| `Outlet` | outlets | `database/models/index.ts` |
| `Vehicle` | vehicles | `database/models/index.ts` |
| `CalendarDay` | calendardays | `database/models/index.ts` |
| `Product` | products | `database/models/index.ts` |
| `Order` | orders | `database/models/index.ts` |
| `Trip` | trips | `database/models/index.ts` |
| `LoadRecord` | loadrecords | `database/models/index.ts` |
| `DeliveryRecord` | deliveryrecords | `database/models/index.ts` |
| `TripLocation` | triplocations | `database/models/index.ts` |
| `OperationalEvent`| operationalevents | `database/models/index.ts` |
| `FileAsset` | fileassets | `database/models/index.ts` |
| `IdempotencyRecord`| idempotencyrecords | `database/models/index.ts` |
| `SyncReceipt` | syncreceipts | `database/models/index.ts` |

## 7. Frontend/Backend Dependency Map
Frontends interact with endpoints utilizing `import.meta.env.VITE_API_URL`.
- **Login**: Auth Endpoints
- **dispatcher**: Planning, Reference, Monitor Trips
- **loader**: Load-Jobs, Files
- **delivery-driver**: Driver assignments, Offline sync receipts, Locations, Files
- **Store-Manager**: Store dashboard, Catalog products, Order creation

## 8. Cross-Module Dependency Map
**Analysis**: 0 direct cross-module imports detected.
- Modules do **not** import other modules directly (e.g. `import from "../../modules/operations"`).
- All inter-domain dependencies flow downwards into shared directories: `../../common/` (auth, errors, idempotency) and `../../database/models/index.js` (schemas).
- **Classification**: SAFE. Modules are decoupled from each other at the module folder level, heavily coupled at the DB layer.

## 9. Current vs Target Structure
Based on target blueprint directories:
- `backend/src/app/`: **MISSING** (Currently scattered at `backend/src/app.ts` & `backend/src/server.ts`). Needs Move.
- `backend/src/config/`: **EXISTS**.
- `backend/src/db/`: **MISSING** (Currently uses `backend/src/database/`). Needs Move.
- `backend/src/common/`: **EXISTS**.
- `backend/src/contracts/`: **MISSING**.
- `backend/src/modules/`: **EXISTS**.
- `backend/src/types/`: **EXISTS**.
- `backend/database/`: **MISSING**.
- `backend/tests/`: **MISSING**.
- `backend/docs/`: **MISSING**.

## 10. Existing Verification Results
Commands executed via `npm run` in `backend/`:
- `typecheck` (tsc --noEmit): **PASS**
- `test` (vitest run): **PASS** (4 test suites passed)
- `build`: **PASS**

## 11. Structural Risks
Dangerous files to modify during early refactoring:
- **HIGH CONFLICT**: `backend/src/database/models/index.ts` (Central dependency for all modules)
- **HIGH CONFLICT**: `backend/src/app.ts`, `backend/src/server.ts` (Entry point and route mapping)
- **MEDIUM CONFLICT**: `backend/src/modules/*/routes.ts`
- **LOW CONFLICT**: Frontend API clients (Uses environment variables, isolated from backend restructure)

## 12. FOUND-01 Implementation Boundary
**What FOUND-01 should create**:
- `backend/src/app/` folder.
- `backend/src/db/` folder.

**What should be moved in FOUND-01**:
- Relocate `app.ts` and `server.ts` into `backend/src/app/`.
- Relocate `database/` contents into `backend/src/db/` and rename imports.

## 13. Explicit files NOT to touch yet
- Do **NOT** modify or split `backend/src/database/models/index.ts` (only update its path reference if moved).
- Do **NOT** modify frontend applications (`loader`, `Store-Manager`, `Login`, etc.).
- Do **NOT** alter existing `routes.ts` logic.

## 14. Recommended Next Step
Proceed with **FOUND-01: Application and Database Layer Relocation** to establish the base `src/app/` and `src/db/` structure, ensuring all tests pass without altering application behavior.
