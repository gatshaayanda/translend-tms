# Translend TMS v19 — Patch 2 Execution Brief

## Purpose

This is the **current execution brief** for Patch 2 — Real Delivery Workflow.
It supersedes stale execution assumptions in earlier local Patch 2 planning artifacts.
Those artifacts remain useful as product/specification reference, but they are **not repository truth**.

The execution agent is operating inside the actual Translend TMS repository. The repository, `AGENTS.md`, current Git state, and actual source are authoritative.

## Mandatory START gate

Before editing:

1. Read `AGENTS.md` completely.
2. Run `git status --short --branch`.
3. Run `git log --oneline -10`.
4. Inspect the actual Job, Trip, Delivery, repository, types, Firebase rules/indexes, and UploadThing implementation.
5. Search the repository for all current POD/evidence upload paths and Delivery-related models/usages.
6. Confirm the working tree and current checkpoint before changing anything.

Do **not** clone another repository. Do **not** initialise another Git repository. Do **not** rebuild the application from a planning document.

## Current authoritative architecture

- Next.js App Router + TypeScript + Tailwind.
- Firebase Authentication.
- Firestore is the business/source-of-truth database.
- UploadThing is the secure POD/evidence file transport.
- Firebase Storage is legacy/reference only and MUST NOT be introduced as a new POD/evidence upload path.
- Business records are organization-scoped under `/organizations/{orgId}/...`.
- Records use LIVE/DEMO/SEED/FIXTURE environment separation.
- Existing repository pattern provides typed CRUD, environment filtering, soft delete, and audit fields.
- Preserve existing auth, workspace, shell, repository, and CRUD architecture unless the inspected code proves a real defect requiring a scoped change.

## Patch 2 target

Implement and connect the real operational chain:

**Job → Trip → Delivery → Delivery Note → Material Lines → Arrival → Departure → Acknowledgement → Evidence/POD → Exceptions → POD completeness → Invoice eligibility**

This must be persisted operational state, not disconnected UI state.

## Required implementation

### 1. Delivery model

Extend the existing `Delivery` model/document rather than replacing it.

Preserve compatibility with existing Delivery records that do not contain new fields.

The resulting delivery must be able to represent:

- jobId
- tripId
- delivery status
- delivery timing
- delivery note relationship
- acknowledgement state
- evidence/POD references
- exception state
- POD completeness
- invoice readiness

Use the repository's existing audit/environment conventions.

### 2. Delivery Note

Add a first-class organization-scoped `DeliveryNote` model/repository using the existing repository architecture.

It must support:

- Delivery Note number/reference
- date/time
- Job/Trip/Delivery relationships
- supplied-to/customer context
- vehicle registration
- delivery location
- driver
- order/POD reference where applicable
- loading point
- received-by details
- notes
- structured material lines
- arrival/departure
- driver/foreman/receiver acknowledgement data
- POD/evidence references
- exception references/state

Do not reduce multiple materials to one free-text field.

### 3. Material lines

Represent delivery material lines structurally, preferably within the Delivery Note document unless inspection of the existing architecture gives a stronger reason for a subcollection.

Each line must support at least:

- material/description
- quantity
- unit where applicable
- notes where applicable

The UI must allow adding, editing and removing lines before completion.

### 4. Arrival / departure

Implement explicit persisted arrival and departure actions.

Rules:

- Arrival records timestamp and acting user.
- Departure cannot be recorded before arrival.
- Departure records timestamp and acting user.
- Repeated clicks must not corrupt timestamps/state.
- Use Firestore timestamps and existing audit conventions.

### 5. Acknowledgements

Support driver/foreman/receiver acknowledgement state and names/details appropriate to the existing model.

Do not invent a full digital-signature platform in Patch 2.

If signature/evidence files already have a safe route, connect them to the delivery/POD record rather than creating another transport system.

### 6. Evidence/POD — CRITICAL

The existing UploadThing infrastructure is the authoritative file transport.

Use the existing authenticated UploadThing route and organization membership authorization.

The expected flow is:

**authenticated active org member → UploadThing → file reference/metadata → organization-scoped Firestore evidence/POD state**

