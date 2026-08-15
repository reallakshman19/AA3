# Empirical ROM — Circular Elbow Component Flexibility Work Report

## Recovery header

- Repository: `reallaksh19/Advanced_Analysis`
- WORK_INTENT: `IMPLEMENT`
- CRITICALITY: `ENGINEERING_CRITICAL`
- Stack base: PR #1145 exact head `ebf81fb1778237255eb9f4a60c6419e6600a8dcd`
- Working branch: `agent/empirical-rom-elbow-flexibility-20260815`
- Base PR remains draft/unmerged; this phase is intentionally stacked so #1145 is not enlarged.
- Merge authority: not granted.

## Mission

Extend the analytical piping ROM from straight prismatic members to an explicit planar circular-elbow component without changing the solution class to finite elements.

Target chain:

```text
rooted component tree
  + exact straight/circular-elbow geometry
  + first-principles unit-load cut equilibrium
  + EA / EI / GJ member properties
  + sealed component-local B31 bend flexibility authority
  -> virtual-work flexibility matrix F
  -> thermal reference displacement
  -> classical compatibility solve
```

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

For the current circular-pipe domain, `Iy == Iz` is required because no separate rotating principal-axis custody is introduced in this phase.

The B31 flexibility factor is a component-local code correction only. It does not replace geometry, equilibrium, moment transport, thermal strain, route topology, or compatibility mechanics.

## Authority rules

- Exact arc endpoints, center, plane normal, radius and included angle must be geometrically self-consistent.
- No long-radius default such as `1.5D` is permitted.
- No viewport/symbolic elbow fallback is permitted as mechanics authority.
- B31 bend factor authority must be a QUALIFIED result from the existing B31 factor calculator and must match the same bend radius, pipe OD/wall, pressure and elastic modulus used by the ROM component.
- SIFs are not used as stiffness/flexibility multipliers.
- Only B31 flexibility `k` is consumed by the component energy formulation.
- Pressure correction, when present in the sealed B31 flexibility factor, remains explicit source evidence; pressure thrust/Bourdon are not thereby introduced.
- No empirical response multipliers or calibration factors are permitted.

## Planned validation

Independent analytical oracles:

1. circular-arc geometry closure and arc length;
2. quarter-circle in-plane unit-load compliance with closed-form integrals;
3. quarter-circle out-of-plane compliance including torsion with closed-form integrals;
4. reciprocity for cross flexibility;
5. `k=1` base curved-beam result versus code-corrected `k>1` result;
6. B31J smooth-90 factor independent formula reproduction;
7. quadrature 16/32-order convergence;
8. reversed arc orientation invariance;
9. uniform thermal endpoint expansion `delta u = epsilon * (r_J-r_I)`;
10. fail-closed geometry, non-unit load direction, non-axisymmetric section and stale/mismatched factor authority.

## Exclusions

- no gap/contact/friction;
- no tee/reducer component flexibility;
- no nonlinear ovalization state evolution;
- no pressure thrust or Bourdon effects;
- no thermal gradient/bowing;
- no global FE stiffness matrix;
- no production method registration, Load Calc dispatch, publication or export changes.

## Status

- source grounding: `PASS / SOURCE_INSPECTION`;
- implementation: `IN_PROGRESS`;
- validation: `NOT_RUN` until code is committed and independently exercised;
- production authority: `NOT_REQUESTED / NOT_GRANTED`.
