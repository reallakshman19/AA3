# M047 Stage 2 — real BM4_L results and the iterative tuning method

Source: pinned `BM4_L.ACCDB`, SHA-256 `64c05a50…`, 5,136,384 bytes, read with the
portable JS reader on Linux (0.27 s). No CAESAR value in this document is
assumed; every number is either read from that file or produced by the solver.

---

## 1. How the loop works

One tuning iteration is:

1. **Measure** — `scripts/lfea-m047-stage2-friction-tuning-loop.mjs --case L13`
   solves the case and attributes it restraint by restraint against CAESAR:
   normal reaction, Coulomb capacity, tangential force vector, regime, and the
   tangential drag displacement, each with its own error.
2. **Attribute** — read the table top-down. It is sorted by tangential vector
   error, and it separates *normal-force* error (a load-path problem) from
   *tangential* error (a friction-law problem) from *regime* mismatch (a
   stick/slide decision problem). A percentage is never discussed before the
   regime and the drag are.
3. **Change exactly one declared mechanic** — in the versioned solver profile or
   in the friction law itself, with the reason written next to it.
4. **Re-measure** and compare with `--compare <previous.json>`.

Two rules make the loop honest:

- the loop never edits a tolerance, a comparison rule or an acceptance criterion;
  it only changes declared mechanics and numerics, and it records which variant
  produced which table;
- non-convergence is self-diagnosing: every iteration records the gates that
  failed and their evidence, so "did not converge" always names the physics.

## 2. What the loop has produced so far

| Variant | Change | Result on real L13 |
|---|---|---|
| A0 | documented form: delete the tangential spring at breakaway, apply constant `µ\|N\|` | **no convergence**; active set stable from iteration 3, then a period-3 limit cycle (reaction update cycling 1.35e4 → 8.6e3 → 5.1e3 N) |
| A1 | same law, **return-mapped** slip offset with the spring retained, plus Aitken/Irons-Tuck extrapolation on the slip vector | updates collapse to 4.5e-15 m / 1.7e-7 N, but still blocked |
| A2 | record failed gates per iteration | blocker named: Coulomb cap enforced to **1 µN** on ~1 kN forces |
| A3 | cap and residual widths tied to the force-update criterion (1e-2 N = 0.2 % of the governed 5 N nodal tolerance) | only `FRICTION_OPPOSES_SLIP` still blocking, with cosines of −0.82, −0.70, +0.99 |
| A4 | friction opposes the **current elastic drag**, not the accumulated slip path | **converged, 64 s** |
| A5 | add drag-displacement diagnostic | converged, full attribution table below |

The A4 correction is the physically important one. Coulomb friction opposes
relative *sliding*; in a return-mapped step the discrete stand-in is the current
elastic stretch — the direction the support is being dragged now. The accumulated
slip is a path integral whose direction rotates as other supports break away, so
a converged force can sit at a wide angle to it while exactly opposing the drag.
Gating on the path was rejecting valid elasto-plastic states.

## 3. Measured status, real L13 (`W+P1`, friction multiplier 1.0)

23 friction restraints (26 declare `FRIC_COEF`; three have all tangential
directions taken by a guide or line stop).

| Metric vs CAESAR | After A4 (k_f=1.0e8) | After B0 (k_f=1.7513e8) | After D1 — **production (R2)** |
|---|---|---|---|
| convergence time | 64 s | 30 s | ~345 s |
| normal reactions within ±10 % | 22 / 23 | 23 / 23 | **23 / 23** |
| worst normal error | +131 % (21610) | +7.5 % | **1.8 %** |
| tangential magnitudes within ±10 % | 15 / 23 | 8 / 23 | — |
| tangential vectors within ±10 % | 4 / 23 | 4 / 23 | **13 / 23** |
| regime matches | 3 / 23 | 3 / 23 | 3 / 23 |
| CAESAR's own capacity utilisation | 0.004 … 1.106 | 0.004 … 1.106 | 0.004 … 1.106 |

**D1 is now the production solver profile** (`CAESAR-ACCDB-FRICTION-SOLVER-R2`,
promoted after real-file measurement met its own declared acceptance bar — see
§4). It changes exactly one mechanic: the capped sliding force is oriented
opposite the current *total* relative tangential displacement `u_t` instead of
the return-map elastic stretch `u_t - u_slip`. Full derivation and acceptance
evidence: `reports/lfea-m047-stage2-d1-real-measurement.md`,
`agents/M047_STAGE2_D1_DIRECTION_VARIANT.md`.

### B0 — the friction stiffness was wrong by 1.75x, and the file said so

`FRICT_STIF = 1.0E6` is in CAESAR's **internal English units** (lb/in - CAESAR's
documented configuration default), not in displayed N/cm. The ACCDB carries its own
conversion constant, `INPUT_UNITS.CTRANS = 1.751270055770874`, which is exactly
1 lb/in in N/cm. The governed SI stiffness is therefore

```
1.0E6 lb/in x 1.751270055770874 (N/cm per lb/in) x 100 (cm per m) = 1.751270055770874e8 N/m
```

