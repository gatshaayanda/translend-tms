# Translend TMS · Truck Division v19

## 1. Purpose

Translend TMS is a real trucking-company transport management system, not a visual demo. It is being built for real trucking operations and must progressively cover customers, trucks, drivers, jobs, trips, deliveries, delivery notes/POD, commercial operations, invoicing, fleet operations, reporting, company administration, and branded business documents.

The current implementation has a working authenticated company/workspace and a real operational vertical slice. The objective is controlled production hardening followed by expansion into the remaining TMS domains.

---

## 2. Authoritative Technical Context

- GitHub: `https://github.com/gatshaayanda/translend-tms`
- Authoritative branch: `v19-authoritative`
- Known checkpoint when this document was created: `24bed21`
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
- Firebase Storage
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

Never guess repository state, patch an old iteration, recreate working architecture unnecessarily, weaken security to make a feature work, or claim something works without verification.

Before every substantial change:

1. Inspect the actual current source and infrastructure state.
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

For an invitation to work, the authenticated Google/Gmail identity must match the intended invited account and the membership must be correctly created/active.

If an invited user cannot enter a workspace, inspect:

- authenticated email
- invitation/member record
- organization ID
- membership status
- workspace lookup
- Firestore rules
- relevant indexes

Do not create an access bypass or weaken authorization.

### Important clarification about Admin

There is **no separate platform-super-admin architecture requirement**.

The contracting company/person needs an authenticated administrative/management area so they can see how their company's Translend system is performing and manage the company's workspace as appropriate.

This remains part of the normal company/workspace model. Do not invent a second authentication hierarchy or unrelated admin product layer unless explicitly requested later.

---

## 5. Current Working Operational Spine

The following real workflow exists and must be preserved:

**Google user → user profile → organization → owner membership → secure Firestore workspace → Control Tower → Customers → Trucks → Drivers → Jobs → Trips → Deliveries**

Currently working/substantially working in the real workspace:

- Customers: real Firestore list/search/create
- Trucks: real Firestore list/create
- Drivers: real Firestore roster/create
- Jobs: real Firestore list + customer-linked creation
- Trips: job + truck + driver → trip
- Trips: status progression
- Deliveries: delivery records + POD workflow structure
- Control Tower: real workspace status/data

This is a real early operational product, not seeded-only demo behavior.

Creation works. Complete user-facing edit/delete is not yet finished.

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

### Priority 1 — Firestore indexes

Inspect actual local and Firebase state.

Known discrepancy:

- Required Firebase indexes have reportedly been created.
- `firestore.indexes.json` was not present in the known GitHub state at checkpoint `24bed21`.
- `firebase.json` did not currently reference an indexes file.

Do not blindly recreate indexes. Determine the actual state first and make infrastructure reproducible.

### Priority 2 — Firebase Storage / POD upload

There is a real deployed runtime CORS failure when uploading POD files from the Vercel application.

Investigate:

- actual Storage bucket
- Firebase client configuration
- Storage helper
- Storage rules
- authenticated user state
- active organization membership
- deployed origin
- bucket CORS configuration

Required result:

**Authenticated active workspace member → secure organization-scoped POD upload → stored evidence → retrievable POD reference**

Do not make Storage public merely to bypass the problem.

### Priority 3 — Vercel Analytics

Inspect the application/package state and integrate Vercel Analytics if it is still absent.

### Priority 4 — CRUD completion

Complete safe user-facing edit/archive/delete behavior where appropriate. The repository already has update and soft-delete capability.

### Priority 5 — Firestore rules cleanup

Clean deployment warnings without weakening organization isolation or role-based access.

### Priority 6 — End-to-end verification

Verify:

**Company → Customer → Truck → Driver → Job → Trip → Delivery → POD → status/exception handling**

Verify refresh, navigation, authentication, Firestore reads/writes, deployed behavior, and error handling. Checkpoint after hardening.

---

# 8. REAL BUSINESS DOCUMENT REQUIREMENTS

The contracting company supplied real Delivery Note and Tax Invoice content. These are now business requirements. Do not design these workflows purely from generic TMS assumptions.

## 8.1 Delivery Note

A Translend Delivery Note needs to support:

### Header

- Delivery Note number
- Date
- Time

### Company / transport details

- Company details
- Supplied To
- Vehicle Registration
- Delivery Location
- Driver Name
- Order No. / POD Ref.
- Loading Point

### Delivery lines

A delivery note may contain multiple lines. Each line can contain:

- line number
- material delivered
- arrival
- departure
- quantity
- driver sign
- foreman sign

The system should eventually support structured material/delivery line items rather than treating a delivery as one undifferentiated value.

### Receipt acknowledgement

- Received by name
- Receiver signature
- Receiver cell/contact

### Delivery condition/discrepancies

The workflow must accommodate:

- shortages
- damages
- discrepancies
- notes/evidence

---

## 8.2 POD

POD is more than a single file upload.

Conceptually:

**Job → Trip → Delivery → Delivery Note → delivery lines → acknowledgement/signatures → POD evidence → exceptions/discrepancies → invoice eligibility**

POD evidence may initially be:

- photos
- PDFs/documents
- signed delivery-note files

