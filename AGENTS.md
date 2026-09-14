# START HERE — AI PROJECT CONTEXT

## Authoritative project

This is **Translend TMS · Truck Division v19**.

- Repository: `gatshaayanda/translend-tms`
- Authoritative branch: `v19-authoritative`
- Current application checkpoint: `0e9f9e0b640a904bf471f18b7dd877d01366d98f`
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

Rules: wire real data when it exists; preserve existing workflows and CRUD; missing domains say **Database still being configured** rather than inventing values; missing domains required for real actions are added coherently as types + repository + rules + indexes/query shape + UI workflow; never create fixtures merely to make screens look complete; never iframe or serve raw HTML as the application.

## Core operational chain

`Job → Dispatch → Trip → Delivery → Delivery Note → Material lines → Arrival → Departure → Acknowledgement → Evidence/POD → Exceptions → Invoice → Payment/Journal → Financial reporting`

## Development programme status

### 1. Offline + Sync foundation — BASELINE COMPLETE
Firestore IndexedDB persistence, multi-tab persistence, online/offline/syncing/synced states, pending-write awareness and offline shell/navigation fallback. Full offline CRUD, durable business mutation queues and conflict resolution are not universally claimed.

### 2. Professional Live Fleet Map — FOUNDATION COMPLETE
Real Firestore truck location events, latest position per truck, moving/idle/stale states, filters, selection, focus/pan/zoom, real marker positions when a provider is configured, location table, route trail and GPS source/timestamp. No fabricated truck locations. Automatic fleet movement still requires a real driver GPS or telematics source and, where applicable, a map/routing provider.

### 3. GPS / Telematics Integration — FOUNDATION COMPLETE
Provider-neutral `POST /api/telematics/ingest`, server-side auth/workspace validation, provider vehicle → Translend truck mapping, validation, duplicate/idempotency protection, stale-event protection, safe mapping and normalized LIVE telemetry with `orgId`. Provider credentials remain external and must never be faked.

### 4. Complete Driver Workflow — HARDENED CORE
Driver My Trip supports `planned → en_route_pickup → loading → in_transit → unloading → completed`, assigned-driver filtering, secure server-side status changes, delivery arrival/departure, receiver acknowledgement, delivery exceptions, POD/evidence handoff, inspections, defects, defect→work-order handoff, maintenance/tyre visibility, browser GPS capture and offline awareness. Driver writes are server/role scoped. Driver delivery arrival/departure/acknowledgement actions now use Firestore transactions with immutable audit writes in the same transaction, reject duplicate lifecycle writes, enforce arrival-before-departure/acknowledgement, and atomically update the linked Delivery + Delivery Note lifecycle state. Driver exception creation also atomically creates the exception, links it to both records and writes its audit event before notifications are attempted.

### 5. Complete Dispatch — CORE COMPLETE / HARDENED
Real dispatch board/workflow, unassigned work visibility, secure truck/driver assignment, availability checks preventing double-booking, atomic trip creation + job/truck/driver updates, dispatch KPIs, search/status filtering and completion release of truck/driver and job. Dispatch now permits only `confirmed` jobs, so retrying an already-dispatched request cannot create a second trip; the trip creation, job/truck/driver state changes and dispatch audit event are committed atomically. Assignment notification is deliberately non-authoritative and cannot turn a successful dispatch into a false client failure.

### 6. Accounting — HARDENED CONTROL PASS
Chart of accounts, accounting periods/open-period posting control, balanced journals/reversals, customer invoice payments, supplier bills/AP, AR/AP outstanding balances and ageing, LIVE journal visibility, finance-role server transaction boundary, finance Firestore security and correct invoice selection. Latest hardening: accounting API access is restricted to `owner` and `finance`; invoice payment references are duplicate-protected; supplier bills are duplicate-protected by supplier/reference; reversals are guarded against repeated reversal; payment/bill/journal mutations write immutable audit events in the same Firestore batch as the accounting mutation; journal entries, invoice payments and supplier bills are now read-only to clients and can only be mutated through authenticated server actions.

