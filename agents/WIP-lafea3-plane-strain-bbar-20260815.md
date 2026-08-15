# LAFEA.3 Near-Incompressible Plane-Strain / B-bar Qualification — Work Report

## Recovery header

- Repository: `reallaksh19/Advanced_Analysis`
- Assignment: add and qualify a locking-resistant near-incompressible plane-strain formulation without weakening the existing displacement-only guard.
- WORK_INTENT: `IMPLEMENT`
- CRITICALITY: `ENGINEERING_CRITICAL`
- EXECUTION_MODE: controlled autonomous batches.
- Base branch: `main`
- Baseline SHA: `543cd27c5d498390bacf4a3584ca70e30ee18641`
- Working branch: `agent/lafea3-near-incompressible-bbar-20260815`
- Merge authority: not implied by this work report; owner authorization is required for merge.

## Ground truth at branch creation

The current local-continuum route has exactly two formulation identities:

- `PLANE_STRESS`
- `PLANE_STRAIN`

`PLANE_STRAIN` is a displacement-only, fully integrated formulation. Source normalization currently applies a source-controlled interim guard:

- advisory: `nu >= 0.40`
- hard qualification block: `nu >= 0.45`

The existing guard explicitly says it must not be relaxed through solver/UI tolerances and that a separately qualified locking-resistant formulation is required for the near-incompressible regime.

T6 uses three-point full integration and Q8 uses 3x3 full integration. T3 is constant strain; an element-average mean-dilatation/B-bar operator is identical to its pointwise volumetric operator and therefore does not remove T3 volumetric locking.

## Architecture decision frozen before new production observation

1. **Do not reinterpret or weaken `PLANE_STRAIN`.** Its present displacement-only authority and `nu >= 0.45` block remain intact.
2. Add a separate explicit formulation identity: **`PLANE_STRAIN_BBAR`**.
3. Initial B-bar production authority is **T6/Q8 only**.
4. T3 remains available only as a control/reference family and cannot claim locking-resistant authority.
5. The B-bar route uses the same physical DOFs and global SPD solver architecture; it changes element volumetric strain interpolation, not solver tolerance or convergence rules.
6. Initial B-bar authority is **mechanical only**. Temperature/eigenstrain loading under B-bar remains fail-closed until separately qualified because the averaged volumetric eigenstrain term requires its own derivation and benchmark evidence.
7. Existing mesh/Jacobian/topology/solver/residual/reaction gates remain unchanged and may only become stricter.
8. Release authority remains false until exact required qualification evidence exists.

## B-bar formulation definition

For isotropic 3D elasticity restricted to plane strain, with in-plane engineering strain vector

`eps = [eps_x, eps_y, gamma_xy]^T`,

let

- `mu = E / (2*(1+nu))`
- `K = E / (3*(1-2*nu))`
- `theta = eps_x + eps_y`

The standard reduced plane-strain constitutive operator is split into deviatoric and volumetric parts:

`D = D_dev + D_vol`

with

`D_dev = [[4mu/3,-2mu/3,0],[-2mu/3,4mu/3,0],[0,0,mu]]`

and

`D_vol = K * [[1,1,0],[1,1,0],[0,0,0]]`.

At each integration point, define the volumetric row

`Bv_gp = [1,1,0] * B_gp`.

The element mean-dilatation row is

`Bv_bar = (1/A) * integral_A(Bv dA)`.

For constant thickness, the qualified mechanical B-bar stiffness candidate is

`Ke = integral_A(t * B^T D_dev B dA) + t*A*K*(Bv_bar^T Bv_bar)`.

The intended stress recovery is consistent with the same averaged volumetric field:

- `sigma_x = 2mu*(eps_x - theta/3) + K*theta_bar`
- `sigma_y = 2mu*(eps_y - theta/3) + K*theta_bar`
- `sigma_z = 2mu*(0 - theta/3) + K*theta_bar`
- `tau_xy = mu*gamma_xy`

where `theta_bar = Bv_bar * u_e`.

For any affine field with constant `theta`, `theta_bar == theta`; therefore B-bar must reproduce the standard plane-strain affine patch exactly within existing numerical tolerances.

## Frozen qualification programme

The machine-readable contract is `validation/lafea-incompressible/plane-strain-bbar-v1.json` and is created before new production benchmark observations.

### Poisson-ratio ladder

- `0.30` — compressible reference/control
- `0.45`
- `0.49`
- `0.499`
- `0.4999`

No acceptance limit may be selected from results observed on this branch.

### Required families

- T3 — control only, no B-bar production authority
- T6 — required
- Q8 — required

### Benchmark classes

1. **Affine patch / formulation identity**
   - rigid-body and constant-strain fields;
   - includes constant volumetric and isochoric affine fields;
   - B-bar must reproduce the exact affine stress field and match standard plane strain whenever the mean dilatation equals the pointwise dilatation.

