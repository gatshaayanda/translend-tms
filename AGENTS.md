# START HERE — Translend TMS · Truck Division v19

## Authoritative project
- Repository: `gatshaayanda/translend-tms`
- **Application source branch: `v19-authoritative`. This is the authoritative Translend app.**
- **Vercel Production must track `v19-authoritative`, never `main`.**
- `main` is not the Translend application source-of-truth branch and must not be used for Translend production releases or application fixes unless the product owner explicitly directs otherwise.
- Stack: Next.js 15.5.15 + TypeScript + Tailwind + Firebase Auth/Firestore + Vercel
- Firestore = business/source of truth.
- UploadThing = POD/evidence and finance-receipt transport. Never reintroduce Firebase Storage.
- Never replace Firebase with Supabase/another backend.
- GitHub/current HEAD outranks remembered chat context and old patches.
- Do not reset, revert, branch away, or reuse an older generation.

## Release/source-of-truth rules — DO NOT BREAK
- All Translend application development, fixes, QA builds and production releases start from and are pushed to **`v19-authoritative`**.
- Before any write, deployment or release action, explicitly confirm the target ref is **`v19-authoritative`**.
- Never silently substitute `main`, `feature/translend-independence`, a rebuild branch, or an older backup branch for the authoritative app.
- If Vercel Production is configured to deploy `main`, **stop and correct the Production branch configuration to `v19-authoritative` before treating Production as representative of the app**.
- A successful deployment from the wrong branch is not a valid Translend production deployment.
- Do not copy workspace/auth code between branches to solve production problems. Inspect the authoritative branch first and preserve its existing server-side authorization boundary.
- Do not force-move `main` as a substitute for correcting Vercel's Production branch configuration. The deployment source must remain explicitly `v19-authoritative`.
- Deployment verification must check both the deployed commit and its branch. A deployment is authoritative only when it is sourced from `v19-authoritative`.

## Product north star
`Job → Dispatch → Trip → Delivery → POD/evidence → Invoice → Payment → Journal → Reporting`

Every important workflow must trace the real mutation, authorization, atomicity, retry/idempotency, audit and reporting consequences. A screen or successful UI state is not proof that the business operation works.

## Current development state — 2026-09-26
The core Truck Division operating system is substantially implemented. The project is now in the **finish-the-actual-app** phase.

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

## Product-finish priority — CURRENT RULE
**Do not invent a separate “prove the main journey” workstream.** The product workflow is already the product's north star and is used as the standard against which implementation is checked. The remaining work is to make the existing app easier to understand and then finish the remaining accounting/control gaps.

### Priority 1 — Make the actual app easier to understand and operate
Use current logistics/TMS UX research and the owner's existing product feedback as input, but make changes against the actual authoritative implementation.

Focus on:
- clear role-based starting points and obvious next actions;
- operations views that surface work needing attention instead of making users hunt;
- clear active-job/load/trip stages and responsible person;
- visible exceptions, missing documents and invoice-ready work;
- a short path from completed delivery/POD to billing;
- consistent terminology across Fleet, Trip, Delivery, POD and Finance;
- progressive disclosure: important operational decisions first, secondary detail one level deeper;
- less repetition and unnecessary whitespace;
- strong visual hierarchy rather than dashboard/chart overload;
- mobile readability and touch targets for field use;
- honest offline/loading/error/empty states;
- exception states that tell the user what happened and what to do next;
- reports that feel like one connected financial system rather than unrelated screens.

The objective is not a cosmetic redesign. **The app should make the right operational decision obvious.**

### Priority 2 — Finish remaining accounting/control modules
After the UX pass, finish the remaining substantive accounting/control work in this order:
1. Complete VAT/tax integration — consume workspace settings during invoice creation, calculate tax-inclusive/exclusive totals, store authoritative subtotal/tax/total fields, post VAT correctly to the journal and render tax fields on the canonical invoice.
2. Bank reconciliation — bank transaction/import model, matching against customer payments/journal entries, reconciliation state, controlled adjustments and audit trail.
3. Payroll / driver settlement — driver/subcontractor settlement records, trip-linked earnings/costs, approval/payment state and journal consequences.
4. Richer scheduled/export reporting — operational/financial report periods, durable exports and scheduled report infrastructure where useful.
5. Provider integrations — email, push notifications, telematics and external/background mapping capabilities where a real provider is selected.

These are the **actual product-finishing priorities**. Do not let roadmap administration, branch archaeology, or speculative features displace them.