Do NOT:

- import or call a Firebase Storage upload helper for new POD work
- create a public Storage URL workaround
- weaken authentication/authorization
- store operational POD state only in a file URL

Search for and remove/replace the actual legacy Delivery upload path where Patch 2 requires it.

If the existing UploadThing route requires a small security/type correction to support the real Delivery flow, make that correction within Patch 2.

### 7. Exceptions

Add a structured `DeliveryException` model/repository using existing org-scoped patterns.

At minimum support:

- type/category
- description
- reported by/at
- status
- evidence references where applicable
- resolution/notes where appropriate

Support shortage, damage, quantity discrepancy, wrong material, refused delivery, site issue, vehicle issue and other.

### 8. POD completeness and invoice readiness

Implement explicit persisted/computed states that make the operational result obvious.

POD completeness should account for the requirements actually established by the inspected delivery workflow, including required acknowledgement/evidence state where applicable.

`invoiceReady` must be derived from real delivery/POD/business state, not manually toggled without validation.

Do not build the full invoicing system in Patch 2.

### 9. Job / Trip linkage

Preserve and strengthen the existing Job → Trip → Delivery relationship.

Do not duplicate Job or Trip entities.

Use existing IDs and denormalized display fields only where the repository already uses that convention.

### 10. UI

Extend the existing Deliveries experience rather than replacing the application shell.

The user should be able to understand and operate:

- current delivery status
- Job/Trip context
- Delivery Note
- material lines
- arrival/departure
- acknowledgements
- evidence/POD
- exceptions
- completeness
- invoice readiness

Provide coherent loading, empty and error states.

Keep the scope operational and mobile-friendly, but do not turn Patch 2 into the complete Dispatch/Driver experience planned for Patch 5.

### 11. Security / data integrity

Update Firestore rules/indexes only as required by the implemented collections/queries.

Maintain organization isolation and role-aware writes.

Do not weaken rules to make tests pass.

Maintain LIVE/DEMO/SEED/FIXTURE separation.

Maintain soft-delete/audit conventions.

### 12. PDF

Patch 2 may connect Delivery Note/POD document output only if a small existing document-generation path is already present and doing so is genuinely required by the inspected workflow.

Do not let PDF architecture consume the patch. Full branded document generation belongs to Patch 3.

## Explicit non-goals

Do NOT:

- rebuild authentication
- rebuild workspace access
- replace the shell
- redesign the entire app
- rebuild Fleet unless a real dependency blocks Delivery
- build the complete invoicing/payment system
- build unrelated analytics
- introduce Firebase Storage POD uploads
- replace Firestore
- introduce a competing repository architecture
- perform a broad migration/backfill of old data without necessity and explicit approval
- implement Patch 3/4/5 features prematurely

## Verification gate

Before checkpoint:

1. Inspect the complete diff.
2. Run `npm run lint`.
3. Run `npx tsc --noEmit` if available/appropriate.
4. Run `npm run build`.
5. Verify the actual Delivery workflow locally where possible.
6. Verify at least:
   - create Delivery Note
   - two or more material lines
   - edit/remove material line
   - arrival then departure
   - blocked departure before arrival
   - acknowledgement state
   - UploadThing evidence upload using authenticated org context
   - POD/completeness transition
   - exception creation
   - invoiceReady logic
   - existing Delivery records still render
   - cross-organization access remains blocked by rules

Do not claim a real UploadThing browser flow works if it was not actually exercised or otherwise verified.

## CHECKPOINT

After verification:

- update `AGENTS.md` with the actual completed Patch 2 state, discovered constraints, exact architecture decisions, verification performed, and next patch = Patch 3 only if Patch 2 is genuinely complete.
- commit the implementation as one coherent Patch 2 checkpoint (small supporting commits are acceptable only when necessary).
- push to `v19-authoritative` using normal Git flow.
- report:
  - commit SHA
  - files changed
  - verification commands/results
  - what was actually tested
  - any remaining limitation
  - exact next continuation point

## Final rule

**Inspect reality first. Implement only what this repository actually needs. Do not let the old planning artifact drag the codebase backward.**
