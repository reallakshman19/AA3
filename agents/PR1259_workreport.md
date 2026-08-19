# PR1259 — LAFEA B02D V2 clean qualification successor

HANDOVER_READINESS: READY_TO_CONTINUE
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
MERGE_AUTHORITY: NOT_GRANTED

BASE_PR: #1258
SOURCE_RECOVERY_PR: #1254
CURRENT_STAGE: TARGETED_T6_L4_REACTION_REPAIR

## Handover in 60 seconds
PR #1259 is the clean B02D V2 promotion carrier. It contains the frozen V2 definition/generator/pre-observation qualification plus an opt-in V2 producer selector. It contains no temporary workflow file and does not replace V1.

Experimental PR #1254 is diagnostic-only and non-promotable. Its pre-existing temporary workflows are used only to falsify numerical hypotheses without adding workflow files to #1259.

## Frozen V2 custody
Exact V2 assets recovered from #1254:
- generator blob `3f69405b41145b1fda103d426d2ac25bda1f22ae`;
- pre-observation check blob `ba5e793cb92bd5b3f3fe1a269bb537973598998f`;
- definition blob `2a4bbfa79dafdbfe17484b46d5ae76ede42ad298`.

Definition properties:
- frozen before production response observation;
- production output not used to choose the definition;
- Ri=20 mm, Ro=100 mm, thickness=10 mm;
- h ladder 40/20/10/5 mm, ratio=2;
- T3 control; T6/Q8 required;
- unchanged mesh-quality and response thresholds;
- no refinement features;
- release authority false.

All T3/T6/Q8 x L1-L4 pre-observation meshes are deterministic/non-blocking. Historical worst T3/L2: scaled Jacobian `0.2048815995989261`, minimum angle `11.822568091471519 deg`, aspect ratio `4.877985269275712`, blockers `0`.

## Product selector boundary
V2 is opt-in only:
- profile prefix `B02D_PROBE_STABLE_POLAR_V2_QUALIFIED`;
- source revision `B02D-FROZEN-POLAR-V2`.

V1 constants/profile/source revision/generator remain present and default.

## Quantitative T6/L4 RCA
Frozen V2 T6/L4 reaction decomposition from the earlier broad-solver diagnostic:
- reaction imbalance UX = `-1.4244704971133615e-8`
- reaction imbalance UY = `+3.1542157330477494e-8`
- summed free residual UX = `+1.3979550066168592e-8`
- summed free residual UY = `-3.1748267461873e-8`
- assembled translation-nullspace defect UX = `-2.651549049650234e-10`
- assembled translation-nullspace defect UY = `-2.0611013139550682e-10`
- reaction limit = `2.4298895701754503e-8`
- max individual free residual = `1.1859203361901945e-9`

Therefore the remaining response failure is not a V2 mesh-quality defect and not materially a stored-stiffness translation-nullspace defect. It is dominated by the aggregate translational projection of individually accepted free-DOF residuals.

## B01/B02 solver-boundary separation — now proven
B01 PR #1258 originally dispatched every CSR continuum problem through the special equilibrated B01 solver. That boundary was too broad. #1258 now scopes that solver only to `PLANE_STRAIN_BBAR`; ordinary plane stress/plane strain retain current-main `DETERMINISTIC_JACOBI_PCG_RELIABLE_RESIDUAL_V2`.

Diagnostic #1254 head `ed19666c901d047941e2a902f1f693da967d3667` replayed the same frozen V2 `T6/L4` plane-stress case with the narrowed/current-main dispatch. Production-response run `32213768930` showed:
- exact PR head and V2 pre-observation quality: PASS;
- T6/L4 solve runtime: approximately 141 s from response start to failure, rather than exceeding the prior 45-minute job budget;
- numerical disposition: still `REACTION_EQUILIBRIUM_FAILURE`.

Conclusion:
1. the earlier >45-minute runtime was B01 broad-dispatch collateral;
2. the reaction-equilibrium blocker is genuinely B02-owned and remains after restoring mainline plane-stress PCG.

## Already falsified / non-solutions
On the same frozen response family, evidence has ruled out or failed to support:
- compensated reaction summation as the governing repair;
- compensated CSR equilibrium action as the governing repair;
- generic full sparse defect correction as a promotion mechanism;
- mesh-quality threshold changes;
- V2 geometry retuning.

No threshold or V2 definition change is authorized.

## Translational Galerkin candidate
The diagnostic-only candidate forms free UX/UY translation modes Q and solves:

`G = Q^T Kff Q`

`q = Q^T r_free`

`G alpha = q`

`u_new = u - Q alpha`

Eligibility remains narrow:
- ordinary sparse solve completed;
- individual free-DOF residual gate already passes;
- global UX/UY reaction equilibrium fails.

The mechanism changes no mesh, K, f, engineering threshold or frozen definition.

### Current evidence disposition
The earlier full-matrix coarse experiment was cancelled at the 45-minute limit under the over-broad B01 solver and is not qualification evidence.

After restoring mainline plane-stress PCG, targeted coarse run `32213768845` completed quickly but failed **before evaluating the correction mathematics** because the temporary diagnostic patch called `sparseMatrixVectorCompensatedRaw` without importing it in the restored mainline `solver.js`.

Exact diagnostic failure:
`UNEXPECTED_NUMERICAL_FAILURE: sparseMatrixVectorCompensatedRaw is not defined`

Therefore the 2x2 Galerkin mechanism is presently **NOT_RUN mathematically**, not FAIL. The diagnostic harness must first be repaired without changing a workflow file.

## Dependency on B01
PR #1258 is still under exact numerical qualification. Its special sparse route is now correctly limited to `PLANE_STRAIN_BBAR`, which removes B01 special-solver authority from B02 plane stress.

PR1259 must be re-normalized onto the final qualified B01 head after #1258 stabilizes. No B01 numerical mechanics belong in PR1259.

## Promotion gate
Do not promote a B02 correction until all are true:
1. single-case frozen T6/L4 diagnostic executes the mechanism without harness error;
2. the correction itself passes the frozen reaction/free-residual gates;
3. the correction is isolated from unrelated temporary patches;
4. clean PR1259 contains the minimal source/evidence change, with no workflow mutation;
5. full T3/T6/Q8 response/convergence ladder passes frozen thresholds;
6. V1 preservation is proved;
7. B01 prerequisite is fully qualified;
8. release/lifecycle/trust authority remains false unless separately granted.

## Exact next action
Repair only the diagnostic #1254 import required to execute the 2x2 translational coarse correction, then replay the single frozen T6/L4 case under mainline PCG. If it passes, transfer only the minimal correction/evidence contract into clean #1259. If it fails numerically, use the exact post-correction reaction/free-residual values to reject or refine the mechanism without changing thresholds.

## Appendix A
A1 (20): prove V2 was frozen before response observation and explain why the mesh cannot be tuned from T6/L4 response.
A2 (20): derive reaction total = global translation action - sum(free residual) and reconcile it with the measured numbers above.
A3 (20): derive the 2x2 Galerkin correction and state its exact trigger envelope.
A4 (20): explain why the #1254 NameError is harness NOT_RUN, not a numerical FAIL.
A5 (20): define the final B02 qualification/promotion gate without changing thresholds or release authority.

Takeover threshold: total >= 92/100 and every answer >= 17/20.
