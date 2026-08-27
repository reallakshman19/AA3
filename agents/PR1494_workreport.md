# PR1494 Work Report — Load Calc explicit component-moment retention

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_CURRENT_MAIN_REGROUNDED
TAKEOVER_AUTHORITY: WRITE_ALLOWED_WITHIN_PR1494_SCOPE
CRITICALITY: ENGINEERING_CRITICAL
PR: #1494
ISSUE: #1321
BASE_BRANCH: main
BASE_SHA: 4677a92e3e1e8a743efa9c82f03db9d4a11cd59b
SOURCE_PROVENANCE_HEAD: 5f67a09a2103c9ae19b470f7778f419efd495ff1
PRE_FINAL_REGROUND_HEAD: fd672db824fc88bb8946f645a37a71ff6b69df17
CURRENT_STAGE: SOURCE_COMPLETE_EXECUTION_NOT_RUN_REVIEW_PENDING
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
CURRENT_BLOCKER: faithful checkout unavailable; git clone failed before checkout with "Could not resolve host: github.com"
EXACT_NEXT_ACTION: execute focused retention/runtime/result checks plus aggregate/import/build/diff checks on a faithful checkout; keep unavailable checks NOT_RUN; recheck live main, exact 10-file diff, reviews and threads before any merge recommendation.
```

## Mission

Close Issue #1321 PR-C source-explicit component-moment custody in ordinary current-system Load Calc Run without changing vertical-reaction statics.

```text
source explicit point moment
→ exact component-load authority audit
→ separate hash-bound retention receipt
→ AUTO / explicit V2 may calculate vertical reactions only when that exact receipt is retained
→ moment stays separate support/civil demand
→ verticalReactionDistribution = NOT_PERFORMED
```

Explicit V3 is not silently downgraded. Off-route, ambiguous or invalid CoG and unresolved/invalid moment evidence remain fail-closed.

## Recovery history

PR #1494 was auto-closed when its branch was temporarily aligned exactly to `main`; it was successfully reopened. Multiple concurrent EMP.1 merges advanced `main` during recovery. Each advance was inspected and confirmed path-disjoint from this Load Calc slice.

Final recovery policy: rebuild from exact current `main@4677a92e3e1e8a743efa9c82f03db9d4a11cd59b` plus the complete ten-file PR payload in one deterministic commit. The obsolete WIP marker and transient connector-created `tmp-placeholder` are absent.

## Engineering boundary

Changed behavior:

- creates `current-common-input-explicit-moment-retention/v1` custody;
- retention binds the exact component-load authority audit semantic hash;
- AUTO / explicit V2 is permitted only when the formerly blocking source moment is retained separately;
- explicit V3 remains fail-closed instead of being silently downgraded;
- retained demand is bound into stored current-system execution custody;
- an otherwise `CALCULATED` vertical distribution becomes overall `CALCULATED_WITH_EXCEPTIONS` when a retained moment exists;
- Results separates overall status from vertical-distribution status and shows entity, route, chainage, axis and magnitude.

Protected invariants:

- `src/workspace/engineering-loads/support-load-distribution-v3.js` is unchanged;
- force allocation, support reactions, equilibrium and tolerances are unchanged;
- retained moments are never distributed into vertical reactions;
- off-route/ambiguous/invalid CoG remains fail-closed;
- unresolved/invalid explicit moment evidence remains fail-closed;
- no source-axis vector mechanics or Common Input effective-value resolver authority is broadened;
- GitHub workflow status is not execution evidence for this PR.

## Exact changed-file ledger

1. `agents/PR1494_workreport.md`
2. `agents/claims/PR1494.yaml`
3. `agents/status/PR1494.yaml`
4. `scripts/current-common-input-empirical-run-runtime-check.mjs`
5. `scripts/current-common-input-explicit-moment-retention-check.mjs`
6. `scripts/run-non-fea-checks.mjs`
7. `src/workspace/engineering-loads/current-common-input-empirical-run-runtime.js`
8. `src/workspace/engineering-loads/current-common-input-explicit-moment-retention.js`
9. `src/workspace/engineering-loads/empirical-gravity-method-selection.js`
10. `src/workspace/load-calc-current-system-view.js`

No other file belongs in the PR.

## Inputs / benchmark / common authority context

Takeover inputs:

- Issue `#1321`;
- `src/workspace/engineering-loads/empirical-component-load-authority.js`;
- `src/workspace/engineering-loads/empirical-component-moment-demand.js`;
- protected `src/workspace/engineering-loads/support-load-distribution-v3.js`;
- `src/workspace/engineering-loads/current-common-input-empirical-support-load-execution.js`;
- repository `AGENTS.md`.

Focused benchmarks/falsifiers:

- `scripts/current-common-input-explicit-moment-retention-check.mjs`;
- `scripts/current-common-input-empirical-run-runtime-check.mjs`;
- `scripts/empirical-gravity-method-selection-check.mjs`;
- aggregate `scripts/run-non-fea-checks.mjs`.

## Validation truth

Source/diff inspection: **COMPLETE**.

Executable qualification: **NOT_RUN**.

Faithful checkout attempt:

```text
git clone --depth 1 --branch agent/issue-1321-explicit-component-moment-retention https://github.com/reallaksh19/Advanced_Analysis.git /tmp/Advanced_Analysis_PR1494
```

Failed before checkout:

```text
fatal: unable to access 'https://github.com/reallaksh19/Advanced_Analysis.git/': Could not resolve host: github.com
```

Therefore no Node script, import check, build or `git diff --check` is represented as executed. GitHub workflow results are not substituted for these checks.

Required executable sequence when a faithful checkout is available:

```text
node scripts/current-common-input-explicit-moment-retention-check.mjs
node scripts/current-common-input-empirical-run-runtime-check.mjs
node scripts/empirical-gravity-method-selection-check.mjs
node scripts/run-non-fea-checks.mjs
npm run check:imports
node scripts/advanced-shell-contract-check.mjs
npm run build
git diff --check
```

Unavailable checks remain `NOT_RUN`.

## Appendix A — five-question implementation takeover gate

Incoming agent must answer these from the live repository before extending or merging:

1. What are the exact current `main` SHA, PR head SHA, ahead/behind counts and ten changed paths? Identify any path outside the ledger.
2. Trace `auditEmpiricalComponentLoadAuthority()` → retention receipt → method selection. Which semantic hash prevents a stale/foreign retention receipt from authorizing V2?
3. Which exact fields prove the source moment remains separate support/civil demand and is not distributed into vertical reactions? Which protected statics file must remain unchanged?
4. What happens for AUTO, explicit V2 and explicit V3 with a retained source moment, and why do off-route/ambiguous/invalid CoG or unresolved moment location still fail closed?
5. Which executable checks are required before qualification, how must unavailable checks be reported, and why cannot GitHub workflow status substitute for them here?

All five answers must cite exact live functions/files/SHAs; generic answers are insufficient.
