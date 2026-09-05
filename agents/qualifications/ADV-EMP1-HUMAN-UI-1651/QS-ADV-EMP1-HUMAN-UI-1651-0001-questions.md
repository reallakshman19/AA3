# Qualification Questions — QS-ADV-EMP1-HUMAN-UI-1651-0001

QUALIFICATION_PROTOCOL_VERSION: 3
QUALIFICATION_PROFILE: WRC_LOCAL_STRESS
QUALIFICATION_PROFILE_VERSION: 2
QUALIFICATION_SCOPE_ID: QSCOPE-1651-EMP-HUMAN-PRESENTATION
QUESTION_SET_ID: QS-ADV-EMP1-HUMAN-UI-1651-0001
QUALIFICATION_BASIS_HEAD: b4eb0cea9a7a73ddaec86210373ed6f3acb714eb
QUESTION_SET_STATUS: CURRENT
OWNER_QUALIFICATION_BASELINE_STATUS: NOT_APPLICABLE

## Q1 — Production Trace

Domain challenge: trace one current machine-state value from retained/core evidence to engineer-visible EMP.1 text without allowing the renderer to become engineering authority.

Exact repository data required: `src/workspace/emp1-benchmark-evidence-workspace.js`, `src/workspace/emp1-benchmark-view.js`, `src/workspace/emp1-plain-language-labels.js`, `src/workspace/emp1-professional-workflow-view.js`, and `src/workspace/lafea-analytical-calc-content.js` at `b4eb0cea9a7a73ddaec86210373ed6f3acb714eb`.

Concrete payload: trace at least `REFERENCE_NOT_AVAILABLE`, `SOURCE_NOT_RETAINED`, `INDEPENDENT_BENCHMARK_REFERENCE_NOT_WRC_METHOD_AUTHORITY`, and the CAUx route's `engineeringUseAuthorized=false` from their owning projection/programme data through workspace composition to final DOM text.

Required derivation: identify which layer owns the semantic state, which layer may translate it to human language, and which layer must remain incapable of changing route/benchmark/WRC authority. State one falsifier proving presentation has become authority-bearing or circular.

Fail if: the answer proposes deriving route authorization, tolerance, expected values, WRC coefficients, or code/release state from DOM/presentation values.

## Q2 — Current Unresolved Problem / Failure Isolation

Domain challenge: prove why the current plain-language mechanism regresses when a new panel is added and isolate the first safe fix boundary.

Exact repository data required: `src/workspace/emp1-plain-language-labels.js` and `scripts/emp1-plain-language-labels-check.mjs` at the qualification basis, plus the current PV Elite and bounded-route rows in `src/workspace/emp1-benchmark-view.js` / EMP.1 evidence presentation.

Concrete payload: the current checker manually lists observed codes; `emp1PlainLanguageLabel('SOME_FUTURE_CODE')` intentionally degrades to `SOME FUTURE CODE`. The issue-observed raw values include `REFERENCE_NOT_AVAILABLE`, `SOURCE_NOT_RETAINED`, `REQUIRED_FROM_RETAINED_SOURCE`, `UNRESOLVED_MUST_FREEZE_BEFORE_EMP_OBSERVATION`, and `PROHIBITED`.

Required derivation: show how a newly rendered enum can bypass the hand-maintained list while still producing visible text, then define a live-DOM falsifier that fails outside a designated raw/technical region while allowing legitimate abbreviations such as WRC, ASME, PDF and SHA-256.

Fail if: the proposed detector treats all uppercase engineering abbreviations as defects, or if unknown normal-UI codes still silently degrade to underscore-stripped machine text.

## Q3 — Authority / Invariant

Domain challenge: separate engineer-facing wording from WRC/benchmark/source authority.

Exact repository data required: `validation/emp1/caux2017-wrc01f/caux-pp24-31-benchmark-qualification-v3.json`, `src/workspace/emp1-benchmark-evidence-workspace.js`, route-registry state consumed by that workspace, and issue #1651 no-numerical-change boundary.

