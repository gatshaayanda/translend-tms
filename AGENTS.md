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
- Any new domain must have types + repository + security rules + indexes/query shape + UI workflow considered as one change.
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

Real live fleet movement needs a genuine location source. Browser/device GPS can be used for a driver-facing capture flow without buying a fleet API, subject to user/device permission, but it is not an automatic truck telematics feed. Persist authorized location events in Firestore only at a controlled cadence; do not create high-frequency writes that burn quota.

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

The core v19 functionality pass is now the baseline. **Do not spend the next passes re-proving that already-completed domains exist. The next work is product maturation, operational completeness, and real-world acceptance.**

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
   - trip route/progress display;
   - route variance and stale-location detection;
   - GPS accuracy/permission/online status handling;
   - useful fleet filters/focus interactions;
   - ETA/geofencing only when a real routing/location source supports them.
   - Do not fake truck positions.

3. **Actual telematics-provider integration**
   - identify the company's real GPS/telematics provider when available;
   - secure credentials/configuration;
   - provider adapter behind the existing normalized ingestion boundary;
   - vehicle/provider-ID mapping to Translend trucks;
   - normalized location events;
   - duplicate/stale/malformed/outage handling;
   - integration-health visibility.
   - Provider API details and credentials are external dependencies; do not invent them.

4. **Complete driver workflow**
   - driver daily trip list and next-action view;
   - accept/start trip;
   - pickup arrival/loading/departure;
   - delivery arrival/confirmation;
   - delivery note and POD capture;
   - exception/defect reporting;
   - complete trip;
   - fuel/inspection/maintenance handoffs;
   - GPS permission/status;
   - offline/sync behavior;
   - useful driver notifications.

5. **Complete dispatch workflow**
   - dispatch board;
   - unassigned jobs/trips;
   - assign/reassign truck and driver;
   - scheduling/priorities;
   - operational statuses;
   - delay and exception escalation;
   - dispatcher notes/history;
   - driver communication surfaces where supported.

6. **Complete accounting and finance lifecycle**
   - robust chart/account hierarchy;
   - account types/subtypes;
   - opening/closing balances;
   - period lock/close/reopen controls;
   - journal balancing and server validation;
   - reversals/corrections;
   - reference numbers and audit trail;
   - finance approval controls;
   - AR/AP ageing;
   - customer/supplier statements;
   - credit/debit notes;
   - tax/VAT support if required by the real business;
   - bank/cash accounts and reconciliation;
   - reliable financial exports.

7. **Complete invoice lifecycle**
   - numbering;
   - editing/finalisation/approval rules;
   - sending/customer delivery;
   - PDF/print output;
   - credit notes;
   - partial payments and allocation;
   - over/underpayments;
   - reversal/cancellation;
   - ageing/statements;
   - immutable audit history.

8. **Complete supplier lifecycle**
   - supplier master/profile/contact;
   - PO → receipt → bill flow;
   - approval;
   - partial payments/allocation;
   - supplier ageing/statements;
   - correction/cancellation/audit controls.

9. **Complete POD/evidence lifecycle**
   - evidence validation;
   - multiple evidence categories/files where required;
   - replacement/re-upload/retention rules;
   - POD approval/rejection and reason;
   - missing-POD queue and ageing;
   - acknowledgement tracking;
   - secure view/download;
   - exception resolution;
   - POD-to-invoice controls;
   - full evidence audit history.

10. **Notifications and alerts**
    - in-app alerts;
    - assignment/reminder notifications;
    - missing POD;
    - route variance;
    - maintenance/inspection;
    - invoice/bill due;
    - exception escalation;
    - read/unread state;
    - preferences and role-based routing;
    - push/email only when a real provider/configuration exists.

11. **Search, filtering and navigation depth**
    - global search;
    - domain-specific search;
    - advanced filters;
    - date/status filtering;
    - saved filters where useful;
    - consistent drill-down/navigation;
    - reliable exports.

12. **Audit trail and data integrity**
    - who created/edited/approved/rejected/uploaded/assigned records;
    - timestamps;
    - meaningful previous/new values where appropriate;
    - immutable audit records;
    - audit viewer with role-aware access;
    - atomic multi-record operations;
    - idempotency;
    - race-condition protection;
    - server-side validation;
    - referential-integrity checks;
    - orphan/invalid-state detection;
    - safe retries and partial-workflow recovery.

