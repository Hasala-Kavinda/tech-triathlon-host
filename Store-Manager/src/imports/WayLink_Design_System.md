# WayLink Design System
### Delivery Planning System for Waypoint Group · Tech-Triathlon 2026 Designathon

> This document defines how WayLink **looks and is arranged**: typography, the Chameleon colour palette, layout grids, and screen arrangements for all four roles (Dispatcher, Loader, Driver, Store Manager). Use it as the style guide page in the design file and as the build spec for the Hackathon.

---

## 1. Design Principles

| Principle | What it means on screen |
|---|---|
| **One record, four views** | The same order, stop and status look identical in every role's screens. The same colours, pills and icons are used everywhere. |
| **Adapt like a chameleon** | Colour emphasis changes with the role's environment (dark for the dock and road, light for the office) and with the state of the work (in progress, done, needs attention). |
| **Explain, don't just block** | Every constraint error states the reason in plain words, for example "Chilled order needs a reefer vehicle". |
| **Thumb-first in the field** | Driver and loader actions sit in the bottom third of the screen, with large targets and one decision per screen. |
| **Never silent** | Offline, deferred and changed states are always visible. They are never hidden in a menu. |

---

## 2. Chameleon Colour Palette

### 2.1 The concept
A chameleon changes colour to match its environment and to signal its state. WayLink does the same in two ways.

1. **Environment modes (by role).** Each role gets the surface that suits where it works.
   - The **Dispatcher** and **Store Manager** work at a desk, so they use **Daylight mode**, a light surface.
   - The **Loader** and **Driver** work at 3–8 AM, at the dock or in the cab, so they use **Midnight mode**, a navy surface. This reduces glare, saves battery and keeps text readable in the dark.
2. **State signals (by status).** Components shift to cobalt, emerald or sunburst as work moves through its states. The meaning of each colour is the same in both modes.

### 2.2 Core colours

| Swatch | Name | Token | HEX | RGB | Role in the system |
|---|---|---|---|---|---|
| 🟦 | **Electric Cobalt Blue** | `cobalt-500` | `#0047FF` | 0, 71, 255 | Brand primary, main actions, links, "in progress" |
| 🟩 | **Vivid Emerald Green** | `emerald-500` | `#00C46A` | 0, 196, 106 | Success, delivered, synced, capacity OK |
| 🟨 | **Sunburst Yellow** | `sunburst-500` | `#FFC300` | 255, 195, 0 | Attention, offline, deferred, plan changed |
| ⬛ | **Deep Midnight Navy** | `navy-900` | `#0B1437` | 11, 20, 55 | Dark surfaces, primary text in light mode, headers |

### 2.3 Full scales

| Step | Cobalt | Emerald | Sunburst | Navy |
|---|---|---|---|---|
| 50 | `#F2F5FF` | `#F0FDF7` | `#FFFBEB` | `#F5F7FB` |
| 100 | `#E6EDFF` | `#E0F9EE` | `#FFF6D6` | `#E7E9F0` |
| 200 | `#B3C8FF` | `#A7EECD` | `#FFE999` | `#C5CADB` |
| 300 | `#809FFF` | `#66DCA6` | `#FFDB66` | `#8A91AB` |
| 400 | `#3370FF` | `#2BD186` | `#FFCF33` | `#5B6480` |
| **500** | **`#0047FF`** | **`#00C46A`** | **`#FFC300`** | `#2A335A` |
| 600 | `#003DDB` | `#00A35A` | `#DBA800` | `#1E2750` |
| 700 | `#0034BD` | `#047857` | `#B38600` | `#141D45` |
| 800 | `#002A99` | `#065F46` | `#8A6700` | `#101840` |
| 900 | `#00227A` | `#064E3B` | `#6B5000` | **`#0B1437`** |

**Neutrals:** White `#FFFFFF`, Border `#D9DDE8`, Muted text `#5B6480`.

**Functional exception, Critical Red:** `#E5484D` (light mode) and `#FF7B7F` (dark mode). Use it only for failed delivery, temperature breach and blocked constraints. Keeping red rare keeps it meaningful.

### 2.4 Colour proportion (60 / 30 / 10)

| Share | Daylight mode | Midnight mode |
|---|---|---|
| 60% surfaces | White and Navy 50 | Navy 900 and Navy 700 |
| 30% structure and text | Navy 900 and Navy 400 | White and Navy 300 |
| 10% accents | Cobalt, with emerald and sunburst for status | Cobalt 300, with emerald and sunburst for status |

