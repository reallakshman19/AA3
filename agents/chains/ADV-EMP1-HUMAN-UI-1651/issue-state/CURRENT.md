# Current Issue State — ADV-EMP1-HUMAN-UI-1651

ISSUE_CURRENT_STATE_BASIS: IB-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-0021
UPDATED_AT: 2026-09-06
ISSUE_HANDOVER_SYNC_STATUS: IN_SYNC
ISSUE_CHAIN_ROOT_COMMENT_ID: 5549975772
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5549975074
ISSUE_LATEST_ENDPOINT_COMMENT_ID: 5557864537
WORK_ITEM_KEY: github:reallaksh19/Advanced_Analysis#1651
PARENT_ISSUE: 1651
RECOVERY_CHILD_ISSUE: 1664
RECOVERY_CHILD_TITLE: EMP.1 recovery: replace residual waterfall with split-console UI
RECOVERY_CHILD_CHECKPOINT_COMMENT_ID: 5557865595

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
SUPPORTING_VALIDATION_PR_HEAD: 1dead34196fe781c43b20657377a1cd239309503
SUPPORTING_VALIDATION_PR_LATEST_MUTATION: UNAUTHORIZED_VALIDATION_ONLY
NONCANONICAL_HANDOVER_PR: 1684
NONCANONICAL_HANDOVER_PR_STATUS: CLOSED_UNMERGED
NONCANONICAL_HANDOVER_PR_DISPOSITION: OWNER_REJECTED_AS_NOVICE_ARTIFACT_NO_TAKEOVER
ACTIVE_ENDPOINT: EP-0021
LAST_COMPLETED_MATERIAL_LEG: LEG-010
MATERIAL_HEAD: dc2df7a8a8b26feea26d29dbf0741794f788cfac
MATERIAL_RECEIPT: agents/chains/ADV-EMP1-HUMAN-UI-1651/material-legs/LEG-010.md
CURRENT_MATERIAL_LEG: NONE

## Original task / acceptance ledger

- TASK-001 | Live-DOM raw-machine-token regression gate. | SOURCE MERGED. Static/browser coverage remains present. Latest post-merge browser run is invalid for live acceptance because the app never reached the required EMP.1 prepared state. Focused Playwright remains separately NOT_RUN/BLOCKED in custodian environment.
- TASK-002 | Shared identity × value-column renderer; Pressure 5 × 2. | SOURCE MERGED. Static acceptance reports 5 identities × Internal/External = 10 governed cells PASS. Correctly prepared post-merge live confirmation remains pending.
- TASK-003 | Replace append-only waterfall with split-console/equivalent architecture. | LEG-009 owner screenshots = UX FAIL. LEG-010 robust presentation correction MERGED. Latest narrow run does not prove 18 layout defects because its own object reports `app.empirical.active=false` and `activeViewId=WORKSPACE`; correctly prepared post-merge human-factor acceptance remains pending.
- TASK-004 | CAUx staged integration/hardening. | SOURCE MERGED. Latest `CAUx disclosure not found` result is not admitted as an accessibility defect because the runner remained outside required EMP.1/Evidence state. Valid post-merge Enter/Space observation remains pending.
- TASK-005 | Preserve numerical/source/tolerance/sign/axis/route/code/release authority. | PRESERVED. No calculation, route-registry, benchmark-source/tolerance, roadmap, workflow-YAML or release-authority mutation.

## LEG-010 / merge boundary

Fixed material head: `dc2df7a8a8b26feea26d29dbf0741794f788cfac`.

Merged implementation PR #1675 exact head:

```text
661b2b0c0eacb3243e037e5356b6f2188596a3d6
```

Integrated main merge commit / current validation target:

```text
11f655e71a81b0d7ebef42e99792482b434e60db
```

Protected domains remain unchanged: `.github/workflows/**`, calculation core, WRC equations/tables/curves/applicability, Pressure mechanics/source refs, route registry, retained benchmark JSON/tolerance/source authority, roadmap, FEA/LAFEA.3+ mechanics, code/release/deployment authority.

## EP-0021 returned validation evidence

Reported exact HEAD:

```text
11f655e71a81b0d7ebef42e99792482b434e60db
```

Accepted static PASS outputs:

- `emp1-analytical-layout-check/v4` -> `EMP1_SPLIT_CONSOLE_LAYOUT_CHECK_PASS`;
- `emp1-manual-browser-audit-check/v4` -> `PASS_STATIC_SPLIT_CONSOLE_MANUAL_BROWSER_AUDIT_CONTRACT`;
- `emp1-issue1651-acceptance-check/v4` -> `PASS_STATIC_ROBUST_SPLIT_CONSOLE_ACCEPTANCE_MANIFEST_EXECUTABLE_BROWSER_GATES_RETAINED`.

Desktop structured run is not a product PASS or product FAIL:

```text
status = AUDIT_ERROR
EMP1_MANUAL_AUDIT_LAFEA1_DOCUMENT_UNAVAILABLE
```

This establishes that the audit prerequisite was not present.

Narrow object returns:

```text
status = FAIL_CURRENT_VIEWPORT_DOM_OBSERVATION
app.empirical.active = false
activeViewId = WORKSPACE
```

