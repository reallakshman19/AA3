# M047 Stage 2 — physical load-path continuation measurement

Status: **REAL PINNED-ACCDB MEASUREMENT — path sensitivity confirmed; proportional continuation not promoted.**

## Scope

Baseline is accepted D1. The only changed mechanic is the physical load path for L13 `W+P1`: start from the all-stick zero-load state and advance W and P1 proportionally to full load in N equal increments. Every load increment retains D1 direction, friction stiffness, Coulomb cap, own-restraint normal basis, state boundary/hysteresis, return-mapped slip offset, secant acceleration, 400-iteration limit, convergence gates, and the ±10% comparison goal.

Measured N values: **1, 5, 10**.

Pinned ACCDB SHA-256: `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`.  
Frozen PR #1090 head: `12c695a9ed9a3dedada1d45024712df911069a80`.  
Production friction solver blob at the #1102 pre-batch head: `aa4cc0402659d132e4012b8d8d7d84d9943428c7`; production solver was not modified.

## Reproduction gate

N=1 must be the original single-step D1 solve. It passed exactly:

- all 23 restraint comparison records exactly equal D1;
- summary exactly equal D1;
- maximum numeric difference = **0**;
- result = **13/23 vectors**, **23/23 normals**.

This validates the continuation harness before interpreting N=5/N=10.

## Real accuracy results

| metric | D1 / N=1 | N=5 | N=10 |
|---|---:|---:|---:|
| converged | yes | yes | yes |
| vectors within ±10% | **13/23** | **14/23** | **13/23** |
| normals within ±10% | **23/23** | **23/23** | **23/23** |
| mean vector relative error | 60.42% | 46.64% | **26.68%** |
| raw worst vector error | 721.91% | 666.05% | **229.28%** |
| above provisional R1 floor: passes | 13/22 | **14/22** | 13/22 |
| above provisional R1 floor: mean error | 30.35% | 18.49% | **17.47%** |

The step-count response is not monotonic in the threshold count. N=5 has one extra pass; N=10 has much lower mean and raw worst error. That means a fixed N cannot be selected by pass count without tuning an undocumented numerical parameter.

## Original D1 branch errors respond strongly to load path

| node | D1 | N=5 | N=10 |
|---|---:|---:|---:|
| 22140 | 176.22% | **11.68%** | **11.49%** |
| 22220 | 111.57% | 20.24% | **13.60%** |
| 21860 | 71.77% | 12.22% | **8.09%** |
| 21740 | 35.28% | 19.91% | **9.53%** |
| 22370 | 69.23% | 43.59% | **29.21%** |

This is strong evidence that equilibrium/path selection is a genuine part of the remaining CAESAR parity problem.

## But proportional continuation creates new regressions

| node | D1 | N=5 | N=10 |
|---|---:|---:|---:|
| 22260 | **11.26%** | 154.24% | 167.98% |
| 22310 | **23.29%** | 54.73% | 56.35% |

The error is redistributed to different locked-after-slip branches. This prevents promotion of proportional W+P1 continuation even though it repairs 22140/22220 and reduces aggregate error.

Node 20710 remains a separate one-axis capacity/path signal: 9.03% (D1), 9.99% (N=5), 10.54% (N=10). The provisional R1 below-floor node 21930 improves substantially at N=10 but remains a benchmark failure; no tolerance is widened.

## Decision

**D1 remains the measured experimental baseline.** Proportional zero→full W+P1 continuation is **not promoted**.

What this batch resolves:

- load path is causally important;
- a fixed proportional step count is not stable enough to be authority;
- selecting N=5 because it gives 14/23 would be benchmark tuning and is explicitly rejected;
- the next discriminating experiment should test **load-component ordering** while keeping D1 otherwise frozen: `W → W+P1` versus `P1 → W+P1`.

No production solver, tolerance, comparison rule, cap, normal basis, or state law is changed by this batch.

## Full local artifact hashes

- D1: `44d58511281d4f17b636839f9983beccc1028a51df5b3b0947ea1e4acf216de8`
- N=1: `fb5baafe418dafaa66026419a0124acee79518a3470a3c12f0992a31060abbbe`
- N=5: `f9f80c5e4ad63fc6cc8f78cfb3ca948a2415ab3d21cd6d22d8999f02516fc26b`
- N=10: `3fe6180eea8cce76a4593105164764ade4386dd8b13622ab4c839231f04ac315`
- N=5 RCA: `375f39dd03576bb711d4698f26d33811dfb94c60136ddccbab6a8a41ec8f6381`
- N=10 RCA: `b2ac27f4a5a10a23322d68bf800c7ca46c33ff90c065d20e48bad6e66a3969a4`
- harness: `c095df71fb8dd216fe7e229301d093e73ddaeaa27e20a29f155293d76b1a3b1f`

Compact committed evidence: `reports/lfea-m047-stage2-load-continuation-evidence.json`.
