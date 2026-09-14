# START HERE — Translend TMS · Truck Division v19

## Authoritative project
- Repository: `gatshaayanda/translend-tms`
- Branch: `v19-authoritative`
- Current checkpoint: latest `v19-authoritative` HEAD; verify the branch before continuing.
- Stack: Next.js 15.5.15 + TypeScript + Tailwind + Firebase Auth/Firestore + Vercel
- Firestore = business/source of truth.
- UploadThing = POD/evidence and finance-receipt transport.
- Never introduce Firebase Storage for POD/evidence/receipts.
- Never replace Firebase with Supabase/another backend.
- GitHub/current HEAD outranks remembered chat context and old patches.

## Product north star
`Job → Dispatch → Trip → Delivery → POD/evidence → Invoice → Payment → Journal → Reporting`

A screen, button, Firestore document, offline banner or successful UI state is not proof that the business operation works. Trace the real mutation, authorization, atomicity, retry/idempotency, audit and reporting consequences.

## Current state
- Company/workspace, users/roles, customers, trucks, drivers: LIVE workspace data and CRUD foundations exist; customer, driver and truck management surfaces expose practical correction/retirement controls and remain subject to production verification.
- Job → Dispatch → Trip: transactional dispatch and driver trip progression are implemented.
- Delivery/POD: required POD gating, evidence review/replacement, exceptions and completion validation exist.
- Driver offline actions: durable queue + replay receipts + blocked terminal failures exist for field mutations.
- Fleet inspections/defects/work orders/offline replay: hardened path exists.
- GPS/telematics: provider boundary exists; no fake locations or background-tracking claims.
- Finance: invoice/payment/journal/fuel/supplier-bill server actions exist; finance stays online/server-controlled.
- Reporting: LIVE Firestore-derived reporting exists.
- **Canonical branded documents:** Translend Tax Invoice and Delivery Note are now an explicit product requirement. Printable documents must be generated from authoritative LIVE customer/job/delivery/POD/finance records and must preserve the supplied Translend document semantics and branding rather than producing generic invoice/POD templates.

Still not claimed complete: exact final printable Tax Invoice/Delivery Note template implementation and verification, full tax/VAT configuration, credit/debit notes, bank reconciliation, payroll/settlement, richer scheduled/export reporting, and provider-dependent email/push/telematics/map capabilities.

## Canonical Translend printable documents
The supplied Nicolaus M. Nshoya / Translend examples are the reference business documents for v19. Treat them as functional requirements, not merely visual inspiration.

### Tax Invoice must support
- Translend Proprietary Limited identity and physical/postal address fields.
- Invoice date and unique invoice number.
- Client reference / PO number.
- Delivery Note number(s) linked to the invoice.
- Issued-by, email and contact fields.
- Customer physical/postal address and contact person/contact details.
- Invoice notes covering the 48-hour claims/discrepancy window, load-measurement basis, VAT treatment, delivery acknowledgement by site representative signature/company stamp, and applicable vehicle/reference wording.
- Line items with date, description, quantity, unit price and BWP amount.
- Payment terms including E.O.M. and balance due.
- Translend bank/payment details and invoice reference.
- Totals/VAT presentation must come from authoritative finance data; never hard-code amounts into a document.

### Delivery Note must support
- Delivery Note number, date and time.
- Company/supplied-to identity.
- Delivery location.
- Order number / POD reference.
- Vehicle registration and driver name.
- Loading point.
- Delivered material/description, arrival, departure and quantity.
- Driver and foreman acknowledgement/signature fields where applicable.
- Received-by name, signature and cell/contact.
- Standard receipt/discrepancy wording stating that shortages, damages or discrepancies should be noted at delivery.
- Delivery Note must remain linked to the live Job, Trip and POD/evidence record.

### Document integrity rules
- Printable documents are downstream projections of authoritative records; they must not become a second source of truth.
- Invoice delivery-note references must resolve to real records in the same workspace/customer/job chain.
- A document must never silently invent, blank, or stale-copy customer, vehicle, driver, quantities, prices or financial totals when authoritative data exists.
- Generated documents must preserve immutable document numbering/version semantics after issue; corrections should use controlled finance/operational workflows rather than silently rewriting issued records.
- Document generation must be permission-controlled and auditable.
- Verify print/PDF layout, pagination, BWP formatting, dates, signatures/evidence placeholders, and customer-facing wording against the canonical supplied examples.

## v19 hardening lessons
### Firebase Storage
`src/lib/firebase/storage.ts` was dead legacy code. `getFirebase()` intentionally returns only `{ app, auth, db }` because v19 uses UploadThing for POD/evidence/receipts. Never reintroduce Firebase Storage just to satisfy TypeScript.

### Atomic delivery mutations
`/api/deliveries/workflow-action` transactionally handles delivery creation and admin arrival/departure/acknowledgement. Client rules deny direct Delivery/Trip state writes and allow only explicitly editable Delivery Note fields.

### Transaction read ordering
All Firestore transaction reads/queries must finish before writes. Delivery exception resolution was corrected to follow this rule.

### Atomic/replay-safe evidence
UploadThing evidence finalization is transactional, keyed by file key for idempotency, updates linked records together and audits inside the transaction.

