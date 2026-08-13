# M047 Stage 2 — R8 retained normal force variation (15%)

Status: **source-backed experiment prepared; production unchanged; real local nonlinear measurement required.**

## Authority and scope

The current production profile `CAESAR-ACCDB-FRICTION-SOLVER-R2` uses the current iteration's own restraint normal reaction in every Coulomb capacity evaluation:

```text
capacity = mu * current |N|
```

The owner-provided CAESAR II v14 authority for the next Stage 2 discriminator is `FRICTION_NORMAL_FORCE_VARIATION = 0.15`. Once a friction-bearing restraint first becomes nonlinear, CAESAR retains the normal force used for friction capacity and only re-evaluates that retained normal when the current normal differs from the retained baseline by **strictly more than 15%**.

This is R8. It is separate from R7 case-history speculation. R7 remains evidence-bounded because the pinned ACCDB contains no authoritative execution-order record and no external solve-order authority has been established.

## Exact R8 state rule

R8 is per restraint and carries one additional state variable, `retainedNormalReactionMagnitudeN`.

1. Initialize it to `null`.
2. While the restraint remains virgin `STICK`, capacity remains `mu * current |N|`.
3. On the first `STICK -> SLIDE` transition, seed the retained normal with that iteration's current `|N|`. The activation iteration therefore has the same capacity as production R2; only later iterations can differ.
4. Once activated, compare current `|N|` with the retained value each iteration.
5. Refresh the retained value only when:

```text
abs(current - retained) / retained > 0.15
```

The comparison is strict. Exactly +15% or -15% does not refresh.
6. If a retained baseline is exactly zero, zero-to-zero is unchanged and zero-to-nonzero always refreshes; no epsilon is introduced as a hidden tolerance.
7. After activation, including a later `LOCKED_AFTER_SLIP` state, the retained-normal history persists. Re-locking does not reset it.

Examples for retained `100 N`:

| current | refresh? |
|---:|:---|
| 115.0000 N | no |
| 115.0001 N | yes |
| 85.0000 N | no |
| 84.9999 N | yes |

## Frozen mechanics

R8 changes **only the normal used by the Coulomb capacity after first yield**. The experiment must not change:

- D1 force direction: opposite total relative tangential displacement `u_t`;
- resultant Coulomb cap shape;
- return-mapped retained tangential spring/slip law;
- physical friction stiffness `1.751270055770874e8 N/m` for this file;
- componentwise secant slip accelerator and its safeguards;
- state boundary and hysteresis;
- load case definitions;
- convergence gates;
- tolerances, comparison rules or acceptance criteria.

## Full nonlinear experiment

Use:

```bash
node scripts/lfea-m047-stage2-r8-normal-force-variation-experiment.mjs \
  --accdb <BM4_L.ACCDB> \
  --out reports/lfea-m047-stage2-r8-normal-force-variation-nonlinear.json
```

The harness deliberately does **not** modify `src/core/fea-benchmarks/caesar-accdb-friction-solve.js`. It reads that production file, applies a fail-closed set of exact source transforms to a temporary sibling module, imports the temporary module, deletes it, and verifies the production source hash is unchanged. If any transform anchor is absent or duplicated, the run fails instead of silently drifting from R2.

The local run measures the same real pinned ACCDB for `L13`, `L7` and `L1`, running both production R2 and R8 from the same package. The artifact includes:

- convergence status and iteration count;
- recovered-equilibrium status;
- result and iteration semantic hashes;
- normal-reaction and tangential-vector comparisons to CAESAR;
- R8 activation iteration per restraint;
- every retained-normal refresh iteration;
- final current and retained normals.

The artifact is stamped `promotionEligible: false` by design.

## Why no replay-only result is being published from the current branch

The committed compact D1 evidence retains final restraint attribution and hashes of the large local iteration artifacts, but not every per-iteration normal reaction. The later path artifact retains selected iteration force/state snapshots, again without the complete normal sequence. A 15% retained-normal replay needs the complete normal history in order, so reconstructing it from those compact files would invent missing state. Do not do that.

An owner comment mentioned an earlier replay artifact, but that JSON is not present at the current PR head and repository/commit search did not locate a committed copy. Those comment numbers are orientation only until an artifact is restored or independently reproduced.

## Promotion gate

R8 may enter production only after all of the following are committed from an admissible **local portable-reader** run against the pinned `BM4_L.ACCDB`:

1. custody hash matches `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8` and 5,136,384 bytes;
2. frozen non-friction controls remain PASS where shared paths are touched;
3. L13, L7 and L1 each converge under the unchanged governed ceilings;
4. recovered equilibrium passes for every converged case;
5. repeated R8 runs demonstrate determinism before promotion;
6. improvement is not confined to one named restraint or one case while materially degrading the others;
7. a production implementation is then made as a separate one-mechanic change and re-measured.

No GitHub Actions workflow may substitute for the required local Stage 2 accuracy measurement.
