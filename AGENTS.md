# Translend TMS · Truck Division — Agent Operating Contract

## Product
Translend is an independent transport management application for the Truck Division. The current product goal is to answer: what is moving, what needs attention, what is costing money, and what can be billed.

## Current phase
Working operational MVP / company workspace. The application is now beyond the original foundation-only phase. Business workflows are being developed against the authenticated, organisation-scoped workspace and must continue as one coherent owner → workspace → operational-record workflow.

Do not regress the application back to demo-only/local-only behaviour, owner-direct shortcuts, fake company workspaces, or isolated feature demos. The real company workspace is the source of operational context.

## Source checkpoint
The independence migration is derived from the verified Translend foundation/shell on `gatshaayanda/adminhub-global`, branch `feature/translend-foundation`, beginning at foundation commit `7a933e04fa9be9ed4344a4555b730e2811f38185` and subsequent shell commits. AdminHub Global `main` is a separate stable project and must not be modified as part of this migration.

## Independent architecture
- GitHub: `gatshaayanda/translend-tms`
- Next.js App Router + React + TypeScript
- Tailwind CSS + CSS Modules where appropriate
- Firebase Authentication, Firestore and Storage belong exclusively to the Translend Firebase project
- Server-side Firebase Admin ID-token verification is the authentication boundary
- Authorization is capability-based and role-aware
- Vercel deployment is independent of AdminHub Global

## Authentication and workspace flow
Firebase Authentication is the identity boundary for Translend. Google Sign-In is supported. The intended operational flow is:

Owner signs in → real company workspace → create/edit customers → create/edit trucks → create/edit drivers → link driver → assign/operate trips → deliveries/POD → operational follow-through.

A role determines the user's starting view and permissions; it must not silently replace the organisation context. Unexpected routing to a different workspace, owner-only shortcut, demo workspace, or placeholder state is a workflow regression and must be investigated before any further patching.

## Security boundaries
Never copy AdminHub production Firebase configuration, service-account credentials, OAuth secrets, Firestore data, Basic Auth, business routes, or AdminHub-specific service-worker behavior.

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
- Disabled controls must still be distinguishable as disabled without becoming unreadable.
- Mobile layouts must not clip controls, truncate important labels, or create avoidable horizontal/vertical overflow.

### Data presentation
- Never expose Firebase/Firestore document IDs as the primary label for a truck, trip, driver, customer or other business record when a human-readable label exists.
- Convert enum values such as `not_started`, `in_transit`, `on_trip` and similar machine values into readable product language in presentation layers.
- Blank values should use a consistent neutral presentation rather than leaking paper-form placeholders or technical sentinels into normal UI.
- Dates must be validated before rendering. Invalid/null timestamps must produce a deliberate fallback such as `Not set` or `No expiry`, never `Invalid Date`.
- Coordinates may be shown as supporting location data, but should not replace the truck/vehicle identity in operational lists.

### Production copy
Remove implementation jargon from end-user surfaces. Terms such as Firebase, UploadThing, Firestore, database IDs, "persisted", internal version names, architecture notes and developer-facing storage explanations belong in diagnostics/admin documentation, not ordinary operator workflows.

## Owner QA audit checkpoint — 15 September 2026
The owner supplied a comprehensive mobile UI/UX audit covering Team & Invites, Delivery Notes, Operations Hub, Performance Dashboard, Workshop Control, Fuel & Workshop, Fleet Intelligence, Fleet Register, Trip Lookup and the application error surface.

The audit is treated as a real product backlog, but each item must be verified against the actual current source/deployment before changing it. Do not blindly patch from screenshots.

