# WayLink demo runbook

The seeded non-production users are:

| Role | Employee ID | Recorded email | Demo password |
|---|---|---|---|
| Dispatcher | `DSP-1001` | `nuwan.perera@waypoint.lk` | `Dispatch@123` |
| Loader | `LDR-2001` | `kasun.silva@waypoint.lk` | `Loader@123` |
| Driver | `DRV-3001` | `ruwan.fernando@waypoint.lk` | `Driver@123` |
| Store Manager | `STM-4001` | `dilani.j@waypoint.lk` | `Store@123` |

These credentials are for local/demo data only and must not be reused in production.

## Pre-demo checks

1. Confirm the API readiness endpoint and all five web health endpoints.
2. Confirm the intended service date exists in the imported calendar and is operating.
3. Confirm the CSC catalogue is populated; if a demo fixture is approved, ensure every product is visibly identified by its `DEMO-` SKU.
4. Sign in once as each role and verify the handoff returns to the correct origin.
5. Keep the Driver PWA in the foreground during the GPS demonstration and describe browser suspension limitations honestly.

## Story

1. Store Manager submits an order and opens Order History.
2. Dispatcher validates a feasible plan and shows one deliberately failed constraint.
3. Loader confirms the exact claim prompt, claims, accounts for items, and confirms the load.
4. Driver confirms the exact claim prompt, confirms the vehicle, and bootstraps the route.
5. Disconnect the network, record route work/GPS locally, reconnect, and show sync results.
6. Complete PIN proof, delivery, trip, and Store receipt.
7. Show Store/Driver histories and Dispatcher audit/monitor state.
