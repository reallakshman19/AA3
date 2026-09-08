# Takeover qualification — ADV-LAFEA3-C3A-1716

QUALIFICATION_PROTOCOL_VERSION: 3
QUALIFICATION_PROFILE: FEA
QUALIFICATION_PROFILE_VERSION: 2
CHAIN_ID: ADV-LAFEA3-C3A-1716
QUALIFICATION_SCOPE_ID: QSCOPE-1716-LAFEA3-C3A-ROUTE-REPRODUCTION
QUESTION_SET_ID: QS-ADV-LAFEA3-C3A-1716-0001
QUESTION_SET_STATUS: CURRENT_FOR_TAKEOVER_PACK
QUALIFICATION_BASIS_HEAD: 27dde65f51e1b9d7e6d20a324510a50ea3631729
OWNER_QUALIFICATION_BASELINE_SOURCE: github:reallaksh19/Advanced_Analysis#1711/Future-agent-questionnaire-Q1-Q5
OWNER_QUALIFICATION_BASELINE_MANIFEST: agents/chains/ADV-LAFEA3-C3A-1716/qualification-baselines/QB-ISSUE-1716-A.json
OWNER_QUALIFICATION_BASELINE_STATUS: SATISFIED
QUESTION_SET_ADMISSION_STATUS: NOT_EVALUATED — incoming candidate cannot self-admit

Scoring for an engineering-critical takeover: total >=92/100 and every question >=17/20. This is a qualification exam, not implementation permission. Production output is not an independent oracle and the candidate must not perform Q5's proposed patch as part of the exam.

## Q1 — Production Trace

Domain challenge: trace the actual public mesh-to-continuum route rather than an element-kernel substitute.

Repository anchors:
- `scripts/lafea-mesh-benchmark-run.mjs`
- `src/workspace/lafea-mesh-producer-binding.js`
- `src/workspace/lafea-mesh-producer-engine.js`
- `src/core/local-continuum/index.js`
- `src/workspace/lafea-continuum-physical-probe.js`
- retained BM-MESH evidence from clean executed code `798b2580fa0a42ac72342addcc8d6b5e99aec0a6`
- current main `27dde65f51e1b9d7e6d20a324510a50ea3631729`

Production object/case: frozen `L3-T6` / `M2-L-SHAPE-01` mesh.

Exact repository data required: actual geometry/profile/mesh identities, first retained element and node coordinates, DOF order, M4 material/formulation/thickness/BC values, fixed physical probes and containing-owner evidence.

Concrete payload: reconstruct the actual frozen L-shape geometry and at least one T6 level's semantic identities; use the retained first element connectivity and its node coordinates rather than an invented triangle.

Required derivation: trace geometry -> profile -> plan/public producer -> canonical retained mesh -> compiled solver model -> execution -> recovery -> physical probe. Reconstruct geometry/profile/mesh hashes, first-element connectivity, DOF ordering, material/BC values and probe ownership from files/execution. Identify which ordinary production compiler/application seams BM-MESH itself still does not prove.

First authority/ownership boundaries: geometry/domain intake owns physical source identity; mesh producer owns topology/discretization; compiler owns feature-to-FE lowering; local-continuum owns mechanics; physical probe is a recovery consumer and must enforce current mesh/execution/recovery custody.

Fail if: an element-kernel test is substituted for the public route, node IDs are treated as physical probe authority, or benchmark PASS is claimed as practical/UI/non-affine/reaction qualification.

## Q2 — Current Unresolved Problem / Failure Isolation

Domain challenge: higher-order isoparametric mapping and validity isolation for T6/Q8.

Repository anchors:
- current `t6-element.js` and `q8-element.js` owning modules under `src/core/local-continuum/**`
- current mesh quality/Jacobian owners used by the public producer/preflight

Calculation/reconstruction — T6:
T6 corners `N1=(0,0)`, `N2=(40,0)`, `N3=(0,30)` mm; midsides `N4=(22,2)` between 1–2 and deliberately off midpoint `(20,0)`, `N5=(20,15)`, `N6=(0,15)`.

