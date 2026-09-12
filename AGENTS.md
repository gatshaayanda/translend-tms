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

Firestore remains the business data source of truth.
UploadThing is the authoritative POD/evidence file transport.
Firebase Storage is legacy/reference only and MUST NOT be introduced as a new
POD/evidence path.

---

## Current authoritative Git checkpoint

Latest known authoritative checkpoint:

- `7c4665f` — Patch 2: wire Delivery workflow completion status
- `ac3985d7` — Fix nullable delivery exception resolution notes

The local working copy must be synchronized to `origin/v19-authoritative`
before continuing. Never force-push over newer authoritative work.

Recent Patch 2 work includes:

- Delivery domain foundation
- Delivery Note and structured Material Lines
- arrival/departure persistence and ordering
- acknowledgements
- authenticated UploadThing evidence/POD integration
- Delivery evidence UI
- structured Delivery exceptions and resolution
- deterministic POD/invoice-readiness workflow derivation
- Delivery workflow completion integration

The actual repository state is authoritative if commits advance beyond this list.

---

# CURRENT CONTINUATION POINT

## PATCH 2 — REAL DELIVERY WORKFLOW — LIVE INTEGRATION / VERIFICATION

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

### What is implemented

The current repository contains a real, persisted Delivery workflow rather than
disconnected demo state.

Delivery supports optional persisted operational fields for:

- Delivery Note relationship
- arrivalAt / arrivalBy
- departureAt / departureBy
- acknowledgements
- evidence references
- exception references
- POD state

First-class org-scoped repositories exist for:

- deliveryNotes
- deliveryExceptions

The Deliveries page currently supports:

- creating a Delivery and first Delivery Note from an eligible Trip
- editing Delivery Note operational details
- adding, editing, and removing structured material lines
- persisted arrival with acting user and timestamp
- persisted departure with acting user and timestamp
- departure blocked until arrival exists
- repeated arrival/departure clicks ignored once recorded
- driver, foreman, and receiver acknowledgement records
- authenticated UploadThing evidence/POD capture
- structured delivery exceptions
- exception resolution with resolving user/time
- POD completeness derivation
- invoice readiness derivation
- controlled Delivery completion
- live Delivery history and mobile-friendly workflow dialogs

The UploadThing evidence route requires authenticated Firebase identity,
active organization membership, operational edit permission, and matching
Delivery/Delivery Note records before persisting evidence metadata to Firestore.

Firestore rules contain org-scoped rules for deliveries, deliveryNotes and
deliveryExceptions and retain role-aware operational writes. Do NOT weaken
these rules merely to make a UI test pass.

### Current live verification issue — MUST RESOLVE BEFORE MOVING ON

A real Vercel deployment reached the Deliveries page but displayed:

`Missing or insufficient permissions.`

At the same time, the Delivery Note column displayed unexpected literal
Firestore rules text beginning with:

`rules_version = '2'; service cloud.firestore { ...`

This is an observed live integration/data/security discrepancy. It has NOT
been diagnosed conclusively yet and MUST NOT be papered over with permissive
rules or UI hiding.

The authoritative `firestore.rules` in GitHub currently contains explicit
org-scoped rules for `deliveryNotes` and `deliveryExceptions`. Therefore the
next debugging task is to reconcile the live Firebase deployment/data with
the repository source.

Required investigation order:

1. Inspect the actual Delivery documents in the live Firestore project.
2. Inspect the actual Delivery Note documents in the live Firestore project,
   especially `noteReference` and related display fields.
3. Determine whether the literal rules text is stored in a Delivery Note field
   or is being injected/rendered by application code.
4. Determine exactly which Firestore read is returning `permission-denied`
   (`trips`, `deliveryNotes`, or another query).
5. Compare/deploy the intended `firestore.rules` to the Firebase project only
   after confirming the repository rules are correct.
6. Re-test the Deliveries page with the real authenticated workspace user.
7. Preserve organization isolation throughout the fix.

Do NOT:

- weaken Firestore rules
- replace Firestore with another data source
- delete live records just to hide the issue
- hard-code around the permission error
- assume the rules text is corrupted data until the actual document is inspected
- move on to workspace invitations until this live Delivery discrepancy is
  understood and fixed

### Build status

The Vercel build at commit `7c4665f` exposed one TypeScript error in
`DeliveryExceptionPanel.tsx`: nullable `resolutionNotes` was passed directly to
an input `defaultValue`. The minimal fix was committed as `ac3985d7` using an
empty-string fallback. Vercel should re-run from that checkpoint.

Do not perform unrelated dependency/audit changes as part of this fix.

---

## Product/workflow next phase after Patch 2 verification

Once the live Delivery workflow is verified end-to-end, the next product unit
is workspace membership UX.

Desired model:

- An account may belong to one or more workspaces.
- A user normally has one primary/current workspace for simple V1 UX.
- Do NOT enforce a hard one-workspace-per-account database limitation.
- A workspace owner/authorized manager can invite a user by email and assign a
  role.
- An invited user signs in with the invited email and can see/accept the pending
  invitation.
- After acceptance, the membership is created/activated and the user can enter
  that workspace.
- Users with one workspace should be taken directly into it.
- Users with multiple memberships should have a simple workspace chooser.
- Users with pending invitations should see those invitations before/alongside
  workspace access.

Workspace invitation UX is a later unit. Do not start it while the current live
Delivery/security/data discrepancy remains unresolved.

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
- build workspace invitation UX before the live Delivery discrepancy is resolved

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

This is a continuing application. Inspect reality first, preserve the latest
authoritative architecture, and never regress to an older project iteration.
