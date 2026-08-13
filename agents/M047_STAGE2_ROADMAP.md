# M047 Stage 2+ roadmap — agent playbook

Audience: the next agent picking up BM4_L friction and, after it, BM4_NL friction
plus lift-off. This is a work instruction, not a summary. Every item states what
to change, what evidence decides it, and what must be true before it is accepted.

## 0. Non-negotiables for every run

1. **Run the real ACCDB locally, every time.** `src/core/fea-benchmarks/caesar-accdb-reader.js`
   reads the pinned `BM4_L.ACCDB` on any platform in 0.27 s. There is no CI, no
   ACE prerequisite and no Windows prerequisite. "No Windows available" is not a
   reason to skip an accuracy measurement.
2. **Every claim of accuracy comes from a measured artifact**, produced by
   `scripts/lfea-m047-stage2-production-run.mjs` or
   `scripts/lfea-m047-stage2-friction-tuning-loop.mjs`, committed under `reports/`.
   A statement of accuracy without a committed artifact is not evidence.
3. **Custody first.** Recompute the archive and member SHA-256 each run. The
   pinned member is `64c05a50…`, 5,136,384 bytes. If a hash changes, stop.
4. **Never move a tolerance, comparison rule or acceptance criterion to make a
   number look better.** Change declared mechanics, then measure. If a limit is
   genuinely wrong, prove it from the source data - as was done for
   `FRICT_STIF` - and record the derivation next to the new value.
5. **Controls before friction.** `scripts/lfea-m047-stage2-control-regression.mjs`
   must stay PASS: L2-L6/L14 rows and hashes identical to the previous main.
6. **One declared change per loop iteration**, with a `--variant` label, so the
   table diff attributes the change.

## 1. Where Stage 2 stands (measured, real ACCDB)

| Quantity | Status |
|---|---|
| controls L2-L6/L14 vs previous main | identical: 6360 rows/case, zero differences, hashes match |
| restraint-reaction scalar failures, controls | 0 |
| L13 convergence | converged, 30 s, 23 friction restraints |
| L13 normal reactions within ±10 % | **23 / 23**, worst 7.5 % |
| L13 tangential vectors within ±10 % | 4 / 23 |
| L13 regime matches | 3 / 23 |
| L7 / L1 | implemented; not yet converged/qualified on the real file |
| L15 | algebraic from converged L7/L13, identity proven exactly |

Two corrections already carried the numbers this far, both derived from the file
rather than guessed:

- **Per-restraint friction sites.** `FRIC_COEF` per `INPUT_RESTRAINTS` row is the
  model input: 26 `Y` rows carry 0.3 (float32), three (20300, 20640, 21640) are
  blank and therefore frictionless, and CAESAR's own L13 shows exactly zero
  tangential load at those three. The Coulomb normal is that restraint's own
  reaction projected on its own signed cosine; a co-located `GUI`/`LIM` never
  contributes to it and removes that direction from the friction plane.
- **Friction stiffness.** `FRICT_STIF = 1.0E6` is in CAESAR's internal English
  units (lb/in), not in displayed N/cm. Converting with the ACCDB's own
  `INPUT_UNITS.CTRANS = 1.751270055770874` gives **1.751270055770874e8 N/m**.
  Proof: at three restraints whose reference utilisation is well below 1
  (20550 at 0.212, 22310 at 0.473, 20250 at 0.588) CAESAR's own
  `|Ft| / |u_t|` is 1.7513e8 N/m to four decimals. Applying it moved normal
  reactions from 22/23 to **23/23** within ±10 % and removed the 131 % outlier at
  21610. Re-derive this the same way for any new file; never carry the number over
  blindly.

## 2. Open mechanisms for the L13 tangential gap, in priority order

Each item: hypothesis, how to test it, what decides it.

### R1. Reference resolution floor (do this first - it is measurement, not modelling)

CAESAR prints displacement to 0.01 mm and, at some supports, 0.001 mm. With
`k_f = 1.75e8 N/m`, ±0.0005 mm is **±88 N** of tangential force. At 20550 the
reference drag prints as -0.001 mm, so the reference force itself is only known to
roughly ±50 %: any ±10 % comparison there is comparing against noise.

