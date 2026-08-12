# M047 BM4_L — CAESAR v14 configuration authority (F2.4)

## Mission

Capture the exact user-supplied CAESAR II Version 14 global configuration relevant to BM4_L stiffness/geometry and nonlinear friction controls, while preserving the explicit precedence rule that BM4_L file/load-case settings override global values for ambient temperature, friction coefficient, Bourdon mode, and Ec/Eh selection.

## Exact source

User-supplied on 2026-08-12 from the CAESAR II 14.000 configuration used with the BM4_L environment. The retained byte-oriented text evidence is:

`benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-caesar14-user-supplied.cfg.txt`

## Override boundary

The following global cfg rows are retained for custody but are **not BM4_L governing authority**:

```text
DEFAULT_AMBIENT_TEMPERATURE = 70 F
BOURDON_PRESSURE = NONE
COEFFICIENT_OF_FRICTION_(MU) = 0
Ec/Eh selection = not sourced from this cfg
```

BM4_L continues to use its independently established file/model/load-case authority for those quantities. In particular, the cfg `MU=0` must never zero the BM4_L positive-friction model sites.

## Newly exact friction controls

The cfg directly resolves:

```text
FRICT_STIF            = 1,000,000 raw CAESAR static configuration value
FRICT_NORM_FORCE_VAR  = 0.15
FRICT_ANGLE_VAR       = 15 deg
FRICT_SLIDE_MULT      = 1.0
```

The friction-stiffness SI value remains `175126835.24647635 N/m`, based on the already independent BM1 product observation/source-unit qualification. The cfg supplies the exact raw static configuration value; it does not reverse the established source-unit qualification.

The key new authority is:

```text
FRICTION_SLIDE_MULTIPLIER = 1.0
```

This is now direct configuration evidence, not inference from `mu*N`, BM1 final reactions, or BM4_L response fitting.

## Geometry/stiffness custody

The same cfg independently confirms the global geometry/stiffness controls including:

```text
CONNECT_GEOMETRY_THRU_CNODES = YES
MIN_ALLOWED_BEND_ANGLE = 5 deg
MAX_ALLOWED_BEND_ANGLE = 95 deg
BEND_LENGTH_ATTACHMENT_PERCENT = 1
MIN_ANGLE_TO_ADJACENT_BEND_PT = 5 deg
BEND_AXIAL_SHAPE = YES
DEFAULT_TRANS_RESTRAINT_STIFF = 1e12 raw cfg
DEFAULT_ROT_RESTRAINT_STIFF = 1e12 raw cfg
Z_AXIS_UP = NO
USE_PRESSURE_STIFFENING = DEFAULT
```

No new geometry or stiffness mechanics are introduced in this batch; this is authority custody only.

## Validation-template integration

`benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json` now carries the four resolved global nonlinear friction controls and the explicit configuration precedence boundary. The profile records model/file/load-case authority above global cfg authority and explicitly identifies ambient temperature, Bourdon mode, coefficient of friction, and Ec/Eh selection as non-governing global defaults for BM4_L.

The profile therefore has no unresolved scalar friction configuration values. The remaining friction work is algorithmic/state-semantic only.

## Current L13 measured diagnostic accuracy

The existing F2 physical-Coulomb diagnostic already used `|Ft| = mu*N`, numerically equivalent to Slide Multiplier `1.0`. Therefore the cfg does **not** change the retained converged L13 comparison:

```text
passed  = 1719
failed  = 195
total   = 1914
accuracy = 89.8119122257%
```

Governed breakdown:

| Quantity | Pass | Fail | Total | Accuracy |
|---|---:|---:|---:|---:|
| Displacement | 279 | 12 | 291 | 95.8763% |
| Rotation | 264 | 27 | 291 | 90.7216% |
| Restraint force | 77 | 13 | 90 | 85.5556% |
| Restraint moment | 90 | 0 | 90 | 100.0000% |
| Source-end force FROM | 256 | 32 | 288 | 88.8889% |
| Source-end force TO | 255 | 33 | 288 | 88.5417% |
| Source-end moment FROM | 249 | 39 | 288 | 86.4583% |
| Source-end moment TO | 249 | 39 | 288 | 86.4583% |

This remains **diagnostic accuracy**, not qualified production CAESAR parity. The fixed denominator remains 1,914 governed rows and no comparator/tolerance change is permitted to increase the result.

## Current nonlinear authority boundary

The L13/L7 readiness blockers reduce from three to two:

```text
RESOLVED:
  FRICTION_SLIDE_MULTIPLIER_AUTHORITY_REQUIRED -> CLOSED (1.0 exact cfg)

REMAINING:
  FRICTION_STATE_HISTORY_SEMANTICS_AUTHORITY_REQUIRED
  GAP_CONTACT_STATE_SEMANTICS_AUTHORITY_REQUIRED
```

F2.2 remains a valid negative result: with `SlideMultiplier=1`, `NormalForceVar=0.15`, and `AngleVar=15` exactly confirmed, the literal public-help update interpretation still does not converge. Thus the missing information is narrowed to state/update ordering rather than scalar configuration.

