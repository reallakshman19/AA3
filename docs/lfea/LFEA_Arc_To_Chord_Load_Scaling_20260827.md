# Arc-to-chord load scaling — measured, and deliberately deferred

## The defect

A bend is solved as a chain of straight chords. A chord chain is shorter than
the arc it replaces, so a distributed load computed on chord length
under-represents the real pipe. `caesar-accdb-linear-solve.js` corrects for this
explicitly:

```js
const arcToChord = bend.component.geometry.arcLength
                 / bend.component.geometry.chordChainLength;
thermalLengthScale: arcToChord,
gravityLengthScale: arcToChord,
```

Production applies no such scaling. `arcToChord` appears nowhere in
`src/core/linear-piping-analysis-consumer/`, although both lengths are computed
and retained during retopology. Measured across all twelve BM4_L bends the
under-application is uniformly **0.286%**, consistent with six-chord
discretization of a 90° bend. It is systematic and always in the same direction
— bends expand and weigh slightly less than they should.

## Why it is not fixed yet

Not because it cannot be measured. It now can, and it was.

With the parity harness in place, the gravity half was applied as a scoped
experiment and production re-measured against CAESAR:

| Case | | Pass rate | | Median error |
|---|---|---|---|---|
| L2 (W) | 84.25% → 83.86% | | 1.5689% → **1.5249%** |
| L5 (W+T1+P1) | 63.65% → 63.65% | | 8.6166% → 8.6174% |
| L6 (W+P1) | 40.29% → 40.29% | | 63.2908% → **63.2540%** |

The median error moves in the correcting direction in the two cases where
gravity carries weight, which is the right sign and confirms the diagnosis. The
pass-rate movement on L2 is a couple of borderline rows crossing the 10%
threshold and is not evidence either way.

**The correction is real and it is below the noise floor.** Production currently
disagrees with CAESAR by a median of 1.6% to 63% depending on case. A 0.286%
load correction cannot be validated against that background — there is no way to
show it made things better rather than coincidentally moving rows across a
threshold.

The dominant term is not this. Production implements no pressure structural
effects at all, and the parity baseline shows exactly that shape: the
weight-only case is much the best, and the two pressure cases much the worst.

## Cost of doing it now

The thermal half cannot be done cheaply or honestly. Gravity is a magnitude on a
distributed load, so scaling it is a multiplication. Thermal is declared as
operating and installation temperatures with a strain profile resolved
downstream; there is no length-scale field on `fea-linear-load-primitive/v1` and
no support for one in the frame-element kernel. Adding it means changing two
sealed, benchmark-qualified contracts. Scaling the declared temperature instead
would misrepresent the temperature to obtain a strain, and would be wrong.

Shipping the gravity half alone would leave the two loads inconsistent with each
other, which is worse than leaving both uncorrected in a known, documented way.

## When to do it

After the pressure structural effects. Then the residual is small enough that a
0.286% correction is visible in the measurement, both halves can land together
against a contract change that is justified by more than one caller, and the
harness can show it helped.

## Reproducing the measurement

```text
npm run check:lfea-production-caesar-parity
```

The experiment above was a temporary edit to `gravityPrimitive` in
`inputxml-linear-physical-case-builders.js`, applying the measured 1.002862 to
`BEND_ARC_CHORD` bindings only. It was reverted; that file is untouched. A real
implementation must derive the ratio per bend rather than use a model-specific
constant.
