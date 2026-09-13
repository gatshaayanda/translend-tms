# START HERE — AI PROJECT CONTEXT

## Authoritative project

This is **Translend TMS · Truck Division v19**.

- Repository: `gatshaayanda/translend-tms`
- Branch: `v19-authoritative`
- Stack: Next.js 15.5.15 + TypeScript + Tailwind + Firebase Auth/Firestore + Vercel
- Firestore = business/source of truth.
- UploadThing = POD/evidence and finance receipt transport.
- Do not introduce Firebase Storage for new POD/evidence uploads.
- Do not replace Firebase with Supabase or another backend.
- Do not restart the architecture or use an older AdminHub/PurePress/Translend generation.

Git/GitHub are the source of truth. The current repository always outranks remembered chat context or an older patch.

## Reusable lineage formula

**AdHub / AdHubMVP** → product idea, core workflow and reusable application patterns.

**Latest AdminHub / AdminHub Base** → reusable technical operating system: Next.js structure, auth/workspace, portals, shared UI, Firebase, PWA/product shell and operational conventions.

**PurePress** → finished product/reference FACE: information architecture, product language, visual hierarchy and intended interactions.

**Translend v19** → existing FACE + real ENGINE + native wiring.

Use the lineage as a formula, not as permission to copy an old implementation. Always record the exact authoritative repository, branch and current HEAD.

## FACE / ENGINE / SHELL / DATA

- **FACE** = HTML/Figma/screenshots/copy/layout/interaction reference.
- **ENGINE** = auth, workspace, Firestore, repositories, APIs, security, uploads, business logic and CRUD.
- **SHELL** = AdminHub-style app frame, navigation, shared UI, responsive behavior and PWA utilities.
- **PRODUCT DATA** = real persisted customer/operational records.

Correct implementation flow:

`reference → native route/component → repository/data source → supported fields → unsupported fields`

Rules:

- If real data exists, wire it.
- If a workflow already exists, expose/preserve it.
- If a reference expects a domain that genuinely does not exist, do not fake live data.
- When a missing domain is now required to make a product action real, add it coherently as **types + repository + security rules + indexes/query shape + UI workflow**.
- Never create fixtures merely to make a screen look complete.
- Never iframe or serve the raw HTML as the application.

## Current v19 product state

The native application covers:

- Operations Hub / Control Tower
- Fleet & Live Map
- Fleet Intelligence
- Trips
- Delivery Notes & POs
- Customers
- Drivers
- Fuel & Workshop
- Workshop Control
- Invoicing & Statements
- Performance Dashboard
- Journal Entry
- P&L Statement
- Cash Flow
- Balance Sheet
- Trial Balance
- Business Controls
- Team & Invites
- Driver My Trip PWA workflow

The real operational chain is:

`Job → Trip → Delivery → Delivery Note → Material lines → Arrival → Departure → Acknowledgement → Evidence → Exceptions → POD completeness → Invoice → Journal`

Existing CRUD/repositories/listeners/security/workspace behavior must remain intact.

## Button and interaction rule

Every reference button/control must be classified before implementation:

1. **Navigation/action already supported by the engine** → wire it to the real native route/workflow.
2. **Existing data operation** → connect it to the existing repository/mutation and preserve security/workspace boundaries.
3. **Reference-only domain not yet persisted** → keep the designed surface, but clearly mark it as **Database still being configured** rather than inventing a write.
4. **Action belongs to another route** → pass the relevant context into that route where the receiving workflow supports it.
5. **A previously missing domain is now required for a genuine product action** → implement the smallest coherent persisted domain rather than leaving an inert button.

A button that only looks clickable is not complete.

### Fleet action checkpoint

- **Pre-fill Fuel Log** → `/fuel-workshop` with `truckId` and `tripId` context.
- **Pre-fill Delivery Note** → `/deliveries` with `tripId` context.
- **Open Trip Sheet** → `/trips` with `tripId` context.

### Finance/workshop action checkpoint

- **Raise invoice** → creates an `invoices` record and its Accounts Receivable / Haulage Revenue journal entry from a completed POD.
- **Log fuel / Save Fuel Log** → creates a `fuelLogs` record and Fuel Expense journal entry.
- **Attach Receipt** → UploadThing `financeReceipt` upload updates the fuel log; no Firebase Storage is introduced.
- **Create Work Order** → creates a `workOrders` record.
- **Create Supplier PO** → creates a `supplierPOs` record.
- **Post Transaction** → creates a `journalEntries` record.
- **Export** → exports the live journal to CSV rather than pretending to have a Google Sheets integration.
- **P&L / Cash Flow / Balance Sheet / Trial Balance** → derive displayed figures from persisted LIVE journal entries rather than demo figures.

