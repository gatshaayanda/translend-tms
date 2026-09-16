# Translend TMS · Truck Division — Agent Operating Contract

## Product
Translend is an independent transport management application for the Truck Division. The current product goal is to answer: what is moving, what needs attention, what is costing money, and what can be billed.

## Current phase
Working operational MVP / company workspace. The application is beyond the original foundation-only phase. Business workflows must continue against the authenticated, organisation-scoped workspace as one coherent owner → workspace → operational-record workflow.

Do not regress the application to demo-only/local-only behaviour, owner-direct shortcuts, fake company workspaces, isolated feature demos, or a different branch/product surface. The real company workspace is the source of operational context.

## Source checkpoint and branch discipline
- GitHub: `gatshaayanda/translend-tms`
- The repository integration currently exposes `feature/translend-independence` as the default branch. The latest QA-contract checkpoint is `d8bc4558f60b4cbdad042c74b233dc852547619a`.
- Operational UI described by the owner's 15 September 2026 QA audit is substantially later than the original foundation history.
- `rebuild/translend-v19` is an historical foundation branch and must not be treated as the current operational product merely because its name sounds current.
- Do not create or maintain parallel implementations to solve a defect. Before changing code, establish which branch/commit is the actual working/deployed Translend application.
- AdminHub Global is a separate stable project and must not be modified as part of Translend work.

## QA-fix mode — temporary controlled pass
The owner has explicitly asked for a focused QA-fix pass before returning to the normal development path.

During this pass:
- Preserve the current working application and existing owner → workspace → customer → truck → driver → link driver → trip workflow.
- Do not redesign, restructure, rename, remove, or replace working modules merely to make the screenshots look different.
- Work only on the 10-item QA backlog plus directly related shared defects discovered while resolving those items.
- The owner's newly reported mobile Driver roster issue is included in this pass: on a phone, the Driver table currently exposes only the first row/details and the remaining driver information is not practically viewable. Make the driver record/details usable at narrow widths without removing fields or weakening desktop behaviour. Prefer a responsive table/list/card pattern already used by the application rather than inventing a new workflow.
- Fix shared primitives where a shared defect is responsible; do not scatter one-off CSS patches across pages.
- Do not change business logic or Firebase data contracts unless the QA defect demonstrably requires it.
- Do not push a checkpoint merely because a source edit was made. A QA item is complete only after the affected behaviour is successfully verified and the required quality gates pass.
- If the current source/deployment cannot be reconciled, STOP rather than patching the wrong branch.

### QA backlog being resolved in this pass
1. Team & Invites — eliminate `Invalid Date` for pending invitation expiry.
2. Operations Hub delivery-note drawer/modal — resolve dark-surface contrast if reproduced.
3. Raw business identifiers — show human-readable truck/trip labels while retaining IDs internally.
4. Machine enums — format values such as `not_started`, `in_transit`, `on_trip` for users.
5. Technical copy — remove Firebase/UploadThing/Firestore/persistence/version implementation language from normal operator UI.
6. Action hierarchy — teal primary, neutral outline secondary, orange/red deliberately for warning/destructive actions.
7. Mobile layout — resolve clipped selects such as `All tru`, constrained cards, excessive density and related responsive defects.
8. Delivery-note print view — use clean neutral fallbacks for missing values.
9. Shared accessibility — correct contrast/readability in reusable UI primitives.
10. Error recovery — verify the actual deployed failing path against the existing error fallback before changing error infrastructure.

The pass is **not** complete until all 10 have either been fixed and verified or have a documented source/deployment explanation that prevents a safe code change.

## Independent architecture
- Next.js App Router + React + TypeScript
- Tailwind CSS + CSS Modules where appropriate
- Firebase Authentication, Firestore and Storage belong exclusively to the Translend Firebase project
- Server-side Firebase Admin ID-token verification is the authentication boundary
- Authorization is capability-based and role-aware
- Vercel deployment is independent of AdminHub Global

## Authentication and workspace flow
Firebase Authentication is the identity boundary for Translend. Google Sign-In is supported. The intended operational flow is:

Owner signs in → real company workspace → create/edit customers → create/edit trucks → create/edit drivers → link driver → assign/operate trips → deliveries/POD → operational follow-through.

A role determines the user's starting view and permissions; it must not silently replace organisation context. Unexpected routing to a different workspace, owner-only shortcut, demo workspace, or placeholder state is a workflow regression and must be investigated before any further patching.

## Security boundaries
Never copy AdminHub production Firebase configuration, service-account credentials, OAuth secrets, Firestore data, Basic Auth, business routes, or AdminHub-specific service-worker behaviour.

`NEXT_PUBLIC_FIREBASE_*` values identify the Translend web app. `FIREBASE_ADMIN_KEY` is server-only and must never be committed.

Firestore and Storage must remain organisation-scoped and capability-controlled. Business records belong to the organisation/business object, while the person entering a record is the author.

