# Translend TMS · Truck Division v19

## 1. Purpose

Translend TMS is a real trucking-company transport management system, not a visual demo. It is being built for real trucking operations. The product must progressively cover customers, trucks, drivers, jobs, trips, deliveries, Delivery Notes/POD, commercial operations, invoicing, fleet operations, reporting, company administration, and branded business documents.

The current implementation has a working authenticated company/workspace and a real operational vertical slice. The objective is controlled production hardening followed by expansion into the remaining TMS domains.

This project is intentionally different from the user's other web products. Do not force Translend into a generic CRUD/SaaS pattern. The trucking workflow, real paperwork, dispatch/delivery chain, POD, invoicing, fleet, and operational visibility are the product.

---

## 2. Authoritative Technical Context

- GitHub: `https://github.com/gatshaayanda/translend-tms`
- Authoritative branch: `v19-authoritative`
- Current authoritative checkpoint at this document revision: `5552c60`
- Local authoritative working project remains the existing Windows rebuild workspace. Do not move or restructure it.
- Do not initialise another Git repository.
- Do not restart the application from scratch.
- Do not replace the architecture because an implementation detail is inconvenient.

Stack:

- Next.js App Router
- TypeScript
- Tailwind
- Firebase Authentication
- Firebase Firestore
- Firebase Storage (legacy/reference only; do not use as a new POD upload path unless explicitly re-authorized after inspection)
- UploadThing for secure POD/evidence file transport
- Vercel
- PWA direction

Firebase is authoritative. Do not substitute Supabase.

Firebase project: `translend-tms-dcd2a`

---

## 3. Mandatory Engineering Workflow

Use:

**START → INSPECT → BUILD → VERIFY → CHECKPOINT → CONTINUE/RECOVER**

Golden rule:

> If reality differs from expectation: STOP, inspect the actual state, determine why, then make the smallest correct change.

Every coding session must begin by reading this file and inspecting the actual current repository state. Conversation memory is not implementation truth; the repository is.

Never guess repository state, patch an old iteration, recreate working architecture unnecessarily, weaken security to make a feature work, or claim something works without verification.

Before every substantial change:

1. Inspect actual source and infrastructure state.
2. Identify the exact implementation path.
3. Make one controlled change.
4. Inspect the diff.
5. Run appropriate checks.
6. Verify runtime behavior.
7. Commit and push a meaningful checkpoint.

---

## 4. Product / Workspace Access Model

The real product flow is:

**Google Sign-In → authenticated user → create workspace/company OR existing workspace invitation → organization/workspace membership → secure Firestore workspace → application**

A user may create their own workspace or be invited to an existing workspace.

For an invitation to work, the authenticated Google/Gmail identity must match the intended invited account and the membership must be correctly created and active.

If an invited user cannot enter a workspace, inspect:

- authenticated email
- invitation/member record
- organization ID
- membership status
- workspace lookup
- Firestore rules
- relevant indexes

Do not create an access bypass or weaken authorization.

### Admin clarification

There is **no separate platform-super-admin architecture requirement**.

The person contracting the application needs authenticated administrative/management visibility into their company's Translend workspace so they can see how the application is performing and manage the company workspace as appropriate.

This remains part of the normal company/workspace model. Do not invent a second authentication hierarchy or unrelated platform-admin product layer unless explicitly requested later.

---

## 5. Current Working Operational Spine

The following real workflow exists and must be preserved:

**Google user → user profile → organization → owner membership → secure Firestore workspace → Control Tower → Customers → Trucks → Drivers → Jobs → Trips → Deliveries**

Currently working/substantially working:

- authentication
- workspace/company creation and access
- organization membership
- Firestore workspace isolation
- Control Tower
- Customers: real Firestore list/search/create
- Trucks: real Firestore list/create
- Drivers: real Firestore roster/create
- Jobs: real Firestore list + customer-linked creation
- Trips: job + truck + driver → trip
- Trips: status progression
- Deliveries: delivery records + POD workflow structure
- core organization-scoped repository
- environment separation
- role-aware rules foundation
- Vercel deployment

Creation works. Complete user-facing edit/delete is not yet finished.

This is a real early operational product, not seeded-only demo behavior.

---

## 6. Data / Environment Rules

The repository/data layer supports:

- LIVE
- DEMO
- SEED
- FIXTURE

Do not mix seeded/demo content with LIVE operational company data.

