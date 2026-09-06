# Current Issue State — ADV-EMP1-HUMAN-UI-1651

ISSUE_CURRENT_STATE_BASIS: IB-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-0022
UPDATED_AT: 2026-09-06
ISSUE_HANDOVER_SYNC_STATUS: IN_SYNC
ISSUE_CHAIN_ROOT_COMMENT_ID: 5549975772
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5549975074
ISSUE_LATEST_ENDPOINT_COMMENT_ID: 5558586739
WORK_ITEM_KEY: github:reallaksh19/Advanced_Analysis#1651
PARENT_ISSUE: 1651
RECOVERY_CHILD_ISSUE: 1664
RECOVERY_CHILD_TITLE: EMP.1 recovery: replace residual waterfall with split-console UI
RECOVERY_CHILD_CHECKPOINT_COMMENT_ID: 5558587650

MERGED_IMPLEMENTATION_PR: 1675
PR_1675_STATUS: MERGED_BY_OWNER_COMMAND
PR_1675_HEAD_AT_MERGE: 661b2b0c0eacb3243e037e5356b6f2188596a3d6
PR_1675_MERGE_COMMIT: 11f655e71a81b0d7ebef42e99792482b434e60db
MAIN_HEAD_OBSERVED_POST_MERGE: 11f655e71a81b0d7ebef42e99792482b434e60db
POST_MERGE_RECONCILIATION_BRANCH: agent/emp1-1651-postmerge-reconciliation-0020
POST_MERGE_RECONCILIATION_PR: 1690
POST_MERGE_RECONCILIATION_PR_STATUS: OPEN_DRAFT_OWNER_ONLY_NOT_AUTHORIZED
SUPPORTING_VALIDATION_PR: 1681
SUPPORTING_VALIDATION_PR_STATUS: CLOSED_UNMERGED_STALE_INVALID_STATE_EVIDENCE
NONCANONICAL_HANDOVER_PR: 1684
NONCANONICAL_HANDOVER_PR_STATUS: CLOSED_UNMERGED
ACTIVE_ENDPOINT: EP-0022
LAST_COMPLETED_MATERIAL_LEG: LEG-010
MATERIAL_HEAD: dc2df7a8a8b26feea26d29dbf0741794f788cfac
MATERIAL_RECEIPT: agents/chains/ADV-EMP1-HUMAN-UI-1651/material-legs/LEG-010.md
CURRENT_MATERIAL_LEG: NONE

## Acceptance ledger

- TASK-001 | Live-DOM raw-machine-token regression gate. | SOURCE MERGED. Full live acceptance remains pending because the complete qualification sample cannot currently establish the required prepared state.
- TASK-002 | Shared identity × value-column renderer; Pressure 5 × 2. | SOURCE MERGED. Post-merge static acceptance reports 5 identities × Internal/External = 10 governed cells PASS; correctly prepared live confirmation remains pending.
- TASK-003 | Replace append-only waterfall with split-console/equivalent architecture. | LEG-010 MERGED. Human-factor re-observation is blocked before structured audit by the complete-sample orchestration failure.
- TASK-004 | CAUx staged integration/hardening. | SOURCE MERGED. Valid post-merge CAUx Enter/Space and evidence-panel observation remain NOT_RUN because the prerequisite sample fails.
- TASK-005 | Preserve numerical/source/tolerance/sign/axis/route/code/release authority. | PRESERVED. The newly confirmed defect is orchestration-only; no engineering authority mutation is implied.

## EP-0022 valid prerequisite failure

Target:

```text
11f655e71a81b0d7ebef42e99792482b434e60db
```

The tester navigated through the rendered UI to EMPIRICAL -> EMP.1, visually confirmed EMP.1 active, and clicked exactly:

```text
[SIMULATED] Load complete EMP.1 qualification sample
```

The application reported:

```text
The last EMP.1 transaction did not complete
Step A must produce a current qualified result before step C can run.
EMP1_A_CURRENT_QUALIFIED_RESULT_REQUIRED
```

The resulting UI showed EMP.1.A `EMPTY`, no validated stage source document, custody `Not retained`, Overall `Input required`, Method `Local method blocked`, Result `Local result not calculated`, Release `Release profile not qualified`. The tester correctly stopped before desktop/narrow audits. This is admissible product evidence.

## Source diagnosis

At integrated main, the complete-sample button dispatches `LafeaWorkbenchController.loadEmp1QualificationSample()`.

That method currently:

1. creates the qualification sample;
2. imports `sample.aDocument` into LAFEA.1;
3. imports `sample.bDocument` into LAFEA.2;
4. applies `sample.runInput`;
5. selects LAFEA.2;
6. immediately calls `runEmp1Product()`.

It does not execute/retain LAFEA.1 through the store/controller path first.

`createEmp1WorkbenchQualificationSample()` does execute LAFEA.1 internally to create admissible B source evidence, but deliberately returns only A/B source documents plus typed C binding. The internal A execution is not returned/injected, preserving the no-privileged-evidence contract. Therefore the controller must establish current A execution itself before the governed transaction.