13. **Complete permissions and workspace administration**
    - complete role matrix for Owner, Operations Manager, Dispatcher, Fleet Manager, Finance, Driver and Viewer;
    - view/create/edit/approve/delete behavior tested from real user perspectives;
    - financial/driver/workspace visibility boundaries;
    - member management;
    - invite expiry/revoke/resend;
    - role changes;
    - suspend/remove;
    - workspace/company settings;
    - timezone/currency/numbering/business defaults.

14. **Real invitation delivery**
    - actual email delivery;
    - secure invitation link/landing page;
    - accept/expired/revoked states;
    - resend;
    - delivery failure handling;
    - real email-provider configuration.
    - Until a provider is configured, do not pretend email delivery exists.

15. **PWA production hardening**
    - installation testing on supported desktop/Android/iOS paths;
    - cache strategy/versioning/invalidation;
    - offline asset/route coverage;
    - update notification/service-worker update behavior;
    - online/offline transition testing;
    - only claim capabilities that have been tested on the target devices.

16. **Error/recovery coverage**
    - audit every important form, mutation, upload, API, repository read and external integration;
    - loading/success/failure states;
    - actionable retry/report behavior;
    - persistent-failure escalation to the responsible Translend developer/workspace administrator;
    - no invented support contacts;
    - prioritize user-blocking workflows and shared infrastructure rather than cosmetic rewrites.

17. **Reporting and management intelligence**
    - operational/fleet/trip/delivery/POD/fuel/workshop/customer/invoice/supplier/financial reports;
    - CSV/PDF/print outputs where genuinely useful;
    - fleet utilisation/revenue/cost/profitability/empty-KM/fuel/maintenance trends;
    - delivery/POD/customer/truck/driver/route/exception trends;
    - drill-down from management figures to the underlying persisted records.

18. **Full application acceptance testing**
    - simple CRUD;
    - medium Job → Trip → Delivery;
    - complex Trip → POD → Invoice → Payment → Journal → Reports;
    - offline and recovery cases;
    - conflict/multi-user cases;
    - permission/security cases;
    - mobile/driver cases;
    - deployment/runtime checks.

19. **Final original-HTML FACE → ENGINE compliance audit**
    For every original HTML expectation, prove:
    - button → real action;
    - form → real persistence;
    - table → real persisted records;
    - KPI → real derived data;
    - navigation → correct native route;
    - shortcut → correct context;
    - upload → real secure workflow;
    - status → actual state;
    - financial figure → actual underlying records;
    - map → genuine source or honest capability boundary;
    - unsupported domain → `Database still being configured` rather than fake data;
    - error → recoverable/reportable state.

### Priority order

Unless a real dependency or discovered production bug changes the order, use this sequence:

**1. Driver workflow + offline foundation → 2. Dispatch → 3. Offline sync/conflicts → 4. POD/evidence completion → 5. Invoice/finance completion → 6. Notifications → 7. Audit/data integrity/permissions → 8. Reporting/intelligence → 9. GPS/map/telematics integration when the real provider is known → 10. Final full acceptance + HTML audit.**

The order is about product value and dependency management, not permission to ignore a blocking production defect discovered during another pass. If testing exposes a blocker, fix the blocker first, verify it, checkpoint it, then resume the programme.

## Contractor execution and QA protocol

When an external hands-on developer/contractor is working from this repository, they are expected to behave like the engineer responsible for delivering the product, not like someone waiting for the Product Owner to discover defects for them.

### Required working loop

`inspect → reproduce/understand → implement → self-test → deliberately test failure cases → verify build → verify runtime → document → commit/push → report`

The contractor must:

1. **Use the current repository as truth.** Read `AGENTS.md`, confirm `v19-authoritative`, inspect current HEAD and recent commits before touching code.
2. **Work through the next backlog themselves.** Do not ask the Product Owner to design every small implementation step. Use the stated product rules and make the smallest coherent engineering decision.
3. **Test the feature they just built.** A feature is not complete because TypeScript compiles. Test the actual user flow in the deployed/local runtime where possible.
4. **Test the failure path deliberately.** For each important feature, try invalid input, missing data, denied permission, network failure/offline state, refresh/reload, duplicate submission and other realistic failure modes.
5. **Debug their own ticket while developing it.** If a bug appears while implementing a ticket, stop treating it as a separate surprise. Reproduce it, identify the root cause, fix it, regression-test it, and include it in the same report/checkpoint when appropriate.
6. **Do not hide defects.** A discovered bug must be reported even if it cannot immediately be fixed. The report must say what was expected, what actually happened, how to reproduce it, severity/blocking impact, what was attempted, and the recommended next action.
7. **Use visual evidence when it helps.** For UI/runtime bugs, provide a screenshot or short screen recording showing the exact failure, including the relevant page/state. For complex flows, provide before/after evidence when practical.
8. **Give exact recovery instructions.** If the Product Owner must do something manually, state the exact route, button, data and sequence. Do not say merely “check the console” or “there is a bug.”
9. **Report verification evidence.** Include commit SHA, build/deployment status, tested route(s), test scenario(s), and known limitations. Never call a deployment green without evidence.
10. **Keep source of truth clean.** Commit coherent changes, do not leave known broken code behind merely to make a ticket look complete, and do not use fake fixtures to hide missing domains.

