# START HERE — AI PROJECT CONTEXT

## What this project is

This repository is the authoritative rebuild of Translend TMS Truck Division v19.

- Repository: `gatshaayanda/translend-tms`
- Authoritative branch: `v19-authoritative`
- Firebase project: `translend-tms-dcd2a`
- Production: `https://translend-tms.vercel.app/`

Translend is a real operational transport management system, not a generic demo dashboard.

Firestore is the business/source of truth.
UploadThing is the authoritative POD/evidence file transport.
Firebase Storage is legacy/reference only and MUST NOT be introduced as a new POD/evidence path.

## Mandatory continuation workflow

Before making any change:

1. Read this entire AGENTS.md.
2. Inspect the actual current repository state.
3. Check the current branch and recent commits.
4. Inspect the existing implementation before proposing replacements.
5. Continue from the latest authoritative checkpoint.

Do NOT assume an older chat, prompt, patch, memory, AdminHub iteration, or local copy is more authoritative than the current repository.

Every implementation package follows:

START → INSPECT → BUILD → VERIFY → CHECKPOINT

### START
Read AGENTS.md, inspect the repo, branch and recent commits.

### INSPECT
Trace the existing data flow and identify what already works before editing it.

### BUILD
Make the smallest coherent change. Preserve existing architecture and working CRUD.

### VERIFY
Inspect the diff. Run lint/typecheck/build through the local implementation workflow. Fix actual errors rather than guessing.

### CHECKPOINT
Update AGENTS.md when the continuation point changes, commit meaningful work, push to `v19-authoritative`, and report the commit SHA and verification status.

## Critical Firebase / Firestore safety rule

`firestore.rules` is production security infrastructure, not ordinary application code.

NEVER deploy Firestore rules casually, as a side effect of another feature, or merely because the repository contains a newer-looking rules file.

Before any rules change:

1. Confirm that a rules change is actually required by the current task.
2. Inspect the currently deployed Firebase rules/security model.
3. Compare the intended change against the existing working rules.
4. Preserve existing workspace/membership/organization isolation.
5. Make the smallest scoped rules addition required.
6. Do not use permissive rules to make a UI test pass.
7. Do not replace the live ruleset with rules remembered from an old chat or earlier iteration.
8. Do not invent a temporary rollback ruleset.
9. Do not run `firebase deploy --only firestore:rules` unless the rules change itself is the current, verified task.
10. After a rules deployment, immediately verify sign-in → membership discovery → workspace access → affected workflow.

If a rules deployment breaks workspace access, STOP feature work and restore the known-good Firebase rules version through Firebase's rules/version history. Do not improvise a replacement ruleset.

Delivery rules must extend the existing organization-scoped security model; they must not alter or weaken workspace membership security.

## Current authoritative checkpoint

Recent authoritative work includes:

- `7c4665f` — Patch 2: wire Delivery workflow completion status
- `ac3985d7` — Fix nullable delivery exception resolution notes
- `bc1d23a9` — Fix Firestore delivery workflow rules while preserving membership/security rules
- `870d1f8` — Fix existing Delivery → Create note action
- `eb7e391` — Polish Delivery mobile UX and success feedback

The repository state is authoritative if commits advance beyond this list.

The local working copy must be synchronized to `origin/v19-authoritative` before continuing. Never force-push over newer authoritative work.

## Current product/workflow state

The application is moving from infrastructure/shell wiring into real operational workflows.

Core workspace and application wiring exists. Key CRUD areas are working.

### Delivery workflow

The intended operational chain is:

Job
→ Trip
→ Delivery
→ Delivery Note
→ Structured material lines
→ Arrival
→ Departure
→ Acknowledgement
→ Evidence/POD
→ Exceptions
→ POD completeness
→ Invoice eligibility
→ Delivery completion

The current Delivery implementation supports persisted:

- Delivery Note relationship
- structured material lines
- arrivalAt / arrivalBy
- departureAt / departureBy
- driver/foreman/receiver acknowledgements
- UploadThing evidence references
- exception references and resolution
- derived POD state
- derived invoice readiness
- controlled delivery completion

Org-scoped repositories exist for `deliveryNotes` and `deliveryExceptions`.

