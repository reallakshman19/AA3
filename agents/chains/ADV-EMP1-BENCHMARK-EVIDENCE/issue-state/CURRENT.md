# Current Issue State — ADV-EMP1-BENCHMARK-EVIDENCE

ISSUE_CURRENT_STATE_BASIS: IB-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-0001
UPDATED_AT: 2026-09-03
ISSUE_HANDOVER_SYNC_STATUS: IN_SYNC
ISSUE_CHAIN_ROOT_COMMENT_ID: 5519249637
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5519251225
ISSUE_LATEST_ENDPOINT_COMMENT_ID: 5519252661
PR: 1636
BRANCH: agent/emp1-benchmark-evidence-v1
PREWORK_HEAD: 1edf91a4e29cb660d3effbf4b0228fb971d936e3
MAIN: ad72465b4359fc660dd68e7cb04a1e091c2fe3b9

## Original task / acceptance ledger

- TASK-001 | Dedicated CAUx Benchmark Evidence surface. | OPEN
- TASK-002 | PV Elite comparison programme with pre-observation source/value/tolerance freeze. | OPEN
- TASK-003 | Review & Evidence UI integration. | BLOCKED_DEPENDENCY_PR_1622_PR_1624
- TASK-004 | EMP-only scope; no non-EMP collateral changes. | ACTIVE_GUARD
- TASK-005 | Benchmark comparison cannot create method/engineering/code/release/deployment authority. | ACTIVE_GUARD
- TASK-006 | First implementation leg: core/read-model + focused checker only. | READY_AFTER_PROTOCOL_PROGRESS_COMMAND
- TASK-007 | Common basis pinned to `293a3db7993a6945c01adc592a7ff14a339c504a`. | COMPLETE

## Input ledger

- INPUT-001 | main `ad72465b4359fc660dd68e7cb04a1e091c2fe3b9`. | AVAILABLE
- INPUT-002 | CAUx frozen benchmark hash `741bfbc21496c2f126dbbeec18b2f88d4424e90a94b1d2cc7444776a16dfb7fe`. | AVAILABLE
- INPUT-003 | CAUx independent handcalc hash `e7e4e7d21188e4b6c1f53c2d7b89a73036a52ccccc61a65fd69c24f6a13ae227`. | AVAILABLE
- INPUT-004 | CAUx qualification hash `27e5f468c409071270ceea3a388ee2f33b77f3ea71b02f4cc5b7646c8eca14ef`. | AVAILABLE
- INPUT-005 | Existing CAUx interpolated comparison checker. | AVAILABLE
- INPUT-006 | Current bounded route registry. | AVAILABLE
- INPUT-007 | Exact PV Elite report/input/version. | MISSING

## Benchmark / oracle ledger

- BM-001 | CAUx expected-value freeze. | READY
- BM-002 | CAUx direct PDF page re-observation. | NOT_RUN
- BM-003 | Prior merged CAUx interpolated 8-point comparison. | RETAINED_PRIOR_EVIDENCE_NOT_REEXECUTED_THIS_LEG
- BM-004 | PV Elite comparator. | NOT_RUN_SOURCE_MISSING

## Roadmap ledger

- RM-001 | issue #1261 | ISSUE_EXECUTION_PLAN | ALIGNED
- RM-002 | issue #1389 | ISSUE_EXECUTION_PLAN | ALIGNED
- RM-003 | docs/OWNER_ROADMAP.md | OWNER_ROADMAP | REVIEWED_NOT_APPLICABLE_TO_THIS_EMP_BENCHMARK_SLICE

## Current overlap

- PR #1622 directly changes `src/workspace/lafea-workbench-controller.js`, `src/workspace/lafea-analytical-calc-content.js`, and `src/workspace/emp1-professional-workflow-view.js`.
- PR #1624 directly changes `src/workspace/emp1-engineering-review-view.js` and `src/workspace/emp1-engineering-review-workspace.js`.
- PR #1618 changes `src/core/emp1/index.js`; first leg will not touch the index export seam.
- Safe first material paths are new EMP-only core/checker files with no current exact-file overlap.

## Current authority / blocker

ENGINEERING_STATE: READY_FOR_BOUNDED_CORE_LEG
CUSTODY_STATE: HELD
QUALIFICATION_STATE: NOT_REQUIRED_FOR_ORIGINATING_CUSTODIAN; TAKEOVER_PACK_PREPARED
WRITE_AUTHORITY: READ_ONLY_UNTIL_EXACT_OWNER_PROGRESSION_COMMAND
AUTO_STATE: NOT_APPLICABLE
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
CHAIN_HANDOVER_READY: TRUE
TAKEOVER_QUALIFICATION_READY: TRUE
HANDOVER_VALIDATION_STATUS: NOT_RUN
HANDOVER_READY: FALSE_VALIDATION_NOT_RUN

CURRENT_BLOCKER: Pinned Common protocol recognizes only `proceed next`, `proceed next, no Qs`, or `proceed next, hand over ready` for material progression. Current Owner instruction authorizes task/scope but did not use one of those progression commands.
EXACT_NEXT_ACTION: After an exact Owner progression command, implement Leg 1 only: `src/core/emp1/emp1-benchmark-evidence-projection.js` plus `scripts/emp1-benchmark-evidence-projection-check.mjs`; preserve all protected authority and expected-value files.