The generic organization-scoped repository supports create, update, list, subscribe, getById, softDelete, audit fields, and environment filtering. Preserve this architecture unless inspection demonstrates a real technical reason to change it.

---

## 7. Current Hardening Priorities

### 7.1 Firestore indexes

Inspect actual local and Firebase state.

Known discrepancy:

- Required Firebase indexes have reportedly been created.
- `firestore.indexes.json` was not present in the known GitHub state at checkpoint `24bed21`.
- `firebase.json` did not currently reference an indexes file.

Do not blindly recreate indexes. Determine actual state first and make infrastructure reproducible.

### 7.2 POD evidence transport

The previous Firebase Storage path had a deployed runtime/CORS failure. Do not spend the next patch rebuilding or bypassing that path.

Current infrastructure checkpoint `ff313d4` added UploadThing route/core infrastructure and Firebase Admin support. The authoritative evidence architecture is now:

**Authenticated active workspace member → organization/membership authorization → UploadThing evidence transport → organization-scoped Firestore evidence metadata/reference → retrievable authorized POD evidence**

Firebase Firestore remains the business/source-of-truth database. UploadThing transports/stores evidence files; it does not replace operational records.

Do not make Firebase Storage public. Do not create a parallel Storage upload flow. Inspect and complete the existing UploadThing integration during Delivery/POD work.

### 7.3 Vercel Analytics

Inspect application/package state and integrate Vercel Analytics if still absent.

### 7.4 CRUD completion

Complete safe user-facing edit/archive/delete behavior where appropriate. The repository already has update and soft-delete capability.

### 7.5 Firestore rules cleanup

Clean deployment warnings without weakening organization isolation or role-based access.

### 7.6 End-to-end verification

Verify:

**Company → Customer → Truck → Driver → Job → Trip → Delivery → POD → status/exception handling**

Verify refresh, navigation, authentication, Firestore reads/writes, deployed behavior, and error handling. Checkpoint after hardening.

---

# 8. REAL BUSINESS DOCUMENT REQUIREMENTS

The contracting company supplied real Delivery Note and Tax Invoice content. These are business requirements. Do not design these workflows purely from generic TMS assumptions.

## 8.1 Delivery Note

Support:

- Delivery Note number
- Date
- Time
- Company details
- Supplied To
- Vehicle Registration
- Delivery Location
- Driver Name
- Order No. / POD Ref.
- Loading Point
- multiple delivery/material lines
- material delivered
- arrival
- departure
- quantity
- driver signature
- foreman signature
- received-by name
- receiver signature
- receiver cell/contact
- shortages
- damages
- discrepancies
- notes/evidence

A delivery note may contain multiple material lines. Model these structurally; do not reduce the document to a single free-text delivery field.

## 8.2 POD

POD is more than one file URL.

Conceptually:

**Job → Trip → Delivery → Delivery Note → delivery lines → acknowledgement/signatures → POD evidence → exceptions/discrepancies → invoice eligibility**

POD evidence may initially be photos, PDFs/documents, and signed delivery-note files. Digital signature capture can be added later.

The immediate priority is completing and verifying the existing UploadThing-backed secure evidence flow inside the real Delivery/POD workflow.

---

# 9. BRANDED PDF GENERATION

Branded PDF generation is a core product capability, not an optional reporting feature.

Eventually generate professional PDFs for:

- Delivery Notes
- POD/delivery documentation where appropriate
- Tax Invoices
- Statements
- Receipts
- selected operational reports where PDF output is useful

Principle:

**Application data is the source of truth. PDF is the formal business-document output.**

Generated PDFs should follow the contracting company's real paperwork, terminology, and professional presentation rather than being generic SaaS documents.

Document/company settings should eventually support:

- company name
- logo
- physical address
- postal address
- contact details
- email
- document numbering
- Delivery Note numbering
- invoice numbering
- invoice/payment information
- default invoice notes
- payment terms
- VAT configuration
- footer/legal wording

Do not hardcode sensitive financial details into frontend source.

---

# 10. INVOICE REQUIREMENTS

The supplied Translend invoice contains:

### Identity

- Date
- Invoice number
- Client reference / PO number
- Delivery Note numbers

### Translend details

- company name
- physical address
- postal address
- issued by
- email
- contact

### Customer details

- physical address
- postal address
- contact person
- contact

### Invoice notes

The supplied document includes:

- claims/discrepancies reported within 48 hours of delivery
- quantities based on load measurements unless otherwise agreed
- prices exclusive of VAT
- delivery acknowledgement by site representative signature and/or company stamp
- payment due within the calendar month of the issued invoice