not the 1.0e8 N/m this issue declared. CAESAR's own L13 output proves it: at three
restraints whose utilisation is well below the cap - so they carry their force
elastically through the friction spring alone - the implied stiffness `|Ft| / |u_t|`
is

| restraint | reference utilisation | implied `k_f` |
|---|---|---|
| 20550 | 0.212 | 1.7513e8 N/m |
| 22310 | 0.473 | 1.7513e8 N/m |
| 20250 | 0.588 | 1.7513e8 N/m |

Applying it took normal reactions to 23/23 within ±10 % and eliminated the 131 %
outlier at 21610 outright. It is a unit-authority correction derived from the
source, not a tuned parameter.

### What the loop exposed next: the reference's own resolution

At `k_f = 1.75e8 N/m`, half of CAESAR's 0.001 mm print resolution is **±88 N** of
tangential force. At 20550 the reference drag prints as −0.001 mm, so its 176.3 N is
known to roughly ±50 %. Comparing such a restraint at ±10 % compares against print
noise. On this run the floor is 88 N and 22 of 23 restraints sit above it, so this
does not excuse the gap - but it must be declared before percentages are published,
exactly as the exact-zero absolute limits already are.

### The systematic term that remains — now named R7 (case-history dependence)

CAESAR's utilisation clusters at **0.91-0.96** at many restraints while the
return map places them exactly on the cap. This is *not* a stopping-rule
artifact (the deleted-spring form that would produce it was measured and
rejected: 3/23 vectors, nonconverged) and *not* a capping-shape artifact
(per-axis capping was measured and rejected: 6/23 vectors, worse than
resultant). The leading evidence-bounded hypothesis is that CAESAR's friction
result is dependent on its own internal load-case solve order/history, which
the pinned ACCDB structurally cannot record (it has only `INPUT_*`/`OUTPUT_*`
tables, no case-list or execution-log table). At node 20710, the two cases
missing thermal expansion (L13, L1) sit ~10-11 % over their own final-normal
Coulomb cap while the one case with thermal expansion (L7) sits at 1.004 —
essentially dead on it. Full derivation: `agents/M047_STAGE2_ROADMAP.md` §R7,
`reports/lfea-m047-stage2-20710-forensic.json`.

## 4. L7 and L1 under production D1 (R2)

| Metric vs CAESAR | L7 (`W+T1+P1`) | L1 (`WW+HP`) |
|---|---|---|
| convergence | converged, ~138 s, single step | converged, ~330 s, needed the doubled (400→800) iteration budget — see below |
| normal reactions within ±10 % | 22 / 23 (sole failure: 20350, −24.9 %) | **8 / 23 only**, worst 159 % — unresolved, see below |
| tangential vectors within ±10 % | 10 / 23, worst 110.3 % | 4 / 23, worst 585 % |

**L7**: proportional physical load continuation (N=1/5/10) was tested and
rejected as a fix — N=1 reproduces the single-step result to exactly zero
difference (validates the harness), but N=5 and N=10 both fail to converge
within the unchanged 400-iteration per-step budget, with the residual
concentrated at restraint 20550 in both, and N=10 failing *earlier* than N=5.
Finer stepping does not rescue L7; see R7.

**L1 iteration budget**: at iteration 400, every gate had closed except
displacement update, whose own tail decayed monotonically and geometrically
(ratio ≈0.992/iteration, 1.27e-10 m → 1.19e-10 m against the 1e-10 m limit) —
a genuine slow-converging tail, not an oscillation. The loop returns the
instant it converges, so raising the ceiling cannot affect any case that
already converges below it (confirmed: L13/L7 reproduce their exact D1 numbers
under the higher ceiling). The budget was doubled to 800 — a round margin, not
a value fitted to make L1 pass — and L1 now converges.

**L1 normal reactions — new, unresolved, higher priority than the tangential
gap.** Only 8/23 within ±10%, several by 100%+. This is a linear-mechanics
(weight/pressure) discrepancy, not a friction-law one: L13/L7 have excellent
normals (22-23/23) through the identical friction machinery, so the defect is
most likely in the `WW`/`HP` hydrotest weight-and-pressure basis feeding this
case, not in this solver. No frictionless HYD twin exists in this file to
isolate it by subtraction. This needs its own dedicated audit before any
further friction-law tuning on L1 is meaningful — tuning the nonlinear layer
against a case whose linear input is already wrong would misattribute the
error. See `agents/M047_STAGE2_ROADMAP.md` §1c.

## 5. Next steps

The full prioritised programme, including the BM4_NL friction-plus-lift-off
entry conditions and staging, is in `agents/M047_STAGE2_ROADMAP.md`. R1-R6
are now all measured (R1 declared and in force, R2-R6 tested and rejected as
fixes for the remaining gap); **R7** (case-history dependence, evidence-bounded
by what this file can and cannot record) is where the next real investigation
into the L13/L7 tangential gap should start. Independently, and at higher
priority since it blocks even reporting L1's own reactions honestly, the **L1
hydrotest weight/pressure basis** needs a dedicated linear-mechanics audit.

Each step is one loop run and one row in a table. None changes a tolerance,
and none is selected by counting benchmark failures.
