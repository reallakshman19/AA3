# Qualification Questions — QS-ADV-EMP1-HUMAN-UI-1651-0006

QUALIFICATION_PROTOCOL_VERSION: 3
QUALIFICATION_PROFILE: WRC_LOCAL_STRESS
QUALIFICATION_PROFILE_VERSION: 2
QUALIFICATION_SCOPE_ID: QSCOPE-1651-EMP-TASK-SHELL-RECOVERY
QUESTION_SET_ID: QS-ADV-EMP1-HUMAN-UI-1651-0006
QUALIFICATION_BASIS_HEAD: 0de2ec698b9dd44c65fded79f5eb935ddd24489b
QUESTION_SET_STATUS: CURRENT
OWNER_QUALIFICATION_BASELINE_DISCOVERY: COMPLETE
OWNER_QUALIFICATION_BASELINE_SOURCE: NONE
OWNER_QUALIFICATION_BASELINE_MANIFEST: NONE
OWNER_QUALIFICATION_BASELINE_STATUS: NOT_APPLICABLE
RECOVERY_CHILD_ISSUE: 1664
PARENT_ISSUE: 1651

## Q1 — Production Trace

Repository anchors:
- `src/workspace/lafea-analytical-calc-content.js::renderLafeaAnalyticalCalcContent(...)`;
- `src/workspace/emp1-professional-workflow-view.js::renderEmp1ProfessionalWorkflow(...)`;
- `src/workspace/emp1-professional-workflow-presentation.js::EMP1_PROFESSIONAL_WORKFLOW_STEPS`;
- `src/workspace/emp1-analytical-layout.js::composeEmp1AnalyticalLayout(...)`;
- `src/workspace/emp1-analytical-layout-styles.js`;
- `e2e/emp1-analytical-layout.spec.js`.

Production object/case:
- live EMP.1 analytical workbench on the `LAFEA.1` backing stage, using the same seven professional steps and existing rendered A/B/C/evidence surfaces shown in Owner full-page evidence and recovery issue #1664.

Required technical work:
- trace the DOM from `renderLafeaAnalyticalCalcContent` through workflow creation and surface composition;
- enumerate which surfaces currently remain in normal document flow for the `LAFEA.1` case and identify which of them are primary task work, supporting authority/custody, or heavy evidence;
- explain how workflow button navigation maps `BASIS_SOURCE`, `GEOMETRY`, `LOADS`, `LOAD_TRANSFER`, `SECTION_SCREENING`, `LOCAL_CORRELATION`, and `REVIEW_EVIDENCE` to backing stages/target roles without creating calculation authority.

Required technical evidence:
- current layout is structurally `WORKFLOW -> PRIMARY_WORK | ENGINEERING_BASIS -> FULL_WIDTH_DETAIL`;
- `FULL_WIDTH_DETAIL` may retain `screeningCustody`, `correlationResult`, `results`, `benchmarkEvidence`, and `benchmark`, so a local two-column lane does not bound total document depth;
- workflow itself contains readiness, seven step controls, currentness/authority, optional review, authority boundary, and technical backing disclosure.

First authority/ownership boundaries:
- presentation may move/hide/show already-rendered nodes and alter navigation state;
- WRC/Pressure mechanics, source/benchmark values, route authorization, code/release state and workflow YAML remain protected.

Fail if:
- the trace reduces the defect to CSS width alone, ignores the full-width evidence stack, or proposes cloning/recomputing engineering surfaces.

## Q2 — Current Unresolved Problem / Failure Isolation

Repository anchors:
- issue #1651 Finding 1 baseline (`scrollHeight=9668`, `clientHeight=958`);
- recovery issue #1664 RCA;
- `src/workspace/emp1-analytical-layout.js` placement manifest;
- `e2e/emp1-analytical-layout.spec.js::regionGeometry(...)`.

