# Issue Current State — #1535 LAFEA.3 ordinary production route

ISSUE_BASIS_ID: IB-0001
ISSUE_CURRENT_STATE_BASIS: IB-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-0022
WORK_ITEM_KEY: github:reallaksh19/Advanced_Analysis#1535
MAIN_OBSERVED: 0676f6b145dad164869d2979f69b4a4491e8d803
PR: PENDING
BRANCH: engineering/lafea3-1535-visible-convergence-flow
PR_STATUS: PREWORK
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
ISSUE_CHAIN_ROOT_COMMENT_ID: 5466325152
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5466324455
ISSUE_LATEST_ENDPOINT_COMMENT_ID: PENDING_EP0022
ISSUE_HANDOVER_SYNC_STATUS: STALE_PENDING_EP0022_COMMENT

## Acceptance ledger

| ID | Status | Evidence / disposition |
|---|---|---|
| TASK-001 | PARTIAL | Ordinary geometry/domain intake plus governed mesh/preflight/compiler/convergence plumbing are merged; full public-route execution is not yet demonstrated. |
| TASK-002 | PARTIAL | OUTER/HOLE and curved LINE/CIRCULAR_ARC route checks exist; faithful current-head execution remains unresolved. |
| TASK-003 | PARTIAL | T3/T6/Q8 capability guard and documentation anti-drift are merged. |
| TASK-004 | PASS | Historical continuum document is subordinate to live source authority. |
| TASK-005 | PASS | Benchmark source matrix retains independent patch/Kirsch/Lamé source custody. |
| TASK-006 | OPEN | Visible engineer flow is structurally broken around convergence; BM-006 remains NOT_RUN until browser replay. |

## Current UI trace defect

1. `LafeaWorkbenchController` constructs `createLafeaWorkbenchOrchestratorStore()` directly, bypassing the convergence-aware public `createLafeaWorkbenchStore()` wrapper.
2. Guided workflow has RUN -> RESULTS_EVIDENCE with no CONVERGENCE step.
3. Orchestration marks qualified execution BLOCKED when `resultReady` is false, conflating a good solve with a downstream publication prerequisite.
4. The next-action banner says `Analysis result retained` immediately after a qualified solve even when LAFEA.3 Results are blocked pending convergence.

## Benchmark / qualification truth

BM-001: PASS_FOCUSED
BM-002: PASS_FOCUSED
BM-003: NOT_RUN
BM-004: PASS_FOCUSED
BM-005: NOT_RUN_EXECUTION_BLOCKED
BM-006: NOT_RUN
HOSTED_RUNTIME_STATUS: FAIL_PRE_STEP / ENGINEERING_NOT_RUN — current-main Pages job `99205679611` has `steps=[]`, `runner_id=0`.
DIRECT_GIT_RUNTIME_STATUS: NOT_RUN_TRANSPORT / DNS_FAILURE
CORE_FEA_COMPLETION_STATUS: NOT_PROVEN
RELEASE_QUALIFIED: FALSE

## Scope of EP-0022

Repair only visible workflow composition and task-state semantics: use the public convergence-aware store; add an explicit convergence step between Run and Results for LAFEA.3; keep qualified solve distinct from downstream convergence readiness; update next-action wording/state. Add focused source/projection guards. Do not modify FEA numerics or grant BM-006.
