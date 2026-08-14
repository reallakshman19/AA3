# M047 Stage 2 — R10 L7 state-history forensic

**Decision:** R10 isolates the continuation failure to a slow 20550 re-breakaway tail; it does **not** support resetting/re-anchoring 20550 history. The only measured state-transfer discrepancy eligible for R11 is the small **global converged return-map slip residual** that the prior continuation driver did not commit before the next physical load increment.

## Custody and execution boundary

- Frozen base commit: `101b3973fb24bba71d2f82f6e9e2c58a0fe6b538`.
- Pinned `BM4_L.ACCDB`: `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`, 5,136,384 bytes.
- Frozen production friction solver Git blob reconstructed locally and verified before the run: `5b3ba1ce89f6ff7509bf8be82361993a32497ad2` (`CAESAR-ACCDB-FRICTION-SOLVER-R2`).
- R10 changes **no friction mechanic**. It instruments the existing R2/D1 iteration and reproduces the previously measured proportional L7 continuation boundary with 400 iterations per physical increment for forensic comparability.
- Proportional L7 scaling is `W`, `T1`, and `P1` together from zero to the target factor. Friction states/slips are carried between converged physical increments; the secant accelerator and previous-equilibrium update history are restarted per physical increment, as in the earlier continuation diagnostic.
- No tolerance, cap, coefficient, friction stiffness, state boundary, D1 direction rule, comparison rule, or qualified linear mechanic changes.

## Fresh real-ACCDB outcomes

| path | result | total iterations | terminal physical state |
|---|---|---:|---|
| R2 single-step L7 | **CONVERGED** | 161 | full factor 1.0 |
| N=5 continuation | **NOT CONVERGED** | 695 | step 2/5, factor 0.4, after 400 iterations at that step |
| N=10 continuation | **NOT CONVERGED** | 603 | step 2/10, factor 0.2, after 400 iterations at that step |

Fresh local artifact SHA-256:

- single: `94953332629c0d9e89e843e82a8c82c1fac12abd97fb041da0887bb3c0de1d2f`
- N5: `8b58d6e7654304b938b85ce8b8d7527e8b12d7ce0e928f243ea726d2d984e7c8`
- N10: `598e399601aa7bb2f9fc6323dbc0af31f43f5859a2b5392ede01f5c5e1a971cc`

The N5/N10 terminal failures reproduce the previously committed finding exactly: the remaining failed constitutive/update gates are concentrated at restraint `20550:REST_PTR10:TYPE3:UY`.

## 20550 state path

### Single-step L7

20550 breaks away on iteration 1 (`STICK -> SLIDE`) and remains sliding through convergence. At iteration 161:

- state/regime: `SLIDE / SLIDING`
- total tangential displacement: `-0.002855058537885672 m`
- accumulated slip: `-0.002850353357717137 m`
- elastic stretch: `-4.7051801685348525e-6 m`
- applied/trial friction magnitude: about `824.004114 N`
- current normal: `2746.6701405767594 N`
- Coulomb capacity: `824.0010749158874 N`
- slide residual: `0.0030387003 N`
- reaction update: `0.009751912 N`
- displacement update: `5.56848e-11 m`
- all convergence gates: PASS.

### N5 continuation

At factor 0.2, 20550 follows:

`STICK -> SLIDE` (iteration 1), `SLIDE -> STICK` (iteration 13), then converges at physical-step iteration 295 as a re-locked support with accumulated slip.

At the step boundary:

- carried state = mapped state = `STICK`
- carried 20550 slip = mapped 20550 slip exactly; **20550 transfer delta = 0 m**
- global return-map slip residual norm left uncommitted by the historical boundary = `7.264095788337138e-11 m`, equivalent at governed `k_f` to about `0.0127214 N`.

At factor 0.4, 20550 immediately re-breaks on step iteration 1 and stays `SLIDE` for all 400 iterations. Terminal values:

- applied friction = `329.01625516745844 N`
- capacity = `328.9925799618907 N`
- slide residual = `0.023675205567712965 N`
- reaction update = `0.02367531936033629 N`
- 20550 slip update = `1.3518877618919067e-10 m`
- displacement update = `1.4745001053473317e-10 m`
- global slip residual = `1.4552042778244144e-10 m`
- failed gates: `DISPLACEMENT_UPDATE_NORM`, `REACTION_UPDATE_NORM`, `COULOMB_CAP_COMPLEMENTARITY`, `SLIDE_CAPACITY_RESIDUAL`, `SLIP_UPDATE_NORM`.

The final 20 slide-residual updates have mean contraction ratio `0.9969653043` per iteration: a slow geometric tail, not active-set chatter.

### N10 continuation

At factor 0.1, 20550 follows the same pattern: `STICK -> SLIDE` at iteration 1, `SLIDE -> STICK` at iteration 13, then converges at step iteration 203.

At the step boundary:

- carried state = mapped state = `STICK`
- carried 20550 slip = mapped 20550 slip exactly; **20550 transfer delta = 0 m**
- global return-map slip residual norm left uncommitted = `6.415328079038754e-11 m`, equivalent to about `0.0112350 N`.

At factor 0.2, 20550 immediately re-breaks and remains `SLIDE`. Terminal iteration 400:

- applied friction = `166.20790867845062 N`
- capacity = `166.1382465803919 N`
- slide residual = `0.06966209805872836 N`
- reaction update = `0.06966243473289069 N`
- 20550 slip update = `3.9778044410871544e-10 m`
- displacement update = `3.977823666160077e-10 m`
- global slip residual = `3.977873947280607e-10 m`
- same five terminal failed gates as N5.

The final 20 slide-residual updates contract at mean ratio `0.9969655414` per iteration, essentially the same asymptote as N5.

## R10 inference and R11 selection

The data reject a broad “wrong 20550 state was carried” explanation:

1. 20550's state label is already stable and identical on both sides of each converged step boundary (`STICK -> STICK`).
2. 20550's stored slip is also already identical before/after the converged return map at those boundaries (`delta = 0 m`).
3. Its failure begins only after the next increment forces an immediate legitimate re-breakaway, then decays geometrically with no further 20550 state changes.

Therefore R11 must **not** reset, erase, re-anchor, or otherwise invent 20550 slip history. The only directly measured transfer discrepancy is smaller and global: the converged return-map candidate slip vector differs from the pre-map carried vector by a norm of roughly `6.4e-11–7.3e-11 m`, even though the active-set labels are stable. That is of order `0.011–0.013 N` at the governed friction stiffness and is therefore a narrowly testable numerical state-transfer detail.

**R11 selected one-mechanic discriminator:** at a converged nonfinal physical load increment, commit the already-computed mapped slip vector before entering the next increment. Because active-set stability is a convergence gate, the state labels are unchanged; R11 changes only which converged slip iterate is transferred. It does not alter D1, the Coulomb cap, normal basis, friction stiffness, state law, acceleration law, tolerances, or physical-load factors.

R10 itself makes no accuracy nomination and authorizes no production change.
