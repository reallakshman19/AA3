# Qualification Questions — QS-ADV-EMP1-BENCHMARK-EVIDENCE-0001

QUALIFICATION_PROTOCOL_VERSION: 3
QUALIFICATION_PROFILE: WRC_LOCAL_STRESS
QUALIFICATION_PROFILE_VERSION: 2
QUALIFICATION_SCOPE_ID: QSCOPE-1633-EMP-BENCHMARK-EVIDENCE
QUESTION_SET_ID: QS-ADV-EMP1-BENCHMARK-EVIDENCE-0001
QUALIFICATION_BASIS_HEAD: ad72465b4359fc660dd68e7cb04a1e091c2fe3b9
OWNER_QUALIFICATION_BASELINE_DISCOVERY: COMPLETE
OWNER_QUALIFICATION_BASELINE_SOURCE: github:reallaksh19/Advanced_Analysis#1261/Appendix-A
OWNER_QUALIFICATION_BASELINE_MANIFEST: agents/chains/ADV-EMP1-BENCHMARK-EVIDENCE/qualification-baselines/QB-ISSUE-1261-A.json
OWNER_QUALIFICATION_BASELINE_STATUS: SATISFIED
QUESTION_SET_ADMISSION_STATUS: PENDING_INDEPENDENT_ADMISSION_ON_TAKEOVER

## Q1 — Production Trace

Domain challenge: Trace one real EMP.1 analytical calculation/evidence route without allowing presentation state to become calculation authority.

Exact repository data required: `src/workspace/lafea-workbench-view.js`, `src/workspace/lafea-analytical-calc-content.js`, `src/core/emp1/emp1-c-bounded-route-registry.js`, current EMP.1 product execution/currentness owners, and the CAUx comparison checker.

Concrete payload: engineer edits `Fx` in EMP.1.A; public layers are `EMP.1.A`, `EMP.1.B`, `EMP.1.C`; current authorized route ID is `EMP1.C.WRC537.CYLINDRICAL.ORIGINAL.GAMMA5.ZERO_DP`; interpolated route ID is `EMP1.C.WRC537.CYLINDRICAL.ORIGINAL.INTERPOLATED_GAMMA.ZERO_DP` with `engineeringUseAuthorized=false`.

Required derivation: Trace the edit through canonical source, A transfer, B screening, C preparation/evaluation/currentness, route-authority snapshot/hash, retained result/assessment, and professional presentation. Identify which existing object should feed a benchmark evidence projection and which objects must never be reconstructed in the UI.

Fail if: the answer skips the A→B→C custody chain, claims the benchmark UI may run WRC, or treats comparison qualification as engineering-use authority.

## Q2 — Current Unresolved Problem / Failure Isolation

Domain challenge: Prove the CAUx comparison state numerically and isolate the first UI/evidence ownership gap.

Exact repository data required: `scripts/emp1-wrc537-caux-interpolated-comparison-check.mjs`, `validation/emp1/caux2017-wrc01f/caux-pp24-31-benchmark-v1.json`, `validation/emp1/caux2017-wrc01f/caux-pp24-31-benchmark-qualification-v1.json`.

Concrete payload: CAUx sustained stress intensity `[511,506,668,529,975,883,1754,1428]` kPa at `[Au,Al,Bu,Bl,Cu,Cl,Du,Dl]`; merged comparison reports EMP.1 approximately `[511,506,676,530,995,899,1781,1446]` kPa; tolerance `3%`; reference rounding half-width `0.5 kPa`.

Calculation/reconstruction: Compute each approximate relative difference, identify the worst point, and verify the governing point from both vectors. Then identify the first missing production/read-model boundary preventing this already-qualified comparison from being rendered as structured EMP benchmark evidence.

Required numerical/technical evidence: eight relative differences, worst absolute relative difference, governing point, and the exact file boundary where structured comparison evidence is currently absent.

Predicted intermediate values: worst difference about `2.0%` at `Cu`; governing point `Du`; all eight inside `3%`.

First wrong boundary: evidence/read-model projection is absent; expected benchmark values and WRC numerics are not the defect.

Falsifier: if any point exceeds the frozen tolerance, the comparator cannot be projected as comparison-qualified and the expected values/tolerance may not be edited to restore status.

Fail if: the answer widens tolerance, changes expected values, or proposes UI-side stress calculation.

## Q3 — Authority / Invariant

Domain challenge: Separate WRC source authority, CAUx benchmark authority, route engineering-use authority, and future PV Elite comparison custody.

Exact repository data required: `docs/emp1/WRC537_2013.pdf` custody records; `validation/emp1/caux2017-wrc01f/**`; `src/core/emp1/emp1-c-bounded-route-registry.js`; issue #1389 source hierarchy.

