# M047 Stage 2 — L13 friction accuracy RCA

Scope: re-analysis of the already committed real-ACCDB artifact
`reports/lfea-m047-stage2-friction-iteration-L13.json` (`B0-frict-stif-internal-english-via-CTRANS`).
This report does **not** claim a new solve or a new qualification percentage. It identifies which single mechanic should be changed next.

Source custody remains the pinned `BM4_L.ACCDB`, SHA-256
`64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`.

## Baseline that must not be lost

The B0 real-file artifact already establishes:

- L13 converged;
- 23 effective friction restraints;
- normal reactions: **23/23 within ±10%**, worst 7.49%;
- tangential magnitudes: **8/23 within ±10%**;
- tangential vectors: **4/23 within ±10%**.

The normal-force result is important RCA evidence: the remaining L13 error is not primarily a W/P1 normal-load problem. It is concentrated in the tangential friction state and vector construction.

## RCA-0 — the published 3/23 regime-match number is a diagnostic bug

The tuning loop creates reference labels `SLID` / `STUCK`, while the nonlinear solver publishes
`SLIDING` / `LOCKED_AFTER_SLIP` / `STUCK`. The current artifact stores `match` using literal string equality.
Consequently `SLID` never equals `SLIDING`, and `STUCK` never equals `LOCKED_AFTER_SLIP`, even though the latter is explicitly defined by the solver as an elastic current state below the cap after historical slip.

For final-state comparison the compatible mapping is:

```text
solver SLIDING            -> reference SLID
solver STUCK              -> reference STUCK
solver LOCKED_AFTER_SLIP  -> reference STUCK
```

Applying only that semantic normalization to the committed rows changes the final-state comparison from
**3/23 raw string matches to 14/23 constitutive matches**. There are **9 genuine state mismatches**, not 20.
This is a measurement correction only; it does not improve the solver.

The nine real mismatches split cleanly into two mechanisms.

### Solver over-mobilises four restraints

| restraint | CAESAR utilisation | solver final state |
|---|---:|---|
| 22260 | 0.9326 | SLIDING |
| 20520 | 0.9615 | SLIDING |
| 21740 | 0.9191 | SLIDING |
| 20170 | 0.9328 | SLIDING |

CAESAR is below the Coulomb surface at all four while the return map drives them to the cap. This is the same 0.91–0.96 partial-mobilisation cluster already visible in the real-data report.

### Solver re-locks five restraints that CAESAR leaves sliding

| restraint | CAESAR utilisation | solver utilisation / state |
|---|---:|---|
| 21860 | 1.0018 | 0.2809 / LOCKED_AFTER_SLIP |
| 21610 | 1.0443 | 0.6321 / LOCKED_AFTER_SLIP |
| 20710 | 1.1063 | 0.9790 / LOCKED_AFTER_SLIP |
| 21470 | 1.0136 | 0.9889 / LOCKED_AFTER_SLIP |
| 22020 | 1.0016 | 0.9930 / LOCKED_AFTER_SLIP |

This is evidence against treating the return-map re-lock history as automatically equivalent to CAESAR's static iteration path.

## RCA-1 — direction law is the largest directly evidenced vector defect

The checked-in solver profile still declares:

```text
slipDirectionRule = UNIT_RELATIVE_TANGENTIAL_DISPLACEMENT_V1
```

but the current implementation constructs and gates the friction direction from
`elasticTangentialStretch = totalTangentialDisplacement - accumulatedSlip`.
Because the retained-spring force is itself `-k_f * elasticStretch`, the current direction gate is nearly an identity: it can pass even when the CAESAR friction vector points somewhere else.

The source rows provide a much stronger discriminator. At the inspected two-dimensional restraints below,
the CAESAR friction vector is anti-parallel to the CAESAR **total relative tangential displacement** to machine precision:

| restraint | observation |
|---|---|
| 22260 | `cos(Ft_ref, u_t_ref) = -1` |
| 20520 | `cos(Ft_ref, u_t_ref) = -1` |
| 22370 | `cos(Ft_ref, u_t_ref) = -1` |
| 20440 | `cos(Ft_ref, u_t_ref) = -1` |
| 21800 | `cos(Ft_ref, u_t_ref) = -1` |
| 22120 | `cos(Ft_ref, u_t_ref) = -1` |
| 20090 | `cos(Ft_ref, u_t_ref) = -1` |

Representative source rows show why this matters:

- 22260: CAESAR `Ft = [392.54, -311.31] N`, `u_t = [-0.39924, 0.31662] mm`; the current solver instead follows its elastic stretch and produces `[-537.20, 13.85] N`.
- 20520: CAESAR `Ft = [548.14, 387.53] N`, `u_t = [-0.49055, -0.34681] mm`; solver `[-698.74, -10.49] N`.
- 22370: CAESAR `Ft = [-435.25, 342.81] N`, `u_t = [0.29724, -0.23411] mm`; solver `[-17.82, 544.84] N`.
- 20440: one component is already close while the other is badly short: CAESAR `[415.67, 361.71] N`, solver `[430.41, 74.89] N`.

