# START HERE — AI PROJECT CONTEXT

## Authoritative project

This is **Translend TMS · Truck Division v19**.

- Repository: `gatshaayanda/translend-tms`
- Authoritative branch: `v19-authoritative`
- Current application checkpoint: `12b85aea774c9dc6f0fd2b8ea30814259239640b`
- Stack: Next.js 15.5.15 + TypeScript + Tailwind + Firebase Auth/Firestore + Vercel
- Firestore = business/source of truth.
- UploadThing = POD/evidence and finance receipt transport.
- Never introduce Firebase Storage for new POD/evidence or receipts.
- Never replace Firebase with Supabase or another backend.
- Never reuse older AdminHub/PurePress/Translend generations as implementation sources.

Git/GitHub are the source of truth. Current repository state outranks remembered chat context or older patches.

## Product architecture

`FACE + SHELL + ENGINE + PRODUCT DATA = PRODUCT`

- FACE = HTML/Figma/screenshots/copy/layout/interaction reference.
- SHELL = AdminHub-style app frame, responsive UI and PWA utilities.
- ENGINE = auth, workspace, Firestore, repositories, APIs, security, uploads, business logic and CRUD.
- PRODUCT DATA = real persisted customer/operational records.

Wire real data when it exists. Missing domains say **Database still being configured** rather than inventing values. Missing domains required for real actions are added coherently as types + repository + rules + indexes/query shape + UI workflow. Never create fixtures merely to make screens look complete. Never iframe or serve raw HTML as the application.

## Core operational chain

`Job → Dispatch → Trip → Delivery → Delivery Note → Arrival → Departure → Receiver acknowledgement → Evidence/POD → Exceptions → Invoice → Payment → Journal → Financial reporting`

The north-star acceptance test is one real transport job completing that entire chain with correct state, audit and reporting outcomes.

## Development programme status

### 1. Foundation — STRONG
Company/workspace, authenticated users/roles, customers, trucks and drivers are persisted LIVE records with workspace scoping and real CRUD foundations.

### 2. Job → Dispatch → Trip → Delivery — HARDENED CORE
Real job creation, confirmation, dispatch, assignment, trip execution and delivery lifecycle exist. Dispatch prevents double booking and commits trip/job/truck/driver state atomically. Driver trip progression is server-authorized and transactionally audited. Completion releases the truck/driver and completes the linked job.

### 3. POD / Evidence — HARDENED
UploadThing evidence transport, required-POD semantics, replacement/version metadata, approval/rejection, authenticated evidence access, exception linkage, completion gating, retry queue, missing-POD queue and audit coverage are implemented. Delivery completion, evidence review and exception resolution use atomic server transactions. Offline POD files/actions use browser persistence until they can sync.

### 4. Finance → Invoice → Payment → Journal — HARDENED CONTROL / CONNECTED BILLING
Finance mutations are server-controlled. Invoice raising validates completed POD + Job + Customer + positive Job rate + open accounting period and creates Invoice + AR/Haulage Revenue journal + audit atomically. Payment, supplier bill, manual journal, reversal and fuel expense actions have transaction boundaries and duplicate/concurrency controls.

Still not claimed complete: dedicated credit/debit notes, full tax/VAT configuration, bank/cash reconciliation, dedicated accounting statement/export workflows and settlement/payroll modules.

### 5. Fleet / GPS / Telematics — FOUNDATION + REAL PROVIDER BOUNDARY
Fleet map consumes real `truckLocationEvents` only. GPS/telematics ingestion is provider-neutral, authenticated, mapped to Translend trucks, validated, idempotent and stale-event protected. Browser GPS is foreground/permission-based. No background tracking or fabricated locations are claimed. External map/telematics credentials remain configuration boundaries.

### 6. Driver mobile workflow — HARDENED + OFFLINE FIELD OPERATION
Driver My Trip supports trip progression, delivery milestones, POD, exceptions, inspections, defects, work-order handoff, maintenance/tyre visibility and location capture.

