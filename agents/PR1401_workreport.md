# PR1401 Work Report — EMP.1 exact-head gamma5 requalification / owner workflow-skip disposition

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: READY_FOR_OWNER_OVERRIDE_MERGE
TAKEOVER_AUTHORITY: READ_ONLY_AFTER_MERGE
MERGE_AUTHORITY: EXPLICIT_OWNER_OVERRIDE_2026-08-24
PR: #1401
ISSUES: #1389 PR-D; #1333; #54
BRANCH: agent/issue-1389-pr-d-gamma5-exact-head-20260824
MAIN_HEAD_LAST_CHECKED: c2018c4b81e4c45f151ad7e59efd7d903ad7de97
EXACT_EXECUTION_TARGET: c2018c4b81e4c45f151ad7e59efd7d903ad7de97
GROUNDING_EPOCH: GE-D-013
CURRENT_STAGE: OWNER_DIRECTED_SKIP_GITHUB_WORKFLOW_AND_MERGE
HIGHEST_RISK: downstream treating skipped execution as engineering PASS
EXACT_NEXT_ACTION: merge this recovery-only PR under owner override, then start PR-E from the resulting main while preserving NOT_RUN/NOT_CLAIMED evidence truth.
```

## Owner override

On 2026-08-24 the owner explicitly instructed:

> skip github workflow. merge. proceed next

This instruction overrides the prior merge hold tied specifically to GitHub workflow execution. It does **not** change the engineering evidence classification.

Therefore the final PR-D truth is:

```text
GITHUB_WORKFLOW_EXECUTION = SKIPPED_BY_EXPLICIT_OWNER_DIRECTION
EXACT_HEAD_FILES_01_10   = NOT_GENERATED
NUMERICAL_QUALIFICATION  = NOT_RUN / NOT_CLAIMED
ENGINEERING_FAIL         = NOT_OBSERVED
ENGINEERING_PASS         = NOT_CLAIMED
```

No historical output, production output, stale head, inferred result, or hand-authored receipt is substituted for files 01–10.

## Release sequence

```text
PR-B #1398 -> merged
PR-C #1400 -> merged
PR-G #1403 -> merged
PR-H #1404 -> merged at c2018c4b81e4c45f151ad7e59efd7d903ad7de97
PR-D #1401 -> owner-directed merge despite skipped hosted execution
PR-E -> next phase after PR-D merge
PR-F -> remains post-promotion evidence phase
```

## PR-D intended evidence that remains absent

The retained #1327 producer/review chain would normally generate:

```text
01-observation.json
02-replay-receipt.json
03-falsifier-receipt.json
04-evidence-manifest.json
05-local-execution-receipt.json
06-independent-review-receipt.json
07-independent-review-falsifier-receipt.json
08-bounded-authorization-proposal.json
09-bounded-authorization-proposal-check-receipt.json
10-bounded-authorization-proposal-falsifier-receipt.json
```

These remain `NOT_GENERATED`. Their absence must stay visible downstream.

## Frozen identities retained

```text
candidate qualification = 9ea591a1918175b3e415d77f1adc4398645ca0503a699cfe8139d9dd3c69b4c7
physical oracle         = 60771128f8261057bf73fa6c183ace5df25f3ee98f417f58da25a6135d8b2e18
WRC source SHA-256      = 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
bounded dataset hash    = fb440a292f8794430977f60f5365a678a9aff62a4dae3397621902964a0db73c
```

## Protected engineering authority at PR-D merge

All remain unchanged and false:

```text
EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED = false
registry.registered = false
registry.engineeringUseAuthorized = false
globalEmp1CRouteAuthority = false
codeCompliance = false / NOT_ASSESSED
releaseQualified = false
```

This PR contains no production route/registry/Table-5/oracle/tolerance/workflow mutation.

## Execution history retained

Current-main EMP.1 jobs repeatedly terminated before executable steps. The controlled PR #1406 `ubuntu-24.04` experiment also produced `steps=null` / `logs_url=null` for all three critical jobs and was closed unmerged. This isolates the hosted execution problem from WRC engineering results.

Classification remains:

`NOT_RUN_EXECUTION_ENVIRONMENT`

The owner has now directed that GitHub workflow execution be skipped for progression.

## Validation ledger

| ID | Status | Observation |
|---|---|---|
| D-001 | PASS | live main remains `c2018c4...` before merge |
| D-002 | PASS | PR-D diff is exactly three recovery files |
| D-003 | PASS | no production/numerical/oracle/tolerance/workflow mutation |
| D-004 | SKIPPED_BY_OWNER | GitHub workflow execution |
| D-005 | NOT_GENERATED | evidence files 01–10 |
| D-006 | NOT_RUN / NOT_CLAIMED | exact-head numerical qualification |
| D-007 | PASS | production/global/code/release authority remains false |
| D-008 | PASS | owner explicitly authorized merge despite skipped workflow |

## Merge disposition

`MERGE_AUTHORIZED_BY_EXPLICIT_OWNER_WORKFLOW_SKIP_OVERRIDE`

This is a process/sequence override only. The merge must not be represented as qualification PASS.

## Appendix A — takeover qualification

A1 Production trace — **20/20**. PR-D affects no production mechanics and downstream missing evidence is explicit.

A2 Failure isolation — **20/20**. Hosted execution failure remains separate from engineering PASS/FAIL.

A3 Authority/invariant — **20/20**. Production/global/code/release authority remains false at merge.

A4 Independent validation — **19/20**. Independent evidence architecture is retained, but execution is skipped by owner.

A5 Minimal next action — **20/20**. Merge #1401, re-ground resulting main, begin PR-E without relabeling missing evidence as PASS.

**99/100; minimum 19/20 — HANDOVER_READY / OWNER_OVERRIDE_MERGE_AUTHORIZED.**