This explains the B0 pattern: **8/23 magnitudes pass but only 4/23 vectors pass**. The magnitude can be reasonable while the force is rotated into the wrong tangential direction.

### Direction-only counterfactual

As a diagnostic only, keep each solved tangential magnitude unchanged and rotate its vector opposite the solved total tangential displacement:

```text
Ft_cf = -|Ft_solved| * u_t_solved / |u_t_solved|
```

This is not an equilibrium solution and must not be reported as qualification. It isolates the possible size of the direction error. Examples from the committed B0 rows:

| restraint | B0 vector error | direction-only counterfactual |
|---|---:|---:|
| 22260 | 196.6% | 10.6% |
| 20520 | 195.0% | 17.0% |
| 22370 | 83.7% | 7.7% |
| 20440 | 52.1% | 20.9% |
| 21800 | 51.0% | 12.7% |
| 22120 | 15.1% | 0.53% |
| 20090 | 14.2% | 16.8% |

The negative control at 20090 is important: direction alone is not a universal correction. A real rerun is required because the displacement field and normal reactions will re-equilibrate.

**Next one-mechanic run:** project the capped sliding force opposite the current **total relative tangential displacement**, while leaving `k_f`, the normal-force basis, the cap magnitude, state boundaries, convergence gates, controls and comparison thresholds unchanged.

## RCA-2 — state-path/stopping law is second priority

After direction is isolated, test the CAESAR documented deleted-spring / constant-force iteration as a separately declared diagnostic strategy.

The present return map creates two opposite parity errors at once:

- four CAESAR non-sliding restraints are driven exactly to the cap;
- five CAESAR sliding restraints re-lock below the cap.

That topology is consistent with iteration-path / stopping-history differences, not with a single coefficient or stiffness error. Do not tune hysteresis or convergence limits to reduce these counts.

The deleted-spring strategy remains diagnostic until it also satisfies the existing equilibrium and nonlinear physics gates. A state-stable iterate that is still cycling in reactions is not a qualification result.

## RCA-3 — capacity basis must be tested before per-axis capping

Node 20710 is especially useful because it has only one free tangential direction. CAESAR reports:

```text
|Ft| = 624.74 N
mu * |N_L13| = 564.69 N
utilisation = 1.1063
```

A one-axis restraint cannot be explained by "per-axis versus resultant" partitioning. Therefore the first R3 test should be data-only:

1. calculate `|Ft_ref| / (mu * |N_L13|)`;
2. calculate `|Ft_ref| / (mu * |N_L6|)` using the frictionless sustained twin;
3. determine which normal-force basis clusters at the Coulomb surface.

Only if the current-case normal remains the supported basis should the solver branch into resultant versus per-axis capacity partition experiments.

## RCA-4 — reference resolution remains diagnostic, never a tolerance change

With the governed
`k_f = 1.751270055770874e8 N/m`, half of a 0.001 mm printed displacement step corresponds to:

```text
87.5635 N
```

Node 21930 has only 4.96 N reference tangential force and is below that displacement-derived floor. Node 20550 has 176.28 N, so the same half-step is about 49.7% of its force.

This affects how confidently displacement can be used to infer friction mobilisation/stiffness from printed reports. It does **not** widen or replace the existing force comparison criterion, and the ACCDB values themselves remain the benchmark source.

## Governed RCA order from this point

1. **D1 — direction law:** one mechanic only — sliding force direction from total relative tangential displacement. Re-run L13 and publish the artifact.
2. **S1 — state path:** only after D1, test deleted-spring/state-stable behavior versus return-map re-lock behavior.
3. **C1 — capacity basis:** compare L13 normal versus L6 normal using reference data; then, only if still necessary, test capacity partition.
4. **L7 load stepping:** defer until the L13 friction law/state behavior is stable; otherwise thermal path effects will be confounded with a known sustained-friction defect.

At every step, the L2–L6/L14 control regression remains mandatory and no tolerance, acceptance criterion, reference value or node exception is changed.

## Reproducible diagnostic

The companion script added with this report operates only on a committed real-data tuning artifact:

```bash
node scripts/lfea-m047-stage2-accuracy-rca.mjs \
  --iteration reports/lfea-m047-stage2-friction-iteration-L13.json \
  --print-resolution-mm 0.001 \
  --out reports/lfea-m047-stage2-accuracy-rca.json
```

It reports normalized constitutive-state matches, magnitude-versus-direction error, source and solver direction cosines, the direction-only counterfactual, state-path candidate sets, the single-axis over-cap signal and the displacement-derived resolution floor. The generated JSON must be committed only after running it against the committed real-data artifact; it is diagnostic evidence, not a substitute for the next real ACCDB solve.
