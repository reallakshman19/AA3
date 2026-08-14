# M047 Stage 2 — R11 mapped-slip state-transfer discriminator and real L13 accuracy gate

**Decision:** `R11_MAPPED_SLIP_TRANSFER_REJECTED_NO_CONVERGENCE_OR_ACCURACY_GAIN`

R10 isolated the L7 continuation blocker to a slow 20550 re-breakaway tail. R11 then tested the only state-transfer discrepancy actually measured by R10: committing the already-computed converged mapped slip vector before entering the next physical load increment. The result is negative. It neither fixes the N5/N10 L7 continuation failure nor changes the L13 frozen accuracy pass count relative to the same continuation path.

## Custody and one-mechanic scope

- Frozen base: `101b3973fb24bba71d2f82f6e9e2c58a0fe6b538`.
- Pinned `BM4_L.ACCDB`: `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`, 5,136,384 bytes.
- Frozen production friction solver Git blob locally re-established before all runs: `5b3ba1ce89f6ff7509bf8be82361993a32497ad2`, profile `CAESAR-ACCDB-FRICTION-SOLVER-R2`.
- R10 showed that at the converged first L7 physical increment, 20550 itself has identical carried/mapped state (`STICK`) and identical carried/mapped slip (`delta = 0 m`). A broad reset/re-anchor mechanic is therefore not evidence-supported.
- The only measured transfer discrepancy is the small **global** return-map residual vector still allowed by the frozen convergence gate: `7.264095788337138e-11 m` for N5 and `6.415328079038754e-11 m` for N10, equivalent to roughly `0.0127 N` and `0.0112 N` at governed `k_f`.
- R11 changes only the nonfinal physical-step boundary: transfer the already-computed mapped slip vector rather than the pre-map slip vector. Because active-set stability is already a convergence gate, state labels are unchanged.

Unchanged: D1 direction, `mu`, friction stiffness, current-own-restraint normal capacity, return mapping inside an iteration, state boundary/hysteresis, secant acceleration law, physical load factors, 400-iteration-per-step forensic boundary, convergence limits, frozen ±10% comparison goal, and qualified linear mechanics.

## L7 continuation discriminator — negative result

| path | R10 | R11 | result |
|---|---:|---:|---|
| N5 | fails step 2/5 at factor 0.4; 695 total iterations | fails step 2/5 at factor 0.4; 695 total iterations | unchanged |
| N10 | fails step 2/10 at factor 0.2; 603 total iterations | fails step 2/10 at factor 0.2; 603 total iterations | unchanged |

Both R11 runs terminate with the same five gates as R10: `DISPLACEMENT_UPDATE_NORM`, `REACTION_UPDATE_NORM`, `COULOMB_CAP_COMPLEMENTARITY`, `SLIDE_CAPACITY_RESIDUAL`, and `SLIP_UPDATE_NORM`, concentrated at restraint `20550:REST_PTR10:TYPE3:UY`.

R11 experiment source SHA-256:

- N5: `a78024d63cc0b244acbb5a1f141e2d0a5fa877528cb39870e8a5db3cb1f69322`
- N10: `5a965bdd5bc47ed09a269114661eda5fb6b928f689c59c0615ac6151ce59b1b2`

Fresh local R11 JSON SHA-256:

- N5: `39420bb38ad6d31e35181c6afad3210338fdda55b09cc794c6904238a5c0bf11`
- N10: `4e6535fb7df836a48820d78f1f1dbcbf2e8c30173bcff70e4aa071533361d1e9`

For N5, R11 minus R10 at the terminal 20550 iteration is only `+1.7224e-11 N` in slide residual, `+5.6619e-8 N` in capacity, `+5.6636e-8 N` in applied magnitude, zero change in slip-update magnitude, and `+2.91e-11 N` in reaction-update norm. For N10 the corresponding slide-residual change is `+6.6592e-11 N`; slip-update difference is only `4.34e-19 m`. These are numerical roundoff-scale differences, not a changed convergence trajectory.

