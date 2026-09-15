# START HERE — Translend TMS · Truck Division v19

## Authoritative project
- Repository: `gatshaayanda/translend-tms`
- Branch: `v19-authoritative`
- Stack: Next.js 15.5.15 + TypeScript + Tailwind + Firebase Auth/Firestore + Vercel
- Firestore = business/source of truth.
- UploadThing = POD/evidence and finance-receipt transport. Never reintroduce Firebase Storage.
- Never replace Firebase with Supabase/another backend.
- GitHub/current HEAD outranks remembered chat context and old patches.
- Do not reset, revert, branch away, or reuse an older generation.

## Product north star
`Job → Dispatch → Trip → Delivery → POD/evidence → Invoice → Payment → Journal → Reporting`

Every important workflow must trace the real mutation, authorization, atomicity, retry/idempotency, audit and reporting consequences. A screen or successful UI state is not proof that the business operation works.

## Current development state — 2026-09-15
The core Truck Division operating system is now substantially implemented. Development is continuing on the remaining accounting/control modules before the project is considered feature-complete.

### Implemented core
- Company/workspace, authentication, membership and roles.
- Explicit multi-workspace selection with valid last-active workspace handling.
- Customers: LIVE CRUD, edit and controlled archive.
- Trucks: LIVE CRUD, edit and controlled retirement; active-trip retirement is blocked server-side.
- Drivers: LIVE CRUD/edit and signed-in account linking by exact email.
- Jobs: customer-linked commercial/date validation and controlled lifecycle.
- Dispatch: transactional Job + Truck + Driver assignment with idempotency key and replay receipt.
- Trips: driver progression plus audited adjacent corrections in both directions, including safe completion reopening. No arbitrary status jumping.
- Driver workflow: field trip actions, delivery progression, vehicle actions and durable offline action queue/replay.
- Delivery: automatic delivery creation/linking when a trip reaches unloading, linked Delivery Note, required POD gating, evidence review/replacement and exception handling.
- POD/evidence: UploadThing-backed evidence finalization is transactional/idempotent and audited.
- GPS: browser capture with hardened permission flow and authenticated server persistence through `/api/driver/location`; driver writes are constrained to the linked truck/trip. Background GPS is not claimed.
- Fleet inspections, defects, work orders and related offline/replay paths.
- PWA shell, Firestore persistence and supported durable offline queues. No persistent misleading sync banner.
- Finance server actions for invoice raising, customer payments, journal posting/reversal, fuel expense and supplier bills.
- LIVE Firestore-derived reporting.
- Canonical branded printable Tax Invoice and Delivery Note components/routes, tied to authoritative LIVE records.
- Vercel Analytics/Speed Insights infrastructure.

### Latest feature push
`0fd839c9f997d0b920117a4ede62cfc02a1f2ca5` — controlled Credit & Debit Notes.

This adds:
- Finance/owner-only Credit & Debit Notes surface.
- Server-authoritative `/api/accounting/invoice-adjustment` mutation.
- Separate immutable adjustment documents under `invoiceAdjustments` rather than rewriting issued invoices.
- Credit/debit journal posting and audit records.
- Credit-note ceiling against the invoice's current adjusted balance.
- Navigation entry and breadcrumb for the new control surface.

The previous checkpoint `da4160d13ffdbdb1e1c5764e3cd7cc7b33a8fa56` already contained the canonical printable document implementation.

## Remaining substantive product development
Priority order:
1. **Full VAT/tax configuration** — workspace tax settings, taxable/exempt handling, tax-inclusive/exclusive calculation, authoritative invoice tax fields, VAT journal treatment and document presentation.
2. **Bank reconciliation** — bank transaction/import model, matching against customer payments/journal entries, reconciliation state, controlled adjustments and audit trail.
3. **Payroll / driver settlement** — driver/subcontractor settlement records, trip-linked earnings/costs, approval/payment state and journal consequences.
4. **Richer scheduled/export reporting** — operational/financial report periods, durable exports and scheduled report infrastructure where useful.
5. **Provider integrations** — email, push notifications, telematics and external/background mapping capabilities where a real provider is selected.

