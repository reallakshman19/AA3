# PR1259 — LAFEA B02D V2 clean qualification successor

HANDOVER_READINESS: READY_TO_CONTINUE
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
MERGE_AUTHORITY: NOT_GRANTED

BASE_PR: #1258
SOURCE_RECOVERY_PR: #1254
CLEAN_B02_HEAD_LAST_NORMALIZED: f1e9cf28cb1e41c80ff3f5a23d098355d20c62c1
CURRENT_STAGE: TARGETED_T6_L4_NUMERICAL_FALSIFICATION

## Handover in 60 seconds
PR #1259 is the clean B02D V2 promotion carrier. It contains the frozen V2 definition/generator/pre-observation qualification plus an opt-in V2 producer selector. It contains no temporary workflow file and does not replace V1.

Experimental #1254 is diagnostic-only and non-promotable. It is being used only because its pre-existing temporary workflows can execute candidate numerical mechanisms without modifying `.github/workflows/*` in this clean PR.

## Frozen V2 custody
Exact V2 assets recovered from #1254 head `643462195533dd777ced2a27af1b3cdb66020121`:
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

All T3/T6/Q8 x L1-L4 pre-observation meshes are deterministic/non-blocking. Historical worst T3/L2: scaled Jacobian 0.2048815995989261, minimum angle 11.822568091471519 deg, aspect ratio 4.877985269275712, blockers 0.

## Product selector boundary
V2 is opt-in only:
- profile prefix `B02D_PROBE_STABLE_POLAR_V2_QUALIFIED`;
- source revision `B02D-FROZEN-POLAR-V2`.

V1 constants/profile/source revision/generator remain present and default. V2 requires the exact 20/100 mm annulus and empty refinement-feature list.

## Quantitative T6/L4 RCA
Frozen V2 T6/L4 reaction decomposition:
- reaction imbalance UX = -1.4244704971133615e-8
- reaction imbalance UY = +3.1542157330477494e-8
- summed free residual UX = +1.3979550066168592e-8
- summed free residual UY = -3.1748267461873e-8
- assembled translation-nullspace defect UX = -2.651549049650234e-10
- assembled translation-nullspace defect UY = -2.0611013139550682e-10
- reaction limit = 2.4298895701754503e-8
- max individual free residual = 1.1859203361901945e-9

Thus the failure is not a V2 mesh-quality defect and not materially a stored-stiffness translation-nullspace defect. It is dominated by the global translational projection of individually acceptable free-DOF residuals.

Already falsified:
- compensated reaction summation;
- compensated CSR equilibrium action;
- full sparse defect correction.

## Translational Galerkin candidate
Diagnostic-only #1254 contains a pre-existing temporary experiment that forms free UX/UY translation modes Q, computes:

G = Q^T Kff Q
q = Q^T r_free
G alpha = q
u_new = u - Q alpha

Eligibility is narrow:
- ordinary sparse solve completed;
- individual free-DOF residual gate already passes;
- global UX/UY reaction equilibrium fails.

The mechanism changes no mesh, K, f, engineering threshold or frozen definition.

First full 12-case experiment run `32205999372` was cancelled at the 45-minute job limit while still inside production response. It is NOT qualification evidence.

To create a bounded falsifier without workflow mutation, diagnostic #1254 commit `04281721ef95a0d4d74df621a927ffc2256cf437` replaces only its diagnostic production-check entrypoint with one frozen `T6/L4` execution. The existing translational-coarse workflow run is `32208952677`. At this report checkpoint it has passed checkout, patch application, V2 binding and pre-observation quality and is executing the single T6/L4 production response. No PASS/FAIL is claimed yet.

## Dependency on B01
PR #1258 production candidate `a66bbb9358bab9d1d689946c93247ddf3cbbefe1` has observed focused Lamé PASS, 54-case base reconfirmation, 270-case metamorphic PASS and 16-case fail-closed PASS; integrated exact-head B01 run `32208643212` is still executing.

PR1259 must be re-normalized onto the final qualified B01 head after #1258 closes qualification. No B01 numerical mechanics belong in PR1259.

## Promotion gate
Do not promote a B02 correction until all are true:
1. single-case T6/L4 diagnostic proves the mechanism;
2. correction is isolated from unrelated temporary patches;
3. clean PR1259 contains a source-controlled qualification route without workflow mutation;
4. full T3/T6/Q8 response/convergence ladder passes frozen thresholds;
5. V1 preservation is proved;
6. B01 prerequisite is fully qualified;
7. release/lifecycle/trust authority remains false unless separately granted.

## Exact next action
Inspect targeted run `32208952677`. If it fails, classify the first numerical invariant and reject/adjust only the demonstrated mechanism. If it passes, transfer only the minimal 2x2 translational coarse correction and evidence contract into clean PR1259, then run clean source/unit checks before seeking full exact response qualification.

## Appendix A
A1 (20): prove V2 was frozen before response observation and explain why the mesh cannot be tuned from T6/L4 response.
A2 (20): derive reaction total = global translation action - sum(free residual) and reconcile it with the measured numbers above.
A3 (20): derive the 2x2 Galerkin correction and state its exact trigger envelope.
A4 (20): explain why #1254 is diagnostic evidence only and #1259 is the promotion carrier.
A5 (20): define the final B02 qualification/promotion gate without changing thresholds or release authority.

Takeover threshold: total >= 92/100 and every answer >= 17/20.
