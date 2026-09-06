# Current Issue State — ADV-EMP1-HUMAN-UI-1651

ISSUE_CURRENT_STATE_BASIS: IB-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-0026
UPDATED_AT: 2026-09-06
ISSUE_HANDOVER_SYNC_STATUS: PENDING_ACTIVE_COMMENT_UPDATE
ISSUE_CHAIN_ROOT_COMMENT_ID: 5549975772
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5549975074
ISSUE_LATEST_ENDPOINT_COMMENT_ID: 5560322436
RECOVERY_CHILD_CHECKPOINT_COMMENT_ID: 5560323411
WORK_ITEM_KEY: github:reallaksh19/Advanced_Analysis#1651
PARENT_ISSUE: 1651
RECOVERY_CHILD_ISSUE: 1664
RECOVERY_CHILD_TITLE: EMP.1 recovery: replace residual waterfall with split-console UI

MERGED_IMPLEMENTATION_PR: 1675
PR_1675_STATUS: MERGED_BY_OWNER_COMMAND
PR_1675_MERGE_COMMIT: 11f655e71a81b0d7ebef42e99792482b434e60db
PREDECESSOR_REPAIR_PR: 1696
PREDECESSOR_REPAIR_PR_STATUS: CLOSED_UNMERGED_FAILED_EXECUTABLE_VALIDATION
CURRENT_REPAIR_PR: 1701
CURRENT_REPAIR_PR_STATUS: OPEN_DRAFT_OWNER_ONLY_NOT_AUTHORIZED
CURRENT_REPAIR_BRANCH: agent/emp1-1651-qualification-sample-leg012
ACTIVE_ENDPOINT: EP-0026
LAST_COMPLETED_MATERIAL_LEG: LEG-013
CURRENT_MATERIAL_LEG: NONE
MATERIAL_HEAD: 7f81c19a236fc6075a26ed3fccfece808406c7a6
MATERIAL_BASE: a66931152fdfa3b516744e49c9e4c0f0b5ce7e28
MATERIAL_MAIN_BASIS: 687b9ff3b8884031e4776f031af7a739f29eb2c8
CURRENT_MAIN_OBSERVED: e8cdc8473ac12d9773f4be598746d13acd3eabc6
MAIN_DRIFT_FROM_MATERIAL_BASIS: AHEAD_32_BEHIND_0
MAIN_DRIFT_SOURCE: LAFEA_UQ_REF_HOLDOUT_1699_AND_LAFEA_UQ_REF_CAL_UNC_1702
MAIN_DRIFT_CLASSIFICATION: UNRELATED_NO_EMP1_OVERLAP
MAIN_DRIFT_AFFECTS_LEG013: FALSE
POST_BASIS_DRIFT: MATERIAL_WITHIN_QUALIFIED_BOUNDARY
MATERIAL_RECEIPT: agents/chains/ADV-EMP1-HUMAN-UI-1651/material-legs/LEG-013.md
VALIDATION_PROTOCOL: agents/chains/ADV-EMP1-HUMAN-UI-1651/validation/MANUAL-EP-0025.md

## Original acceptance ledger

- TASK-001 | Live-DOM raw-machine-token regression gate. | SOURCE RETAINED from merged LEG-010. Final live acceptance remains pending a valid prepared-state browser run.
- TASK-002 | General identity x value-column rendering; Pressure specifically 5 identities x Internal/External = 10 governed cells. | SOURCE RETAINED/MERGED. Exact-head live confirmation remains pending.
- TASK-003 | Anti-waterfall / equivalent application layout. | LEG-010 MERGED. Human-factor desktop/narrow re-observation remains pending after executable browser gates pass.
- TASK-004 | CAUx staged benchmark UI hardening based on retained evidence. | SOURCE RETAINED/MERGED. CAUx physical-keyboard and visual evidence remains pending after executable browser gates pass.
- TASK-005 | Preserve numerical/source/tolerance/sign/axis/route/code/release authority. | PRESERVED through LEG-013 protected-path inspection; LEG-013 changes validation carrier only.

## LEG-011 historical failure

Fixed LEG-011 material `dfc7e0f90fdd15dc1bf8e48b462b612b27bfbf5f` failed real Chromium execution: focused qualification-sample Playwright was 2 failed / 2 total and the complete-sample action surfaced `EMP1_A_CURRENT_QUALIFIED_RESULT_REQUIRED` before A/B/runInput were established. Stage-17 separately stopped at a stale pre-promotion assertion. PR #1696 is closed unmerged.

## LEG-012 repair and external evidence

LEG-012 fixed head `84001f0dbb4612821ba0c18555b5d5ed7b1da9c3` repaired the factory raw-vs-normalized A source identity mismatch and retained the normal controller/store A -> B -> C sequence.

Returned exact-head evidence for LEG-012:

- five required Node gates: PASS;
- focused qualification-sample Playwright: NOT_RUN because Bash continuation syntax was pasted into PowerShell;
- Stage-17: Node prerequisites PASS, then BLOCKED_ENVIRONMENT/nonzero because project-local Chromium was absent;
- desktop/narrow/CAUx/manual screenshot gates: NOT_RUN.