Concrete payload:
1. Write the six T6 shape functions in area coordinates and their derivatives.
2. Compute the Jacobian and det J at the centroid `L1=L2=L3=1/3`.
3. Compute det J at one standard 3-point Hammer location other than the centroid and quantify the change caused by distorted N4.
4. Explain the topological/solver consequence if N4 moves far enough that det J is negative at a governed integration/quality point, and why positive centroid det J is not sufficient QA.

Calculation/reconstruction — Q8:
Use `N1 = 1/4(1-xi)(1-eta)(-xi-eta-1)` and `N5 = 1/2(1-xi^2)(1-eta)` with the full eight-node serendipity set.

Required derivation:
- verify `sum(N_i)=1` identically;
- for imposed `epsilon_x=epsilon0`, `epsilon_y=0`, `gamma_xy=0` with `u_i=epsilon0*x_i`, `v_i=0`, prove every point sampled by production full `3×3` integration recovers exactly `epsilon_x=epsilon0` for a valid isoparametric map;
- derive the minimum Gauss order that exactly passes this specific constant-stress/constant-strain patch residual under the required geometry/material/load assumptions;
- explicitly distinguish affine mapping from distorted isoparametric mapping and explain why a blanket polynomial-degree argument for general rational `BᵀDB det J` is invalid.

Predicted intermediate values: the derivation must produce concrete centroid/Hammer Jacobian determinants for the supplied T6 coordinates and a numerical comparison, not only formulas.

First wrong boundary: if production accepts an element with non-positive det J at a governed sample, isolate mesh-quality/preflight ownership before changing the continuum kernel.

Falsifier: centroid det J positive while a governed sampled mapping is invalid elsewhere.

Fail if: production full 3×3 Q8 integration is changed to satisfy the exam, centroid-only T6 quality is proposed, or a general distorted stiffness integral is falsely declared polynomial-exact by 2×2 quadrature.

## Q3 — Authority / Invariant

Domain challenge: frozen Kirsch finite-boundary traction and source/oracle authority.

Repository anchors:
- frozen B02/Kirsch definition and source registry under `validation/lafea-benchmark-data/B02/**` or current owning B02 paths
- production B02/Kirsch route and analytical traction lowering owner
- current mesh producer envelope for the admitted annulus/hole case

Concrete payload: hole radius `a=10 mm`, truncation radius `R=100 mm`, remote uniaxial stress `sigma_inf=50 MPa`, quarter domain.

Required technical work:
1. State exact Kirsch `sigma_theta_theta` at `r=a`, `theta=90°` and obtain `150 MPa`.
2. Derive exact Kirsch boundary traction components `(sigma_rr, sigma_rtheta)` at `r=R=100 mm` for `theta=0°` and `theta=90°`.
3. Using the `1/r^2` and `1/r^4` perturbation terms, quantify the finite-boundary error if plain remote uniaxial traction is applied instead.
4. Trace the frozen source/load law into the current production compiler/lowering and show the integrated quarter-boundary force/moment resultant with units.

Authority/source trace: the independent Kirsch equation/source registry owns expected physics; the mesh owns discretized geometry; the compiler maps the frozen traction law to mesh edges; production result cannot rewrite source/oracle hashes.

Protected invariant: mesh refinement may change edge discretization and geometric error, but must not silently replace exact finite-radius traction with plain remote stress, reset source authority, or promote a specialized annulus/polar producer into arbitrary-hole authority.

First wrong boundary: source/load compiler if the physical traction law changes; geometry/mesher if boundary ownership or geometric interpolation is wrong; solver/recovery only after those are independently cleared.

Falsifier: exact source hash is unchanged but assembled edge load corresponds to plain remote stress, or hole material topology is filled/lost after remeshing.

Invalid shortcut: alter B02 inputs/tolerances or another chain's source authority to make the mesh result pass.

Fail if: hole geometry error and FE field error are merged into one unexplained percentage, or the production result is used as its own oracle.

## Q4 — Independent Validation

Domain challenge: non-affine bending convergence and element strain-field completeness.

Repository anchors:
- current T3/T6/Q8 producer-to-public-solver route
- current independent cantilever/Timoshenko reference fixture where applicable
- parent #1711 controlled bending case

