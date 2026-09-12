# START HERE — AI PROJECT CONTEXT

## What this project is

This repository is the authoritative rebuild of **Translend TMS · Truck Division v19**.

- Repository: `gatshaayanda/translend-tms`
- Authoritative branch: `v19-authoritative`
- Stack: Next.js 15.5.15 + TypeScript + Tailwind + Firebase Auth/Firestore + Vercel
- Firestore is the business/source-of-truth layer.
- UploadThing is the secure POD/evidence transport.
- Firebase Storage must NOT be introduced for new POD/evidence uploads.

The project is a continuing application. Do not restart it, redesign its architecture, or fall back to an older implementation.

---

## SOURCE OF TRUTH — LOCKED

`v19-authoritative` is authoritative.

Before every implementation change:

1. Confirm the current branch.
2. Inspect the current `HEAD` and recent commits.
3. Inspect the actual current files and implementation.
4. Identify the current data/repository/API flow.
5. Adapt the current implementation.

Never use an older AdminHub, PurePress, Translend patch, or stale chat/code snapshot merely because it looks similar. Never revert to an older version unless the Product Owner explicitly instructs it.

Git/GitHub are the source of truth and checkpoints. The current repository state always outranks remembered context or an old patch.

---

## PORTABLE PRODUCT-BUILD FORMULA — ADMINHUB / ADHUBMVP / PUREPRESS / TRANSLEND

The projects that led to this application established a reusable build pattern. Treat this as a **project lineage and workflow formula**, not as permission to copy an old project blindly.

### The lineage

**AdHub / AdHubMVP** → prove the product idea, core workflow and reusable application patterns.

**AdminHub / AdminHub Base** → establish the reusable technical operating system: Next.js application structure, authentication/workspace patterns, portals, shared UI, Firebase integration, PWA/product shell and operational conventions.

**PurePress** → treat the existing product/reference surface as a finished design and information-architecture source when a project already has a designed frontend. Extract the product language and intended user experience; do not confuse the reference implementation with the new application's runtime.

**Translend v19** → combine those lessons correctly: take the existing designed FACE, preserve/build on the real ENGINE, and wire the two together natively instead of rebuilding either side unnecessarily.

### The formula for future projects

**1. IDENTIFY THE PRODUCT**

Write down what the product is, who uses it, the main workflows and the outcome it must deliver. Do not begin by redesigning the UI or changing the stack.

**2. IDENTIFY THE AUTHORITATIVE STARTING POINT**

Determine whether the project starts from:

- an existing working application,
- an AdminHub/base application,
- an AdHubMVP-derived application,
- a PurePress/HTML/Figma-designed frontend,
- or a combination of these.

Explicitly record the exact repository and branch/commit that is authoritative. Never mix generations because they have similar names.

**3. SEPARATE FACE FROM ENGINE**

Classify every existing asset as one of:

- **FACE** — HTML, Figma, screenshots, visual mockups, copy, layout and interaction specification.
- **ENGINE** — authentication, workspace/membership, database, repositories, APIs, security rules, uploads, business logic and existing CRUD.
- **SHELL** — AdminHub-style application frame, navigation, shared components, responsive behavior, PWA and common utilities.
- **PRODUCT DATA** — real records and domain fields already persisted.

The FACE tells us what the product should look/feel like. The ENGINE tells us what is actually true. The SHELL provides reusable application infrastructure. PRODUCT DATA determines what can honestly be shown as live.

**4. MAP BEFORE REBUILDING**

Create a simple reference-to-runtime map:

`reference surface → native route/component → repository/data source → supported fields → unsupported fields`

For every reference element:

- if real data exists, wire it;
- if the workflow exists, preserve and expose it;
- if the UI concept exists but its data domain does not, build the native surface and clearly mark it as **Database still being configured** / planned;
- if the concept belongs to another route, put it on the correct native route;
- never fabricate customer-facing live numbers merely to make the reference look complete.

**5. ADAPT, DO NOT RESTART**

The default operation is:

`inspect current → preserve working engine → adapt FACE natively → connect real data → add missing domain only when justified`

Do not:

- restart from an old AdminHub patch,
- pull a previous project's implementation simply because it looks cleaner,
- replace Firebase with another backend,
- replace a working repository with mock state,
- or create a second parallel application engine.

**6. BUILD IN COHERENT PASSES**

Use page/domain-level passes, not endless cosmetic micro-patches:

`shared shell → core routes → operational workflows → secondary/control surfaces → finance/reporting → responsive polish → verification`

A page is not complete merely because its styling is close. It is complete when its visual hierarchy, real data, workflow behavior and empty/unavailable states are coherent.

**7. HANDLE MISSING DOMAINS HONESTLY**

When the reference expects a domain that the current engine does not have, do not invent persistence just to satisfy the mockup.

Use a polished state such as:

> **Database still being configured**
> This surface is ready for the real domain records when that repository/data model exists.

The UI can therefore progress without corrupting the application's source of truth.

**8. VERIFY THE WHOLE CHAIN**

Verification is:

`source → typecheck/build → deployment → runtime route → authentication/workspace → live repository data → mutation/CRUD → responsive UI`

A green-looking frontend is not enough. A Vercel deployment is not proof that the business workflow works. A successful CRUD mutation is not proof that the reference surface is correctly implemented.

**9. CHECKPOINT THE LEARNING**

When a mistake exposes a reusable rule, update `AGENTS.md` before the next major pass. The goal is that future projects inherit the lesson rather than rediscovering it.

### Critical lesson from the Translend work

The major failure mode to avoid is **version drift**:

> A current project asks for the latest AdminHub/PurePress pattern, but an older patch or remembered version gets applied because the names look familiar.

This can break wiring, route contracts, repository assumptions and testing even when the patch itself appears valid.

Therefore every project should maintain an explicit **authoritative lineage record**:

`PROJECT → BASE/LINEAGE → AUTHORITATIVE REPO → AUTHORITATIVE BRANCH → CURRENT HEAD → REFERENCE ASSETS → ENGINE → DEPLOYMENT`

Never skip this record.

---

## CURRENT TRANSLEND CHECKPOINT — AFTER BUILD FIX

Current authoritative branch: `v19-authoritative`.

The latest implementation checkpoint includes the native v19 surface expansion and the Fleet rebuild. The immediately preceding Vercel build failed for a known source-level JSX syntax error in `src/components/v19/FinancialAndControlViews.tsx`.

That failure was isolated to malformed JSX in the finance `DemoTable` rendering expression. The component has now been rewritten into valid JSX structure and committed as:

`bca354f9710322c3b365da921eb55692cdee1e02`

At the time this context was written, Vercel had accepted the new commit and was **deploying/pending**. Do not call the deployment green until the Vercel status becomes successful.

The previous Fleet checkpoint remains:

`ba530f6318bc002d3bd386d925a9eb42be4f8644`

The Fleet pass added native operational surfaces including live fleet KPIs, map/status structure, trip lookup, route/profitability presentation and honest unavailable-data states while retaining truck CRUD. Continue auditing it against the original HTML rather than treating the first pass as final.

### Immediate continuation rule

After the build-fix deployment resolves:

1. Confirm Vercel build result for `bca354f9710322c3b365da921eb55692cdee1e02`.
2. If it fails, inspect the actual build error and fix the root cause; do not stop at reporting it.
3. If it succeeds, continue the HTML-vs-native audit.
4. Audit Fleet section-by-section against the original `translend_v19_preview.html`.
5. Then audit Operations Hub, Trips, Delivery Notes & POs, Fuel & Workshop, Invoicing & Statements, Performance Dashboard and each Financials route.
6. Preserve the existing Firebase/Firestore engine throughout.
7. Where the reference requires unavailable data, use the explicit configuration state rather than fixtures.
8. Commit coherent progress and update this checkpoint when the continuation point materially changes.

---

## VISUAL REFERENCE — v19 FACE

The original `translend_v19_preview.html` and the supplied Figma design are **visual/product references**, not the runtime application.

Correct model:

Original HTML / Figma
→ visual/product specification
→ native React / Next.js implementation
→ existing Firebase/Auth/Firestore engine
→ real Translend application

Rules:

- Rebuild the design natively in React/Next.js.
- Do NOT iframe the HTML.
- Do NOT serve the raw HTML as a separate application.
- Do NOT paste the raw HTML wholesale into React.
- Extract and reuse its design vocabulary, structures, responsive behavior and visual hierarchy through maintainable React components/CSS.
- Match the actual HTML/Figma product direction rather than inventing a new visual system.
- HTML demo values are visual/structural references only unless backed by real repositories/data.

The intended visual language is the light Translend v19 SaaS interface: teal brand, orange accent, cream/light surfaces, 248px desktop sidebar, responsive mobile drawer, branded typography, structured cards/panels/tables/KPIs, live-data indicators and strong mobile behavior.

---

## ENGINE PRESERVATION — NON-NEGOTIABLE

The existing application engine must remain underneath the visual rebuild.

Preserve:

- Firebase Authentication
- workspace/organization and membership logic
- Firestore repositories and security model
- existing CRUD and business workflows
- realtime listeners where already used
- UploadThing POD/evidence transport
- existing route/data contracts unless a deliberate product change requires otherwise

UI modernization must not destroy or bypass working backend behavior. Never replace live data with demo records just to make a page resemble the HTML.

---

## FIRESTORE SAFETY — SECURITY BOUNDARY

Firestore rules are security boundaries, not UI configuration.

- Never casually replace, weaken, or deploy Firestore Security Rules.
- Never infer rules from memory or copy rules from another project/version.
- Preserve the existing organization/workspace membership security model.
- New collection rules must use the existing organization/security helpers and least-privilege patterns.
- Verify query shapes against the actual rules; Firestore rules are not filters.
- Do not broaden workspace access to fix a UI problem.
- Do not blindly deploy rules.

Any data-model expansion must first inspect the existing repositories, types, indexes and security rules.

---

## UPLOADTHING — PROTECTED

UploadThing remains the POD/evidence transport.

- Existing Delivery/POD evidence behavior is real and persisted.
- Do not introduce Firebase Storage for new POD/evidence uploads.
- Do not migrate evidence to another storage system as part of a visual pass.
- Do not replace secure upload behavior with static HTML or fake URLs.

---

## TYPE SAFETY — ACTIVE ORG / ASYNC CLOSURES

When using `activeOrg`, workspace, auth or other nullable context values inside async callbacks, effects, Promise chains or subscriptions:

- Perform the null check first.
- Capture a stable primitive ID/value after the check, e.g. `const orgId = activeOrg.id`.
- Use the captured value inside the callback/async work.
- Do not rely on TypeScript narrowing surviving across callback boundaries.
- Run/build against the actual current source rather than assuming a page compiles.

This rule exists because the recent Control Tower/Fleet/Trips work exposed the `activeOrg is possibly null` failure mode.

---

## REGRESSION PREVENTION

Before changing any page or workflow:

1. Inspect its current route/component.
2. Inspect the repositories/API/data flow it uses.
3. Identify existing CRUD, listeners, mutations and business invariants.
4. Preserve those behaviors while adapting the UI.
5. Check adjacent/shared components before introducing duplicates.
6. Verify desktop and mobile behavior where practical.

Never fix one page by copying an older implementation from another project/version.

Visual changes must not silently remove functionality. A page is not considered complete merely because it visually resembles the HTML; its real data and workflow behavior must still work.

---

## CURRENT V19 DESIGN PASS

The current native implementation has already received substantial v19 visual adaptation in:

- AppShell/global visual system
- Customers
- Control Tower
- Fleet
- Trips
- Delivery workflow/mobile UX

The current v19 frontend pass also adds native route/surface coverage for:

- Fuel & Workshop
- Invoicing & Statements
- Performance Dashboard
- Journal Entry
- P&L Statement
- Cash Flow
- Balance Sheet
- Trial Balance

These new finance/workshop surfaces intentionally derive from the existing operational engine where possible. They do **not** invent persisted accounting, fuel, work-order or ledger records that do not yet exist in Firestore.

The original HTML contains additional product concepts inside these surfaces, including Customer/Supplier POs, Maintenance Work Orders, Daily Inspection Tracking, Tyre Cost Control and Fuel Exceptions. They remain visual/product specifications until the corresponding real domain repositories exist.