### 2.5 Semantic tokens

| Token | Daylight (Dispatcher, Store) | Midnight (Loader, Driver) |
|---|---|---|
| `bg` | `#F5F7FB` | `#0B1437` |
| `surface` | `#FFFFFF` | `#141D45` |
| `surface-raised` | `#FFFFFF` + shadow | `#1E2750` |
| `border` | `#D9DDE8` | `#2A335A` |
| `text-primary` | `#0B1437` | `#FFFFFF` |
| `text-secondary` | `#5B6480` | `#8A91AB` |
| `action` | `#0047FF` | `#3370FF` |
| `action-text` | `#FFFFFF` | `#FFFFFF` |
| `success-fill` | `#00C46A` | `#00C46A` |
| `success-text` | `#047857` | `#2BD186` |
| `warning-fill` | `#FFF6D6` | `#FFC300` |
| `warning-text` | `#6B5000` | `#0B1437` (on yellow) |
| `critical` | `#E5484D` | `#FF7B7F` |

### 2.6 State signals (the same in every role)

| State | Colour | Icon | Pill text example |
|---|---|---|---|
| Scheduled | Navy 300 outline | 🕒 clock | `Scheduled · Trip 1` |
| In progress | Cobalt 500 | 🚚 truck | `On the way · ETA 06:40` |
| Delivered / Synced | Emerald 500 | ✓ check | `Delivered 06:52` |
| Deferred / Offline / Changed | Sunburst 500 | ⚠ triangle | `Deferred to Thu · capacity` |
| Failed / Blocked | Critical | ✕ cross | `Failed · outlet closed` |

A state is always shown with **colour, icon and text** together, so it still reads for colour-blind users and in poor light.

### 2.7 Brand and cargo accents
Tags use these accents so dispatchers can scan quickly. Each tag is a tinted background with dark text.

| Tag | Background | Text | Icon |
|---|---|---|---|
| Fresh | Emerald 100 | Emerald 900 | 🥬 |
| Style | Cobalt 100 | Cobalt 900 | 👕 |
| Tech | Navy 100 | Navy 900 | 📺 |
| Chilled | Cobalt 50 + cobalt border | Cobalt 700 | ❄ |
| Van only | Sunburst 100 | Sunburst 900 | 🚐 |
| Mall window | Navy 100 | Navy 900 | 🏬 |
| Skipped yesterday | Sunburst 500 | Navy 900 | ⚠ |

### 2.8 Contrast rules (WCAG 2.1 AA)

| Pair | Ratio | Use |
|---|---|---|
| Navy 900 on White | ≈ 17.9 : 1 | ✅ All text |
| White on Cobalt 500 | ≈ 6.3 : 1 | ✅ Button labels |
| Cobalt 500 on White | ≈ 6.3 : 1 | ✅ Links, icons |
| Emerald 700 on White | ≈ 5.5 : 1 | ✅ Green text |
| Sunburst 500 on Navy 900 | ≈ 11 : 1 | ✅ Warnings in Midnight mode |
| Navy 900 on Sunburst 500 | ≈ 11 : 1 | ✅ Text on yellow banners |
| Emerald 500 on White | ≈ 2.3 : 1 | ⚠ Fills and icons only |
| Sunburst 500 on White | ≈ 1.6 : 1 | ❌ Never use as text |

---

## 3. Typography

### 3.1 Font families

| Use | Font | Why | Fallback |
|---|---|---|---|
| **Headings and display** | **Poppins** (600 and 700) | Geometric and confident, gives the product a clear brand voice | `system-ui, sans-serif` |
| **UI and body** | **Inter** (400, 500 and 600) | Very legible at small sizes, has tabular numerals | `-apple-system, Segoe UI, Roboto, sans-serif` |
| **Data: IDs, times, weights** | **JetBrains Mono** (500) | Characters that are easy to tell apart (0/O, 1/l) in order and vehicle IDs | `ui-monospace, monospace` |
| **Local languages** | **Noto Sans Sinhala** and **Noto Sans Tamil** | Match Inter's weight, support Sinhala and Tamil labels | `sans-serif` |

All fonts are free on Google Fonts.

