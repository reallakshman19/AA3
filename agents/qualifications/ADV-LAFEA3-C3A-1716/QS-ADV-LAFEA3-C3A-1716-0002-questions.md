# Takeover qualification — ADV-LAFEA3-C3A-1716 / C3-A execution-debug

QUALIFICATION_PROTOCOL_VERSION: 3
QUALIFICATION_PROFILE: FEA
QUALIFICATION_PROFILE_VERSION: 2
CHAIN_ID: ADV-LAFEA3-C3A-1716
QUALIFICATION_SCOPE_ID: QSCOPE-1716-LAFEA3-C3A-EXECUTION-DEBUG
QUESTION_SET_ID: QS-ADV-LAFEA3-C3A-1716-0002
QUESTION_SET_STATUS: CURRENT
QUALIFICATION_BASIS_HEAD: 27dde65f51e1b9d7e6d20a324510a50ea3631729
OWNER_QUALIFICATION_BASELINE_SOURCE: github:reallaksh19/Advanced_Analysis#1711/Future-agent-questionnaire-Q1-Q5
OWNER_QUALIFICATION_BASELINE_MANIFEST: agents/chains/ADV-LAFEA3-C3A-1716/qualification-baselines/QB-ISSUE-1716-B.json
OWNER_QUALIFICATION_BASELINE_STATUS: SATISFIED
QUESTION_SET_ADMISSION_STATUS: NOT_EVALUATED — incoming candidate cannot self-admit

Scoring for an engineering-critical takeover: total >=92/100 and every question >=17/20. This is an exam, not implementation permission. Production output is not an independent oracle. The candidate must not perform the Q5 patch as part of the exam.

## Q1 — Production Trace

Domain challenge: reconstruct the real public route and distinguish what BM-MESH proves from what the ordinary LAFEA.3 application route still has to prove.

Repository anchors:
- `scripts/lafea-mesh-benchmark-run.mjs`
- `src/workspace/lafea-mesh-producer-binding.js`
- `src/workspace/lafea-mesh-producer-engine.js`
- `src/workspace/lafea-continuum-geometry-intake.js`
- `src/workspace/lafea-workbench.js`
- `scripts/lafea.3-bm005-ordinary-route-check.mjs`
- `src/core/local-continuum/index.js`
- `src/workspace/lafea-continuum-physical-probe.js`
- retained clean BM-MESH execution basis `798b2580fa0a42ac72342addcc8d6b5e99aec0a6`
- current main `27dde65f51e1b9d7e6d20a324510a50ea3631729`
- stale dependency branch/PR #1663 head `87851d7a2132842d60efc8e46a543c9ae16303da`

Production object/case: frozen `L3-T6` / `M2-L-SHAPE-01`, followed by the current BM005 ordinary-route harness as the application-route comparator.

Exact repository data required:
1. Reconstruct the actual `M2-L-SHAPE-01` geometry identity, L3-T6 profile hash, mesh hash, node/element/DOF counts, first retained element connectivity and coordinates, M4 material/formulation/thickness/BC values, fixed physical probes, owner elements and retained mesh/solver/execution/recovery identities.
2. Trace `scripts/lafea-mesh-benchmark-run.mjs` -> producer binding -> producer engine -> canonical continuum model -> authoritative execution -> recovery -> physical probe without substituting an element-kernel check.
3. Separately trace BM005 source/domain -> geometry intake -> mesh profile -> `generateAnalysisMesh()` -> retained mesh evidence -> `prepareContinuumForRun()` -> `run()` -> recovery -> physical probe -> convergence/result publication decision.
4. State exactly which seams are implementation-coupled versus independently qualified, and which C3-A seams BM-MESH itself does not prove.
5. Reconcile #1663 at the authority level: identify which overlapping benchmark/mesh artifacts are already superseded by #1715/current main and which, if any, remain genuinely disjoint and still needed. Do not merge #1663 wholesale.

Concrete payload: `L3-T6`, `M2-L-SHAPE-01`, executed basis `798b2580...`, current main `27dde65f...`, #1663 head `87851d7...`.

Required derivation: produce the end-to-end identity chain `sourceHash -> analysisDomainHash -> analysisGeometryHash -> meshProfileHash -> meshHash -> solverModelHash -> canonicalExecutionInputHash -> executionHash -> recoveryHash -> probeEvidenceHash -> convergenceEvidenceHash` wherever the owning route exposes each field, and explain the owner of every transition.

First authority/ownership boundaries: source/domain intake owns physical input identity; mesh producer owns discretization; compiler owns feature-to-FE lowering; local-continuum owns mechanics; recovery/probe consumers must reject stale custody; benchmark fixtures/oracles never become production authority.

Fail if: an element-kernel test is substituted, a node/element ID is treated as physical probe authority, #1663 is blindly merged, or BM-MESH PASS is promoted into practical/UI/non-affine/reaction-equilibrium qualification.

