# Current Issue State — ADV-EMP1-HUMAN-UI-1651

ISSUE_CURRENT_STATE_BASIS: IB-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-0029
UPDATED_AT: 2026-09-06
ISSUE_HANDOVER_SYNC_STATUS: IN_SYNC
ISSUE_CHAIN_ROOT_COMMENT_ID: 5549975772
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5549975074
ISSUE_LATEST_ENDPOINT_COMMENT_ID: 5560870606
RECOVERY_CHILD_CHECKPOINT_COMMENT_ID: 5560871405
WORK_ITEM_KEY: github:reallaksh19/Advanced_Analysis#1651
PARENT_ISSUE: 1651
RECOVERY_CHILD_ISSUE: 1664
RECOVERY_CHILD_TITLE: EMP.1 recovery: replace residual waterfall with split-console UI

MERGED_IMPLEMENTATION_PR: 1675
PR_1675_STATUS: MERGED_BY_OWNER_COMMAND
PR_1675_MERGE_COMMIT: 11f655e71a81b0d7ebef42e99792482b434e60db
PREDECESSOR_REPAIR_PR: 1696
PREDECESSOR_REPAIR_PR_STATUS: CLOSED_UNMERGED_FAILED_EXECUTABLE_VALIDATION
MERGED_REPAIR_PR: 1701
MERGED_REPAIR_PR_STATUS: MERGED_BY_OWNER_COMMAND
MERGED_REPAIR_BRANCH: agent/emp1-1651-qualification-sample-leg012
MERGED_REPAIR_HEAD: 260d0c6b75c5d94edef33eb095384bf145a47de2
MERGE_COMMIT: f98d56d4c644b7bb6b79d2302739d12dac720248
MERGED_INTEGRATION_HEAD: f98d56d4c644b7bb6b79d2302739d12dac720248
POST_MERGE_RECONCILIATION_BRANCH: agent/emp1-1651-post-merge-ep0029
POST_MERGE_RECONCILIATION_PR: 1708
POST_MERGE_RECONCILIATION_PR_STATUS: OPEN_DRAFT_OWNER_ONLY_NOT_AUTHORIZED
POST_MERGE_RECONCILIATION_PR_HEAD_AT_OPEN: 53316b4219b1b614792576fc2170ba276a86a83d
POST_MERGE_STATUS_CONTEXTS: 0
POST_MERGE_PR_WORKFLOW_RUNS: 0
ACTIVE_ENDPOINT: EP-0029
LAST_COMPLETED_MATERIAL_LEG: LEG-013
CURRENT_MATERIAL_LEG: NONE
MATERIAL_HEAD: 7f81c19a236fc6075a26ed3fccfece808406c7a6
MATERIAL_BASE: a66931152fdfa3b516744e49c9e4c0f0b5ce7e28
MATERIAL_MAIN_BASIS: 687b9ff3b8884031e4776f031af7a739f29eb2c8
POST_MERGE_VALIDATION_TARGET: f98d56d4c644b7bb6b79d2302739d12dac720248
POST_MERGE_NO_PATCH_DISPOSITION: TRUE
VALIDATION_PROTOCOL: agents/chains/ADV-EMP1-HUMAN-UI-1651/validation/MANUAL-EP-0025.md

## Original acceptance ledger

- TASK-001 | Live-DOM raw-machine-token regression gate. | SOURCE RETAINED from merged LEG-010. Final live acceptance remains pending a valid merged-head browser run.
- TASK-002 | General identity x value-column rendering; Pressure specifically 5 identities x Internal/External = 10 governed cells. | SOURCE RETAINED/MERGED. Merged-head live confirmation remains pending.
- TASK-003 | Anti-waterfall / equivalent application layout. | LEG-010 MERGED. Human-factor desktop/narrow re-observation remains pending after merged-head executable browser gates pass.
- TASK-004 | CAUx staged benchmark UI hardening based on retained evidence. | SOURCE RETAINED/MERGED. CAUx physical-keyboard and visual evidence remains pending after merged-head executable browser gates pass.
- TASK-005 | Preserve numerical/source/tolerance/sign/axis/route/code/release authority. | PRESERVED through LEG-013 protected-path inspection and Owner-authorized merge; merge creates no new engineering authority.

## Historical repair sequence

LEG-011 fixed head `dfc7e0f90fdd15dc1bf8e48b462b612b27bfbf5f` failed real Chromium execution: focused qualification-sample Playwright was 2 failed / 2 total and the complete-sample action surfaced `EMP1_A_CURRENT_QUALIFIED_RESULT_REQUIRED`. Stage-17 separately stopped at a stale pre-promotion assertion. PR #1696 closed unmerged.

LEG-012 fixed head `84001f0dbb4612821ba0c18555b5d5ed7b1da9c3` repaired the factory raw-vs-normalized A source identity mismatch and retained the normal controller/store A -> B -> C sequence. Returned LEG-012 evidence: five required Node gates PASS; focused Playwright NOT_RUN due PowerShell invocation error; Stage-17 prerequisites PASS then BLOCKED_ENVIRONMENT because project-local Chromium was absent; human-factor gates NOT_RUN.

