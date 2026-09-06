# Current Issue State — ADV-EMP1-HUMAN-UI-1651

ISSUE_CURRENT_STATE_BASIS: IB-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-0024
UPDATED_AT: 2026-09-06
ISSUE_HANDOVER_SYNC_STATUS: PENDING_EP0024_COMMENT_SYNC
ISSUE_CHAIN_ROOT_COMMENT_ID: 5549975772
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5549975074
ISSUE_LATEST_ENDPOINT_COMMENT_ID: PENDING_EP0024_COMMENT_SYNC
RECOVERY_CHILD_CHECKPOINT_COMMENT_ID: PENDING_EP0024_COMMENT_SYNC
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
ACTIVE_ENDPOINT: EP-0024
LAST_COMPLETED_MATERIAL_LEG: LEG-012
MATERIAL_HEAD: 84001f0dbb4612821ba0c18555b5d5ed7b1da9c3
MATERIAL_BASE: 718d42810fd7e51307edf78373a9158eb20246bd
MATERIAL_MAIN_BASIS: 687b9ff3b8884031e4776f031af7a739f29eb2c8
MATERIAL_RECEIPT: agents/chains/ADV-EMP1-HUMAN-UI-1651/material-legs/LEG-012.md
VALIDATION_PROTOCOL: agents/chains/ADV-EMP1-HUMAN-UI-1651/validation/MANUAL-EP-0024.md
CURRENT_MATERIAL_LEG: NONE

## Original acceptance ledger

- TASK-001 | Live-DOM raw-machine-token regression gate. | SOURCE RETAINED from merged LEG-010. Final live acceptance remains pending a valid LEG-012 prepared-state run.
- TASK-002 | General identity x value-column rendering; Pressure specifically 5 identities x Internal/External = 10 governed cells. | SOURCE RETAINED/MERGED. Exact-head live confirmation remains pending.
- TASK-003 | Anti-waterfall / equivalent application layout. | LEG-010 MERGED. Human-factor desktop/narrow re-observation remains pending after executable LEG-012 gates pass.
- TASK-004 | CAUx staged benchmark UI hardening based on retained evidence. | SOURCE RETAINED/MERGED. CAUx physical-keyboard and visual evidence remains pending after executable LEG-012 gates pass.
- TASK-005 | Preserve numerical/source/tolerance/sign/axis/route/code/release authority. | PRESERVED through LEG-012 source/diff inspection. No authority source is changed by the current material.

## LEG-011 historical failure

Fixed LEG-011 material `dfc7e0f90fdd15dc1bf8e48b462b612b27bfbf5f` failed real Chromium execution: focused qualification-sample Playwright was 2 failed / 2 total and the complete-sample action still surfaced `EMP1_A_CURRENT_QUALIFIED_RESULT_REQUIRED` before A/B/runInput were established. Stage-17 separately stopped at a stale pre-promotion assertion in `emp1-public-product-check.mjs`. PR #1696 is closed unmerged.

The refined root cause was factory-local: raw A was executed through a workbench boundary that normalized `execution.source`, then the original raw A was supplied to the A-to-B refresh seam, which correctly rejected the source-identity mismatch.

## LEG-012 material

Fixed head:

```text
84001f0dbb4612821ba0c18555b5d5ed7b1da9c3
```

Factory contract now:

```text
raw simulated A
-> normalizeLafeaStageDocument('LAFEA.1', raw A)
-> execute LAFEA.1 on normalized A
-> require QUALIFIED / ACCEPTED
-> refresh B using the same normalized A + private A execution
-> return normalized A document, B document and typed C input only
```

Controller contract carried from LEG-011:

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

The factory never exports/injects its private A execution.

The sequencing check is strengthened with a runtime factory/A-to-B identity smoke so the exact EP-0023 failure is directly falsifiable before Playwright.

## Stage-17 baseline alignment

At the material basis, the bounded gamma5 registry already has `registered=true`, `engineeringUseAuthorized=true`, `suspensionReasons=[]`. The global/full-domain route remains unregistered and release remains false. LEG-012 changes `scripts/emp1-public-product-check.mjs` only to test this already-current authority split; route registry/authority source is untouched.

