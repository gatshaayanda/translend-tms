# Translend TMS · Local Planning Artifacts & Rolling Patch Workflow

## Purpose

ChatGPT may prepare implementation briefs, patch specifications, architecture notes, recovery notes, acceptance criteria and other planning artifacts for execution by a local coding agent.

These artifacts may be created by Claude or ChatGPT and may exist outside the Git repository, including the user's Downloads folder.

## Critical rule

A planning artifact is **planning input, not repository truth**.

The execution agent MUST retrieve and read the local artifact through the local filesystem when instructed. It must then reconcile the artifact against the actual repository before making changes.

## Required reconciliation order

For every patch:

1. Locate and read the relevant local planning artifact.
2. Read `AGENTS.md`.
3. Inspect the current Git branch and working tree.
4. Inspect the current Git checkpoint/history.
5. Inspect the actual source code and configuration.
6. Inspect relevant Firebase/Vercel/deployment state where applicable.
7. Compare planning artifact against reality.
8. Resolve discrepancies before implementation.
9. Implement one controlled patch.
10. Review the diff.
11. Run local verification.
12. Run production/build verification where applicable.
13. Commit and push the verified checkpoint.
14. Update `AGENTS.md` with durable architectural decisions, discovered constraints, completed work and remaining work.
15. Only then proceed to the next patch.

## Local artifact discovery

When the user says a planning artifact is in Downloads or another local folder, the execution agent must discover and read it using Git Bash/terminal.

Example:

```bash
find ~/Downloads -maxdepth 2 -type f \( -iname "*translend*" -o -iname "*patch*" -o -iname "*.md" \)
```

Then:

```bash
cat ~/Downloads/<filename>.md
```

or:

```bash
less ~/Downloads/<filename>.md
```

Do not assume a filename, Windows username or path if discovery can determine it.

## Conflict rule

If a planning artifact conflicts with:

- `AGENTS.md`
- current Git state
- actual source
- Firebase configuration
- Firestore rules/indexes
- Storage configuration
- Vercel configuration
- deployed runtime behavior

STOP and reconcile the difference before coding.

Never blindly implement a stale planning document.

## Rolling patch rule

Patch briefs may be prepared in advance.

This is allowed and encouraged.

However, later patch briefs must NOT be treated as proof that earlier patches have been completed.

For example:

- Patch 2 may be planned before Patch 1 is executed.
- Patch 3 may be planned before Patch 2 is executed.
- Patch 4 may be planned before Patch 3 is executed.

When execution reaches a later patch, the agent must inspect the actual checkpoint produced by the previous patch and adapt the implementation to the actual state.

## Patch dependency rule

Every patch brief must clearly state:

- expected prerequisite patch
- what it assumes
- what it must verify rather than assume
- what it must leave behind
- what must be recorded in `AGENTS.md`

A patch may repair an incomplete dependency when necessary, but must not silently pretend that dependency was completed.

## Temporary planning files

Planning artifacts stored outside the repository are temporary working instructions.

Do not commit them into the repository unless the project explicitly requires them.

Durable architectural decisions, however, MUST be recorded in `AGENTS.md`.

## Standard development sequence

```text
PLANNING ARTIFACT
        ↓
AGENTS.md
        ↓
GIT STATE
        ↓
ACTUAL SOURCE
        ↓
ACTUAL INFRASTRUCTURE
        ↓
RECONCILIATION
        ↓
IMPLEMENTATION
        ↓
DIFF REVIEW
        ↓
LOCAL VERIFICATION
        ↓
BUILD / DEPLOY VERIFICATION
        ↓
GIT CHECKPOINT
        ↓
AGENTS.md UPDATE
        ↓
NEXT PATCH
```

## Role separation

### User

- Product owner
- final reviewer
- controls VS Code, Git Bash and Git
- approves progression between checkpoints

### ChatGPT

- technical navigator
- architecture/reconciliation layer
- patch planner
- reviewer
- acceptance/verification guide
- maintains durable project instructions

### Claude

- planning/engineering co-pilot
- produces detailed implementation briefs, specifications, file plans, code drafts and review material
- must not claim to have inspected the local repository unless the required repository evidence was actually supplied

### VS Code / Git Bash

- authoritative local execution environment
- actual filesystem/source inspection
- actual implementation
- diff review
- build/test execution
- Git checkpoint creation

### Git/GitHub

- source-control checkpoint and historical source of truth

## Claude artifact rule

When using Claude to prepare a patch, Claude should produce a standalone Markdown implementation brief suitable for saving to the user's Downloads folder.

The brief should contain:

1. Patch objective
2. Current known context
3. Prerequisites
4. Mandatory reconciliation gate
5. Required repository inspection
6. Data/model changes
7. UI/UX changes
8. Security rules
9. Infrastructure considerations
10. Implementation requirements
11. Verification requirements
12. Acceptance criteria
13. Git/checkpoint requirements
14. `AGENTS.md` update requirements
15. Explicit list of assumptions that MUST be verified rather than trusted

Claude must not treat ChatGPT's prior description as proof of current source state.

## No speculative architecture replacement

The execution agent must preserve established project patterns unless inspection proves they are inadequate.

Do not introduce:

- a second authentication hierarchy
- a second workspace architecture
- Supabase
- a new repository pattern without need
- unnecessary state-management frameworks
- premature microservices
- paid infrastructure without explicit approval
- public security bypasses
- duplicated business entities
- competing document/data sources

Prefer extending the existing organization-scoped architecture.

## Core product principle

**Make the obvious thing obvious.**

Every patch should improve the ability of the relevant user to understand:

- what is happening now
- what needs attention
- what happens next
- what has been completed
- what is blocked
- what action should be taken

Do not build feature volume merely to resemble competitors.
Benchmark workflow maturity, not feature count.