Concrete payload: WRC source SHA-256 `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`; CAUx SHA-256 `c1e92798a7bc172d649007ad88f6be548651f07a01cb2fbf83343e2283e0e83e`; CAUx pages `24–31`; gamma=5 route authorized; interpolated route not engineering-use authorized.

Required derivation: Build the authority graph `WRC primary source → route/method authority`, `CAUx independent reference → comparison evidence`, `PV Elite future retained report → commercial comparison evidence`, and `UI → projection only`. State the invariant that must remain false for each comparator and one invalid shortcut.

Protected invariant: external benchmark agreement cannot create WRC method authority, engineeringUseAuthorized, code compliance, release qualification, or deployment authority.

Falsifier: changing route authorization or tolerance changes the authority boundary and invalidates this UI/read-model-only patch scope.

Invalid shortcut: infer PV Elite expected values from public documentation/CAUx/EMP output or reuse CAUx 3% tolerance without pre-observation basis.

Fail if: any external comparator is promoted to method authority or code/release PASS.

## Q4 — Independent Validation

Domain challenge: Demonstrate that the evidence shown by the future benchmark UI is independently frozen and non-circular.

Exact repository data required: CAUx benchmark semantic hash `741bfbc21496c2f126dbbeec18b2f88d4424e90a94b1d2cc7444776a16dfb7fe`, handcalc hash `e7e4e7d21188e4b6c1f53c2d7b89a73036a52ccccc61a65fd69c24f6a13ae227`, qualification hash `27e5f468c409071270ceea3a388ee2f33b77f3ea71b02f4cc5b7646c8eca14ef`.

Concrete payload: Au source example `sqrt((0-71)^2 + 4*(253)^2) = 510.956945... kPa → 511 kPa`; eight CAUx sustained stress intensities `[511,506,668,529,975,883,1754,1428]` kPa; frozen comparison tolerance `3%` for edition/method-context difference; source display is integer kPa.

Calculation/reconstruction: Independently reproduce the Au stress intensity arithmetic and explain why ±0.5 kPa is a source-print-resolution bound, not an engineering tolerance. Then specify how a new PV Elite report must be hashed, versioned, extracted and tolerance-frozen before observing its corresponding EMP output.

Independent oracle: CAUx retained source/reference + independent hand calculation; future PV Elite exact retained report/input, never EMP production output.

Units/sign/tolerance: kPa; preserve retained location ordering; tolerance basis must be frozen before production observation.

Falsifier: mutate one expected CAUx value or set `productionOutputUsedToChooseDefinition=true`; projection/checker must fail closed rather than silently show qualified.

Fail if: production output becomes the oracle or PV Elite tolerance is chosen after comparison.

## Q5 — Next Contribution / Minimal Patch

Domain challenge: Define the smallest safe first material leg while active EMP UI PRs own the presentation seam.

Exact repository data required: changed-file inventories for PR #1622, #1624, and #1618; issue #1633 protected paths; current EMP route registry and CAUx artifacts.

Concrete payload: #1622 owns `lafea-workbench-controller.js`, `lafea-analytical-calc-content.js`, `emp1-professional-workflow-view.js`; #1624 owns `emp1-engineering-review-view.js` / workspace; #1618 owns `src/core/emp1/index.js`.

Required derivation: Propose only new `src/core/emp1/emp1-benchmark-evidence-projection.js` and `scripts/emp1-benchmark-evidence-projection-check.mjs` for Leg 1. Define input/output contract, fail-closed states, deep immutability, negative tests, and why `src/core/emp1/index.js` and all UI files remain untouched until overlap resolves.

Safe patch boundary: read-only deterministic benchmark evidence projection; no WRC execution, no expected-value/tolerance mutation, no route authorization, no UI integration.

Expected before/after evidence: before, CAUx comparison exists only as retained benchmark/check output; after, one structured read-model contract can represent CAUx qualified/pending-source states and PV Elite `REFERENCE_NOT_AVAILABLE` without creating authority.

Protected unchanged domains: WRC equations/dataset/Table 5, route registry values, source/applicability/sign/axis owners, all frozen CAUx expected values/tolerances, release/code authority, generic FEA benchmark modules, LAFEA.3+, Load Calc, workflows.

Validation required: focused projection checker, existing CAUx freeze checker, existing CAUx interpolated comparison checker, gamma interpolation checks, import/build/diff hygiene when executable.

Negative test: forged `engineeringUseAuthorized=true`, mismatched freeze hash, missing comparator source, or malformed quantity must fail closed / remain unavailable.

Rollback/falsifier boundary: if structured projection requires importing/rerunning WRC mechanics or duplicating expected/tolerance authority, abandon this design and stop for a different ownership seam.

No-patch condition: if active PR overlap expands into the proposed new core/checker files or current source/route authority changes, do not code; re-ground first.

Fail if: the proposal touches active UI seams, `src/core/emp1/index.js`, generic FEA benchmark code, or protected numerical/authority owners in Leg 1.
