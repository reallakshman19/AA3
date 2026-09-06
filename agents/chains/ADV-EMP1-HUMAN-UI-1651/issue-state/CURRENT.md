# Current Issue State — ADV-EMP1-HUMAN-UI-1651

ISSUE_CURRENT_STATE_BASIS: IB-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-0023
UPDATED_AT: 2026-09-06
ISSUE_HANDOVER_SYNC_STATUS: PENDING_EP0023_COMMENT_SYNC
ISSUE_CHAIN_ROOT_COMMENT_ID: 5549975772
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5549975074
WORK_ITEM_KEY: github:reallaksh19/Advanced_Analysis#1651
PARENT_ISSUE: 1651
RECOVERY_CHILD_ISSUE: 1664
RECOVERY_CHILD_TITLE: EMP.1 recovery: replace residual waterfall with split-console UI

MERGED_IMPLEMENTATION_PR: 1675
PR_1675_STATUS: MERGED_BY_OWNER_COMMAND
PR_1675_MERGE_COMMIT: 11f655e71a81b0d7ebef42e99792482b434e60db
CURRENT_REPAIR_PR: 1696
CURRENT_REPAIR_PR_STATUS: OPEN_DRAFT_FAILED_EXECUTABLE_VALIDATION_NOT_MERGE_AUTHORIZED
CURRENT_REPAIR_BRANCH: agent/emp1-1651-qualification-sample-leg011
ACTIVE_ENDPOINT: EP-0023
LAST_COMPLETED_MATERIAL_LEG: LEG-011
MATERIAL_HEAD: dfc7e0f90fdd15dc1bf8e48b462b612b27bfbf5f
MATERIAL_RECEIPT: agents/chains/ADV-EMP1-HUMAN-UI-1651/material-legs/LEG-011.md
CURRENT_MATERIAL_LEG: NONE

MAIN_HEAD_OBSERVED: 65a5aa6c29ef533f358e5c4c296318025dfafe9f
MATERIAL_BASE_MAIN: 8eefaf0d1b9effdcd395dbd54a0b027bc43f308c
MAIN_DRIFT: AHEAD_18_BEHIND_0
MAIN_DRIFT_CLASSIFICATION: UNRELATED_LAFEA_UQ_REFERENCE_VALIDATION_NO_EMP1_OVERLAP

## Acceptance ledger

- TASK-001 | Live-DOM raw-machine-token regression gate. | SOURCE MERGED from LEG-010; final live acceptance still blocked because the complete qualification sample cannot establish the prepared state.
- TASK-002 | Shared identity × value-column renderer; Pressure 5 × 2. | SOURCE MERGED; static 5 identities × 2 value columns = 10 governed cells retained; live prepared-state confirmation pending.
- TASK-003 | Split-console / anti-waterfall architecture. | LEG-010 MERGED; LEG-011 does not alter layout. Human-factor acceptance remains pending because qualification sample preparation still fails before the structured audit.
- TASK-004 | CAUx staged benchmark UI hardening. | SOURCE MERGED; CAUx keyboard/visual acceptance remains NOT_RUN after a correctly prepared sample.
- TASK-005 | Preserve numerical/source/tolerance/sign/axis/route/code/release authority. | PRESERVED. LEG-011 changes one controller orchestration seam plus tests/manual custody only; executable failure does not authorize engineering-authority mutation.

## LEG-011 fixed material

Frozen material head:

```text
dfc7e0f90fdd15dc1bf8e48b462b612b27bfbf5f
```

Eight material files, exactly one product source file (`src/workspace/lafea-workbench-controller.js`) plus focused regression/static/manual-carrier custody. No workflow YAML or protected engineering-authority path changed.

## Exact-head validation evidence

Tester verified exact HEAD and successfully completed `npm ci`.

Static PASS:

1. `emp1-qualification-sample-orchestration-check.mjs` -> `PASS_STATIC_QUALIFICATION_SAMPLE_A_THEN_B_THEN_C_CONTRACT`;
2. `emp1-analytical-layout-check.mjs` -> `EMP1_SPLIT_CONSOLE_LAYOUT_CHECK_PASS`;
3. `emp1-manual-browser-audit-check.mjs` -> `PASS_STATIC_SPLIT_CONSOLE_MANUAL_BROWSER_AUDIT_CONTRACT`;
4. `emp1-issue1651-acceptance-check.mjs` -> `PASS_STATIC_ROBUST_SPLIT_CONSOLE_ACCEPTANCE_MANIFEST_EXECUTABLE_BROWSER_GATES_RETAINED`.

Executable FAIL:

