# Current state — BM-UQ-REF-COV #1685

ISSUE_CURRENT_STATE_BASIS: IB-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-0001
WORK_ITEM_KEY: github:reallaksh19/Advanced_Analysis#1685
PARENT_WORK_ITEM: github:reallaksh19/Advanced_Analysis#1673
CHAIN_ID: LAFEA-UQ-REF-COV-1685
UPDATED_AT: 2026-09-06
COMMON_PROTOCOL_BASIS: 3e21f0054ab8d80b7fe045e7c105a81643fcbbf7
ISSUE_CHAIN_ROOT_COMMENT_ID: 5557418057
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5557418871
ISSUE_LATEST_ENDPOINT_COMMENT_ID: PENDING_EP_0001_PUBLICATION
ISSUE_HANDOVER_SYNC_STATUS: OUT_OF_SYNC_PENDING_EP_0001_PUBLICATION

## Parent retained evidence

PARENT_PR_1674_MERGE_SHA: bae94200c1cbe064a7d0735032741e964514ea0d
PARENT_REFERENCE_INVERSE_E: PASS
PARENT_REFERENCE_SAMPLER: PASS
PRODUCTION_STATISTICAL_EXECUTION_AUTHORIZED: FALSE
ACTIVE_PRODUCTION_NUMERIC_STOCHASTIC_SOURCE_COUNT: 0

## LEG-001 evidence

MATERIAL_BASE: 302dea2b6bfa4ceb113a26a6fa78587646be9ba2
MATERIAL_HEAD: 3d27b9037ba5d6bb29da091dec43965c0bb6c8b0
DIFF_SCOPE_INSPECTION: PASS
MATERIAL_FILES: exactly 3 added files; 472 additions; 0 deletions
NODE_REFERENCE_CORRELATED_GAUSSIAN_CHECKER: NOT_RUN

Frozen positive reference:
- input mean `[10,20]`;
- input covariance `[[4,2.4],[2.4,9]]`, rho `0.4`;
- transform `A=[[2,-1],[0.5,1]]`, `d=[5,-2]`;
- output mean `[5,23]`;
- output covariance `[[15.4,-1.4],[-1.4,12.4]]`;
- fixed seed `1685001`, nested N through `262144`;
- final normalized-error maximum `5` using analytical mean/covariance/Fisher-z sampling SE definitions.

Fail-closed suite binds 12 structured code/path cases for invalid covariance/correlation shape, dimensions, symmetry, variance, correlation bounds/diagonal, positive-definiteness, variable identity/order and nonnumeric values.

## Child acceptance ledger

C0 | Freeze correlated-Gaussian context/oracle | IMPLEMENTED
C1 | Correlated deterministic sampler/factorization | IMPLEMENTED
C2 | Positive analytical propagation qualification | IMPLEMENTED_EXECUTION_NOT_RUN
C3 | Covariance/correlation fail-closed negatives | IMPLEMENTED_EXECUTION_NOT_RUN
C4 | Exact-head execution evidence | NOT_RUN
C5 | Parent reconciliation | NOT_STARTED

## Current authority

MAIN_BASIS: bae94200c1cbe064a7d0735032741e964514ea0d
BRANCH: chatgpt/issue-1685-bm-uq-ref-cov
PR: 1686
PR_STATUS: OPEN_DRAFT
ENGINEERING_STATE: BLOCKED_EXECUTION_NOT_RUN
CUSTODY_STATE: HELD
WRITE_AUTHORITY: READ_ONLY
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
QUALIFICATION_SCOPE_ID: QSCOPE-1685-LAFEA-UQ-REFERENCE-CORRELATED-GAUSSIAN
QUESTION_SET_ID: QS-BM-UQ-REF-COV-0001
QUESTION_SET_STATUS: CURRENT

## Preserved boundaries

- production statistical execution false;
- active production numeric stochastic source count 0;
- production correlation remains UNKNOWN_NOT_ZERO where unsourced;
- production UQ registries unchanged;
- no production U2 sensitivity/propagation;
- no Pf/beta target, code allowable, release or temperature authority;
- B02 active; B03-B06 queued unchanged;
- no solver/mesh/recovery/program/oracle-tolerance/roadmap/workflow mutation.

CURRENT_BLOCKER: EXACT_HEAD_REFERENCE_CORRELATED_GAUSSIAN_CHECK_NOT_RUN
EXACT_NEXT_ACTION: publish/synchronize EP-0001, then run `node scripts/lafea-uq-reference-correlated-gaussian-check.mjs` on the final PR head. Further material progression requires fresh Owner authority.
