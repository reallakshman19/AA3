# M047 Stage 2 — real L13 D1 accuracy measurement

Issue: #1083  
PR: #1102  
Status: **REAL PINNED-ACCDB MEASUREMENT — D1 accepted as the experimental baseline; not final friction qualification.**

## Custody and execution

- current source: `a580cd86ec3cd6e3ddbd495b65d3d1ec7340e4ec`
- control baseline source: `12c695a9ed9a3dedada1d45024712df911069a80`
- ACCDB SHA-256: `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`
- ACCDB byte length: `5,136,384`
- runtime: Node 22; portable `mdb-reader` path; solve executed locally after byte transport
- evidence validation: **PASS**; failed checks: 0

The temporary GitHub Actions jobs used only to transport immutable source/runtime bytes into this execution environment. Both PR heads remained unchanged by transport and the numerical solves were executed locally.

## Frozen control gate

Control regression status: **PASS** on L2, L3, L4, L5, L6 and L14.

- every control case: rows identical, zero differences;
- row semantic hashes match;
- execution semantic hashes match;
- stiffness-state hashes match;
- recovered physical equilibrium PASS.

The compact control artifact is committed as `reports/lfea-m047-stage2-control-regression-D1.json`.

## D1 measured accuracy

| metric | B0 | D1 |
|---|---:|---:|
| converged | true | true |
| tangential vectors within ±10% | 4/23 | **13/23** |
| normal reactions within ±10% | 23/23 | **23/23** |
| worst normal error | 7.487% | **1.795%** |
| constitutive-state matches | 14/23 | **19/23** |
| genuine state mismatches | 9 | **4** |
| above-R1-floor vector passes | 4/22 | **13/22** |
| worst above-R1-floor vector error | 196.60% | **176.22%** |

D1 therefore materially improves the governed vector comparison while preserving the already-qualified normal-force behavior and all frozen controls. It is accepted as the baseline for the next one-mechanic experiment. This is **not** final BM4_L friction qualification: 10/23 vector rows still exceed ±10%.

### Remaining D1 state mismatches

- 21860:REST_PTR20:TYPE3:UY
- 22370:REST_PTR29:TYPE3:UY
- 21470:REST_PTR14:TYPE3:UY
- 22120:REST_PTR24:TYPE3:UY

All four are CAESAR `SLID` / solver constitutively stuck (`LOCKED_AFTER_SLIP`) mismatches. D1 removes the B0 over-mobilisation mismatch class entirely in the normalized RCA.

### Largest real vector regressions

- 22140:REST_PTR25:TYPE3:UY: 1.25% → 176.22%
- 21930:REST_PTR21:TYPE3:UY: 547.93% → 721.91% (below provisional R1 force floor)
- 22220:REST_PTR26:TYPE3:UY: 49.01% → 111.57%

The raw D1 worst error is 721.91% at 21930, whose CAESAR reference tangential magnitude is 4.9588 N. Under the explicitly provisional 0.001 mm print-resolution diagnostic, the half-step force is about 87.56 N, so 21930 is below that displacement-derived floor. No tolerance is widened and the row remains a benchmark failure.

## C1 capacity-basis result

- L13 current-case normal is closer to the CAESAR friction surface at **16/23** restraints; L6 frictionless-twin normal is closer at 7/23.
- within 10% of Coulomb surface: L13-normal **17/23**, L6-normal 13/23.
- mean absolute surface deviation: L13-normal **0.1570**, L6-normal 0.4167.
- node 20710 remains a one-axis over-cap datum: utilisation 1.1063 with L13 normal and 1.2020 with L6 normal.

Decision: keep the current-case own-restraint normal basis. Switching to the frictionless L6 normal makes the aggregate surface fit worse and does not explain 20710. Per-axis versus resultant capping also cannot explain a one-axis over-cap datum.

## Sequential S1 result — rejected

After accepting D1 as the baseline, S1 added exactly one mechanic: once a restraint entered `SLIDE`, it could not re-lock in that primitive case. D1 direction, stiffness, cap, normal basis, initial breakaway rule, return-map form, acceleration and convergence gates stayed frozen.

Result: **NONCONVERGED after 400 iterations**.

- state changes: 20 on iteration 1, then zero for the remainder;
- cap complementarity failed in 400 iterations;
- slide-capacity residual failed in 400 iterations;
- reaction update remained 30106.8 N at the final iterate;
- displacement update remained 1.719e-4 m at the final iterate;
- no convergence limit or tolerance was changed.

Decision: reject the no-relock S1 mechanic. The active set being stable is not sufficient; the force/slip fixed point does not converge. The next state-path experiment must use a different mechanism rather than weakening convergence gates.

The sequential experiment harness is committed as `scripts/lfea-m047-stage2-friction-d1-s1-no-relock.mjs`.

## Committed real-run evidence

`reports/lfea-m047-stage2-real-d1-evidence.json` is the committed compact real-run artifact. It contains:

- pinned source and exact current/baseline heads;
- frozen control PASS evidence;
- D1 solver/profile and transformed-source fingerprints;
- **all 23** restraint normal and tangential reference/solved comparisons;
- normalized constitutive states and R1 provisional-floor flags;
- C1 summary;
- evidence-validator PASS;
- sequential D1→S1 failure ledger and experiment lineage;
- SHA-256 identities of the full locally generated JSON artifacts.

Full local artifact byte hashes are retained in that compact evidence:

- `b673be01a3a245654d580a5202dcf98667121de66566f8a70b1ff20dedc9ba6d` — control regression
- `44d58511281d4f17b636839f9983beccc1028a51df5b3b0947ea1e4acf216de8` — full D1 tuning iteration
- `07a6b93b740be03b3d761e7e89badb7936a1d586a4e07b6e4df1d56060406409` — D1 accuracy RCA
- `2def10cc922fc9f2330c27e878f21c7140e74f90d0a269678a46912a0a773a3b` — C1 capacity-basis diagnostic
- `d51c3f37d9c735ae69bfcc81ed5b3bf2ae6c3928d329bd595917876ce45f2005` — evidence validation
- `44d136a12d09d94ecd6016f401679e853f74f037e6360e37e038f63af16a0571` — provisional R1 resolution-floor report
- `a7dc005c9854f14ee70654ffbc3c9666f34690ac946449cc8b9abf66eb5a2791` — sequential D1→S1 iteration

The checked-in RCA, C1, R1 and validation scripts can regenerate the corresponding diagnostics from a full D1 tuning artifact. The compact committed evidence deliberately preserves the measured restraint table and full-artifact identities without pretending the larger local JSON files themselves were committed.