Calculation/reconstruction:
- reconstruct the original live depth ratio: `9668 / 958 = 10.091858037578289` viewport-heights;
- distinguish horizontal geometry success from vertical task-focus failure;
- for the foundation (`LAFEA.1`) case, identify that `screeningCustody` and `correlationAvailability` may be null while `correlationResult`, `results`, `benchmarkEvidence`, and optional `benchmark` still occupy the permanent full-width sequence, in addition to the large workflow and two-column lanes.

Required technical evidence:
- a CSS-only gap/column adjustment cannot guarantee that inactive tasks or unselected evidence contribute zero layout height;
- the recovery requires a presentation state that leaves at most one heavy evidence view participating in layout and prevents inactive professional-task bodies from accumulating below the active task.

Predicted intermediate values / structural oracles:
- professional workflow navigation control count remains exactly 7;
- visible heavy evidence views in the task-shell workspace must be `<= 1`;
- hidden/unselected heavy evidence surfaces must remain present for custody but have zero rendered layout contribution (`hidden`/equivalent), not be duplicated or recalculated;
- adding an unselected evidence surface must not change active-task region height beyond a 1 px measurement tolerance.

First wrong boundary:
- information architecture / presentation composition, not engineering calculation or benchmark authority.

Falsifier:
- if the recovery still leaves all results/lineage/benchmark/verification surfaces expanded in normal flow, TASK-003 remains failed regardless of whether two columns exist.

Fail if:
- the answer proposes only smaller padding/font sizes, another wider grid, deletion of evidence, or changes to engineering state.

## Q3 — Authority / Invariant

Repository anchors:
- `src/workspace/emp1-benchmark-view.js`;
- `e2e/emp1-benchmark-evidence.spec.js`;
- `e2e/lafea-empirical-grouped-edit.spec.js` Pressure qualification;
- `src/workspace/emp1-professional-workflow-view.js` authority/readiness projections;
- issue #1651 / recovery #1664 authority boundaries.

Required technical work:
- define what presentation state may control and what remains owned by engineering/source contracts;
- show how compact navigation, a basis rail and evidence tabs/disclosures can preserve source/authority visibility without promoting or suppressing engineering truth.

Authority/source trace and protected invariants:
- CAUx remains 8/8 within frozen 3%, Cu worst relative `2.0355862430856293%`, Du worst absolute `26.786740343133943 kPa`, governing Du/Du agreement, `engineeringUseAuthorized=false`;
- PV Elite remains `REFERENCE_NOT_AVAILABLE` / `SOURCE_NOT_RETAINED`, zero comparison rows, with no inferred version/expected values/tolerance;
- Pressure remains 5 identities × Internal/External = 10 governed cells in the qualification case, including independent `P-EXTERNAL` source refs and `0 - 1 = -1 MPa`;
- workflow/readiness/review remain presentation projections and do not establish method/applicability/code/release authority.

First wrong boundary:
- presentation-shell visibility/selection state.

Falsifier:
- any UI selection changes numerical values, source refs, currentness, route authorization, retained comparison state, code-compliance state or release state.

Invalid shortcut:
- hide all authority/readiness warnings permanently to reduce page height, delete retained evidence nodes, or replace governed nodes with summary copies that can drift from the owning source.

Fail if:
- the proposed recovery weakens an authority warning, invents benchmark data, or changes protected mechanics to satisfy UX tests.

## Q4 — Independent Validation

Repository anchors:
- Owner live full-page evidence summarized in #1664;
- `e2e/emp1-analytical-layout.spec.js`;
- `e2e/emp1-benchmark-evidence.spec.js`;
- `e2e/emp1-human-presentation-tokens.spec.js`;
- `scripts/emp1-manual-browser-audit.js`.

Required technical work:
- define an independent DOM/geometry oracle that can reject the giant-waterfall failure even when the old side-by-side geometry assertions pass.

