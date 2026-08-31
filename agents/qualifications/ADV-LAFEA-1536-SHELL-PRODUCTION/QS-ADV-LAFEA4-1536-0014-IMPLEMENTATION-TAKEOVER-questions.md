# LAFEA.4 takeover qualification — MITC production implementation and V&V boundary

QUESTION_SET_ID: QS-ADV-LAFEA4-1536-0014-IMPLEMENTATION-TAKEOVER
CHAIN_ID: ADV-LAFEA-1536-SHELL-PRODUCTION
WORK_ITEM: github:reallaksh19/Advanced_Analysis#1536
QUALIFICATION_SCOPE_ID: QSCOPE-ADV-LAFEA4-1536-MITC-PRODUCTION
QUESTION_SET_STATUS: CURRENT
QUESTION_PACK_ACTION: REFRESHED_BY_OWNER_REQUEST
QUESTION_DISPLAY: SHOW
BASIS_HEAD: 75c670424ef46888f0a1c02188a9ea8d42b5209f
QUALIFICATION_BASIS_HEAD: b4ca03357f584ed993cf3739b11f89c255e54b84
QUALIFICATION_PROFILE: FEA
QUALIFICATION_PROFILE_VERSION: 2

Score target: total >= 92/100 and every question >= 17/20. A correct number without the live-code trace, derivation, falsifier and authority decision does not qualify.

Answer from the live repository. Do not answer from this file or Issue #1536 prose alone. Name exact files/functions/contracts and identify the first wrong implementation owner for every failure scenario.

## Q1 — MITC production route, basis transformation and rigid-body objectivity — 20

Against current live `main`, trace one valid `local-shell-model/v2` MITC4/QUAD4 load case from the public LAFEA.4 document boundary to the assembled global stiffness and back to the published `local-shell-result/v2` result. Your trace must include, with exact files/functions:

1. `normalizeShell(...)` and `canonicalShell(...)` in the stage composition boundary;
2. `createCanonicalMitcProductionModel(...)` / `validateCanonicalMitcProductionModel(...)` and the explicit `MITC_REISSNER_MINDLIN_5DOF_V1` contract;
3. `calculateLocalShell(...)` dispatch to `calculateMitcProductionShell(...)`;
4. `createMitcMechanicsModelFromProduction(...)` and why production custody deliberately reuses the already-qualified experimental mechanics owner instead of copying element formulas;
5. `buildExperimentalMitcElementEvidence(...)` -> `canonicalQuadFacet(...)`/`canonicalFacet(...)` -> `mitcFiveDofTransformation(...)` -> `mitc4StiffnessMatrix(...)` or `mitc3StiffnessMatrix(...)`;
6. the exact local and global DOF orders and the transformation `K_g = T^T K_l T`;
7. `assembleGlobalSystem(...)`, `solveLoadCase(...)`, `recoverExperimentalMitcLoadCase(...)`, `productionLoadCase(...)`, and `presentLocalShell(...)`.

Then derive the signed physical-rotation -> MITC-director map used by the implementation. Starting from rigid-body rotation `omega`, show why the retained variables must satisfy

```text
betaX = omega_y
betaY = -omega_x
w_,x = -omega_y
w_,y =  omega_x
```

so that `gamma_xz = betaX + w_,x = 0` and `gamma_yz = betaY + w_,y = 0`. Explain why directly reusing physical rotation rows as beta rows creates spurious transverse-shear energy.

Finally, design four implementation falsifiers and state the first wrong owner for each:
- swap `R1/R2` or the two beta rows at one node;
- drop the minus sign in `betaY`;
- feed TRI3 topology with MITC4 formulation or QUAD4 with MITC3;
- leak `EXPERIMENTAL_NONPRODUCTION` route/qualification flags into the public v2 result.

Your answer must distinguish an element-objectivity failure, a topology/contract rejection, a transformation-ordering defect and a production-custody defect. Do not propose solver changes for a pre-assembly formulation/contract failure.

## Q2 — Physical shear, thin-limit behaviour and locking diagnosis — 20

Use this independent cantilever discriminator:

```text
E = 200000 MPa
nu = 0
L = 10 mm
b = 1 mm
P = 1 N
k = 5/6
```

