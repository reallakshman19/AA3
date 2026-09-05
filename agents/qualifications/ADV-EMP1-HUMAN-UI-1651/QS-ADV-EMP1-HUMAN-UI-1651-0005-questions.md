# Qualification Questions — QS-ADV-EMP1-HUMAN-UI-1651-0005

QUALIFICATION_PROTOCOL_VERSION: 3
QUALIFICATION_PROFILE: WRC_LOCAL_STRESS
QUALIFICATION_PROFILE_VERSION: 2
QUALIFICATION_SCOPE_ID: QSCOPE-1651-EMP-EQUIVALENCE-CLOSURE
QUESTION_SET_ID: QS-ADV-EMP1-HUMAN-UI-1651-0005
QUALIFICATION_BASIS_HEAD: b79a08e317bc51fa42664b2d59f07b4920f183f2
QUESTION_SET_STATUS: CURRENT
OWNER_QUALIFICATION_BASELINE_DISCOVERY: COMPLETE
OWNER_QUALIFICATION_BASELINE_SOURCE: NONE
OWNER_QUALIFICATION_BASELINE_MANIFEST: NONE
OWNER_QUALIFICATION_BASELINE_STATUS: NOT_APPLICABLE

## Q1 — Production Trace

Trace all four issue #1651 acceptance gates through the live EMP.1 browser surface and the existing execution carrier without changing engineering behavior.

Required evidence:
- raw-token gate: `e2e/emp1-human-presentation-tokens.spec.js`;
- governed Pressure 5x2/edit custody: `e2e/lafea-empirical-grouped-edit.spec.js` plus `scripts/emp1-governed-vector-table-check.mjs`;
- anti-waterfall composition: `scripts/emp1-analytical-layout-check.mjs` and `e2e/emp1-analytical-layout.spec.js`;
- benchmark hierarchy/authority: `scripts/emp1-benchmark-evidence-ui-check.mjs` and `e2e/emp1-benchmark-evidence.spec.js`;
- existing carrier: `scripts/lafea-stage17-browser-run.mjs` and `scripts/run-playwright.mjs`.

Required reconstruction: the static checks qualify declaration/placement contracts; Playwright drives the rendered EMP.1 surface and proves the user-visible behavior. The closure layer may aggregate/falsify those contracts but may not replace executable browser checks with source inspection.

Falsifier: the closure script reports PASS without carrying all required focused browser specs, or it imports/mutates engineering core/benchmark data instead of validating test wiring.

## Q2 — Current Unresolved Problem / Failure Isolation

The remaining defect is acceptance-gate drift after the LEG-004 hierarchy move, not an engineering calculation defect.

At the LEG-005 basis, `emp1-human-presentation-tokens.spec.js` scans a fixed list of engineer-facing roles including `emp1-workflow`. Before LEG-004, Benchmark Evidence was a descendant of that workflow and therefore inside the raw-token sweep. LEG-004 deliberately moved the benchmark panel to `FULL_WIDTH_DETAIL`, but the raw-token scan role list was not extended with `emp1-benchmark-evidence-panel`. The benchmark renderer is humanized today, but a future raw machine token in that moved panel could now evade the regression gate.

A second closure gap is accessibility evidence: the CAUx audit `<details>` is tested by mouse click, but keyboard activation and table header/caption semantics are not explicitly falsified.

First wrong boundary: focused acceptance tests/carrier coverage. Production benchmark projection, WRC mechanics, Pressure mechanics, route authority and retained benchmark JSON remain correct boundaries and are NO-PATCH.

Falsifier: fixing closure requires changing calculation state, route authorization, source values, tolerance, or production rendering semantics rather than tests/qualification only.

## Q3 — Authority / Invariant

Closure must preserve the exact authority separation already established.

CAUx invariants:
- 8/8 retained comparison quantities remain within frozen 3%;
- Cu worst relative difference remains `2.0355862430856293%`;
- Du worst absolute difference remains `26.786740343133943 kPa`;
- governing point remains Du/Du agreement;
- comparison state remains `COMPARISON_QUALIFIED` while `engineeringUseAuthorized=false`;
- no WRC method, production, code or release authority is created.

PV Elite invariants:
- `REFERENCE_NOT_AVAILABLE` / `SOURCE_NOT_RETAINED`;
- zero comparison rows;
- no expected values, version or tolerance invented.

Pressure invariant:
- five identities produce ten governed cells = `5 identities x {Internal,External}`;
- `P-EXTERNAL` retains independent source refs and `0 - 1 = -1 MPa` baseline;
- grouped edits preserve undo/redo and do not alter source-reference custody.

Validation invariant: `NOT_RUN` must remain `NOT_RUN` until a faithful local/GitHub execution actually returns success. Static source inspection or zero workflow runs cannot be promoted to executable PASS.

Falsifier: any closure edit touches WRC/Pressure mechanics, benchmark JSON/core projection, route registry, `.github/workflows/**`, or changes authority wording/values merely to satisfy a test.

## Q4 — Independent Validation

Use independent arithmetic, DOM cardinality and accessibility oracles.

Numerical oracle A — CAUx Cu:
`(994.8469658700849 - 975) / 975 * 100 = 2.0355862430856293%` <= frozen `3%`.

Numerical oracle B — CAUx Du:
`1780.786740343134 - 1754 = 26.786740343133943 kPa`; governing reference and EMP.1 locations both `Du`.

Numerical oracle C — benchmark-specific radius/gamma:
`(1844 - 19) / 2 = 912.5 mm`; `912.5 / 19 = 48.026315789473685 ~= 48.03`. This is benchmark-only, not global WRC/corrosion authority.

DOM/interaction oracles:
- raw-token sweep includes the moved `emp1-benchmark-evidence-panel` and still excludes explicit raw/technical regions;
- Pressure = 5 matrix rows, 10 governed inputs, 5 internal + 5 external;
- layout has one workflow, one Primary lane, one Engineering Basis lane, one Full-width detail region, no horizontal overflow at desktop/narrow widths;
- exactly one benchmark panel, two comparators, eight retained CAUx rows and zero PV Elite rows;
- CAUx audit detail is closed initially, its `<summary>` is keyboard-focusable, Enter/Space activation toggles disclosure without changing row count/values/authority state;
- comparison table retains a caption, seven column headers and eight row headers.

Falsifier: any DOM count changes merely because disclosure visibility changes, raw-token coverage shrinks after layout movement, or keyboard activation requires a custom state mutation.

## Q5 — Next Contribution / Minimal Patch

LEG-005 is test/evidence-only closure.

Preferred bounded patch:
1. `e2e/emp1-human-presentation-tokens.spec.js`: include the moved Benchmark Evidence panel in engineer-facing raw-token coverage; do not broaden raw/technical exemptions.
2. `e2e/emp1-benchmark-evidence.spec.js`: add keyboard activation and table semantic/cardinality checks around the existing CAUx `<details>`; do not change renderer behavior.
3. new `scripts/emp1-issue1651-acceptance-check.mjs`: static closure manifest proving the four focused acceptance families and their Stage-17 carrier wiring are present; explicitly fail if required browser carriers disappear.
4. `scripts/lafea-stage17-browser-run.mjs`: run the closure manifest as a Node prerequisite while retaining the four focused Playwright specs.

No production-source patch is required unless a closure falsifier proves an actual product defect.

NO-PATCH: `src/core/**`, WRC equations/tables/sign/axis/applicability, Pressure mechanics/descriptors, benchmark projection/workspace retained values, CAUx/PV Elite JSON/tolerance/source custody, route registration/authorization, code/release/deployment state, roadmap text and `.github/workflows/**`.