Use tabular numerals (`font-variant-numeric: tabular-nums`) for every time, weight, volume and ETA, so columns of numbers line up.

### 3.2 Type scale

| Token | Font | Desktop (size / line) | Mobile (size / line) | Weight | Use |
|---|---|---|---|---|---|
| `display` | Poppins | 32 / 40 | 28 / 34 | 700 | Page titles on the dashboard |
| `h1` | Poppins | 24 / 32 | 22 / 28 | 700 | Screen titles |
| `h2` | Poppins | 20 / 28 | 18 / 24 | 600 | Section and card titles |
| `h3` | Inter | 16 / 24 | 16 / 24 | 600 | Sub-sections, list headers |
| `body` | Inter | 15 / 22 | 16 / 24 | 400 | Standard text |
| `body-strong` | Inter | 15 / 22 | 16 / 24 | 600 | Key values |
| `label` | Inter | 13 / 18 | 14 / 20 | 500 | Form labels, pills, table headers |
| `caption` | Inter | 12 / 16 | 13 / 18 | 400 | Timestamps, helper text |
| `data` | JetBrains Mono | 13 / 18 | 14 / 20 | 500 | `ORD0092308`, `VEH014`, `06:40` |
| `field-xl` | Poppins | — | 24 / 30 | 700 | Driver: outlet name and window on the stop screen |

### 3.3 Rules
- Body text on mobile is never smaller than 16px.
- Driver key facts (outlet, window, next action) are 20px or larger.
- Sentence case everywhere ("Record delivery", not "RECORD DELIVERY"). Uppercase is reserved for small tags.
- Keep line length between 45 and 80 characters for text-heavy desktop content.

---

## 4. Spacing, Shape and Elevation

| Token | Value | Use |
|---|---|---|
| `space-1` | 4px | Icon to label |
| `space-2` | 8px | Inside pills, tight groups |
| `space-3` | 12px | Inside inputs |
| `space-4` | 16px | Card padding (mobile), gutters |
| `space-5` | 24px | Card padding (desktop), section gaps |
| `space-6` | 32px | Between major sections |
| `space-7` | 48px | Page top padding (desktop) |

| Shape | Radius |
|---|---|
| Inputs, chips | 8px |
| Cards, panels | 12px |
| Bottom sheets, modals | 16px (top corners) |
| Status pills, avatars | 999px (fully rounded) |

| Elevation | Daylight | Midnight |
|---|---|---|
| Level 0 (flat) | Border `#D9DDE8` | Border `#2A335A` |
| Level 1 (card) | `0 1px 3px rgba(11,20,55,.08)` | Surface `#141D45` |
| Level 2 (popover) | `0 8px 24px rgba(11,20,55,.12)` | Surface `#1E2750` + border |

In Midnight mode, depth comes from lighter surfaces, not shadows.

---

## 5. Layout Grids

| Device | Width | Columns | Gutter | Margin | Roles |
|---|---|---|---|---|---|
| Desktop | 1440px (min 1280) | 12 | 24px | 32px | Dispatcher, Store Manager |
| Tablet | 1024 × 768 (landscape) | 8 | 16px | 24px | Loader (shared dock tablet) |
| Phone | 360–414px | 4 | 16px | 16px | Driver, Loader, Store Manager (mobile) |

**Touch targets:**
- Minimum 48 × 48px everywhere.
- Driver primary buttons are 56px tall and full width.
- Loader tiles are at least 64px tall, so they work with gloves.

---

## 6. Screen Arrangements

The wireframes below show the arrangement of each key screen. Colour notes are in brackets.

### 6.1 Global structure

**Desktop, Daylight mode (Dispatcher, Store Manager)**
```
┌──────────────────────────────────────────────────────────────┐
│ TOP BAR (Navy 900): Logo · Depot switch · Date · Sync · User │
├────────┬─────────────────────────────────────────────────────┤
│ SIDE   │  PAGE HEADER: Title (h1) · key actions (right)      │
│ NAV    ├─────────────────────────────────────────────────────┤
│ 240px  │                                                     │
│ (White)│  CONTENT AREA (12-col grid, Navy 50 background)     │
│        │                                                     │
└────────┴─────────────────────────────────────────────────────┘
```