Independent oracle / required evidence:
1. Existing baseline arithmetic: `9668 / 958 = 10.091858037578289` viewport-heights demonstrates the prior live problem magnitude.
2. Task-focus: exactly one active-task region is visible; inactive task panels do not contribute layout height.
3. Workflow: exactly 7 compact professional-step controls remain available; the large readiness/custody detail is collapsed/on-demand by default.
4. Evidence: at most one heavy evidence view is visible; selecting Benchmark does not duplicate CAUx/PV Elite nodes and selecting another evidence tab removes Benchmark from layout while preserving its DOM custody.
5. Geometry: desktop active-task + basis rail are side-by-side; narrow view stacks them without horizontal overflow.
6. Vertical-growth falsifier: inserting/retaining an additional unselected evidence panel changes the active-task shell/document depth by no more than 1 px because unselected evidence is out of layout flow.
7. Existing raw-token, Pressure 5×2 and benchmark authority/cardinality assertions remain intact.

Units/sign/tolerance:
- geometry comparisons use CSS pixels with `<=1 px` tolerance where browser rounding applies;
- no numerical-engineering tolerance is changed.

Falsifier:
- the shell can pass while two or more heavy evidence views are simultaneously visible, inactive task bodies add height, or benchmark selection changes engineering authority/cardinality.

Fail if:
- production output is used as its own oracle without structural/geometry checks, or a visual-only screenshot replaces executable DOM assertions.

## Q5 — Next Contribution / Minimal Patch

Repository anchors:
- `src/workspace/emp1-analytical-layout.js` / `emp1-analytical-layout-styles.js`;
- `src/workspace/emp1-professional-workflow-view.js`;
- `src/workspace/lafea-analytical-calc-content.js`;
- `e2e/emp1-analytical-layout.spec.js`;
- `scripts/emp1-analytical-layout-check.mjs`;
- recovery issue #1664.

Required technical work:
- identify the smallest presentation-only boundary that can convert permanent stacked evidence into task-shell state while preserving existing rendered nodes and all engineering authority.

Safe patch boundary:
- compact the professional workflow into persistent navigation/status with detailed readiness/custody on demand;
- evolve the compositor from permanent `FULL_WIDTH_DETAIL` stacking to explicit task-shell regions (`COMPACT_WORKFLOW_NAV`, `ACTIVE_TASK`, `BASIS_RAIL`, `EVIDENCE_WORKSPACE` or equivalent);
- keep existing surface objects unique and move them rather than clone them;
- make heavy evidence selectable so only one view contributes layout height;
- add vertical/task-focus falsifiers before considering TASK-003 recovered.

Expected before/after evidence:
- before: local two-column lane plus permanently stacked workflow/full-width evidence; live UX FAIL;
- after: one active task body, compact basis/authority context, one selected evidence view, no hidden evidence height contribution, preserved seven-step navigation and existing authority/cardinality contracts.

Protected unchanged domains:
- WRC equations/tables/curves/sign/axis/applicability;
- Pressure mechanics/descriptors/source custody;
- benchmark JSON/projection numerical values and tolerance/source authority;
- route registration/`engineeringUseAuthorized`;
- code/release/deployment state;
- roadmap text and `.github/workflows/**`.

Validation required:
- focused static layout/task-shell contract;
- browser task-focus/vertical-growth/desktop+narrow checks;
- existing raw-token, Pressure 5×2 and benchmark browser contracts;
- `npm run check:imports`, build truth, and `git diff --check` when executable.

Negative test:
- add/retain an extra unselected evidence surface and prove it does not increase visible document depth or create a second visible heavy evidence panel.

Rollback/falsifier boundary:
- if task-shell selection requires duplicating governed nodes, changing controller calculation state, or hiding required authority with no accessible disclosure, stop and redesign the presentation boundary.

No-patch condition:
- no engineering-core, retained benchmark/source, route-authority, code/release, roadmap or workflow-YAML patch is justified by this UX recovery.

Fail if:
- the proposed first patch is a spacing-only tweak, creates parallel copies of governed surfaces, or makes passing vertical-depth tests depend on deleting engineering evidence.
