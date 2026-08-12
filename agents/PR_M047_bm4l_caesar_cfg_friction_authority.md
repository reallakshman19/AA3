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

## Exact friction controls

The cfg directly resolves:

```text
FRICT_STIF            = 1,000,000 raw CAESAR static configuration value
FRICT_NORM_FORCE_VAR  = 0.15
FRICT_ANGLE_VAR       = 15 deg
FRICT_SLIDE_MULT      = 1.0
```

The friction-stiffness SI value remains `175126835.24647635 N/m`, based on the already independent BM1 product observation/source-unit qualification. The cfg supplies the exact raw static configuration value; it does not reverse the established source-unit qualification.

`FRICT_SLIDE_MULT=1.0` is direct configuration evidence, not inference from `mu*N`, BM1 final reactions, or BM4_L response fitting.

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

`benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json` carries the four resolved global nonlinear friction controls and the explicit configuration precedence boundary. The profile records model/file/load-case authority above global cfg authority and explicitly identifies ambient temperature, Bourdon mode, coefficient of friction, and Ec/Eh selection as non-governing global defaults for BM4_L.

The profile therefore has no unresolved scalar friction configuration values.

## Current L13 measured diagnostic accuracy

The existing F2 physical-Coulomb diagnostic used `|Ft| = mu*N`, numerically equivalent to Slide Multiplier `1.0`. Therefore the cfg alone did not change the retained comparison:

```text
passed   = 1719
failed   = 195
total    = 1914
accuracy = 89.8119122257%
```

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

## Critical restraint-code source audit

A subsequent source audit identified a more fundamental issue than the remaining friction iteration controls: the exported CAESAR restraint `TYPE`/`RES_TYPEID` value is an integer **Restraint Code**, not a generic direction-cosine category.

The official CAESAR code mapping relevant to BM4_L is:

```text
1  = ANC   anchor
7  = RZ    rotational double-acting restraint
10 = XSNB  translational double-acting static snubber
17 = -Y    translational directional restraint
```

This invalidates the earlier source-map description of Type 7 / Type 10 rows as generic translational gap companions. In particular:

- Type 7 must be interpreted as an **RZ rotational restraint**; a rotational GAP is angular, in degrees.
- Type 10 must be interpreted as **XSNB**, whose static participation is controlled by load-case snubber activation rather than by generic translational-contact logic.
- Type 17 must retain its **-Y one-way directional semantics** in addition to any friction coefficient.

The current ACCDB linear restraint compiler also requires re-audit because it maps every non-anchor row to the dominant translational direction cosine. That shortcut cannot represent RZ, XSNB activation, or -Y one-way behavior exactly.

No production restraint behavior is changed in F2.4. The existing 89.8119% L13 diagnostic is retained as a historical baseline but is now explicitly understood to sit on a restraint-classification model that requires qualification before production promotion.

## Current authority boundary

Scalar friction configuration is closed:

```text
RESOLVED:
  friction stiffness
  friction normal-force variation = 0.15
  friction angle variation = 15 deg
  friction slide multiplier = 1.0
```

The next blockers are now phrased around the actual exported restraint classes:

```text
CAESAR_RESTRAINT_CODE_SEMANTICS_INTEGRATION_REQUIRED
DIRECTIONAL_RESTRAINT_STATE_SEMANTICS_AUTHORITY_REQUIRED
STATIC_SNUBBER_LOAD_CASE_ACTIVATION_AUTHORITY_REQUIRED
ROTATIONAL_GAP_STATE_SEMANTICS_AUTHORITY_REQUIRED
FRICTION_STATE_HISTORY_SEMANTICS_AUTHORITY_REQUIRED
```

Some of these may close directly from exact source + official product behavior; none may be closed by choosing the state that minimizes BM4_L residuals.

## Future Roadmap

### F2.5 — exported restraint-code authority and source-map correction

Decode the pinned InputXML/ACCDB restraint rows by official CAESAR restraint code rather than by direction cosine alone. Produce a v2 BM4_L restraint/friction source map that separately identifies:

- ANC rows;
- RZ rotational rows and angular gaps;
- XSNB rows and snubber activation requirements;
- -Y directional rows, including the 26 rows carrying `mu=0.3`;
- friction coefficient and normal/contact direction as distinct concepts.

Remove the old `positiveGapCompanionCount` proxy for translational contact. Do not change the production solver in this stage.

### F2.6 — qualify BM4_L restraint state by case

For L6/L13 specifically, resolve the case behavior of:

1. `-Y` one-way directional restraints under the BM4_L Y-up convention;
2. XSNB participation in SUS load cases;
3. RZ rotational restraints and any declared rotational gap.

Run frictionless structural A/B diagnostics only after those semantics are pinned. A failed or unstable interpretation is evidence against that interpretation, not permission to flip a sign or activate a restraint from residual accuracy.

### F2.7 — CAESAR Active Boundary Conditions and nonlinear trace

Capture exact-build L13 CAESAR evidence with pinned input/configuration custody. The preferred final-state artifact is **Active Boundary Conditions** plus enough nonlinear iteration/status trace to distinguish:

- final active/inactive one-way restraint state;
- RZ gap state;
- snubber participation state;
- STICK -> SLIDING transition scheduling;
- first-slide 15-degree angle handling;
- subsequent friction-direction/zero-crossing handling;
- held versus recomputed normal-force basis around the 0.15 threshold;
- convergence/commit ordering.

This evidence is product-state authority, not a parameter-fitting source.

### F2.8 — governed production nonlinear integration

Only after F2.5-F2.7 resolve the restraint/state semantics, integrate the exact rules into the governed solver. Preserve exact zero-friction bypass identity for L2/L3/L4/L5/L6/L14 and do not alter the qualified structural element operator.

### F2.9 — qualify L13 first

Solve L13 (`W+P1`, friction multiplier 1) as the first production nonlinear case. Require:

- nonlinear equilibrium convergence;
- stable restraint/friction state;
- literal governed comparison on exactly 1,914 rows;
- unchanged comparison tolerances and zero-reference boundaries;
- family-by-family pass/fail counts.

Only this stage may replace the current 89.8119% historical diagnostic value with a qualified L13 accuracy result.

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

- choosing one-way, STICK/SLIDING, snubber, or rotational-gap states from the CAESAR error surface;
- tuning damping/relaxation from BM4_L accuracy;
- changing friction stiffness, Slide Multiplier, 0.15 normal-force variation, or 15-degree angle variation;
- changing comparator/tolerance/zero-reference boundaries;
- changing gravity, bends, tees/B31J, reducer station, pressure, thermal authority, or other structural mechanics to improve friction residuals;
- solving L15 independently;
- calling any nonconverged iterate an accuracy result.

## Changed scope

This layer retains the cfg text, structured authority manifest, validation-template integration, authority/readiness consistency checks, L13 diagnostic authority update, and this corrected work report/roadmap. It does not change the BM4_L production solver, comparator, tolerance, reference response, friction coefficient, load-case definitions, PR #1001, or Issue #991.

## Decision

**F2.4 SCALAR FRICTION CONFIGURATION IS CLOSED. THE 89.8119% L13 VALUE REMAINS A HISTORICAL DIAGNOSTIC BASELINE. NEXT WORK MUST FIRST QUALIFY EXPORTED RESTRAINT-CODE SEMANTICS, THEN STATE HISTORY, BEFORE ANY PRODUCTION L13 ACCURACY CLAIM.**
