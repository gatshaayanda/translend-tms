# Translend TMS · Truck Division v19

Next.js 15 (App Router) + TypeScript + Tailwind + Firebase (Auth, Firestore, Storage).

## Status of this implementation package

Built fresh in this session — nothing here was recovered from a prior
session, since no prior files existed in this conversation's context.

**Working vertical slice, generated end-to-end:**

- `src/types/core.ts` — all shared domain types (users, orgs, members, roles/permissions, customers, trucks, drivers, jobs, trips, deliveries, control tower snapshot)
- `src/lib/firebase/client.ts` — single Firebase init point, explicit `FirebaseInitError` instead of silent failure
- `src/lib/firebase/workspace.ts` — user profile + organization + membership data layer
- `src/lib/firebase/repository.ts` — generic org-scoped Firestore repository (list/subscribe/get/create/update/softDelete), reused by every module
- `src/lib/firebase/modules.ts` — named repos: customers, trucks, drivers, jobs, trips, deliveries
- `src/lib/firebase/storage.ts` — POD file upload helper
- `src/contexts/AuthContext.tsx` — explicit auth state machine (unauthenticated/authenticating/authenticated/error), fixes the old infinite-loading defect at its root
- `src/contexts/WorkspaceContext.tsx` — layered workspace state machine (checking_workspace/company_setup/application/error)
- `src/components/layout/AppGate.tsx` — composes both state machines into concrete screens, always with a visible retry on error
- `src/components/layout/SignInScreen.tsx`, `CompanySetupScreen.tsx`, `AppShell.tsx` — sign-in, onboarding, and the real nav shell
- `src/app/layout.tsx`, `src/app/page.tsx` — root layout/page, auth+workspace gate, redirect into active org
- `src/app/(app)/[orgId]/layout.tsx` — Translend layout, validates the URL's orgId against real membership
- `src/app/(app)/[orgId]/control-tower/page.tsx` — live aggregation from real Firestore data (no mock data path)
- `src/app/(app)/[orgId]/customers/page.tsx` + `CustomerFormDialog.tsx` — real-time list, search, create
- `src/app/(app)/[orgId]/trucks/page.tsx` — fleet list + create
- `src/app/(app)/[orgId]/drivers/page.tsx` — driver roster + create
- `src/app/(app)/[orgId]/jobs/page.tsx` — job list, customer-linked creation
- `src/app/(app)/[orgId]/trips/page.tsx` — dispatch (job+truck+driver → trip), status progression
- `src/app/(app)/[orgId]/deliveries/page.tsx` — POD capture with Storage upload, exception handling
- `firestore.rules`, `storage.rules` — org-isolation + role-based security rules matching `ROLE_PERMISSIONS`
- Config: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `postcss.config.mjs`, `.env.example`

## Not yet built (explicitly out of scope for this pass)

- Rate cards, expenses, invoices, receipts, statements, profitability/P&L
- Maintenance, inspections, compliance, tyres, fuel modules
- Routes (beyond origin/destination strings on Job)
- Reports, documents, audit/activity log
- Edit/delete UI for existing records (create + status-advance only, per module)
- Cloud Functions for the control-tower aggregation (currently computed client-side from live queries — fine at current scale, should move server-side as data grows)
- Automated tests

## To run this

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Firebase project config
3. Deploy `firestore.rules` and `storage.rules` to your Firebase project
4. `npm run dev`

## Next steps in priority order

1. Wire the reference-project auth/security patterns you specified (AdminHub Global, PurePress) into a review pass over `AuthContext`/`firestore.rules` — I don't have those repos' contents, so this pass used first-principles Firebase best practices instead.
2. Edit/delete flows for customers, trucks, drivers, jobs.
3. Trip-to-delivery linkage refinements (multi-stop trips, partial deliveries against a single job).
4. Rate cards → job rate auto-fill.
5. Invoicing off completed jobs.