Still not claimed complete: dedicated credit/debit-note domain, full tax/VAT configuration, bank/cash reconciliation and dedicated accounting statement/export workflows.

### 7. POD / Evidence maturity — HARDENED PASS COMPLETE
Secure UploadThing authorization and delivery linkage; multiple evidence categories; required POD semantics; replacement/version relationships; approval/rejection with reviewer metadata/reason; server-controlled completion requiring approved required POD; authenticated evidence proxy/view; driver-only assigned-delivery access; exception resolution through server boundary; upload failure retry; **IndexedDB-backed offline evidence queue with automatic online retry**; missing-POD queue with ageing; POD queue now opens the exact Delivery Note context; audit events for evidence review/completion/exception resolution and upload; operations notifications on upload/rejection.

Remaining product-level extensions can still be added later, but the core POD/evidence workflow is now considered hardened rather than merely substantial.

### 8. Notifications — FOUNDATION IMPLEMENTED
Persisted org-scoped notification records, recipient-scoped reads, read/unread state, shell notification center, server role dispatcher, driver assignment notifications, POD upload/rejection notifications and driver delivery-exception escalation. Query index is present.

Still to expand: missing-POD ageing alerts, route variance, maintenance/inspection, finance due dates, driver reminders, richer exception escalation, preferences and real push/email providers. Never claim email/push live without a configured provider.

### 9. Audit / Data Integrity — EXPANDED FOUNDATION / ATOMICITY HARDENING
Immutable server-written `auditEvents` with client create/update/delete denied. Dispatch, evidence upload/review/completion, delivery exception creation/resolution, driver delivery exceptions, and driver arrival/departure/receiver acknowledgement write audit events. Accounting payment, supplier-bill, manual-journal and reversal mutations also write audit events atomically with the accounting mutation. The audit helper now supports attaching audit records to a Firestore transaction. Driver delivery lifecycle and exception mutations now commit business state + audit atomically; dispatch commits trip/business state + audit atomically as well.

Still to expand: audit coverage across all important mutations, stronger idempotency keys, referential/orphan checks, generalized mutation queues and partial-workflow recovery. Accounting duplicate guards still need transaction-level concurrency hardening where concurrent submissions can race.

### 10. Workspace / Admin / Permissions — CONTROL PASS COMPLETE
Existing invitation lifecycle remains server-controlled. Added secure server member actions for role changes, suspension/restoration, with owner protection, operations-manager limits, audit events and in-app notifications. Added a controlled owner-transfer transaction: current owner transfers ownership to an active member, becomes Operations Manager, organization `ownerUid` is updated atomically, and both parties are notified/audited. Team UI exposes member access controls and owner transfer. Firestore membership rules are hardened so clients cannot self-edit their membership documents; membership mutations remain server-controlled.

Still to expand: richer permission testing, company settings/defaults, invitation cancellation/resend controls and real transactional email when configured.

### 11. Reporting / Exports / Intelligence — OPERATIONAL PASS IMPLEMENTED
Added an org-scoped Reports & Intelligence route with LIVE-derived operational, fleet/compliance, finance, customer, fuel, workshop and inspection reporting. Reports are derived from persisted Firestore truth; no fake values. Current selected report exports CSV, and browser Print/PDF is supported through the native print dialog. Reports are available from the primary application navigation.

Current extension pass: POD readiness is a first-class report and KPI. The Reports surface shows POD items needing attention, exposes a dedicated POD readiness table, includes required-vs-approved evidence counts and rejected evidence state, supports CSV export of the POD report, and has a manual Refresh control. The refresh callback is stabilized for React effect dependencies. Report drill-down navigation is now present for Jobs, Deliveries, Invoicing, Journal, Balance Sheet, Cash Flow, Fuel & Workshop, Fleet Intelligence and Control Tower so a report signal can lead directly to its authoritative source workflow.

