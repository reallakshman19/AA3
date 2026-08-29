# Relay Qualification Question Set — BM4_L rotation/end-action parity

QUALIFICATION_PROTOCOL_VERSION: 3
QUALIFICATION_PROFILE: FEA
PURPOSE: QUALIFICATION_ONLY
NOT_AN_IMPLEMENTATION_TASK: TRUE
QUESTION_SET_ADMISSION_REQUIREMENT: REQUIRED_ON_TAKEOVER
CHAIN_ID: ADV-LAFEA-BM4L-ROTATION-PARITY
ENDPOINT_ID: NOT_YET_ALLOCATED — new-chain qualification bootstrap
QUESTION_SET_ID: QS-ADV-LAFEA-BM4L-ROTATION-PARITY-0003
QUALIFICATION_BASIS_HEAD: ac9b2e2aee61e020620ae694fa36962c3632a8ca
QUESTION_SET_STATUS: PENDING_ADMISSION
QUESTION_AUTHOR_ID: /root/qset2_author
QUESTION_SET_AUTHOR: /root/qset2_author
COMMON_PROTOCOL: engineering-pr-delivery-v2
COMMON_PROTOCOL_BASIS: 9573ec2bba234cc7cd6abcf73c4c3f3e2bc0892c

## Q1 — Production Trace

Domain challenge: Trace and numerically reconstruct one actual BM4_L source-element end action through model preparation, assembly, solve, recovery, transformation, source-chain selection, adapter mapping, and comparison.

Exact repository data required: BM4_L `IXP-WP -> L6`; ACCDB `INPUT_BASIC_ELEMENT_DATA.ELEMENTID=13`, `20160->20240`; comparator row `GLOBAL_END_FORCE_FROM/FX`; the current `BM4_L.ACCDB` hash; and the exact production objects, element IDs, node IDs, axes, offsets, DOF order, case primitives, and function boundaries resolved from the pinned head.

Production object/case: BM4_L production case `IXP-WP`, mapped CAESAR case `L6`, ACCDB source element 13 (`20160->20240`), and `GLOBAL_END_FORCE_FROM/FX`.

Repository anchors: `benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB`; `scripts/lfea-production-caesar-parity-check.mjs` (`buildSourceElementChains`); `scripts/lib/lfea-production-benchmark-actual.mjs` (`buildProductionBenchmarkActual`, `appendElementEndRows`); `src/core/linear-piping-analysis-consumer/inputxml-linear-production-executor.js`; `src/core/linear-piping-analysis-consumer/inputxml-linear-element-authorities.js` (`compileInputXmlLinearElementAuthorities`); `src/core/linear-piping-analysis-consumer/inputxml-linear-production-recovery.js`; and `src/core/linear-fea-result-recovery/element-end-actions.js` (`recoverElementEndAction`).

Required technical work: Run the production parity harness freshly at the qualification basis; do not treat an existing cache as evidence. Starting at raw ACCDB element 13, identify its exact production analysis-element chain and demonstrate why the reported FROM action is the outer I end rather than an interior bend chord. Trace the governing physical case primitives into the solved joint vector and retained element contribution, then through local recovery and global reporting.

Required numerical/technical evidence: Reproduce the current CAESAR/reference value near `-10.3010044098 N`, production value near `-207.741779704 N`, and `rawRelativeError` near `19.1671382`. For the selected production element provide the 12-DOF global joint displacement, transformed local displacement, `K_eff d_local`, `f_equivalent`, `f_initial`, and an independent componentwise reconstruction of `q_local = K_eff d_local - f_equivalent - f_initial`. Transform the retained I-end six-vector through the actual local axes and any rigid-offset moment transport to the global vector, and prove how its FX reaches the comparator row.

First authority/ownership boundaries: The real ACCDB CAESAR OUTPUT rows are the cross-solver oracle. Production assembly, solve, recovery, source-chain selection, adapter mapping, and comparator classification are separate ownership boundaries. State the force-on-element versus force-on-joint convention and I/J ordering at each boundary.

Fail if: The row is not reproducible from fresh raw retained quantities; production output is used as its own oracle; a sign or end convention is assumed; an interior chord is substituted for the source outer end; or equilibrium alone is presented as end-action magnitude parity.

