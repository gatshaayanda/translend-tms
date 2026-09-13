# START HERE — AI PROJECT CONTEXT

## Authoritative project

This is **Translend TMS · Truck Division v19**.

- Repository: `gatshaayanda/translend-tms`
- Authoritative branch: `v19-authoritative`
- Current application checkpoint: `84671bb55559546a40d241cb572884da7e14c250`
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

Firestore IndexedDB persistence, multi-tab persistence, online/offline/syncing/synced states, pending-write awareness and offline shell/navigation fallback. Full offline CRUD, durable mutation queues, conflict resolution and complete offline business-data recovery are not yet claimed.

### 2. Professional Live Fleet Map — FOUNDATION COMPLETE

Real Firestore truck location events, latest position per truck, moving/idle/stale states, filters, selection, focus/pan/zoom, real marker positions when a provider is configured, location table, route trail and GPS source/timestamp. No fabricated truck locations. Automatic production fleet movement still requires a real driver GPS or telematics source and, where applicable, a map/routing provider.

### 3. GPS / Telematics Integration — FOUNDATION COMPLETE

Provider-neutral `POST /api/telematics/ingest`, server-side auth/workspace validation, provider vehicle → Translend truck mapping, validation, duplicate/idempotency protection, stale-event protection, safe mapping and normalized LIVE telemetry with `orgId`. Fleet Map consumes normalized `truckLocationEvents`. Provider credentials remain external and must never be faked.

### 4. Complete Driver Workflow — CORE COMPLETE

Driver My Trip supports `planned → en_route_pickup → loading → in_transit → unloading → completed`, assigned-driver filtering, secure server-side status changes, delivery arrival/departure, receiver acknowledgement, delivery exceptions, POD/evidence handoff, inspections, defects, defect→work-order handoff, maintenance/tyre visibility, browser GPS capture and offline awareness. Driver writes are server/role scoped; do not weaken Firestore rules.

### 5. Complete Dispatch — CORE COMPLETE

Real dispatch board/workflow, unassigned work visibility, secure truck/driver assignment, availability checks preventing double-booking, atomic trip creation + job/truck/driver updates, dispatch KPIs, search/status filtering and completion release of truck/driver and job. Dispatch creates an in-app assignment notification for linked drivers and an immutable server audit event.

### 6. Accounting — CORE CONTROL PASS COMPLETE

Implemented chart of accounts, accounting periods/open-period posting control, journal balancing/reversals, customer invoice payments, supplier bills/AP, AR/AP outstanding balances and ageing, LIVE journal visibility, finance-role server transaction boundary, finance Firestore security and correct invoice selection.

Still not claimed complete: dedicated credit/debit-note domain, full tax/VAT configuration, bank/cash reconciliation and dedicated accounting statement/export workflows.

### 7. POD / Evidence maturity — SUBSTANTIAL PASS COMPLETE; FINAL HARDENING REMAINS

Implemented secure UploadThing authorization and delivery linkage; multiple evidence categories; required POD semantics; replacement/version relationships; approval/rejection with reviewer metadata/reason; server-controlled completion requiring approved required POD; authenticated evidence proxy/view; driver-only assigned-delivery access; exception resolution through server boundary; upload failure retention + retry; missing-POD queue with ageing; POD queue navigation; POD state/invoice-readiness helpers; audit on evidence upload; operations notifications on upload/rejection.

Still to harden: deeper offline upload mutation queueing, broader evidence audit coverage and exact Delivery Note context from the POD queue.

### 8. Notifications — FOUNDATION IMPLEMENTED

Persisted org-scoped notification records, recipient-scoped reads, read/unread state, shell notification center, server role dispatcher, driver assignment notifications, POD upload/rejection notifications and driver delivery-exception escalation. Query index is present.

Still to expand: missing-POD ageing alerts, route variance, maintenance/inspection, finance due dates, driver reminders, richer exception escalation, preferences and real push/email providers. Never claim email/push live without a configured provider.

### 9. Audit / Data Integrity — FOUNDATION IMPLEMENTED

Immutable server-written `auditEvents` with client create/update/delete denied. Dispatch, evidence upload and driver delivery exceptions write audit events.

Still to expand: audit coverage across all important mutations, idempotency keys, referential/orphan checks, concurrency protection, mutation queues and partial-workflow recovery.

### 10. Workspace / Admin / Permissions — FOUNDATION NOW IMPLEMENTED

Existing invitation lifecycle remains server-controlled. Added secure server member actions for role changes, suspension and restoration, with owner protection, operations-manager limits, audit events and in-app notification to affected users. Team UI now surfaces active/suspended members and access controls.

Still to expand: owner transfer, richer permission testing, company settings/defaults, invitation cancellation/resend controls and real transactional email when configured.

### 11. Reporting / Exports / Intelligence — NEXT

Operational/fleet/trip/delivery/POD/fuel/workshop/customer/invoice/supplier/financial reports; CSV/PDF/print; management trends and drill-downs derived from persisted truth.

### 12. Full End-to-End + HTML Compliance — FINAL

Validate `job → trip → delivery → POD → invoice → payment → journal → reports`, then verify real CRUD, failure/retry, offline/sync/conflicts, permissions/multi-user, mobile driver workflow, location permission, map/provider states and every important HTML/reference control mapped to a real route/data/mutation/state or an honest unsupported/configuration state.

## External capability boundaries

Driver browser GPS is foreground and permission-based; do not claim background tracking while the app is closed. Automatic fleet telematics requires a real provider. Maps may require a real provider/key. Do not claim invitation/notification email delivery without a real provider.

## Firestore safety

Firestore rules are security boundaries, not UI configuration. Preserve workspace membership security; do not weaken rules to fix UI/query problems; verify query shapes against rules/indexes; new domains require types + repository + rules + indexes/query shape + UI workflow; preserve environment/soft-delete conventions; workspaceInvites remain server-controlled; notifications are recipient-readable and only readAt-writable by clients; auditEvents are immutable to clients.

## UploadThing

UploadThing is the secure transport for POD/evidence and finance receipts. Never migrate these to Firebase Storage.

## Failure standard

Preserve data; show clear failures; retry when safe; explain next action; avoid secrets/tokens/private diagnostics; use route/global error boundaries; show loading/success/failure states; APIs return safe non-2xx errors; unsupported integrations say not configured; never fabricate support contacts or live integrations.

## Required workflow for every future pass

`read AGENTS.md → confirm branch → inspect HEAD/recent commits → inspect actual route/component/data flow → implement coherent pass → inspect diff → typecheck/build/lint where available → fix root causes → verify affected workflows → update AGENTS.md → commit → push → report exact SHA and verification evidence`

Do not repeatedly ask for approval for obvious safe next steps.

## Explicit non-goals

Do NOT rebuild authentication, replace Firebase/Firestore, replace UploadThing, introduce Firebase Storage for new POD/evidence/receipts, weaken Firestore rules casually, reuse old project generations, discard working CRUD/delivery workflows, create a raw HTML/iframe application, fabricate live data, claim integrations are live without real providers, or stop at analysis when a safe implementation step can be completed.
