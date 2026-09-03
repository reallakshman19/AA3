# Current Issue State — ADV-EMP1-BENCHMARK-EVIDENCE

ISSUE_CURRENT_STATE_BASIS: IB-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-0008
UPDATED_AT: 2026-09-03
ISSUE_HANDOVER_SYNC_STATUS: PENDING_EP0008_SYNC
ISSUE_CHAIN_ROOT_COMMENT_ID: 5519249637
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5519251225
ISSUE_LATEST_ENDPOINT_COMMENT_ID: PENDING_EP0008_SYNC
PREDECESSOR_PR: 1638
PREDECESSOR_MERGE: fe57071e69b056c65ad866548056b8a097416081
PR: PENDING_SUCCESSOR_PR
BRANCH: agent/emp1-pvelite-benchmark-programme-v1
MAIN: fe57071e69b056c65ad866548056b8a097416081

## Acceptance ledger

- TASK-001 | Dedicated CAUx Benchmark Evidence surface. | CORE_PROJECTION_MERGED_UI_BLOCKED
- TASK-002 | PV Elite comparison programme with pre-observation source/value/tolerance freeze. | PROGRAMME_CONTRACT_IN_PROGRESS_SOURCE_STILL_MISSING
- TASK-003 | Review & Evidence UI integration. | BLOCKED_DEPENDENCY_PR_1622_PR_1624
- TASK-004 | EMP-only scope. | SATISFIED_THROUGH_LEG_003
- TASK-005 | Benchmark evidence cannot create method/engineering/code/release authority. | SATISFIED_MERGED_BOUNDARIES
- TASK-006 | Core/read-model projection. | MERGED_PR_1636
- TASK-007 | Comparison custody admission contract. | MERGED_PR_1638
- TASK-008 | Actual retained CAUx production-comparison record. | BLOCKED_UNTIL_ADMISSIBLE_FAITHFUL_EXECUTION
- TASK-009 | PV Elite source-free comparison programme contract. | AUTHORIZED_NEXT_LEG

## Inputs / oracle truth

- current main `fe57071e69b056c65ad866548056b8a097416081` | AVAILABLE
- merged benchmark evidence projection | AVAILABLE
- merged comparison custody contract | AVAILABLE
- CAUx frozen benchmark/qualification | AVAILABLE_UNCHANGED
- existing CAUx interpolated comparison checker | AVAILABLE_NOT_REEXECUTED
- structured CAUx numeric custody record | NOT_CREATED
- exact PV Elite report/input/version | MISSING
- PV Elite repository evidence search | ONLY_REFERENCE_NOT_AVAILABLE_SOURCE_MISSING_STATE_FOUND

## Post-merge re-ground

- #1618 OPEN/DRAFT; owns `src/core/emp1/index.js`; mergeable false at re-ground.
- #1622 OPEN/DRAFT; owns controller/analytical/professional-workflow UI seams.
- #1624 OPEN/DRAFT; owns engineering-review view/workspace seams.
- no authorization was given to merge those PRs.

## Planned LEG-004

Material scope only:
- `src/core/emp1/emp1-pvelite-benchmark-programme.js`
- `scripts/emp1-pvelite-benchmark-programme-check.mjs`

The programme will encode only pre-observation policy and target-case metadata. It will not retain or invent PV Elite source hashes, expected values, EMP comparison values, or a tolerance value.

Required policy truth includes:
- authority role `INDEPENDENT_COMMERCIAL_SOFTWARE_COMPARISON_NOT_WRC_METHOD_AUTHORITY`;
- exact gamma=5 / Original / cylindrical / zero differential-pressure primary route class;
- Kn=Kb=1 programme condition;
- Au/Al/Bu/Bl/Cu/Cl/Du/Dl target recovery identities;
- required source/version/report/input custody fields;
- expected values and tolerance must be frozen before corresponding EMP observation;
- CAUx 3% tolerance must not be copied by default;
- tolerance state unresolved until defensible from retained PV Elite source/method precision;
- code compliance remains not assessed;
- all method/engineering/production/code/release authority flags false.

## Current validation

New leg not yet materialized. Status: NOT_RUN.

## Current authority

ENGINEERING_STATE: PVELITE_PROGRAMME_PREWORK_READY
CUSTODY_STATE: HELD
QUALIFICATION_STATE: NOT_REQUIRED_FOR_ORIGINATING_CUSTODIAN; TAKEOVER_PACK_CURRENT
WRITE_AUTHORITY: MATERIAL_WRITE_AUTHORIZED_BY_OWNER_PROGRESSION
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
CHAIN_HANDOVER_READY: TRUE
TAKEOVER_QUALIFICATION_READY: TRUE
HANDOVER_VALIDATION_STATUS: NOT_RUN_NEW_LEG
HANDOVER_READY: FALSE

CURRENT_BLOCKER: PV Elite source/numeric comparison remains blocked by missing exact retained source; UI/index integration remains concurrency-blocked. The source-free programme contract itself is not blocked.
EXACT_NEXT_ACTION: open Draft successor PR, sync EP-0008 to issue #1633, then implement only the two planned EMP programme files.
