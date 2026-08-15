# Empirical ROM — Circular Elbow Component Flexibility Work Report

## Recovery header

- Repository: `reallaksh19/Advanced_Analysis`
- WORK_INTENT: `IMPLEMENT`
- CRITICALITY: `ENGINEERING_CRITICAL`
- Stack base: PR #1145 exact head `ebf81fb1778237255eb9f4a60c6419e6600a8dcd`
- Working branch: `agent/empirical-rom-elbow-flexibility-20260815`
- Base PR remains draft/unmerged; this phase is intentionally stacked so #1145 is not enlarged.
- Merge authority: not granted.
- State: `EXPERIMENTAL_COMPONENT_ROM`.

## Handover in 60 seconds

This stack extends the analytical piping ROM from straight prismatic members to a continuous planar circular elbow.

```text
rooted component tree
  + exact straight/circular-elbow geometry
  + unit-load cut equilibrium
  + EA / EI / GJ member properties
  + component-local B31J bend flexibility authority
  -> continuous virtual-work flexibility matrix F
  -> thermal reference displacement
  -> classical compatibility solve
```

The elbow is **not** represented by 8 or 16 beam chords in this path. Its centerline and moving local frame are integrated continuously with fixed 16/32 Gauss-Legendre convergence evidence.

The B31J flexibility factor is the intentionally retained code/empirical part of the model. Geometry, equilibrium, moment transport, axial/bending/torsional energy, thermal expansion and compatibility remain explicit mechanics.

No SIF is consumed as a stiffness/flexibility multiplier.

## Governing mechanics

For a circular elbow parameterized by arc coordinate `theta`:

```text
r(theta) = C + R e_r(theta)
t(theta) = d r / d s
F_int(theta) = -F_unit
M_int(theta) = -(r_load - r(theta)) x F_unit
```

The internal resultants are projected onto the moving elbow frame:

```text
N = F_int dot t
M_in_plane = M_int dot n_plane
M_out_of_plane = M_int dot e_r
T = M_int dot t
```

The component virtual-work contribution is:

```text
f_ij = integral [
  N_i N_j / EA
  + k_in M_ip_i M_ip_j / EI
  + k_out M_op_i M_op_j / EI
  + k_t T_i T_j / GJ
] ds
```

For the current public mixed-component route, every component must satisfy the axisymmetric-section gate because the unit-load mechanics use a deterministic transverse basis and no separate principal-axis custody exists yet.

## Thermal kinematics

Uniform isotropic thermal strain is treated as free strain, not as a direct thermal force.

For a straight component:

```text
Delta u = epsilon_th * (r_J - r_I)
```

For a circular elbow:

```text
Delta u = integral epsilon_th * t ds
        = epsilon_th * (r_J - r_I)
```

The elbow also retains the physical arc-length expansion:

```text
Delta L_arc = epsilon_th * R * theta
```

The accumulated endpoint translation is then projected onto restraint coordinates and passed to the existing force-method compatibility solve.

## B31J flexibility custody

`buildEmpiricalElbowFlexibilityAuthorityFromB31J(...)` consumes the existing B31 factor calculator and requires:

- `componentType = BEND`;
- `status = QUALIFIED`;
- ASME B31J source identity;
- exact component identity match;
- bend-radius match to the continuous arc;
- declared bend-angle match when the B31 request carries an angle.

It projects only:

```text
factors.flexibility.inPlane
factors.flexibility.outOfPlane
factors.flexibility.torsional
```

into the ROM flexibility authority.

It does **not** project:

```text
displacement SIFs
sustained indices
occasional indices
stress-recovery factors
```

into stiffness.

Pressure correction may modify the sealed B31J `k` through the existing B31J formula. This does not introduce separate pressure-thrust, Bourdon or general pressure-stiffening mechanics into the ROM.

## Geometry authority rules

- Exact arc endpoints, center, plane normal, radius and included angle must be geometrically self-consistent.
- Current sweep domain is `0 < theta < 180 deg`.
- No long-radius default such as `1.5D` is permitted.
- No viewport/symbolic elbow fallback is permitted as mechanics authority.
- Existing renderer logic that may infer LR radius or bend center is explicitly not consumed by this ROM.
- B31 supplementary geometry can authoritatively contribute radius/angle/code-factor inputs but does not by itself establish 3D bend center and plane authority.