The existing Delivery → Create note path must create the Delivery Note against the existing Delivery rather than creating a duplicate Delivery.

## Current Delivery UX checkpoint

The Deliveries page has now been refined for the next verification pass:

- desktop delivery history remains a table
- mobile delivery history becomes stacked operational cards instead of a horizontally scrolling table
- delivery actions use touch-friendly minimum heights
- the Delivery Note modal is scrollable and usable on short/mobile screens
- material-line controls stack on narrow screens
- acknowledgement controls stack on narrow screens
- success/error toast feedback is shown for save/update/create workflow actions
- validation errors remain visible and are also surfaced through feedback
- arrival, departure, acknowledgement, evidence, exception and completion updates provide user feedback through the Delivery page callback path

This is UX refinement only. Do not redesign the underlying Delivery data model merely to change presentation.

### Important validation behavior

A newly created Delivery Note contains an intentionally empty material line. Saving before filling it correctly fails validation with a message requiring description, unit and valid quantity. This is validation, not a persistence failure.

The UX must make validation obvious and success obvious; do not remove the validation merely to make the Save button appear to work.

## Delivery evidence and security

UploadThing evidence flow must remain authenticated and organization-scoped. It must verify Firebase identity, active organization membership, operational edit permission, and matching Delivery/Delivery Note records before persisting evidence metadata.

Do not introduce Firebase Storage as a new POD/evidence path.

## Explicit non-goals right now

Do NOT:

- rebuild authentication
- rebuild workspace access
- replace the application shell
- revert to an older AdminHub iteration
- weaken Firestore rules
- delete live records to hide a defect
- replace Firestore with another business data source
- introduce Firebase Storage for POD/evidence
- rewrite working CRUD without a demonstrated defect
- build a complete invoicing system yet
- build unrelated analytics
- start workspace invitation UX while a concrete live Delivery/security defect is unresolved
- add installation features yet

### Installation timing

Installation is a later operational phase. First make the Delivery chain reliable, responsive and understandable. Installation must not be allowed to destabilize the currently working Delivery/POD/exception workflow.

## Workspace model

An account may belong to one or more workspaces.

V1 should normally present one primary/current workspace. Do NOT enforce a hard one-workspace-per-account database limitation.

Future membership UX may support invitations, acceptance, roles and a simple workspace chooser, but this is not the current Delivery task.

## Product quality direction

The shell and operational workflows should feel like one professional product on desktop and phone.

Prioritize:

- clear hierarchy
- touch-friendly controls
- readable cards on mobile
- responsive forms
- obvious loading states
- obvious success/failure feedback
- useful validation messages
- preserved data relationships
- no unnecessary scrolling caused by desktop-only tables on phones

Use the existing product shell as the design source. Do not introduce a competing visual system.

## Verification expectations

For Delivery changes, verify the real authenticated flow where possible:

1. workspace loads
2. Deliveries loads
3. existing Delivery is visible
4. existing Delivery can open/create its Delivery Note
5. Save validation behaves correctly
6. successful Save visibly confirms success
7. reload preserves saved data
8. arrival persists
9. departure remains locked until arrival and then persists
10. acknowledgements persist
11. evidence uses UploadThing and persists metadata
12. exceptions persist and resolve correctly
13. POD/invoice readiness derives from actual state
14. completion remains controlled
15. mobile layout is usable without relying on a horizontal desktop table

If local typecheck/build is unavailable to the navigator, do not claim it was run. The local implementation workflow must perform it before final acceptance.

## Recovery / debugging order

When a live workflow fails:

1. Identify the exact failing UI action.
2. Inspect the actual application code path.
3. Identify the exact repository/read/write involved.
4. Check browser/runtime/build errors.
5. Only then investigate Firestore rules if the evidence indicates a permission problem.
6. Preserve the working workspace/authentication path.
7. Never broaden permissions as a first response.

Do not paper over a runtime or data defect by hiding errors in the UI.

## Most important rule

DO NOT treat this project as a blank build.

Inspect reality first. Continue from the latest authoritative repository state. Preserve working architecture. Make scoped changes. Verify before moving on.