### Part A — moderate thickness
For `t = 2 mm`, derive by hand:
- `I = b t^3 / 12`;
- `G = E/[2(1+nu)]`;
- Euler-Bernoulli tip deflection `PL^3/(3EI)`;
- Timoshenko shear deflection `PL/(kGA)`;
- total Timoshenko deflection;
- the physical shear fraction of total deflection.

The expected independent result is `0.0025 mm + 0.00006 mm = 0.00256 mm`, with shear fraction `2.34375%`.

### Part B — thin limit
For `t = 0.1 mm`, compute the Euler-Bernoulli term and the physical shear term and explain the expected asymptotic behaviour of MITC versus CST/DKT as `t/L -> 0`.

### Part C — implementation diagnosis
The retained 32-element MITC4 reference observations are:

```text
t = 2.0 mm: u_tip = 0.002559389648436838 mm
t = 0.1 mm: u_tip = 19.996317183073298 mm
```

These observations are corroboration only, not governed PASS evidence. For each hypothetical mesh-refinement signature below, identify the most likely mechanism, the smallest code owner to inspect first, and one discriminating test that separates it from the other mechanisms:

1. tip displacement tends to zero relative to Timoshenko as the mesh is refined for thin plates;
2. thin case is correct but moderate-thickness result converges to the Euler-Bernoulli value and misses the shear increment;
3. displacement is too soft and a zero-energy non-rigid mode appears;
4. rigid-body rotation creates non-zero shear energy while membrane/bending remain near zero;
5. coarse meshes are stiff but converge normally to Timoshenko with refinement.

Your diagnosis must explicitly distinguish **shear locking**, **physical-shear omission**, **hourglass/under-integration**, **beta/basis mapping error**, and **ordinary discretization error**. Explain why DKT cannot suffer transverse-shear locking in the Reissner-Mindlin sense, yet can still be too stiff for moderate thickness because it omits real transverse-shear compliance.

Fail condition: calling every overly stiff result “locking” without identifying which energy term exists in the formulation.

## Q3 — Stress recovery, sign invariants, energy parity and a sign-bug falsifier — 20

Use the retained plane-stress recovery discriminator:

```text
membrane strain = [0.0004, -0.0001, 0.00015]
curvature       = [0.008, -0.003, 0.001] /mm
t = 8 mm
E = 200000 MPa
nu = 0.3
```

By hand:
1. construct the plane-stress material matrix;
2. calculate membrane stress;
3. calculate TOP (`z=+t/2`) and BOTTOM (`z=-t/2`) combined strains/stresses;
4. calculate same-point in-plane von Mises at both surfaces and identify the governing surface.

Expected retained values are:

```text
membrane = [81.31868132, 4.39560440, 11.53846154] MPa
TOP      = [6323.07692308, -523.07692308, 319.23076923] MPa
VM_top   = 6623.29915646 MPa
BOTTOM   = [-6160.43956044, 531.86813187, -296.15384615] MPa
VM_bottom= 6463.24702219 MPa
```

Then trace the live recovery implementation from `recoverExperimentalMitcLoadCase(...)` through `recoverElement(...)`, `recoverPoint(...)`, `recoverSurface(...)`, `reconstructElementEnergy(...)`, `productionLoadCase(...)`, and `presentLocalShell(...)`.

Prove from the beta mapping that the bending curvature convention is

```text
[kappaX, kappaY, kappaXY] = [-w_xx, -w_yy, -2 w_xy]
```

for the retained rigid-rotation convention.

Next answer the implementation challenge: a developer flips the sign of every recovered curvature after stiffness assembly. Global displacements, reactions and `0.5 q^T K q` stay unchanged, and membrane/bending **energy magnitudes** can still appear plausible, but TOP/BOTTOM stresses reverse. Design the minimum falsifier that must catch this defect even if an energy-only test passes. State which numerical identities are insensitive to this sign flip and which physical recovery identities are not.

Finally explain why

```text
tau_effective_avg = k G gamma
Q = k G t gamma
```

must remain in `transverseShearAuthority` and must **not** be folded into the current `PLANE_STRESS_SAME_POINT_IN_PLANE_ONLY` von Mises. Identify the exact presenter behaviour that preserves this authority separation.

## Q4 — Consistent pressure on TRI3/Q4, first-moment custody and follower-load boundary — 20

Derive the consistent reference-pressure load from

```text
f_e = integral_A N^T p n dA
```

and solve both independent cases by hand.

### TRI3 case