## Q2 — Current Unresolved Problem / Failure Isolation

Domain challenge: Isolate the first wrong FEA boundary by decomposing the matched cases into W, P1, and T1 families and by testing whether arc-bearing source segments E33/E36 lose exact bend ownership at the component-eligibility gate.

Exact repository data required: Every matched `comparison.rows` entry for `W=L2`, `P1=L6-L2`, and `T1=L5-L6`; both source ends of ACCDB elements 13–17; node `22120/RX`; source/topology/analysis records for `ACCDB.E33` and `ACCDB.E36`; all E33/E36 produced chord IDs; node `20295` incidence; and the exact baseline versus diagnostic bend/tee ownership records and case metrics obtained at the pinned head.

Calculation/reconstruction: Form W, P1, and T1 component values separately for CAESAR and production, then calculate source-end force/moment vector-relative errors for both ends of elements 13–17 and the family-wise rotation-vector error at node 22120. Independently count the >5% substantial-reference tail by quantity. For E33/E36, compare their source-local `K`, `f_equivalent`, `f_initial`, solved `u`, recovered `q_local`, transformed/offset `q_global`, and adapter rows before and after changing only the eligibility predicate in a read-only diagnostic.

Repository anchors: `scripts/lfea-production-caesar-parity-check.mjs`; `scripts/lib/lfea-production-benchmark-actual.mjs`; `src/core/linear-piping-analysis-consumer/bend-retopology.js`; `src/core/linear-piping-analysis-consumer/bend-retopology-contract.js` (`ARC_BEARING_COMPONENT_TYPES`); `src/core/linear-piping-analysis-consumer/production-capability-profile.js` (`productionBendSourceEligible`); `src/core/linear-piping-analysis-consumer/inputxml-production-bend-components.js`; `src/core/linear-piping-analysis-consumer/inputxml-production-branch-modifiers.js`; `src/core/linear-piping-analysis-consumer/inputxml-linear-element-authorities.js`; `src/core/linear-piping-analysis-consumer/inputxml-linear-frame-authority.js`; `src/core/linear-fea-frame-element/frame-element.js`; and `src/core/linear-piping-analysis-consumer/bourdon-expansion-augmentation.js`.

Required numerical/technical evidence: Begin with element 13 FROM/FX CAESAR/production values of approximately `-62.96307373/-73.69897887 N` for L2 and `-10.30100441/-207.74177970 N` for L6. Show the derived source-13 P1 six-vector and the complete vector-error table for both ends of sources 13–17. Reproduce or falsify the current substantial-reference tail near `1377/5345 = 25.7624%` and the rotation tail near `321/823 = 39.0036%`. Prove from live source evidence whether E33/E36 are classified `TEE` yet retain a qualified tangent basis, tangent start/end, arc centre, finite positive radius near `0.2285999908447267 m`, and six arc chords. Record the exact bend count, bend factors, E36 branch-carrier element, condition number, normalized residual, and L2/L5/L6 pass-rate, median-error, and >5% tail changes for a one-factor eligibility diagnostic.

Predicted intermediate values: If the type-only gate is the first wrong boundary, E33/E36 source geometry and retopologized chords remain unchanged, bend ownership increases from 10 to 12 exact components, existing sealed factors near `3.0580330385708625` and `3.0589606102894624` attach to E33/E36, and E36 tee flexibility ownership remains on finite incoming straight `IXP.E36.S1`. The first changed numerical objects are E33/E36 effective element stiffness/pressure-load contributions; downstream `u`, `q_local`, and mapped rows then change without recovery or sign-rule edits.

First wrong boundary: Name one of source classification/eligibility, element stiffness/load assembly, global solution, element recovery, local/global transformation and moment transport, I/J/source-chain selection, or result mapping. Identify the first unequal value and do not skip a boundary merely because later results agree internally.

Falsifier: Reject the arc-bearing-TEE eligibility cause if either source lacks complete qualified arc evidence, if changing only the eligibility predicate does not produce exactly 12 bend components, if E36 tee and bend mechanics claim the same arc chord, if the predicted E33/E36 contribution changes do not occur, or if the independent CAESAR parity pattern fails to improve coherently while unaffected ownership and equilibrium remain intact.