Treat these as configurable business-document requirements rather than unnecessarily hardcoding them.

### Lines

- item
- date
- description
- quantity
- unit price
- amount in BWP

### Payment

- payment terms
- balance due
- bank/payment details
- invoice payment reference

Default business currency: **BWP**.

Payment terms must support EOM, NET days, and custom terms where appropriate. The supplied business uses E.O.M. as a real payment-term example.

---

# 11. INVOICE / DELIVERY RELATIONSHIP

The invoice explicitly references Delivery Note numbers.

Future commercial architecture should support:

**Completed/approved deliveries → one or multiple Delivery Notes → invoice generation → invoice lines/totals → payment tracking → statements/receivables**

One invoice may cover multiple Delivery Notes.

Do not build invoices as isolated manual forms if operational data can support source selection and aggregation.

---

# 12. DELIVERY EXCEPTIONS

Eventually support structured exceptions including:

- shortage
- damage
- quantity discrepancy
- wrong material
- refused delivery
- site issue
- vehicle issue
- other

Each exception may include description, reported by/at, evidence/photos/documents, status, and resolution.

Do not overbuild this before delivery/POD is stable.

---

# 13. REFERENCE REPOSITORIES — USE AS ENGINEERING/PRODUCT CONTEXT

These are the user's own reference repositories. They are not permission to copy unrelated architecture. Inspect them when a question overlaps their strengths.

### AdminHub Global

`https://github.com/gatshaayanda/adminhub-global`

Use as a reference for the user's established admin/dashboard patterns, reusable Next.js conventions, and product-system approach.

### Accessibility Canvas

`https://github.com/gatshaayanda/accessibility-canvas`

Use as a reference for accessibility-conscious UI, interaction quality, semantic structure, and accessible product patterns. Accessibility is part of Translend quality, not a final cosmetic pass.

### PurePress / current product reference

`https://github.com/gatshaayanda/purepress`

The current repository content identifies this as the BoardSignal v10 product source, including persistent authenticated rooms, operational admin controls, Firebase patterns, PWA support, analytics, testing, security boundaries, and explicit acceptance checks. Use it as a reference for mature product discipline, not as a source for transplanting chess-specific functionality.

Reference principle:

**AdminHub = reusable product/admin foundation patterns**

**Accessibility Canvas = accessibility/interaction quality reference**

**PurePress/BoardSignal = mature product operations, testing, Firebase/PWA/security and acceptance-check discipline**

**Translend = its own trucking-domain architecture and source of truth**

---

# 14. COMPETITOR / MARKET BENCHMARK

Before major feature decisions, check current leading fleet/TMS products online. The goal is not to clone them; it is to ensure Translend does not omit the obvious capabilities a real trucking operator now expects.

Recent benchmark research indicates that leading products such as Motive and Samsara increasingly combine dispatch, driver workflows, stop-level task completion, document/signature capture, real-time operational visibility, maintenance, inspections, compliance, fuel, alerts, reporting, and customer visibility.

Relevant current examples:

- Motive driver workflows guide drivers through stops, can automatically record arrival/departure with geofencing, collect documents/signatures, and support custom forms. citeturn0search0turn0search3
- Motive Dispatch provides job creation/import, route planning, resource assignment, real-time dispatch tracking, driver-submitted notes/photos/signatures, customer tracking links/ETAs, and dispatch reporting/alerts. citeturn0search7turn0search15
- Motive's current driver experience combines dispatch, compliance, inspections, documents/qualifications, POD, safety, timecards, and messaging. citeturn0search2
- Samsara's current platform includes maintenance, routing/dispatch, compliance, fuel, documents/workflows, reports, issues, notifications and alerts. citeturn0search17
- Samsara's workflow/document tooling emphasizes digital POD, trip sheets, digital signatures, document capture, alerts, and a unified operations view. citeturn0search11
- Samsara maintenance connects defects/inspections to work orders, cost tracking, vendor performance and asset uptime. citeturn0search4

### Translend benchmark rule

For every major domain, ask:

> What is the obvious real-world job the operator is trying to accomplish, and what would a serious current competitor already make easy?

Then build the smallest Translend-native version that solves that job well.

Do not add features merely because a competitor has them. Add them when they directly improve the trucking workflow, reduce manual work, improve visibility, protect data, or improve billing/operational accuracy.

### High-value capabilities to benchmark and progressively cover

