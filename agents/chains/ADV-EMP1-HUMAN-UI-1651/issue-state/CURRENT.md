# Current Issue State — ADV-EMP1-HUMAN-UI-1651

ISSUE_CURRENT_STATE_BASIS: IB-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-0025
UPDATED_AT: 2026-09-06
ISSUE_HANDOVER_SYNC_STATUS: STALE_PENDING_LEG013_COMPLETION
ISSUE_CHAIN_ROOT_COMMENT_ID: 5549975772
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5549975074
ISSUE_LATEST_ENDPOINT_COMMENT_ID: 5559596599
RECOVERY_CHILD_CHECKPOINT_COMMENT_ID: 5559598051
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
ACTIVE_ENDPOINT: EP-0025
LAST_COMPLETED_MATERIAL_LEG: LEG-012
CURRENT_MATERIAL_LEG: LEG-013
MATERIAL_LEG_BASE: a66931152fdfa3b516744e49c9e4c0f0b5ce7e28
MATERIAL_LEG_PREWORK_ENDPOINT_FILE: agents/chains/ADV-EMP1-HUMAN-UI-1651/endpoints/EP-0025.md
LAST_FIXED_MATERIAL_HEAD: 84001f0dbb4612821ba0c18555b5d5ed7b1da9c3
MATERIAL_MAIN_BASIS: 687b9ff3b8884031e4776f031af7a739f29eb2c8
CURRENT_MAIN_OBSERVED: e8cdc8473ac12d9773f4be598746d13acd3eabc6
MAIN_DRIFT_FROM_MATERIAL_BASIS: AHEAD_32_BEHIND_0
MAIN_DRIFT_SOURCE: LAFEA_UQ_REF_HOLDOUT_1699_AND_LAFEA_UQ_REF_CAL_UNC_1702
MAIN_DRIFT_CLASSIFICATION: UNRELATED_NO_EMP1_OVERLAP
MAIN_DRIFT_AFFECTS_LEG013: FALSE
POST_BASIS_DRIFT: MATERIAL_WITHIN_QUALIFIED_BOUNDARY
MATERIAL_RECEIPT: agents/chains/ADV-EMP1-HUMAN-UI-1651/material-legs/LEG-012.md
VALIDATION_PROTOCOL: agents/chains/ADV-EMP1-HUMAN-UI-1651/validation/MANUAL-EP-0024.md

## Original acceptance ledger

- TASK-001 | Live-DOM raw-machine-token regression gate. | SOURCE RETAINED from merged LEG-010. Final live acceptance remains pending a valid prepared-state browser run.
- TASK-002 | General identity x value-column rendering; Pressure specifically 5 identities x Internal/External = 10 governed cells. | SOURCE RETAINED/MERGED. Exact-head live confirmation remains pending.
- TASK-003 | Anti-waterfall / equivalent application layout. | LEG-010 MERGED. Human-factor desktop/narrow re-observation remains pending after executable browser gates pass.
- TASK-004 | CAUx staged benchmark UI hardening based on retained evidence. | SOURCE RETAINED/MERGED. CAUx physical-keyboard and visual evidence remains pending after executable browser gates pass.
- TASK-005 | Preserve numerical/source/tolerance/sign/axis/route/code/release authority. | PRESERVED through LEG-012 source/diff inspection. LEG-013 is validation-carrier only.

## LEG-011 historical failure

Fixed LEG-011 material `dfc7e0f90fdd15dc1bf8e48b462b612b27bfbf5f` failed real Chromium execution: focused qualification-sample Playwright was 2 failed / 2 total and the complete-sample action still surfaced `EMP1_A_CURRENT_QUALIFIED_RESULT_REQUIRED` before A/B/runInput were established. Stage-17 separately stopped at a stale pre-promotion assertion in `emp1-public-product-check.mjs`. PR #1696 is closed unmerged.

The refined root cause was factory-local: raw A was executed through a workbench boundary that normalized `execution.source`, then the original raw A was supplied to the A-to-B refresh seam, which correctly rejected the source-identity mismatch.

## LEG-012 material and returned external evidence

Fixed head:

```text
84001f0dbb4612821ba0c18555b5d5ed7b1da9c3
```

Factory contract:

```text
raw simulated A
-> normalizeLafeaStageDocument('LAFEA.1', raw A)
-> execute LAFEA.1 on normalized A
-> require QUALIFIED / ACCEPTED
-> refresh B using the same normalized A + private A execution
-> return normalized A document, B document and typed C input only
```

Controller contract:

```text
import returned A
-> select LAFEA.1
-> run A through normal controller/store path
-> require current QUALIFIED / ACCEPTED A
-> import B
-> apply typed C binding
-> select LAFEA.2
-> run governed EMP.1 product
```

Returned exact-head external evidence now establishes:

- `emp1-qualification-sample-orchestration-check.mjs`: PASS;
- `emp1-analytical-layout-check.mjs`: PASS;
- `emp1-manual-browser-audit-check.mjs`: PASS;
- `emp1-issue1651-acceptance-check.mjs`: PASS;
- `emp1-public-product-check.mjs`: PASS;
- focused qualification-sample Playwright: NOT_RUN because Linux backslash continuation was pasted into PowerShell and rejected before the requested spec ran;
- Stage-17: Node prerequisites PASS, then BLOCKED_ENVIRONMENT/nonzero because project-local Chromium was absent at `node_modules/playwright-core/.local-browsers/...`;
- desktop/narrow/CAUx/manual screenshot gates: NOT_RUN because executable qualification did not close.

No browser/product PASS is manufactured from the five Node PASS results.

## LEG-013 bounded progression

Owner `proceed next` is active for one same-scope material leg. EP-0025 exists before material changes with `PREWORK_QUALIFICATION_READY: TRUE`; current Q set `QS-ADV-EMP1-HUMAN-UI-1651-0006` is reused unchanged.

LEG-013 may only:

1. add a cross-platform fail-fast executable validation entrypoint for issue #1651 / recovery #1664;
2. preflight the project-local Chromium runtime required by `PLAYWRIGHT_BROWSERS_PATH=0` and report exact remediation if absent;
3. run the five Node gates, focused qualification-sample Playwright, and Stage-17 in the mandated order;
4. update the manual guide with Windows PowerShell and single-command usage.

Protected domains remain unchanged: production `src/**`; WRC equations/tables/curves/applicability; Pressure mechanics/source refs; bounded-route registry/engineering authority; CAUx/PV Elite source/tolerance/authority; roadmap; `.github/workflows/**`; code/release/deployment authority; LAFEA.3+ mechanics.

## Stage-17 authority baseline

The bounded gamma5 registry already has `registered=true`, `engineeringUseAuthorized=true`, `suspensionReasons=[]`. The global/full-domain route remains unregistered and release remains false. The Stage-17 expectation follows that already-current split; route registry/authority source is untouched.

## Benchmark / authority ledger

- CAUx retained comparison: 8/8 within frozen 3%; worst relative 2.0355862430856293% at Cu; worst absolute 26.786740343133943 kPa at Du; governing reference and EMP.1 both Du; agreement true. Comparison evidence only, not global WRC method/code/release authority.
- PV Elite: `REFERENCE_NOT_AVAILABLE` / `SOURCE_NOT_RETAINED`; zero rows; expected values unavailable; tolerance unresolved/null; no invented version/tolerance.
- Global/full-domain WRC production route remains unregistered; bounded route source authority is not modified by LEG-013.

## Roadmap / protocol / control

ROADMAP: EMP_TAB_UI_RECOMMENDATIONS.md@d616a4ea014d583c9709a872c3af3896dea9011e
ROADMAP_ALIGNMENT: STALE_STATUS_BUT_SCOPE_ALIGNED
ROADMAP_MUTATION_AUTHORITY: NONE
COMMON_PROTOCOL: engineering-pr-delivery-v2
COMMON_PROTOCOL_BASIS: 3e21f0054ab8d80b7fe045e7c105a81643fcbbf7
COMMON_PROTOCOL_STATUS: CURRENT
OWNER_PROGRESSION_COMMAND: `proceed next` ACTIVE_FOR_LEG_013
OWNER_CUSTODY_INSTRUCTION: CURRENT_CUSTODIAN_CONTINUES_NO_TAKEOVER
OWNER_MERGE_COMMAND: NONE
QUALIFICATION_SCOPE_ID: QSCOPE-1651-EMP-TASK-SHELL-RECOVERY
QUESTION_SET_ID: QS-ADV-EMP1-HUMAN-UI-1651-0006
QUESTION_SET_STATUS: CURRENT
QUESTION_PACK_ACTION: REUSED
QUESTION_DISPLAY: HIDE
ENGINEERING_STATE: LEG_013_VALIDATION_CARRIER_HARDENING_IN_PROGRESS
CUSTODY_STATE: HELD
QUALIFICATION_STATE: NOT_REQUIRED
WRITE_AUTHORITY: WRITE_ALLOWED
AUTO_STATE: NOT_APPLICABLE
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
HANDOVER_CONTENT_READY: TRUE
HANDOVER_VALIDATION_STATUS: NOT_RUN
CHAIN_HANDOVER_READY: TRUE
TAKEOVER_QUALIFICATION_READY: TRUE
HANDOVER_READY: FALSE

CURRENT_BLOCKER: browser qualification cannot yet be interpreted because the external run did not execute the focused spec and Stage-17 lacked project-local Chromium. LEG-013 is limited to making that validation path cross-platform and fail-fast.
EXACT_NEXT_ACTION: implement and inspect the validation carrier + guide only, freeze LEG-013 material, then obtain external exact-head executable evidence before any desktop/narrow/CAUx human-factor acceptance.