## Firestore safety

Firestore rules are security boundaries, not UI configuration.

- Preserve organization/workspace membership security.
- Do not weaken rules to fix a UI/query problem.
- Verify query shapes against the actual rules and indexes.
- Any new domain must have types + repository + Firestore rules + indexes/query shape + UI workflow considered as one change.
- New finance/workshop collections use the established organization/environment/soft-delete query conventions.
- `workspaceInvites` is server-controlled and client reads/writes are denied.

## UploadThing

UploadThing remains the secure transport for POD/evidence and finance receipts. Do not migrate existing evidence or receipts to Firebase Storage.

## Verification

A complete pass means:

`source → typecheck/build → deployment → runtime route → auth/workspace → live repository data → mutation/CRUD → responsive UI`

Do not call a Vercel deployment green without actual status evidence.

The project has `build`, `start` and `lint` scripts. Run the actual available verification path when possible and fix root causes rather than stopping at the first error.

## Current checkpoints

- Finance JSX build error fixed: `bca354f9710322c3b365da921eb55692cdee1e02`
- Fleet rebuild: `ba530f6318bc002d3bd386d925a9eb42be4f8644`
- Fleet action wiring: `e322774e9bfa1b5122a0c9bb0643a77a01cd7425`
- Firestore security hardening: `97d27ee835c5e3315cd821c0a793c11091390746`
- Finance/workshop domain types + repositories: `b264590b4818079339f40c3000684d123f8bdf64`
- Finance/workshop Firestore rules: `b5f19ef86a59dccbee4bf7ad662c80d4f77a86d3`
- UploadThing finance receipt support: `6e52abc8b97c45b2fb58c48a9c2bf796aad0d0fd`
- Finance/workshop UI action implementation: `9fbd8216ef4060ef8677ae5261bc7d7ce8a6b9b7`
- Control-pass documentation: `434f3c683d936e879b743aac57b6f085042d9b15`
- Workspace invites + driver PWA checkpoint: `f847e9b01acc0ef8529225bec638af2079c14ec3`
- Firebase Admin lazy-initialization/build compatibility: `e036dcff361b0d05c76f304297266c60024f068b`
- Invitation typing/build fix: `3dc39e5bf18717765d4c8f245ce4b23d2e5b6dbd`
- Application recovery fallback: `7c1ce07ad71b8c288b19c3d41b2eab008d168428`
- Driver/team action recovery: `30fdd647fa53b5abb39e9226ce70fbaa7eda4e08`
- Telematics ingestion typing/build fix: `689415f0555132763b73209d728238c2b674bd1b`

The latest application code checkpoint above must be verified in Vercel before calling deployment green.

## Required workflow

### START

`read AGENTS.md → confirm branch → inspect HEAD/recent commits → inspect actual route/component/data flow`

### DESIGN / AUDIT

`inspect HTML/Figma reference → inspect native route → map reference elements to real repositories/workflows → identify unsupported domains`

### BUILD

`preserve engine → adapt FACE natively → wire real data → expose existing workflows → add a coherent domain only when a real product action requires it`

### VERIFY

`inspect diff → typecheck/build/lint where available → fix root causes → verify affected workflows → inspect deployment status`

### CHECKPOINT

`update AGENTS.md when the reusable lesson/continuation point changes → commit → push → report exact SHA and verification evidence`

Do not repeatedly ask for approval for obvious safe next steps. Continue with inspect → implement → verify → commit → push → report.

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
- use old AdminHub/PurePress/Translend versions because they look similar;
- discard working CRUD/delivery workflows;
- create a raw HTML/iframe application;
- fabricate live business data;
- stop at analysis when a safe implementation/verification step can be completed.

## Remaining capability readiness and external dependencies

### Build now — no new API key required

- Fleet date-range filters and Trip Lookup filtering.
- Loaded/empty KM from persisted trip metrics.
- Revenue/empty KM ratios, utilisation and route profitability from trip, fuel, job-rate and invoice data.
- Backhaul-gap, dwell and data-based route/fuel exceptions when required fields exist.
- Fuel consumption per truck/trip and cost per KM.
- Work-order lifecycle, maintenance schedules/history/alerts, inspections and defect-to-work-order handoff.
- Tyre records, assignment/history, cost and cost-per-KM.
- Supplier PO lifecycle and actual-cost linkage.
- Invoice lifecycle, payments, receivables and customer statements.
- Supplier bills/payables and supplier statements.
- Chart of accounts, journal balancing, accounting periods and financial date filters.
- Performance/Operations drill-downs and CSV/report exports where data exists.