## Q2 — Current Unresolved Problem / Failure Isolation

Domain challenge: prove higher-order mapping validity from the actual T6/Q8 interpolation and identify the first correct blocking boundary for invalid geometry.

Repository anchors:
- current `t6-element.js` and `q8-element.js` under `src/core/local-continuum/**`
- current mesh quality/Jacobian owners used by the public producer/preflight
- current producer/preflight path reached by C3-A

Calculation/reconstruction — T6:
Use corners `N1=(0,0)`, `N2=(40,0)`, `N3=(0,30)` mm and midsides `N4=(22,2)`, `N5=(20,15)`, `N6=(0,15)`.

Concrete payload and required derivation:
1. Write the six T6 shape functions in area coordinates and their derivatives.
2. Compute the Jacobian and `det J` at the centroid `L1=L2=L3=1/3`.
3. Compute `det J` at one standard 3-point Hammer location other than the centroid and quantify the difference produced by distorted `N4=(22,2)` relative to the centroid and to the affine midpoint case `N4=(20,0)`.
4. Explain the topology/solver consequence if a governed integration/quality point has `det J <= 0` even when the centroid remains positive.

Calculation/reconstruction — Q8:
Use `N1 = 1/4(1-xi)(1-eta)(-xi-eta-1)` and `N5 = 1/2(1-xi^2)(1-eta)` with the full eight-node serendipity set.

Required derivation:
- verify `sum(N_i)=1` identically;
- with `u_i=epsilon0*x_i`, `v_i=0`, prove a valid isoparametric map recovers `epsilon_x=epsilon0`, `epsilon_y=0`, `gamma_xy=0` at every production `3×3` Gauss point;
- derive the minimum Gauss order that exactly passes this specific constant-stress/constant-strain patch residual under explicitly stated constant-material, constant-thickness, exact-isoparametric-geometry and consistent-traction assumptions;
- distinguish affine mapping from distorted isoparametric mapping and state why a blanket polynomial-degree claim for general rational `B^T D B detJ` is invalid.

Predicted intermediate values: concrete numerical centroid/Hammer determinants are mandatory.

First wrong boundary: mesh-quality/preflight owns invalid sampled mapping. Do not patch the continuum kernel or relax tolerances merely because a centroid check looks acceptable.

Falsifier: centroid `det J > 0` but a governed sample has `det J <= 0` or the mesh is otherwise folded/non-injective.

Fail if: production Q8 `3×3` integration is changed for the exam, centroid-only QA is proposed for T6, or general distorted stiffness is falsely claimed exactly polynomial-integrable by `2×2`.

## Q3 — Authority / Invariant

Domain challenge: reconstruct the frozen Kirsch finite-boundary traction and prove mesh/refinement cannot silently change the physical load law or hole authority.

Repository anchors:
- frozen B02/Kirsch benchmark definition and source registry
- production B02/Kirsch route and analytical traction lowering owner
- current mesh producer path for multiply-connected/annular geometry
- current physical attachment/compiler ownership

Concrete payload: `a=10 mm`, `R=100 mm`, remote `sigma_inf=50 MPa`, quarter domain; exact hole value `sigma_theta_theta(a,90°)=150 MPa`.

Required technical work:
1. Derive the Kirsch `sigma_rr`, `sigma_rtheta`, `sigma_theta_theta` expressions needed for the finite-radius boundary.
2. Evaluate `(sigma_rr, sigma_rtheta)` at `R=100 mm` for `theta=0°` and `theta=90°`.
3. Quantify the finite-boundary modeling error if plain remote uniaxial traction is used instead of the exact truncated-boundary traction, keeping this separate from circle discretization and FE field error.
4. Trace the frozen source/load law through the current compiler/lowering and show the integrated quarter-boundary force and moment resultants with units.
5. Trace a HOLE loop through current topology/refinement ownership and prove that no synthetic bridge/seam acquires physical traction authority and no material fills the void.

Authority/source trace: independent Kirsch source/equation custody owns expected physics; source geometry owns analytic boundary identity; mesher owns discretization only; compiler owns consistent edge loading; production results cannot rewrite oracle/source hashes.

Protected invariant: refinement may alter discretized edge count and geometric approximation error, but must not replace the exact traction law, reset source authority, or promote a specialized annulus/polar case into arbitrary-hole authority.

First wrong boundary: source/load compiler if traction semantics change; topology/mesher if hole ownership is lost; solver/recovery only after those boundaries clear.

Falsifier: unchanged source hash but assembled loading corresponds to plain remote stress, or valid hole topology is filled/lost after remeshing.

Invalid shortcut: retune B02 inputs/tolerances, modify another chain's source authority, or use production output as its own oracle.

Fail if: finite-boundary modeling error, geometric error and FE error are collapsed into one unexplained number.

## Q4 — Independent Validation

Domain challenge: establish a non-affine continuum reference that can falsify a route which only passes the affine BM-MESH handoff.