LEG-013 fixed head `7f81c19a236fc6075a26ed3fccfece808406c7a6` added validation-carrier hardening only: project-local Chromium preflight, one cross-platform fail-fast executable entrypoint, Stage-17 early preflight, EP-0025 PowerShell/POSIX guide, and static acceptance-manifest alignment. Protected-path inspection PASS; isolated syntax/plan/negative-preflight checks passed only for their explicit scope. Full exact-head Node/Chromium/Playwright/Stage-17 and human-factor evidence remained NOT_RUN.

EP-0027 consumed `proceed next` as no-patch reconciliation. No LEG-014 was opened because no executable/product failure existed. Main drift was isolated to independent LAFEA-UQ reference chains and had no EMP.1/WRC/Pressure/validation-carrier overlap.

EP-0028 recorded the Owner command `merge, proceed next`, granted merge authority for PR #1701, and reserved the separate progression for post-merge reconciliation. Validation truth remained unchanged.

## EP-0029 post-merge reconciliation

PR #1701 was transitioned from Draft to Ready only as the mechanical merge precondition and then merged with expected-head guard against `260d0c6b75c5d94edef33eb095384bf145a47de2`.

Merge result:

```text
merged=true
merge commit=f98d56d4c644b7bb6b79d2302739d12dac720248
merged_at=2026-09-06T17:15:50Z
```

`main` was observed exactly at the merge commit immediately after merge. Post-merge status contexts = 0 and PR-triggered workflow runs = 0; zero does not create PASS.

Direct metadata write to protected `main` was rejected with repository policy `Changes must be made through a pull request.` A successor metadata-only branch `agent/emp1-1651-post-merge-ep0029` was created from the merge commit and Draft PR #1708 was opened. No production code or engineering authority is changed by EP-0029. The prior merge authorization does not carry to PR #1708.

The remaining validation target is the actual merged integration head `f98d56d4c644b7bb6b79d2302739d12dac720248`, not a moving later metadata relay head.

Immutable parent endpoint comment: `5560870606`.
Recovery checkpoint comment: `5560871405`.

## Benchmark / authority ledger

- CAUx retained comparison: 8/8 within frozen 3%; worst relative 2.0355862430856293% at Cu; worst absolute 26.786740343133943 kPa at Du; governing reference and EMP.1 both Du; agreement true. Comparison evidence only, not global WRC method/code/release authority.
- CAUx benchmark `engineeringUseAuthorized=false` remains distinct from the separately bounded gamma5 route's existing engineering-use authorization.
- PV Elite: `REFERENCE_NOT_AVAILABLE` / `SOURCE_NOT_RETAINED`; zero rows; expected values unavailable; tolerance unresolved/null; no invented version/tolerance.
- Global/full-domain WRC production route remains unregistered; release remains false.
- Pressure remains 5 identities x Internal/External = 10 governed cells; mechanics/source custody unchanged.

## Roadmap / protocol / control

ROADMAP: EMP_TAB_UI_RECOMMENDATIONS.md@d616a4ea014d583c9709a872c3af3896dea9011e
ROADMAP_ALIGNMENT: STALE_STATUS_BUT_SCOPE_ALIGNED
ROADMAP_MUTATION_AUTHORITY: NONE
COMMON_PROTOCOL: engineering-pr-delivery-v2
COMMON_PROTOCOL_BASIS: 3e21f0054ab8d80b7fe045e7c105a81643fcbbf7
COMMON_PROTOCOL_STATUS: CURRENT
OWNER_PROGRESSION_COMMAND: `proceed next` CONSUMED_BY_EP_0029_POST_MERGE_RECONCILIATION
OWNER_CUSTODY_INSTRUCTION: CURRENT_CUSTODIAN_CONTINUES_NO_TAKEOVER
OWNER_MERGE_COMMAND: MERGE CONSUMED_BY_PR_1701
QUALIFICATION_SCOPE_ID: QSCOPE-1651-EMP-TASK-SHELL-RECOVERY
QUESTION_SET_ID: QS-ADV-EMP1-HUMAN-UI-1651-0006
QUESTION_SET_STATUS: CURRENT
QUESTION_PACK_ACTION: REUSED
QUESTION_DISPLAY: HIDE
ENGINEERING_STATE: MERGED_VALIDATION_REOBSERVATION_PENDING
CUSTODY_STATE: HELD
QUALIFICATION_STATE: NOT_REQUIRED
WRITE_AUTHORITY: READ_ONLY_AWAITING_POST_MERGE_VALIDATION
AUTO_STATE: NOT_APPLICABLE
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
HANDOVER_CONTENT_READY: TRUE
HANDOVER_VALIDATION_STATUS: NOT_RUN
CHAIN_HANDOVER_READY: TRUE
TAKEOVER_QUALIFICATION_READY: TRUE
HANDOVER_READY: FALSE

CURRENT_BLOCKER: merged-head executable and human-factor acceptance remains NOT_RUN. Merge did not waive the evidence requirements.
EXACT_NEXT_ACTION: external verifier checks out `f98d56d4c644b7bb6b79d2302739d12dac720248`, installs project-local Chromium if preflight requires it, runs `node scripts/emp1-issue1651-executable-validation.mjs`, stops on any nonzero result, and only after complete executable PASS proceeds to desktop/narrow/CAUx human-factor observations. Any merged-head executable failure requires a new bounded diagnosis before further material work.
