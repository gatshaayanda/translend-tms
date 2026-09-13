# START HERE — AI PROJECT CONTEXT

## Authoritative project

This is **Translend TMS · Truck Division v19**.

- Repository: `gatshaayanda/translend-tms`
- Authoritative branch: `v19-authoritative`
- Current application checkpoint: `7a466867b18f165e48b4680bf6d586c6b906d588`
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

Rules:
- Wire real data when it exists.
- Preserve existing workflows and CRUD.
- Missing domains say **Database still being configured** rather than inventing values.
- If a missing domain is required for a real product action, add it coherently as types + repository + rules + indexes/query shape + UI workflow.
- Never create fixtures merely to make screens look complete.
- Never iframe or serve raw HTML as the application.

## Current product state

Native application covers Operations Hub / Control Tower, Fleet & Live Map foundation, Fleet Intelligence, Trips / Dispatch, Delivery Notes / POs, POD/evidence workflow, Customers, Drivers, Fuel & Workshop, Invoicing & Statements, Performance Dashboard, Journal Entry, P&L / Cash Flow / Balance Sheet / Trial Balance, Business Controls, Team / Invitations and Driver My Trip PWA workflow.

Core operational chain:

`Job → Dispatch → Trip → Delivery → Delivery Note → Material lines → Arrival → Departure → Acknowledgement → Evidence/POD → Exceptions → Invoice → Payment/Journal → Financial reporting`

## Development programme status

### 1. Offline + Sync foundation — BASELINE COMPLETE

- Firestore IndexedDB persistence.
- Multi-tab persistence.
- Online/offline/syncing/synced states.
- Pending-write awareness.
- Offline shell/navigation fallback.

Not yet claimed: full offline CRUD, durable mutation queues, conflict resolution and complete offline business-data recovery.

### 2. Professional Live Fleet Map — FOUNDATION COMPLETE

Real Firestore truck location events, latest position per truck, moving/idle/stale states, filters, selection, focus/pan/zoom, real marker positions when a provider is configured, location table, route trail and GPS source/timestamp. No fabricated truck locations.

Automatic production fleet movement still requires a real driver GPS or telematics source and, where applicable, a map/routing provider.

### 3. GPS / Telematics Integration — FOUNDATION COMPLETE

Provider-neutral `POST /api/telematics/ingest`, server-side auth/workspace validation, provider vehicle → Translend truck mapping, validation, duplicate/idempotency protection, stale-event protection, safe mapping and normalized LIVE telemetry with `orgId`. Fleet Map consumes normalized `truckLocationEvents`.

Provider choice and credentials remain external dependencies and must never be faked.

### 4. Complete Driver Workflow — CORE COMPLETE

Driver My Trip supports `planned → en_route_pickup → loading → in_transit → unloading → completed`, assigned-driver filtering, secure server-side status changes, delivery arrival/departure, receiver acknowledgement, delivery exceptions, POD/evidence handoff, inspections, defects, defect→work-order handoff, maintenance/tyre visibility, browser GPS capture and offline awareness.

Driver writes are server/role scoped; do not weaken Firestore rules to make UI work.

### 5. Complete Dispatch — CORE COMPLETE

Real dispatch board/workflow, unassigned work visibility, secure truck/driver assignment, availability checks preventing double-booking, atomic trip creation + job/truck/driver updates, dispatch KPIs, search/status filtering and completion release of truck/driver and job. Dispatch now also creates an in-app assignment notification for a linked driver and writes an immutable server audit event.

### 6. Accounting — CORE CONTROL PASS COMPLETE

Implemented chart of accounts, accounting periods/open-period posting control, journal balancing and reversals, customer invoice payments, supplier bills/AP, AR/AP outstanding balances and ageing, LIVE journal visibility, finance-role server transaction boundary, finance Firestore security and correct invoice selection.

Transaction actions:
- invoice payment → payment record + AR/Cash journal;
- supplier bill → AP/expense journal;
- manual journal → balanced journal;
- journal reversal → balanced reversal journal.

Still not claimed complete: dedicated credit/debit-note domain, full tax/VAT configuration, bank/cash reconciliation and dedicated accounting statement/export workflows.

### 7. POD / Evidence maturity — SUBSTANTIAL PASS COMPLETE; FINAL END-TO-END HARDENING REMAINS

Implemented:
- secure UploadThing authorization and delivery/Delivery Note linkage;
- multiple evidence categories;
- required POD semantics;
- replacement/version relationships;
- approval/rejection with reviewer metadata and rejection reason;
- server-controlled delivery completion;
- approved-POD requirement before completion;
- secure authenticated evidence viewing/proxying;
- driver-only access to assigned delivery evidence;
- exception resolution through server boundary;
- upload failure retention + retry;
- missing-POD operational queue with ageing;
- POD queue route in the application navigation;
- POD state and invoice-readiness helper logic.

Evidence stays on UploadThing. Firebase Storage is not used.

Still to harden before calling #7 absolutely final: deeper offline mutation queueing for uploads, broader evidence/audit coverage across every mutation path, and tighter direct navigation/context from the POD queue into the exact Delivery Note.

### 8. Notifications — FOUNDATION NOW IMPLEMENTED