Fail if: Exact equilibrium or zero nodal-moment disagreement is treated as proof of member-action correctness; near-zero or cancellation-dominated rows select a coefficient; the implementation-coupled repository benchmark solver is promoted to oracle; several mechanics are changed together; or rejected reducer, beam-formulation, arc-to-chord, restraint, sign, or end-swap experiments are recycled as the cause without new falsifying evidence.

## Q3 — Authority / Invariant

Domain challenge: Prove the source-custody and ownership boundaries for BM4_L thermal, pressure, bend, tee, Bourdon, and reducer mechanics before deciding whether the isolated component-eligibility correction is authorized.

Exact repository data required: The live values and scope statements in `bm4l-validation.profile.json`, all three M047 BM4_L authority records named below, the production installation-temperature and thermal-expansion resolvers, the production capability profile, E33/E36 ACCDB geometry/SIF evidence, sealed bend/branch factor authority records, the handover, `PROVENANCE.md`, and the pinned Owner roadmap blob.

Repository anchors: `benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json`; `benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-t1-interval-authority.json`; `benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-tee-rigid-thermal-authority.json`; `benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-residual-invariant-authority.json`; `benchmarks/LFEA/BM4/PROVENANCE.md`; `docs/lfea/LFEA_Rotation_Parity_Handover_20260828.md`; `docs/OWNER_ROADMAP.md`; `src/core/linear-piping-analysis-consumer/inputxml-linear-preparation-profile.js`; `src/core/linear-piping-analysis-consumer/inputxml-thermal-authority.js`; `src/core/linear-piping-analysis-consumer/production-capability-profile.js`; `src/core/linear-piping-analysis-consumer/bend-retopology-contract.js`; and the production sealed bend/branch factor authority modules.

Required technical work: Build a custody matrix for installation temperature, T1 interval strain/mean alpha, Bourdon mode, closed-end pressure axial thrust, bend pressure stiffening, bend factors, tee factors/branch carrier, arc-bearing component classification, and reducer treatment. For each record its governing source, benchmark-only or generic-production scope, whether the production runtime actually receives it, and whether the proposed boundary consumes existing authority or invents a new constitutive rule. Hand-reconstruct production thermal strain from `1.17e-5/K`, `293.15 K`, and `393.15 K`, and BM4_L interval-authority strain from `1.2231989994646464e-5/K`, `294.15 K`, and `393.15 K`; quantify the relative difference and predict exactly which of L2, L5, and L6 could change if that separate authority were routed correctly.

Authority/source trace: Distinguish ACCDB geometry and SIF declarations, retopology recognition of arc-bearing `TEE`, sealed edition-factor authority, branch-carrier ownership, capability flags, benchmark-only CAESAR configuration, and generic material defaults. Explain why an existing arc contract may authorize eligibility correction while BM4_L temperature/mean-alpha evidence does not authorize a generic material change.

Protected invariant: CAESAR OUTPUT, comparator tolerances and row selection, solver formulation, stiffness/load kernels, recovery and sign/end conventions, source authority records, Owner roadmap, reducer-disabled production state, and unrelated thermal behavior remain unchanged. The M047 residual record's `newMechanicsAuthorized:false` remains binding.

First wrong boundary: The candidate must decide whether evidence supports a component eligibility/ownership defect, an absent explicit model-specific thermal authority, or `NO_PATCH`; benchmark parity improvement alone cannot confer authority.

Falsifier: The eligibility correction is unauthorized if E33/E36 do not carry already-qualified bend geometry under the existing arc-bearing contract, if their sealed bend factors require a new edition/source assumption, or if bend ownership conflicts with tee branch ownership. Thermal routing is unauthorized unless an explicit production caller/model authority exists for the BM4_L-only interval data.

Invalid shortcut: Hard-code `21 C`, `0.00121096700947`, or BM4_L alpha into a generic A106 table; enable reducers; fit a bend/tee coefficient from residuals; change tolerances/oracle rows; or treat benchmark metadata as automatic production input.

Fail if: Source scope is conflated with runtime ownership, one source is allowed to own the same stiffness/load contribution twice, or safe fail-closed behavior cannot be stated when model-specific authority or qualified arc evidence is absent.

## Q4 — Independent Validation