2. **Analytical thick cylinder in plane strain**
   - concentric annulus under internal pressure;
   - quarter or full annulus with exact circular geometry and symmetry as applicable;
   - analytical Lamé solution is independent of production FEM output;
   - fixed physical displacement/stress probes are used, never moving maxima.

   With tensile-positive stress and internal/external pressure `p_i`, `p_o`:

   `A = (p_i*a^2 - p_o*b^2)/(b^2-a^2)`

   `B = a^2*b^2*(p_i-p_o)/(b^2-a^2)`

   `sigma_r = A - B/r^2`

   `sigma_theta = A + B/r^2`

   `sigma_z = 2*nu*A`

   `u_r = (1+nu)/E * ((1-2nu)*A*r + B/r)`.

   The `B/r` displacement term remains finite as `nu -> 0.5`, making the case a direct volumetric-locking discriminator.

3. **Controlled distortion matrix**
   - regular mesh;
   - moderate deterministic distortion;
   - strong but still Jacobian-qualified deterministic distortion;
   - distortion definitions are frozen before observation and must retain existing full-parent Jacobian/topology/quality authority.

4. **Locking metric**
   - normalized compliance/displacement error at fixed analytical probes versus Lamé theory across the Poisson ladder;
   - stiffness inflation is reported explicitly;
   - standard `PLANE_STRAIN` at `nu >= 0.45` must continue to fail closed rather than being run outside its authority.

## Acceptance principles

- No benchmark/solver/mesh tolerance is loosened to obtain PASS.
- B-bar T6/Q8 must preserve symmetry, rigid-body, affine patch, positive-Jacobian, residual, equilibrium, and energy consistency gates.
- Near-incompressible acceptance is based on fixed physical probes and convergence, not contour maxima.
- The B-bar route must not introduce spurious zero-energy modes or negative/indefinite element stiffness under the qualified benchmark envelope.
- The formulation identity, element family, Poisson ratio, mesh identity, distortion identity, solver model hash, execution hash, and recovery hash must be retained in evidence.
- If a B-bar model contains a temperature load, it must fail closed until thermal B-bar authority is separately qualified.

## Planned controlled batches

### Batch 1 — freeze authority before observation
- ground current source/formulation/element/UI seams;
- create this work report;
- freeze machine-readable qualification programme and analytical oracle inputs;
- create draft PR.

### Batch 2 — formulation kernel
- add explicit `PLANE_STRAIN_BBAR` identity;
- preserve existing `PLANE_STRAIN` guard unchanged;
- implement common plane-strain deviatoric/bulk split;
- implement T6/Q8 mean-dilatation stiffness and retained B-bar element evidence;
- fail closed for T3 B-bar production use and for B-bar temperature loads.

### Batch 3 — recovery / energy custody
- reconstruct B-bar stress including `sigma_z` using retained element mean dilatation;
- make strain-energy recovery use the same deviatoric + mean-volumetric definition;
- bind formulation evidence/hashes into retained result/recovery custody.

### Batch 4 — independent benchmark harness
- implement independent Lamé oracle without importing production FEM mechanics;
- execute frozen nu ladder, T6/Q8 mesh ladders, and distortion matrix;
- report fixed-probe displacement/stress error, convergence and stiffness-inflation/locking metrics.

### Batch 5 — governed UI
- add explicit formulation selector with `Plane strain — standard displacement` and `Plane strain — B-bar (locking resistant)` labels;
- show qualification state and supported element families;
- preserve source-controlled guard and disable/explicitly block invalid combinations rather than silently substituting.

### Batch 6 — regression / exact-head handoff
- source guards for formulation identity and no legacy-guard weakening;
- existing local-continuum/B01/B02/visible-workbench regressions;
- exact-head CI evidence where infrastructure permits;
- release remains fail-closed unless every required gate executes and passes.

## External technical basis

Primary implementation concept reference:
- MOOSE Framework, Solid Mechanics / Volumetric Locking Correction: B-bar/mean-dilatation treatment separates volumetric and deviatoric response and replaces the volumetric strain/virtual-strain part with an element-averaged quantity.

The repository benchmark authority itself is analytical theory plus frozen machine-readable definitions; no third-party software result is used as the numerical target.

## Validation ledger

| Gate | Status | Notes |
|---|---|---|
| baseline source grounding | PASS | current main `543cd27c...` |
| legacy plane-strain guard preserved | PASS (source inspection) | warning 0.40 / block 0.45 |
| qualification programme frozen before new observation | IN_PROGRESS | machine-readable contract next |
| B-bar kernel | NOT_IMPLEMENTED | Batch 2 |
| B-bar recovery/energy | NOT_IMPLEMENTED | Batch 3 |
| analytical nu ladder | NOT_RUN | Batch 4 |
| distorted-mesh matrix | NOT_RUN | Batch 4 |
| UI selector | NOT_IMPLEMENTED | Batch 5 |
| exact-head regression | NOT_RUN | Batch 6 |

## Exact next action

Create the machine-readable frozen B-bar qualification contract, then open a draft PR before changing production mechanics.
