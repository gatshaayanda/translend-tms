# START HERE — AI PROJECT CONTEXT

## Authoritative project

This is **Translend TMS · Truck Division v19**.

- Repository: `gatshaayanda/translend-tms`
- Branch: `v19-authoritative`
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

## Firestore safety

Firestore rules are security boundaries, not UI configuration.

- Preserve organization/workspace membership security.
- Do not weaken rules to fix a UI/query problem.
- Verify query shapes against the actual rules and indexes.
- Any new domain must have types + repository + security rules + indexes + UI workflow considered as one change.

## UploadThing

UploadThing remains the secure POD/evidence transport. Do not migrate existing evidence to Firebase Storage or another storage system during UI work.

## Type safety

For `activeOrg`, auth or other nullable context inside effects/async callbacks:

- check first;
- capture a stable primitive such as `const orgId = activeOrg.id`;
- use the captured value inside callbacks;
- do not rely on nullable narrowing surviving across async boundaries.

## Verification

A complete pass means:

`source → typecheck/build → deployment → runtime route → auth/workspace → live repository data → mutation/CRUD → responsive UI`

Do not call a Vercel deployment green without actual status evidence.

The project has `build`, `start` and `lint` scripts. Run the actual available verification path when possible and fix root causes rather than stopping at the first error.

## Current checkpoint

The finance JSX build error was fixed in:

`bca354f9710322c3b365da921eb55692cdee1e02`

The Fleet rebuild checkpoint was:

`ba530f6318bc002d3bd386d925a9eb42be4f8644`

The latest Fleet action-wiring checkpoint is:

`e322774e9bfa1b5122a0c9bb0643a77a01cd7425`

That commit removes unnecessary trip/delivery-note ordering requirements and wires the three Fleet Trip Lookup actions to the existing native workflows.

At the time of this checkpoint, Vercel for `e322774e9bfa1b5122a0c9bb0643a77a01cd7425` was still reporting **pending/deploying**. Do not call it green until the GitHub Vercel status becomes `success`.

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