Domain challenge: Independently reconstruct the element-13 closed-end pressure action and a six-DOF joint free body, then use the real CAESAR OUTPUT to distinguish equilibrium correctness from end-action magnitude parity and to bound the E33/E36 diagnosis.

Exact repository data required: Raw ACCDB `INPUT_BASIC_ELEMENT_DATA` and `INPUT_UNITS` values for element 13 (`DIAMETER=273`, `WALL_THICK=18.26259994506836`, `PRESSURE1=11600`, `MODULUS=203395008`, `POISSONS=0.2919999957084656`, length near `549.739990234375 mm`); the retained source-13/source-14 L2 and L6 CAESAR end vectors at node 20240; corresponding production retained vectors; and the current ACCDB SHA-256.

Calculation/reconstruction: Convert the raw units to SI and calculate inside diameter, metal area, closed-end pressure strain `(1-2nu) P di^2 / [E(do^2-di^2)]`, free axial extension, `EA`, and the signed 12-entry uncondensed initial-load pair. Separately form CAESAR and production pressure-only source vectors as L6-L2 and sum source-13 TO with source-14 FROM componentwise at joint 20240, including moments and any required reference-point transport.

Repository anchors: `benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB`; `benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json`; `benchmarks/LFEA/BM4/PROVENANCE.md`; `src/core/linear-fea-frame-element/frame-element.js` (`closedEndPressureAxialStrain`); `src/core/linear-fea-frame-element/frame-element-loads.js`; `src/core/linear-fea-result-recovery/element-end-actions.js`; and `src/core/fea-benchmarks/caesar-accdb-linear-solve.js` only as a diagnostic implementation, not an oracle.

Required technical work: Resolve every ACCDB unit explicitly, show the sign of `f_initial` under `q=Kd-f_equivalent-f_initial`, and compare the hand result to the production retained vector. Reconstruct the CAESAR source-13 P1 FROM six-vector and the node-20240 six-DOF free body. State what each agreement proves and what it cannot prove about the unresolved global model.

Independent oracle: The real CAESAR II OUTPUT tables retained inside the hash-bound BM4_L ACCDB. Neither the production solver nor `src/core/fea-benchmarks/caesar-accdb-linear-solve.js` is independent oracle data.

Required numerical/technical evidence: Reproduce or falsify `di≈0.2364748001098633 m`, strain `≈7.129604915871123e-5`, free extension `≈3.919428936825943e-5 m`, area `≈0.014615214387541558 m^2`, `EA≈2.9726616473e9 N`, and the local pair `[-211939.030936386,0,0,0,0,0,+211939.030936386,0,0,0,0,0] N`. Reproduce the CAESAR source-13 P1 FROM vector near `[52.6620693,-703.5380249,105.7683830,593.6801758,-795.9359283,-532.9401627]` and quantify six-DOF joint closure for both CAESAR and production.

Units/sign/tolerance: Use metres, newtons, pascals, radians, and N·m after explicit conversion. Compare the pressure hand calculation to floating-point precision; report joint closure componentwise and relative to the incident-action scale. Do not substitute the comparator's 10% acceptance tolerance for mechanics/equilibrium evidence.

Falsifier: Reject pressure-input or closed-end axial-load coefficient tuning if the independent hand calculation matches the production primitive. Reject the E33/E36 assembly diagnosis if the first discrepancy already appears in element 13 raw pressure input/kernel, recovery identity, transformation, or source-end mapping.

Fail if: Units are inferred without `INPUT_UNITS`, production output is its own oracle, equilibrium closure is claimed to prove CAESAR magnitude parity, or force/moment reference points and I/J signs are omitted.

## Q5 — Next Contribution / Minimal Patch

Domain challenge: Design, without implementing, the smallest authorized correction and one-gate proof for the isolated arc-bearing-TEE eligibility boundary, while preserving an explicit `NO_PATCH` outcome if authority or ownership evidence fails.

Exact repository data required: The live implementation of `productionBendSourceEligible`; `ARC_BEARING_COMPONENT_TYPES`; all existing call sites and imports; production bend/branch ownership records for E33/E36; the capability-profile check; the governed BM4_L production preparation checks; the 26-check `check:lfea-linear-piping` gate; and fresh baseline parity metrics for all three mapped cases, including pass rate and substantial >5% rate.

