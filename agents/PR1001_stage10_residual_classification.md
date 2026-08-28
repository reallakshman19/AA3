# PR1001 Stage 10 — nonzero residual classification

## Objective

Classify the 45 nonzero-reference failures remaining after the Stage-9 tee + resolved-alpha local replay, and promote no new mechanic unless one source-backed correction owns a coherent failure family.

## Starting state

Live-gate local combined candidate: L2/L3/L4/L5/L6/L14 = `31/22/40/13/22/22`, total **150**. Composition: **105 exact-zero-reference + 45 nonzero-reference** failures.

## 45-row decomposition

The 45 rows do not represent 45 independent mechanics defects.

- L14: 5 rows are exact duplicates of the five L3 thermal failures.
- L5: all 8 nonzero failures are cancellation-amplified combinations. For every row, resolved L3 and L6 primitive contributions individually pass the governed 10% rule; their small algebraic resultant fails relative comparison.
- L6: all 15 nonzero failures are cancellation-amplified W+P combinations. The underlying L2 and L4 primitive contributions individually pass the governed 10% rule for these rows.
- Direct primitive failures are therefore only **17 rows**: L2=5, L3=5, L4=7.

### L6 axial-force chain example

Sources 13-17 share one axial-force signature:

- L2 weight term: about 0.16% error.
- L4 pressure term: about 2.72% error.
- L6=W+P resultant: about 12.95% error because the larger terms oppose each other.

This is a sensitive resultant, not evidence for a 13% global pressure correction.

### L5 cancellation family

The eight L5 failures around nodes 20480 and 22110-22130 are small differences of individually passing primitive states. Typical values are ~3-5.5% L6 error and ~0.4-0.5% resolved-L3 error, while the small L5 resultant shows ~28-35% relative error. No separate L5 mechanic is authorized.

## Primitive L3/L14 thermal residuals

Four source-action failures are very small moments around sources 62-65: reference magnitudes are about `0.638 N.m` for source62/63 MY and `0.147 N.m` for source64/65 MX.

The remaining primitive thermal row is node 20250 RX:

- actual resolved value `2.7131684e-6 rad`;
- CAESAR reference `3.4334174e-6 rad`;
- source-wise absolute contribution sum about `1.41564e-3 rad`;
- cancellation factor about **521.8x**.

The largest positive/negative contributions come from different bends and frames across the model. No local tee/reducer source owns the residual.

## Primitive L4 pressure residuals

Six of seven primitive pressure failures are tiny source actions around sources 84-86: force magnitudes about `0.014-0.016 N` and moment magnitudes about `0.008-0.010 N.m`.

The remaining row, node 20150 UY:

- actual `-3.29445e-6 m`;
- CAESAR reference `-2.73766e-6 m`;
- absolute source contribution sum about `1.01655e-4 m`;
- cancellation factor about **30.9x**.

Dominant terms are distributed bend/frame pressure contributions. Reducers do not own this displacement residual.

## Pressure constitutive falsification checks

### Straight-pipe closed-end pressure strain

CAESAR L4 pressure free strain was independently reconstructed from ordinary straight-element endpoint kinematics and axial end force.

- 60 usable straight spans.
- 57 robust spans after excluding ill-conditioned near-zero deformation rows.
- median CAESAR/implemented pressure-strain ratio: **1.0000000456**.
- median absolute deviation: about **6.97e-7** in the ratio.

Decision: **PASS — current closed-end straight-pipe pressure strain is validated. Do not modify.**

### Reducer equivalent pressure free elongation

Direct endpoint reconstruction for the four reducers gives CAESAR/implemented equivalent pressure free-state ratios:

- source 11: `1.00123635`
- source 16: `1.00033398`
- source 67: `0.99759246`
- source 75: `0.99759165`

Decision: **PASS — reducer pressure free elongation is already within about +/-0.24%. It does not explain the remaining L6 amplification.**

### Reducer stiffness reconstruction

Using the resolved thermal interval strain, L3 endpoint kinematics nominally infer CAESAR/current reducer axial stiffness ratios of `0.99661`, `0.98552`, `0.98325`, and `0.98027` for sources 11/16/67/75.

This inference is ill-conditioned because the elastic deformation is the small difference between nearly equal free thermal growth and total endpoint movement. Mirrored reducers 67/75, which have the same current condensed stiffness and pressure free state, already infer ratios differing by about 0.3%. It is not precise enough to select endpoint/midpoint/fractional section sampling.

Decision: **BLOCKED — do not choose a reducer sampling station from these ratios.**

## Primitive L2 weight residuals

The three nodal residuals are strongly cancellation-sensitive:

- node 20500 UY: **287.7x** cancellation factor;
- node 20510 UY: **289.1x**;
- node 22140 RX: **446.5x**.

The two direct bend-source FY failures are small relative to total bend weight:

- source 5: about 8.0 N FY error versus ~2008 N total modeled bend weight;
- source 19: about 1.54 N FY error versus ~709 N total modeled bend weight.

Previously tested bend-weight/subdivision/global-gravity variants remain rejected; Stage 10 provides no new authority to reopen them.

## Stage decision

**COMPLETE — NO_NEW_MECHANICS_PROMOTED.**

The remaining nonzero failure count is dominated by relative-error amplification on small algebraic resultants and near-zero source actions. Direct constitutive checks validate straight pressure strain and reducer pressure free elongation. Reducer stiffness/sampling inference is too ill-conditioned to establish CAESAR's representative cylinder station.

Next legitimate actions are authority/delivery decisions, not coefficient tuning:

1. keep the qualified tee v3 + resolved BM4_L interval-alpha production candidate ready for delivery when Actions are explicitly authorized;
2. decide separately whether the Stage-7 `0.0001 deg` exact-zero rotation comparison boundary is acceptable authority;
3. obtain direct CAESAR reducer cylinder station authority before changing midpoint sampling;
4. do not weaken the nonzero `<10%` comparator or tune mechanics against cancellation rows.