Therefore canonical 3D elbow-arc custody from imported source data remains a separate intake seam before production integration.

## New formula registry entries

```text
EMP-THM-007  circularElbowThermalChordExpansion
EMP-FLX-014  circularElbowGeometry
EMP-FLX-015  circularElbowUnitLoadAction
EMP-FLX-016  circularElbowVirtualWork
EMP-FLX-017  codeComponentFlexibilityWeighting
EMP-FLX-018  componentFlexibilityMatrixAssembly
```

## Independent analytical validation

### VAL-ELB-001 — quarter-circle in-plane / out-of-plane compliance

- STATUS: `PASS`
- OBSERVATION: `LOCAL_INDEPENDENT_REPRODUCTION`
- ORACLE: closed-form integration + independent numerical integration, not repository code.

Benchmark:

```text
R = 1.2 m
E = 200 GPa
G = 76.923076923 GPa
A = 0.004 m2
Iy = Iz = 8e-6 m4
J = 1.6e-5 m4
k_in = k_out = 2.5
k_t = 1
phi = pi/2
```

Closed forms:

```text
fxx = R(pi/4)/(EA) + k R^3(pi/4)/(EI)
fyy = R(pi/4)/(EA) + k R^3(3pi/4-2)/(EI)
fxy = R(1/2)/(EA) - k R^3(1/2)/(EI)
fzz = R^3 [ k(pi/4)/(EI) + (3pi/4-2)/(GJ) ]
```

Independent values:

```text
fxx = 2.1217531384182062e-6 m/N
fyy = 9.6290322076442700e-7 m/N
fxy = -1.3492500000000000e-6 m/N
fzz = 2.6206721054036620e-6 m/N
```

An independent adaptive numerical integral of the same continuum equations reproduced these values.

### VAL-ELB-002 — reciprocity and sign convention

- STATUS: `PASS`
- OBSERVATION: `LOCAL_INDEPENDENT_REPRODUCTION`

The independently integrated cross coefficient satisfies:

```text
fxy = fyx = -1.34925e-6 m/N
```

At the rooted start of the benchmark arc:

```text
+X tip unit load -> N = -1 N, M_in_plane = +1.2 N.m
+Y tip unit load -> N =  0 N, M_in_plane = -1.2 N.m
```

This freezes the cut-action and moment-transport signs.

### VAL-ELB-003 — 16/32 Gauss-Legendre convergence oracle

- STATUS: `PASS`
- OBSERVATION: `LOCAL_INDEPENDENT_REPRODUCTION`

Independent 16- and 32-point Gauss-Legendre integrations differed only at approximately `1e-21` to `1e-22 m/N` on the benchmark terms, well inside the committed fixed convergence policy.

### VAL-ELB-004 — thermal curved-centerline identity

- STATUS: `PASS`
- OBSERVATION: `LOCAL_INDEPENDENT_REPRODUCTION`

For `epsilon_th = 0.001`:

```text
endpoint translation = [0.0012, 0.0012, 0] m
arc-length expansion  = 0.0018849555921538756 m
```

### VAL-ELB-005 — two-coordinate thermal compatibility

- STATUS: `PASS`
- OBSERVATION: `LOCAL_INDEPENDENT_REPRODUCTION`
- ORACLE: independent direct 2x2 inverse of the closed-form flexibility matrix.

Rigid X/Y restraint of the heated quarter-circle gives reaction on pipe:

```text
Rx = -12466.2653289243 N
Ry = -18714.3506288673 N
```

These are intentionally not `-EA alpha DeltaT`; the curved route relieves thermal expansion by bending flexibility.

### VAL-ELB-006 — B31J smooth-90 k

- STATUS: `PASS`
- OBSERVATION: `LOCAL_INDEPENDENT_REPRODUCTION`

Inputs:

```text
OD = 0.2191 m
t  = 0.01509 m
Rb = 0.3048 m
E  = 184 GPa
P  = 0
```

Independent calculation:

```text
rm = (OD-t)/2 = 0.102005 m
h = t*Rb/rm^2 = 0.44203970669436554
k_smooth90 = 1.3/h = 2.9409122762332394
```

For `P = 10 MPa`, independent B31J pressure-flexibility denominator:

```text
1 + 6(P/E)(rm/t)^(7/3)(Rb/rm)^(1/3)
= 1.0405794767262309
```

so:

```text
k_pressure_corrected = 2.826225523383999
```

### VAL-ELB-007 — section-orientation custody review

- STATUS: `PASS`
- OBSERVATION: `SOURCE_REVIEW`

Initial review found the mixed route would accept a non-axisymmetric straight section while using deterministic transverse axes. The public route was corrected with `rooted-tree-component-flexibility-gate.js`; all mixed-route sections now require `Iy ~= Iz` within `1e-10` until separate principal-axis custody exists.

## Committed repository validation scripts

```text
scripts/empirical-circular-elbow-flexibility-check.mjs
scripts/empirical-component-section-custody-check.mjs
```

They cover:

1. circular geometry closure;
2. pointwise action signs;
3. the four closed-form compliance values above;
4. Maxwell-Betti reciprocity;
5. `k=1` versus `k>1` energy separation;
6. curved thermal translation/arc expansion;
7. mixed component-tree assembly;
8. two-coordinate thermal compatibility;
9. independent B31J smooth-90 and pressure-corrected k formulas;
10. fail-closed radius, plane, unit-vector, axisymmetry, authority-radius, angle and B31J applicability cases;
11. source guards against SIF-as-flexibility, old empirical compliance multipliers and planar FE assembly;
12. public mixed-route axisymmetry gate.

Repository import-graph execution of these committed scripts is currently:

- STATUS: `NOT_RUN / INFRASTRUCTURE_BLOCKED`
- REASON: clean `git clone` from the execution container failed with `Could not resolve host: github.com`.

This is not a mechanics or test failure and is not reported as PASS.

## Changed-file intent

Expected stack-only files:

- `agents/PR_ELBOW_ROM_workreport.md`
- `scripts/empirical-circular-elbow-flexibility-check.mjs`
- `scripts/empirical-component-section-custody-check.mjs`
- `src/core/empirical-piping-mechanics/circular-elbow-flexibility.js`
- `src/core/empirical-piping-mechanics/rooted-tree-component-flexibility.js`
- `src/core/empirical-piping-mechanics/rooted-tree-component-flexibility-gate.js`
- `src/core/empirical-piping-mechanics/contracts.js`
- `src/core/empirical-piping-mechanics/index.js`
- `src/workspace/engineering-loads/adapters/b31j-elbow-to-empirical-flexibility.js`

## Negative assurance / exclusions

This stack does **not**:

- modify PR #1145 compatibility/thermal equations;
- modify existing production `EMPIRICAL_RESTRAINT_NETWORK_V1/V2` mechanics or multipliers;
- modify existing Beam Contact segmented-elbow behavior;
- use segmented beam chords as authority for the new elbow route;
- use SIFs as flexibility factors;
- infer `1.5D` bend radius;
- consume renderer geometry fallbacks;
- solve gap/contact/friction;
- establish tee/reducer component flexibility;
- model nonlinear ovalization state evolution;
- add pressure thrust or Bourdon effects;
- model thermal gradients/bowing;
- assemble a global FE stiffness matrix;
- register a production method;
- change Load Calc dispatch, UI, publication, export or reports.

## Remaining seams before production

1. canonical source-backed 3D elbow center/plane/endpoint authority;
2. full repository/exact-head execution and regression;
3. route-family benchmark library including straight+elbow combinations;
4. independent commercial/FEA comparison across bend radius, D/t, pressure and angle domain;
5. later tee/reducer component mechanics;
6. later active-set contact/gap mechanics.

## Disposition

- implementation: `COMPLETE_FOR_EXPERIMENTAL_STACK`;
- independent analytical oracle: `PASS`;
- committed repository scripts: `NOT_RUN / INFRASTRUCTURE_BLOCKED`;
- production cutover: `NOT_REQUESTED / NOT_GRANTED`;
- merge authority: `NOT_GRANTED`.