### Confirmed/high-confidence issues to investigate
1. **Team & Invites:** pending invitation expiry can render `Invalid Date`; make date/null handling explicit.
2. **Operations Hub delivery-note modal/drawer:** dark workflow cards were reported with unreadable dark text. This is a critical contrast issue and must be fixed at the shared component level if reproduced.
3. **Raw business identifiers:** truck/trip selectors and Fleet Intelligence lists were reported to expose Firebase/Firestore IDs instead of registrations/titles. Replace presentation labels with human-readable fields while retaining IDs internally.
4. **Machine-readable enums:** delivery-note/POD states such as `not_started` must be formatted for people.
5. **Technical copy leakage:** Fuel & Workshop informational copy reportedly exposes Firebase/UploadThing/persistence/version language. Production operator copy should explain the business effect, not the implementation.
6. **Action hierarchy:** orange actions such as `Suspend`, `Transfer ownership`, `Attach Receipt`, `Edit` and `Back` must not visually compete with the primary workflow action unless their semantic priority warrants it.
7. **Mobile select/layout behaviour:** reported truncation such as `All tru`, stretched forms and constrained cards need responsive treatment so controls remain usable at narrow widths.
8. **Delivery-note print/document rendering:** blank fields should have deliberate neutral fallbacks instead of cluttering the document with technical or paper-era placeholders where a digital value is available.
9. **Accessibility:** muted grey headings/status text and dark overlay/card combinations require contrast review across shared UI primitives, not one-off page patches.
10. **Error recovery:** the source checkpoint already contains route/global error fallback infrastructure. If `/app-error` still exposes the raw Next.js client exception in production, first determine whether the deployment is stale, a different route/error boundary is being hit, or the current application has bypassed the fallback. Do not add a duplicate error system without inspecting the actual failing path.

### Audit items that are visual/viewport-dependent
The following require browser/mobile verification before being called source bugs: Android volume overlay obstruction, exact clipping/truncation dimensions, card height/scroll behaviour, modal contrast as actually rendered, print layout, and route-level client exception reproduction.

### Audit items that are architectural/refactoring candidates
Standardise shared button variants, form controls, status pills, modal/drawer surfaces, data tables/responsive lists, date formatting and business-label formatting. Prefer one reusable implementation over repeated page-specific CSS/logic.

## Important source/deployment discrepancy
As of this documentation checkpoint, the GitHub branch visible through the repository integration is `feature/translend-independence` at commit `7c1ce07ad71b8c288b19c3d41b2eab008d168428`. The supplied owner QA screenshots describe a substantially later operational surface with routes such as `/team-invites`, `/performance-dashboard`, `/fuel-workshop`, `/fleet-intelligence`, `/fleet-live-map`, and `/operations-hub/delivery-notes/...`.

Therefore, those screenshots must not be assumed to correspond to the currently visible GitHub branch. Before implementing fixes, reconcile the deployed Vercel commit/branch with the actual current working code. This is especially important because the reachable branch already contains an application-level error fallback, while the audit reports a raw Next.js client error screen.

## Known historical change
The original foundation-era contract explicitly prohibited business modules. That restriction is no longer the product phase. The application has moved through the working MVP and authenticated organisation-scoped workflow stages. Do not use the old foundation wording as a reason to remove or postpone already-established Truck Division business workflows.

## Quality gates
Do not inherit AdminHub's build-error suppression. `npx tsc --noEmit`, `npm run lint`, `npm run build`, deployment verification, and browser verification are real gates. Do not declare success from source inspection alone.

## Workflow
START → BUILD → CONTINUE/RECOVER.

For every controlled change: inspect → plan → one controlled change → review diff → run locally → verify → build → commit → push.

Unexpected result = STOP → inspect actual state → then act.

For QA-driven work:
1. Reproduce or inspect the reported issue.
2. Identify the shared component/data boundary responsible.
3. Fix the smallest reusable layer that resolves the issue without regressing the workflow.
4. Verify the affected route and mobile state.
5. Check related routes for the same pattern.
6. Build and checkpoint.

Do not turn a screenshot audit into a broad redesign. Preserve the established Translend workflow and product language while removing defects, inconsistency and technical leakage.

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
The independent GitHub repository is established. The Translend Firebase project identifier is `translend-tms-dcd2a` and the supplied Web App configuration is recorded in `.env.example`. Firebase Console Google Sign-In enablement, Admin service credentials, Vercel environment variables, and end-to-end production deployment/browser verification remain external verification gates until confirmed.
