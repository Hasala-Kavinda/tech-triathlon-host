# WayLink · Dispatcher — Figma Make Implementation Plan

This plan tells Figma Make how to build the dispatcher web app as one clickable prototype: which pages exist, what every button does, and how each screen transitions to the next. Attach the 13 reference images (`01_…` to `13_…`) when you prompt, and paste the **WayLink Design System** file alongside this one so Make uses the right colours and type.

---

## 1. How to use this file in Figma Make

1. Start a new **Figma Make** file.
2. Attach `WayLink_Design_System.md`, this file, and the 13 screen images.
3. Send the prompts in **section 9** one at a time. After each, click through the result before moving on.
4. If something drifts from the images, select it and ask for a small fix rather than rebuilding.

---

## 2. App foundations

| Item | Rule |
|---|---|
| App type | Single-page React app with client-side routing and local state (no backend; use the sample data in section 8). |
| Viewport | Desktop, designed at 1440 × 900. Content max width 1280, 12-column grid, 24 px gutter, 32 px margin. |
| Theme | Daylight mode only (dispatcher is a desk role). |
| Colours | Semantic tokens from the design system: `bg` #F5F7FB, `surface` #FFFFFF, `border` #D9DDE8, `text-primary` #0B1437, `text-secondary` #5B6480, `action` #0047FF, `success` #00C46A (text #047857), `warning` #FFC300 (text #6B5000), `critical` #E5484D. |
| Type | Headings Poppins 600/700; body Inter; IDs, times, weights and counts in JetBrains Mono with tabular numbers. Sentence case everywhere. |
| Shape | Cards 12 px radius, chips 8 px, pills fully rounded, modals 16 px. Soft navy shadows only. |
| Buttons | Primary (cobalt fill, white label), Secondary (navy outline), Confirm (emerald fill, navy label — final "done" actions only), Destructive (critical outline), Disabled (navy-100 fill, grey label). Min height 44 px. |
| Shop tags | Fresh = emerald-100 / emerald-900 · Style = cobalt-100 / cobalt-900 · Tech = navy-100 / navy-900. |

