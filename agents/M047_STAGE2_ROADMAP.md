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

Solver profile `CAESAR-ACCDB-FRICTION-SOLVER-R2` (promoted from a real-file
one-mechanic experiment measured on PR #1102 and reproduced independently on
this branch — see §1a).

| Quantity | Status |
|---|---|
| controls L2-L6/L14 vs previous main | identical: 6360 rows/case, zero differences, hashes match (structurally guaranteed — see §1a) |
| restraint-reaction scalar failures, controls | 0 |
| L13 convergence | converged, ~345 s, 23 friction restraints |
| L13 normal reactions within ±10 % | **23 / 23**, worst 1.8 % |
| L13 tangential vectors within ±10 % | **13 / 23**, worst 721.9 % |
| L13 regime matches | 3 / 23 |
| L7 convergence | converged, ~138 s (single step) |
| L7 normal reactions within ±10 % | 22 / 23 (sole failure: 20350, −24.9 %) |
| L7 tangential vectors within ±10 % | 10 / 23, worst 110.3 % |
| L1 convergence | converged, ~330 s, under doubled iteration budget (see §1b) |
| L1 normal reactions within ±10 % | **8 / 23 only**, worst 159 % — new, unresolved (§1c) |
| L1 tangential vectors within ±10 % | 4 / 23, worst 585 % |
| L15 | algebraic from converged L7/L13, identity proven exactly |

None of L13, L7 or L1 meet the BM4_NL entry bar yet (§3). Three corrections
carried the numbers this far, all derived from the file or from measured
solver behavior, never guessed:

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
  reactions from 22/23 to 23/23 within ±10 % and removed a 131 % outlier at
  21610. Re-derive this the same way for any new file; never carry the number over
  blindly.
- **Sliding-force direction (D1, now production).** R1 oriented the capped force
  opposite the return-map elastic stretch `u_t - u_slip`. CAESAR's own real L13
  reference friction vectors are anti-parallel to the current *total* relative
  tangential displacement `u_t` instead, at multiple two-direction restraints —
  which is also what the profile's own `slipDirectionRule` had declared all
  along. Switching to it took L13 tangential vectors from 4/23 to 13/23 with
  normals held at 23/23 (worst error improved 7.5 % → 1.8 %) and every frozen
  control unaffected. Full derivation: `reports/lfea-m047-stage2-d1-real-measurement.md`.

### 1a. Why the controls are safe without re-running the full regression every time

`solveCaesarAccdbFrictionBenchmark` (`caesar-accdb-friction-solve.js:199`)
**throws** for any case whose effective friction is not active. L2-L6/L14 all
resolve `frictionActive: false` and are solved exclusively by the
already-qualified linear path (`caesar-accdb-linear-solve.js`) — they never
enter this module. A change confined to this file (direction law, iteration
budget) is therefore structurally inert for the frozen controls; it does not
need to be re-proven by a real-file regression every time, though one should
still be run before any PR that also touches shared code paths
(`prepareCaesarAccdbCaseState` / `executeCaesarAccdbCaseState`).

### 1b. Iteration budget doubled (400 → 800) on measured tail evidence, not tuning

Real L1 at iteration 400 under D1 had every gate closed except displacement
update, whose own recorded tail decayed monotonically and geometrically at
ratio ≈0.992/iteration (1.27e-10 m → 1.19e-10 m against the unchanged 1e-10 m
limit) — a real convergent tail, not an oscillation or limit cycle. The solve
loop returns the instant `gates.status === 'CONVERGED'`
(`caesar-accdb-friction-solve.js:442`), so raising the ceiling cannot change
any case that already converges below it — confirmed directly: L13 and L7
reproduce their exact D1 numbers under the higher ceiling. Doubling (a round,
uncherry-picked margin, not a value fitted to make one case pass) was enough:
L1 now converges, in about the same wall-clock time as the old 400-iteration
non-convergent run plus a few seconds, consistent with the ~22-iteration
extrapolation from the measured rate.

### 1c. New: L1 hydrotest normal-reaction basis is unresolved (open, high priority)