Concrete payload: qualification V3 has `directPdfPageReobservation=PASS`, `gammaRadiusBasisForThisBenchmark=PASS_RECONCILED`, while `wrcMethodAuthority=false`, `engineeringUseAuthorized=false`, `productionUseAuthorized=false`, `codeComplianceAuthorized=false`, and `releaseAuthorityGranted=false` for the CAUx benchmark qualification.

Required derivation: explain why presentation may say “Source re-verification: Verified” and “Comparison qualified” while still saying “Engineering use not authorized”, and why this cannot be shortened to a single generic PASS.

Falsifier: any UI transformation that turns comparator/source PASS into route engineering authorization, code compliance or release qualification.

Invalid shortcut: hiding the distinction by moving all authority text into raw/advanced JSON only.

## Q4 — Independent Validation

Domain challenge: independently reproduce two retained CAUx facts that the UI programme must not change.

Exact repository data required: CAUx retained benchmark/comparison/qualification artifacts, not production EMP/WRC evaluators.

Concrete payload A: Cu reference = 975 kPa and EMP.1 = 994.8469658700849 kPa. Required derivation: `(994.8469658700849 - 975) / 975 * 100 = 2.0355862430856293%`, which is within the frozen 3% comparison tolerance.

Concrete payload B: CAUx geometry reports OD 1844 mm, nominal shell thickness 22 mm, internal corrosion allowance 3 mm, assessment thickness 19 mm. Required derivation: same-state mean radius `(1844 - 19)/2 = 912.5 mm`; `912.5/19 = 48.026315789473685`, which rounds to displayed gamma 48.03 for this benchmark only.

Independent oracle: retained CAUx frozen/source-qualified artifacts and arithmetic above.

Units/sign/tolerance: preserve kPa and percent for comparison quantities; the gamma/radius reconciliation may close this benchmark basis only and must not establish a global WRC corrosion-geometry policy.

Falsifier: any UI change alters frozen expected values/tolerance, changes the eight-point governing agreement, or promotes the benchmark-specific radius reconciliation into general WRC method authority.

## Q5 — Next Contribution / Minimal Patch

Domain challenge: define the smallest legitimate first material leg for issue #1651.

Exact repository data required: current label registry/check, existing Playwright runner/spec patterns, benchmark view/workspace, project `package.json`, and current `check:emp1-ui` composition.

Concrete payload: first leg targets the raw-token regression only; later Pressure matrix and two-column layout are separate material legs. The existing normal UI currently permits machine-shaped values through unmapped fallback; advanced/raw regions may retain exact IDs.

Required derivation: name the smallest production/test seam that (a) makes engineer-facing mapping explicit/fail-closed for normal UI, (b) designates technical/raw regions semantically, and (c) adds a focused live-DOM Playwright sweep without changing WRC/benchmark calculations.

Safe patch boundary: EMP presentation label/renderer attributes and EMP-only tests/check orchestration required for that behavior.

Expected before/after evidence: before, known raw values can appear in normal UI; after, human labels appear and the browser gate fails when a seeded raw enum/dotted identifier escapes the designated technical region.

Protected unchanged domains: WRC equations/tables/sign/axis/applicability, route registry/authorization, CAUx expected values/tolerance/history, PV Elite synthetic values, code/release/deployment authority, `.github/workflows/**`, and unrelated LAFEA/FEA/Load Calc surfaces.

Validation required: focused label check, focused Playwright raw-token spec, current EMP UI checks, benchmark evidence UI check where touched, import/build/diff checks if execution is available.

Negative test: intentionally inject or expose one unmapped machine token in normal UI and prove the live-DOM gate rejects it; the same exact identifier inside an explicitly designated technical/raw region must be allowed.

Rollback/falsifier boundary: if strict mapping requires changing semantic source enums or engineering authority data rather than presentation, stop and redesign the seam.

No-patch condition: if the target raw token is itself a required engineer-facing standard abbreviation or controlled technical identifier explicitly designated for advanced/audit display, do not humanize its underlying stored value; change only its presentation placement/labeling if necessary.