### AI suggestion style (applies across the whole product)
Anything the system suggests must look clearly "AI" and always the same way:
- **Lightning border:** a 3 px gradient border, `linear-gradient(120deg, #0047FF, #00C46A 55%, #FFC300)` (cobalt → emerald → sunburst), 16 px outer radius, with a soft glow `0 0 24px rgba(0,71,255,.30), 0 0 12px rgba(0,196,106,.25)`. Inner fill is cobalt-50 (#F2F5FF). Build it as an outer div with the gradient and 3 px padding around an inner div with the fill.
- **Lightning icon** (cobalt) and the label **"AI suggested"** in cobalt-900 (#00227A).
- **Where it is used:** the suggested vehicle card, the suggested order pack banner, the Review pop-up (whole window gets the lightning border), and the Lightning icon on each suggested order row.
- **Motion:** on first appear, the glow fades in over 250 ms. An optional slow shimmer may move along the border (one pass, 1.2 s, then stops); disable it for reduced motion.
- Once the dispatcher accepts a suggestion, it becomes normal content (plain border, no glow).

### App shell (on every page)
- **Top bar** (56 px, Navy 900): WayLink logo · depot switch "Galle ▾" · date · "● Synced" · user avatar.
- **Side nav** (240 px, white): Home, Schedule, Live, Remarks. The active item uses the cobalt-50 background with a cobalt left bar.
- Clicking **Home** goes to `/home`, and clicking **Schedule** goes to `/schedule`. Clicking the logo also goes to `/home`.

---

## 3. Motion system

Use these values for every transition. Never animate longer than 300 ms, and respect `prefers-reduced-motion` by switching to instant cross-fades.

| Token | Duration | Easing | Used for |
|---|---|---|---|
| `hover` | 150 ms | ease-out | Button and row hover, icon hover cards |
| `state` | 200 ms | ease-out | Filter on/off, pill toggles, checkbox mark, list re-filter |
| `panel` | 250 ms | ease-out | Page slide, panel expand/collapse, modal open |
| `exit` | 150 ms | ease-in | Modal close, hover card close, row removal |

Transition types:
- **Page change** (Home → Schedule, Home → Monitor): new page slides in 24 px from the right and fades in (`panel`). Back navigation slides from the left.
- **In-page state change**: cross-fade + height auto-animate (`state`).
- **Overlay** (modals): background dims to Navy 900 at 45 % with 8 px backdrop blur; modal scales from 96 % to 100 % and fades in (`panel`). Closing reverses with `exit`.
- **Hover card**: fades in and rises 4 px above the icon (`hover`), closes on pointer leave (`exit`).
- **List item removed** (Drop): row fades out and collapses its height (`exit`), the list closes the gap (`state`).

---

## 4. Page map

```
/home                     Dispatcher home
  ├─ filter: none | fresh | tech | style
  ├─ click route bar ──────────────▶ /monitor/:vehicleId
  └─ click "Schedule route" ───────▶ /schedule

/schedule                 Route scheduling
  ├─ step: start → search → selected → packed
  ├─ overlay: Review pack
  └─ overlay: Check sheet ──"Schedule"──▶ /home (toast)

/monitor/:vehicleId       Route monitoring
  ├─ remarks: collapsed | open
  ├─ hover card: person details
  └─ "Approve" (when all remarks marked) ──▶ /home (toast)
```

| # | Reference image | Route / state |
|---|---|---|
| 01 | `01_home_all-routes.png` | `/home`, no filter |
| 01b | `01b_home_calendar-open.png` | Calendar overlay |
| 01c | `01c_schedule_from-calendar.png` | `/schedule?due=…`, AI suggested vehicle |
| 01d | `01d_schedule_calendar-vehicle-picked.png` | Calendar flow, vehicle picked, due orders locked, more orders on route |
| 02 | `02_home_fresh-filter.png` | `/home`, filter = fresh |
| 03 | `03_schedule_start.png` | `/schedule`, step = start |
| 04 | `04_schedule_vehicle-search.png` | `/schedule`, tags = [Lorry] |
| 05 | `05_schedule_vehicle-selected.png` | `/schedule`, vehicle selected, 0 orders |
| 06 | `06_schedule_review-popup.png` | Review pack overlay |
| 07 | `07_schedule_orders-packed.png` | `/schedule`, suggested pack added |
| 08 | `08_schedule_check-sheet.png` | Check sheet overlay |
| 09 | `09_monitor_collapsed.png` | `/monitor/WP-LB-4521`, remarks collapsed |
| 10 | `10_monitor_person-hover.png` | Hover card over a stock manager icon |
| 11 | `11_monitor_remarks-open.png` | Remarks open, 1 of 5 marked |
| 12 | `12_monitor_remark-author-hover.png` | Hover card over a remark author |
| 13 | `13_monitor_all-marked.png` | All remarks marked, Approve active |

---

## 5. Page 1 — Dispatcher home (`/home`)

### Layout
- Row of three **shop-type filter buttons**: Waypoint Fresh, Waypoint Tech, Waypoint Style. Each has a sunburst **count badge** on its top-right corner showing its number of active routes.
- Left (8 cols): **Active routes** header with scope text ("All shop types · 6 routes"), then a scrollable list of **route bars**.
- Right (4 cols): dark **Scheduling status** card (orders to schedule, vehicles available, routes already scheduled) and the Primary **Schedule route →** button below it.

### Route bar contents
Vehicle ID (mono) · shop tags · route name · "3/4 shops" with progress bar · **bell icon + remark count** (only if the route has remarks) · chevron ›.

### State
```
filter: null | "Fresh" | "Tech" | "Style"   (default null)
```

### Interactions

| Element | Trigger | Result | Transition |
|---|---|---|---|
| Filter button (off) | Click | Sets `filter` to that shop type. Button turns dark (navy fill) with ✕ and "Filter on · click to clear". List shows only routes whose tags include that type. Header becomes "Waypoint Fresh · 4 routes" with a **Clear filter ✕** chip. Scheduling status card numbers switch to that shop type. | `state` — list items fade/collapse, numbers count to new values |
| Filter button (on) | Click | Clears `filter` (back to all routes, totals in the status card). | `state` |
| Another filter button while one is on | Click | Switches directly to the new filter (only one filter at a time). | `state` |
| Clear filter chip | Click | Clears `filter`. | `state` |
| Filter button | Hover | Border darkens, 2 px lift. | `hover` |
| Route bar | Hover | Border turns cobalt, chevron moves 4 px right. | `hover` |
| Route bar | Click | Navigate to `/monitor/:vehicleId`. | `panel` page slide |
| Bell icon | Click | Navigate to `/monitor/:vehicleId` with remarks already open. | `panel` |
| Schedule route | Click | Navigate to `/schedule`. | `panel` page slide |
| Route list | Scroll | Vertical scroll inside the list only (page stays still). | — |

### Calendar widget (added)
- Sits at the top of the right column, above a smaller Scheduling status card. It is highlighted in green: emerald-100 fill (#E0F9EE), 2 px emerald-500 border, soft emerald glow, white date tile, month and link in emerald-700. It shows the day ("Sun"), the date as a large number ("27") and the month ("Sep"). "Orders due" means orders that must be delivered on that day. The text reads "5 orders due today · 2 not scheduled yet · next Mon 28" and "Open calendar →". It follows the shop-type filter like the status card.

| Element | Trigger | Result | Transition |
|---|---|---|---|
| Calendar widget | Hover | Border turns cobalt, 2 px lift. | `hover` |
| Calendar widget | Click | Opens the **Calendar** overlay (image `01b_home_calendar-open.png`): page blurred and dimmed, month grid Mon–Sun, today outlined in cobalt, a red dot under every date that has orders due, and the selected day's **orders due** listed on the right: order ID, shop tag, shop, weight, and a status pill (Scheduled in emerald, Not scheduled in sunburst). Emergency orders are red. A "Schedule N remaining →" link sits under the list. | overlay `panel` |
| Date in the grid | Click | Selects that date; the right-hand list shows the orders due that day (or "No orders due"). | `state` |
| ‹ / › | Click | Previous / next month. | `state` slide 16 px |
| Today | Click | Jumps back to the current month and date. | `state` |
| Order in the list | Click | Opens `/schedule` with that order highlighted in the orders panel. | `panel` |
| Schedule N remaining → | Click | Closes the calendar and opens `/schedule?due=2026-09-27` (image `01c_schedule_from-calendar.png`): the orders panel is filtered to that day's unscheduled orders ("Due 27 Sep · 2" pill and a "From calendar · 27 Sep" chip with **Show all ✕**), and the vehicle panel shows the **AI suggested vehicle** card in the AI style: vehicle drawn to size, load after adding, three reasons, **Use this vehicle** and **Choose another**, plus other vehicles that fit. | overlay `exit` → `panel` page slide; AI card glow fades in |
| ✕ / Esc / dimmed area | Click | Closes the calendar. | overlay `exit` |

### Status card values by filter

| Filter | Orders to schedule | Vehicles available | Already scheduled |
|---|---|---|---|
| None (All) | 24 | 5 | 3 |
| Fresh | 11 | 2 | 1 |
| Tech | 7 | 2 | 1 |
| Style | 6 | 1 | 1 |

---

## 6. Page 2 — Route scheduling (`/schedule`)

### Layout
- **Left (5 cols): Orders panel.** Header "Orders · 24 open · 2 emergency". Filter pills: All (default), Fresh, Tech, Style. Scrollable order rows. **Emergency orders always sort to the top** with a light-critical background, critical border and a red "!" badge.
- **Right (7 cols): Vehicle panel.** "Vehicles available · 5" shown as icons per type (van ×2, lorry ×2, refrigerated ×1). A **tag search bar**, suggested tag chips, and vehicle cards drawn to size (bigger capacity = bigger icon).

### State
```
orderFilter:  "All" | "Fresh" | "Tech" | "Style"    (default "All")
tags:         string[]                              (default [])
vehicle:      Vehicle | null                        (default null)
added:        orderId[]                             (default [])
overlay:      null | "review" | "check"
reviewPack:   orderId[]   (copy of suggestion while the Review popup is open)
checked:      orderId[]   (rows ticked in the Check sheet)
```

### Entry from the calendar (image 01c)
| Element | Trigger | Result | Transition |
|---|---|---|---|
| Use this vehicle | Click | Selects the suggested vehicle and opens the **calendar vehicle-picked** state (image `01d_schedule_calendar-vehicle-picked.png`, described below). | `panel` |
| Choose another | Click | Goes to Step B (vehicle search) keeping the due-date filter. | `panel` |
| Other vehicle card | Click | Selects that vehicle instead (Step C). | `panel` |
| Show all ✕ | Click | Clears the due-date filter; all 24 open orders show. | `state` |

### Calendar flow — vehicle picked (image 01d)
Same arrangement as Step C (orders left, vehicle card + map right), with these differences:
- **Due orders are already added and locked.** They sit at the top under "🔒 Due today · added, can't be removed", with an emerald border and an emerald "✓ Added" button that does nothing when clicked (tooltip "Due today, can't be removed").
- **AI: also on this route.** Below them, an AI-style banner (lightning border) lists other open orders that lie along this route and still fit: "3 orders · +380 kg · load 650 / 800 kg", with **Review** (opens the Review pop-up with those 3 orders and Drop buttons). Each of those orders shows the Lightning icon and **+ Add**.
- **Vehicle card keeps the AI lightning border** (the system picked it) and has a **Suggest another** button inside it. **Change** opens the normal vehicle search.
- **Map** shows the route from Galle depot through the added shops (green pins) and the shops that can be added (outlined pins). The shop list marks added ✓ and can-add ○.
- **Check** is active straight away because orders are already on the route.

| Element | Trigger | Result | Transition |
|---|---|---|---|
| Suggest another | Click | Swaps in the next-best vehicle; the card, load bar, map reach and the "also on this route" list all recalculate. Locked orders stay. | card cross-fade `state`, glow re-fades in |
| ✓ Added (locked row) | Click | No change; tooltip "Due today, can't be removed". | `hover` |
| + Add (route order) | Click | Adds it: row becomes "✓ Added" (cobalt, removable), load bar grows, its map pin fills, banner count drops. | `state` |
| Review (AI banner) | Click | Opens the Review pop-up for the route orders. | overlay `panel` |
| Check | Click | Opens the Check sheet; locked orders show a lock instead of Drop. | overlay `panel` |

### Step A — Start (image 03)

| Element | Trigger | Result | Transition |
|---|---|---|---|
| Order filter pill | Click | Sets `orderFilter`; list shows only that shop type (emergency still on top). Click All to reset. | `state` |
| Suggested tag chip (+ Van, + Lorry, + Refrigerated, + Tail lift) | Click | Adds the tag into the search bar as a dark chip "Lorry ✕". | `state` |
| Search bar | Type + Enter | Adds the typed word as a tag, or filters by vehicle ID. | `state` |
| Vehicle card | Hover | Cobalt border, "Select →" appears. | `hover` |
| Vehicle card | Click | Selects the vehicle (go to Step C). | `panel` |

### Step B — Vehicle search (image 04)

| Element | Trigger | Result | Transition |
|---|---|---|---|
| Tag chip ✕ | Click | Removes that tag; results widen again. | `state` |
| Tags | Change | Results show vehicles matching **all** tags ("2 vehicles match"). Cards enlarge when there are few results. | `state` — non-matching cards fade out |
| Vehicle card | Click | Sets `vehicle` → Step C. | `panel` |

### Step C — Vehicle selected (image 05)

What changes on selection:
- Vehicle panel swaps the card grid for a **selected-vehicle card**: large icon with length, ID and type, **Change** link, capacity bar "Load 0 / 2,000 kg".
- Below it, a **map** with the vehicle's reach zone (dashed cobalt), depot square and shop pins, next to **Shops in reach · 5**. Out-of-reach shops (Akuressa) are greyed.
- Orders panel: every order gets a **+ Add** button. Orders the system suggests show a **star** and sort right after emergencies. Out-of-reach orders drop to the bottom, greyed with "Out of reach" instead of Add.
- A cobalt-50 **suggestion banner** appears: "Suggested: 5 orders · 1,260 kg, fits reach" with a **Review** button.
- Footer: "0 orders · 0 kg" and a Disabled **Check** button.

| Element | Trigger | Result | Transition |
|---|---|---|---|
| + Add (on an order) | Click | Adds the order: button becomes "✓ Added" (Primary style), capacity bar grows, the shop's map pin fills, footer totals update. | `state` — bar width animates |
| ✓ Added | Click | Removes the order again (toggle). | `state` |
| + Add | When it would exceed capacity | Button disabled with tooltip "Over capacity". | — |
| Capacity bar | ≥ 90 % | Turns sunburst; at 100 % turns critical. | `state` |
| Review | Click | Opens the **Review pack** overlay. | overlay `panel` |
| Change | Click | Clears `vehicle` and `added`, returns to Step A/B. | `panel` |
| Check | Click (enabled once ≥ 1 order added) | Opens the **Check sheet** overlay. | overlay `panel` |

### Overlay — Review pack (image 06)

- Small centred window (760 px) over the blurred, dimmed page.
- Lists the 5 suggested orders, emergency ones in critical style, each with a **✕ Drop** button.
- Footer: "Drop any order you don't want", **Cancel**, and Primary **Add N orders** (N = orders still in the list).

| Element | Trigger | Result | Transition |
|---|---|---|---|
| ✕ Drop | Click | Removes that order from `reviewPack`; count on the Add button drops (Add 5 → Add 4). | row `exit` collapse |
| Add N orders | Click | Adds all remaining orders to `added`, closes the overlay, banner changes to "Pack added · N of 5 · X kg loaded" with **Undo**. → Step D. | overlay `exit`, then `state` on the page |
| Cancel / ✕ / Esc / click on dimmed area | Click | Closes without changes. | overlay `exit` |

### Step D — Orders packed (image 07)

- Added rows show "✓ Added". Capacity bar at 1,260 / 2,000 kg (63 %).
- Map draws a solid cobalt route line through the added shops; shop list shows check icons ("Shops covered · 5").
- Footer "5 orders · 1,260 kg"; **Check** is now Primary and active.

| Element | Trigger | Result | Transition |
|---|---|---|---|
| Undo (banner) | Click | Removes the pack, back to Step C. | `state` |
| Check | Click | Opens the **Check sheet**. | overlay `panel` |

### Overlay — Check sheet (image 08)

- Wide window (1200 px), spreadsheet style: chips summary (vehicle · orders & shops · load % · emergencies), a formula-bar strip, and a table with sticky header, 48 px rows, zebra rows, emergency rows in light critical.
- Columns: ✓ checkbox · # · Order · Shop · Location · Type · Items · kg · Priority · ✕ Drop. Rows are in **stop order**; a totals row closes the table.
- Footer: "N of N checked", Secondary **Back to edit**, Confirm **Schedule** (emerald).

| Element | Trigger | Result | Transition |
|---|---|---|---|
| Row checkbox | Click | Toggles `checked` for that order; footer text updates. | `state` |
| Header ✓ | Click | Checks / unchecks all rows. | `state` |
| ✕ Drop | Click | Removes the order from the route (back to open orders); totals and map update. | row `exit` collapse |
| Row | Drag handle | Reorders stops (optional, nice to have). | `state` |
| Schedule | Enabled only when every row is checked | Closes the sheet, shows toast "Route WP LC-8870 scheduled", navigates to `/home` where "Already scheduled" goes from 3 → 4 and orders to schedule drop by 5. | overlay `exit` → `panel` page slide |
| Back to edit / ✕ / Esc | Click | Closes the sheet, stays on Step D. | overlay `exit` |

---

## 7. Page 3 — Route monitoring (`/monitor/:vehicleId`)

### Layout (image 09)
One large card:
- **Left:** truck icon beside the vehicle ID (large mono) and route name. Stop timeline with column headers **Shop · Time · Stock manager**. Visited stops use an emerald check badge, emerald rail and green time, plus a **person icon** in the Stock manager column. Not-visited stops use a navy-300 outline badge, "—" and "Not visited".
- **Right, top:** **Route status** panel: In progress pill, "3/4 shops covered", 75 % bar, "1 shop left to cover · Matara City Mart".
- **Right, middle:** **Crew** — three person icons labelled Driver, Loader, Loader (roles only, no names).
- **Right, bottom:** **Remarks bar** ("Remarks" + sunburst count badge + "0 of 5 marked" + ▾) and a Disabled **Approve** button.

### State
```
remarksOpen:  boolean        (default false; true if opened from the bell on Home)
marked:       remarkId[]     (default [])
showAll:      boolean        (default false — first 3 remarks visible)
hoverPerson:  personId|null
```

### Interactions

| Element | Trigger | Result | Transition |
|---|---|---|---|
| Any person icon (stock manager, crew member, remark author) | Hover | Shows a dark **hover card** above the icon with photo, full name, role and phone number (image 10, 12). | `hover` fade-up |
| Person icon | Pointer leave | Hover card closes. | `exit` |
| Phone number in hover card | Click | Opens `tel:` link (call). | — |
| Remarks bar (collapsed) | Click | Opens remarks: **Crew section slides out**, remark list slides in (image 11). Bar shows ▴ and cobalt border. | `panel` — height auto-animate + cross-fade |
| Remarks bar (open) | Click | Collapses back; crew returns. | `panel` |
| Remark checkbox | Click | Toggles `marked`; row turns cobalt-50; counter "X of 5 marked" updates. | `state` |
| Show 2 more remarks ▾ | Click | Reveals the remaining remarks; link becomes "Show less ▴". | `state` height animate |
| Approve (disabled) | Hover | Tooltip "Mark all remarks to approve". | `hover` |
| Approve | When `marked` = all remarks | Turns **Confirm** (emerald, navy label) (image 13). | `state` colour cross-fade |
| Approve (active) | Click | Toast "Route WP LB-4521 approved", bell disappears from that route bar, navigate to `/home`. | `panel` page slide |
| Back (browser or side nav Home) | Click | Returns to `/home`, keeping the previous filter. | `panel` reverse slide |

### Remarks (sample)
1. Driver — "Matara City Mart closed early."
2. Loader — "2 cartons damaged at Coastal Traders."
3. Stock manager — "3 crates short of the invoice."
4. Stock manager — "Delivery note not signed at Sunrise Mart." *(hidden until Show more)*
5. Driver — "Fuel stop at Ahangama, 15 min delay." *(hidden until Show more)*

---

## 8. Sample data (paste into Make)

```json
{
  "routes": [
    {"id":"WP LB-4521","route":"Galle → Matara · Southern 03","tags":["Fresh","Tech"],"done":3,"total":4,"remarks":5},
    {"id":"WP CAB-7810","route":"Galle → Hikkaduwa · Coastal 01","tags":["Fresh"],"done":2,"total":5,"remarks":0},
    {"id":"WP KD-3301","route":"Galle → Elpitiya · Inland 01","tags":["Style","Tech"],"done":4,"total":5,"remarks":2},
    {"id":"SP LC-2290","route":"Galle → Baddegama · Inland 02","tags":["Fresh","Style"],"done":5,"total":6,"remarks":1},
    {"id":"SP ND-4417","route":"Galle → Ambalangoda · Coastal 04","tags":["Fresh"],"done":1,"total":4,"remarks":0},
    {"id":"WP GH-5520","route":"Galle → Karapitiya · City 02","tags":["Style"],"done":2,"total":3,"remarks":0}
  ],
  "vehicles": [
    {"id":"WP PH-2210","type":"Van","capacityKg":800,"length":"3.4 m"},
    {"id":"WP PK-7741","type":"Van","capacityKg":800,"length":"3.4 m"},
    {"id":"WP LC-8870","type":"Lorry","capacityKg":2000,"length":"6.1 m"},
    {"id":"WP LE-1123","type":"Lorry","capacityKg":3500,"length":"7.2 m"},
    {"id":"WP LR-5006","type":"Refrigerated","capacityKg":1500,"length":"5.8 m"}
  ],
  "orders": [
    {"id":"ORD-1045","shop":"Matara City Mart","town":"Matara","type":"Fresh","items":"8 crates","kg":320,"emergency":true,"inReach":true,"suggested":true,"stop":5},
    {"id":"ORD-1052","shop":"Coastal Traders","town":"Weligama","type":"Tech","items":"3 boxes","kg":90,"emergency":true,"inReach":true,"suggested":true,"stop":3},
    {"id":"ORD-1038","shop":"Sunrise Mart","town":"Galle Fort","type":"Fresh","items":"14 crates","kg":410,"emergency":false,"inReach":true,"suggested":true,"stop":1},
    {"id":"ORD-1041","shop":"Lanka Super Stores","town":"Unawatuna","type":"Style","items":"6 boxes","kg":260,"emergency":false,"inReach":true,"suggested":true,"stop":2},
    {"id":"ORD-1049","shop":"Mirissa Mart","town":"Mirissa","type":"Tech","items":"4 boxes","kg":180,"emergency":false,"inReach":true,"suggested":true,"stop":4},
    {"id":"ORD-1047","shop":"Hill View Stores","town":"Akuressa","type":"Fresh","items":"10 crates","kg":150,"emergency":false,"inReach":false,"suggested":false}
  ],
  "people": {
    "stockManagers": [
      {"shop":"Sunrise Mart","name":"Ruwan Perera","phone":"+94 71 234 5678"},
      {"shop":"Lanka Super Stores","name":"Kavindi Fernando","phone":"+94 71 456 7890"},
      {"shop":"Coastal Traders","name":"Sanjeewa Silva","phone":"+94 77 345 6789"}
    ],
    "crew": [
      {"role":"Driver","name":"Nimal Perera","phone":"+94 70 111 2233"},
      {"role":"Loader","name":"Kasun Rathnayake","phone":"+94 77 123 4567"},
      {"role":"Loader","name":"Saman Dissanayake","phone":"+94 75 987 6543"}
    ]
  }
}
```

All names, numbers and phone numbers are sample data.

---

## 9. Prompt sequence for Figma Make

Send these one at a time, with the matching images attached.

**Prompt 1 — Foundations**
> Build a desktop React web app for "WayLink · Dispatcher" using the attached WayLink Design System (Daylight mode) and the attached implementation plan. Set up the colour tokens, fonts (Poppins, Inter, JetBrains Mono), button variants, shop tags, count badge, person icon, capacity bar and checkbox from section 2, the motion tokens from section 3, the app shell (top bar + side nav) and client-side routes `/home`, `/schedule`, `/monitor/:vehicleId`. Load the sample data from section 8.

**Prompt 2 — Dispatcher home** (attach images 01, 02)
> Build `/home` exactly as section 5 describes and as images 01 and 02 show. Implement the filter state, the toggle-off behaviour, the Clear filter chip, the scheduling status numbers per filter, the bell only on routes with remarks, and all interactions and transitions in the section 5 table.

**Prompt 3 — Scheduling: orders and vehicle search** (attach images 03, 04)
> Build `/schedule` Steps A and B from section 6 and images 03–04: orders panel with shop-type pills and emergency-first sorting, vehicle availability icons per type, tag search with suggested chips, tag filtering, and vehicle cards sized by capacity.

**Prompt 4 — Scheduling: selected vehicle and packing** (attach images 05, 07)
> Add Steps C and D from section 6: selected-vehicle card with capacity bar, reach map with shop pins and route line, Add / Added toggles on orders, suggestion banner with Review and Undo, capacity colour rules, and the Check button enable rule.

**Prompt 5 — Review pop-up** (attach image 06)
> Add the Review pack overlay from section 6: blurred, dimmed background, Drop buttons that remove rows with a collapse animation, "Add N orders" count that updates, Cancel/Esc/backdrop to close.

**Prompt 6 — Check sheet** (attach image 08)
> Add the Check sheet overlay from section 6: spreadsheet table in stop order with row checkboxes, header check-all, Drop per row, totals row, Schedule enabled only when all rows are checked, then toast + navigate to /home with updated counts.

**Prompt 7 — Route monitoring** (attach images 09–13)
> Build `/monitor/:vehicleId` from section 7 and images 09–13: timeline with Shop / Time / Stock manager columns, route status panel, crew as role-only person icons, hover cards with photo, name, role and phone for every person icon, remarks bar that swaps the crew section for the remark list, mark checkboxes with counter, Show more, and Approve that turns emerald only when all remarks are marked, then toast + back to /home.

**Prompt 8 — Polish and check**
> Check every transition against section 3 (durations, easing, reduced motion). Make all buttons keyboard-reachable with a 2 px cobalt focus ring, Esc closes overlays, and focus returns to the button that opened them. Verify text contrast and that no colour is the only signal of a state.

---

## 10. Acceptance checklist

- [ ] Filters toggle on and off; no filter shows all routes; status card follows the filter.
- [ ] Route bar → monitor page; Schedule route → scheduling page; back keeps the filter.
- [ ] Emergency orders always on top in red.
- [ ] Tags filter vehicles; selected vehicle shows size, capacity, reach map and shops.
- [ ] Add / Added toggles update load, map and footer; capacity turns sunburst ≥ 90 %.
- [ ] Review pop-up: page blurred behind, Drop removes rows, Add N adds the rest.
- [ ] Check sheet: rows checkable, Drop works, Schedule only when all checked, returns home with updated numbers.
- [ ] Hover any person icon → card with photo, name, role, phone.
- [ ] Remarks open hides the crew; Approve turns emerald only when all remarks are marked.
- [ ] All transitions 150–250 ms, ease-out; reduced motion respected.