## Material boundary

Nine material files from write-ahead base `718d42810fd7e51307edf78373a9158eb20246bd`: controller, qualification-sample factory, focused Playwright spec, sequencing/static runtime gate, public-product test alignment, #1651 acceptance manifest, manual-audit contract, Stage-17 carrier, and MANUAL-EP-0024.

Protected domains unchanged: `.github/workflows/**`; WRC equations/tables/curves/applicability; bounded-route registry and engineering authority; Pressure mechanics/source refs; retained CAUx/PV Elite source/tolerance/authority; roadmap; code/release/deployment authority; LAFEA.3+ FEA mechanics.

## Validation truth

At fixed LEG-012 head:

- source/diff/protected-path inspection: PASS;
- `emp1-qualification-sample-orchestration-check.mjs`: NOT_RUN;
- `emp1-analytical-layout-check.mjs`: NOT_RUN;
- `emp1-manual-browser-audit-check.mjs`: NOT_RUN;
- `emp1-issue1651-acceptance-check.mjs`: NOT_RUN;
- `emp1-public-product-check.mjs`: NOT_RUN;
- focused qualification-sample Playwright: NOT_RUN;
- Stage-17 carrier: NOT_RUN;
- desktop structured audit: NOT_RUN;
- narrow structured audit: NOT_RUN;
- CAUx physical-keyboard Enter/Space: NOT_RUN;
- passing screenshot set: NOT_RUN.

Historical failures remain historical FAIL; no failure is promoted. Zero GitHub statuses/workflow runs do not constitute PASS.

## Benchmark / authority ledger

- CAUx retained comparison: 8/8 within frozen 3%; worst relative 2.0355862430856293% at Cu; worst absolute 26.786740343133943 kPa at Du; governing reference and EMP.1 both Du; agreement true. It remains comparison evidence only, not global WRC method/code/release authority.
- PV Elite: `REFERENCE_NOT_AVAILABLE` / `SOURCE_NOT_RETAINED`; zero rows; expected values unavailable; tolerance unresolved/null; no invented version/tolerance.
- Global/full-domain WRC production route remains unregistered; bounded route source authority is not modified by LEG-012.

## Roadmap / protocol / control

ROADMAP: EMP_TAB_UI_RECOMMENDATIONS.md@d616a4ea014d583c9709a872c3af3896dea9011e
ROADMAP_ALIGNMENT: STALE_STATUS_BUT_SCOPE_ALIGNED
ROADMAP_MUTATION_AUTHORITY: NONE
COMMON_PROTOCOL: engineering-pr-delivery-v2
COMMON_PROTOCOL_BASIS: 3e21f0054ab8d80b7fe045e7c105a81643fcbbf7
COMMON_PROTOCOL_STATUS: CURRENT
OWNER_PROGRESSION_COMMAND: `proceed next` CONSUMED_BY_LEG_012
OWNER_CUSTODY_INSTRUCTION: CURRENT_CUSTODIAN_CONTINUES_NO_TAKEOVER
OWNER_MERGE_COMMAND: NONE
QUALIFICATION_SCOPE_ID: QSCOPE-1651-EMP-TASK-SHELL-RECOVERY
QUESTION_SET_ID: QS-ADV-EMP1-HUMAN-UI-1651-0006
QUESTION_SET_STATUS: CURRENT
QUESTION_PACK_ACTION: REUSED
QUESTION_DISPLAY: HIDE
ENGINEERING_STATE: LEG_012_SOURCE_COMPLETE_EXECUTABLE_REOBSERVATION_PENDING
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

CURRENT_BLOCKER: exact-head LEG-012 executable validation is pending. PR #1701 is Draft and must not merge without explicit Owner authorization.
EXACT_NEXT_ACTION: external evidence intake at fixed head `84001f0dbb4612821ba0c18555b5d5ed7b1da9c3` using MANUAL-EP-0024: five Node gates, focused Playwright, Stage-17; only after all executable gates pass, run desktop/narrow structured audits, CAUx physical Enter/Space and capture three screenshots. Returned evidence can be recorded read-only without another progression command.