Implemented:
- persisted org-scoped notification records;
- recipient-scoped Firestore reads;
- read/unread state;
- in-app notification center in the main shell;
- server-side role notification dispatcher;
- driver assignment notification from dispatch;
- POD rejection notification to operations;
- notification query index.

Still to expand: missing POD notifications, route variance, maintenance/inspection, finance due dates, driver reminders, exception escalation, preferences and push/email providers. Never claim email/push is live without a real configured provider.

### 9. Audit / Data Integrity — FOUNDATION NOW IMPLEMENTED

Implemented immutable server-written `auditEvents` domain and server audit writer, with Firestore client create/update/delete denied. Dispatch now records a server audit event.

Still to expand: audit coverage across all important mutations, idempotency keys, referential/orphan checks, concurrency protection, mutation queues and partial-workflow recovery.

### 10. Workspace / Admin / Permissions — NEXT

Member management, invitation lifecycle, role changes, suspension/removal, company settings/defaults, permission testing and real transactional email when configured.

### 11. Reporting / Exports / Intelligence — NEXT

Operational/fleet/trip/delivery/POD/fuel/workshop/customer/invoice/supplier/financial reports; CSV/PDF/print; management trends and drill-downs derived from persisted truth.

### 12. Full End-to-End + HTML Compliance — FINAL

Validate:
`job → trip → delivery → POD → invoice → payment → journal → reports`

Then verify real CRUD, failure/retry, offline/sync/conflicts, permissions/multi-user, mobile driver workflow, location permission, map/provider states and every important HTML/reference control mapped to a real route/data/mutation/state or an honest unsupported/configuration state.

## External capability boundaries

### Location
Driver browser GPS is foreground and permission-based. Do not claim background tracking while the app is closed. Automatic fleet telematics requires a real provider/data source; the ingestion boundary is ready but credentials/mapping are external.

### Maps
A real map/routing provider may require an account/key. Keep provider access behind server-side configuration. Never fabricate configuration/billing.

### Email
Do not claim invitation/notification email delivery unless a real provider is configured.

## Firestore safety

Firestore rules are security boundaries, not UI configuration.

- Preserve organization/workspace membership security.
- Do not weaken rules to fix UI/query problems.
- Verify query shapes against rules and indexes.
- New domains require types + repository + rules + indexes/query shape + UI workflow as one coherent change.
- Preserve organization/environment/soft-delete conventions.
- `workspaceInvites` remains server-controlled; client access is denied.
- `notifications` are client-readable only by the recipient and client-writable only for `readAt` metadata.
- `auditEvents` are client-readable but immutable to clients; server code writes them.

## UploadThing

UploadThing is the secure transport for POD/evidence and finance receipts. Never migrate these to Firebase Storage as a shortcut.

## Button / interaction rule

Every reference control is classified before implementation:
1. Existing engine action → wire to native route/workflow.
2. Existing data operation → use repository/mutation and preserve security.
3. Reference-only domain → show **Database still being configured** rather than fake writes.
4. Action belongs elsewhere → pass supported context to the receiving route.
5. Missing domain required for a real action → add the smallest coherent persisted domain.

A button that only looks clickable is not complete.

## PWA readiness

Beyond shell baseline: native manifest, standalone metadata, service worker/offline navigation fallback, browser install prompt where supported, offline connection notice, driver-first My Trip workflow, secure server trip-status changes, GPS capture and delivery/POD handoff.

Full offline business CRUD, mutation queues and conflict resolution remain future work until actually implemented/tested.

## Application failure standard

Fail honestly and recoverably:
1. Preserve existing data.
2. Show a clear human-readable failure.
3. Offer retry when safe.
4. Explain the next safe action.
5. Expose compact diagnostics where useful without secrets/tokens/private records.
6. Route failures use `src/app/error.tsx`; catastrophic failures use `src/app/global-error.tsx`.
7. Driver/team workflows show loading, success and failure states.
8. APIs return appropriate non-2xx statuses with safe messages.
9. Unsupported integrations say they are not configured.
10. Never invent support contacts/developer identities.

## Required workflow for every future pass

### START
`read AGENTS.md → confirm branch → inspect HEAD/recent commits → inspect actual route/component/data flow`

### DESIGN / AUDIT
`inspect reference → inspect native route → map reference elements to real repositories/workflows → identify unsupported domains`

### BUILD
`preserve engine → adapt FACE natively → wire real data → expose existing workflows → add coherent domain only when a real product action requires it`

### VERIFY
`inspect diff → typecheck/build/lint where available → fix root causes → verify affected workflows → inspect deployment status when requested/appropriate`

### CHECKPOINT
`update AGENTS.md when reusable context/continuation changes → commit → push → report exact SHA and verification evidence`

Do not repeatedly ask for approval for obvious safe next steps. Continue through inspect → implement → verify → commit → push → report.

## Explicit non-goals

Do NOT:
- rebuild authentication;
- replace Firebase/Firestore;
- replace UploadThing;
- introduce Firebase Storage for new POD/evidence or receipt uploads;
- weaken Firestore rules casually;
- use old project generations because they look similar;
- discard working CRUD/delivery workflows;
- create a raw HTML/iframe application;
- fabricate live business data;
- claim an integration is live without its real provider/data source;
- stop at analysis when a safe implementation/verification step can be completed.
