# Current state — BM-UQ #1673

ISSUE_CURRENT_STATE_BASIS: IB-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-0009
WORK_ITEM_KEY: github:reallaksh19/Advanced_Analysis#1673
CHAIN_ID: LAFEA-UQ-1673
UPDATED_AT: 2026-09-06
COMMON_PROTOCOL_BASIS: 3e21f0054ab8d80b7fe045e7c105a81643fcbbf7
ISSUE_CHAIN_ROOT_COMMENT_ID: 5552224606
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5552225960
ISSUE_LATEST_ENDPOINT_COMMENT_ID: PENDING_EP_0009_PUBLICATION
ISSUE_HANDOVER_SYNC_STATUS: OUT_OF_SYNC_PENDING_EP_0009_PUBLICATION

## Acceptance ledger

U0 | Context/QoI/limit-state freeze | PASS
U1 | Source-backed production uncertainty models/correlations | BLOCKED_ENGINEERING_POPULATION_APPLICABILITY
REFERENCE-UQ-DEFINITION | Isolated inverse-E analytical reference context | PASS
REFERENCE-UQ-SAMPLER | Seeded reference propagation implementation | IMPLEMENTED_EXECUTION_NOT_RUN
U2 | Global sensitivity | NOT_STARTED_PRODUCTION
U3 | Validation with uncertainty | NOT_STARTED
U4 | Uncertainty propagation | NOT_STARTED_PRODUCTION; REFERENCE_IMPLEMENTED_EXECUTION_NOT_RUN
U5 | Reliability/Pf/beta | NOT_STARTED_TARGET_AUTHORITY_UNSET
U6 | Calibration/model discrepancy | NOT_STARTED
U7 | Code/design-basis qualification | NOT_STARTED
U8 | Separate release qualification | NOT_STARTED

## Retained executable evidence

U0_TESTED_HEAD: 613e2941f2a8de79bfcb566a0044489e25d326ea
NODE_U0_CHECKER: PASS

U1_SOURCE_AUTHORITY_TESTED_HEAD: a3a42e9ccb0067b05bcff9e8ff5781ee4bcb8cd6
NODE_U1_SOURCE_AUTHORITY_CHECKER: PASS
U1_ACTIVE_NUMERIC_STOCHASTIC_SOURCE_COUNT: 0

U1_CANDIDATE_SOURCE_TESTED_HEAD: dcabe845c3757dbd81c80d9ba354ca5848a872ad
NODE_U1_CANDIDATE_SOURCE_CHECKER: PASS
CANDIDATE_REFERENCE_PRIOR_COUNT: 1
CANDIDATE_SOURCE_AUTHORITY: REFERENCE_PRIOR_ONLY
CANDIDATE_APPLICABILITY_TO_PRODUCTION_B02A: BLOCKED_MATERIAL_IDENTITY_UNSPECIFIED

REFERENCE_INVERSE_E_TESTED_HEAD: 94ae9f5c96071747623cb60eb16efd3b517a0dba
NODE_REFERENCE_INVERSE_E_CHECKER: PASS
REFERENCE_VALIDATION_EVIDENCE_PR: 1682
REFERENCE_CONTEXT_ID: UQ-REF-E-INVERSE-01
REFERENCE_STATISTICAL_EXECUTION_AUTHORIZED: TRUE_REFERENCE_ONLY
PRODUCTION_STATISTICAL_EXECUTION_AUTHORIZED: FALSE

## LEG-005 reference sampler

MATERIAL_BASE: 8a61928ce4130aee96dd43153884102b3cfcd639
MATERIAL_HEAD: a66e1d7ba5db9a4641d71776bcb5f44f28042ace
DIFF_SCOPE_INSPECTION: PASS
NODE_REFERENCE_SAMPLER_CHECKER: NOT_RUN
REFERENCE_SAMPLER_EXECUTION_AUTHORIZED: TRUE_REFERENCE_ONLY
ACTIVE_PRODUCTION_NUMERIC_STOCHASTIC_SOURCE_COUNT: 0

Frozen sampler plan:
- xorshift32 seed 1673005;
- Box-Muller cosine/sine normal transform;
- nested sample counts 4096, 16384, 65536, 262144;
- sample SD uses N-1;
- Type-7 empirical quantiles;
- final mean/SD/P05/P50/P95 must each lie within 5 analytical sampling standard errors of the frozen oracle;
- same-seed replay must match exactly;
- different seed must change the retained summary;
- monotonic raw-error decrease is not required.

The sampler is reference-only. Production `uncertainty-models.json` and `correlation-models.json` remain blocked/unactivated.

## Current authority

MAIN_BASIS: f8d051c989c8a0627db7560f996baf72987775d4
BRANCH: chatgpt/issue-1673-bm-uq-u0
PR: 1674
PR_STATUS: OPEN_DRAFT
ENGINEERING_STATE: BLOCKED_EXECUTION_NOT_RUN
CUSTODY_STATE: HELD
QUALIFICATION_STATE: NOT_REQUIRED
WRITE_AUTHORITY: READ_ONLY
AUTO_STATE: BLOCKED
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
QUALIFICATION_SCOPE_ID: QSCOPE-1673-LAFEA-UQ-REFERENCE-SAMPLER-PROPAGATION
QUESTION_SET_ID: QS-BM-UQ-1673-0005
QUESTION_SET_STATUS: CURRENT
QUESTION_PACK_ACTION: REFRESHED
QUESTION_DISPLAY: SHOW

## Preserved boundaries

- production active stochastic source count remains 0;
- production correlations remain UNKNOWN_NOT_ZERO where unsourced;
- B02 remains active/READY; B03-B06 remain queued;
- releaseAuthorityGrantedByProgram remains false;
- temperatureAuthorityGrantedByProgram remains false;
- no production-mesh statistical claim may bypass #1652;
- governing reliability standard, consequence class, Pf/beta targets and code allowables remain unselected;
- no solver/mesh/recovery/oracle/tolerance/program authority changed;
- production U2 sensitivity execution is not authorized.

PRODUCTION_BLOCKER: ENGINEERING_POPULATION_APPLICABILITY_REQUIRED
REFERENCE_BLOCKER: EXACT_HEAD_REFERENCE_SAMPLER_CHECK_NOT_RUN
REFERENCE_NEXT_BOUNDARY_ON_PASS: ADD_CORRELATED_GAUSSIAN_REFERENCE_CASE_AND_COVARIANCE_FAIL_CLOSED_NEGATIVES
EXACT_NEXT_ACTION: run `node scripts/lafea-uq-reference-sampler-check.mjs` on the final PR head. Further material progression requires fresh Owner authority.