- **Do**: compute, per restraint, `k_f x half the printed displacement
  resolution` and classify restraints below that as resolution-limited.
- **Decides**: how many restraints are physically comparable at ±10 %. On the
  current L13 run the floor is 88 N and 22 of 23 restraints are above it, so this
  removes an alibi rather than a real defect - but it must be declared before any
  percentage is published, exactly as the exact-zero absolute limits already are.
- **Do not**: widen a tolerance. Declare a comparison *scope* with its derivation
  and report excluded restraints separately.

### R2. Partial mobilisation: CAESAR's stopping rule versus return mapping

Measured: CAESAR's L13 utilisation `|Ft| / µ|N|` clusters at 0.91-0.96 at many
restraints (20520 0.961, 22260 0.933, 22070 0.936, 21800 0.940) while the return
map places those same restraints exactly on the cap. That single difference is a
4-9 % error before direction is considered, and it is the largest systematic term
left.

- **Hypothesis**: CAESAR's published method deletes the tangential spring at
  breakaway and applies a constant force, then stops as soon as stick/slide states
  stop changing. The force it reports is the spring force reached at that iterate,
  which sits just below the capacity. The return map instead enforces the
  capacity exactly.
- **Do**: implement the documented spring form as a second **declared**
  `solutionStrategy` (`DELETED_SPRING_WITH_CONSTANT_FORCE_AND_STATE_STABLE_STOP_V1`),
  with CAESAR's stopping rule, and run both strategies through the loop on L13.
  Keep both in the profile; do not delete the return map.
- **Decides**: if the spring form reproduces the 0.91-0.96 cluster, the difference
  is the stopping rule, not the law, and the governed strategy becomes a recorded
  choice with evidence. If it does not, the cluster has another cause and R3/R4
  are next.
- **Watch**: the spring form is the form that limit-cycled. Run it with the
  accelerator and a declared iteration budget, and record non-convergence honestly
  rather than switching strategy mid-case.

### R3. Per-axis versus resultant Coulomb capping

The drag table shows one tangential component matching CAESAR almost exactly while
the other is short (20350 `0.478/0.227` reference against `0.478/0.068`; 20440
`-0.335/-0.292` against `-0.335/-0.101`). That is a partition signature, not a
magnitude error.

- **Do**: add a declared `capacityPartition` of `RESULTANT_V1` (current) or
  `PER_TANGENTIAL_AXIS_V1`, where each axis is limited to `µ|N|` independently.
- **Decides**: reference restraints whose resultant exceeds `µ|N|` while each
  component stays below it. 20710 is the candidate to check first: its free
  tangent is Z only and CAESAR reports 624.7 N against a capacity of 564.7 N -
  110 % of the resultant cap, which resultant capping cannot produce.
- **Also test**: whether CAESAR's capacity uses the normal reaction of the
  friction case or of its frictionless twin. Pure data test, no solver change:
  compare `|Ft|_ref / (µ N_L13)` against `|Ft|_ref / (µ N_L6)` per restraint and
  see which clusters at 1.0.

### R4. Load-path dependence for L7 (thermal + friction)

Friction is path dependent. L13 is `W+P1`, effectively one step, but L7 adds T1 and
CAESAR's L7-L5 delta reaches 50 kN at guided nodes, so the order in which supports
break away changes the answer.

- **Do**: add a declared incremental strategy - apply the case in N declared load
  steps, accumulating slip between steps - and compare N = 1 against N = 5 and
  N = 10 on L7. Record it as a solver-profile declaration
  (`loadStepping: DECLARED_EQUAL_INCREMENTS_V1`, with N).
- **Decides**: if the answer moves materially with N, single-step solving is not
  admissible for OPE friction cases and the governed N must be declared with the
  sensitivity evidence attached. If it does not move, single step stands and the
  study is recorded as a negative result.

### R5. Rotational friction and bend/tee supports

Not yet examined: whether any friction restraint sits on a bend station or a tee
node where the tangential plane interacts with the discretised arc. Check whether
the 23 friction nodes coincide with bend stations; if any do, the friction plane
must be verified against the arc tangent, not just the global axes.

### R6. Restraint-level cross-checks still unused