### Bug report minimum standard

Every discovered defect should be captured in this practical format:

- **BUG:** short plain-English name
- **WHERE:** route/screen/workflow
- **EXPECTED:** what a normal company user should experience
- **ACTUAL:** what actually happened
- **REPRO:** exact steps from a clean starting point
- **EVIDENCE:** screenshot/video/log excerpt when useful and safe
- **SEVERITY:** blocker / high / medium / low
- **ROOT CAUSE:** if known
- **FIX:** what was changed, or why it remains open
- **REGRESSION TEST:** what was rerun after the fix
- **CHECKPOINT:** commit SHA and deployment/build evidence
- **OWNER ACTION:** exact next action required from the Product Owner, if any

Never expose credentials, tokens, private business records or secrets in screenshots/logs/diagnostics.

### Acceptance mindset

The contractor should ask throughout development:

> **“If this were a real transport company using Translend tomorrow morning, would this actually work, and what would happen when something goes wrong?”**

Do not optimize for making a demo look complete. Optimize for a real company being able to operate through the workflow, recover from normal failures, and understand what happened when something breaks.

## Product-owner acceptance cycle

The Product Owner's job is final acceptance, not discovering every engineering defect from scratch. The contractor should first perform the full QA cycle and hand over a clean, reproducible acceptance package.

The acceptance package for a meaningful pass should contain:

- what was implemented;
- what was tested;
- what passed;
- what failed;
- screenshots/video for important visual defects or confirmations where useful;
- exact reproduction steps for every open defect;
- exact manual recovery/action required from the Product Owner;
- build/deployment evidence;
- commit SHA;
- known external dependencies or configuration still required.

Only after that does the Product Owner perform the final real-world acceptance review.

## Normal transport-company operating cycle — acceptance model

Use this as the non-technical mental model for the whole application. The system should support a normal company day from beginning to end:

`Sign in → Workspace → Fleet/Drivers → Customer → Job → Dispatch → Trip → Pickup → Journey/Fuel/Location → Delivery → Delivery Note → Arrival/Departure/Acknowledgement → POD/Evidence → Exception if needed → Invoice → Customer Payment → Fuel/Workshop/Supplier Costs → Accounting → Management Review`

The detailed acceptance sequence is:

### Test 1 — Sign in and workspace

- Sign in with Google.
- Enter the company's workspace.
- Confirm the user sees the correct operational area.
- Basic question: **Can I get into my company's system?**

### Test 2 — Add a truck

- Create a truck, e.g. `B 482 BRT`, Volvo, Active.
- Save, refresh, and confirm it remains.
- Proves: form → save → Firestore → reload → persisted record.

### Test 3 — Add a driver

- Create a driver with the appropriate information.
- Save, refresh, confirm persistence.
- Repeat the basic create/save/database/reload proof.

### Test 4 — Create a customer

- Create `ABC Construction`.
- Save, refresh, confirm it exists.
- The company is beginning to acquire real business records.

### Test 5 — Create a job

- Customer: ABC Construction.
- Origin: Kgale Quarry.
- Destination: Lobatse Site.
- Material: Aggregate.
- Save and confirm the job is persisted.
- Proves: Customer → Job.

### Test 6 — Turn the job into a trip

- Assign truck `B 482 BRT` and a driver.
- Create the trip.
- Confirm: Customer → Job → Trip → Truck + Driver.
- This is a core operational test.

### Test 7 — Execute the delivery workflow

Open the trip and test:

- delivery creation;
- arrival;
- departure;
- acknowledgement;
- delivery note;
- material lines;
- persistence after refresh.

The records must remain connected rather than becoming disconnected paperwork.

### Test 8 — POD/evidence

- Capture delivery evidence/POD.
- Test upload and validation.
- Confirm the delivery knows whether its POD is complete.

### Test 9 — Deliberate delivery exception

