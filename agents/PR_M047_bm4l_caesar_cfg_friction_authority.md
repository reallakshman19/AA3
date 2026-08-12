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

The friction-stiffness SI value remains `175126835.24647635 N/m` under the currently retained unit-normalization authority. `FRICT_SLIDE_MULT=1.0` is direct configuration evidence, not inference from BM4_L response fitting.

## Geometry/stiffness custody

The same cfg independently confirms global geometry/stiffness controls including:

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

No new geometry or structural stiffness mechanics are introduced here.

## Current L13 measured diagnostic accuracy

The existing F2 physical-Coulomb diagnostic used `|Ft| = mu*N`, numerically equivalent to Slide Multiplier `1.0`. The retained comparison is:

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

This remains **diagnostic accuracy**, not qualified production CAESAR parity. The fixed denominator remains 1,914 governed rows and no comparator/tolerance change is permitted to increase it.

## Restraint source-domain correction

F2.5 corrected an important source-custody distinction:

```text
ACCDB    INPUT_RESTRAINTS.RES_TYPEID -> use directly; no InputXML mutation
InputXML RESTRAINT.TYPE              -> apply governed mutation exactly once
```

The exact BM4_L InputXML mutation supplied on 2026-08-12 is:

```text
+Y   17 -> 14
LIM   7 -> 8
GUI  10 -> 9
X     1 -> 2
Y     2 -> 3
Z     3 -> 5
     18 -> 15
```

Therefore the earlier raw-InputXML interpretation `17=-Y`, `7=RZ`, `10=XSNB` is withdrawn. Raw InputXML codes are not product semantics until mutation is applied.

The corrected InputXML inventory is:

```text
ANC  1 row
LIM  6 rows
GUI 10 rows
+Y  29 rows
       --
       46 rows / 30 nodes
```

Twenty-six `+Y` rows carry `mu=0.3`. The corrected InputXML also contains six positive-gap rows total; five are companion rows on four friction nodes (`20030`, `20390`, `21480`, `22310`) and one GUI gap is on non-friction node `21640`.

The qualified linear solver remains ACCDB-based and must **not** apply this InputXML mutation to `RES_TYPEID`.

## Current authority boundary

Scalar friction configuration is closed:

```text
RESOLVED:
  friction stiffness
  friction normal-force variation = 0.15
  friction angle variation = 15 deg
  friction slide multiplier = 1.0
```

The existing BM4_L validation profile retains the user-verified file setting below. The source-normalization boundary itself is recorded in the F2.5 authority snapshot/report rather than silently changing the validation profile in this source-custody stage:

```text
RESTRAINT_DIRECTIONAL_BEHAVIOR = BIDIRECTIONAL
```

Remaining nonlinear authority is limited to the ACCDB restraint-class/state semantics and friction/contact update ordering:

```text
ACCDB_RESTRAINT_TYPE_SEMANTIC_CLASSIFICATION_REQUIRED_FOR_NONLINEAR_CONTROLLER
LIM_GUI_GAP_CONTACT_STATE_SEMANTICS_AUTHORITY_REQUIRED
FRICTION_STATE_HISTORY_SEMANTICS_AUTHORITY_REQUIRED
```

None may be closed by selecting the state that minimizes BM4_L residuals.

## Future Roadmap

### F2.5 — source-domain restraint authority

Complete and retain the exact boundary:

- ACCDB `RES_TYPEID`: direct, no mutation;
- InputXML `TYPE`: exact user-supplied mutation once before classification;
- corrected InputXML classes: `ANC/LIM/GUI/+Y`;
- 26 friction `+Y` rows;
- six positive-gap rows total, including the five friction-coupled companions.

No production mechanics change is authorized by this source-normalization stage.

### F2.6 — exact ACCDB semantic reconciliation

Use the exact ACCDB artifact as the production source and establish the ACCDB-specific type/class semantics with pinned evidence. Reconcile by node, direction, gap and friction fields against the corrected InputXML view without requiring numeric code equality between source domains.

Preserve the file-level `RESTRAINT_DIRECTIONAL_BEHAVIOR = BIDIRECTIONAL` authority. Do not mutate ACCDB values and do not infer type/state from CAESAR accuracy.

### F2.7 — gap/contact and friction state evidence

Capture exact-build L13 Active Boundary Conditions and nonlinear iteration/status evidence sufficient to resolve:

- LIM/GUI gap OPEN/CLOSED/REOPENED ordering;
- restraint-state commit/convergence ordering;
- STICK -> SLIDING scheduling;
- first-slide 15-degree handling;
- subsequent friction-direction/zero-crossing handling;
- held versus recomputed normal-force basis around the 0.15 threshold.

Treat this as product authority, never as BM4_L parameter fitting.

### F2.8 — governed nonlinear integration

Only after F2.6/F2.7 independently close the semantics, integrate exact restraint/contact/friction rules into the governed nonlinear controller. Preserve the qualified structural element operator and exact zero-friction bypass identity for L2/L3/L4/L5/L6/L14.

### F2.9 — qualify L13 first

Solve L13 (`W+P1`, friction multiplier 1) first. Require nonlinear equilibrium convergence, stable state, unchanged tolerances/zero boundaries, and literal comparison on exactly 1,914 governed rows. Only this stage may replace the historical 89.8119% diagnostic with a qualified L13 accuracy result.

### F3 — L7 and algebraic L15

After L13 is stable and qualified, solve L7 (`W+T1+P1`) against L5. Derive L15 algebraically as `L7 - L13`; never solve L15 independently.

### F4/F5 — later friction families

After ordinary friction is qualified, address hydro friction L1. Defer L9/L11 and L16-L20 until independent T2/T3 thermal authority is available.

### Final exact-head qualification

Any production nonlinear mechanics change must finish with exact-head Windows/ACE qualification and artifact custody. Automatic CI is integration evidence only.

## Roadmap guardrails

The roadmap does **not** authorize:

- applying InputXML mutation to ACCDB;
- interpreting raw InputXML TYPE without mutation;
- forcing the two source domains into one numeric namespace;
- choosing LIM/GUI/friction states from the CAESAR error surface;
- tuning damping/relaxation or friction constants from BM4_L accuracy;
- changing comparator/tolerance/zero-reference boundaries;
- changing gravity, bends, tees/B31J, reducer station, pressure, or thermal mechanics to improve friction residuals;
- solving L15 independently;
- calling a nonconverged iterate an accuracy result.

## Changed scope

This work report records the exact cfg authority, source-normalization correction, current L13 diagnostic status, and future roadmap. It does not change PR #1001, Issue #991, the production solver, comparator, tolerance, reference response, friction coefficient, or load-case definitions.

## Decision

**F2.4 SCALAR FRICTION CONFIGURATION IS CLOSED. F2.5 MAKES RESTRAINT CUSTODY SOURCE-DOMAIN-CORRECT: ACCDB DIRECT, INPUTXML MUTATED ONCE. THE 89.8119% L13 VALUE REMAINS HISTORICAL DIAGNOSTIC ONLY. NEXT WORK IS ACCDB RESTRAINT/CONTACT STATE AUTHORITY, THEN L13 -> L7 -> L15 QUALIFICATION.**
