# START HERE — AI PROJECT CONTEXT

## What this project is

This repository is the authoritative rebuild of Translend TMS Truck Division v19.

Translend TMS is an operational transport management system being rebuilt into a real working application.

- Repository: `gatshaayanda/translend-tms`
- Authoritative branch: `v19-authoritative`
- Engine: Next.js + React + Firebase Authentication + Firestore
- Evidence transport: UploadThing
- Firestore is the business/source-of-truth layer.

Before making any change:

1. Read this entire AGENTS.md.
2. Inspect the actual current repository state.
3. Check git status/recent commits.
4. Inspect the existing implementation before replacing anything.
5. Continue from the latest authoritative checkpoint.

Do not use stale chat context, an older AdminHub/PurePress iteration, or an earlier patch as the source of truth.

---

## CURRENT DIRECTION — LOCKED

The original `translend_v19_preview.html` is the visual/product source of truth for the Translend v19 Truck Division interface. The supplied Figma file is the visual validation/reference layer for rendered layout, spacing, hierarchy and responsive behavior.

The target is **native Next.js/React reproduction of the HTML/Figma design**, not an iframe, raw HTML runtime, or separate static application.

Architecture:

HTML/Figma design
→ native React/Next.js UI components + CSS
→ existing Firebase Auth + Firestore repositories
→ existing UploadThing evidence transport

The application engine is already connected. The immediate priority is to finish the visual adaptation before expanding the database/domain model.

### Design fidelity rules

- Light-first Translend v19 SaaS UI.
- Teal/orange brand palette.
- Inter body typography and Poppins italic Translend wordmark.
- 248px desktop sidebar, sticky translucent topbar, compact nav and responsive mobile drawer.
- Rounded 8–16px cards/panels, restrained shadows, bordered tables, status badges and structured forms.
- Reproduce the **inside-panel structures** from the HTML, not only the shell: KPI/metric cards, section headers, panels, list rows, forms, tables, notices, charts/metrics, delivery/POD panels, PO capture, document previews, invoice/statement previews and mobile stacking.
- Do not turn the app into a generic dark Tailwind dashboard.
- Do not copy the HTML wholesale into React. Refactor its design vocabulary into maintainable React components/CSS.
- Preserve real Firestore/Auth/UploadThing behavior. Styling changes must not replace live data with demo records.
- HTML demo values are visual/structural references only unless backed by existing repositories.
- Do not redesign away from the HTML/Figma direction without an explicit product decision.

### Design implementation sequence

1. Lock global HTML-derived design tokens, typography, surfaces, cards, panels, forms, tables, badges and responsive behavior.
2. Align AppShell/navigation/topbar.
3. Refactor live Customers, Control Tower, Fleet, Trips, Jobs and Drivers surfaces into the HTML panel/card/form/table vocabulary.
4. Align Delivery/POD UI without breaking its working Firebase/UploadThing workflow.
5. Match HTML mobile behavior.
6. Continue into remaining HTML-derived operational/financial surfaces.
7. Only after the design is stable, deepen database/domain coverage for surfaces that need new persisted entities.

A reviewer should immediately recognize the live app as the Translend v19 HTML product, not as a generic dashboard.

---

## Firebase / data architecture direction

Firebase Authentication + Firestore remain the engine.

- Keep records organization-scoped and repository-driven.
- Use realtime listeners where operational pages need live updates; use normal reads where a snapshot is enough.
- Use atomic Firestore transactions/batched writes when a business invariant requires several related records to change together.
- Preserve the existing membership/security model.
- Never broaden workspace access to fix a UI page.
- Never deploy guessed/restored Firestore rules from memory.
- Verify query shapes against rules; Firestore rules are not filters.
- Never introduce Firebase Storage for POD/evidence uploads.

Firebase's current documentation confirms Firestore supports hierarchical documents/subcollections, realtime listeners, offline persistence, atomic transactions/batched writes, and path-based Security Rules. These capabilities should be used deliberately as the later data model is expanded rather than creating a second data layer.

---

## CURRENT AUTHORITATIVE CHECKPOINT

Always verify against git because commits may advance beyond this list.

Important history includes:

- `26936b7` Establish Translend v19 application
- `24bed21` Update Next.js to patched 15.5.15
- `ff313d4` Add UploadThing POD infrastructure and Firebase indexes
- `5552c60` Merge authoritative project context and workflow
- `8054f92` Update authoritative checkpoint and define Patch 2 delivery workflow
- `fcadeaa275e32cf7b56fd266aa0d22c7a18c22ee` Implement Patch 2 delivery domain foundation
- `a9e21b956aa7d61604811ce8bee631150cce18e3` Patch 2: add Delivery Note and Material Lines workflow
- `20d9dd93582dfec40c894e0be3abf78d0cda1b9f` Patch 2: add delivery arrival departure and acknowledgements
- `1e8b3da07d97e86f109a717512941eccb980301b` Persist UploadThing evidence metadata to delivery records
- `c38871567ce84d9d1f6f3b5850f6496c48af151a` Make UploadThing evidence route self-contained
- `2c185fbc5df650d7dadb262c587c53ce55c63eb7` Add authenticated Delivery evidence uploader
- `1237ac87e135e872563921f8e4348941593fc1be` Add Delivery evidence capture panel

The actual repository state is authoritative if newer commits exist.

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

Delivery behavior remains real and persisted. Do not replace it with static HTML demo behavior during the design pass.

UploadThing POD/evidence remains mandatory for evidence transport. Firebase Storage must not be introduced.

---

## REQUIRED AI WORKFLOW

START
→ Read AGENTS.md
→ Inspect current repository and branch
→ Inspect recent commits

DESIGN INSPECT
→ Inspect `translend_v19_preview.html`
→ Inspect Figma reference when available
→ Inspect the actual React route/component
→ Identify reusable design primitives

BUILD
→ Implement the HTML/Figma visual language natively in Next.js
→ Preserve existing data flow and repositories
→ Prefer coherent page-level adaptations over endless cosmetic micro-patches
→ Do not create parallel engines

VERIFY
→ Inspect diff
→ Use the normal Vercel/CI verification path when available
→ Fix actual errors
→ Validate desktop/mobile behavior where possible

CHECKPOINT
→ Update AGENTS.md when the continuation point changes
→ Commit meaningful work
→ Push to `v19-authoritative`
→ Report commit SHA and verification status

---

## EXPLICIT NON-GOALS

Do NOT:

- rebuild authentication
- replace Firebase/Firestore
- replace UploadThing
- casually change Firestore Security Rules
- iframe or serve the HTML as the application
- discard working CRUD or Delivery workflows
- replace live data with fixtures
- restart from an older AdminHub/PurePress iteration
- make dark mode the default product direction

---

## MOST IMPORTANT RULE

This is a continuing application. **HTML/Figma is the visual north star. Firebase/Firestore/UploadThing are the engine.** Continue forward from the authoritative repository; do not restart the product.