Example: customer says 2 tonnes were missing.

- Create the delivery exception.
- Confirm it is attached to the correct delivery.
- Test review/resolution behavior.

A real TMS must handle failure, not only successful deliveries.

### Test 10 — Invoice

After POD completion:

`Completed POD → Invoice → Accounts Receivable → Journal`

Raise the invoice and verify the underlying persisted financial records, not merely the visible invoice screen.

### Test 11 — Customer payment

In Business Controls:

- select the invoice;
- record a payment, e.g. P10,000;
- check paid amount;
- check outstanding amount;
- check invoice status;
- confirm fully settled invoices become paid.

### Test 12 — Fuel

Record fuel for the truck, e.g. 250 litres at P3,500.

Verify:

`Truck → Fuel → Expense → Accounting`

### Test 13 — Workshop

Create a work order, e.g. `B 482 BRT needs brake inspection`.
Confirm it persists and appears in workshop control.

### Test 14 — Supplier bill

Create supplier `XYZ Parts`, bill P4,500, save it, then mark it paid and confirm payable state.

### Test 15 — Accounting

Check:

- Journal transactions exist.
- P&L reflects financial activity.
- Cash Flow reflects relevant cash movement.
- Balance Sheet updates consistently.
- Trial Balance maintains the intended debit/credit structure.

### Test 16 — Fleet intelligence

Return to Fleet and ask:

> **What happened to my fleet?**

Check active trucks, loaded KM, empty KM, utilisation, fuel efficiency, fuel cost/KM, route profitability and route alerts. Values must derive from real persisted data or honestly identify missing source data.

### Test 17 — Cross-screen trip shortcuts

From Fleet:

- **Pre-fill Fuel Log** → correct truck/trip context.
- **Pre-fill Delivery Note** → correct trip context.
- **Open Trip Sheet** → exact trip.

### Test 18 — Driver experience

On a phone, sign in as driver and open **My Trip**.
Test the operational workflow and location permission.
If the driver selects Allow, confirm foreground location capture is genuinely capable of producing authorized location events. Do not claim background tracking while the app is closed.

### Test 19 — Invite another employee

Owner/Operations Manager:

`Team → Invite → email + role → pending invitation`

Invited person:

`Google sign-in → Translend verifies email → pending invitation match → membership → workspace`

Also test a person with no invitation. They must not become a member of another company's workspace merely by signing in.

### Test 20 — Break things deliberately

Test at minimum:

- save while disconnected;
- invalid upload/file;
- action without permission;
- refresh after save;
- missing required data;
- server/API failure;
- route-level failure;
- duplicate submission where relevant;
- expired/revoked invitation where relevant.

Expected professional behavior: clear explanation, safe state, retry where possible, and useful diagnostic/report path.

### Final end-to-end company-day test

Run one complete synthetic company day:

**Morning:** Login → Fleet → trucks/drivers.

**Dispatch:** Customer → Job → Trip → Truck → Driver.

**Journey:** Trip → Fuel → movement/location where configured.

**Delivery:** Delivery → Delivery Note → Arrival → Departure → POD.

**Problem:** Exception → Review.

**Commercial:** Completed POD → Invoice.

**Money:** Customer Payment → Invoice Paid.

**Costs:** Fuel → Workshop → Supplier Bill.

**Accounting:** Revenue + Expenses + Payments + Bills → Journal → P&L → Cash Flow → Balance Sheet → Trial Balance.

**Management:** Fleet intelligence → what happened, what cost money, which routes/trucks need attention.

This is the actual TMS cycle.

## Final original-HTML test

After end-to-end testing, perform the FACE → ENGINE audit against the original v19 HTML. Treat the HTML as product criteria, not merely decoration.

For each section and element, record:

| HTML expectation | Acceptance test |
| --- | --- |
| Button | Does it perform a real action? |
| Form | Does it save real data? |
| Table | Does it display persisted data? |
| KPI | Is it calculated from real data? |
| Navigation | Does it reach the correct native workflow? |
| Shortcut | Does it carry the correct context? |
| Upload | Does the secure upload workflow work? |
| Status | Does it represent actual persisted state? |
| Financial figure | Does it derive from actual records? |
| Map | Does it have a genuine source, or clearly state what is missing? |
| Unsupported feature | Does it say `Database still being configured` rather than fabricate data? |
| Error | Can the user recover and report the issue? |

The final product is accepted only when the important workflows are real, connected, recoverable, secure, and usable by a normal transport company — not merely when the screens resemble the original HTML.
