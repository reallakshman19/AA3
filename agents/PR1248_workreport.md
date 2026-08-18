# PR1248 — Current-Main Production Bundle Hard-Ceiling Repair

# CURRENT STATE — READ FIRST

```text
HANDOVER_READINESS: READY_FOR_CONTINUATION
REPOSITORY: reallaksh19/Advanced_Analysis
PR: #1248 (draft)
BRANCH: agent/main-bundle-hard-ceiling-repair-20260818
BASE_SHA: 585a897afa0f5c9799cb68a58de00a55808062b3
EXECUTION_MODE: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
CURRENT_STAGE: ROLLUP_MODULE_PROFILING
CURRENT_PRODUCT_CODE_CHANGE: NONE
CURRENT_BLOCKER: exact-main main chunk 1,205,227 B > 1,179,648 B hard ceiling
EXACT_NEXT_ACTION: consume Rollup `main.modules[*].renderedLength` profile, select a stateless/one-way leaf boundary with >=25,579 B recovery plus margin, then prove production build + browser boot without weakening policy.
```

## Mission
Restore the existing production bundle hard-ceiling gate on current main as a prerequisite for PR #1246 TECH-13 exact-head qualification.

Authoritative baseline from closed diagnostic PR #1247:

```text
hard ceiling                    1,179,648 B
exact-main main chunk            1,205,227 B
required recovery                   25,579 B
required reduction vs main           2.122% of current main chunk
pre-existing overage vs ceiling       2.1684%
```

PR #1246 currently adds 22,238 B beyond this exact-main baseline, but that is a separate incremental concern. PR #1248 owns only the pre-existing 25,579 B current-main debt unless explicitly re-scoped.

## Constraints / Falsifiers
- Do not raise or bypass `bundle-chunk-check.mjs`.
- Do not redefine the engineering threshold.
- Do not force a stateful workspace controller/store/view into a manual chunk based on size alone.
- A chunk-size PASS with TDZ/evaluation-order browser failure is FAIL.
- A change that modifies engineering calculations, mesh policy, solver behavior, or TECH-13 trust-root authority is out of scope.
- Prefer a one-way stateless leaf, existing dynamic boundary, or deduplication with source-level proof.
- Browser boot and existing relevant qualification paths must remain behaviorally unchanged.
- No merge without explicit owner authorization.

## Current Evidence
### VAL-BASE-BUNDLE-01 — FAIL / PREEXISTING_BY_EXACT_EXECUTION
Exact main application source `585a897a...` produced `1,205,227 B` main chunk under the existing `1,179,648 B` hard ceiling. Required reduction = `25,579 B`.

### VAL-PROFILE-01 — RUNNING / NOT_YET_INTERPRETED
A diagnostic script `scripts/lafea-bundle-main-module-profile.mjs` invokes the current Vite config with `write:false` and records Rollup's own per-module `renderedLength` for the `main` entry. The visible-workbench workflow runs it immediately after `npm ci`, before the known current-main shell-route regression can stop later steps.

## Changed-File Ledger
1. `scripts/lafea-bundle-main-module-profile.mjs` — diagnostic Rollup module-weight profile; not application-imported.
2. `.github/workflows/lafea-visible-workbench.yml` — temporary profile invocation for this prerequisite branch.
3. `agents/PR1248_workreport.md` — living delivery authority.

Application product-code paths changed: **0**.

## Exact Continuation State
```text
1. Read profile output from PR #1248 hosted run.
2. Rank main-entry contributors by renderedLength.
3. Inspect top candidates for state ownership/import direction.
4. Choose only a safe leaf/dedup boundary with >25,579 B expected recovery plus margin.
5. Implement one bounded production change.
6. Remove temporary profiling workflow instrumentation if no longer needed.
7. Run production build and exact browser boot; compare bytes against 1,205,227 B baseline.
8. Keep PR draft; do not merge without owner authorization.
```
