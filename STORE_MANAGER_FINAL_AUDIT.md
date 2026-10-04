# STORE MANAGER FINAL AUDIT

## 1. Hardcoded Data Audit

A comprehensive search of the source tree for application data (`Dilini`, `ORD-1045`, `ORD-1065`, `Thursday, 1 October`, `2h 14m`, `Prototype`, `mock`) yielded the following classification:

| File | Value / Code | Classification | Explanation / Action Required |
| --- | --- | --- | --- |
| `Store-Manager/src/pages/OrderDetailPage.tsx` | "Thursday, 1 October" | **C. Prototype/demo data** | Escaped cleanup. It is hardcoded in the timeline steps. Needs to be replaced with dynamic `requestedDate` or API data. |
| `Store-Manager/src/pages/NewOrderPage.tsx` | "Thursday, 1 October", `afterCutoff` mock logic | **C. Prototype/demo data** | The page still hardcodes "Friday, 2 October" and mock cutoff logic instead of using the new `useCutoff` hook. |
| `Store-Manager/src/components/orders/OrderPlanningContext.tsx` | "Thursday, 1 October", "2h 14m remaining" | **C. Prototype/demo data** | Completely hardcoded component used by `NewOrderPage`. Needs to integrate `useCutoff`. |
| `Store-Manager/src/components/layout/TopBar.tsx` | "ORD-1045", "ORD-1065" | **C. Prototype/demo data** | The notification dropdown still uses mocked strings ("ORD-1045 awaits receipt"). Phase 4 was not fully implemented here. |
| `Store-Manager/src/lib/utils.ts` | `id: "ORD-1065"`, `getUpcomingDeliveries` | **C. Prototype/demo data** | The `getUpcomingDeliveries` array is completely mock data. It is currently unused by real views (dead code) but should be purged. |
| `Store-Manager/src/components/common/PrototypeMisc.tsx` | Complete file | **B. Legitimate static UI text** | Kitchen sink component for UI prototypes. Dead code, but harmless. |
| `Store-Manager/src/App.tsx` | `prototypeView` URL query param | **A. Real dynamic data** | Developer tool for UI state deep-linking. Legitimate. |
| `Store-Manager/src/auth/AuthBoundary.tsx` | `VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE` | **A. Real dynamic data** | Legitimate environment flag for demo hosting. |

## 2. API/Data Flow Audit

| Flow | Endpoints / Hooks | Consumers | Displayed Result / Transformation |
| --- | --- | --- | --- |
| **Authentication** | `GET /session` → `auth/session.ts` | `TopBar`, `HomePage`, `Sidebar` | Renders user initials, outlet name, role. |
| **Home Dashboard** | `GET /store/dashboard` | `HomePage` | Populates `attentionCount`, `upcomingDeliveries` (mapped to `NextDeliveryHero`), and `recentOrders`. |
| **Notifications** | N/A (Missing) | `TopBar` | **Broken Data Flow.** Still relies on static JSX text instead of mapping `dashboard.upcomingDeliveries` or `attentionCount`. |
| **Deliveries** | `GET /store/deliveries` | `DeliveriesPage` | Lists all live/pending deliveries and handles PIN issuance. |
| **Calendar (Cutoff/Days)** | `GET /calendar/:date`, `GET /calendar?from=&to=` | `useCutoff` hook | Calculates local JS countdown to `cutoffDeadlineAt` and determines the dynamic `targetDeliveryDate`. |
| **Order Creation** | `POST /orders` | `ReviewOrderPage` | Submits the `orderType`, `items`, and dynamically calculated `requestedDate` from `useCutoff`. |
| **Order Detail** | `GET /orders/:orderId` | `OrderDetailPage` | Maps full order payload to timeline and status UI. |
| **Receipt / Delivery** | `POST /store/deliveries/:id/pin`, `/receipt` | `DeliveriesPage`, `ReceiptFlowPage` | Triggers backend state machine transitions for delivery arrivals and completions. |

## 3. Authentication Data Audit

The authentication system relies entirely on `Store-Manager/src/auth/session.ts`. 
- No hardcoded session data exists.
- The UI (e.g., initials "Dilini" and "Kandy City") has successfully been replaced by real session variables (`session.user.name` and `session.user.outletId`).
- `AuthBoundary.tsx` strictly guards the app unless bypassed by explicit Vite environment variables.

## 4. Calendar/Cutoff Audit

The `useCutoff` hook (Phase 3) is a robust implementation. It successfully:
1. Fetches `GET /calendar/:date` on mount for absolute UTC deadlines.
2. Calculates local time remaining without polling the server.
3. Fetches `GET /calendar?from=&to=` to calculate the next operating day (`targetDeliveryDate`).
4. Successfully integrated into `TopBar`, `ReviewOrderPage`, and `OrderConfirmationPage`.
**Gap:** Not yet integrated into `NewOrderPage` and `OrderPlanningContext`.

## 5. Cart/Order Flow Audit

1. Cart state resides in `App.tsx` (`drafts`) and is modified in `NewOrderPage`.
2. The race-condition bug (stale closures during rapid clicks) was fixed via a functional state updater.
3. `ReviewOrderPage` processes the cart, maps it to the API schema, appends `requestedDate`, and POSTs it correctly.
4. UI state transitions flawlessly into `OrderConfirmationPage`.

## 6. Order Detail Audit

1. Wires properly to `GET /orders/:orderId`.
2. Replaced `mockDrafts` with the actual backend API payload.
3. Successfully maps real `items`, `totalUnits`, and `status`.
4. **Gap:** Timeline still contains hardcoded textual strings (e.g., "Thursday, 1 October" on line 146).

## 7. Prototype Cleanup Audit

Significant prototype cleanup was successfully executed:
- `mockDrafts` and `PrototypeStateControl` successfully purged from `App.tsx`, `OrderDetailPage`, and `constants.tsx`.
- `DeliveriesPage.tsx` purged of `prototypeMode`.
- Hardcoded IDs ("ORD-1082", "WP-014", "PLG-03") successfully removed from Order and Receipt screens.

## 8. Remaining Risks

The following are the **only** remaining risks detected in the audit:
- **Phase 4 (Notifications) was incomplete:** `TopBar.tsx` still hardcodes "ORD-1045" and "ORD-1065" in the notification dropdown.
- **Incomplete Phase 3 integration:** `NewOrderPage` and `OrderPlanningContext` still use hardcoded mock strings for the cutoff and target dates instead of the `useCutoff` hook.
- **Missed Phase 5B strings:** `OrderDetailPage` still has a few residual hardcoded "Thursday, 1 October" strings in the timeline UI.
- **Dead mock code:** `utils.ts` still exports the mock `getUpcomingDeliveries` function.

## 9. Files Reviewed

All files in `Store-Manager/src/` were analyzed, specifically:
- `App.tsx`
- `api/store.ts`
- `auth/session.ts`
- `components/layout/TopBar.tsx`
- `components/orders/OrderPlanningContext.tsx`
- `components/orders/ConfirmationCard.tsx`
- `lib/utils.ts`
- `pages/NewOrderPage.tsx`
- `pages/ReviewOrderPage.tsx`
- `pages/OrderDetailPage.tsx`
- `pages/HomePage.tsx`
- `pages/DeliveriesPage.tsx`
- `hooks/useCutoff.ts`

## 10. Backend Integrity Confirmation

**CONFIRMED:** The `backend/` directory, along with all dispatcher, loader, delivery-driver, Docker, and deployment configurations, are **100% untouched**. `git status` verifies that the working tree is clean and only the `Store-Manager/src` directory received modifications in earlier phases.