The exact defect is already described in `EMP_TAB_UI_RECOMMENDATIONS.md` §4.1: from a clean tab the complete sample loads A/B, then attempts C without first running A and fails with `EMP1_A_CURRENT_QUALIFIED_RESULT_REQUIRED`. The recommendation explicitly calls for running/accepting A before C.

DEFECT_CLASSIFICATION: `QUALIFICATION_SAMPLE_ORCHESTRATION_SEQUENCE_DEFECT`

## Expected repair boundary

A future bounded material leg should:

- execute LAFEA.1 through the normal controller/store path after importing the sample A document;
- require current qualified/accepted A execution before advancing;
- establish/refresh B from the governed current-A seam without injecting the sample factory's internal execution;
- apply C run input only after A/B currentness is valid;
- then execute the governed EMP.1 transaction;
- retain exact fail-closed behavior when A is missing/stale/unqualified;
- add a browser or controller falsifier proving one-click clean-tab sample preparation works;
- add negative falsifiers proving stale/missing A still blocks;
- preserve WRC/Pressure/benchmark/route/code/release authority unchanged.

## Validation truth

- implementation #1675: MERGED;
- three static post-merge Node checks: PASS;
- clean rendered-UI complete-sample prerequisite: FAIL with `EMP1_A_CURRENT_QUALIFIED_RESULT_REQUIRED`;
- correctly sample-loaded desktop structured audit: NOT_RUN;
- correctly sample-loaded narrow structured audit: NOT_RUN;
- valid post-merge CAUx Enter/Space: NOT_RUN;
- valid passing screenshot set: NOT_RUN;
- focused Playwright in custodian environment: BLOCKED_ENVIRONMENT / NOT_RUN;
- zero status contexts/workflow runs are not PASS.

## Benchmark / authority ledger

- CAUx retained comparison remains 8/8 within frozen 3%; Cu worst relative 2.0355862430856293%; Du worst absolute 26.786740343133943 kPa; governing Du/Du agreement; `engineeringUseAuthorized=false`.
- PV Elite remains `REFERENCE_NOT_AVAILABLE` / `SOURCE_NOT_RETAINED`, zero rows, no invented expected values/version/tolerance.
- WRC equations/tables/curves/applicability, source polarity/axis authority, Pressure mechanics/source refs, route/code/release authority remain unchanged.

## Roadmap / qualification / authority

ROADMAP: `EMP_TAB_UI_RECOMMENDATIONS.md@d616a4ea014d583c9709a872c3af3896dea9011e`
ROADMAP_ALIGNMENT: STALE_STATUS_BUT_SCOPE_ALIGNED_AND_CONFIRMS_SECTION_4_1_SEQUENCE_DEFECT
ROADMAP_MUTATION_AUTHORITY: NONE
COMMON_PROTOCOL: engineering-pr-delivery-v2
COMMON_PROTOCOL_BASIS: 3e21f0054ab8d80b7fe045e7c105a81643fcbbf7
COMMON_PROTOCOL_STATUS: CURRENT
OWNER_PROGRESSION_COMMAND: NONE
OWNER_CUSTODY_INSTRUCTION: CURRENT_CUSTODIAN_CONTINUES_NO_TAKEOVER
OWNER_MERGE_COMMAND: MERGE_PR_1675_CONSUMED
QUALIFICATION_SCOPE_ID: QSCOPE-1651-EMP-TASK-SHELL-RECOVERY
QUESTION_SET_ID: QS-ADV-EMP1-HUMAN-UI-1651-0006
QUESTION_SET_STATUS: CURRENT
QUESTION_PACK_ACTION: REUSED
QUESTION_DISPLAY: HIDE
TAKEOVER_QUALIFICATION_READY: TRUE
ENGINEERING_STATE: LEG_010_MERGED_QUALIFICATION_SAMPLE_ORCHESTRATION_DEFECT_CONFIRMED
CUSTODY_STATE: HELD
QUALIFICATION_STATE: NOT_REQUIRED
WRITE_AUTHORITY: READ_ONLY_PENDING_OWNER_PROGRESSION
AUTO_STATE: NOT_APPLICABLE
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
MERGE_AUTHORIZATION_DISPOSITION: PR_1675_AUTHORIZATION_CONSUMED; NO_AUTHORIZATION_FOR_PR_1690_OR_VALIDATION_ARTIFACTS
HANDOVER_CONTENT_READY: TRUE
HANDOVER_VALIDATION_STATUS: FAIL
CHAIN_HANDOVER_READY: TRUE
HANDOVER_READY: FALSE

CURRENT_BLOCKER: a concrete source defect is confirmed, but this turn supplied evidence rather than a recognized Owner progression command. PR #1690 remains control-plane-only and not merge-authorized.

EXACT_NEXT_ACTION: await fresh Owner `proceed next`; then open one bounded material leg to repair the complete-sample A -> B -> governed-C sequencing through the normal controller/store execution path, align positive/negative falsifiers and manual validation, freeze material, record receipt/endpoint, synchronize Issues, then stop for external post-fix re-observation.
