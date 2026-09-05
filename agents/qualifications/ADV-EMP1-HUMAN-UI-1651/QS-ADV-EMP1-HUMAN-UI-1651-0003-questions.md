# Qualification Questions — QS-ADV-EMP1-HUMAN-UI-1651-0003

QUALIFICATION_PROTOCOL_VERSION: 3
QUALIFICATION_PROFILE: WRC_LOCAL_STRESS
QUALIFICATION_PROFILE_VERSION: 2
QUALIFICATION_SCOPE_ID: QSCOPE-1651-EMP-ANTI-WATERFALL-LAYOUT
QUESTION_SET_ID: QS-ADV-EMP1-HUMAN-UI-1651-0003
QUALIFICATION_BASIS_HEAD: 8b6e126a5f5a14f99547937cb61c970c91e5b3cd
QUESTION_SET_STATUS: CURRENT
OWNER_QUALIFICATION_BASELINE_DISCOVERY: COMPLETE
OWNER_QUALIFICATION_BASELINE_SOURCE: NONE
OWNER_QUALIFICATION_BASELINE_STATUS: NOT_APPLICABLE

## Q1 — Production Trace

Domain challenge: trace one EMP.1 professional task button from the seven-step workflow to the exact existing engineering surface it lands on, then prove a two-column/equivalent layout can move parent containers without changing task routing or calculation authority.

Exact repository data required: `src/workspace/emp1-professional-workflow-view.js`, `src/workspace/lafea-analytical-calc-content.js`, `src/workspace/lafea-workbench-view.js`, and the current professional-workflow browser specs at the qualification basis.

Concrete payload: use at least Step 4 Load Transfer, Step 6 Local Correlation and Step 7 Review & Evidence. Trace their button event through the existing scroll/navigation helper to the concrete `data-role` / `data-guided-target` target already rendered by `lafea-analytical-calc-content.js`.

Required derivation: identify which layer owns task navigation, which layer owns DOM composition, and which layer owns engineering state. Show why a layout wrapper may relocate an existing section but may not clone, synthesize, filter or re-evaluate it.

First authority boundary: `lafea-analytical-calc-content.js` may decide parent placement only; workflow projections, WRC/benchmark projections and controller state remain the source of truth.

Falsifier: a workflow step lands on a duplicate/stale card, a target disappears because it moved columns, or layout code computes readiness/authorization to decide what evidence to render.

Fail if: the proposed layout solves navigation by duplicating cards into both columns or by introducing a second projection of currentness/authority.

## Q2 — Current Unresolved Problem / Failure Isolation

Domain challenge: isolate the append-only waterfall mechanism and define a stable classification of existing cards into primary engineering work versus engineering basis/evidence without coupling future panels to ad-hoc append order.

Exact repository data required: the full append sequence in `src/workspace/lafea-analytical-calc-content.js`, current `renderEmp1ProfessionalWorkflow(...)` composition, `EMP_TAB_UI_RECOMMENDATIONS.md` §6.4, and issue #1651's retained live walkthrough.

Concrete payload: current analytical content constructs one `.lafea-analytical-calc` shell and appends the workflow plus route/source, stage engineering evidence, custody/availability, bounded-correlation authority, run configuration, transaction/result evidence, settings, results and lineage in one linear sequence. Issue #1651 retained `scrollHeight=9668`, `clientHeight=958` (~10.1 screens) for its measured loaded walkthrough; treat that as retained issue evidence, not a newly re-executed fact.

Required derivation: define a reusable layout contract such as `PRIMARY_WORK` and `ENGINEERING_BASIS` (names may differ) with explicit placement ownership. Classify existing sections by engineer task, not by whichever module appended them last. State which surfaces must remain full-width when a narrow side column would harm reviewability (for example a detailed benchmark comparison table or dense result table).

Predicted intermediate result: desktop composition should stop making every new evidence card lengthen the primary input lane one-for-one; narrow/mobile composition must collapse deterministically to one readable column without hiding content.

First wrong boundary: analytical presentation composition/CSS, not workflow state or WRC result generation.

Falsifier: a new evidence card still requires editing the primary data-entry sequence merely to exist, or the split creates two independent vertical workflows that break task order.

Fail if: the answer is only a CSS `columns`/masonry trick with uncontrolled reading order, or if it hard-codes card text instead of stable roles/placement metadata.

## Q3 — Authority / Invariant

Domain challenge: preserve all current EMP.1/WRC/benchmark authority and accessibility semantics while changing the visual hierarchy.

Exact repository data required: `src/workspace/lafea-analytical-calc-content.js`, `src/workspace/emp1-benchmark-view.js`, `src/workspace/emp1-engineering-evidence-view.js`, `src/workspace/emp1-workbench-run-view.js`, and existing role/currentness attributes used by browser tests.

Concrete payload: CAUx comparison/source qualification may be visible while `engineeringUseAuthorized=false`; PV Elite remains reference unavailable; a current C result may be reportable only when currentness/route authority already says so. Those facts must be identical before/after layout.

