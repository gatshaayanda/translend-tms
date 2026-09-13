# START HERE — AI PROJECT CONTEXT

## Authoritative project

This is **Translend TMS · Truck Division v19**.

- Repository: `gatshaayanda/translend-tms`
- Authoritative branch: `v19-authoritative`
- Current application checkpoint: `f648dc909c7123f4ca1728e5df3ff8f0e4f22650`
- Stack: Next.js 15.5.15 + TypeScript + Tailwind + Firebase Auth/Firestore + Vercel
- Firestore = business/source of truth.
- UploadThing = POD/evidence and finance receipt transport.
- Never introduce Firebase Storage for new POD/evidence or receipts.
- Never replace Firebase with Supabase or another backend.
- Never reuse an older AdminHub/PurePress/Translend generation as the implementation source.

Git/GitHub are the source of truth. Current repository state outranks remembered chat context or older patches.

## Product architecture

`FACE + SHELL + ENGINE + PRODUCT DATA = PRODUCT`

- **FACE** = HTML/Figma/screenshots/copy/layout/interaction reference.
- **SHELL** = AdminHub-style app frame, navigation, responsive UI and PWA utilities.
- **ENGINE** = auth, workspace, Firestore, repositories, APIs, security, uploads, business logic and CRUD.
- **PRODUCT DATA** = real persisted customer/operational records.

Implementation flow:
`reference → native route/component → repository/data source → supported fields → unsupported fields`

Rules:
- Wire real data when it exists.
- Preserve existing workflows and CRUD.
- Missing domains must say **Database still being configured** rather than inventing live values.
- If a missing domain is required for a real product action, add it coherently as types + repository + rules + indexes/query shape + UI workflow.
- Never create fixtures merely to make screens look complete.
- Never iframe or serve the raw HTML as the application.

## Current product state

The native application covers:

- Operations Hub / Control Tower
- Fleet & Live Map foundation
- Fleet Intelligence
- Trips / Dispatch
- Delivery Notes / POs
- Customers
- Drivers
- Fuel & Workshop / Workshop Control
- Invoicing & Statements
- Performance Dashboard
- Journal Entry
- P&L / Cash Flow / Balance Sheet / Trial Balance
- Business Controls
- Team / Invitations
- Driver My Trip PWA workflow

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

- Real Firestore truck location events.
- Latest position per truck.
- Moving / idle / stale states.
- Filters, selection, focus/pan/zoom.
- Real marker positions when a map provider is configured.
- Location table and route trail.
- GPS source/timestamp.
- Honest provider/configuration states.
- No fabricated truck locations.

Automatic production fleet movement still requires a real driver GPS or telematics source and, where applicable, a map/routing provider.

### 3. GPS / Telematics Integration — FOUNDATION COMPLETE

- Provider-neutral `POST /api/telematics/ingest` boundary.
- Server-side auth/workspace validation.
- Provider vehicle ID → Translend truck mapping.
- Existence/active-mapping checks.
- Coordinate, speed, heading, accuracy and timestamp validation.
- Duplicate/idempotency protection.
- Stale-event protection.
- Protection against silently remapping provider vehicles.
- Normalized LIVE telemetry with `orgId`.
- Fleet Map consumes normalized `truckLocationEvents`.

Provider choice and credentials remain external dependencies and must never be faked.

### 4. Complete Driver Workflow — CORE COMPLETE

Driver My Trip supports:
`planned → en_route_pickup → loading → in_transit → unloading → completed`

Plus assigned-driver filtering, secure server-side status changes, delivery arrival/departure, receiver acknowledgement, delivery exceptions, POD/evidence handoff, inspections, defects, defect→work-order handoff, maintenance/tyre visibility, browser GPS capture and offline awareness.

Driver writes are server/role scoped; do not weaken Firestore rules to make UI work.

### 5. Complete Dispatch — CORE COMPLETE

- Real dispatch board/workflow.
- Unassigned work visibility.
- Secure truck/driver assignment.
- Availability checks preventing double-booking.
- Atomic trip creation + job/truck/driver updates.
- Dispatch readiness KPIs.
- Trip search/status filtering.
- Completion releases truck/driver and closes the job.
- Dispatcher/operations authorization.

### 6. Accounting — CORE CONTROL PASS COMPLETE

Implemented:
- Chart of Accounts and accounting controls.
- Accounting periods/open-period posting control.
- Journal creation and balancing rules.
- Journal reversals/corrections.
- Customer invoice payments.
- Supplier bills/AP.
- AR/AP outstanding balances and ageing.
- LIVE journal visibility.
- Finance-role server transaction boundary.
- Finance Firestore security.
- Correct invoice selection in accounting UI.

Transaction actions:
- invoice payment → payment record + AR/Cash journal;
- supplier bill → AP/expense journal;
- manual journal → balanced journal;
- journal reversal → balanced reversal journal.

Do not represent these as complete yet: dedicated credit/debit-note domain, full tax/VAT configuration, bank/cash reconciliation, and dedicated accounting statement/export workflows.

## Completed checkpoints

- Offline foundation: `b27a10531e63f6b4a7937ec1e7764b23005c5d67`
- Offline persistence continuation: `e84e5229c6fc0a1aae32f6a9a5320a225562167f`
- Live Fleet Map: `85764917e564933d72f2f1503a1cbbcf89822884`
- Telematics org-id normalization: `8dc0bc566642e938d93ba8f64b23b1406e1b577c`
- Telematics build/regression fix: `9bff47069e9aee13d19d48f3bc02d06430dd6f37`
- Driver navigation build fix: `6f4acec796b7d2fa494c64e694e4c90a3992ad03`
- Driver vehicle condition workflow: `777b158d49e48362ed62c9880b211a4a43071ee`
- Accounting transaction boundary typing: `7ed5737487fefa919826ee02d2d5634dabcf7e28`
- Accounting controls surface: `4c544f56d9dd2b832182708b8a8e47bf636c63fa`
- **Latest application checkpoint:** `f648dc909c7123f4ca1728e5df3ff8f0e4f22650`

