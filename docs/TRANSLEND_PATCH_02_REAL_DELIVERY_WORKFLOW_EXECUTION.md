# Translend TMS v19 — Patch 2 Execution Brief

## Purpose

This is the current execution brief for Patch 2 — Real Delivery Workflow.
It supersedes stale execution assumptions in earlier local Patch 2 planning artifacts.
Those artifacts remain useful as product/specification reference, but they are not repository truth.

The execution agent is operating inside the actual Translend TMS repository. The repository, `AGENTS.md`, current Git state, and actual source are authoritative.

## Mandatory START gate

Before editing:

1. Read `AGENTS.md` completely.
2. Run `git status --short --branch`.
3. Run `git log --oneline -10`.
4. Inspect the actual Job, Trip, Delivery, repository, types, Firebase rules/indexes, and UploadThing implementation.
5. Search the repository for all current POD/evidence upload paths and Delivery-related models/usages.
6. Confirm the working tree and current checkpoint before changing anything.

Do not clone another repository, initialise another Git repository, or rebuild the application from a planning document.

## Current authoritative architecture

- Next.js App Router + TypeScript + Tailwind.
- Firebase Authentication.
- Firestore is the business/source-of-truth database.
- UploadThing is the secure POD/evidence file transport.
- Firebase Storage is legacy/reference only and MUST NOT be introduced as a new POD/evidence upload path.
- Business records are organization-scoped under `/organizations/{orgId}/...`.
- Records use LIVE/DEMO/SEED/FIXTURE environment separation.
- Existing repository pattern provides typed CRUD, environment filtering, soft delete, and audit fields.
- Preserve existing auth, workspace, shell, repository, and CRUD architecture unless inspected code proves a real defect requiring a scoped change.

## Patch 2 target

Implement and connect the real operational chain:

**Job → Trip → Delivery → Delivery Note → Material Lines → Arrival → Departure → Acknowledgement → Evidence/POD → Exceptions → POD completeness → Invoice eligibility**

This must be persisted operational state, not disconnected UI state.

## Current implementation checkpoint

The repository now contains the main Patch 2 delivery workflow:

- Delivery Note and structured material lines
- persisted arrival/departure with ordering and acting-user timestamps
- driver/foreman/receiver acknowledgement records
- authenticated UploadThing evidence capture
- evidence metadata persisted to Delivery and Delivery Note
- structured DeliveryException creation and resolution
- POD completeness derivation
- invoice-readiness derivation
- controlled Delivery completion
- mobile-friendly Deliveries workflow UI

The current authoritative repository checkpoint is `ac3985d7` (nullable delivery
exception resolution-notes build fix), following `7c4665f`.

## LIVE VERIFICATION BLOCKER — RESOLVE BEFORE NEW PRODUCT WORK

A real Vercel deployment reached the Deliveries page but displayed:

`Missing or insufficient permissions.`

The same page displayed literal Firestore rules text beginning with:

`rules_version = '2'; service cloud.firestore { ...`

inside the Delivery Note area.

This must be treated as a live integration/data/security discrepancy until
proven otherwise. Do not assume whether it is rules drift, stored bad data, or
application rendering without inspecting the actual source/data path.

The repository's authoritative `firestore.rules` currently contains explicit
org-scoped rules for `deliveryNotes` and `deliveryExceptions`. The intended
security model must be preserved.

### Required debugging order

1. Inspect the actual live Delivery documents.
2. Inspect the actual live Delivery Note documents, especially `noteReference`
   and all fields used by the Delivery history table.
3. Determine whether the literal rules text exists in a stored Firestore field
   or is rendered/injected by application code.
4. Determine which Firestore read returns `permission-denied` — `trips`,
   `deliveryNotes`, or another query.
5. Compare the live Firebase rules deployment with the authoritative
   `firestore.rules`.
6. If the repository rules are correct, deploy those rules through the normal
   Firebase workflow rather than weakening them.
7. Re-test the Deliveries page with a real authenticated workspace user.
8. Verify cross-organization reads remain blocked.

### Prohibited shortcuts