Required derivation: state the invariant that every existing authoritative/evidence DOM surface is rendered exactly once from the same projection object and keeps its existing `data-role`, currentness/authorization attributes, button handlers, and accessible order/label semantics. Layout containers may add placement metadata but may not mutate child engineering state.

Protected invariant: `ONE_EXISTING_ENGINEERING_SURFACE -> ONE_RENDERED_INSTANCE_FROM_THE_SAME_PROJECTION`.

Falsifier: moving CAUx/PV Elite or bounded-route evidence changes its status wording/state, a hidden/collapsed column suppresses a blocker, or CSS visual order causes keyboard/screen-reader order to contradict the professional task order.

Invalid shortcut: duplicate the Review/Evidence card in a side rail and hide one copy responsively.

Fail if: any numerical value, currentness decision, WRC route authority, benchmark comparison state, code/release state, or handler ownership changes.

## Q4 — Independent Validation

Domain challenge: prove the layout refactor changes geometry/hierarchy only, not engineering content or workflow reachability.

Exact repository data required: current branch immediately before the layout mutation, current EMP professional browser walkthrough, live DOM roles and governed-input selectors, and responsive viewport test infrastructure.

Concrete payload A — before/after content equivalence: capture a manifest of unique engineer-facing roles/targets and counts on the loaded EMP.1 surface before mutation, including workflow steps, governed input elements, bounded-route evidence, run configuration, current result (when qualified sample is loaded), benchmark panel/comparators, settings/results/lineage and Review & Evidence target. After mutation the same manifest must match except for explicitly new layout wrapper roles.

Concrete payload B — responsive geometry: at a desktop viewport (use the existing 1600×1058 walkthrough basis or a repository-standard equivalent), prove the intended primary and basis lanes have distinct non-overlapping horizontal bounds and both are visible. At a narrow viewport, prove they collapse to one column with DOM/task order preserved and no horizontal clipping of governed tables.

Concrete payload C — navigation: exercise representative professional steps across both placement lanes and prove each target is brought into the viewport once, without duplicate role matches.

Independent oracle: DOM role/cardinality/accessibility geometry and the pre-mutation manifest, not screenshots alone.

Scroll evidence: record pre- and post-mutation `scrollHeight/clientHeight` under the same loaded source and viewport. The issue-retained 9668/958 measurement may be reported for context but must not substitute for a same-environment baseline in the new leg.

Falsifier: role/cardinality drift, duplicate targets, lost inputs/evidence, keyboard order inversion, desktop overlap, mobile clipping, or unchanged append-only primary-lane growth despite a nominal two-column CSS rule.

Fail if: screenshots are the sole oracle or a lower scroll height is achieved by hiding/collapsing required engineering content.

## Q5 — Next Contribution / Minimal Patch

Domain challenge: define the smallest legitimate anti-waterfall material leg after LEG-002.

Exact repository data required: `src/workspace/lafea-analytical-calc-content.js`, the workbench style owner used for analytical cards, `src/workspace/emp1-professional-workflow-view.js`, current walkthrough/browser specs, and issue #1651 acceptance.

Concrete payload: target a stable desktop input/engineering-basis split (or equivalent architecture) that reuses existing card instances. Prefer one composition primitive / placement registry over a series of one-off `append(left)` / `append(right)` patches. Dense result/benchmark tables may remain full-width through an explicit placement class rather than being squeezed into the side lane.

Required derivation: identify the minimum production files required to introduce layout regions and responsive rules, plus focused browser tests for geometry, navigation, cardinality and narrow viewport behavior. Explain why benchmark/WRC renderers themselves should normally remain untouched unless they need placement metadata only.

Safe patch boundary: analytical DOM composition + presentation styles + layout/browser tests. Stable child renderers and controller/core engineering owners remain unchanged.

Expected before/after evidence: same engineering cards, inputs, values, roles, statuses and actions; new stable parent regions; desktop two-lane hierarchy; deterministic single-column mobile fallback; same task navigation; same benchmark/currentness/route authority.

Protected unchanged domains: governed descriptor/edit semantics from LEG-002; pressure mechanics; WRC equations/tables/sign/axis/applicability; route registry; CAUx/PV Elite numerical/custody state; code/release authority; FEA/LAFEA.3+ mechanics; `.github/workflows/**`.

Validation required: pre/post role-cardinality manifest, representative seven-step navigation checks, desktop geometry assertions, narrow-viewport assertions, current benchmark/authority presentation checks, EMP UI checks, and integrated browser/build validation when execution is available.

Negative test: intentionally duplicate or omit one role while distributing cards between regions and prove the manifest gate fails; intentionally force narrow viewport and prove the layout returns to one ordered column.

Rollback/falsifier boundary: if the layout requires moving projection calculation, changing workflow state, duplicating evidence, or changing engineering child APIs beyond placement metadata, stop and redesign.

No-patch condition: if a candidate card cannot be safely placed without changing its engineering ownership or accessible/task order, leave it full-width rather than forcing it into a column.