Do not claim a surface is fully implemented simply because its UI exists. Distinguish clearly between live operational data, presentation-ready UI, and future persisted domain work.

---

## DELIVERY WORKFLOW — PROTECTED

Job
→ Trip
→ Delivery
→ Delivery Note
→ Material lines
→ Arrival
→ Departure
→ Acknowledgement
→ Evidence
→ Exceptions
→ POD completeness
→ Invoice eligibility

Delivery behavior remains real and persisted. Do not replace it with static HTML demo behavior during visual work.

---

## DEPLOYMENT DISCIPLINE

- GitHub is the checkpoint/source of truth.
- Every coherent fix should be committed and pushed to `v19-authoritative`.
- Do not claim Vercel is green unless actual deployment/build evidence exists.
- Do not deploy to an unrelated Vercel project.
- If CI/build evidence is unavailable, state that explicitly.
- Inspect the commit/ref being deployed before treating deployment status as evidence for the current code.
- The Translend repository is currently connected to a Vercel deployment that reports directly through GitHub commit status. Use that evidence for Translend; do not confuse it with the separate `adminhub-global` project.

---

## REQUIRED WORKFLOW — DO NOT STOP AT ANALYSIS

### START

Read `AGENTS.md`
→ confirm `v19-authoritative`
→ inspect current `HEAD`
→ inspect recent commits
→ inspect actual route/component/data implementation

### DESIGN INSPECT

Inspect `translend_v19_preview.html`
→ inspect supplied Figma reference when available
→ inspect the actual native React route/component
→ map reference surfaces to existing/native surfaces
→ identify reusable design primitives

### BUILD

Implement the missing v19 product/visual work natively in Next.js.

- Prefer one coherent page-level implementation over endless cosmetic micro-patches.
- Preserve repositories, auth, workspace boundaries and business workflows.
- Do not create parallel engines.
- Do not introduce Firebase Storage for POD/evidence.

### VERIFY

Inspect the diff.
→ run the project's actual typecheck/build/test path when available
→ fix root causes, not symptoms
→ check affected desktop/mobile behavior where possible
→ re-run verification after fixes

If a build/type error appears and the safe root-cause fix is clear, fix it and continue. Do not stop merely because an error was discovered.

### CHECKPOINT

Update `AGENTS.md` when the continuation point or important workflow rule changes.
→ commit coherent work
→ push to `v19-authoritative`
→ report the exact commit SHA
→ report what was verified and what could not be verified

---

## WORKFLOW ROLES

- **User / Product Owner:** final reviewer and product decision-maker.
- **ChatGPT:** Technical Navigator / implementation controller; maintains continuity, verifies source-of-truth decisions and directs the next safe implementation step.
- **Claude:** hands-on coding/implementation agent.
- **VS Code / Git Bash:** local inspection, terminal execution, file review and human control layer.
- **Git / GitHub:** source of truth and checkpoints.

Do not repeatedly ask for approval for obvious next safe steps. Continue with inspect → implement → verify → commit → push → report.

---

## EXECUTION STYLE

- Prefer one coherent implementation over endless cosmetic micro-patches.
- Inspect before editing.
- Implement against the latest authoritative source.
- Fix actual root causes when verification fails.
- Preserve working behavior while improving the v19 face.
- Never restart the architecture.
- Never silently substitute an older system/version.
- Never claim work is complete based only on the reference HTML.

---

## EXPLICIT NON-GOALS

Do NOT:

- rebuild authentication
- replace Firebase/Firestore
- replace UploadThing
- introduce Firebase Storage for new POD/evidence uploads
- casually change Firestore Security Rules
- iframe or serve the HTML as the application
- discard working CRUD or Delivery workflows
- replace live data with fixtures
- restart from an older AdminHub/PurePress/Translend iteration
- invent a new architecture
- make dark mode the default product direction

---

## MOST IMPORTANT RULE

**This is a continuing application. The v19 HTML/Figma is the FACE. Firebase/Auth/Firestore/UploadThing are the ENGINE. AdminHub/AdHubMVP provide reusable SHELL/operating-system lessons. PurePress/reference assets provide product/design specification lessons. Continue forward from the authoritative repository. Never restart from an older system.**
