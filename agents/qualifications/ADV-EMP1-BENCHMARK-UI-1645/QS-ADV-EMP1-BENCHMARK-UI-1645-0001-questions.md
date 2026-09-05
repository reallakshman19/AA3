# Qualification Questions — QS-ADV-EMP1-BENCHMARK-UI-1645-0001

QUALIFICATION_PROTOCOL_VERSION: 3
QUALIFICATION_PROFILE: WRC_LOCAL_STRESS
QUALIFICATION_PROFILE_VERSION: 2
QUALIFICATION_SCOPE_ID: QSCOPE-1645-EMP-BENCHMARK-PRESENTATION
QUESTION_SET_ID: QS-ADV-EMP1-BENCHMARK-UI-1645-0001
QUALIFICATION_BASIS_HEAD: eabb93cd44c59ce182d73284cb707653917e07c8
OWNER_QUALIFICATION_BASELINE_DISCOVERY: COMPLETE
OWNER_QUALIFICATION_BASELINE_SOURCE: NONE
OWNER_QUALIFICATION_BASELINE_STATUS: NOT_APPLICABLE
QUESTION_SET_ADMISSION_STATUS: VALID_OWNER_ADMITTED
OWNER_ADMISSION_COMMAND: "qualified, proceed next"
OWNER_ADMISSION_AT: 2026-09-05T02:35:08Z
CANDIDATE_SELF_ADMISSION: FALSE

## Q1 — Production Trace

Trace the retained CAUx comparison from `validation/emp1/caux2017-wrc01f/caux-pp24-31-comparison-custody-v1.json` and `caux-pp24-31-benchmark-qualification-v3.json` through the existing `projectEmp1BenchmarkEvidence()` read-model contract to the proposed EMP.1 Review & Evidence workspace/view seam. Identify every layer that may validate/compose evidence and every layer forbidden from running WRC equations, selecting tolerance, authoring route authority, or regenerating values. Include the current professional workflow/analytical-content integration anchor and one falsifier proving the trace has become circular or UI-authored.

Required live evidence: core benchmark projection/custody contracts, retained CAUx custody, qualification V3, `lafea-analytical-calc-content.js`, `emp1-professional-workflow-view.js`, and current #1622 overlap.

## Q2 — Current Unresolved Problem / Failure Isolation

Explain why the data layer is complete enough for CAUx presentation but the UI remains absent. Isolate the historical custody field that still records direct observation as pending versus qualification V3 that supersedes source-verification state with PASS. Define the first correct composition owner that may reconcile historical execution custody with later source qualification without rewriting history. Also isolate #1622/#1624 exact-file overlap and state why a naive direct UI patch would create concurrency risk.

Falsifiers: rewriting retained comparison custody to make history look current; rendering stale `DIRECT_PDF_REOBSERVATION_PENDING` as current; or mutating #1622/#1624-owned review/controller files without explicit reconciliation.

## Q3 — Authority / Invariant

Build the authority graph separating controlled WRC method authority, CAUx independent benchmark/reference authority, retained EMP comparison execution custody, route registration/comparison qualification, engineering-use authorization, and UI presentation. Preserve the invariant that the interpolated route is registered and comparison-qualified while `engineeringUseAuthorized=false`. Show why `COMPARISON_QUALIFIED` cannot imply WRC method authority, code compliance, production authorization, release qualification, deployment authority, cryptographic signature, or professional seal.

Protected invariant: `EXTERNAL_BENCHMARK_EVIDENCE_MAY_INCREASE_CONFIDENCE_BUT_CANNOT_CREATE_WRC_METHOD_OR_ENGINEERING_USE_AUTHORITY`.

## Q4 — Independent Validation

Using only the retained CAUx reference/EMP values, independently recompute comparison quantities without importing production EMP/WRC evaluators. At minimum reproduce:

- Cu relative difference: `(994.8469658700849 - 975) / 975 * 100 = 2.0355862430856293%`;
- Du absolute difference: `1780.786740343134 - 1754 = 26.786740343133943 kPa`;
- all eight recovery points are within frozen 3%; and
- governing location is Du for both CAUx and EMP.1.

Then define negative controls: unit mismatch, route-state mismatch, forged authority flag, missing quantity, non-frozen tolerance, and PV Elite missing source. The browser/view must display retained/projected quantities rather than recomputing engineering results.

## Q5 — Next Contribution / Minimal Patch

Define the smallest reviewable patch for #1645. Preferred new owners are `src/workspace/emp1-benchmark-evidence-workspace.js`, `src/workspace/emp1-benchmark-view.js`, a focused UI checker, and an EMP-only browser spec, with only the minimal current Review & Evidence integration seams after #1622 reconciliation. Preserve #1622 review/run-failure/plain-language behavior and #1624 review/export ownership.

Explicit NO-PATCH: WRC evaluators/tables/sign/axis/source/applicability authority, route registry/executor authorization, benchmark expected values/tolerance, retained CAUx history, PV Elite invented reference values, generic FEA/LAFEA.3+/Load Calc surfaces, code/release/deployment authority, `.github/workflows/**`, and unrelated UI redesign.

Abort if implementing presentation requires any prohibited owner or if the target integration seam remains concurrently owned and unreconciled.
