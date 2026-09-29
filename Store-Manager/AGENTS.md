# WayLink Store Manager

This repository is the approved Store Manager prototype exported directly from Figma Make.

## CRITICAL RULE

DO NOT REDESIGN EXISTING SCREENS.

The current UI is the approved visual source of truth.

Preserve:
- layout
- spacing
- colors
- typography
- card sizing
- information hierarchy
- responsive behavior
- animations
- component styling
- content structure

Do not replace the existing design with a new interpretation.

When making changes:
- modify the smallest possible area
- reuse existing components and styles
- preserve existing behavior unless explicitly asked to change it
- do not refactor unrelated code
- do not “improve” visual design unless explicitly requested

## Product

WayLink is a delivery planning system for Waypoint Group.

This repository contains the Store Manager interface only.

Store Manager flow:

Order → Know → Receive → Confirm

Approved screens already implemented include:

- Home
- New Order
- Review Order
- Order Received
- Unified Order Detail
  - Order confirmed
  - Scheduled
  - On the way
  - Arrived
  - Awaiting confirmation
- Deferred Order
  - Deferred
  - Rescheduled
- Receive & Verify
  - Verify initial
  - Full receipt
  - Issue editing
  - Issue review
  - Receipt confirmed
  - Receipt confirmed with issue

## Important Records

Normal order:
ORD-1082

Deferred order:
ORD-1065

Outlet:
Waypoint Fresh · Kandy City

Store Manager:
Dilini Fernando

## Development Rules

After every requested task:

1. Run the relevant build/tests.
2. Check git diff.
3. Ensure no secrets, .env files, generated junk, or unrelated files are included.
4. Add and commit completed changes with a short meaningful commit message.
5. DO NOT push unless explicitly asked.
6. Report:
   - what changed
   - files changed
   - build/test result
   - commit hash
   - any remaining issues

If the implementation is broken, do not commit it unless explicitly asked.

## Visual Preservation Rule

Before modifying an existing screen, inspect the existing implementation first.

Prefer editing existing components rather than rebuilding them.

Never replace a working approved screen wholesale unless explicitly instructed.