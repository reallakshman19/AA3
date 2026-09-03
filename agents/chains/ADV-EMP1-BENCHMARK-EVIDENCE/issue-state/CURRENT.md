# Current Issue State — ADV-EMP1-BENCHMARK-EVIDENCE

ISSUE_CURRENT_STATE_BASIS: IB-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-0005
UPDATED_AT: 2026-09-03
ISSUE_HANDOVER_SYNC_STATUS: IN_SYNC
ISSUE_CHAIN_ROOT_COMMENT_ID: 5519249637
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5519251225
ISSUE_LATEST_ENDPOINT_COMMENT_ID: 5520100659
PREDECESSOR_PR: 1636
PREDECESSOR_MERGE: 1aab8842759e63fe94f80438630647c166866034
PR: 1638
BRANCH: agent/emp1-benchmark-comparison-custody-v1
PREWORK_HEAD: 160fb733a5ccd42f1a8db6b8efa991657e07c468
MAIN: 1aab8842759e63fe94f80438630647c166866034

## Acceptance ledger

- TASK-001 | Dedicated CAUx Benchmark Evidence surface. | CORE_PROJECTION_MERGED_UI_BLOCKED
- TASK-002 | PV Elite comparison programme with pre-observation source/value/tolerance freeze. | BLOCKED_PV_ELITE_SOURCE_MISSING
- TASK-003 | Review & Evidence UI integration. | BLOCKED_DEPENDENCY_PR_1622_PR_1624
- TASK-004 | EMP-only scope. | ACTIVE_GUARD
- TASK-005 | Benchmark evidence cannot create method/engineering/code/release authority. | ACTIVE_GUARD
- TASK-006 | Core/read-model projection. | MERGED_PR_1636
- TASK-007 | Stage-2 comparison custody. | ADMISSION_CONTRACT_IN_PROGRESS; ACTUAL_RESULT_FREEZE_NOT_RUN

## Inputs

- current main `1aab8842759e63fe94f80438630647c166866034` | AVAILABLE
- merged `emp1-benchmark-evidence/v1` projection | AVAILABLE
- CAUx frozen benchmark/qualification | AVAILABLE_UNCHANGED
- existing CAUx interpolated comparison checker | AVAILABLE_NOT_REEXECUTED
- exact PV Elite report/input/version | MISSING

## Benchmark / oracle truth

- CAUx expected-value freeze | READY_UNCHANGED
- CAUx direct PDF re-observation | NOT_RUN
- prior CAUx interpolated comparison | RETAINED_PRIOR_EVIDENCE_NOT_REEXECUTED_THIS_CHAIN
- structured CAUx production-comparison record | ABSENT
- derived CAUx result freeze | BLOCKED_UNTIL_FAITHFUL_EXECUTION
- PV Elite comparator | NOT_RUN_SOURCE_MISSING

## EP-0005 material scope

New files only:
- `src/core/emp1/emp1-benchmark-comparison-custody.js`
- `scripts/emp1-benchmark-comparison-custody-check.mjs`

The contract may retain only a completed benchmark projection backed by explicit actual-execution provenance and a matching route-authority snapshot. It must reject inferred/approximate/manual-summary evidence and must not execute WRC, select tolerance, mutate expected values, or create authority.

## Overlap

- #1622 OPEN/DRAFT on EMP controller/analytical/professional-workflow UI seams.
- #1624 OPEN/DRAFT on engineering-review view/workspace seams.
- #1618 OPEN/DRAFT on `src/core/emp1/index.js`.
- PR #1638 avoids those exact paths.

## Current authority

ENGINEERING_STATE: READY_FOR_BOUNDED_COMPARISON_CUSTODY_LEG
CUSTODY_STATE: HELD
QUALIFICATION_STATE: NOT_REQUIRED_FOR_ORIGINATING_CUSTODIAN; TAKEOVER_PACK_CURRENT
WRITE_AUTHORITY: WRITE_ALLOWED_FOR_EP0005_BOUNDED_SCOPE
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
HANDOVER_VALIDATION_STATUS: NOT_RUN
HANDOVER_READY: FALSE

CURRENT_BLOCKER: none for the admission-contract implementation. A real CAUx result still requires faithful execution; PV Elite remains source-blocked; UI remains concurrency-blocked.
EXACT_NEXT_ACTION: implement only the two new EMP comparison-custody files, then create LEG-002 and a successor endpoint with truthful validation.