- Chromium installation succeeded and browser execution ran normally.
- `e2e/emp1-qualification-sample-orchestration.spec.js` -> 2 failed / 2 total.
- complete-sample action still surfaces `EMP1_A_CURRENT_QUALIFIED_RESULT_REQUIRED`; observation reports A document, B document and run input absent. This is a real executable failure and not an environment blocker.
- `scripts/lafea-stage17-browser-run.mjs` -> exit 1 at `scripts/emp1-public-product-check.mjs:67`, actual `BOUNDED_LOCAL_CORRELATION_AVAILABLE`, expected `BLOCKED_LOCAL_CORRELATION`.

No executable browser PASS is claimed.

## Refined qualification-sample root cause

`createEmp1WorkbenchQualificationSample()` currently creates a raw LAFEA.1 fixture and executes it with `executeLafeaStage()`. The execution boundary normalizes the document and stores the normalized representation as `execution.source`. The factory then passes the original raw A document plus that execution to `refreshEmp1BSourceEvidence()`.

The A-to-B seam deliberately requires semantic equality between `execution.source` and `aDocument`; otherwise it throws `EMP1_A_CURRENT_QUALIFIED_RESULT_REQUIRED`. LAFEA.1 workbench normalization canonicalizes the retained source representation, so the raw fixture is not a safe retained-document identity for that comparison. The factory can therefore fail before returning its sample. This matches the browser evidence that A/B/runInput remain absent and explains why the LEG-011 controller sequencing attempt never executes.

Authority-safe next repair: normalize the qualification A source through the public LAFEA.1 workbench document normalizer before executing it and use that same normalized document for A-to-B refresh and returned source custody. Continue returning only A/B source documents plus typed C input; never return/inject the private A execution.

## Stage-17 baseline drift

The Stage-17 failure is independent from the sample-factory failure and pre-exists LEG-011. `emp1-public-product-check.mjs` still asserts the historical blocked/unregistered bounded-C state, but at the fixed material head the gamma5 bounded registry is already:

```text
registered = true
engineeringUseAuthorized = true
suspensionReasons = []
```

and `buildEmp1ProductProjection()` therefore returns `BOUNDED_LOCAL_CORRELATION_AVAILABLE`. A future dependent test-alignment change may update that stale script to current authority, but must not mutate route registration/engineering authority itself.

## Validation remaining

- focused qualification-sample Playwright: FAIL;
- Stage-17 carrier: FAIL;
- correctly prepared desktop structured audit: NOT_RUN;
- correctly prepared narrow structured audit: NOT_RUN;
- CAUx physical-keyboard Enter/Space: NOT_RUN;
- passing desktop default/readiness-open/narrow screenshots: NOT_RUN;
- status contexts/workflow runs do not substitute for these checks.

## Authority / control

COMMON_PROTOCOL: engineering-pr-delivery-v2
COMMON_PROTOCOL_BASIS: 3e21f0054ab8d80b7fe045e7c105a81643fcbbf7
COMMON_PROTOCOL_STATUS: CURRENT
OWNER_PROGRESSION_COMMAND: `proceed next` CONSUMED_BY_LEG_011
OWNER_CUSTODY_INSTRUCTION: CURRENT_CUSTODIAN_CONTINUES_NO_TAKEOVER
OWNER_MERGE_COMMAND: NONE
QUALIFICATION_SCOPE_ID: QSCOPE-1651-EMP-TASK-SHELL-RECOVERY
QUESTION_SET_ID: QS-ADV-EMP1-HUMAN-UI-1651-0006
QUESTION_SET_STATUS: CURRENT
QUESTION_PACK_ACTION: REUSED
QUESTION_DISPLAY: HIDE
ENGINEERING_STATE: LEG_011_FROZEN_EXECUTABLE_FAIL_SAMPLE_FACTORY_PREIMPORT_MISMATCH
CUSTODY_STATE: HELD
QUALIFICATION_STATE: NOT_REQUIRED
WRITE_AUTHORITY: READ_ONLY_PENDING_FRESH_OWNER_PROGRESSION
AUTO_STATE: NOT_APPLICABLE
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
HANDOVER_VALIDATION_STATUS: FAIL
HANDOVER_READY: FALSE

CURRENT_BLOCKER: PR #1696 fails exact-head executable validation and must not merge. The immediate sample-factory raw-vs-normalized A identity mismatch is diagnosed; Stage-17 also has an independent stale pre-promotion assertion.

EXACT_NEXT_ACTION: await fresh Owner `proceed next`; then create one bounded continuation from the then-current main to normalize A before factory execute/refresh, align the stale public-product test to current bounded-route authority without changing authority, rerun the static + focused Playwright + Stage-17 gates, freeze material, and only after executable PASS resume the desktop/narrow/CAUx human-factor observations.