Historical LEG-012 results remain evidence for LEG-012 only and are not promoted to LEG-013.

## LEG-013 material

Fixed head:

```text
7f81c19a236fc6075a26ed3fccfece808406c7a6
```

LEG-013 adds validation-carrier hardening only:

```text
project-local Chromium preflight
-> five required Node gates
-> focused qualification-sample Playwright
-> Stage-17 carrier
-> executable PASS only if every step exits 0
```

The project-local browser helper uses `PLAYWRIGHT_BROWSERS_PATH=0`, classifies missing CLI/browser/probe conditions as `BLOCKED_ENVIRONMENT`, and emits exact PowerShell/POSIX remediation. Stage-17 reuses the preflight before its long prerequisite sequence. `MANUAL-EP-0025.md` is the current cross-platform validation guide; MANUAL-EP-0024 remains historical custody.

## LEG-013 validation truth

- material diff / protected-path inspection: PASS;
- isolated syntax check of the new runner/helper exact source contents: PASS;
- isolated runner `--plan`: PASS / PLAN_ONLY only;
- isolated missing-dependency preflight falsifier: PASS (`BLOCKED_ENVIRONMENT`, exit 2);
- full five Node gates on LEG-013 exact repo head: NOT_RUN;
- exact-repo project-local Chromium preflight: NOT_RUN;
- focused qualification-sample Playwright: NOT_RUN;
- Stage-17: NOT_RUN;
- desktop/narrow structured audit: NOT_RUN;
- CAUx physical-keyboard Enter/Space: NOT_RUN;
- passing screenshot set: NOT_RUN.

No source/static/isolated smoke is promoted to executable browser PASS.

## Benchmark / authority ledger

- CAUx retained comparison: 8/8 within frozen 3%; worst relative 2.0355862430856293% at Cu; worst absolute 26.786740343133943 kPa at Du; governing reference and EMP.1 both Du; agreement true. Comparison evidence only, not global WRC method/code/release authority.
- CAUx benchmark `engineeringUseAuthorized=false` remains distinct from the separately bounded gamma5 route's existing engineering-use authorization.
- PV Elite: `REFERENCE_NOT_AVAILABLE` / `SOURCE_NOT_RETAINED`; zero rows; expected values unavailable; tolerance unresolved/null; no invented version/tolerance.
- Global/full-domain WRC production route remains unregistered; release remains false; bounded route source/authority is not modified by LEG-013.
- Pressure remains 5 identities x Internal/External = 10 governed cells; mechanics/source custody unchanged.

## Roadmap / protocol / control

ROADMAP: EMP_TAB_UI_RECOMMENDATIONS.md@d616a4ea014d583c9709a872c3af3896dea9011e
ROADMAP_ALIGNMENT: STALE_STATUS_BUT_SCOPE_ALIGNED
ROADMAP_MUTATION_AUTHORITY: NONE
COMMON_PROTOCOL: engineering-pr-delivery-v2
COMMON_PROTOCOL_BASIS: 3e21f0054ab8d80b7fe045e7c105a81643fcbbf7
COMMON_PROTOCOL_STATUS: CURRENT
OWNER_PROGRESSION_COMMAND: `proceed next` CONSUMED_BY_LEG_013
OWNER_CUSTODY_INSTRUCTION: CURRENT_CUSTODIAN_CONTINUES_NO_TAKEOVER
OWNER_MERGE_COMMAND: NONE
QUALIFICATION_SCOPE_ID: QSCOPE-1651-EMP-TASK-SHELL-RECOVERY
QUESTION_SET_ID: QS-ADV-EMP1-HUMAN-UI-1651-0006
QUESTION_SET_STATUS: CURRENT
QUESTION_PACK_ACTION: REUSED
QUESTION_DISPLAY: HIDE
ENGINEERING_STATE: LEG_013_SOURCE_COMPLETE_EXECUTABLE_REOBSERVATION_PENDING
CUSTODY_STATE: HELD
QUALIFICATION_STATE: NOT_REQUIRED
WRITE_AUTHORITY: READ_ONLY_AWAITING_EXTERNAL_VALIDATION
AUTO_STATE: NOT_APPLICABLE
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
HANDOVER_CONTENT_READY: TRUE
HANDOVER_VALIDATION_STATUS: NOT_RUN
CHAIN_HANDOVER_READY: TRUE
TAKEOVER_QUALIFICATION_READY: TRUE
HANDOVER_READY: FALSE

CURRENT_BLOCKER: full exact-head LEG-013 executable qualification is pending; browser/human PASS cannot be inferred from source inspection or isolated carrier smoke.
EXACT_NEXT_ACTION: external verifier checks out `7f81c19a236fc6075a26ed3fccfece808406c7a6`, follows MANUAL-EP-0025, installs project-local Chromium if preflight requires it, runs `node scripts/emp1-issue1651-executable-validation.mjs`, stops on any nonzero result, and only after complete executable PASS proceeds to desktop/narrow/CAUx human-factor observations.
