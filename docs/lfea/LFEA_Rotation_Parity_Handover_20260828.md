# Handover — the rotation/end-action parity residual

**For:** an agent picking up the largest unresolved *technical* issue in Linear FEA
**Branch:** `agent/lfea-timoshenko-alignment` (base `main`)
**Written:** 2026-08-28

---

## 1. The issue, stated precisely

Production disagrees with CAESAR by more than 5% on **25.8% of all compared rows**
(1377 of 5345, across three load cases on BM4_L). It is concentrated in
rotational and element-level quantities:

| Quantity | Rows over 5% | Share |
|---|---|---|
| `ROTATION` | 321 / 823 | **39.0%** |
| `GLOBAL_END_FORCE_FROM` | 254 / 801 | 31.7% |
| `GLOBAL_END_FORCE_TO` | 250 / 798 | 31.3% |
| `GLOBAL_END_MOMENT_FROM` | 214 / 788 | 27.2% |
| `GLOBAL_END_MOMENT_TO` | 205 / 780 | 26.3% |
| `DISPLACEMENT` | 100 / 815 | 12.3% |
| `FORCE` (reactions) | 33 / 270 | 12.2% |
| `MOMENT` (reactions) | 0 / 270 | **0.0%** |

### It is not a measurement artifact

The first thing to rule out is dividing by near-zero references, which inflates
percentages meaninglessly. It was checked. Of the 1783 rows over 5%:

```
reference < 1% of that quantity's median    152   ( 8.5%)   artifact
reference 1-10% of median                   254   (14.2%)   marginal
reference >= 10% of median                 1377   (77.2%)   REAL
```

Three quarters are real disagreements on rows where CAESAR's own value is a
substantial number.

### It does not localise

Checked on L2 rotations, per node:

```
nodes with ALL components over 5%:   2
nodes with NO component over 5%:    39
nodes mixed:                        55
total nodes:                        96
```

All three rotation components (RX 28.7%, RY 22.1%, RZ 29.0%) are affected
alike, with medians of 2–3%. **This shape rules out a single broken component.**
If one element type were wrong you would see clusters; instead there is a
broadly-correct distribution with a heavy tail.

So this is accumulated systematic difference — a modelling detail that is
slightly off everywhere, not a defect in one place. Treat it as measurement
work, not a defect hunt.

### Why reactions are the tell

Nodal `MOMENT` reactions disagree on **nothing at all** (0 of 270), and `FORCE`
reactions on 12.2%. Global equilibrium is essentially exact (imbalance ~1e-7 N,
relative ~1e-13). So the *total* load path is right; what differs is how
rotation and internal action distribute through the structure. That points at
member stiffness or flexibility detail rather than loads or restraints.

---

## 2. Inputs

### Model and reference

| | |
|---|---|
| Model | `benchmarks/LFEA/BM4/InputXML_BM4.xml` (96 elements, 97 nodes) |
| Repaired variant | `benchmarks/LFEA/BM4/InputXML_BM4.repaired.xml` |
| CAESAR's solved output | `benchmarks/LFEA/BM4/Output_BM4.xml` (2.67 MB) |
| ACCDB form | `benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB` |
| Provenance | `benchmarks/LFEA/BM4/PROVENANCE.md` — **read this first** |

Both InputXML and Output are vendored verbatim at a pinned commit and are a real
CAESAR II model with its real CAESAR II answer. This is the only genuine
reference in the repository. Do not author a fixture and treat it as one —
`PROVENANCE.md` records what happened last time that was done.

### The harness

```bash
npm run check:lfea-production-caesar-parity
```

`scripts/lfea-production-caesar-parity-check.mjs` plus
`scripts/lib/lfea-production-benchmark-actual.mjs`. It drives the real
production pre-flight and run path — not a mock — and compares against the
retained CAESAR output.

Case mapping (production ID → CAESAR case): `IXP-W → L2`, `IXP-WP → L6`,
`IXP-WPT → L5`.

Output carries `perCase[].byQuantity`, `medianPercentError`, `worstRows`, and
`rawRelativeError` per row. Node reactions are zero-filled over
`constraintBindings[].targetNodeId`; element end actions are aggregated per
source-element chain (first element's I end, last element's J end) and are
**all-or-nothing** across mapped cases.

To get the raw per-row distribution, instrument
`report.qualification.cases[].comparison.rows` — each row has `quantity`,
`entityId`, `component`, `referenceValue`, `actualValue`, `rawRelativeError`,
`status`. (Several throwaway instrumentations of this kind were used to produce
the tables above; none were committed.)

### The whole gate

```bash
npm run check:lfea-linear-piping
```

26 checks. Keep it green. Every check in it was verified to fail when its
subject regresses — preserve that property for anything you add.

---

## 3. Where to look, in order

These are ordered by expected payoff, and each is a hypothesis to be **measured**
against BM4_L rather than reasoned about.

### 3.1 Bend flexibility factor detail

Bends dominate rotational response, and BM4_L declares 12 of them. The factor
authority is an explicit sealed record; the smooth-90 correction and the
B31/B31J edition profile (`B31_3_2022_B31J_2017`) are both policy choices that
could plausibly differ from what CAESAR applied to this model.

- `src/core/linear-piping-analysis-consumer/inputxml-production-bend-components.js`
- `src/core/linear-piping-analysis-consumer/inputxml-production-bend-factor-authority.js`
- flexibility kernels under `src/core/empirical-piping-mechanics/`

Ask: does CAESAR apply the flexibility factor to the same terms, over the same
arc length, with the same pressure correction? A factor applied to a slightly
different span changes rotation far more than it changes reaction totals —
which matches the observed signature.