With the iteration blocker removed, L1 converges but its **normal** reactions
— a linear-mechanics quantity, not a friction-law one — are only 8/23 within
±10 %, several by 100 %+. This is qualitatively different from L13/L7, whose
normals were already excellent (22-23/23) under the same solver machinery,
which is strong circumstantial evidence the defect is not in this friction
module but in the **`WW`/`HP` weight-and-pressure basis feeding it**: the
error is large and spread across most restraints, the signature of a global
load-magnitude or load-distribution mismatch rather than local nonlinear
branch noise. `agents/M047_STAGE2_PREQUALIFICATION_CORRECTIONS.md` declared
the hydrotest authority (1000 kg/m³ test fluid, `HP` bound to ACCDB
`HYDRO_PRESSURE`) to remove the blocking exception, but never verified the
resulting reactions against CAESAR's numbers — this is that verification, and
it fails. No frictionless HYD twin case exists in this file to isolate the
error by subtraction the way L6 isolates L13, so the next step is a dedicated
linear-mechanics audit of L1's weight/pressure basis (global equilibrium sum
check against CAESAR's reported total restraint load, and a term-by-term
`WW`/`HP` derivation) **before** any further friction-law tuning is attempted
on L1 — tuning the nonlinear layer against a case whose linear input is
already wrong would misattribute the error.

## 2. Mechanisms for the L13 tangential gap — R1-R6 measured, R7 is the live one

R1-R6 below were all tested as one-mechanic real-file experiments (D1 direction
law promoted to production; R2's deleted-spring form, R3's per-axis cap, R4's
load stepping and C1/C2's capacity-basis variants all measured and rejected;
R5/R6 checked and found not applicable in BM4_L). None of them close the
remaining L13 gap (10/23 vectors still outside ±10 % after D1). **R7 is the
current leading, evidence-bounded hypothesis** and is where the next real
investigation should start — read it before re-deriving R1-R6 from scratch.

### R1. Reference resolution floor — MEASURED, keep declaring it

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

### R2. Partial mobilisation: CAESAR's stopping rule versus return mapping — TESTED, REJECTED

The 0.91-0.96 utilisation cluster this section originally targeted is now
understood as one instance of the broader R7 pattern below, not a stopping-rule
artifact. `scripts/lfea-m047-stage2-friction-d1-per-axis-box-cap.mjs`'s sibling
deleted-spring/constant-force harness (DS1) was measured on real L13: only a
**state-stable proxy**, 3/23 vectors and 20/23 normals, still nonconverged after
the full 400-iteration budget. `reports/lfea-m047-stage2-d1-deleted-spring-constant-force-measurement.md`
has the full ledger. **Do not re-attempt the deleted-spring form**; it is worse
than the retained-spring return map on every measured axis and does not even
reach the state-stable proxy's own fixed point cleanly.

<details><summary>Original hypothesis and test plan (superseded, kept for record)</summary>

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

</details>

### R3. Per-axis versus resultant Coulomb capping — TESTED, REJECTED

