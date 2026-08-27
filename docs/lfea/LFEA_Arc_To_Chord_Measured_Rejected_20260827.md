# Arc-to-chord load scaling — implemented, measured, rejected

Supersedes `LFEA_Arc_To_Chord_Load_Scaling_20260827.md`, which deferred this
on the grounds that 0.286% was below the noise floor. The residual has since
fallen far enough to measure it, so it was implemented in full and measured.

**It does not help. It marginally hurts. It is not in the tree.**

## What was built

Both halves, properly rather than as an experiment:

- retopology stamps `bendArcToChordRatio` on each chord, where the arc and
  chord-chain lengths are both known;
- the structural binding carries it to the load compiler;
- `gravityPrimitive` scales the distributed intensity by it;
- `thermalPrimitive` carries it as `axialStrainLengthScale` — declared as a
  scale rather than a doctored temperature, so the declared temperature stays
  the temperature;
- the frame-element kernel multiplies the thermal axial strain by it.

That required widening two sealed contracts: `axialStrainLengthScale` on the
TEMPERATURE load primitive, and matching support in the frame element.

## What it measured

Against CAESAR on BM4_L, with axial thrust and bend stiffening already in
place. Median error:

| Case | none | gravity only | gravity + thermal |
|---|---:|---:|---:|
| L2 (W) | **1.5559%** | 1.5674% | 1.5674% |
| L5 (W+T1+P1) | 3.4291% | **3.4286%** | 3.4299% |
| L6 (W+P1) | **7.6165%** | 7.6173% | 7.6173% |

L2's pass rate also fell, 85.17% → 84.38%.

Gravity is the half that moves anything, and it moves the wrong way. Thermal is
neutral to four decimal places.

## Why the earlier answer was different

The first experiment measured gravity scaling against the **pre-pressure**
baseline and found a small improvement (L2 1.5689% → 1.5249%). That baseline was
a model missing two pressure effects. With closed-end axial thrust and bend
pressure stiffening in place, the same correction no longer helps.

The earlier note called it "real and directionally right, below the noise
floor". Half of that was wrong: the direction reverses once the model it is
measured against is less wrong. That is a good argument for measuring a
correction against the best available model rather than the current one.

## Why it was not kept anyway

The deltas are hundredths of a percentage point either way, so this is not
strong evidence of harm — it is strong evidence of *no benefit*. Against that:
two sealed contracts widened, a kernel change, and a new field on a load
primitive that every future caller has to reason about.

A contract widening needs a reason. "Physically it should be there" is not one
when the measurement says it changes nothing.

## Before anyone retries this

The implementation route was checked and is sound — bend chords do consume the
scaled gravity primitives through the mass-source expansion, so the scale
reaches them and is not silently dropped. Whatever is happening, it is not a
plumbing mistake.

Worth understanding before a second attempt: production may already account for
the arc elsewhere, so that scaling the load double-counts it. The bend component
owns its own elements and their effective stiffness, and the flexibility factor
is calibrated on arc geometry. If the arc length is already represented in the
component's compliance, the loads should be on the chord and this correction is
simply wrong for this discretization.

Reproduce with `npm run check:lfea-production-caesar-parity`.
