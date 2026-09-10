# Translend TMS · Truck Division — Agent Operating Contract

## Product
Translend is an independent transport management application for the Truck Division. The current product goal is to answer: what is moving, what needs attention, what is costing money, and what can be billed.

## Current phase
Independent foundation + verified v19-inspired application shell. Business modules are explicitly out of scope until this foundation is verified.

Do not create Trucks, Drivers, Jobs, Dispatch, Trips, Deliveries, Fuel, Maintenance, Invoices, accounting, or other business functionality in this phase.

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

## Authentication
Firebase Authentication is the only planned identity provider for Translend foundation. Google Sign-In is explicitly supported. Browser authentication obtains a Firebase ID token; protected server routes verify that token with the Translend Firebase Admin SDK before authorization is evaluated.

Google OAuth configuration belongs to the Translend Firebase project only. Authorized domains must include the actual local/production domains used by Translend. Never reuse AdminHub OAuth credentials or domains merely because they already exist there.

## Security boundaries
Never copy AdminHub production Firebase configuration, service-account credentials, OAuth secrets, Firestore data, Basic Auth, business routes, or AdminHub-specific service-worker behavior.

`NEXT_PUBLIC_FIREBASE_*` values identify the Translend web app. `FIREBASE_ADMIN_KEY` is server-only and must never be committed.

Firestore and Storage default to deny. Organization/business access rules are intentionally not implemented until business data contracts exist.

## Product-direction checkpoint (documented, not yet implemented)
The following decisions are product direction only. They must guide future design and data contracts but must not be treated as implemented functionality until the relevant features are deliberately built and verified.

1. Users have role-based starting dashboards, but dashboards are not isolated mini-apps. Navigation allows users to move into other areas according to their permissions.
2. A user's role determines their normal starting view and permissions; the role does not own the business data.
3. Records should retain authorship metadata: who created or reported the record, their role at the time where appropriate, timestamp, and later updater/reviewer information where applicable.
4. Business records belong to the relevant business object/job/trip/delivery/etc. The person entering information is the author, not the owner of that business record.
5. Learning/demo data may exist as an intentional instructional environment. It must be clearly labelled as learning/demo data and be safely removable or resettable before the company begins real operations.
6. Production/live dashboards and reports must be driven by the company's real data. Dummy data must never be presented as live operational data.
7. The product should be understandable to non-technical users and answer: what is happening, what needs attention, and what should I do next?
8. Platform administration and customer organisation administration are separate concepts.
9. Platform Admin should eventually provide appropriate visibility into organisations, users, usage, application analytics, system health, errors and related platform information, while customer private operational data remains properly protected.
10. Vercel/Firebase/platform analytics are infrastructure/product administration concerns and must not be confused with customer trucking data.

These decisions do not authorize implementation of dashboards, administration features, analytics, authorship fields, demo-data tooling, or business modules during the current foundation phase.

## Quality gates
Do not inherit AdminHub's build-error suppression. `npx tsc --noEmit`, `npm run lint`, `npm run build`, deployment verification, and browser verification are real gates. Do not declare success from source inspection alone.

## Workflow
START → BUILD → CONTINUE/RECOVER.

For every controlled change: inspect → plan → one controlled change → review diff → run locally → verify → build → commit → push.

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

## Current migration state
The independent GitHub repository has been established. The Translend Firebase project identifier is `translend-tms-dcd2a` and the supplied Web App configuration is recorded in `.env.example`. Firebase Console enablement of Google Sign-In, Admin service credentials, Vercel environment variables, and end-to-end deployment verification remain external configuration/verification gates until confirmed.
