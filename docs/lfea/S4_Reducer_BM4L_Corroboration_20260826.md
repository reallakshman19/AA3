# S4 reducer — BM4_L corroboration measurement

**Status: corroborating evidence only. It qualifies nothing.**

`reducerExactMechanics` remains `false`. All three blockers in
`src/core/linear-fea-reducer-condensation/production-readiness.js` remain open.
This document exists so the next person does not repeat the measurement, and
does not mistake it for the controlled evidence S4 actually requires.

## The question this answers

Before commissioning ~19 controlled CAESAR runs, it is worth knowing whether the
implemented ten-cylinder condensation is anywhere near CAESAR at all. If it were
badly wrong, that would show up on any real model carrying reducers, and the
protocol runs would be premature.

BM4_L carries four reducers (source elements E11, E16, E67, E75) and retains
CAESAR's own `OUTPUT_GLOBAL_ELEMENT_FORCES` for the same model, so the
comparison can be made directly. `caesar-accdb-linear-solve.js` imports the same
`linear-fea-reducer-condensation` module production would use, so this measures
the real mathematics rather than a re-implementation.

## Result

Worst relative end-action error per reducer, across the six linear cases
(L2, L3, L4, L5, L6, L14), against the profile's pre-declared 10% tolerance:

| Reducer | Span | Worst error | Case | Verdict |
|---|---|---:|---|---|
| E11 | 20220→20230 | 1.06% | L4 | pass |
| E16 | 20280→20290 | 12.95% | L6 | fail — see below |
| E67 | 22000→22010 | 3.60% | L5 | pass |
| E75 | 22100→22110 | 1.09% | L14 | pass |

### E16's failure is not a reducer failure

In L6, E16 fails `GLOBAL_END_FORCE` / `FX` at 12.95%. So do E13, E14, E15 and
E17 — the entire contiguous run between the tee junctions at 20160 and 20295 —
at *identically* 12.95%, in FX only, equal and opposite at each element's two
ends. That is one constant axial through-force being off, not five independent
errors, and the reducer is simply one of the five elements carrying it.

Tracking the same component's absolute error across cases separates it cleanly
into two constant offsets that have nothing to do with reducers:

| Case | Formula | Reference (N) | Absolute error (N) | Relative |
|---|---|---:|---:|---:|
| L2 | W | 62.963 | 0.099 | 0.16% |
| L4 | P1 | −52.662 | 1.433 | 2.72% |
| L6 | W+P1 | 10.301 | 1.334 | **12.95%** |
| L3 | T1 | −456.463 | 10.359 | 2.27% |
| L5 | W+T1+P1 | −446.162 | 11.693 | 2.62% |

A pressure-associated offset of ≈1.43 N and a thermal-associated offset of
≈10.36 N, both roughly constant, and additive in L5. L6 fails only because its
reference axial force is small — weight and pressure nearly cancel there — so a
constant 1.33 N lands as 12.95%. The same absolute error is present and passing
everywhere else.

**Follow-up, not reducer work:** the thermal offset is the larger of the two and
is consistent with the standing failure in
`scripts/lfea-s3-bend-production-authority-check.mjs`
("Every generated bend chord must receive thermal authority through its source
span", `0 !== 6`). Worth resolving on its own merits.

## What this does and does not support

**Supports:** the condensation mathematics tracks CAESAR on a real model under
combined service loads. Commissioning the controlled protocol runs is a
reasonable investment rather than a shot in the dark.

**Does not support** — and cannot, from this model:

- `REDUCER_SECTION_SAMPLING_AUTHORITY_UNQUALIFIED`. BM4_L cannot discriminate
  *which* sampling station produced the agreement. Several candidate rules would
  plausibly land inside tolerance on one orientation under combined loads.
  Discrimination needs the forward/reverse pairs under isolated load families
  that the protocol specifies.
- `REDUCER_GRAVITY_OWNERSHIP_AUTHORITY_UNQUALIFIED`. BM4_L has no reverse-
  orientation counterpart, so From-end, To-end, average and progressive weight
  rules are not separated. This is the blocker where historical verification
  actively contradicts the structural discretization, so it needs its own
  metal-only, fluid-only and insulation-only observations.
- `REDUCER_CONTROLLED_CAESAR_RESPONSE_PARITY_REQUIRED`. These are combined
  service cases, not the independent axial / torsional / bending / thermal
  cases the protocol requires.

## Regression cover

`scripts/lfea-s4-reducer-bm4l-corroboration-check.mjs` re-runs this measurement
and asserts the discriminating property rather than a fitted threshold:

> a reducer must not fail parity in a way its own neighbours do not also fail.

It deliberately does not assert "every reducer is within 10%", which would couple
the check to today's numbers — the coupling the local production harness
contract forbids. The pre-declared profile tolerance is the only tolerance used.

The assertion was verified to discriminate: perturbing the sampling fraction in
`reducer-condensation.js` makes E16 fail at 17.69% with zero matching
non-reducer failures, and the check exits non-zero. On unmodified code it
reports zero isolated reducer failures and two shared ones.

## Next step

Generate the package scaffold and commission the runs:

```text
node scripts/lfea-s4-reducer-parity-evidence-template.mjs <path>/s4-reducer-parity
```

The generator and the file-level intake were both exercised on 2026-08-26 and
behave correctly: a 20-run scaffold is produced, and the blank scaffold is
rejected (`S4_REDUCER_POSITIVE_NUMBER_REQUIRED` on
`tolerancePolicy.observationTolerance`). The S4 intake path is not the blocker —
the CAESAR observations are.