A pushed commit is not automatically a green Vercel deployment. Only claim green with actual status evidence.

## Next authoritative backlog

### 7. POD / Evidence maturity — NEXT

- Secure upload authorization and delivery/trip linkage.
- Multiple evidence files and categories.
- Replacement/version semantics.
- Required vs optional evidence.
- Approval/rejection/re-upload.
- Immutable/auditable evidence metadata.
- Missing-POD queue/ageing.
- Acknowledgement tracking.
- Secure view/download.
- Exception resolution.
- POD completeness controls.
- POD→invoice controls.
- Honest offline/upload failure and retry.

Use UploadThing. Never introduce Firebase Storage.

### 8. Notifications

In-app notifications, assignments, missing POD, route variance, maintenance/inspection, finance due dates, driver reminders, exception escalation, read/unread, preferences and role routing. Push/email only with real configured providers.

### 9. Audit / Data Integrity

Mutation metadata, immutable audit records, atomic operations, idempotency, referential integrity, invalid/orphan detection, safe retries, concurrency protection and partial-workflow recovery.

### 10. Workspace / Admin / Permissions

Member management, invitation lifecycle, role changes, suspension/removal, company settings/defaults, permission testing and real transactional email when configured.

### 11. Reporting / Exports / Intelligence

Operational/fleet/trip/delivery/POD/fuel/workshop/customer/invoice/supplier/financial reports; CSV/PDF/print; management trends and drill-downs derived from persisted truth.

### 12. Full End-to-End + HTML Compliance

Validate:
`job → trip → delivery → POD → invoice → payment → journal → reports`

Then verify real CRUD, failure/retry, offline/sync/conflicts, permissions/multi-user, mobile driver workflow, location permission, map/provider states, and every important HTML/reference control mapped to a real route/data/mutation/state or an honest unsupported/configuration state.

## External capability boundaries

### Location
Driver browser GPS is foreground and permission-based. Do not claim background tracking while the app is closed. Automatic fleet telematics requires a real provider/data source; the ingestion boundary is ready but credentials/mapping are external.

### Maps
A real map/routing provider may require an account/key. Keep provider access behind server-side configuration. Google Maps/Routes or Mapbox are candidates; never fabricate configuration/billing.

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

## UploadThing

UploadThing is the secure transport for POD/evidence and finance receipts. Never migrate these to Firebase Storage as a shortcut.

## Button / interaction rule

Every reference control is classified before implementation:

1. Existing engine action → wire to the native route/workflow.
2. Existing data operation → use the repository/mutation and preserve security.
3. Reference-only domain → show **Database still being configured** rather than fake writes.
4. Action belongs elsewhere → pass supported context to the receiving route.
5. Missing domain required for a real action → add the smallest coherent persisted domain.

A button that only looks clickable is not complete.

Known wired examples:
- Pre-fill Fuel Log → `/fuel-workshop` with truck/trip context.
- Pre-fill Delivery Note → `/deliveries` with trip context.
- Open Trip Sheet → `/trips` with trip context.
- Raise invoice → persisted invoice + AR/revenue journal where supported.
- Log fuel → persisted fuel log + expense journal.
- Attach receipt → UploadThing finance receipt.
- Create Work Order → persisted work order.
- Create Supplier PO → persisted supplier PO.
- Post Transaction → persisted journal entry.
- Financial statements → derived from LIVE journal truth, never demo figures.

## PWA readiness

Beyond shell-only baseline:
- native manifest;
- standalone install metadata;
- service worker/offline navigation fallback;
- browser install prompt where supported;
- offline connection notice;
- `/[orgId]/my-trip` driver-first workflow;
- secure server trip-status changes;
- GPS capture and delivery/POD handoff.

Full offline business CRUD, mutation queues and conflict resolution remain future work until actually implemented/tested.

## Workspace invitations

Real flow:
`Owner/Operations Manager enters email + role → pending invite → invited person signs in with Google → server verifies identity/email → membership created atomically → invite consumed → workspace opens.`

Invites are top-level `workspaceInvites`, server-controlled, with normalized email, immutable role, token hash, expiry and acceptance metadata. Client Firestore access is denied. New invites revoke older pending invites for the same workspace/email. Expiry is 7 days. Transactional email delivery is not fabricated.

## Application failure standard

Fail honestly and recoverably:

1. Preserve existing data.
2. Show a clear human-readable failure.
3. Offer retry when safe.
4. Explain the next safe action.
5. Where useful, expose a compact diagnostic without secrets/tokens/private records.
6. Route failures use `src/app/error.tsx`; catastrophic failures use `src/app/global-error.tsx`.
7. Driver/team workflows show loading, success and failure states.
8. APIs return appropriate non-2xx statuses with safe messages.
9. Unsupported integrations say they are not configured.
10. Never invent support contacts/developer identities.

Do not cosmetically rewrite everything for error handling; prioritize user-blocking workflows, shared infrastructure and newly modified surfaces.

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
- use old project generations because they look similar;
- discard working CRUD/delivery workflows;
- create a raw HTML/iframe application;
- fabricate live business data;
- claim an integration is live without its real provider/data source;
- stop at analysis when a safe implementation/verification step can be completed.