Repository anchors:
- current T3/T6/Q8 public producer -> compiler -> solver -> recovery route
- current independent cantilever/Timoshenko reference fixture where applicable
- parent #1711 bending case

Independent oracle / concrete payload:
Cantilever `L=200 mm`, `h=20 mm`, `b=10 mm`, `E=200000 MPa`, `nu=0.3`, end shear/resultant `P=1000 N`, plane stress.

Calculation/reconstruction:
1. Compute `I=b*h^3/12` and Euler-Bernoulli tip deflection `delta=P*L^3/(3*E*I)` and reconstruct exactly `2 mm`.
2. Compute `G=E/[2(1+nu)]` and the rectangular Timoshenko shear correction using a declared `kappa=5/6`; quantify its magnitude separately from root/end and 2D continuum effects.
3. Explain from T3 constant-strain completeness why one element through depth cannot represent the linear axial bending strain, why longitudinal refinement alone may retain spurious membrane/shear energy and large under-deflection, and why T6/Q8 improve this mechanism.
4. Give a reasoned pre-measurement expectation for T3 versus T6 depth refinement needed to approach <5% error, explicitly labeling it a prediction rather than a universal guarantee.
5. Define a controlled measured T3/T6/Q8 ladder with at least three genuinely distinct mesh hashes, fixed physical displacement/energy/reaction quantities, and an independent reference.

Required numerical evidence: show `2 mm` EB, the shear-correction magnitude, the expected total reference direction, and the difference between oracle error and adjacent-level change.

Units/sign/tolerance: mm, N, MPa; use the declared load direction and do not convert a moving/raw peak into convergence authority.

Falsifier: duplicate mesh hashes are counted as refinement, a one-layer T3 length-only ladder is presented as through-depth convergence, or BM-MESH affine M4 is used as the non-affine oracle.

Fail if: a universal element-count guarantee is asserted without the measured producer->solver ladder.

## Q5 — Next Contribution / Minimal Patch

Domain challenge: identify the smallest safe C3-A contribution after a real reproduction failure, including stale hash/probe ownership and dependency overlap.

Repository anchors:
- `scripts/lafea.3-bm005-ordinary-route-check.mjs`
- `src/workspace/lafea-continuum-physical-probe.js`
- authoritative workbench compile/run/currentness owners
- mesh producer binding/engine and recovery lifecycle
- #1663 overlapping draft branch

Concrete payload: a correctly generated T6 mesh reaches either (a) an invalid physical probe owner, (b) stale mesh/solver hash custody, or (c) a #1663 artifact that conflicts with current #1715/current-main evidence.

Required technical work:
1. Identify the first wrong adapter/state boundary using exact repository anchors and a reproducer.
2. State the smallest legitimate edit only if the evidence authorizes it.
3. Provide expected before/after values for `sourceHash`, `analysisDomainHash`, `analysisGeometryHash`, `meshProfileHash`, `meshHash`, `solverModelHash`, `canonicalExecutionInputHash`, `executionHash`, `recoveryHash`, `probeEvidenceHash` as applicable.
4. State upstream geometry/material/load impact and downstream recovery/convergence/UI invalidation/regeneration.
5. For #1663, classify the relevant file as `ALREADY_IMPORTED/SUPERSEDED`, `STILL_NEEDED_DISJOINT`, or `CONFLICTING_STALE` before any cherry-pick/port.

Safe patch boundary:
- stale mesh/solver identity -> authoritative compile/run/currentness/invalidation owner, never probe permissiveness;
- current identities but invalid T6 owner -> physical-point inverse-isoparametric location/containment only after independent owner and positive governed `det J` are proven;
- stale #1663 artifact -> no production patch; reconcile/retire the dependency rather than overwriting newer evidence.

Expected before/after evidence: exact failing code/state before; current identities and regenerated downstream evidence after; protected source/oracle/geometry authority unchanged unless the actual defect is in that owner and independent evidence proves it.

Validation required: focused positive reproducer; stale-hash negative; outside/edge-ambiguity probe negative as applicable; real public producer->solver->recovery route; dependency-diff evidence; upstream/downstream invalidation checks.

Negative test: regenerate/mutate mesh after preflight or reuse prior owner/evidence hash and require fail-closed rejection with no current authoritative result.

Rollback/falsifier boundary: if the alleged defect disappears with current identities, or the proposed repair needs relaxed tolerance/formulation/oracle/source authority, revert and classify `NO-PATCH`.

NO-PATCH: any success requires changing the independent oracle, sign convention, formulation/integration, solver tolerance, mesh-quality/convergence thresholds, another chain's B02 authority, workflow/release authority, unsupported geometry envelope, or accepting an invalid sampled Jacobian.

Fail if: the probe consumer is made permissive to stale custody, #1663 is blindly merged, a special benchmark producer is generalized without authority, or several mechanics are changed at once.