## Pipeline — STATUS/ROADMAP ONLY, NOT A PRODUCT WORKSTREAM
**The Pipeline is already doing its job. Leave it alone while building the application.**

`/pipeline` exists to help the owner see where the product is, what is being worked on, what has been released, and what the owner has requested. It is a status/roadmap aid, not a second application and not a feature-development priority.

- Do not spend implementation time moving, rebuilding, securing, redesigning or otherwise developing the Pipeline unless the product owner explicitly asks for a Pipeline change.
- Do not use the Pipeline's branch/history as a reason to change the authoritative application branch.
- Do not repeatedly discuss or investigate Pipeline implementation while substantive application work remains.
- When the product owner asks for a Pipeline/status update, update the status to reflect the actual application state and owner input; otherwise leave the Pipeline alone.
- Owner input, including dated notes and optional Loom context, is product feedback. It is not a separate technical workstream.
- **The goal is to finish Translend, not to finish the Pipeline.**

## Latest development checkpoints
- `0fd839c9f997d0b920117a4ede62cfc02a1f2ca5` — controlled Credit & Debit Notes.
- `b54aa2afd7aaa9202e5d5c577c814cd78fab478d` — development checkpoint documentation update.
- `51aca15c2570bee36f62fb220425b64994b59dd6` — workspace Tax & VAT controls.
- `95399ebe6b8034b6a846c486778696a3098d666b` — authenticated VAT preview endpoint and calculation primitives checkpoint.
- `636d0e89787dd443f2c45301e5bdde8516941146` — pending workspace invitations are claimed even when the signed-in user already belongs to another workspace; claimed workspace becomes active and last-active workspace is persisted.
- `dcda4a587fad416469c649cb27464a03e60155ac` — driver navigation restriction and multi-workspace selector introduced.
- `bb2166bfddf9c3f1a2247c5d3a924605a5553b80` — root entry routes each role to its correct workspace landing page.
- `58aa1af748c034326af4ffeb8de04a5e0c063be0` — driver route boundary enforced so direct URLs outside the driver surface return to My Trip.
- `7778720d5d17fabb6fe63e3e5b0a7da8f50f6b2a` — driver surface tightened to My Trip only; workspace switching remains available for multi-workspace accounts.
- `b3539491b1664fd8d86c8f9b0a8f1d766ba42962` — login workspace resolution corrected so an active driver membership takes precedence over the owner's workspace when no newly claimed invite explicitly selects another workspace.
- `666648cd8c0e896afe03ed19e2b490a83831dc` — corrected multi-workspace login behavior so accounts with multiple workspaces are shown the chooser instead of being auto-forced into the driver workspace.
- `f4e891e2190da804d8951370cc3e021e45cf20ea` — workspace chooser now opens `My Trip` for driver memberships and `Operations Hub` for non-driver memberships.
- `d46d00030586e9cd0306ba2f4fbf8bb9d01fba96` — fixed chooser selection race so selecting a workspace is not immediately cleared by workspace-resolution refresh.
- `dbbd026ba239992ccb5a9db9710d73207a8e2bc7` — restored the intended multi-workspace flow: when multiple workspaces exist, login always clears the active workspace and shows the chooser; saved last-active workspace is not allowed to bypass the chooser.
- `71146f16d165818f9f459d28ee1bf6dbc744a574` — authoritative app deployment checkpoint; use this branch/commit lineage for Translend production.

## Owner-QA finish checkpoint — 2026-09-26
- Fixed the missing `/translend` entry route so it now opens the signed-in user's workspace or the normal sign-in/root entry.
- Hardened mobile controls and overflow behavior; small screens keep touch targets usable and content can scroll horizontally where tabular data genuinely requires it.
- Delivery history and finance selectors now prefer human-readable Job, Delivery Note and truck references over raw Firestore IDs.
- Delivery expense capture now supports linking fuel to the relevant Trip and Delivery Note, with server-side validation that the delivery belongs to the trip/truck.
- Customer payment recording now goes through the server accounting action, enforcing outstanding-balance limits and posting the payment to Cash at bank / Accounts Receivable with audit evidence.
- Supplier bills and supplier payments now use server accounting actions and post the corresponding accounting entries rather than relying only on client-side record mutation.
- Invoice issuance now uses the server accounting action and workspace Tax & VAT settings; invoice records retain net/tax/gross data and VAT is represented in the journal.
- Printable invoices and reports expose the stored tax breakdown.
- Owner QA still requires real browser/device verification of mobile clipping, driver sign-in/workspace visibility, invitation expiry/re-invite behavior, delivery-note print readability, and error/offline recovery. These are verification items, not assumed green from source inspection alone.
- Remaining product-finishing modules after owner-QA closure: bank reconciliation, driver/pay settlement, richer exports/scheduled reporting, and selected provider integrations.
- Do not mark Translend finished until the owner-reported QA items above are tested against the deployed authoritative application.