```text
A=(0,0,0) mm
B=(100,0,0) mm
C=(0,50,0) mm
p=2.5 MPa
n=(0,0,1)
```

Show area, each nodal force, total force and total moment about the global origin. The expected result is total `Fz=6250 N`, each nodal `Fz=2083.333333... N`, and moment approximately `[104166.6667, -208333.3333, 0] N.mm`.

### Distorted Q4 case

```text
(0,0), (4,0), (5,3), (0,2)
p=2
n=(0,0,1)
```

Derive the consistent nodal area weights

```text
[5/2, 17/6, 3, 8/3]
```

and therefore the nodal z-forces `[5, 17/3, 6, 16/3]`, total force `22`, centroid `(79/33,43/33)` and moment `[86/3,-158/3,0]`.

Then trace the live implementation through `assembleExperimentalMitcPressureLoads(...)`, `consistentPressureContribution(...)`, `integrateMitc4(...)`/`integrateMitc3(...)`, `accumulateQuadrature(...)`, `integratedResult(...)`, and the force/moment parity qualifications.

Implementation challenge: write the logic of a falsifier that would **pass total-force equilibrium but fail first-moment equilibrium** if a programmer replaced the distorted-Q4 consistent weights with `A/4`. Explain why force-only testing is insufficient.

Also explain the required behaviour for:
- reversed element winding / negative Jacobian;
- `ALONG_ELEMENT_NORMAL` versus the opposite pressure sense;
- node permutation that preserves geometry orientation;
- an attempted follower-pressure feature.

For follower pressure, name the additional mechanics that would be required before any production claim is legitimate: updated geometry/current normal, geometric nonlinearity, load linearization/consistent tangent and nonlinear iteration. Explain why the current contract correctly declares `UNDEFORMED_REFERENCE_CONFIGURATION`, `followerLoadAuthority=false`, and mandatory limitation `NO_FOLLOWER_PRESSURE`.

## Q5 — Assembly/solver/reaction qualification, first-wrong-boundary isolation and release gating — 20

Trace the current MITC load-case path:

```text
buildExperimentalMitcElementEvidence
-> assembleGlobalSystem
-> assembleCombinedLoads
-> solveLoadCase
-> recoverExperimentalMitcLoadCase
-> productionLoadCase
```

Explain the retained DOF partitioning and derive the reaction identity for prescribed DOFs from the assembled linear system. State how free-DOF residual qualification, force equilibrium, moment equilibrium and recovery/stiffness energy parity provide **different** checks; none may be silently substituted for another.

For each failure signature below, identify:
- the first wrong boundary;
- the smallest implementation owner/file to inspect first;
- whether a production source patch is justified now;
- the protected domains that must remain untouched until independently falsified.

### A
`element.localStiffnessSymmetry` passes, but assembled `globalStiffnessSymmetry` fails before solve.

### B
Global symmetry passes, but the sparse/PCG solve encounters non-positive curvature / singularity for an otherwise supposedly well-constrained model.

### C
Free-DOF residual is accepted and reactions balance total force, but moment equilibrium fails.

### D
Residual, force and moment equilibrium all pass, but `recovered.energyQualification` fails against stiffness energy.

### E
All numerical checks pass, but a v2 model declares MITC4 with TRI3 topology.

### F
All engineering checks and direct benchmark values pass, but `productionQualification().qualifiedForRelease` remains false and `evidenceState='NOT_RUN'`.

### G
GitHub Actions reports `conclusion=failure`, but the job has `runner_id=0`, empty runner identity and `steps=[]` before checkout.

Your decision tree must explicitly preserve these rules:
- contract/topology failures are not solver failures;
- pre-solve assembly failures do not justify recovery changes;
- equilibrium failures do not justify weakening tolerances or benchmark values;
- an energy-reconstruction defect must not be “fixed” by changing stiffness/solver mathematics unless those are independently falsified;
- infrastructure case G is `NOT_RUN`, not numerical `FAIL`;
- BM-001..BM-009 plus aggregate/core/solver/import/build remain governed executable gates;
- a successful production route or benchmark does **not** by itself set `RELEASE_QUALIFIED=true`.

Finish by stating the exact minimum evidence needed before changing protected engineering source after an executable failure: exact candidate HEAD, clean-tree state, command, stdout/stderr/exit, first failing assertion/diagnostic, and a demonstrated first wrong owner. No oracle/tolerance/negative-control weakening is permitted to manufacture PASS.