Do NOT:

- weaken Firestore rules to make the page load
- remove authentication or membership checks
- delete live documents to hide malformed data
- hard-code around `permission-denied`
- assume the rules text is corrupted data before inspecting the actual document
- introduce Firebase Storage
- replace Firestore
- start workspace invitation UX before this blocker is resolved

## Build verification note

The Vercel build from `7c4665f` exposed a TypeScript nullability error in
`DeliveryExceptionPanel.tsx` where nullable `resolutionNotes` was supplied to
an input `defaultValue`. The minimal fallback fix was committed as `ac3985d7`.
No dependency/audit remediation is part of this fix.

## Required implementation principles

### Delivery model

Extend the existing Delivery model rather than replacing it. Preserve old
Delivery records that lack newer optional fields.

### Delivery Note

Use the first-class organization-scoped `DeliveryNote` repository and preserve
Job/Trip/Delivery relationships. Material lines remain structured data.

### Arrival / departure

Arrival records timestamp and acting user. Departure cannot be recorded before
arrival and records timestamp and acting user. Repeated actions must not corrupt
state.

### Acknowledgements

Support driver/foreman/receiver acknowledgement state without building a full
signature platform in Patch 2.

### Evidence/POD

Use the authenticated UploadThing route. Persist evidence metadata and POD
state in Firestore. Do not create a parallel Firebase Storage path.

### Exceptions

Use structured categories and resolution state. Open exceptions must affect
POD completeness and invoice readiness according to the established workflow.

### POD completeness / invoice readiness

These states must derive from actual persisted Delivery/POD/business state.
They must not be arbitrary UI toggles.

### Security / data integrity

Maintain organization isolation, role-aware writes, LIVE/DEMO/SEED/FIXTURE
separation, soft-delete/audit conventions, and the existing repository pattern.

## Patch 2 non-goals

Do NOT:

- rebuild authentication
- rebuild workspace access
- replace the shell
- redesign the entire app
- rebuild Fleet without a real dependency
- build the complete invoicing/payment system
- build unrelated analytics
- introduce Firebase Storage POD uploads
- replace Firestore
- introduce a competing repository architecture
- perform broad data migration/backfill without necessity and approval
- implement Patch 3/4/5 prematurely
- build workspace invitation UX before the live Delivery blocker is fixed

## Verification gate after blocker resolution

Run/confirm as appropriate:

1. Inspect complete diff.
2. `npm run lint`.
3. `npx tsc --noEmit` if appropriate.
4. `npm run build`.
5. Real authenticated Delivery workflow.
6. Create Delivery Note.
7. Create two or more material lines.
8. Edit/remove a material line.
9. Confirm departure is blocked before arrival.
10. Record arrival and departure.
11. Record acknowledgement.
12. Upload evidence through authenticated UploadThing.
13. Create and resolve an exception.
14. Confirm POD completeness and invoice readiness transitions.
15. Complete the Delivery.
16. Confirm existing Delivery records still render.
17. Confirm cross-organization access remains blocked.

Do not claim the browser UploadThing flow is verified unless it was actually
exercised or otherwise concretely verified.

## Next product unit after Patch 2 verification

Workspace membership UX should then be implemented as a separate controlled
unit:

- one account may belong to multiple workspaces internally
- one primary/current workspace for simple V1 UX
- owner/authorized manager can invite by email and assign a role
- invited users can see and accept pending invitations after signing in with
  the invited email
- one-workspace users enter directly
- multi-workspace users get a simple workspace chooser
- pending invitations are visible without requiring a complex dashboard

Do not impose a hard one-workspace-per-account database limitation.

## CHECKPOINT

After the live blocker is resolved and Patch 2 is genuinely verified:

- update `AGENTS.md` with the actual completed state and next continuation point
- commit coherent work to `v19-authoritative`
- report commit SHA, files changed, verification results, real tests performed,
  remaining limitations, and exact next continuation point

## Final rule

**Inspect reality first. Implement only what this repository actually needs. Do not let old planning artifacts drag the codebase backward.**
