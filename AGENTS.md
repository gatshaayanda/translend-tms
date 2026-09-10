# Translend TMS · Truck Division — Agent Operating Contract

## Product
Translend is an independent transport management application for the Truck Division. The product goal is to answer: what is moving, what needs attention, what is costing money, and what can be billed.

## Current phase
Working MVP. The v19-inspired application shell is now the usable workspace surface. The MVP includes Google sign-in/demo entry, dashboard navigation, core record entry and deletion, local browser persistence, and clear demo/workspace labelling. Firebase-backed persistent business data, organisation tenancy, and advanced workflows remain the next implementation layer.

Demo data must always be labelled as demo data and must never be described as live company operations.

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
Firebase Authentication is the planned identity provider for Translend. Google Sign-In is supported and the main `/translend` route now gates entry behind a Google sign-in or clearly labelled demo workspace. Browser authentication obtains a Firebase ID token; the protected server verification route validates that token with the Translend Firebase Admin SDK.

Google OAuth configuration belongs to the Translend Firebase project only. Authorized domains must include the actual local/production domains used by Translend. Never reuse AdminHub OAuth credentials or domains merely because they already exist there.

## MVP data state
The current working MVP stores entered records in browser localStorage so the product can be used immediately without pretending that an unverified Firestore organisation model is live. Core areas include Jobs, Dispatch, Trips, Deliveries, Routes, Trucks, Drivers, Maintenance, Inspections, Compliance, Tyres, Fuel, Customers, Rate Cards, Invoices, Receipts, Statements, Expenses, Profitability, Operational P&L, Documents, Reports, and Settings. Areas without a specialised workflow currently use a consistent record-management surface.

The next data-layer phase should move authenticated business records into a deliberate Translend Firestore contract with organisation isolation, audit/authorship metadata, capability-based rules, and server-side verification. Do not casually expose or migrate demo records into production data.

## Security boundaries
Never copy AdminHub production Firebase configuration, service-account credentials, OAuth secrets, Firestore data, Basic Auth, business routes, or AdminHub-specific service-worker behavior.

`NEXT_PUBLIC_FIREBASE_*` values identify the Translend web app. `FIREBASE_ADMIN_KEY` is server-only and must never be committed.

Firestore and Storage remain default-deny until the business data contracts and authorisation rules are deliberately implemented.

## Product-direction checkpoint
1. Users have role-based starting dashboards, but dashboards are not isolated mini-apps. Navigation allows users to move into other areas according to permissions.
2. A user's role determines their normal starting view and permissions; the role does not own the business data.
3. Records should retain authorship metadata: who created or reported the record, their role at the time where appropriate, timestamp, and later updater/reviewer information where applicable.
4. Business records belong to the relevant business object/job/trip/delivery/etc. The person entering information is the author, not the owner of that business record.
5. Learning/demo data may exist as an intentional instructional environment. It must be clearly labelled as learning/demo data and be safely removable or resettable before the company begins real operations.
6. Production/live dashboards and reports must be driven by the company's real data. Dummy data must never be presented as live operational data.
7. The product should be understandable to non-technical users and answer: what is happening, what needs attention, and what should I do next?
8. Platform administration and customer organisation administration are separate concepts.
9. Platform Admin should eventually provide appropriate visibility into organisations, users, usage, application analytics, system health, errors and related platform information, while customer private operational data remains properly protected.
10. Vercel/Firebase/platform analytics are infrastructure/product administration concerns and must not be confused with customer trucking data.

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

## Current configuration state
The independent GitHub repository is established. The Translend Firebase project identifier is `translend-tms-dcd2a` and the supplied Web App configuration is recorded in `.env.example`. Firebase Console Google Sign-In enablement, Admin service credentials, Vercel environment variables, and end-to-end production deployment/browser verification remain external verification gates until confirmed.
