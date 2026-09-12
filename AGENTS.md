# START HERE — AI PROJECT CONTEXT

## Authoritative project

This is **Translend TMS · Truck Division v19**.

- Repository: `gatshaayanda/translend-tms`
- Branch: `v19-authoritative`
- Current checkpoint: `97d27ee835c5e3315cd821c0a793c11091390746`
- Stack: Next.js 15.5.15 + TypeScript + Tailwind + Firebase Auth/Firestore + Vercel
- Firestore = business/source of truth.
- UploadThing = POD/evidence transport.
- Do not introduce Firebase Storage for new POD/evidence uploads.
- Do not replace Firebase with Supabase or another backend.
- Do not restart the architecture or use an older AdminHub/PurePress/Translend generation.

Git/GitHub are the source of truth. The current repository always outranks remembered chat context or an older patch.

## Reusable lineage formula

**AdHub / AdHubMVP** → product idea, core workflow and reusable application patterns.

**Latest AdminHub / AdminHub Base** → reusable technical operating system: Next.js structure, auth/workspace, portals, shared UI, Firebase, PWA/product shell and operational conventions.

**PurePress** → finished product/reference FACE: information architecture, product language, visual hierarchy and intended interactions.

**Translend v19** → existing FACE + real ENGINE + native wiring.

Use the lineage as a formula, not as permission to copy an old implementation. Always record the exact authoritative repository, branch and current HEAD.

## FACE / ENGINE / SHELL / DATA

- **FACE** = HTML/Figma/screenshots/copy/layout/interaction reference.
- **ENGINE** = auth, workspace, Firestore, repositories, APIs, security, uploads, business logic and CRUD.
- **SHELL** = AdminHub-style app frame, navigation, shared UI, responsive behavior and PWA utilities.
- **PRODUCT DATA** = real persisted customer/operational records.

Correct implementation flow:

`reference → native route/component → repository/data source → supported fields → unsupported fields`

Rules:

- If real data exists, wire it.
- If a workflow already exists, expose/preserve it.
- If the reference expects data the engine does not have, use **Database still being configured** rather than fake live values.
- If the reference concept belongs to another route, wire to that native route.
- Never create fixtures merely to make a screen look complete.
- Never iframe or serve the raw HTML as the application.

## Current v19 product state

The native application now covers the major v19 surfaces:

- Operations Hub / Control Tower
- Fleet & Live Map
- Trips
- Delivery Notes & POs
- Customers
- Drivers
- Fuel & Workshop
- Invoicing & Statements
- Performance Dashboard
- Journal Entry
- P&L Statement
- Cash Flow
- Balance Sheet
- Trial Balance

The existing operational engine is real for the persisted domains. The delivery chain remains:

`Job → Trip → Delivery → Delivery Note → Material lines → Arrival → Departure → Acknowledgement → Evidence → Exceptions → POD completeness → Invoice eligibility`

Existing CRUD/repositories/listeners/security/workspace behavior must remain intact.

## Button and interaction rule

Every reference button/control must be classified before implementation:

1. **Navigation/action already supported by the engine** → wire it to the real native route/workflow.
2. **Existing data operation** → connect it to the existing repository/mutation and preserve security/workspace boundaries.
3. **Reference-only domain not yet persisted** → keep the designed surface, but clearly mark it as **Database still being configured**. Never pretend a save/post/upload happened.
4. **Action belongs to another route** → pass the relevant context into that route where the receiving workflow supports it.

A button that only looks clickable is not considered complete. Conversely, an unavailable finance/workshop operation must not be faked simply to make the HTML appear functional.

### Fleet action checkpoint

The Fleet trip actions are now wired from the real Trip Lookup records:

- **Pre-fill Fuel Log** → `/fuel-workshop` with `truckId` and `tripId` context.
- **Pre-fill Delivery Note** → `/deliveries` with `tripId` context.
- **Open Trip Sheet** → `/trips` with `tripId` context.

These are native application routes, not HTML links or parallel engines.

