# Qualification Questions — QS-ADV-EMP1-HUMAN-UI-1651-0004

QUALIFICATION_PROTOCOL_VERSION: 3
QUALIFICATION_PROFILE: WRC_LOCAL_STRESS
QUALIFICATION_PROFILE_VERSION: 2
QUALIFICATION_SCOPE_ID: QSCOPE-1651-EMP-BENCHMARK-HIERARCHY
QUESTION_SET_ID: QS-ADV-EMP1-HUMAN-UI-1651-0004
QUALIFICATION_BASIS_HEAD: bb0afdb403818278667cc4ed9dd2c9f7c23f3ee7
QUESTION_SET_STATUS: CURRENT
OWNER_QUALIFICATION_BASELINE_DISCOVERY: COMPLETE
OWNER_QUALIFICATION_BASELINE_SOURCE: NONE
OWNER_QUALIFICATION_BASELINE_MANIFEST: NONE
OWNER_QUALIFICATION_BASELINE_STATUS: NOT_APPLICABLE

## Q1 — Production Trace

Trace CAUx from retained source/custody into the engineer-facing DOM without introducing any new calculation authority.

Exact repository evidence required:
- `validation/emp1/caux2017-wrc01f/caux-pp24-31-benchmark-qualification-v3.json`;
- `validation/emp1/caux2017-wrc01f/caux-pp24-31-comparison-custody-v1.json`;
- `src/core/emp1/emp1-benchmark-evidence-projection.js`;
- `src/workspace/emp1-benchmark-evidence-workspace.js`;
- `src/workspace/emp1-benchmark-view.js`;
- `src/workspace/lafea-analytical-calc-content.js` and the LEG-003 layout registry.

Required reconstruction: source qualification V3 and retained comparison custody are consumed by `projectEmp1BenchmarkEvidenceWorkspace()`, which delegates comparison math to `projectEmp1BenchmarkEvidence()`. The DOM renderer consumes only that workspace projection. The layout layer may place the already-rendered panel but may not execute WRC, recompute differences, choose a tolerance, alter expected values, or derive route authority.

PV Elite must be traced separately from `EMP1_PVELITE_BENCHMARK_PROGRAMME`: `REFERENCE_NOT_AVAILABLE`, `SOURCE_NOT_RETAINED`, zero comparison quantities and null tolerance value must remain source-programme facts, not UI-authored states.

Falsifier: benchmark hierarchy code imports WRC evaluators/core route mutation, computes relative/absolute differences, fabricates PV Elite values, or creates a second benchmark projection path.

## Q2 — Current Unresolved Problem / Failure Isolation

Isolate the remaining hierarchy defect after LEG-003.

Current live composition creates `benchmarkEvidence` in `lafea-analytical-calc-content.js`, passes it into `renderEmp1ProfessionalWorkflow(...)`, and the workflow appends the full Benchmark Evidence panel inside the top workflow card. The CAUx comparator then renders source/freeze/custody tables, route state, an eight-row comparison table and summary in the normal reading flow. LEG-003 makes the workflow full-width first, so this retained benchmark detail still lengthens the orientation/workflow surface even though a dedicated `FULL_WIDTH_DETAIL` region now exists.

Required derivation: distinguish always-visible decision information from deep audit detail. Always-visible information must include comparator identity, comparison/reference state, engineering-use authorization, the explicit non-authority statement, and the PV Elite source-unavailable blocker. Detailed CAUx custody/route identifiers and eight retained comparison rows may use progressive disclosure as long as all rows remain in the DOM and are reachable without changing engineering state.

First wrong boundary: benchmark presentation hierarchy and parent placement, not `emp1-benchmark-evidence-projection.js`, CAUx JSON, WRC execution or route registry.

Falsifier: hierarchy reduction is achieved by deleting benchmark rows, hiding the engineering-use warning, suppressing PV Elite unavailability, or duplicating the panel in workflow and full-width detail.

## Q3 — Authority / Invariant

Prove the UI keeps source/comparison qualification separate from engineering-use/method/code/release authority.