**Phone, Midnight mode (Driver, Loader)**
```
┌─────────────────────────┐
│ STATUS STRIP            │ ← Connectivity (emerald or sunburst)
├─────────────────────────┤
│ HEADER: Title · Trip    │
├─────────────────────────┤
│                         │
│ CONTENT (scroll)        │
│ Navy 900 background     │
│                         │
├─────────────────────────┤
│ PRIMARY ACTION (56px)   │ ← Thumb zone, Cobalt 400
├─────────────────────────┤
│ TAB BAR: Run·Sync·Help  │
└─────────────────────────┘
```

---

### 6.2 Dispatcher: Plan Builder (desktop)

```
┌──────────────────────────────────────────────────────────────────────┐
│ WayLink ▸ Peliyagoda ▾   Wed 30 Sep   ● Synced          Nuwan P. ◉   │
├──────┬───────────────────────────────────────────────────────────────┤
│ Queue│ Plan Builder · Tomorrow         [Auto-suggest] [Publish plan] │
│ Plan │───────────────────────────────────────────────────────────────│
│ Live │ ┌─ SUMMARY STRIP (4 KPI cards) ─────────────────────────────┐ │
│ Defer│ │ Orders 142 │ Assigned 118 │ Deferred 24 ⚠ │ Reefer 96% ⚠  │ │
│ Fcast│ └────────────────────────────────────────────────────────────┘ │
│      │ ┌─ ORDERS (4 col) ────┐ ┌─ VEHICLES & TRIPS (8 col) ─────────┐ │
│      │ │ Filter: Brand ▾     │ │ VEH014 ❄ Reefer truck   Trip 1     │ │
│      │ │ ⚠ OUT034 Fresh ❄    │ │ Weight ████████░░ 82%              │ │
│      │ │   Skipped yesterday │ │ Volume ██████████ 97% ⚠            │ │
│      │ │ OUT051 Style 🏬     │ │ Time   ██████░░░░ 213/270 min      │ │
│      │ │ OUT077 Fresh 🚐     │ │ Fuel   ████░░░░░░ 41% of week      │ │
│      │ │   drag ▸            │ │ ┌ Stops: OUT012 · OUT019 · OUT022 ┐│ │
│      │ │                     │ │ └─────────────────────────────────┘│ │
│      │ └─────────────────────┘ └────────────────────────────────────┘ │
│      │ ┌─ VALIDATION BAR ───────────────────────────────────────────┐ │
│      │ │ ✕ OUT077 is van only and cannot go on VEH014 (truck)       │ │
│      │ └────────────────────────────────────────────────────────────┘ │
└──────┴───────────────────────────────────────────────────────────────┘
```

**Arrangement rules**
- The order list sits on the left (4 columns) and vehicles sit on the right (8 columns). Work flows left to right: orders are dragged onto trips.
- The KPI strip is always at the top, so the limiting resource is visible first.
- Capacity bars are cobalt, turn sunburst at 90%, and turn critical at 100%.
- The validation bar is docked at the bottom and uses plain-language errors.

### 6.3 Dispatcher: Live Delivery Board (desktop)

```
┌────────────────────────────────────────────────────────────────┐
│ Live Board · Today 06:15        Filter: Brand ▾ Depot ▾ Status ▾│
├───────────────────────────────┬────────────────────────────────┤
│ MAP (7 col)                   │ TRIP LIST (5 col)              │
│  🔵 VEH014 on the way         │ VEH014 · Colombo  ███░ 3/5 ✓   │
│  🟢 VEH022 done               │ VEH031 · Kandy    ⚠ Offline    │
│  🟡 VEH031 last seen 05:48    │        last seen 05:48         │
│                               │ VEH022 · Gampaha  ✓ Complete   │
├───────────────────────────────┴────────────────────────────────┤
│ ALERTS FEED: ⚠ Shortfall VEH009 · ✕ Failed OUT088 closed       │
└────────────────────────────────────────────────────────────────┘
```

### 6.4 Loader: Load List (tablet, Midnight mode)

```
┌──────────────────────────────────────────────────────────────┐
│ ● Online  Bay 4 · VEH014 · Trip 1 · Departs 03:30   Kasun ◉  │
├──────────────────────────────────────────────────────────────┤
│ ⚠ PLAN CHANGED 02:47 · OUT019 added      [Acknowledge]       │ ← Sunburst banner
├──────────────────────────────────────────────────────────────┤
│ LOAD ORDER: last stop first (loaded deepest)                 │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 5 · OUT022  Fresh ❄  12 cases · 180 kg   [✓ Loaded] [!]  │ │
│ │ 4 · OUT019  Fresh    8 cases · 95 kg     [✓ Loaded] [!]  │ │
│ │ 3 · OUT012  Fresh ❄  15 cases · 210 kg   [  Load  ] [!]  │ │
│ └──────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ Progress ████████░░ 2 / 5          [ Release vehicle ]  64px │
└──────────────────────────────────────────────────────────────┘
```