`INPUT_RESTRAINTS` carries `STIFFNESS`, `GAP` and `CNODE`, all blank sentinels in
BM4_L. Each is a boundary to assert explicitly (`GAP` blank means no gap, `CNODE`
blank means grounded). Add those assertions so a future file with real values
fails closed instead of being solved as if blank.

## 3. When to move to BM4_NL (friction + lift-off), and how

### Entry conditions - all four, measured

1. BM4_L L13, L7 and L1 all converge on the real file with every physics gate
   passing, and the per-restraint table is published for each.
2. Restraint reactions at friction restraints above the R1 resolution floor are
   within ±10 % on the coordinate-invariant vector, with any exceedance explained
   by a named mechanism rather than absorbed.
3. L15 remains an exact algebraic reconstruction, and the controls L2-L6/L14 are
   still bit-identical.
4. The governed choices from R2/R3/R4 are declared in the solver profile with the
   evidence that selected them.

Rationale: lift-off adds a second nonlinearity whose active set couples to
friction through the normal force - a support that lifts has `|N| = 0` and
therefore no friction at all. Starting lift-off while the friction cap is still
mis-partitioned would make every disagreement ambiguous between two unqualified
mechanics.

### How to stage BM4_NL

- **N0 Custody and inventory.** Pin BM4_NL's archive, recompute hashes, read the
  restraint table and inventory which restraints are one-directional (`+Y`, `-Y`,
  `+X`, …, types 13-18), which carry `GAP`, which carry `FRIC_COEF`, and which
  carry `CNODE`. Publish that inventory before any solve. Note that BM4_NL was
  retired for Stage 2 by owner direction, so this reopens it explicitly.
- **N1 Lift-off alone, no friction.** Select cases whose friction multiplier is 0
  and solve one-directional supports as a contact active set: a support is active
  while its normal reaction pushes, inactive once it would pull. Gate on
  complementarity (`N >= 0`, `gap >= 0`, `N x gap = 0`), zero active-set changes,
  and recovered equilibrium. This is the same active-set machinery as friction and
  should reuse `prepareCaesarAccdbCaseState` / `executeCaesarAccdbCaseState` with
  an overlay that removes the spring of an inactive support.
- **N2 Gaps.** Add declared gaps: a support engages only after the gap closes.
  Gate the gap-closure state the same way. Keep it separate from N1 so a gap error
  cannot be blamed on lift-off.
- **N3 Friction on top of lift-off.** Only now combine: friction capacity uses the
  *current* normal reaction, which is zero at a lifted support, so the friction
  active set is nested inside the contact active set. Iterate contact in the outer
  loop and friction in the inner loop, and record both ledgers. Expect
  non-convergence first; diagnose with the same per-iteration failed-gate ledger.
- **N4 Comparison.** Same four layers as Stage 2, plus a contact-state layer, and
  paired deltas against the BM4_NL frictionless/no-lift-off twins.

### What must not be done

- Do not implement lift-off by clamping negative reactions to zero after a solve.
  That is not an equilibrium state and it will pass a percentage while violating
  complementarity.
- Do not carry BM4_L's `FRICT_STIF` conversion, µ, or unit constants into BM4_NL
  without re-deriving them from that file's own `INPUT_UNITS` and restraint rows.
- Do not qualify stress in either benchmark until forces and displacements are
  qualified; stress inherits every error above.

## 4. How to run the loop

```bash
# fetch and verify the pinned source, solve controls + friction, write all evidence
node scripts/lfea-m047-stage2-production-run.mjs --artifacts artifacts/bm4l-stage2

# one measured tuning iteration on one case
node scripts/lfea-m047-stage2-friction-tuning-loop.mjs \
  --accdb artifacts/bm4l-stage2/source/BM4_L.ACCDB \
  --case L13 --variant R2-spring-form --out reports/iter-R2-L13.json \
  --compare reports/lfea-m047-stage2-friction-iteration-L13.json

# controls must stay identical to the previous main
node scripts/lfea-m047-stage2-control-regression.mjs \
  --accdb artifacts/bm4l-stage2/source/BM4_L.ACCDB --baseline-root /tmp/previous-main

# portable contract gates
npm run check:lfea-m047-stage2
```

A non-convergence is never reported as "did not converge": every iteration records
`failedGates` and their evidence, so the report names the physics that blocked and
the restraint that caused it.
