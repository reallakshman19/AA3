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

Converged in 30 s. 23 friction restraints (26 declare `FRIC_COEF`; three have all
tangential directions taken by a guide or line stop).

| Metric vs CAESAR | After A4 (k_f = 1.0e8) | After B0 (k_f = 1.7513e8) |
|---|---|---|
| normal reactions within ±10 % | 22 / 23 | **23 / 23** |
| worst normal error | +131 % (21610) | **+7.5 %** |
| tangential magnitudes within ±10 % | 15 / 23 | 8 / 23 |
| tangential vectors within ±10 % | 4 / 23 | 4 / 23 |
| regime matches | 3 / 23 | 3 / 23 |
| CAESAR's own capacity utilisation | 0.004 … 1.106 | 0.004 … 1.106 |

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

### The systematic term that remains

CAESAR's utilisation clusters at **0.91-0.96** at many restraints (20520 0.961,
22260 0.933, 22070 0.936, 21800 0.940) while the return map places them exactly on
the cap. That alone is a 4-9 % error before direction is considered, and it is the
largest remaining systematic difference. The drag table points at the second term:
one tangential component matches almost exactly while the other is short, which is
a partition signature, not a magnitude error.

## 5. Next variants

The full prioritised programme, including the BM4_NL friction-plus-lift-off entry
conditions and staging, is in `agents/M047_STAGE2_ROADMAP.md`. In short: declare
the reference resolution floor (R1), then decide partial mobilisation by
implementing CAESAR's documented spring form as a second declared strategy (R2),
then per-axis versus resultant capping (R3), then load-path stepping for L7 (R4).

Each is one loop run and one row in the table above. None changes a tolerance, and
none is selected by counting benchmark failures.