The Fleet page also retains live truck/trip/POD data, truck CRUD, fleet status, exception review and honest unavailable-data states for GPS, loaded/empty KM and finance-derived profitability.

## Finance / workshop boundary

The current Firestore engine does **not** contain dedicated persisted domains for:

- fuel transactions
- maintenance work orders
- supplier/customer PO ledgers
- inspections
- tyre cost control
- finance journal entries
- invoices/receivables/payables
- P&L ledger
- cash flow ledger
- balance sheet ledger
- trial balance ledger
- route revenue/cost/margin accounting

The native v19 UI for those areas is therefore a presentation-ready product surface derived from the real operational data where possible. It must not write invented financial records.

When those domains are eventually added, first inspect and update types, repositories, indexes and Firestore rules together. Do not casually expand security rules.

## Firestore safety and current rules checkpoint

Firestore rules are security boundaries, not UI configuration.

The current app changes did **not** introduce a new persisted business collection. The existing rules already cover the live domains: organizations/members, customers, trucks, drivers, jobs, trips, deliveries, delivery notes and delivery exceptions.

However, the repository's previous membership-discovery/member-management rules were weaker than the intended v19 security model. The current checkpoint `97d27ee835c5e3315cd821c0a793c11091390746` brings `firestore.rules` into the hardened form used for this v19 pass:

- collection-group membership discovery is limited to the authenticated user's own active membership;
- initial owner membership creation validates uid, orgId, owner role and active status;
- users cannot self-escalate their own member role/status;
- organization updates remain owner-only;
- operational writes remain limited to the operations roles;
- finance writes remain limited to owner/finance roles;
- deletes remain disabled for business records.

Do not weaken these rules to fix a UI/query problem. Verify query shapes against the actual rules and indexes.

`firebase.json` continues to deploy `firestore.rules` and `firestore.indexes.json`. The current indexes include the membership collection-group query and the live operational list queries; the Fleet action pass deliberately removed unnecessary trip/delivery-note ordering dependencies.

Any genuinely new persisted domain must have types + repository + security rules + indexes + UI workflow considered as one change.

## UploadThing

UploadThing remains the secure POD/evidence transport. Do not migrate existing evidence to Firebase Storage or another storage system during UI work.

## Type safety

For `activeOrg`, auth or other nullable context inside effects/async callbacks:

- check first;
- capture a stable primitive such as `const orgId = activeOrg.id`;
- use the captured value inside callbacks;
- do not rely on nullable narrowing surviving across async boundaries.

## QA test matrix

QA should test the application by functional category, not by page appearance alone.

### A. Access / workspace

1. Sign in with a valid user.
2. Confirm the correct workspace loads.
3. Confirm organization membership discovery works.
4. Confirm a non-member cannot read another organization's records.
5. Confirm member role/status changes do not allow self-escalation.

### B. Core CRUD

1. Customers — create/read/update.
2. Trucks — create/read/update.
3. Drivers — create/read/update.
4. Jobs — create/read/update.
5. Trips — create/read/update.
6. Confirm hard-delete actions are not exposed as successful operations.

### C. Delivery execution

1. Create/inspect a Job.
2. Create/inspect its Trip.
3. Create/inspect Delivery.
4. Create/inspect Delivery Note.
5. Add/edit material lines.
6. Record arrival and departure.
7. Record acknowledgement.
8. Upload POD/evidence through UploadThing.
9. Create/inspect a delivery exception.
10. Confirm POD completeness and invoice eligibility states update from real records.

### D. Fleet / reference actions

1. Open Fleet & Live Map.
2. Confirm live truck/trip/POD data renders from Firestore.
3. Use Trip Lookup filters.
4. Click **Pre-fill Fuel Log** and confirm the native Fuel & Workshop route receives trip/truck context.
5. Click **Pre-fill Delivery Note** and confirm the Deliveries route receives trip context.
6. Click **Open Trip Sheet** and confirm the Trips route opens the selected trip.
7. Confirm unsupported GPS, loaded/empty KM and profitability fields are clearly marked as database-not-configured rather than fabricated.