These are product-development items, not QA claims. Do not mark them complete merely because a placeholder screen or server action exists.

## Canonical printable documents
Translend Tax Invoice and Delivery Note are functional business documents, not generic templates.

### Tax Invoice requirements
- Translend Proprietary Limited identity and physical/postal address fields.
- Invoice date and unique invoice number.
- Client reference / PO number.
- Linked Delivery Note number(s).
- Issued-by, email and contact fields.
- Customer address/contact information.
- Standard Translend claims/discrepancy, measurement, VAT and delivery acknowledgement wording.
- Line items with date, description, quantity, unit price and BWP amount.
- Payment terms, balance due and Translend bank/payment details.
- Tax/VAT totals must come from authoritative finance data; never hard-code financial amounts.

### Delivery Note requirements
- Delivery Note number, date/time and customer/supplied-to identity.
- Delivery location, order/POD reference, vehicle and driver.
- Loading point, material/description, arrival, departure and quantity.
- Driver/foreman acknowledgement and received-by/signature/contact fields where applicable.
- Standard shortage/damage/discrepancy wording.
- Remains linked to the LIVE Job, Trip and POD/evidence record.

### Document integrity
- Documents are downstream projections of authoritative records, never a second source of truth.
- Issued document numbering and financial values are not silently rewritten.
- Corrections use controlled credit/debit or operational workflows.
- Document generation is permission-controlled and auditable.
- Print/PDF layout, pagination, BWP formatting, signatures and customer-facing wording must be verified against the canonical supplied examples.

## Hardening rules
### Firebase and client security
- Server-controlled Trip/Delivery/finance/exception collections are client-write denied.
- Delivery Note client updates are allowlisted.
- Historical truck location events are append-only.
- Finance/accounting mutations are server-authoritative.
- Never weaken rules to hide an authorization problem.

### Atomicity and transactions
- Firestore transaction reads/queries must finish before writes.
- Delivery mutations, evidence finalization, dispatch and finance operations must preserve atomic business state.
- Accounting-period checks belong inside the transaction read set.
- Never directly create accounting records from the browser.

### Finance
Always trace:
`completed POD → invoice → adjustment/payment → AR/Cash journal → reporting`.

Check duplicate invoice/payment/reference, customer/job/POD linkage, positive amounts, open accounting period, overpayment, journal balance, adjustment integrity, audit, concurrency and lost-response behavior.

Credit/debit notes are separate immutable adjustments. Do not rewrite issued invoices to represent corrections.

### Offline/reliability
- PWA shell and Firestore persistence are real infrastructure, not a status-message simulation.
- Supported owner/operations dispatch and trip corrections use durable queue/idempotency/replay controls.
- Driver field mutations use durable queue/replay receipts and blocked terminal failures.
- Finance/accounting remains explicitly online/server-authoritative until each mutation receives a deliberate safe offline/idempotency design.
- Do not market archive/retire actions as offline-complete merely because a queue type can represent them.

### GPS
- Permission request stays directly on the Start button geolocation call path.
- Do not put an awaited Permissions API preflight in front of the user-gesture request.
- Do not claim background tracking.
- Persist successful locations through the authenticated server route with workspace/role/truck/driver checks.

## Production QA checkpoint
The latest production-QA work exposed and fixed:
- trip correction,
- workspace selection,
- driver linking,
- customer edit/archive,
- truck edit/retire,
- owner/operations dispatch/trip offline queue/idempotency,
- driver GPS permission/persistence,
- misleading PWA sync banner.

These fixes require actual production verification when QA resumes. Do not confuse that verification status with development completeness.

## Development workflow
Required sequence when tooling is available:
`inspect HEAD → typecheck → lint → build → affected workflow verification → AGENTS update → commit → push → deployment status`

Never call a deployment green without actual status evidence. Do not repeatedly trigger deployments while quota is exhausted.

Future agents:
`read AGENTS.md → confirm branch/current HEAD → inspect recent commits → trace business mutation paths → inspect rules/indexes/config → attack retry/offline/concurrency/security edges → fix root cause → inspect diff → verify → update AGENTS.md → commit/push → report exact SHA/status`.