### 3.2 Bend chord discretization

Bends are re-topologised into an incoming straight plus N arc chords. The count
was moved to six chords (`1c9c1de1c LFEA S2: update BM4_L to six-chord bends`,
`1415e999c LFEA S2: prove six-chord bend convergence`). Convergence was proven
for *displacement*; it was never re-checked for rotation or end actions, which
are the quantities now in question.

- `src/core/linear-piping-analysis-consumer/bend-retopology-geometry.js`
- `src/core/linear-piping-analysis-consumer/inputxml-linear-structural-retopology.js`

Cheap experiment: sweep the chord count and watch the rotation tail. If it
keeps moving at six, convergence was declared on the wrong quantity.

### 3.3 SIF / tee flexibility at branch junctions

Tee flexibility is routed to the incoming-straight chord at source-I only, and
non-physical `TYPE=3` SIFs are skipped. That routing decision is a modelling
choice with no reference behind it.

- `src/core/linear-piping-analysis-consumer/inputxml-production-branch-modifiers.js`
  (note: this file sits at the 300-line anti-drift limit)

### 3.4 Things already ruled out — do not redo

- **Near-zero denominators.** Measured; 8.5% of the tail, not the cause.
- **Beam formulation.** Was Euler–Bernoulli, now Timoshenko with κ = 0.5. That
  fixed conditioning (3.56e13 → 4.76e6) and moved parity substantially, but the
  residual described here is what remains *after* it.
- **Global equilibrium / load path.** Exact to ~1e-13 relative.
- **Reducer treatment.** Ten-cylinder condensation was implemented and measured;
  it makes parity *worse* by 1.5–2.1 points per case even on a formulation-matched
  base. It is deliberately disabled. Do not re-enable it hoping to close this.
- **Arc-to-chord load scaling.** Measured at 0.286%, then rejected — see
  `docs/lfea/LFEA_Arc_To_Chord_Measured_Rejected_20260827.md`.

---

## 4. Intended output

A measured reduction in the real-disagreement rate, with the same standard of
evidence the rest of this branch was held to:

1. **A named cause**, not a tuning parameter. If a factor is changed, the commit
   must say what authority says it should be that value.
2. **Before/after on all three cases**, from
   `check:lfea-production-caesar-parity`. Report pass rate *and* the >5%
   real-disagreement rate — pass rate alone can improve while the middle of the
   distribution degrades (this happened with Timoshenko: pass rates rose sharply
   while median error rose slightly).
3. **A gate check that fails when the fix regresses**, verified by actually
   breaking it and watching it fail. This is the house standard; every check on
   this branch was verified that way.
4. **Honest reporting of anything that does not work.** Three of my conclusions
   on this branch were overturned by measurement and the commits say so. A
   measured negative result is a real deliverable — the reducer work is
   entirely that, and it is more valuable than a plausible-sounding change.

### Success threshold

The declared profile tolerance is 10%, and the owner has stated that **errors
below 5% can be ignored**. So the target is the >5% real-disagreement rate:
**25.8% today**. Any reduction that survives all three cases is progress.
Getting `ROTATION` below ~20% would be a substantial result.

### What would be a failure

Improving one case while degrading another; improving pass rate while the median
worsens materially; or "fixing" it by widening a tolerance. The harness exists to
make those visible — do not route around it.

---

## 5. Benchmarks and commands

```bash
# The measurement that matters
npm run check:lfea-production-caesar-parity

# Full gate, 26 checks
npm run check:lfea-linear-piping

# Individual checks most likely to be relevant
node scripts/lfea-straight-pipe-formulation-check.mjs
node scripts/lfea-reducer-beam-theory-consistency-check.mjs
node scripts/lfea-bend-retopology-check.mjs
node scripts/lfea-s3-bend-production-authority-check.mjs
node scripts/lfea-equilibrium-absolute-companion-check.mjs
```

### Current baseline (do not regress)

```
L2  88.87%   median 2.1992%
L5  83.75%   median 3.1892%
L6  73.93%   median 2.5768%

rows within 5%: 74.2%   condition estimate: 4.758e6   residual: ~1e-11 PASS
```

### Reference documents

- `docs/lfea/LFEA_Element_End_Actions_And_Equilibrium_20260827.md`
- `docs/lfea/LFEA_Pressure_Effects_20260827.md`
- `docs/lfea/LFEA_Bend_Thermal_Authority_Findings_20260827.md`
- `docs/lfea/S4_Reducer_Parity_Protocol_20260824.md` — the controlled-run
  protocol, if evidence beyond BM4_L becomes necessary (20 runs, 9 load families
  × 2 orientations + 1 control pair)

---

## 6. Environment notes

- Windows. `python3` is a Store stub — use `py -3` or `python`.
- `gh` CLI is **not** available; PRs are created through the web compare URL.
- Files checkout CRLF; regexes anchored on `\n}\n` fail unless line endings are
  normalised on read. This has already caused one false check failure.
- Anti-drift guards enforce **under 300 physical lines** per consumer file and
  forbid hidden default parameters. Both will reject otherwise-correct changes;
  extract a module rather than shaving comments that carry reasoning.
- Work in a git worktree, not the primary checkout.

## 7. One caution

The most valuable thing produced on this branch was not a fix — it was the
parity harness, which then overturned three conclusions its own author had
already committed to. Before changing a factor because it looks wrong, measure
what it currently does. Two of the three reversals here came from assuming a
change was "directionally right" and only later measuring it against a
less-wrong model.