Therefore its 18 later failure entries are classified as `INVALID_STATE_CASCADE / NOT_ADMITTED_AS_INDEPENDENT_PRODUCT_DEFECTS`. Missing Work/Basis/Evidence nodes, shell/Inspector containment, routes, benchmark labels and CAUx disclosure are expected consequences when the runner is not in the EMP.1 application state.

Keyboard result `CAUx disclosure not found` is likewise `INVALID_STATE / NOT_ADMITTED_AS_ACCESSIBILITY_DEFECT`.

The returned text references three screenshots, but no current chat image attachments were available to the custodian and the latest validation-branch diff did not add those files. No screenshot-based PASS/FAIL is recorded at EP-0021.

## Novice validation branch contamination

Branch:

```text
claude/emp1-issue-1651-validation-yqgedz
```

latest observed head:

```text
1dead34196fe781c43b20657377a1cd239309503
```

Compared with integrated main `11f655e71...`: diverged, ahead 3 / behind 158. Net files consist only of three old screenshot artifacts, `VALIDATION_REPORT_EP-0015.md`, and newly added `emp1-validation-audit.mjs`.

The latest repository mutation was not authorized. Inspection of `emp1-validation-audit.mjs` establishes that it:

- uses guessed query-parameter navigation `?view=EMPIRICAL&entity=EMP.1`;
- catches complete-sample button failures and continues;
- reloads again before narrow mode;
- runs the audit even when the required application/sample state is absent.

This runner behavior explains the returned invalid-state cascade. PR #1681 is now CLOSED UNMERGED and must not be used as product-source or acceptance authority.

## Correct post-merge validation prerequisite

The runner must use the rendered application, not a guessed URL state:

1. checkout exact integrated commit `11f655e71a81b0d7ebef42e99792482b434e60db`;
2. start the app;
3. navigate through visible UI to EMPIRICAL -> EMP.1;
4. verify EMP.1 is actually active;
5. click `[SIMULATED] Load complete EMP.1 qualification sample`;
6. verify the complete qualification sample / LAFEA.1 document is visibly present;
7. only then import `manual-audit=4` and run desktop;
8. resize the SAME PREPARED SESSION to 720x900; do not reload through unproven query parameters;
9. run narrow;
10. navigate through rendered Evidence -> Benchmark Evidence and perform actual Enter-open / Space-close on CAUx;
11. return evidence only, with no git mutation.

`seedQualificationPressure: true` is not a sample loader.

## Validation truth

- implementation #1675: MERGED;
- post-merge three static checks: PASS from returned evidence;
- historical Review/LAFEA.2 coherence: supporting PASS retained;
- latest desktop structured browser observation: `AUDIT_ERROR` due missing LAFEA.1 prerequisite;
- latest narrow structured browser observation: FAIL in wrong `WORKSPACE` state; downstream entries not admitted as product defects;
- correctly prepared post-merge desktop+narrow structured acceptance: NOT_RUN;
- valid post-merge screenshots: NOT_RUN / unavailable to custodian in latest return;
- valid actual CAUx Enter/Space observation: NOT_RUN;
- focused Playwright: BLOCKED_ENVIRONMENT / NOT_RUN in custodian environment;
- zero status contexts/workflow runs are not PASS.

## Benchmark / authority ledger

- CAUx retained comparison: 8/8 within frozen 3%; Cu worst relative 2.0355862430856293%; Du worst absolute 26.786740343133943 kPa; governing Du/Du agreement; `engineeringUseAuthorized=false`.
- CAUx remains comparison evidence, not WRC method authority, code compliance, production or release authority.
- PV Elite remains `REFERENCE_NOT_AVAILABLE` / `SOURCE_NOT_RETAINED`, zero rows, no invented expected values/version/tolerance.
- WRC equations/tables/curves/applicability, source polarity/axis authority, Pressure mechanics/source refs, route/code/release authority remain unchanged.

## Roadmap / qualification / authority

ROADMAP: `EMP_TAB_UI_RECOMMENDATIONS.md@d616a4ea014d583c9709a872c3af3896dea9011e`
ROADMAP_ALIGNMENT: STALE_STATUS_BUT_SCOPE_ALIGNED
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
ENGINEERING_STATE: LEG_010_MERGED_POST_MERGE_VALIDATION_PREREQUISITE_FAILED_RERUN_REQUIRED
CUSTODY_STATE: HELD
QUALIFICATION_STATE: NOT_REQUIRED
WRITE_AUTHORITY: READ_ONLY_AWAITING_EXTERNAL_VALIDATION
AUTO_STATE: NOT_APPLICABLE
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE
MERGE_AUTHORIZATION_DISPOSITION: PR_1675_AUTHORIZATION_CONSUMED; NO_AUTHORIZATION_FOR_PR_1690_OR_VALIDATION_ARTIFACTS
HANDOVER_CONTENT_READY: TRUE
HANDOVER_VALIDATION_STATUS: FAIL
CHAIN_HANDOVER_READY: TRUE
HANDOVER_READY: FALSE

CURRENT_BLOCKER: correctly prepared external post-merge validation against `11f655e71a81b0d7ebef42e99792482b434e60db`. No LEG-011 is justified from the latest invalid-state browser run. PR #1690 remains control-plane-only and not merge-authorized.

EXACT_NEXT_ACTION: rerun the 11-step rendered-UI validation prerequisite above in a single prepared browser session and return exact outputs/screenshots without repository mutation.