### Client Firestore security
Server-controlled Trip/Delivery/finance/exception collections are client-write denied. Truck/Driver/Job status/assignment fields are protected. Delivery Note client updates are allowlisted. Historical truck location events are append-only.

### Finance concurrency
Accounting-period checks are inside the transaction read set. Supplier-bill journal entries retain `supplierBillId`. Finance errors distinguish 401/403/400/404/409/500.

### Job integrity and dispatch concurrency
Job creation validates same-workspace customer references, commercial/date invariants and positive rates. Dispatched Job commercial identity/schedule are protected. Dispatch uses one transaction over Job + Truck + Driver and handles concurrency conflicts correctly.

### Operational trip corrections
Production QA exposed that an owner could advance a trip but had no correction path. The Trips register and My Trip view now expose adjacent correction. `/api/driver/trip-status` enforces one-step movement in either direction, audits from/to status and direction, and safely reopens completed truck/driver/job state. No arbitrary status jumping.

### Workspace and driver identity QA
Multiple workspaces now require explicit choice unless a valid last-active workspace exists. Fleet/operations users have a visible Driver "Link account" action backed by `/api/fleet/link-driver`, requiring active membership and exact Driver-record email matching. Drivers have an Edit path.

### Customer management QA
Customer management now exposes Edit and Archive. Customer archive is routed through `/api/operations/archive-record`, where role authorization and open-job checks are enforced server-side before soft deletion. The UI is not trusted as the business control.

### Truck management QA
Truck management now exposes Edit and Retire. Truck edit only changes descriptive vehicle fields; server-controlled status/assignment fields are not edited by the register. Retire is routed through `/api/operations/archive-record`, which requires an authorized operational role, checks for active trips server-side, and then soft-deletes the truck. Never rely only on a disabled UI button to protect an active operational assignment.

## Offline/reliability checklist
For every driver/field action:
1. Can it be entered offline?
2. Is it durably queued?
3. Does UI show local-save state?
4. Does reconnect replay automatically?
5. Can a lost response duplicate the mutation?
6. Does a terminal server rejection become blocked/attention-required?
7. Can the visited workflow reload offline?
8. Does replay survive another network loss without infinite retry?

Firestore transactions are not offline-capable, so money/state-changing server transactions require an explicit online boundary and safe retry/idempotency design. Do not blindly make finance mutations offline.

## Finance checklist
Always trace `completed POD → invoice → payment → AR/Cash journal → reporting`.
Check duplicate invoice/payment/reference, customer/job/POD linkage, positive amount, open accounting period, overpayment, supplier bill linkage, journal balance, reversal integrity, audit, concurrency and lost-response behavior.

Never let a client directly create accounting records. Prefer one server transaction for operational + accounting state that must succeed together.

## Fleet/TMS benchmark
Current fleet references consistently treat dispatch, mobile driver workflows, offline field operation, ePOD, inspections, maintenance/work orders, fuel/cost control, visibility and reporting as connected workflows. Use current Trimble/Fleetio/Samsara references as behavioral benchmarks, not feature-cloning instructions.

## Deployment/verification
Required sequence when tooling is available:
`inspect HEAD → typecheck → lint → build → affected-workflow verification → AGENTS update → commit → push → Vercel status`

Never call a deployment green without actual status evidence.
Do not repeatedly trigger deployments while the Hobby quota is exhausted and do not claim the current commit is deployed.

## Required workflow for future agents
`read AGENTS.md → confirm branch/current HEAD → inspect recent commits → trace real business mutation paths → inspect rules/indexes/config → compare with current TMS behavior → deliberately attack retry/offline/concurrency/security edges → fix root cause → inspect diff → run verification available → update AGENTS.md → commit/push → inspect deployment status → report exact SHA/status`

Do not reset, revert, branch away, or reuse an older generation. Do not invent data, weaken security, or paper over compiler/runtime failures.

## Production QA checkpoint — 2026-09-14
The deployed production checkpoint `df7fbd7` was manually QA-tested before later HEAD could deploy. Initial gaps were Customers/Trucks/Drivers management UI, workspace selection, driver identity linking, and trip correction.

Current hardening status:
- **Trip correction:** fixed in latest HEAD; owners/operations and linked drivers can make audited adjacent corrections in either direction, including safe completion reopening. Needs production verification.
- **Workspace choice:** fixed in latest HEAD; multi-org accounts require an explicit chooser unless a valid last-active workspace is available. Needs production verification.
- **Driver linking:** fixed in latest HEAD; fleet/operations can link a real signed-in account to a Driver record by exact email, and Drivers can be edited. Needs production verification.
- **Customer management:** fixed in latest HEAD with Edit + server-controlled Archive. Needs production verification.
- **Truck management:** fixed in latest HEAD with Edit + server-controlled Retire; retirement is blocked server-side for trucks carrying an active trip. Needs production verification.

After management/identity QA is closed and verified, continue the connected real-world chain:
`owner workspace → customer/truck/driver management → invite/link driver → assign trip → driver coordination/status correction → delivery/POD → invoice → payment/owed → journal/reporting → canonical printable documents`.

Finance must be validated as a connected consequence of completed POD, not treated as complete because finance server actions merely exist.
