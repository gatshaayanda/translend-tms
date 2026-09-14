# START HERE — Translend TMS · Truck Division v19

## Authoritative project
- Repository: `gatshaayanda/translend-tms`
- Branch: `v19-authoritative`
- Current checkpoint: `a0ad36609aecabe4720506a3e56225a8d5a6a1ac`
- Stack: Next.js 15.5.15 + TypeScript + Tailwind + Firebase Auth/Firestore + Vercel
- Firestore = business/source of truth.
- UploadThing = POD/evidence and finance-receipt transport.
- Never introduce Firebase Storage for POD/evidence/receipts.
- Never replace Firebase with Supabase/another backend.
- GitHub/current HEAD outranks remembered chat context and old patches.

## Product north star
The real acceptance test is:
`Job → Dispatch → Trip → Delivery → POD/evidence → Invoice → Payment → Journal → Reporting`

A screen, button, Firestore document, offline banner or successful UI state is not proof that the business operation works. Trace the real mutation, authorization, atomicity, retry/idempotency, audit and reporting consequences.

## Current state
- Company/workspace, users/roles, customers, trucks, drivers: LIVE workspace data and CRUD foundations.
- Job → Dispatch → Trip: transactional dispatch and driver trip progression are implemented.
- Delivery/POD: required POD gating, evidence review/replacement, exceptions and completion validation exist.
- Driver offline actions: durable queue + replay receipts + blocked terminal failures exist for field mutations.
- Fleet inspections/defects/work orders/offline replay: hardened path exists.
- GPS/telematics: provider boundary exists; no fake locations or background-tracking claims.
- Finance: invoice/payment/journal/fuel/supplier-bill server actions exist; finance stays online/server-controlled.
- Reporting: LIVE Firestore-derived reporting exists.

Still not claimed complete: full tax/VAT configuration, credit/debit notes, bank reconciliation, payroll/settlement, richer scheduled/export reporting, and provider-dependent email/push/telematics/map capabilities.

## v19 hardening lessons
### 1. Firebase Storage must stay removed
`src/lib/firebase/storage.ts` was dead legacy code. `getFirebase()` intentionally returns only `{ app, auth, db }` because v19 uses UploadThing for POD/evidence/receipts. The stale helper caused the build failure by destructuring a removed `storage` property.

Prevention: search the whole repository for `@/lib/firebase/storage`, `uploadPodFile`, `getStorage`, `firebase/storage`, and `storageBucket` before touching Firebase client configuration. Never reintroduce Firebase Storage just to satisfy TypeScript.

### 2. Server-controlled mutations must actually be server-controlled
The audit found admin Delivery UI code performing arrival/departure/acknowledgement as separate direct Firestore updates. That could leave Delivery and Delivery Note half-updated. It also created Delivery + Delivery Note with multiple client writes.

Fixed: `/api/deliveries/workflow-action` now transactionally handles delivery creation and admin arrival/departure/acknowledgement, and the admin Delivery page uses that boundary. Firestore client rules now deny direct Delivery/Trip state writes and allow only explicitly editable Delivery Note fields.

Prevention: any mutation that changes two linked business records must be traced to one transaction/batch/server workflow. Do not accept two sequential `repo.update()` calls as atomic.

### 3. UploadThing finalization must be atomic and replay-safe
Evidence upload previously updated Delivery and Delivery Note with separate writes. Concurrent/repeated callbacks could also produce version drift.

Fixed: UploadThing evidence finalization now uses a Firestore transaction, treats an existing file key as idempotent, updates both records together, and audits inside the transaction. Notifications remain non-authoritative and occur after commit.

Prevention: file transport success is not business success. The callback must atomically finalize every authoritative record and tolerate callback replay.

### 4. Client Firestore rules must protect authoritative fields
Previous rules preserved the record envelope but still allowed ordinary clients to change business-sensitive fields such as status/assignment/evidence/finance state.

Fixed: client creates now validate `orgId`, LIVE environment, actor/creator and soft-delete envelope. Server-controlled Trip/Delivery/finance/exception collections are client-write denied. Truck/Driver/Job status/assignment fields are protected. Delivery Note client updates are allowlisted to editable fields.

Firestore rules are security boundaries, not UI configuration. Use `diff().affectedKeys()`/`unchangedKeys()` for field-level protection. Do not weaken rules to fix a permission error.

### 5. Error contracts matter
Mandatory status semantics: 401 authentication, 403 authorization, 400 invalid input, 404 missing resource, 409 state/concurrency conflict, 500 unexpected server failure. Avoid catch-all 400/401 responses because they break retry/recovery semantics.

## Offline/reliability checklist
For every driver/field action:
1. Can it be entered offline?
2. Is it durably queued?
3. Does UI show local-save state?
4. Does reconnect replay automatically?
5. Can a lost response duplicate the mutation?
6. Does a terminal server rejection become blocked/attention-required?
7. Can the visited workflow reload offline?
8. Does replay survive another network loss without infinite retry?

Firestore transactions are not offline-capable, so money/state-changing server transactions require an explicit online boundary and safe retry/idempotency design. Do not blindly make finance mutations offline.

## Finance checklist
Always trace:
`completed POD → invoice → payment → AR/Cash journal → reporting`

Check duplicate invoice/payment/reference, customer/job/POD linkage, positive amount, open accounting period, overpayment, supplier bill linkage, journal balance, reversal integrity, audit, concurrency and lost-response behavior.

Never let a client directly create accounting records. Prefer one server transaction for operational + accounting state that must succeed together.

## Fleet/TMS benchmark
Current fleet references consistently treat dispatch, mobile driver workflows, offline field operation, ePOD, inspections, maintenance/work orders, fuel/cost control, visibility and reporting as connected workflows. Use current Trimble/Fleetio/Samsara references as behavioral benchmarks, not feature-cloning instructions.

## Deployment/verification
Required sequence when tooling is available:
`inspect HEAD → typecheck → lint → build → affected-workflow verification → AGENTS update → commit → push → Vercel status`

Never call a deployment green without actual status evidence.

Current connected Vercel account exposes only the `adminhub-global` project, not a dedicated `translend-tms` project. The GitHub Vercel check currently reports a Vercel **build-rate-limit** failure rather than the original TypeScript Storage error. Do not repeatedly trigger deployments while the Hobby quota is exhausted and do not claim the current commit is deployed.

## Required workflow for future agents
`read AGENTS.md → confirm branch/current HEAD → inspect recent commits → trace real business mutation paths → inspect rules/indexes/config → compare with current TMS behavior → deliberately attack retry/offline/concurrency/security edges → fix root cause → inspect diff → run verification available → update AGENTS.md → commit/push → inspect deployment status → report exact SHA/status`

Do not reset, revert, branch away, or reuse an older generation. Do not stop at a theoretical issue when a safe root fix can be made. Do not invent data, weaken security, or paper over compiler/runtime failures.