Build these with the established domain rule: **types → repository → Firestore rules/index/query shape → UI action → derived calculations → verification**. Prefer derived calculations from persisted truth; do not duplicate summary values unless a deliberate cache/metric is justified.

### External integration required — do not fake

Real live fleet movement needs a genuine location source. Browser/device GPS can be used for a driver-facing capture flow without buying a fleet API, subject to user/device permission, but it is not an automatic fleet telematics feed. Persist authorized location events in Firestore only at a controlled cadence; do not create high-frequency writes that burn quota.

Map rendering/routing/traffic may require a provider account and key/token. Keep provider access behind server-side API routes/environment variables; never commit secrets or expose unrestricted server keys to the client. Google Routes or Mapbox are candidate providers and must be selected by the Product Owner before integration because cost, billing and provider terms differ.

Do not block the rest of the product on GPS/maps. Complete all data-driven fleet intelligence first and leave the live-map integration behind an explicit capability boundary until a real provider/data source exists.

## Dual-source live location readiness

### Driver device GPS

- Browser Geolocation API is used only after explicit user action and permission.
- `LocationCapturePanel` exposes Start/Stop location and persists throttled `truckLocationEvents`.
- Driver-role writes are limited to location events by Firestore rules.
- Browser/PWA GPS is foreground capture; do not claim background tracking while the app is closed.

### Telematics provider boundary

- `POST /api/telematics/ingest` remains the provider-neutral normalized ingestion boundary.
- Provider choice and credentials are still external dependencies.
- Google Maps is a map/routing display choice, not a truck GPS provider.
- Do not claim live truck positions until real driver GPS points or telematics events exist.

## PWA readiness checkpoint

The PWA is now beyond the shell-only baseline:

- Native manifest with standalone display, scope, portrait orientation and install metadata.
- Service worker registration and offline navigation fallback remain in place.
- `PwaBootstrap` now exposes the browser install prompt when supported and an offline connection notice.
- `/[orgId]/my-trip` is the driver-first PWA surface: assigned trip, status progression, driver GPS capture and existing delivery/POD workflow handoff.
- Driver trip status changes use a trusted server Route Handler rather than weakening Firestore trip rules.
- Full offline CRUD is still deliberately not claimed. Authenticated business data caching, mutation queues and conflict resolution remain a later explicit design.
- Driver GPS remains foreground/permission based; a native background location strategy is not claimed.

## Workspace invitation checkpoint

The old `inviteMember(orgId, invitedBy, member)` helper remains an internal UID-based assignment helper and is not the public invitation flow.

The implemented collaboration flow is now:

`Owner/Operations Manager enters email + role → pending workspace invite → invited person signs in with Google → server verifies Firebase identity/email → pending invite is matched → membership is created atomically → invite is consumed → workspace opens.`

If the authenticated email has no pending invite, the existing company setup path remains available so the person can create their own workspace.

Implementation rules:

- Invitations live in top-level `workspaceInvites` and are server-controlled.
- Invite records contain immutable role, normalized email, random-token hash, expiry and acceptance metadata.
- Client Firestore access to `workspaceInvites` is denied; acceptance is performed through Firebase Admin on trusted Route Handlers.
- A new invitation to the same email revokes the previous pending invite for that workspace.
- Invite expiry is 7 days.
- The Team & Invites route is available to Owner and Operations Manager roles.
- No Firebase UID is required when the owner first enters the person's email.
- No Firebase Storage, new auth provider or weakened membership rule is introduced.
- Transactional email delivery is not fabricated; the current workflow persists the invitation and performs automatic email matching at Google sign-in. A real mail provider can be added later without changing membership semantics.

## Application failure and escalation standard

The application must fail **honestly and recoverably**, not silently and not by replacing missing data with fabricated values.

When a route, repository read, mutation, upload, API call or integration fails:

1. Preserve the user's existing data; do not reset or fabricate records to make the screen look healthy.
2. Show a clear, human-readable failure state at the point of failure where practical.
3. Provide **Try again** or an equivalent safe recovery action when the operation is retryable.
4. Explain what the user should do next: retry once, then report the issue to the responsible Translend developer/workspace administrator if it persists.
5. Where useful, expose/copy a compact diagnostic report containing the error message, optional digest and timestamp. Never expose secrets, tokens, credentials or private business records in the diagnostic output.
6. Route-level failures are caught by `src/app/error.tsx`; catastrophic application failures have `src/app/global-error.tsx`.
7. Driver and Team workflows must surface loading, success and failure states rather than leaving a dead button or blank screen.
8. API routes must return an appropriate non-2xx status and a safe human-readable `error` message for expected failures.
9. Unsupported external integrations must say that the integration is not configured rather than pretending the feature is live.
10. Escalation must be generic/configuration-safe: do not invent a developer name, email address or support channel. If a real support contact is later configured, it may be wired into this recovery pattern.