1. Dispatch board / operational control tower
2. Driver mobile workflow
3. Stop-by-stop status
4. Arrival/departure capture
5. POD and signature capture
6. Customer/job/order visibility
7. Route/dispatch planning
8. Exceptions and alerts
9. Vehicle inspections
10. Maintenance and defects
11. Compliance/document expiry
12. Fuel and operating cost tracking
13. Driver/vehicle utilization
14. Customer updates / tracking where practical
15. Invoicing tied to completed operational work
16. Receivables/statements
17. Reporting and profitability
18. Audit/history
19. Offline/mobile resilience where operationally valuable
20. Accessible, simple, low-friction interfaces

Translend does not need expensive telematics or every enterprise feature to be credible. It does need to make the core operational chain exceptionally obvious and reliable.

---

# 15. PRODUCT PRINCIPLE: MAKE THE OBVIOUS THING OBVIOUS

The UI should make the next operational action obvious.

Examples:

- A dispatcher should immediately see what needs attention.
- A driver should immediately know the next stop/task.
- A delivery should immediately show whether POD is complete.
- A manager should immediately see what is delayed, missing, or at risk.
- A completed delivery should clearly become invoice-ready when business conditions are met.
- A customer record should connect clearly to jobs, trips, deliveries and invoices.
- A truck should make its current status, defects, maintenance and availability understandable.

Prefer exception-first visibility over dashboards full of decorative metrics.

Use clear statuses, actionable empty states, direct next actions, and meaningful history.

---

# 16. COMMERCIAL EXPANSION

After operational hardening and Delivery Note/POD refinement, build:

- rate cards
- job rates
- expenses
- invoices
- receipts
- statements
- receivables
- profitability
- P&L

Invoices should be based on actual completed/approved operational records where possible.

---

# 17. FLEET EXPANSION

After the core operational spine is reliable:

- maintenance
- inspections
- compliance
- tyres
- fuel

These should integrate with real trucks, drivers, and trips rather than becoming disconnected record-keeping screens.

---

# 18. OPERATIONS EXPANSION

Future operations work includes:

- richer routes
- dispatch refinement
- trip refinement
- delivery refinement
- POD robustness
- exceptions
- operational status visibility
- driver-facing workflows
- useful alerts/notifications
- customer-facing progress visibility where practical

---

# 19. PRODUCT HARDENING

Future hardening includes:

- audit/activity log
- documents
- reports
- richer role/member management
- automated tests
- production error/loading/empty states
- mobile/PWA refinement
- offline-safe workflows where appropriate
- Cloud Functions only where genuinely necessary

Do not add backend complexity simply because it is available. Prefer processing on-device where practical and safe.

Accessibility should be treated as a quality gate, not a last-minute polish pass.

---

# 20. CURRENT SCOPE STATUS

### Working / substantially working

- authentication
- workspace creation/access
- organization membership
- Firestore workspace isolation
- Control Tower
- customers
- trucks
- drivers
- jobs
- trips
- deliveries
- core repository
- environment separation
- role-aware rules foundation
- Vercel deployment

### Not yet complete

- POD evidence flow completion/reliability using the committed UploadThing architecture
- complete edit/delete UI
- rules warning cleanup
- analytics integration
- Delivery Note first-class workflow
- full POD workflow
- branded PDF generation
- rate cards
- expenses
- invoicing
- receipts
- statements
- profitability/P&L
- maintenance
- inspections
- compliance
- tyres
- fuel
- richer routes/dispatch
- driver-facing workflow
- customer tracking/updates where appropriate
- reports
- documents
- audit/activity
- richer member administration
- automated tests
- complete production hardening

---

# 21. STRATEGIC BUILD ORDER

Use Claude aggressively for the largest safe contiguous work packages, but every package must still follow START → INSPECT → BUILD → VERIFY → CHECKPOINT.

Unless inspection reveals a dependency/blocker, use this order:

### Phase A — Foundation hardening

1. Inspect actual repository/infrastructure state.
2. Resolve Firestore index discrepancy.
3. Verify the committed UploadThing POD infrastructure is correctly wired to the authenticated organization model.
4. Integrate/verify Vercel Analytics.
5. Complete edit/delete lifecycle.
6. Clean Firestore rules warnings.
7. End-to-end verify current operational spine.
8. Checkpoint.

### Phase B — Real delivery workflow (NEXT BUILD PACKAGE / PATCH 2)

