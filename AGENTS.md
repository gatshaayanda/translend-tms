# START HERE — AI PROJECT CONTEXT

## Authoritative project

This is **Translend TMS · Truck Division v19**.

- Repository: `gatshaayanda/translend-tms`
- Branch: `v19-authoritative`
- Stack: Next.js 15.5.15 + TypeScript + Tailwind + Firebase Auth/Firestore + Vercel
- Firestore = business/source of truth.
- UploadThing = POD/evidence and finance receipt transport.
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
- If a reference expects a domain that genuinely does not exist, do not fake live data.
- When a missing domain is now required to make a product action real, add it coherently as **types + repository + security rules + indexes/query shape + UI workflow**.
- Never create fixtures merely to make a screen look complete.
- Never iframe or serve the raw HTML as the application.

## Current v19 product state

The native application covers:

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

The real operational chain is:

`Job → Trip → Delivery → Delivery Note → Material lines → Arrival → Departure → Acknowledgement → Evidence → Exceptions → POD completeness → Invoice → Journal`

Existing CRUD/repositories/listeners/security/workspace behavior must remain intact.

## Button and interaction rule

Every reference button/control must be classified before implementation:

1. **Navigation/action already supported by the engine** → wire it to the real native route/workflow.
2. **Existing data operation** → connect it to the existing repository/mutation and preserve security/workspace boundaries.
3. **Reference-only domain not yet persisted** → keep the designed surface, but clearly mark it as **Database still being configured** rather than inventing a write.
4. **Action belongs to another route** → pass the relevant context into that route where the receiving workflow supports it.
5. **A previously missing domain is now required for a genuine product action** → implement the smallest coherent persisted domain rather than leaving an inert button.

A button that only looks clickable is not complete.

### Fleet action checkpoint

The Fleet trip actions are wired from real Trip Lookup records:

- **Pre-fill Fuel Log** → `/fuel-workshop` with `truckId` and `tripId` context.
- **Pre-fill Delivery Note** → `/deliveries` with `tripId` context.
- **Open Trip Sheet** → `/trips` with `tripId` context.

### Finance/workshop action checkpoint

The previously inert v19 finance/workshop controls are now backed by persisted domains:

- **Raise invoice** → creates an `invoices` record and its Accounts Receivable / Haulage Revenue journal entry from a completed POD.
- **Log fuel / Save Fuel Log** → creates a `fuelLogs` record and Fuel Expense journal entry.
- **Attach Receipt** → UploadThing `financeReceipt` upload updates the fuel log; no Firebase Storage is introduced.
- **Create Work Order** → creates a `workOrders` record.
- **Create Supplier PO** → creates a `supplierPOs` record.
- **Post Transaction** → creates a `journalEntries` record.
- **Export** → exports the live journal to CSV rather than pretending to have a Google Sheets integration.
- **P&L / Cash Flow / Balance Sheet / Trial Balance** → derive displayed figures from persisted LIVE journal entries rather than demo figures.

Finance/workshop collections are organization-scoped and role-protected in Firestore. Operational fuel/workshop/PO writes use operations roles; invoice and journal writes use owner/finance roles.

## Firestore safety

Firestore rules are security boundaries, not UI configuration.

- Preserve organization/workspace membership security.
- Do not weaken rules to fix a UI/query problem.
- Verify query shapes against the actual rules and indexes.
- Any new domain must have types + repository + security rules + indexes/query shape + UI workflow considered as one change.
- New finance/workshop collections currently use the generic environment/deletedAt query shape without additional ordering indexes.

## UploadThing

UploadThing remains the secure transport for POD/evidence and finance receipts. Do not migrate existing evidence or receipts to Firebase Storage.

## Verification

A complete pass means:

`source → typecheck/build → deployment → runtime route → auth/workspace → live repository data → mutation/CRUD → responsive UI`

Do not call a Vercel deployment green without actual status evidence.

The project has `build`, `start` and `lint` scripts. Run the actual available verification path when possible and fix root causes rather than stopping at the first error.

## Current checkpoints

- Finance JSX build error fixed: `bca354f9710322c3b365da921eb55692cdee1e02`
- Fleet rebuild: `ba530f6318bc002d3bd386d925a9eb42be4f8644`
- Fleet action wiring: `e322774e9bfa1b5122a0c9bb0643a77a01cd7425`
- Firestore security hardening: `97d27ee835c5e3315cd821c0a793c11091390746`
- Finance/workshop domain types + repositories: `b264590b4818079339f40c3000684d123f8bdf64`
- Finance/workshop Firestore rules: `b5f19ef86a59dccbee4bf7ad662c80d4f77a86d3`
- UploadThing finance receipt support: `6e52abc8b97c45b2fb58c48a9c2bf796aad0d0fd`
- Finance/workshop UI action implementation: `9fbd8216ef4060ef8677ae5261bc7d7ce8a6b9b7`

The latest application code checkpoint above was submitted to Vercel. Verify the exact SHA before calling deployment green.

## Required workflow

### START

`read AGENTS.md → confirm branch → inspect HEAD/recent commits → inspect actual route/component/data flow`

### DESIGN / AUDIT

`inspect HTML/Figma reference → inspect native route → map reference elements to real repositories/workflows → identify unsupported domains`

### BUILD

`preserve engine → adapt FACE natively → wire real data → expose existing workflows → add a coherent domain only when a real product action requires it`

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
- introduce Firebase Storage for new POD/evidence or receipt uploads;
- weaken Firestore rules casually;
- use old AdminHub/PurePress/Translend versions because they look similar;
- discard working CRUD/delivery workflows;
- create a raw HTML/iframe application;
- fabricate live business data;
- stop at analysis when a safe implementation/verification step can be completed.