### E. Presentation-only surfaces

Open Fuel & Workshop, Invoicing & Statements, Performance Dashboard, Journal, P&L, Cash Flow, Balance Sheet and Trial Balance.

Confirm each surface is usable as a truthful product surface and does not pretend that a missing finance/workshop ledger was persisted. Any unsupported write must be clearly unavailable/configuration-state rather than a fake save.

### F. Security / regression

1. Test operations-role write access.
2. Test finance-role write access.
3. Test viewer/driver read-only boundaries.
4. Confirm cross-org reads/writes fail.
5. Confirm delivery evidence still uses UploadThing.
6. Confirm no new Firebase Storage POD/evidence path was introduced.

### G. Deployment / runtime

1. Build/typecheck/lint where available.
2. Verify the exact commit deployed.
3. Verify Vercel status from GitHub.
4. Open the deployed runtime.
5. Test authenticated navigation and at least one real CRUD mutation end-to-end.
6. Re-test the affected workflow after deployment.

## Verification

A complete engineering pass means:

`source → typecheck/build → deployment → runtime route → auth/workspace → live repository data → mutation/CRUD → responsive UI`

Do not call a Vercel deployment green without actual status evidence.

The project has `build`, `start` and `lint` scripts. Run the actual available verification path when possible and fix root causes rather than stopping at the first error.

## Current checkpoints

The finance JSX build error was fixed in:

`bca354f9710322c3b365da921eb55692cdee1e02`

The Fleet rebuild checkpoint was:

`ba530f6318bc002d3bd386d925a9eb42be4f8644`

The Fleet action-wiring checkpoint was:

`e322774e9bfa1b5122a0c9bb0643a77a01cd7425`

That commit removes unnecessary trip/delivery-note ordering requirements and wires the three Fleet Trip Lookup actions to the existing native workflows.

The current security/documentation checkpoint is:

`97d27ee835c5e3315cd821c0a793c11091390746`

It hardens the existing Firestore membership rules and records the QA matrix above. It does not create a new business domain.

## Deployment discipline

- Commit coherent work to `v19-authoritative`.
- Push every meaningful checkpoint.
- Verify the exact commit being deployed.
- Do not confuse this Translend Vercel deployment with `adminhub-global` or another project.
- If deployment evidence is unavailable, say so.

## Required workflow

### START

`read AGENTS.md → confirm branch → inspect HEAD/recent commits → inspect actual route/component/data flow`

### DESIGN / AUDIT

`inspect HTML/Figma reference → inspect native route → map reference elements to real repositories/workflows → identify unsupported domains`

### BUILD

`preserve engine → adapt FACE natively → wire real data → expose existing workflows → honest unavailable states`

### VERIFY

`inspect diff → typecheck/build/lint where available → fix root causes → verify affected workflows → inspect deployment status`

### CHECKPOINT

`update AGENTS.md when the reusable lesson/continuation point changes → commit → push → report exact SHA and verification evidence`

Do not repeatedly ask for approval for obvious safe next steps. Continue with inspect → implement → verify → commit → push → report.

## Roles

- **User / Product Owner:** final product reviewer.
- **ChatGPT:** Technical Navigator / implementation controller.
- **Claude:** hands-on coding agent.
- **VS Code / Git Bash:** local workspace, terminal, inspection and human control.
- **Git / GitHub:** source of truth and checkpoints.

## Explicit non-goals

Do NOT:

- rebuild authentication;
- replace Firebase/Firestore;
- replace UploadThing;
- introduce Firebase Storage for new POD/evidence uploads;
- weaken Firestore rules casually;
- use old AdminHub/PurePress/Translend versions because they look similar;
- discard working CRUD/delivery workflows;
- create a raw HTML/iframe application;
- fabricate live business data;
- claim a presentation-only finance/workshop surface is a persisted domain;
- stop at analysis when a safe implementation/verification step can be completed.