9. Inspect the existing Delivery UI, delivery types, repository, organization model, and committed UploadThing infrastructure before changing architecture.
10. Upgrade Delivery into a first-class Delivery Note workflow while preserving existing live records and organization isolation.
11. Add structured material/delivery lines with quantity/unit fields; no single free-text substitute.
12. Add Delivery Note identity and operational fields: number, date/time, supplied-to, vehicle registration, location, order/POD reference, loading point, arrival and departure.
13. Add acknowledgement fields: driver name/signature state, foreman/receiver name, receiver signature state, receiver contact, and clear completion status. Do not block this package on advanced drawn-signature capture if the current architecture does not already support it.
14. Wire photos/PDF/doc evidence through the existing UploadThing infrastructure, with Firestore metadata linked to organization → delivery → delivery note/evidence.
15. Add structured exceptions: shortage, damage, quantity discrepancy, wrong material, refused delivery, site issue, vehicle issue, other; include description/status/evidence references.
16. Compute and display POD completeness and invoice eligibility from actual delivery state; do not use decorative/manual-only status flags.
17. Add a branded Delivery Note/POD print/PDF-ready output only if it can be completed from application source-of-truth data in this package without inventing a parallel document model.
18. Verify the full path: Job → Trip → Delivery → Delivery Note → lines → arrival/departure → acknowledgement → evidence → exceptions → POD completeness → invoice eligibility.
19. Run build/lint/type checks and runtime verification, inspect the diff, then checkpoint and push.

**Patch 2 non-goals:** invoicing UI, rate cards, fleet expansion, telematics, a new auth model, Firebase Storage upload revival, or unrelated architecture rewrites.

### Phase C — Commercial workflow

16. Add rate cards/job rates.
17. Add expenses.
18. Build invoice generation from completed/approved deliveries.
19. Add branded Tax Invoice PDFs.
20. Add receipts and payment tracking.
21. Add statements/receivables.
22. Add profitability/P&L.
23. Checkpoint.

### Phase D — Fleet and dispatch

24. Maintenance.
25. Inspections/defects.
26. Compliance/expiry visibility.
27. Tyres.
28. Fuel.
29. Better dispatch board.
30. Driver-facing/mobile workflow.
31. Route/stop progression and useful alerts.
32. Customer progress visibility where practical.
33. Checkpoint.

### Phase E — Production excellence

34. Reports.
35. Audit/activity.
36. Documents.
37. Automated tests.
38. Accessibility verification.
39. Offline/mobile resilience where appropriate.
40. Performance, loading, empty and error states.
41. Security review.
42. Final end-to-end production verification.

The order can change only when actual inspection demonstrates a dependency or blocker.

---

# 22. AGENT HANDOFF RULE

Every coding agent must begin by reading this document and inspecting the actual repository state.

Do not assume that a prior patch, screenshot, conversation summary, remembered architecture, or competitor feature list is newer than the current repository.

The current repository is the implementation truth.

Competitor research is a benchmark, not an instruction to clone another product.

When uncertain:

**STOP. INSPECT. THEN BUILD.**

---

## Important Reference Links

### Translend

- Repository: https://github.com/gatshaayanda/translend-tms
- Firebase project: https://console.firebase.google.com/project/translend-tms-dcd2a/overview
- Firestore indexes: https://console.firebase.google.com/project/translend-tms-dcd2a/firestore/indexes
- Deployed application: https://translend-tms.vercel.app/

### User's engineering/product references

- AdminHub Global: https://github.com/gatshaayanda/adminhub-global
- Accessibility Canvas: https://github.com/gatshaayanda/accessibility-canvas
- PurePress / current BoardSignal source: https://github.com/gatshaayanda/purepress

### Competitor benchmark references

- Motive Driver Workflow: https://helpcenter.gomotive.com/hc/en-us/articles/30914499707549-Driver-Workflow
- Motive Dispatch: https://helpcenter.gomotive.com/hc/en-us/articles/30898637140893-Dispatch
- Motive Dispatch Overview: https://helpcenter.gomotive.com/hc/en-us/articles/31079587105693-Dispatch-Overview
- Motive Driver App Overview: https://helpcenter.gomotive.com/hc/en-us/articles/31054123805853-Driver-App-Overview
- Samsara Fleet Application Suite: https://www.samsara.com/pages/fleet-application-suite
- Samsara Connected Workflows: https://www.samsara.com/products/platform/connected-forms
- Samsara Connected Maintenance: https://www.samsara.com/products/telematics/fleet-maintenance

These links are inspection references. They do not override the repository or the contracting company's actual business requirements.