**Important correction:** offline was previously treated as complete when only Firestore persistence/PWA state had been implemented. That was insufficient. The driver field workflow now has a durable IndexedDB mutation queue for:
- trip status
- delivery arrival/departure/receiver acknowledgement/exception
- vehicle inspections
- vehicle defects/work-order creation
- POD/evidence upload retry

Queued server mutations carry idempotency keys and are replayed after reconnect/auth readiness. The server records replay receipts transactionally so a successful request whose response is lost cannot be applied twice.

Firestore native persistence still handles cached reads and supported direct Firestore writes; full offline proof of every admin CRUD surface remains a QA obligation. Finance mutations intentionally remain online/server-controlled because replaying money movements without a deliberate accounting idempotency/period design would be unsafe.

### 7. Reliability / Data Integrity — ACTIVE HARDENING
Major business transactions are atomic and audit-backed. Driver server actions now return meaningful HTTP classes instead of converting all failures into 400/401 responses. Replay-safe mutation receipts protect offline/server retries. Firestore rules now preserve the immutable record envelope (`orgId`, environment, creator, creation timestamp, soft-delete state) during client updates and block client access to server-only mutation receipts.

Remaining reliability targets: broader mutation audit coverage, generalized idempotency beyond driver actions, referential/orphan checks, conflict-resolution UX, offline admin CRUD proof, partial-workflow recovery and stronger concurrency test coverage.

### 8. Workspace / Admin / Permissions — CONTROL PASS
Server-controlled member role/suspension/restoration and owner transfer are transactionally audited. Membership documents are not client-self-editable. Accounting remains owner/finance restricted; operational mutations use workspace roles.

Still to expand: richer permission test matrix, company defaults/settings, invitation cancellation/resend and real transactional email when configured.

### 9. Notifications — FOUNDATION
Persisted org-scoped notification records, recipient-scoped reads, read/unread state, shell notification center, driver assignment, POD upload/rejection and delivery-exception notifications exist. Notification delivery is non-authoritative and never converts a committed business mutation into a failure.

Still to expand: ageing alerts, route variance, maintenance/inspection alerts, finance due dates, driver reminders, escalation rules, preferences and real push/email providers.

### 10. Reporting / Intelligence — OPERATIONAL PASS
Reports are derived from LIVE Firestore truth. Current reporting covers operations, fleet/compliance, customers, invoices, supplier bills, journal activity, fuel, workshop, inspections, POD readiness and control-tower views. CSV and browser Print/PDF are available. Drill-down links lead to authoritative workflows.

Still to expand: richer trend charts, date/filter controls, scheduled reports, server-side large-data exports and dedicated PDF generation.

## QA-prevention rules — learned from missed issues

Before declaring a workflow complete, do not only inspect whether a screen exists. Exercise the mutation path under the conditions a real transport operator will hit.

### Offline checklist
For every driver field action ask:
1. Can the driver enter it with no connection?
2. Is the action durably stored locally?
3. Does the UI immediately acknowledge that it is saved locally?
4. Does reconnect replay it automatically?
5. Can a lost response/retry create a duplicate?
6. Does a server rejection remain visible with a useful next action?

Competitor/reference evidence supports this standard: Firebase documents offline cache/write synchronization, and current fleet products explicitly support offline inspections and mobile field workflows. Firestore transactions are not offline-capable, while batched/direct writes can be persisted offline; therefore transaction-backed business actions need explicit queues rather than a connectivity banner alone.

### Security/integrity checklist
For every client-writable collection verify:
- workspace path and `orgId` cannot drift;
- environment cannot be changed by an ordinary client update;
- `createdAt`/`createdBy` cannot be rewritten;
- soft-delete state cannot be resurrected casually;
- business-sensitive state changes use a server transaction where necessary;
- audit records are immutable to clients;
- query constraints actually satisfy Firestore rules;
- no broad rule accidentally overrides a restrictive rule.

