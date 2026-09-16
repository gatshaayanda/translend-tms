# Translend TMS · Truck Division — Agent Operating Contract

## Product
Translend is an independent transport management application for the Truck Division. The current product goal is to answer: what is moving, what needs attention, what is costing money, and what can be billed.

## Current phase
Working operational MVP / company workspace. The application is beyond the original foundation-only phase. Business workflows must continue against the authenticated, organisation-scoped workspace as one coherent owner → workspace → operational-record workflow.

Do not regress the application to demo-only/local-only behaviour, owner-direct shortcuts, fake company workspaces, isolated feature demos, or a different branch/product surface. The real company workspace is the source of operational context.

## Source checkpoint and branch discipline
- GitHub: `gatshaayanda/translend-tms`
- The repository integration currently exposes `feature/translend-independence` as the default branch, with latest documented commit `ac5783eafb3b0f2dbc72758d3cea7e1aa3c8d62f`.
- Operational UI described by the owner's 15 September 2026 QA audit is substantially later than the original foundation history.
- `rebuild/translend-v19` is an historical foundation branch and must not be treated as the current operational product merely because its name sounds current.
- Do not create or maintain parallel implementations to solve a defect. Before changing code, establish which branch/commit is the actual working/deployed Translend application.
- AdminHub Global is a separate stable project and must not be modified as part of Translend work.

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
The strongest finding is a **source/deployment mismatch**, not that every screenshot defect is necessarily present in the GitHub branch currently exposed to the integration. The current repository history shows the QA documentation commit `ac5783e...` immediately after the earlier error-fallback work, while the operational screenshots describe a later, much larger application surface. Therefore:

1. **Do not assume the screenshots are generated by the currently inspectable branch.** Reconcile the Vercel deployment commit/branch with the operational code before editing implementation.
2. **Error boundary is already present in source history.** Commits `f14b141`, `4bc916b` and `7c1ce07` added an application error fallback and global recovery fallback before the QA documentation checkpoint. If production still shows the raw Next.js client exception, investigate deployment/path coverage first; do not blindly add a second error system.
3. **The QA document itself has already been incorporated into this contract.** Do not repeatedly append the same screenshot findings. Future updates should record what was verified/fixed, not merely restate the audit.
4. **The old foundation contract is obsolete for this phase.** Do not use `rebuild/translend-v19`'s historical "business modules out of scope" wording to remove or postpone the working Truck Division modules.

### High-confidence implementation backlog from the owner's audit
1. **Team & Invites:** pending invitation expiry must never render `Invalid Date`; explicitly validate timestamp/null state and use a deliberate fallback such as `No expiry`.
2. **Operations Hub delivery-note modal/drawer:** if reproduced, fix the shared dark workflow surface so foreground text is readable. This is a critical accessibility issue.
3. **Raw business identifiers:** truck/trip selectors and Fleet Intelligence lists must display registration, name, title or other human-readable labels while retaining document IDs internally.
4. **Machine-readable enums:** format `not_started`, `in_transit`, `on_trip`, etc. in the presentation layer.
5. **Technical copy leakage:** remove Firebase, UploadThing, Firestore, "persisted", internal version names and architecture/storage explanations from normal operator-facing copy. Explain the business outcome instead.
6. **Action hierarchy:** primary workflow actions use teal; neutral secondary actions use outline/light styling; destructive/warning actions use orange/red deliberately. `Edit`, `Back`, `Attach Receipt`, `Suspend` and `Transfer ownership` must not all look like equivalent primary actions.
7. **Mobile select/layout behaviour:** prevent labels such as `All tru` from clipping; group stretched forms sensibly; prevent avoidable card overflow and excessive vertical density.
8. **Delivery-note print/document rendering:** use deliberate neutral fallbacks for missing values rather than raw technical sentinels or unnecessary paper-style blanks where the digital workflow already captures the value.
9. **Shared accessibility:** contrast fixes belong in shared UI primitives where possible, including muted text, status pills, dark overlays, disabled controls, inputs and focus states.
10. **Error recovery:** reproduce the actual failing route/deployment before changing it. The existing source history already contains route-level and global recovery infrastructure.

### Visual/viewport findings that require browser verification
These cannot be declared source defects from screenshots alone: Android volume overlay obstruction, exact mobile clipping/truncation dimensions, constrained card heights/scroll behaviour, actual modal contrast after CSS inheritance, print rendering, and whether a route-level client exception bypasses the existing error boundary.

### Refactoring targets
Prefer shared implementations for:
- Button variants and action hierarchy
- Form controls, labels, focus and disabled states
- Status pills
- Modal/drawer surfaces
- Responsive tables/lists
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
8. Commit and push a checkpoint.

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