`scripts/lfea-m047-stage2-friction-d1-per-axis-box-cap.mjs` measured this on
real L13, stacked on accepted D1: it **converges**, normals hold at 23/23, but
vectors **drop to 6/23** (from D1's 13/23). Per-axis capping is not merely
unhelpful, it is actively worse than resultant capping.
`reports/lfea-m047-stage2-r3-per-axis-box-measurement.md` has the full ledger.
The 20710 candidate this section named as "per-axis capping cannot produce
110% resultant over-cap" was separately forensically closed
(`scripts/lfea-m047-stage2-20710-forensic.mjs`,
`reports/lfea-m047-stage2-20710-forensic.json`): the 624.7 N Z-force is on the
individual `Rigid Y` output row directly (not a summary-merge artifact), the
co-located `LIM` carries only X and is frictionless, and incident element-end
forces close against the published reaction to float32 roundoff
(`3.05e-5 N` residual on a `1882 N` reaction). The C1 capacity-basis test in
the same batch (does CAESAR use the friction-case normal or the frictionless
twin's?) also decided cleanly: the friction-case own normal is closer to the
Coulomb surface at 16/23 restraints, and switching to the frictionless twin
does not explain 20710 either (utilisation 1.20 there, still over-cap). **Do
not re-attempt per-axis capping or a frictionless-twin normal basis**; both
are measured and rejected. See R7 for what 20710 (and the rest of the
utilisation cluster) actually looks like once you stop assuming it's a
capping-shape or normal-basis problem.

### R4. Load-path dependence for L7 (thermal + friction) — TESTED, REJECTED as a fix

Real single-step-D1 L7 measured 10/23 vectors, 22/23 normals. The physical
proportional continuation harness (`scripts/lfea-m047-stage2-friction-d1-load-continuation.mjs`)
validated cleanly — N=1 reproduces the single-step result to **exactly zero**
numeric difference across all 23 restraints — before testing N=5 and N=10.
Both **fail to converge** within the unchanged 400-iteration per-step budget,
with the residual concentrated at restraint **20550** both times, and N=10
fails *earlier* (step 2/10, factor 0.2) than N=5 (step 2/5, factor 0.4) — finer
stepping makes it fail sooner, not later. Do not increase the per-step
iteration budget or select a step count to rescue L7; see R7, restraint 20550
is a specific instance of the same pattern this finer-stepping result already
points at. `reports/lfea-m047-stage2-load-continuation-measurement.md` and
`reports/lfea-m047-stage2-d1-generalization-l7-l1-measurement.md` have the
full ledgers. Simple two-stage component ordering (W-first vs P1-first) was
also tested on L13 and rejected: W-first reproduces D1 exactly (not a missing
mechanism), P1-first does not even converge in its intermediate stage.
`reports/lfea-m047-stage2-load-component-order-measurement.md`.

### R5. Rotational friction and bend/tee supports — CHECKED, not applicable in BM4_L

`scripts/lfea-m047-stage2-restraint-boundary-diagnostic.mjs` inventoried all 26
declared friction rows against `INPUT_BENDS`: none of the 23 effective friction
restraints sit on a declared bend station or a physical tee node. Several
(including 20710) are on an element *adjacent* to a bend-bearing element, but
R5's own criterion — coincidence with a declared bend station — is not met, so
no rotated tangent-plane authority is triggered. `reports/lfea-m047-stage2-restraint-boundary-diagnostic.json`.

### R6. Restraint-level cross-checks still unused — CHECKED, all blank as expected

Same diagnostic confirms `STIFFNESS`, `GAP` and `CNODE` are the blank sentinel
(`-1.01010000705719`) on all 46 `INPUT_RESTRAINTS` rows, not just the 26
friction rows. `requiredFutureBehavior` is recorded in the evidence: any future
file with a non-blank value on these fields must fail the friction
qualification boundary closed rather than being solved as if blank.

### R7. Case-history-dependent friction capacity — the current leading hypothesis, evidence-bounded

This is where R2's original 0.91-0.96 utilisation-cluster question actually
leads, now that the stopping-rule (R2), capping-shape (R3) and normal-basis
(R3/C1/C2) explanations are all measured and rejected.

**The pattern.** At node 20710, the same restraint's utilisation across the
three friction-active cases is: L7 (`W+T1+P1`, the fully thermally-loaded
case) **1.0037** — dead on its own cap; L13 (`W+P1`) **1.1063**; L1
(`WW+HP`) **1.1090**. The two cases missing thermal expansion sit ~10-11%
over their own final-normal cap; the one case with thermal expansion sits
almost exactly on it. `l13Reference.impliedNormalRequiredForExactCapN` in the
forensic evidence is 2082.46 N against a published final normal of only
1882.31 N — CAESAR's reported tangential force corresponds to a normal that
existed at some point *other than* the final converged state.

**Why C2 (lagged own-normal, tried and rejected) could not have found this.**
C2 lagged the capacity by exactly one solver iteration and measured that at
the fixed point the lagged and current normals cannot differ by more than
`6e-6 N` across all 23 restraints (`reports/lfea-m047-stage2-c2-lagged-own-normal-measurement.md`)
— true by construction: any solver iterated to its own tight convergence gate
necessarily has successive iterates agree. That rules out *intra-solve*
iteration lag as the mechanism. It does not rule out *inter-case* history: if
CAESAR solves its load cases in an internal sequence and a `SUS`/`HYD` case's
friction state is seeded from — or shares an iteration history with — an
already-solved case with a different (larger) normal, the published state can
be a genuine converged fixed point of *that* history and still sit off the
single-case Coulomb surface this solver assumes. Restraint 20550's finer-
stepping-fails-sooner result under R4 is consistent with the same thing: near-
cap restraints are exactly where load-path/history sensitivity shows up first.

**Why this ACCDB cannot resolve it further.** The pinned `BM4_L.ACCDB` contains
only `INPUT_*` and `OUTPUT_*` tables (confirmed by listing every table in the
file — no `LOAD_CASE`, `CASE_LIST`, run-order or execution-log table exists at
all). CAESAR's own friction-iteration initialization, relaxation, load
stepping and inter-case state handling are undocumented (the solver profile
already says so, `caesar-accdb-friction-solve.js:43-46`) and this file
structurally cannot record them — there is nowhere for that information to
live in an ACCDB. This is a genuine evidentiary boundary, not a shortcut:
**do not guess a case-sequencing algorithm and fit it to 20710**, and do not
declare 20710 an "error" in CAESAR's output either — `nodalEquilibrium` in the
forensic evidence proves the over-cap Z-reaction is required by the published
element-end forces to float32 roundoff, so it is CAESAR's genuine converged
state, not a reporting artifact.

- **Do, if pursuing this further**: the only way to test the inter-case-history
  hypothesis directly is to obtain CAESAR's actual declared case solve order
  (from documentation, from a CAESAR license, or from the benchmark owner) and
  check whether it's consistent with the observed 20710/20550 pattern across
  more than one node — a single node is a data point, not a proof.
- **Do not**: build a multi-case-coupled solver against an unverified guess at
  CAESAR's internal sequencing. That risks fitting noise and would need its
  own falsification evidence before being trusted, exactly like every other
  mechanic in this project.
- **In the meantime**: the remaining L13/L7 gap (10/23 and 13/23 respectively)
  should be treated as a named, evidence-bounded limitation of a
  single-case-independently-converged solver architecture, not a defect to
  keep chasing with more one-mechanic experiments on the same law.

## 3. When to move to BM4_NL (friction + lift-off), and how

### Entry conditions - all four, measured

Status as of this update: **not met**. Condition 1 is met for L13 and L7
(converge, every gate passing) and now also for L1 (converged after the
iteration-budget fix in §1b) — but L1's own normal reactions are not yet
trustworthy (§1c), so condition 1 is not cleanly satisfied until that is
resolved. Condition 2 is unmet: L13 stands at 13/23, L7 at 10/23 vectors
within ±10 % after D1, and R7 above is the named, evidence-bounded (not yet
resolved) mechanism for the remaining gap.

1. BM4_L L13, L7 and L1 all converge on the real file with every physics gate
   passing, **and their normal reactions are already within tolerance** (a
   converged nonlinear friction solve on top of a wrong linear normal is not a
   valid qualification state), and the per-restraint table is published for
   each.
2. Restraint reactions at friction restraints above the R1 resolution floor are
   within ±10 % on the coordinate-invariant vector, with any exceedance explained
   by a named mechanism rather than absorbed.
3. L15 remains an exact algebraic reconstruction, and the controls L2-L6/L14 are
   still bit-identical.
4. The governed choices — D1 direction law, doubled iteration budget, and
   whatever resolves R7 and the L1 normal-basis question (§1c) — are declared
   in the solver profile with the evidence that selected them.

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

`artifacts/` is gitignored — it never survives between sessions/containers, so
fetch it fresh every time (0.27 s to read, seconds to download):

```bash
# fetch and verify the pinned source (any container, no Windows/ACE/CI needed)
mkdir -p artifacts/bm4l-stage2/source && cd artifacts/bm4l-stage2/source
curl -sS -o BM4_L.zip https://raw.githubusercontent.com/reallaksh19/Common/f4d49f2a47d970ae0abf913b537193e324556177/LFEA/BM4/BM4_L.zip
sha256sum BM4_L.zip   # expect 978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9
unzip -o -j BM4_L.zip BM4_L.ACCDB -d .
sha256sum BM4_L.ACCDB  # expect 64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8
cd -

# or the equivalent one-shot production run (does the same fetch/verify/solve/evidence)
node scripts/lfea-m047-stage2-production-run.mjs --artifacts artifacts/bm4l-stage2

# one measured tuning iteration on one case
node scripts/lfea-m047-stage2-friction-tuning-loop.mjs \
  --accdb artifacts/bm4l-stage2/source/BM4_L.ACCDB \
  --case L13 --variant R7-case-history-probe --out reports/iter-R7-L13.json \
  --compare reports/lfea-m047-stage2-real-d1-evidence.json

# controls must stay identical to the previous main (only needed if you touched
# code paths shared with the qualified linear solver - see §1a for why a
# friction-solver-only change does not need this)
node scripts/lfea-m047-stage2-control-regression.mjs \
  --accdb artifacts/bm4l-stage2/source/BM4_L.ACCDB --baseline-root /tmp/previous-main

# portable contract gates (fixture-based, fast, run this every time regardless)
npm run check:lfea-m047-stage2
```

A non-convergence is never reported as "did not converge": every iteration records
`failedGates` and their evidence, so the report names the physics that blocked and
the restraint that caused it.