**Arrangement rules**
- The list is ordered in reverse stop sequence, so the first drop is loaded last and sits by the door.
- The flag button `[!]` is on every row. One tap opens the choice of "Missing" or "Damaged".
- "Release vehicle" is disabled until every item is loaded or flagged.

### 6.5 Driver: Stop Detail (phone, Midnight mode)

```
┌─────────────────────────┐
│ ⚠ Offline · 2 queued    │ ← Sunburst strip
├─────────────────────────┤
│ ← Stop 3 of 6           │
│                         │
│ OUT012                  │ data
│ Waypoint Fresh          │ h2
│ Kandy City              │ field-xl
│                         │
│ 🕒 Window 05:30–07:30   │ field-xl
│ 🚪 Rear dock            │
│ ❄ 15 cases chilled      │
│                         │
│ Note: Use side gate     │ caption
│ [ Open in Maps ↗ ]      │ secondary
├─────────────────────────┤
│ [    I've arrived    ]  │ ← 56px Cobalt
├─────────────────────────┤
│  Run  ·  Sync  ·  Help  │
└─────────────────────────┘
```

### 6.6 Driver: Record Outcome and Proof of Delivery (phone)

```
┌─────────────────────────┐
│ ● Online                │ ← Emerald strip
├─────────────────────────┤
│ OUT012 · Arrived 06:02  │
│                         │
│ Outcome                 │
│ [✓ Delivered]           │ Emerald when selected
│ [◐ Partial  ]           │ Sunburst
│ [✕ Failed   ]           │ Critical
│                         │
│ Proof of delivery       │
│ [📷 Photo] [✍ Signature]│
│ Received by: ________   │
├─────────────────────────┤
│ [   Save & next stop  ] │ ← 56px
└─────────────────────────┘
```

Choosing "Partial" or "Failed" opens a sheet of reason chips (short, damaged, outlet closed, no access). The driver cannot save without choosing a reason.

### 6.7 Store Manager: My Deliveries (desktop and phone, Daylight mode)

```
┌──────────────────────────────────────────────────────┐
│ My Deliveries · OUT012 Kandy City   Cutoff in 2h 14m │
├──────────────────────────────────────────────────────┤
│ TOMORROW                                             │
│ ┌──────────────────────────────────────────────────┐ │
│ │ Dry groceries   🚚 Scheduled · ETA 06:00–06:30   │ │
│ │ Chilled         ⚠ Deferred to Thu · reefer full  │ │
│ └──────────────────────────────────────────────────┘ │
│ TODAY                                                │
│ ┌──────────────────────────────────────────────────┐ │
│ │ Dry groceries   ✓ Delivered 06:02 · Photo ▸      │ │
│ │                 [ Confirm receipt ] [ Report ]   │ │
│ └──────────────────────────────────────────────────┘ │
│                                   [ + New order ]    │
└──────────────────────────────────────────────────────┘
```

**Arrangement rules**
- Orders are grouped by day, newest first. Tomorrow is at the top because it is the day the manager can still act on.
- The countdown to the 4 PM cutoff is always visible in the header.
- A deferral is shown in sunburst with its reason and the new date, never hidden.

### 6.8 Degradation: "Dead Zone Drop" (driver offline → reconnect)

```
  OFFLINE                          RECONNECTED
┌─────────────────────────┐     ┌─────────────────────────┐
│ ⚠ Offline               │     │ ✓ Synced 3 records 07:12│ Emerald
│ Saving on this phone    │     ├─────────────────────────┤
│ 3 records waiting       │     │ ⚠ 1 change needs review │ Sunburst card
├─────────────────────────┤     │ Dispatcher moved OUT019 │
│ Stop 4 · ⚠ queued 06:41 │     │ to VEH022 at 06:50      │
│ Stop 5 · ⚠ queued 06:58 │     │ [ Review ]              │
│ Stop 6 · ⚠ queued 07:05 │     ├─────────────────────────┤
│                         │     │ Stop 4 · ✓ synced       │
│ All actions still work  │     │ Stop 5 · ✓ synced       │
└─────────────────────────┘     └─────────────────────────┘
```