Repository anchors: `src/core/linear-piping-analysis-consumer/production-capability-profile.js` (`productionBendSourceEligible`); `src/core/linear-piping-analysis-consumer/bend-retopology-contract.js` (`ARC_BEARING_COMPONENT_TYPES`); `src/core/linear-piping-analysis-consumer/inputxml-production-bend-components.js`; `src/core/linear-piping-analysis-consumer/inputxml-production-branch-modifiers.js`; `src/core/linear-piping-analysis-consumer/inputxml-linear-element-authorities.js`; `scripts/lfea-production-capability-profile-check.mjs`; `scripts/lfea-bm4l-bend-retopology-source-check.mjs`; `scripts/lfea-production-caesar-parity-check.mjs`; `scripts/linear-piping-analysis-consumer-check.mjs`; and `package.json`.

Required technical work: Specify the exact one-function eligibility correction, its dependency direction, and the focused pure and governed integration assertions needed to prove E33/E36 receive existing bend ownership only when complete arc evidence exists. Define a deliberate-break procedure that restores the old type-only predicate and must fail the focused positive E33/E36/exact-bend-count assertions, then pass again after restoration. State the production files and test files that may change, and justify every file.

Safe patch boundary: Only the component-kind portion of `productionBendSourceEligible` may expand from literal `BEND` to the already defined qualified arc-bearing kind contract; all tangent-basis, tangent-point, arc-centre, finite-radius, and positive-radius gates remain fail-closed. E36 tee flexibility remains owned by finite incoming straight `IXP.E36.S1`; no bend factor, branch factor, stiffness/load kernel, recovery, transform, result mapping, benchmark, oracle, tolerance, reducer, or thermal value changes.

Expected before/after evidence: Baseline must reproduce approximately L2/L5/L6 pass rates `88.87/83.75/73.93`, median errors `2.1992/3.1892/2.5768%`, substantial tail `1377/5345 = 25.7624%`, and condition near `4.758e6`. The design must predict 10→12 exact bend components, name the E33/E36 factors and unchanged E36 tee carrier, and require reporting after-change pass rate, median, substantial >5% numerator/denominator/rate, condition, normalized residual, and qualification status for all three cases. Diagnostic targets near `96.76/92.37/95.82` pass, `0.3668/2.8566/0.3556%` medians, and `589/5349 = 11.0114%` tail are predictions to verify, not replacement oracle values.

Protected unchanged domains: Solver formulation, element stiffness/load formulas, local/global and I/J conventions, recovery, comparator, CAESAR OUTPUT, benchmark/profile/source authorities, reducer state, thermal authority, Owner roadmap, workflows, release state, and merge authority.

Validation required: Focused capability predicate checks including negative TEE-without-arc-evidence; governed BM4_L preparation assertions for 12 exact bends and non-overlapping E36 tee ownership; fresh three-case CAESAR parity metrics; all 26 linear-piping checks; relevant aggregate regressions; and `git diff --check`, with honest PASS/FAIL/NOT_RUN reporting.

Negative test: With only the old literal-`BEND` predicate restored, the focused E33/E36 eligibility and exact-count-12 assertions must fail for the intended reason while negative incomplete-geometry cases remain rejected. Restoring the proposed predicate must make the same assertions pass without weakening any guard.

Rollback/falsifier boundary: Roll back or decline the patch if either source lacks complete qualified bend evidence, bend/tee ownership overlaps, the exact bend count is not 12, any mapped case pass rate or substantial >5% rate materially regresses, median materially worsens, solver qualification/condition/residual regresses, deliberate-break proof does not fail, or the 26-check gate fails.

No-patch condition: Return `NO_PATCH` if the first wrong value lies outside component eligibility, if fixing it requires a new factor/formulation/source/oracle/tolerance, if existing arc-bearing and sealed-factor authority does not cover E33/E36, or if a safe one-owner topology cannot be proved. Keep the separate BM4_L thermal-routing issue at `NO_PATCH` unless an explicit production caller/model authority exists.

Fail if: The answer implements code; broadens the patch beyond one eligibility boundary; tunes a parameter from parity; changes production and oracle together; omits the deliberate-break proof; reports only pass rate without the >5% rate; or treats qualification as merge/release authority.
