# M047 technical review — PR 961 and PR 978

## Review basis

- PR 961 current head: `95fb71112575d0f9691b5cb8855e64ea7cebbe75`
- PR 978 current head: `a110da3822a07abbde1f3a4574ad58cb49ef8c2a`
- Base benchmark commit: `882d59a99c3a03847d20bec34770ba57ff479d91`
- Source: `D:\Code3\LFEA\BM4\BM4_NL\BM4_NL.ACCDB`
- Source SHA-256: `85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21`
- CAESAR version: 14.000
- Acceptance order: L19, then L20; restraint/displacement first; stress and EXP excluded.

## Verdict

Neither draft PR is technically sound for wholesale merge.

- PR 961 contains useful production mechanics, but its strongest benchmark result depends on enabling the smooth-90/B31J Note-3 correction without file- or load-case-specific authority. It also promotes a straight-pipe shear coefficient and Pmax pressure selection that are not established for CAESAR 14 in this model.
- PR 978 is a valuable qualification/evidence branch, not a production implementation. Its current I032 result explicitly remains diagnostic and blocks production promotion of kappa=0.53. Its accepted-parent chain also assumes the unresolved smooth-90 correction.
- The checked-in canonical BM4_NL benchmark report at both current PR heads still contains the production baseline counts. PR 961's improved full-head result required a fresh exact-head execution and is not represented by that checked-in canonical report.
- PR 961 currently has failing GitHub checks: one diagnostic patch duplicates an import, one exact-head workflow rejects out-of-slice changed paths, and one BM1 qualification job cannot find its required BM1 InputXML fixture. These are workflow failures rather than evidence that the accepted mechanics are wrong, but the PR is not merge-ready.

## Selective adoption decision

Adopted:

- B31.3 flexibility stiffness uses cold modulus Ec (`MODULUS`) for L19 and L20.
- MEC-21 equation (2.25) rotational Bourdon deformation is represented as one cumulative physical-bend free field, sampled at subdivision stations.
- Rigid elements receive the Translation + Rotation Bourdon pressure effect through the governed rigid-element geometry.
- Reducers receive closed-end pressure free elongation through their existing ten-cylinder condensed representation. The ten-cylinder midpoint-section rule remains identified as a candidate.
- The benchmark profile now carries executable configuration authority with the fixed precedence `load case > individual file > model input > global default`.

Not adopted:

- Smooth-90/B31J Note-3 correction: unresolved; `APPLY_B31J_SIFS_&_FLEX=DEFAULT` is insufficient authority.
- Timoshenko kappa=0.5 from PR 961 or kappa=0.53 from PR 978: no independent CAESAR 14 metallic-pipe implementation authority.
- Pmax as the elbow stiffening pressure rule: unresolved. P1 remains provisional and is numerically equal to Pmax in this locked ACCDB.
- Replacement of fixed DOFs with the 1.0E12 displayed-unit default restraint stiffness: exact CAESAR application to this model remains unresolved.

## Exact benchmark comparison

Counts are entities/components exceeding the unchanged 10% profile tolerance.

| Execution | L19 restraints | L19 disp/rot | L19 source actions | L20 restraints | L20 disp/rot | L20 source actions |
|---|---:|---:|---:|---:|---:|---:|
| Production baseline / PR 978 production | 1 / 1 | 50 / 72 | 13 / 20 | 5 / 5 | 45 / 71 | 46 / 137 |
| PR 961 full head, including unproven smooth-90 and shear changes | 0 / 0 | 20 / 25 | 0 / 0 | 3 / 3 | 45 / 64 | 18 / 34 |
| Selective authority-safe adoption | 1 / 1 | 49 / 68 | 15 / 22 | 5 / 5 | 45 / 72 | 46 / 135 |

The PR 961 numerical result is materially better but is not admissible under the supplied authority precedence. The selective result is the production-safe basis; it is not presented as closure.

## Current restraints exceeding 10%

| Case | Node | Global component | CAESAR (N) | LFEA (N) | Error |
|---|---:|---|---:|---:|---:|
| L19 | 20090 | FY | -1659.836792 | -1945.155249 | 17.19% |
| L20 | 20350 | FY | -1758.342407 | -1379.213062 | 21.56% |
| L20 | 20390 | FZ | -757.635376 | -675.403116 | 10.85% |
| L20 | 20550 | FZ | 26.630367 | 15.382671 | 22.50% |
| L20 | 22140 | FX | -718.479126 | -625.021328 | 13.01% |
| L20 | 22490 | FX | 1063.090820 | 951.407911 | 10.51% |

All incident global element-end action vectors at these restraints, plus every source-element action exceeding 10%, are in `reports/lfea-bm4nl-l19-l20-restraint-basis.md`.

## Equilibrium validation

The ACCDB reference equilibrium check passed all 582 nodal components in each case:

| Case | Maximum force residual | Maximum moment residual | Limit |
|---|---:|---:|---:|
| L19 | 0.000488 N | 0.000122 N.m | 0.1 N / 0.1 N.m |
| L20 | 0.002197 N | 0.000732 N.m | 0.1 N / 0.1 N.m |

## Route to the 10% goal

1. Establish the actual BM4_NL smooth-90/Note-3 file or case setting from a CAESAR-owned source. It is the largest demonstrated sensitivity, but it cannot be inferred from `DEFAULT`.
2. Establish CAESAR 14's metallic straight-pipe transverse shear formulation and effective shear area independently. PR 978 I032 is strong mechanism evidence, but kappa=0.53 is not production authority and must not be fitted to the final two rows.
3. Establish the L19/L20 elbow pressure-stiffening pressure source and any interaction with `BEND_AXIAL_SHAPE=YES`.
4. Establish how CAESAR applies the finite translational/rotational default stiffness to each BM4_NL restraint before replacing fixed DOFs.
5. Re-run L19 first after each atomic authority-backed change, retaining the incident-action/equilibrium ledger; only then carry the accepted mechanism into L20 and close its thermal provenance.