Timestamps are recorded on the device when each action happens, so arrival times stay accurate even when the upload happens later.

---

## 7. Core Components

| Component | Spec |
|---|---|
| **Primary button** | Cobalt 500 fill with white Inter 600 label. Height 44px on desktop, 56px for the driver. Radius 8px. |
| **Secondary button** | Transparent with a 1.5px Navy 900 border (White in Midnight mode). |
| **Confirm button** | Emerald 500 fill with a Navy 900 label, for final "done" actions. |
| **Destructive button** | Critical outline, used only for cancel or fail actions. |
| **Status pill** | Fully rounded, 24px tall, icon + label (see 2.6). |
| **Capacity bar** | 8px tall, rounded. Cobalt below 90%, sunburst from 90%, critical at 100% and above. Label on the right in `data` style. |
| **Connectivity strip** | 32px tall, full width. Emerald "● Online", sunburst "⚠ Offline · n queued", cobalt "⟳ Syncing". |
| **Change banner** | Sunburst background with Navy 900 text, a 4px left border and an "Acknowledge" button. |
| **Order card** | 12px radius. Brand tag and cargo tags on top, ID in `data` style, weight and volume in the bottom row. |
| **Data table (desktop)** | 48px rows, sticky header in `label` style, zebra rows in Navy 50. |
| **Bottom sheet (mobile)** | 16px top radius and a drag handle, used for reason pickers. |

---

## 8. Iconography and Motion

**Icons.** Use an outline set such as Lucide or Phosphor, with a 2px stroke on a 24px grid (20px inside pills). The key icons are: truck, van, snowflake, clock, door or dock, building (mall), camera, pen (signature), cloud-off, refresh, alert-triangle, check-circle and x-circle.

**Motion.** Keep motion short and purposeful.
- 150ms for hover and press.
- 200ms for pills changing state.
- 250ms for bottom sheets.
- Use `ease-out` for all of the above.

Reduced motion is respected: when the user has turned it on, colour changes still happen but without animation. Loaders and drivers should never have to wait for an animation.

---

## 9. Design Tokens (for Hackathon handoff)

```css
:root {
  /* Core Chameleon palette */
  --cobalt-500:   #0047FF;
  --emerald-500:  #00C46A;
  --sunburst-500: #FFC300;
  --navy-900:     #0B1437;
  --critical-500: #E5484D;

  /* Daylight mode (Dispatcher, Store Manager) */
  --bg:             #F5F7FB;
  --surface:        #FFFFFF;
  --border:         #D9DDE8;
  --text-primary:   #0B1437;
  --text-secondary: #5B6480;
  --action:         #0047FF;
  --success-text:   #047857;
  --warning-fill:   #FFF6D6;
  --warning-text:   #6B5000;

  /* Typography */
  --font-heading: 'Poppins', system-ui, sans-serif;
  --font-body:    'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-data:    'JetBrains Mono', ui-monospace, monospace;
  --font-local:   'Noto Sans Sinhala', 'Noto Sans Tamil', sans-serif;

  /* Spacing and shape */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-5: 24px; --space-6: 32px; --space-7: 48px;
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px; --radius-pill: 999px;
}

/* Midnight mode (Loader, Driver) */
[data-mode="midnight"] {
  --bg:             #0B1437;
  --surface:        #141D45;
  --border:         #2A335A;
  --text-primary:   #FFFFFF;
  --text-secondary: #8A91AB;
  --action:         #3370FF;
  --success-text:   #2BD186;
  --warning-fill:   #FFC300;
  --warning-text:   #0B1437;
  --critical-500:   #FF7B7F;
}
```

---

## 10. Quick Checklist for Every Screen

- [ ] It uses the correct mode for its role (Daylight or Midnight).
- [ ] Every status is shown with colour, icon and text.
- [ ] No sunburst or bright emerald text on white.
- [ ] Times, weights and IDs use tabular or mono numerals.
- [ ] The primary action sits in the thumb zone on phones.
- [ ] Touch targets are at least 48px (56px for the driver's main action).
- [ ] Constraint errors explain the reason in plain words.
- [ ] Connectivity is visible on the Driver and Loader screens.
