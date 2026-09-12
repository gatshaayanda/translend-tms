# START HERE — AI PROJECT CONTEXT

## What this project is

This repository is the authoritative rebuild of Translend TMS Truck Division v19.

Translend TMS is not a generic demo dashboard. It is an operational transport
management system being rebuilt into a real working application.

The primary repository and working branch are:

- Repository: gatshaayanda/translend-tms
- Authoritative branch: v19-authoritative

Before making any change:

1. Read this entire AGENTS.md file.
2. Inspect the actual current repository state.
3. Check git status and recent commits.
4. Inspect the existing implementation before proposing replacements.
5. Continue from the latest committed checkpoint.

DO NOT assume an earlier chat, prompt, patch, or memory is more authoritative
than the current repository and this file.

---

## Why this document exists

Multiple AI agents and chats may work on this project.

The project has previously lost time because an AI:

- used an older AdminHub iteration instead of the latest authoritative system
- assumed architecture without inspecting the repository
- rebuilt working areas unnecessarily
- confused planned work with completed work
- expanded a patch beyond its assigned scope
- gave instructions based on stale chat context

Therefore this document provides persistent project context and the current
continuation point.

Any AI joining this project must be able to understand:

- what Translend is
- what architecture already exists
- what has already been completed
- what must not be changed
- what the current patch is
- what to do next

---

## Current project story

The original Translend rebuild was created using an incorrect/outdated base
iteration. This caused integration problems and unnecessary patching.

The application was subsequently brought forward and connected to the current
authoritative system.

Core workspace and application wiring now exists and CRUD functionality is
working in key areas.

The project is now moving from infrastructure and shell wiring into real
operational workflows.

The latest completed infrastructure checkpoint added:

- UploadThing POD infrastructure
- UploadThing API routes
- Firebase Admin support where required
- Firestore indexes
- supporting package configuration

Firestore remains the business data source of truth.

Do not introduce Firebase Storage as a parallel or replacement upload path.

---

## Current authoritative Git checkpoint

Always verify this against git before working.

Recent project history includes:

- 26936b7 Establish Translend v19 application
- 24bed21 Update Next.js to patched 15.5.15
- ff313d4 Add UploadThing POD infrastructure and Firebase indexes
- 5552c60 Merge authoritative project context and workflow
- 8054f92 Update authoritative checkpoint and define Patch 2 delivery workflow
- fcadeaa275e32cf7b56fd266aa0d22c7a18c22ee Implement Patch 2 delivery domain foundation
- a9e21b956aa7d61604811ce8bee631150cce18e3 Patch 2: add Delivery Note and Material Lines workflow
- 20d9dd93582dfec40c894e0be3abf78d0cda1b9f Patch 2: add delivery arrival departure and acknowledgements

The actual repository state is authoritative if commits have advanced beyond
this list.

---

# CURRENT CONTINUATION POINT

## PATCH 2 — REAL DELIVERY WORKFLOW — IN PROGRESS

Target workflow:

Job
→ Trip
→ Delivery
→ Delivery Note
→ Structured material lines
→ Arrival
→ Departure
→ Acknowledgement
→ Evidence
→ Exceptions
→ POD completeness
→ Invoice eligibility

### Completed Patch 2 units

The delivery domain foundation is implemented and committed.

Delivery now has optional persisted operational fields for:

- Delivery Note relationship
- arrivalAt / arrivalBy
- departureAt / departureBy
- acknowledgements
- evidence references
- exception references
- POD state

First-class org-scoped repositories now exist for:

- deliveryNotes
- deliveryExceptions

UploadThing POD/evidence authorization is protected by authenticated Firebase
ID token + active organization membership + operational permission. Firebase
Storage must not be used for new POD/evidence flows.

The Deliveries page now supports:

- creating a Delivery and first Delivery Note from an eligible Trip
- editing Delivery Note operational details
- adding, editing, and removing structured material lines
- persisted arrival with acting user and timestamp
- persisted departure with acting user and timestamp
- departure blocked until arrival exists
- repeated arrival/departure clicks are idempotently ignored once recorded
- driver, foreman, and receiver acknowledgement records
- acknowledgement role/name/timestamp/acting UID persistence
- live Delivery history and mobile-friendly workflow dialogs

### Current next units

Continue Patch 2 in this order:

1. UploadThing evidence/POD capture and Firestore evidence references
2. POD completeness state driven by real delivery/evidence/acknowledgement state
3. Delivery exceptions and resolution workflow
4. Invoice readiness derived from real delivery/POD/business state
5. Final Delivery workflow integration and cleanup
6. Small existing PDF path only if appropriate
7. Final Patch 2 verification and authoritative documentation checkpoint

Do not move to Patch 3 until Patch 2 is complete.

---

## Patch 2 success criteria

A real user should be able to follow the operational chain and the system
should maintain the relationship between records.

The implementation must support:

- organization isolation
- existing live records
- structured delivery state
- delivery timing
- acknowledgement
- evidence/POD records
- exception handling
- completeness state
- invoice eligibility state

Do not fake the workflow with disconnected UI state.

Persist operational state through the existing data architecture.

---

## Explicit non-goals for Patch 2

Do NOT:

- rebuild authentication
- rebuild workspace access
- replace the shell
- redesign the entire application
- rebuild Fleet unless required by an actual workflow dependency
- build a complete invoicing system
- build unrelated analytics
- introduce Firebase Storage uploads
- replace Firestore as the business data source
- rewrite working CRUD systems without a demonstrated defect
- expand beyond the delivery workflow

---

## Required AI workflow

Every build package follows:

START
→ Read AGENTS.md
→ Inspect repository
→ Check git status
→ Check recent commits
→ Identify current state

INSPECT
→ Read relevant existing files
→ Trace data flow
→ Identify dependencies
→ Identify what already works

BUILD
→ Make the smallest coherent implementation
→ Preserve architecture
→ Avoid unrelated rewrites

VERIFY
→ Inspect diff
→ Run lint
→ Type checks/build are expected to be run by the local implementation workflow
→ Fix actual errors
→ Verify runtime behaviour where possible

CHECKPOINT
→ Update AGENTS.md if the continuation point changed
→ Commit meaningful work
→ Push to v19-authoritative
→ Report commit SHA and verification results

---

## The most important rule

DO NOT treat this project as a blank build.

This is a continuing application.