Concrete CAUx facts that must survive verbatim in meaning:
- direct PDF page re-observation = `PASS`;
- benchmark-specific gamma/radius basis = `PASS_RECONCILED`;
- comparison state = `COMPARISON_QUALIFIED`;
- route registered = true;
- comparison qualification available = true;
- route engineering use authorized = false;
- qualification authority fields `wrcMethodAuthority`, `engineeringUseAuthorized`, `productionUseAuthorized`, `codeComplianceAuthorized`, `releaseAuthorityGranted` = false;
- gamma/radius reconciliation may close this benchmark basis but may not establish global corrosion geometry policy.

Concrete PV Elite facts:
- exact report/input/version absent;
- expected values unavailable;
- tolerance unresolved and value null;
- CAUx 3% tolerance may not be copied by default.

Protected invariant: `BENCHMARK_EVIDENCE != METHOD_AUTHORITY != ENGINEERING_USE_AUTHORITY != CODE/RELEASE AUTHORITY`.

A visible word such as “qualified” must remain scoped to source/comparison evidence. The always-visible CAUx status must continue to say engineering use is not authorized.

Falsifier: a generic PASS/qualified badge can reasonably be read as route authorization, PV Elite appears to have a usable comparator result, or collapsed detail contains the only indication that engineering use is unauthorized.

## Q4 — Independent Validation

Use retained arithmetic and DOM cardinality as independent oracles.

Numerical oracle A — Cu worst relative difference:

`(994.8469658700849 - 975) / 975 * 100 = 2.0355862430856293 %`

This is within the frozen 3% comparison tolerance. The UI may format the number but may not recompute or widen the tolerance.

Numerical oracle B — Du worst absolute difference and governing agreement:

`1780.786740343134 - 1754 = 26.786740343133943 kPa`

The retained governing reference point and EMP.1 point are both `Du`; agreement is true.

Independent source/geometry check:

`(1844 - 19) / 2 = 912.5 mm`, and `912.5 / 19 = 48.026315789473685 ≈ 48.03`.

That closes only the CAUx benchmark-specific gamma/radius basis; it cannot establish a global corrosion/radius rule or WRC method authority.

DOM oracle after LEG-004:
- exactly one `emp1-benchmark-evidence-panel`;
- exactly two comparator sections, CAUx and PV Elite;
- exactly eight CAUx comparison rows still exist;
- CAUx summary shows 8/8 within frozen tolerance, worst relative Cu and governing Du/Du agreement;
- CAUx authority warning is visible while detailed comparison disclosure is closed;
- PV Elite has zero comparison rows and visibly states reference unavailable;
- benchmark panel is a `FULL_WIDTH_DETAIL` layout surface and is no longer a descendant of `emp1-workflow`;
- opening/closing audit detail changes visibility only, not row values, counts, route state or authority wording.

## Q5 — Next Contribution / Minimal Patch

LEG-004 must be the smallest benchmark/evidence-hierarchy hardening patch that builds on #1633/#1645 and LEG-003.

Preferred production boundary:
1. `emp1-professional-workflow-view.js`: stop owning/rendering the benchmark panel; retain Review & Evidence fallback navigation to `emp1-benchmark-evidence-panel`.
2. `lafea-analytical-calc-content.js`: render exactly one benchmark panel from the existing workspace projection and pass that node to the analytical compositor.
3. `emp1-analytical-layout.js`: add one explicit `benchmarkEvidence` surface in `FULL_WIDTH_DETAIL`; do not repurpose the existing optional `benchmark` host surface.
4. `emp1-benchmark-view.js`: keep comparator/status/authority/PV-Elite-unavailable information visible; put only deep CAUx custody/route/comparison detail behind a semantic `<details>` disclosure.
5. focused static/browser checks and existing Stage-17 carrier only; no workflow YAML change.

Required negative controls:
- duplicate benchmark node supplied to two layout keys -> compositor rejects it;
- missing benchmark surface key -> exact surface contract rejects it;
- CAUx detail closed -> authority warning and engineering-use unauthorized status remain visible;
- PV Elite detail cannot acquire rows, version, expected values or tolerance without retained source data.

NO-PATCH: benchmark projection/core math, CAUx benchmark/qualification/comparison JSON, WRC equations/tables/sign/axis/applicability, route registry or `engineeringUseAuthorized`, Pressure/governed edit semantics, code/release/deployment authority, FEA/LAFEA.3+ mechanics, roadmap text, and `.github/workflows/**`.