**R11 therefore falsifies the mapped-slip transfer discrepancy as the cause of the L7 continuation failure.** R10's conclusion stands: after immediate re-breakaway, 20550 follows an intrinsic slow geometric return-map tail under this 400-iteration forensic boundary.

## Real L13 accuracy gate — N5 pair

The N5 comparison uses the same proportional `W+P1` load path for R10 and R11. Thus this pair differs only in the mapped-slip transfer rule.

| metric | production R2 single-step | R10 N5 continuation | R11 N5 continuation |
|---|---:|---:|---:|
| normals within ±10% | 23/23 | 23/23 | 23/23 |
| tangential vectors within ±10% | 13/23 | **14/23** | **14/23** |
| worst normal error | ~1.794642% | 1.5082453697% | 1.5082453501% |
| worst tangential vector relative error | 7.219148664 | 6.660452861 | 6.660408559 |

R10 N5: elapsed 262,059 ms; profile `CAESAR-ACCDB-FRICTION-SOLVER-R2-R10-L13-CONTINUATION-N5`; iteration semantic hash `fnv1a64:b4083fd648967796`.

R11 N5: elapsed 229,637 ms; profile `CAESAR-ACCDB-FRICTION-SOLVER-R2-R11-L13-CONTINUATION-N5`; iteration semantic hash `fnv1a64:e681ee9a8d5eff1e`.

R11 changes the N5 worst tangential relative error by only `-4.4302e-5` and changes neither the normal nor tangential pass count. The apparent one-restraint improvement from production 13/23 to N5 continuation 14/23 belongs to the already-known **physical load-path** difference, not to R11 state transfer.

## Predeclared N10 sensitivity — no cherry-picking

N10 was run independently for both transfer rules rather than choosing the N5 step count because it happened to score better.

| metric | R10 N10 continuation | R11 N10 continuation |
|---|---:|---:|
| normals within ±10% | 23/23 | 23/23 |
| tangential vectors within ±10% | 13/23 | 13/23 |
| worst normal error | 1.5066237414% | 1.5066237457% |
| worst tangential vector relative error | 2.2927839805 | 2.2927839827 |

R10 N10: elapsed 690,332 ms; iteration semantic hash `fnv1a64:5fde87c10b5557b7`; persisted local JSON SHA-256 `b1165549124fb9ef910ae1819dec0bfa5787e5a8d32a7328bedf764f6e97f216`.

R11 N10: elapsed 678,414 ms; iteration semantic hash `fnv1a64:264f3eeca3a3f96b`; persisted local JSON SHA-256 `8d23dd5dfa5536adca3bae9713b1927ea0b8997096c631be271b2931e625e00e`.

The N10 within-goal restraint set is identical for R10 and R11: `21740, 20170, 20090, 21860, 21800, 20580, 20520, 21470, 20350, 20250, 20550, 22120, 22020`. R11 changes the N10 worst vector relative error by only `+2.14e-9`.

Crucially, N5 and N10 themselves are **not accuracy-stable**: N5 gives 14/23 tangential vectors within goal while N10 gives 13/23. Therefore no fixed continuation step count is governed by this evidence. The N5 count increase may not be selected or promoted.

## Engineering decision

- `R11_STATE_TRANSFER_NOMINATED`: **false**.
- `R11_L13_ACCURACY_NOMINATED`: **false**.
- `PHYSICAL_CONTINUATION_STEP_COUNT_GOVERNED`: **false**; N5/N10 differ in pass count.
- `productionPromotionAuthorized`: **false**.
- Do not run an R11 L7/L15 qualification sequence.
- Do not reset/re-anchor 20550 history: R10 directly showed its converged boundary state/slip is already internally consistent.
- No tolerance, coefficient, stiffness, comparison criterion, production source, R8/NFV15 mechanic, R9/FAV15 mechanic, or L1 hydrotest mechanic is changed or combined here.
- BM4_NL remains blocked.

The remaining evidence points away from physical-step state transfer as the missing CAESAR parity mechanism. Further work should return to an evidence-backed unresolved mechanism rather than adding another continuation/state-history knob.