Still to expand: richer time-series trend charts, date/filter controls, scheduled reports, server-side large-data exports and dedicated PDF generation.

### 12. Full End-to-End + HTML Compliance — FINAL
Validate `job → trip → delivery → POD → invoice → payment → journal → reports`, then verify real CRUD, failure/retry, offline/sync/conflicts, permissions/multi-user, mobile driver workflow, location permission, map/provider states and every important HTML/reference control mapped to a real route/data/mutation/state or an honest unsupported/configuration state.

## Verification tooling

`package.json` now exposes an explicit `typecheck` script (`tsc --noEmit`) alongside build and lint, so the authoritative verification sequence is `npm run typecheck → npm run lint → npm run build` when dependency/network access is available.

## Current deployment window

GitHub `v19-authoritative` remains the active source of truth and development continues normally. The previous Vercel Free daily deployment-cap message means repeated deployment attempts must be avoided while that quota is exhausted. This is a deployment-capacity limitation, not evidence of a code failure. Accumulate coherent verified changes on GitHub, then make a deliberate Vercel deployment/promotion when capacity returns. Never claim the latest GitHub commit is live production until deployment status confirms it.

The connected Vercel account currently exposes the `adminhub-global` project but does not currently expose a `translend-tms` Vercel project in the connected team listing, so no new deployment was triggered. GitHub remains the authoritative source until the correct Vercel project is available/confirmed.

## External capability boundaries

Driver browser GPS is foreground and permission-based; do not claim background tracking while the app is closed. Automatic fleet telematics requires a real provider. Maps may require a real provider/key. Do not claim invitation/notification email delivery without a real provider.

## Firestore safety

Firestore rules are security boundaries, not UI configuration. Preserve workspace membership security; do not weaken rules to fix UI/query problems; verify query shapes against rules/indexes; new domains require types + repository + rules + indexes/query shape + UI workflow; preserve environment/soft-delete conventions; workspaceInvites remain server-controlled; notifications are recipient-readable and only readAt-writable by clients; auditEvents are immutable to clients. Membership documents are not client-self-editable. Accounting mutations are server-controlled and restricted to owner/finance roles; journal entries, invoice payments and supplier bills are client-read/server-write.

## UploadThing

UploadThing is the secure transport for POD/evidence and finance receipts. Never migrate these to Firebase Storage. Offline POD files may be temporarily persisted in browser IndexedDB until UploadThing succeeds.

## Failure standard

Preserve data; show clear failures; retry when safe; explain next action; avoid secrets/tokens/private diagnostics; use route/global error boundaries; show loading/success/failure states; APIs return safe non-2xx errors; unsupported integrations say not configured; never fabricate support contacts or live integrations.

## Required workflow for every future pass

`read AGENTS.md → confirm branch → inspect HEAD/recent commits → inspect actual route/component/data flow → implement coherent pass → inspect diff → typecheck/build/lint where available → fix root causes → verify affected workflows → update AGENTS.md → commit → push → report exact SHA and verification evidence`

Do not repeatedly ask for approval for obvious safe next steps.

## Verification note for current checkpoint

The authoritative branch is pushed through the GitHub contents API. A local `npm ci && npm run build` attempt was previously blocked by the execution environment because outbound DNS/network access to GitHub was unavailable, so this checkpoint must not be described as locally build-verified or Vercel-green. The current changes were verified through GitHub file/commit inspection. Runtime/build verification still awaits an environment with dependency/network access or the next available Vercel deployment.

## Explicit non-goals

Do NOT rebuild authentication, replace Firebase/Firestore, replace UploadThing, introduce Firebase Storage for new POD/evidence/receipts, weaken Firestore rules casually, reuse old project generations, discard working CRUD/delivery workflows, create a raw HTML/iframe application, fabricate live data, claim integrations are live without real providers, or stop at analysis when a safe implementation step can be completed.