Firestore rules are not filters: a query must itself satisfy the rule constraints. Field-level protection should use `diff().affectedKeys()`/`unchangedKeys()` where appropriate.

### Error-contract checklist
HTTP errors must distinguish at least authentication (401), authorization (403), invalid input (400), missing resource (404), state/concurrency conflict (409), and unexpected server failure (500). Do not return 400/401 for every exception because this destroys retry and support semantics.

### Location checklist
A location/map failure must be diagnostic, not just `Missing or insufficient permissions`. Verify:
- authoritative `firestore.rules` is deployed;
- active app uses the intended Firebase project (`translend-tms-dcd2a`);
- active workspace membership exists and is active;
- query shape matches rules/indexes;
- location provider/configuration is clearly separated from Firestore permission failures.

Never weaken rules to hide a permission failure.

### Driver/fleet reference checklist
Current TMS/fleet references consistently treat dispatch, tracking/visibility, mobile driver workflows, ePOD/POD, inspections, maintenance/work orders, fuel/cost control, notifications and reporting as connected operating workflows. The product should therefore be judged by business completion and recovery, not by the number of routes/screens.

Reference checks used during v19 hardening included Firebase Firestore offline/transaction guidance and current Trimble, Fleetio and Samsara fleet/TMS capabilities. These references are benchmarks, not instructions to clone enterprise-only features.

## External capability boundaries

- Driver browser GPS is foreground and permission-based; do not claim background tracking.
- Automatic fleet telematics requires a real provider.
- Maps/routing may require a real provider/key.
- Invitations, notifications and reports must not claim email/push/scheduled delivery without a configured provider.
- UploadThing remains the evidence/receipt transport. Never add Firebase Storage for these new domains.

## Firestore safety

Firestore rules are security boundaries, not UI configuration. Preserve workspace membership security. Do not weaken rules to fix UI/query problems. Verify query shapes against rules/indexes. New domains require types + repository + rules + indexes/query shape + UI workflow. Preserve environment/soft-delete conventions. Workspace invites remain server-controlled. Notifications are recipient-readable and only their read-state fields are client-writable. Audit events and mutation receipts are server-only. Accounting mutations are server-controlled and restricted to owner/finance roles.

## Verification tooling

`package.json` exposes:
- `npm run typecheck`
- `npm run lint`
- `npm run build`

Authoritative sequence: `npm run typecheck → npm run lint → npm run build` when dependency/network access is available. Never report green without actual evidence. Local dependency/build verification has previously been blocked by outbound network/DNS constraints.

## Deployment

GitHub `v19-authoritative` is the source of truth. Never claim a GitHub commit is live production until Vercel deployment status confirms it. Previous Vercel Free daily deployment-cap messages mean repeated deployment attempts should be avoided while quota is exhausted. The connected Vercel account previously did not expose the correct `translend-tms` project, so deployment status must be checked deliberately when capacity/project access is available.

## Required workflow for every future pass

`read AGENTS.md → confirm branch → inspect HEAD/recent commits → inspect actual route/component/data flow → compare against current product/reference expectations → implement the root fix, not only the visible symptom → inspect diff → typecheck/lint/build where available → verify affected workflows → update AGENTS.md → commit → push → report exact SHA and verification evidence`

Do not stop at analysis when a safe implementation step can be completed. Do not ask for approval for obvious safe hardening.

## Explicit non-goals

Do NOT rebuild authentication, replace Firebase/Firestore, replace UploadThing, introduce Firebase Storage for new POD/evidence/receipts, weaken Firestore rules casually, reuse old project generations, discard working CRUD/delivery workflows, create a raw HTML/iframe application, fabricate live data, claim integrations are live without real providers, or add enterprise features merely for parity when they do not move the actual transport business flow forward.
