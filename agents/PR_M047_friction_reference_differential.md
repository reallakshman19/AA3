# M047 BM4_L friction reference differential — F1.2

## Mission

Pin and replay the CAESAR reference-side differential surfaces for the first two BM4_L friction qualification pairs without fitting any solver mechanics:

```text
L13 - L6 : same nominal loads W+P1, friction multiplier 1 vs 0
L7  - L5 : same nominal loads W+T1+P1, friction multiplier 1 vs 0
```

This is evidence/tooling only. It does not solve L13 or L7 with LFEA.

## Stack

- Base PR: #1047 — fail-closed friction iteration controller (F1.1).
- Base branch: `agent/m047-bm4l-friction-iteration-controller`.
- Base SHA: `2865397456b11d2cc5dae1b7b77148790b7929c4`.
- Planned head: `agent/m047-bm4l-friction-reference-differential`.

## Exact production artifact authority

Windows/ACE M047 qualification run `31513907633`:

- artifact `9110308571`;
- artifact digest `sha256:57684331169984e7770382a3d292fcb7c24bd30c2404fd487c2a5f66e8a907eb`;
- `bm4l-report.json` SHA-256 `3bbdf58707d6384908021e07ed88ce2e046bf89df36398e4c703db4ca73eb55c`;
- `bm4l-actual.json` SHA-256 `8e33c9949812b27309149fceb689572e1cff41793dc01d2b8e9d86382ac3cd8a`.

The report includes CAESAR reference rows for L5, L6, L7, L13, L14 and L15 even though the production LFEA solve is limited to the qualified frictionless cases.

## Reference-surface identity

For both L6/L13 and L5/L7, the checker proves the row-key surfaces are identical: **2,496 rows per case** with the same entity/quantity/component/unit keys.

Each primary case contains:

```text
DISPLACEMENT             291
ROTATION                 291
FORCE                     90
MOMENT                    90
GLOBAL_END_FORCE_FROM    288
GLOBAL_END_FORCE_TO      288
GLOBAL_END_MOMENT_FROM   288
GLOBAL_END_MOMENT_TO     288
INCIDENT_GLOBAL_FORCE    291
INCIDENT_GLOBAL_MOMENT   291
TOTAL                   2496
```

All four primary CAESAR reference states also pass the report's nodal-equilibrium surface: `672 / 672` rows, zero failures.

## Observed friction differential — diagnostic only

### L13 minus L6 — W+P1

Largest support reaction delta norms:

```text
20170   6097.500 N
20090   5722.866 N
20250   4906.580 N
20030   4669.302 N
```

Reference-row changes include 85/90 support-force components, 239/291 translations, 282/291 rotations, and hundreds of element-end force/moment components. Maximum absolute support-force component delta is `5370.3634 N`.

### L7 minus L5 — W+T1+P1

Largest support reaction delta norms:

```text
20090  52430.764 N
20030  49993.308 N
20170  49485.651 N
20250  45139.937 N
```

Maximum absolute support-force component delta is `49943.6387 N`.

These values are **validation observations only**. They cannot authorize the Slide Multiplier, contact state, friction stiffness tuning, convergence parameters, or any other mechanics.

## Derived algebra controls

The checker separately verifies identical key surfaces for:

```text
L14 = L5 - L6   frictionless algebra control
L15 = L7 - L13  first friction-derived target
```

The ACCDB/report stores rounded values, so subtraction of stored primary rows is not bit-exact. The observed representation residuals are recorded, not promoted into tolerances.

Maximum stored-row algebra residuals:

```text
             N          N*m          m             rad
L14   0.00201416   0.00317383   3.3075e-8   2.20165e-6
L15   0.00683594   0.00292969   3.2384e-8   2.05439e-6
```

`algebraResidualUsedAsAcceptanceTolerance=false` is pinned in the authority.

## Files

```text
benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-friction-reference-authority.json
benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-friction-reference-snapshot.json
scripts/lfea-m047-bm4l-friction-reference-differential-check.mjs
agents/PR_M047_friction_reference_differential.md
```

## Local qualification

Against the exact downloaded production artifact:

```text
node --check scripts/lfea-m047-bm4l-friction-reference-differential-check.mjs
PASS

node scripts/lfea-m047-bm4l-friction-reference-differential-check.mjs \
  --report /mnt/data/m047-final-stack/bm4l-report.json \
  --expected benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-friction-reference-snapshot.json
PASS
```

## Decision

**F1.2 REFERENCE DIFFERENTIAL COMPLETE — NO NEW MECHANICS.**

Next safe batch is source-side friction/gap mapping into a solver-neutral BM4_L site contract. L13 production solving remains blocked on independent Slide Multiplier authority and complete CAESAR state-history semantics.

## Non-scope

No PR #1001 modification, no Issue #991 change, no solver/profile/comparator/tolerance edit, no response fitting, no guessed Slide Multiplier, no merge, and no ready-for-review transition.
