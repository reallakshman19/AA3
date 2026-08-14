# M047 Stage 2 — accepted D1 generalization on L7 and L1

## Question

Does the accepted L13 D1 experimental baseline generalize to the other governed primitive friction cases, and does the roadmap-declared proportional physical load path make L7 admissible without changing any solver tolerance or comparison rule?

Measurement boundary: real pinned `BM4_L.ACCDB`, SHA-256 `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`.

Production friction solver SHA-256 stayed `9976cda40cdfd3214ce125d71a3ce5c5f30b33b7f5a9835231705d49b68dfbfa`; production solver modified: **false**.

Accepted D1 mechanics stay frozen: total-relative-tangential-displacement sliding direction, own-restraint normal, `k_f`, resultant Coulomb cap, return-mapped slip offset, state boundaries/hysteresis, secant acceleration, convergence gates, 400-iteration limit, and ±10% comparison goal.

## L7 single-step D1

L7 (`W+T1+P1`) **converged** with accepted D1.

| metric | L13 D1 baseline | L7 D1 |
|---|---:|---:|
| tangential vectors within ±10% | 13/23 | **10/23** |
| normals within ±10% | 23/23 | **22/23** |
| mean vector error | 60.42% | **27.08%** |
| worst vector error | 721.91% | **110.33%** |
| worst normal error | 1.79% | **24.90%** |

The sole L7 normal failure is restraint **20350**, `-24.90%` relative to the CAESAR normal. The largest vector failures are 20580 `110.33%`, 22020 `109.06%`, 22070 `91.39%`, and 21740 `51.03%`.

So D1 does generalize as a convergent OPE formulation, but **L7 is not qualified**: 13/23 vector rows remain outside ±10%, and one normal row is outside ±10%.

Full local L7 single-step artifact SHA-256: `8165e71e3d86de9df01f47fde9e59dff7b3e9b47cb12cb245e5b5ee92a4e7109`.

## L7 physical load continuation

Local source-guarded continuation harness SHA-256: `59f7c845429a431224cde7fb77bf87736bdcec4a12f10da58d1e7c220da40621`. The compact evidence also pins the generated ephemeral solver SHA for N=5 and N=10.

The only added mechanic is proportional physical continuation from the all-stick zero-load state to full L7. At factor `f`:

- gravity is scaled by `f`;
- `PRESSURE1` is scaled by `f`;
- `TEMP_EXP_C1` moves linearly from the 21 °C installation state to the full T1 value;
- converged friction state/slip history is carried to the next physical load level.

Every load step keeps the same D1 mechanics and the same 400-iteration convergence limit.

### N=1 reproduction gate — PASS

N=1 reproduces the single-step L7 result **exactly**:

- all 23 restraint comparison records exactly equal;
- complete summary exactly equal;
- maximum numeric difference: `0`.

This validates that the continuation harness does not change the full-load problem when no intermediate path is introduced.

Full local N=1 artifact SHA-256: `54cc1a3ed8d02edd6e2d781c94681af0886979579bde581f876ba9aeb3397b0e`.

### N=5 — NONCONVERGED

N=5 fails at load step **2/5**, factor **0.4**, after the unchanged 400-iteration budget for that step.

Final open gates:

- displacement update: `1.4745e-10 m > 1e-10`;
- reaction update: `0.023675 N > 0.01 N`;
- Coulomb-cap complementarity at restraint 20550;
- slide-capacity residual at 20550: `0.023675 N`;
- slip update at 20550: `1.3519e-10 m > 1e-10`.

Full local N=5 artifact SHA-256: `66bf49ef2c318c7237420e9b7c50b2268fcfbfd53101fc45567c060c0ebbe8dd`.

### N=10 — NONCONVERGED earlier

N=10 fails at load step **2/10**, factor **0.2**, again after the unchanged 400-iteration budget for that step.

Final open gates are the same family and again concentrate on 20550:

- displacement update: `3.9778e-10 m > 1e-10`;
- reaction update: `0.069662 N > 0.01 N`;
- Coulomb-cap complementarity at 20550;
- slide-capacity residual at 20550: `0.069662 N`;
- slip update at 20550: `3.9778e-10 m > 1e-10`.

Full local N=10 artifact SHA-256: `9d725fbbf1b7fdc22c2dc925ef78d2ca5374d43fbff41e3cc36e771dd44bce31`.

**Decision on L7 continuation:** N=5 and N=10 are both inadmissible under the frozen convergence contract. Finer stepping does not rescue the path; N=10 reaches nonconvergence earlier, at factor 0.2. Do not increase the iteration budget or choose a step count by benchmark accuracy.

## L1 single-step D1

L1 (`WW+HP`) exercises the resolved hydrotest authority with accepted D1. It **does not converge within 400 iterations**.

At iteration 400 all gates except one have closed. The remaining gate is:

- displacement update `1.193251838e-10 m > 1e-10 m`.

The reaction-update tail is already below its `0.01 N` limit (`0.007592 N` final), but qualification is conjunctive: one failed gate means nonconvergence. The iteration limit and tolerance are therefore not widened.

Full local L1 artifact SHA-256: `2f32f269444a0b9ec6fe2e440f8a29965a93ed52c4c0814d5137fc9144893e51`.

## Engineering decision

1. **D1 remains an experimental baseline, not production authority.**
2. L7 single-step converges but is not accurate enough: **10/23 vectors and 22/23 normals** within ±10%.
3. L7 N=1 proves the continuation harness; N=5 and N=10 both fail the unchanged convergence contract, so no fixed physical step count is promoted.
4. L1 fails the unchanged 400-iteration convergence gate and therefore cannot be accuracy-qualified yet.
5. The Stage 2 entry condition requiring real-file convergence for **L13, L7, and L1** remains unmet because L1 does not converge; the vector-accuracy entry condition is also unmet for L13 and L7.
6. Do not widen tolerances, extend the iteration limit, select a step count by benchmark accuracy, or add node exceptions.
7. No production friction solver is promoted by this batch.

Compact evidence: `reports/lfea-m047-stage2-d1-generalization-l7-l1-evidence.json`. It preserves all 23 L7 single-step restraint comparisons, exact N=1 reproduction evidence, the governed N=5/N=10 failure ledgers, the L1 failure ledger, and SHA-256 identities of the full local artifacts.