Digital signature capture can be added later. The immediate priority remains fixing the existing secure Firebase Storage upload.

---

# 9. Branded PDF Generation

Branded PDF generation is a core product capability for appropriate business documents.

The application should eventually generate professional PDFs for:

- Delivery Notes
- POD/delivery documentation where appropriate
- Tax Invoices
- Statements
- Receipts
- selected operational reports where PDF output is useful

Principle:

**Application data is the source of truth. PDF is the formal business-document output.**

Generated PDFs should follow the contracting company's real paperwork, terminology, and professional presentation rather than being generic SaaS documents.

### Document settings should eventually be configurable

Relevant company/admin settings can include:

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

If original visual document files become available later, use them as visual references without changing the underlying business requirements.

---

# 10. Invoice Requirements

The supplied Translend invoice contains:

### Invoice identity

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

The supplied document includes requirements around:

- claims/discrepancies being reported within 48 hours of delivery
- quantities based on load measurements unless otherwise agreed
- prices exclusive of VAT
- delivery acknowledgement by site representative signature and/or company stamp
- payment due within the calendar month of the issued invoice

Treat these as configurable business-document requirements rather than unnecessarily hardcoding them.

### Invoice lines

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

Default business currency: **BWP**

Payment terms must support:

- EOM
- NET days
- custom terms where appropriate

The supplied business uses E.O.M. as a real payment-term example.

---

# 11. Invoice / Delivery Relationship

The invoice explicitly references Delivery Note numbers.

Future commercial architecture should support:

**Completed/approved deliveries → one or multiple Delivery Notes → invoice generation → invoice lines/totals → payment tracking → statements/receivables**

One invoice may cover multiple Delivery Notes.

Do not build invoices as isolated manual forms if operational data can support source selection and aggregation.

---

# 12. Delivery Exceptions

The system should eventually support structured exceptions including:

- shortage
- damage
- quantity discrepancy
- wrong material
- refused delivery
- site issue
- vehicle issue
- other

Each exception may eventually include:

- description
- reported by
- reported at
- evidence/photos/documents
- status
- resolution

Do not overbuild this before the existing delivery/POD flow is stable.

---

# 13. Commercial Expansion

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

# 14. Fleet Expansion

After the core operational spine is reliable:

- maintenance
- inspections
- compliance
- tyres
- fuel

These should integrate with real trucks, drivers, and trips rather than becoming disconnected record-keeping screens.

---

# 15. Operations Expansion

Future operations work includes:

- richer routes
- dispatch refinement
- trip refinement
- delivery refinement
- POD robustness
- exceptions
- operational status visibility

---

# 16. Platform / Product Hardening

Future hardening includes:

- audit/activity log
- documents
- reports
- richer role/member management
- automated tests
- production error/loading/empty states
- mobile/PWA refinement
- Cloud Functions only where genuinely necessary

Do not add backend complexity simply because it is available. Prefer processing on-device where practical and safe.

---

# 17. Current Scope Status

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

- POD upload reliability
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
- reports
- documents
- audit/activity
- richer member administration
- automated tests
- complete production hardening

---

# 18. Build Philosophy

Translend must feel like a real operational system.

Prefer:

- simple workflows
- clear terminology
- useful defaults
- real business records
- secure workspace isolation
- traceable data
- professional documents
- reliable mobile-friendly operation

Avoid:

- unnecessary jargon
- fake dashboards
- mock-only workflows presented as real
- duplicate architecture
- speculative abstractions
- overengineering
- rebuilding functioning components
- generic workflows that contradict supplied company paperwork

The system should become more capable without becoming unnecessarily complicated.

---

# 19. Strategic Build Order

Execute in this order unless inspection reveals a more urgent dependency/blocker:

1. Inspect actual repository/infrastructure state
2. Resolve Firestore index discrepancy
3. Fix Firebase Storage/POD upload
4. Integrate/verify Vercel Analytics
5. Complete edit/delete lifecycle
6. Clean Firestore rules warnings
7. End-to-end verify current operational spine
8. Checkpoint
9. Upgrade Delivery → Delivery Note → POD workflow
10. Add branded PDF document generation
11. Build Commercial / Invoice workflow
12. Build company owner/admin visibility and configuration
13. Expand Fleet
14. Expand Operations
15. Reports, audit, documents, testing and final production hardening

The order can change only when actual inspection demonstrates a dependency or blocker.

---

# 20. Agent Handoff Rule

Every coding agent must begin by reading this document and inspecting the actual repository state.

Do not assume that a prior patch, screenshot, conversation summary, or remembered architecture is newer than the current repository.

The current repository is the implementation truth.

When uncertain:

**STOP. INSPECT. THEN BUILD.**

---

## Important Reference Links

- Repository: https://github.com/gatshaayanda/translend-tms
- Firebase project: https://console.firebase.google.com/project/translend-tms-dcd2a/overview
- Firebase Firestore indexes: https://console.firebase.google.com/project/translend-tms-dcd2a/firestore/indexes
- Vercel application: https://translend-tms.vercel.app/

These links are references for inspection. Do not assume a URL proves current state; verify the live configuration and repository.