## Current finish checkpoint — 2026-09-26
- UX/clarity pass started from the authoritative application, not a parallel rebuild.
- Operations Hub now surfaces actionable work: confirmed jobs awaiting dispatch, delivered work missing completed POD, completed PODs ready for invoicing, and overdue issued invoices.
- Primary navigation grouping is clearer and stale NEW badges were removed so badges communicate actual attention rather than novelty.
- Invoice creation now consumes workspace Tax & VAT settings server-side at issue time and stores authoritative net, tax, gross/total, rate, code and mode fields.
- VAT-enabled invoices post a balanced multi-line journal: Accounts Receivable debit = gross; Haulage Revenue credit = net; VAT Payable credit = tax.
- Financial statement aggregation reads multi-line journal entries while retaining backward compatibility with existing single-line journal entries.
- Printable Tax Invoice now renders the stored subtotal, VAT rate/amount and total.
- Invoice register now exposes net/VAT/total so billing control is visible without opening each document.
- These changes are on \`finish/translend-ux-and-accounting\`. They require typecheck/lint/build and affected workflow QA before being treated as verified.

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

The multi-workspace chooser/login correction is implemented but requires actual production verification. Do not confuse verification status with development completeness.

## Development workflow
Required sequence when tooling is available:
`inspect HEAD → typecheck → lint → build → affected workflow verification → AGENTS update → commit → push → deployment status`

Never call a deployment green without actual status evidence. Do not repeatedly trigger deployments while quota is exhausted.

Never use Pipeline work to justify switching application branches. If the next task is application work, start from the authoritative application source and work on the actual product.

Future agents:
`read AGENTS.md → confirm branch/current HEAD → inspect recent commits → trace business mutation paths → inspect rules/indexes/config → use current UX/TMS research where it materially improves clarity → fix root cause → inspect diff → verify → update AGENTS.md → commit/push → report exact SHA/status`.


## Final owner-QA hardening checkpoint — 2026-09-26
- Invitation management now exposes the pending invitation expiry timestamp and a direct Re-invite action. Re-invite uses the existing server replacement behavior, issuing a fresh 7-day pending invitation and revoking the older pending invite for that email.
- Business Controls no longer carries a dead subscription effect; customer payment and supplier-bill actions validate positive amounts client-side and disable the submit control while the server action is running.
- Printable Tax Invoice and Delivery Note now have a retry action after load failure and explicit print control labeling; print output keeps the document page focused and A4-oriented.
- Latest authoritative source checkpoint after this hardening pass: `8c28507e84aca0162f8d157b6230850bd1f6cbaa`.
- These changes remain source-verified only until the authoritative deployment and owner browser/device walkthrough are verified.

## Operational visibility completion checkpoint — 2026-09-29
- Re-inspected the authoritative app top-down across Customers → Jobs / orders → Dispatch / Trips → Deliveries / POD → Invoicing.
- Added a shared workflow-progress component at `src/components/v19/WorkflowNextStep.tsx` so the core screens visibly explain where the current record sits and where the user goes next.
- Customers now expose the operational path from customer → job/order → dispatch → delivery/POD → invoice/payment.
- Jobs now expose the same lifecycle and show a direct next-action link for confirmed, dispatched/in-progress and completed work.
- Trips / Dispatch now show the lifecycle position and direct the operator to Delivery / POD when a trip reaches unloading/completion.
- Deliveries now show the lifecycle position and directly distinguish incomplete POD work from completed-POD work ready for invoicing.
- Invoicing now shows its place at the end of the same operational chain instead of behaving like a disconnected financial screen.
- This is a workflow/operational-clarity implementation pass, not a cosmetic dashboard redesign. The intended rule is: a user should be able to see what happened, what stage the work is in, and what to do next without hunting through navigation.
- Source implementation checkpoint: `10b78e66421ffdc0f4be69c58be3ff0781903e15` plus the preceding workflow commits on `v19-authoritative`.
- Still required before calling this visibility work fully verified: typecheck/lint/build and deployed browser walkthrough across the affected screens. Do not claim those checks passed from source inspection alone.
- Remaining substantive product-finishing modules are unchanged: bank reconciliation, driver/pay settlement, richer scheduled/export reporting, and selected provider integrations.