## Product/UI rules
The application is an operational TMS, not a technical diagnostics surface. Production UI must use business language and human-readable identifiers.

### Design tokens and hierarchy
- Primary action: dark teal / Translend teal.
- Secondary action: neutral outline/light action.
- Destructive or warning action: orange/red, used deliberately and not as a generic secondary button.
- Status colours communicate state, not action priority.
- Do not mix filled orange, teal, outline, and grey buttons arbitrarily within the same workflow.
- Reusable buttons, fields, cards, status pills, modal/drawer surfaces, tables and spacing should come from shared patterns rather than page-specific approximations.

### Accessibility
- Maintain readable foreground/background contrast, especially inside dark modal/drawer cards.
- Never use dark text on dark slate surfaces.
- Muted metadata must remain readable on its background.
- Disabled controls must remain distinguishable as disabled without becoming unreadable.
- Mobile layouts must not clip controls, truncate important labels, or create avoidable horizontal/vertical overflow.

### Data presentation
- Never expose Firebase/Firestore document IDs as the primary label for a truck, trip, driver, customer or other business record when a human-readable label exists.
- Convert enum values such as `not_started`, `in_transit`, `on_trip` and similar machine values into readable product language in presentation layers.
- Blank values should use a consistent neutral presentation rather than leaking paper-form placeholders or technical sentinels into normal UI.
- Dates must be validated before rendering. Invalid/null timestamps must produce a deliberate fallback such as `Not set` or `No expiry`, never `Invalid Date`.
- Coordinates may be shown as supporting location data, but should not replace truck/vehicle identity in operational lists.

### Production copy
Remove implementation jargon from end-user surfaces. Terms such as Firebase, UploadThing, Firestore, database IDs, "persisted", internal version names, architecture notes and developer-facing storage explanations belong in diagnostics/admin documentation, not ordinary operator workflows.

## Owner QA audit — 15 September 2026
The owner supplied a comprehensive mobile UI/UX audit covering Team & Invites, Delivery Notes, Operations Hub, Performance Dashboard, Workshop Control, Fuel & Workshop, Fleet Intelligence, Fleet Register, Trip Lookup and the application error surface.

The audit is a product backlog, not an instruction to blindly patch screenshots. Each item must be reconciled with the actual current source and deployed commit.

### Assessment against what is currently inspectable
The strongest finding is a **source/deployment mismatch**, not that every screenshot defect is necessarily present in the GitHub branch currently exposed to the integration. The operational screenshots describe a later, much larger application surface than the historical foundation branch. Therefore:

1. **Do not assume the screenshots are generated by the currently inspectable branch.** Reconcile the Vercel deployment commit/branch with the operational code before editing implementation.
2. **Error boundary is already present in source history.** Commits `f14b141`, `4bc916b` and `7c1ce07` added application/route/global recovery before the QA documentation checkpoint. If production still shows the raw Next.js client exception, investigate deployment/path coverage first; do not blindly add a second error system.
3. **The QA findings are already incorporated into this contract.** Future updates should record what was verified/fixed, not repeatedly restate the same screenshot audit.
4. **The old foundation contract is obsolete for this phase.** Do not use `rebuild/translend-v19`'s historical business-module restriction to remove or postpone established Truck Division workflows.

### Visual/viewport findings requiring browser verification
Android volume overlay obstruction, exact mobile clipping/truncation dimensions, constrained card heights/scroll behaviour, actual modal contrast after CSS inheritance, print rendering, route-level client exception behaviour, and the Driver roster's narrow-screen detail visibility require browser verification before being called fully resolved.

### Refactoring targets
Prefer shared implementations for:
- Button variants and action hierarchy
- Form controls, labels, focus and disabled states
- Status pills
- Modal/drawer surfaces
- Responsive tables/lists, including the Driver roster
- Date/timestamp formatting
- Enum/status formatting
- Business-record display labels
- Empty/unknown value presentation

Do not turn the audit into a broad visual redesign. Preserve the established Translend workflow and product language while removing defects, inconsistency and technical leakage.

## Workflow rules for QA-driven fixes
START → BUILD → CONTINUE/RECOVER.

For every controlled change:
1. Inspect the actual branch/commit and affected source.
2. Identify whether the reported behaviour is source, deployment, data, or viewport dependent.
3. Fix the smallest reusable layer that resolves the issue without regressing the workflow.
4. Review the diff.
5. Run locally.
6. Verify affected and related routes, including mobile states where relevant.
7. Run `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
8. Commit and push a checkpoint only after successful verification.

Unexpected result = STOP → inspect actual state → then act.

## Recovery
When continuing work, report:
- current branch
- current commit
- git status
- working/not working
- last verified checkpoint
- relevant implementation state
- next controlled action

## Current configuration state
The independent repository is established. The Translend Firebase project identifier is `translend-tms-dcd2a`. Firebase Console Google Sign-In enablement, Admin service credentials, Vercel environment variables, and end-to-end production/browser verification remain external gates until confirmed.
