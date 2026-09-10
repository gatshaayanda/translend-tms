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
