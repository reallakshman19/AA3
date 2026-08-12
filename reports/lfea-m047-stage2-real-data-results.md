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

Converged in 64 s. 23 friction restraints (26 declare `FRIC_COEF`; three have all
tangential directions taken by a guide or line stop).

| Metric vs CAESAR | Result |
|---|---|
| normal reactions within ±10 % | **22 / 23** (most within 0.2 %) |
| worst normal error | +131 % at 21610 |
| tangential force **magnitudes** within ±10 % | **15 / 23** |
| tangential force **vectors** within ±10 % | **4 / 23** |
| regime matches | 3 / 23 |
| CAESAR's own capacity utilisation | **0.004 … 1.106** |

Worst rows (full table in `lfea-m047-stage2-friction-iteration-L13.json`):

```
restraint                    regime ref/solved     |N| ref   |N| solved  err%   |Ft| ref  |Ft| solved  vec err%
21610:REST_PTR16:TYPE3:UY    SLID/SLIDING            852.3      1970.5  131.2      267.0       591.1     319.9
21930:REST_PTR21:TYPE3:UY    STUCK/STUCK            4524.1      4530.6    0.1        5.0         7.3     247.8
22020:REST_PTR22:TYPE3:UY    SLID/LOCKED_AFTER_SLIP 1311.8      1303.5   -0.6      394.2        17.5     104.4
22370:REST_PTR29:TYPE3:UY    SLID/SLIDING           1816.9      1817.1    0.0      554.0       545.1      82.9
20520:REST_PTR9:TYPE3:UY     STUCK/SLIDING          2327.3      2330.4    0.1      671.3       699.1      57.4
…
20580:REST_PTR11:TYPE3:UY    SLID/SLIDING           2197.9      2202.5    0.2      656.9       660.7       0.6
```

### What the drag comparison shows

The global displacement solution agrees closely; the friction split does not:

```
restraint                    drag ref (mm)     drag solved (mm)
21740:REST_PTR18:TYPE3:UY    -0.131/0.418      -0.131/0.418      <- exact
20520:REST_PTR9:TYPE3:UY     -0.491/-0.347     -0.501/-0.348
20350:REST_PTR6:TYPE3:UY      0.478/0.227       0.478/0.068      <- X exact, Z short
20440:REST_PTR8:TYPE3:UY     -0.335/-0.292     -0.335/-0.101     <- X exact, Z short
22070:REST_PTR23:TYPE3:UY     0.170/-0.245      0.037/-0.246     <- Z exact, X short
```

At most restraints one tangential component matches CAESAR almost exactly and the
other is short, which is the signature of the friction force being partitioned
differently between the two tangential axes — not of a wrong load, a wrong normal
force or a wrong displacement field.

## 4. Why the states disagree, and what that means for ±10 %

Two measured facts bound what the friction law alone can achieve:

1. **CAESAR's friction is only partially mobilised at most supports.** Its own
   L13 utilisation `|Ft| / µ|N|` spans 0.004 to 1.106, with a cluster at
   0.91–0.96. My converged solve puts those same supports exactly on the cap,
   which alone is a 4–9 % error before any direction difference.
2. **The stick/slide decision is a micron-scale decision.** At `k_f = 1e8 N/m` a
   7 µm elastic stretch is already 700 N, i.e. a full capacity at a typical
   support. CAESAR prints displacement to 0.01 mm, so its own state at 20 of
   these supports is marginal within its own print resolution.

One row is outside that picture and is a genuine mechanics discrepancy to chase
first: **21610**, where friction reduces CAESAR's normal reaction from 2431.7 N
(L6, frictionless) to 852.3 N, while this solve holds 1970.5 N. That is a
load-path redistribution, not a cap or direction question.

## 5. Next variants, in priority order

1. **B1 — 21610 normal-force attribution.** Paired delta `L13−L6` at that
   restraint and its neighbours, to find which member action carries the
   redistribution CAESAR shows.
2. **B2 — partial mobilisation.** Implement the documented spring form as a
   second *declared* strategy with CAESAR's own stopping rule (stop when states
   stop changing, report the spring force reached), and compare tables. If it
   reproduces the 0.91–0.96 cluster, the difference is the stopping rule, not the
   law, and that is then a governed choice with evidence behind it.
3. **B3 — per-axis versus resultant capping.** Test the two-axis partition
   hypothesis the drag table points at: cap each tangential axis independently
   versus capping the resultant. Both are defensible readings of the CAESAR
   documentation; the reference data can decide it.
4. **B4 — L7, then L1.** Only after L13 is understood, since L7's friction
   redistribution reaches 50 kN at guided nodes and would mask a smaller L13
   defect.

Each variant is one run of the loop and one row in the table above. None of them
changes a tolerance, and none is selected by counting benchmark failures.