Independent oracle / concrete payload:
Cantilever `L=200 mm`, depth `h=20 mm`, thickness/width `b=10 mm`, `E=200000 MPa`, `nu=0.3`, tip shear/resultant `P=1000 N`, plane stress.

Calculation/reconstruction:
1. Compute `I=b*h^3/12` and Euler-Bernoulli tip deflection `delta=P*L^3/(3*E*I)`; explicitly reconstruct `2 mm`.
2. Compute the applicable shear correction separately using `G=E/[2(1+nu)]` and a declared rectangular shear factor; distinguish that correction from end/root and 2D effects.
3. Explain from T3 constant-strain completeness why one element through depth cannot represent the linear axial bending strain and why longitudinal refinement alone can retain parasitic/spurious shear or membrane energy and severe under-deflection.
4. State a reasoned prediction for T3 versus T6 depth refinement needed to get under 5% error, but explicitly reject any universal guaranteed element count.
5. Define a controlled measured T3/T6/Q8 ladder with genuinely distinct mesh hashes, fixed physical quantities and an independent reference. Explain why duplicate meshes or a moving/raw peak cannot qualify convergence.

Required numerical/technical evidence: show the 2 mm EB result, shear correction magnitude and expected direction; then require measured producer->solver histories before making a repository-specific <5% element-count claim.

Units/sign/tolerance: mm, N, MPa; compare displacement magnitude/sign under the declared load direction and keep oracle error separate from change-between-levels.

Falsifier: increasing only length subdivisions on a one-layer T3 mesh is presented as useful depth convergence, or two requested refinement levels produce identical semantic meshes.

Fail if: BM-MESH affine M4 is used as the non-affine bending oracle or raw mesh-wide maximum stress is used as the convergence quantity.

## Q5 — Next Contribution / Minimal Patch

Domain challenge: safe first-boundary repair for invalid probe owner or stale mesh/solver identity.

Repository anchors:
- `src/workspace/lafea-continuum-physical-probe.js`
- authoritative workbench compile/run/currentness owners
- mesh producer binding/engine and retained recovery lifecycle
- current C3-A reproduction harness

Concrete payload: correctly generated T6 mesh reaches either (a) an invalid physical probe owner or (b) stale mesh/solver hash custody.

Required technical work: identify the first wrong adapter/state boundary and propose the smallest edit only after an independent reproducer proves it. State before/after sourceHash/domainHash/geometryHash/meshProfileHash/meshHash/solverModelHash/executionHash/recoveryHash/probeEvidenceHash as applicable; state which upstream geometry/material/load objects remain unchanged and which downstream recovery/convergence/UI descendants become stale or regenerate.

Safe patch boundary:
- stale mesh/solver identity: repair currentness/invalidation at the authoritative compile/run/publication owner, never by overwriting the probe's expected hash;
- current hashes but invalid T6 owner: isolate physical-point inverse isoparametric location/containment only after independent owner and positive governed det J are established.

Expected before/after evidence: before must show the exact mismatched/stale or owner failure; after must show current compiled mesh/solver identities, regenerated recovery/probe evidence and unchanged protected source/oracle authority.

Protected unchanged domains: independent oracle; sign convention; T3/T6/Q8 formulation/integration; solver tolerance; mesh-quality/convergence thresholds; B02 source authority; unsupported geometry envelope; workflow/release authority.

Validation required: focused positive reproducer, stale-hash negative, outside/edge-ambiguity probe negative as applicable, current public producer->solver->recovery route, and upstream/downstream invalidation checks.

Negative test: mutate/regenerate mesh after preflight or reuse a prior owner/evidence hash and require exact fail-closed rejection with no current authoritative result.

Rollback/falsifier boundary: if the alleged defect disappears when current identities are used, or if repair requires relaxing tolerance/formulation/oracle/source authority, revert/NO-PATCH and continue diagnosis.

NO-PATCH condition: any success requires changing the independent oracle, sign convention, formulation, tolerances, another chain's B02 authority, unsupported geometry, or accepting an invalid sampled Jacobian.

Fail if: the probe consumer is made permissive to stale custody, a special benchmark producer is generalized without authority, or several mechanics are changed at once.
