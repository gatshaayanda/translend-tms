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
The core Truck Division operating system is substantially implemented. Development is continuing on the remaining accounting/control modules before feature-complete status.

### Implemented core
- Company/workspace, authentication, membership and roles.
- Explicit multi-workspace selection with valid last-active workspace handling.
- Customers: LIVE CRUD, edit and controlled archive.
- Trucks: LIVE CRUD, edit and controlled retirement; active-trip retirement blocked server-side.
- Drivers: LIVE CRUD/edit and signed-in account linking by exact email.
- Jobs: customer-linked commercial/date validation and controlled lifecycle.
- Dispatch: transactional Job + Truck + Driver assignment with idempotency key and replay receipt.
- Trips: driver progression plus audited adjacent corrections in both directions, including safe completion reopening. No arbitrary status jumping.
- Driver workflow: field trip actions, delivery progression, vehicle actions and durable offline action queue/replay.
- Delivery: automatic Delivery/Delivery Note linkage when a trip reaches unloading, required POD gating, evidence review/replacement and exceptions.
- POD/evidence: UploadThing-backed evidence finalization is transactional/idempotent and audited.
- GPS: hardened browser permission flow and authenticated server persistence through `/api/driver/location`; driver writes are constrained to linked truck/trip. Background GPS is not claimed.
- Fleet inspections, defects, work orders and related offline/replay paths.
- PWA shell, Firestore persistence and supported durable offline queues. No persistent misleading sync banner.
- Finance server actions for invoice raising, customer payments, journal posting/reversal, fuel expense and supplier bills.
- LIVE Firestore-derived reporting.
- Canonical branded printable Tax Invoice and Delivery Note components/routes tied to authoritative LIVE records.
- Vercel Analytics/Speed Insights infrastructure.

### Latest development checkpoints
- `0fd839c9f997d0b920117a4ede62cfc02a1f2ca5` — controlled Credit & Debit Notes.
- `b54aa2afd7aaa9202e5d5c577c814cd78fab478d` — development checkpoint documentation update.
- `51aca15c2570bee36f62fb220425b64994b59dd6` — workspace Tax & VAT controls.
- `95399ebe6b8034b6a846c486778696a3098d666b` — authenticated VAT preview endpoint and calculation primitives checkpoint.

### Credit & Debit Notes
- Finance/owner-only Credit & Debit Notes surface.
- Server-authoritative `/api/accounting/invoice-adjustment` mutation.
- Separate `invoiceAdjustments` documents; issued invoices are not silently rewritten.
- Credit/debit journal posting and audit records.
- Credit-note ceiling against the invoice's current adjusted balance.
- Navigation and breadcrumb included.
- Further integration remains: customer-payment outstanding calculations and reporting must incorporate adjustment balances consistently.

### Tax & VAT controls
- Finance/owner-only `/tax-vat` surface.
- Server-authoritative `/api/accounting/tax-settings` GET/PUT endpoint.
- Workspace-level enabled/exempt setting, standard rate, inclusive/exclusive mode, tax code, VAT registration number and legal tax name.
- Added reusable server-safe `src/lib/accounting/tax.ts` calculation primitives for exclusive and inclusive VAT, with rounded net/tax/gross breakdowns.
- Added authenticated `/api/accounting/tax-preview` endpoint so finance/owner users can validate the authoritative workspace tax configuration against an amount without mutating accounting records.
- VAT is still **not complete**: invoice creation, VAT journal posting, adjustment/tax interaction and canonical invoice document presentation must consume the same calculation path before the module is marked complete.

## Remaining substantive product development
Priority order:
1. **Complete VAT/tax integration** — consume workspace settings during invoice creation, calculate tax-inclusive/exclusive totals, store authoritative subtotal/tax/total fields, post VAT correctly to the journal and render tax fields on the canonical invoice. The reusable calculation/preview layer now exists.
2. **Bank reconciliation** — bank transaction/import model, matching against customer payments/journal entries, reconciliation state, controlled adjustments and audit trail.
3. **Payroll / driver settlement** — driver/subcontractor settlement records, trip-linked earnings/costs, approval/payment state and journal consequences.
4. **Richer scheduled/export reporting** — operational/financial report periods, durable exports and scheduled report infrastructure where useful.
5. **Provider integrations** — email, push notifications, telematics and external/background mapping capabilities where a real provider is selected.

These are product-development items, not QA claims. Do not mark a module complete merely because a placeholder screen or server action exists.

## Canonical printable documents
Translend Tax Invoice and Delivery Note are functional business documents, not generic templates.
- Tax Invoice: Translend identity/address, invoice date/number, client reference/PO, linked Delivery Notes, issuer/contact, customer address/contact, standard Translend claims/discrepancy/measurement/VAT/delivery wording, line items, payment terms, balance due and bank/payment details.
- Delivery Note: number/date/time, customer/supplied-to, location, order/POD reference, vehicle/driver, loading point, material/quantity, arrival/departure, acknowledgements/signatures/contact and discrepancy wording.
- Documents are downstream projections of authoritative records, never a second source of truth.
- Issued numbering and financial values are not silently rewritten; corrections use controlled workflows.
- Document generation is permission-controlled and auditable.
- Print/PDF layout, pagination, BWP formatting, signatures and wording must be verified against the canonical supplied examples.

## Hardening rules
### Firebase/security
- Server-controlled Trip/Delivery/finance/exception collections are client-write denied.
- Delivery Note client updates are allowlisted.
- Historical truck location events are append-only.
- Finance/accounting mutations are server-authoritative.
- Never weaken rules to hide an authorization problem.

### Transactions
- Firestore transaction reads/queries must finish before writes.
- Delivery mutations, evidence finalization, dispatch and finance operations must preserve atomic business state.
- Accounting-period checks belong inside the transaction read set.
- Never directly create accounting records from the browser.

### Finance
Always trace:
`completed POD → invoice → adjustment/payment → AR/Cash journal → reporting`.
Check duplicate invoice/payment/reference, customer/job/POD linkage, positive amounts, open accounting period, overpayment, adjustment integrity, journal balance, audit, concurrency and lost-response behavior.
Credit/debit notes are separate immutable adjustments; do not rewrite issued invoices.
VAT calculations must use `src/lib/accounting/tax.ts` semantics consistently across invoice, journal, adjustment and document layers once integrated.

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

These fixes require actual production verification when QA resumes. Do not confuse verification status with development completeness.

## Development workflow
Required sequence when tooling is available:
`inspect HEAD → typecheck → lint → build → affected workflow verification → AGENTS update → commit → push → deployment status`

Never call a deployment green without actual status evidence. Do not repeatedly trigger deployments while quota is exhausted.

Future agents:
`read AGENTS.md → confirm branch/current HEAD → inspect recent commits → trace business mutation paths → inspect rules/indexes/config → attack retry/offline/concurrency/security edges → fix root cause → inspect diff → verify → update AGENTS.md → commit/push → report exact SHA/status`.
