# Element end actions, and the equilibrium regression blocking them

## Element end actions — built, wired, and currently withheld

The harness can now aggregate production's analysis elements back to CAESAR's
source elements. Each source element's chain is walked from its declared FROM
node to its TO node and only the two outer ends are reported — the first
element's I end and the last element's J end — which are the same two physical
points CAESAR reports. All 96 BM4_L source elements build a clean chain,
retopologized bends included.

They are **not being compared yet**, because they are all-or-nothing across the
mapped cases and one case cannot be recovered. The comparator derives
single-term differences between cases and requires complete row coverage on
both sides, so supplying element actions for two of three mapped cases fails the
whole comparison rather than degrading it.

This is reported rather than hidden: the check now emits
`elementActionsMeasured: false` with the reason.

## The blocker: I caused it

`IXP-W`, the weight-only case, now fails its own force-equilibrium diagnostic
and cannot be recovered.

| Branch state | IXP-W residual | Verdict |
|---|---:|---|
| before any pressure work | 2.098e-7 | CONDITIONAL |
| + closed-end axial thrust | 2.098e-7 | CONDITIONAL |
| + bend pressure stiffening | **1.630e-6** | **BLOCKED** (limit 1e-6) |

Isolated by running the same probe on each branch. Axial thrust leaves the
weight case untouched, as it must — there is no pressure in that case. Bend
pressure stiffening does not, because it stiffens bends with the element's
*declared* pressure regardless of what the case carries. That is deliberate and
matches CAESAR, but it means the weight case's stiffness changed, and its
equilibrium residual grew about eightfold and crossed the limit.

The residual is still tiny in absolute terms. What is not obvious is *why* a
stiffness change degrades the recovered-action balance by that factor, and that
question has not been answered here.

## The trade, measured

Removing bend pressure stiffening restores the weight case and costs parity:

| Case | with stiffening | without |
|---|---|---|
| L2 (W) | 85.17% / 1.5559% | 83.86% / 1.9493% |
| L5 (W+T1+P1) | 83.33% / 3.0862% | 80.51% / 3.3190% |
| L6 (W+P1) | **78.35% / 1.3059%** | 72.00% / 2.0213% |

Stiffening is worth far more in combination with Bourdon than it was alone —
when it was measured against thrust only it bought about a point, and removing
it now costs up to 6.4. That is physically reasonable: Bourdon's bend-opening
load acts through the bend's stiffness, so getting the stiffness right matters
more once the load exists.

So this is a real trade with no obviously right answer:

- **Keep stiffening** — better parity everywhere, but the weight case blocks, and
  with it element end actions and any code-stress recovery for that case.
- **Drop stiffening** — the weight case recovers and element actions become
  measurable, at a material parity cost.
- **Understand the conditioning first** — why an 8x residual growth from a
  stiffness change, and whether 1e-6 is the right limit for this quantity.

Stiffening is left **on** in this branch, because the parity gain is large and
concrete while the blocked case is a tolerance a decision could legitimately
revisit. That choice is flagged here rather than buried, because it is a
judgement rather than a measurement.

## Reproducing

```text
npm run check:lfea-production-caesar-parity
```

`blockedCaseIds` and `elementActionsWithheldBecause` in the output state the
current position. If the weight case is made recoverable, element actions start
being compared with no further change to the harness.