F2.3 separately proves that the stable fixed-contact physical-Coulomb solution is not a numerical damping artifact: multiple independent convergent damping choices collapse to the same 7-STICK / 19-SLIDING fixed point with negligible solution differences and closed nonlinear equilibrium.

## Future Roadmap

### F2.5 — deterministic unilateral gap/contact admissibility diagnostic

Implement the five positive-gap companions as unilateral contact constraints using only source geometry and compatibility:

1. evaluate signed relative movement along each restraint direction;
2. compare it with the exact source gap distance;
3. activate resistance only when the admissible gap is exhausted;
4. release the restraint when the solved reaction is inconsistent with unilateral contact;
5. repeat the global solve until the contact active set and friction state are stable.

This stage must preserve the exact reconstructed 1,938-DOF L6 operator, `mu=0.3`, friction stiffness `175126835.24647635 N/m`, `FRICT_SLIDE_MULT=1.0`, `FRICT_NORM_FORCE_VAR=0.15`, `FRICT_ANGLE_VAR=15 deg`, and the existing 1,914-row comparator. CAESAR reference accuracy may be measured only after convergence; it may never choose the contact state.

F2.5 is diagnostic until exact CAESAR active-boundary/state-history evidence confirms the ordering.

### F2.6 — capture CAESAR L13 Active Boundary Conditions

Obtain the exact CAESAR II `14.00.00.0910 Build 231113` L13 Active Boundary Conditions output with pinned input/configuration custody. The required evidence is the final active/inactive state of the five positive-gap companions and friction-restraint state representation. This is the preferred final-state discriminator for `GAP_CONTACT_STATE_SEMANTICS_AUTHORITY_REQUIRED`.

### F2.7 — capture nonlinear iteration/state history

Capture a CAESAR nonlinear iteration trace sufficient to distinguish:

- STICK -> SLIDING transition scheduling;
- first-slide 15-degree angle handling;
- subsequent friction-direction/zero-crossing handling;
- held versus recomputed normal-force basis around the 0.15 threshold;
- gap OPEN/CLOSED/REOPENED ordering relative to friction updates;
- convergence/commit ordering for the final restraint state.

The trace must be treated as product authority, not as a BM4_L response-fitting source.

### F2.8 — governed production nonlinear integration

Only after F2.6/F2.7 independently resolve the remaining semantics, integrate those exact rules into the governed nonlinear controller. Preserve exact zero-friction bypass identity for L2/L3/L4/L5/L6/L14 and do not alter the qualified linear operator.

### F2.9 — qualify L13 first

Solve L13 (`W+P1`, friction multiplier 1) as the first production nonlinear case. Require:

- nonlinear equilibrium convergence;
- stable restraint/contact state;
- literal governed comparison on exactly 1,914 rows;
- unchanged comparison tolerances and zero-reference boundaries;
- explicit family-by-family pass/fail counts.

Only this stage may replace the current 89.8119% diagnostic value with a qualified L13 accuracy result.

### F3 — L7 and L15

After L13 is stable and qualified, solve L7 (`W+T1+P1`) against L5. Do not mix L7 debugging into unresolved L13 mechanics. Derive L15 algebraically as `L7 - L13`; never solve L15 as an independent nonlinear equilibrium case.

### F4/F5 — later friction families

After ordinary friction is qualified:

- address hydro friction L1;
- defer L9/L11 and L16-L20 until independent T2/T3 thermal authority is available;
- preserve the same authority firewall against residual fitting.

### Final exact-head qualification

Any production nonlinear mechanics change must finish with exact-head Windows/ACE qualification and artifact custody. Automatic CI may provide integration evidence, but it is not a substitute for the exact production qualification boundary.

## Roadmap guardrails

The roadmap does **not** authorize:

- choosing STICK/SLIDING/gap states from the CAESAR error surface;
- tuning damping/relaxation from BM4_L accuracy;
- changing friction stiffness, Slide Multiplier, 0.15 normal-force variation, or 15-degree angle variation;
- changing comparator/tolerance/zero-reference boundaries;
- changing gravity, bends, tees/B31J, reducer station, pressure, thermal authority, or other linear mechanics to improve friction residuals;
- solving L15 independently;
- calling any nonconverged iterate an accuracy result.

## Changed scope

This layer retains the cfg text, structured authority manifest, validation-template integration, authority/readiness consistency checks, L13 diagnostic authority update, and this work report/roadmap. It does not change the BM4_L production solver, comparator, tolerance, reference response, friction coefficient, load-case definitions, PR #1001, or Issue #991.

## Decision

**F2.4 SCALAR FRICTION CONFIGURATION IS CLOSED. CURRENT L13 DIAGNOSTIC ACCURACY IS 89.8119%. FUTURE ACCURACY WORK IS LIMITED TO STATE-HISTORY ORDERING AND UNILATERAL GAP/CONTACT ACTIVE-SET SEMANTICS, FOLLOWED BY L13 -> L7 -> L15 QUALIFICATION.**