This standard applies across the existing v19 engine as it is touched or audited. Do not rewrite every existing component merely to add cosmetic error handling; prioritize user-blocking workflows, shared infrastructure and newly modified surfaces, and preserve the real business behavior.

## Next development programme — authoritative backlog

The core v19 functionality pass is now the baseline. **The next work is product maturation, operational completeness, and real-world acceptance.**

Work through these in coherent passes, always inspecting the current HEAD before implementation:

1. **Full offline TMS operation**
   - authenticated business-data caching appropriate to role;
   - offline create/edit operations where permitted;
   - durable mutation queue;
   - automatic sync when connection returns;
   - retry and safe failure handling;
   - idempotency/duplicate prevention;
   - partial-sync recovery;
   - concurrent-edit detection;
   - explicit conflict detection and resolution rules/UI;
   - visible sync state and pending-operation status;
   - driver-first offline protection for the My Trip workflow.
   - Do not claim full offline CRUD until the complete mutation/conflict cycle is actually implemented and tested.

2. **Professional live fleet map**
   - real location source;
   - live truck markers and freshness timestamps;
   - movement/idle/alert state derived from real events;
   - route/trail view;
   - honest provider configuration states;
   - no fake truck movement.

3. **Complete driver workflow**
   - daily trip list;
   - next action;
   - accept/start trip;
   - pickup arrival/loading/departure;
   - delivery arrival/confirmation;
   - POD/evidence;
   - delivery exceptions;
   - complete trip;
   - fuel;
   - inspection/defect;
   - maintenance/tyre visibility;
   - location permission/status;
   - offline/sync awareness;
   - useful driver notifications.

4. **Complete dispatch**
   - dispatch board;
   - unassigned work;
   - truck/driver assignment and reassignment;
   - scheduling;
   - status/priority/notes/delays;
   - exception escalation;
   - driver communication hooks.

5. **Accounting maturity**
   - chart hierarchy;
   - accounting periods;
   - journal validation/balancing;
   - reversals/corrections;
   - audit trail;
   - AR/AP ageing;
   - statements;
   - credit/debit notes;
   - tax/VAT where required;
   - bank/cash/reconciliation;
   - exports.

6. **POD/evidence maturity**
   - validation;
   - multiple evidence files;
   - categories/replacement;
   - retention/deletion;
   - approval/rejection/re-upload;
   - audit trail;
   - missing POD queue/ageing;
   - acknowledgement tracking;
   - view/download;
   - exception resolution;
   - POD→invoice controls.

7. **Notifications**
   - in-app;
   - assignments;
   - missing POD;
   - route variance;
   - maintenance/inspection;
   - finance due dates;
   - driver reminders;
   - exception escalation;
   - read/unread;
   - preferences;
   - role routing;
   - push/email only when genuinely configured.

8. **Audit/data integrity**
   - mutation metadata;
   - immutable audit records;
   - atomic operations;
   - duplicate/idempotency protection;
   - referential integrity;
   - invalid/orphan detection;
   - safe retries;
   - concurrency protection;
   - partial workflow recovery.

9. **Workspace/admin/permissions**
   - member management;
   - invitation lifecycle;
   - role changes;
   - suspension/removal;
   - settings/company defaults;
   - full permission testing;
   - actual transactional email only when a real provider is configured.

10. **Reporting/exports/intelligence**
    - operational/fleet/trip/delivery/POD/fuel/workshop/customer/invoice/supplier/financial reports;
    - CSV/PDF/print;
    - management intelligence and trends derived from persisted truth.

11. **Full end-to-end + HTML compliance**
    - test real CRUD;
    - job→trip→delivery;
    - trip→POD→invoice→payment→journal→reports;
    - failure/retry;
    - offline/sync/conflicts;
    - permissions/multi-user;
    - mobile driver;
    - location permission;
    - map/provider states;
    - final HTML audit mapping every important reference element to route/data/mutation/state or honest unsupported status.

### Operating rule

Do not stop to ask the Product Owner for approval between obvious safe implementation steps. Inspect the current authoritative source, make the smallest coherent change, verify it, checkpoint it, and continue. If a required external dependency is genuinely unavailable, implement the honest capability boundary and continue with everything that does not depend on it.
