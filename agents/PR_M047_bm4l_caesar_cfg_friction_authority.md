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

## Effect on L13

The existing F2 physical-Coulomb diagnostic already used `|Ft| = mu*N`, numerically equivalent to Slide Multiplier `1.0`. Therefore the cfg does **not** change the retained converged L13 comparison:

```text
1719 / 1914 = 89.8119122257%
```

What changes is the authority classification: that sliding magnitude is no longer a guessed/compatible scalar.

The L13/L7 readiness blockers reduce from three to two:

```text
RESOLVED:
  FRICTION_SLIDE_MULTIPLIER_AUTHORITY_REQUIRED -> CLOSED (1.0 exact cfg)

REMAINING:
  FRICTION_STATE_HISTORY_SEMANTICS_AUTHORITY_REQUIRED
  GAP_CONTACT_STATE_SEMANTICS_AUTHORITY_REQUIRED
```

F2.2 remains a valid negative result: with `SlideMultiplier=1`, `NormalForceVar=0.15`, and `AngleVar=15` exactly confirmed, the literal public-help update interpretation still does not converge. Thus the missing information is now narrowed to update/order semantics rather than scalar configuration.

## Changed scope

This layer adds the retained cfg text, a structured authority manifest, an authority checker, this report, and updates the readiness snapshot. It does not change the BM4_L solver, comparator, tolerance, reference response, friction coefficient, load-case definitions, workflow, PR #1001, or Issue #991.

## Decision

**F2.4 SLIDE MULTIPLIER RESOLVED AT 1.0 FROM EXACT CFG. L13 REMAINS BLOCKED ONLY ON STATE-HISTORY AND GAP/CONTACT SEMANTICS.**
