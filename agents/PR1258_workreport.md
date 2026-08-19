# PR1258 — LAFEA B01 translation-nullspace qualification recovery

HANDOVER_READINESS: IN_PROGRESS
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
MERGE_AUTHORITY: NOT_GRANTED

BASE_MAIN: f4b838284568827a1241fdd494a219e807cc60f1
SOURCE_RECOVERY_PR: #1250
STACKED_DEPENDENT_PR: #1254
QUALIFICATION_HEAD_INITIAL: 80986bcc42ebb6cb5e48a68e9b5ad88c9084d1f4
CURRENT_STAGE: EXACT_HEAD_QUALIFICATION

## Mission
Qualify a clean current-main B01 successor containing only the retained production corrections from #1250 plus a narrowly bounded B-bar planar-translation nullspace representation repair. Exclude temporary workflow files and every rejected diagnostic candidate.

## Governing RCA
For T6/L4/nu=0.4999/REGULAR, #1250's latest decomposition recorded:
- external reaction imbalance UX = -7.357309073086071e-8
- external reaction imbalance UY = -4.7548454062962264e-8
- summed free residual UX = 8.688617895272798e-10
- summed free residual UY = 6.175070082734687e-10
- stored full-K translation-nullspace defect UX = -7.270422894133344e-8
- stored full-K translation-nullspace defect UY = -4.693094705468879e-8
- reaction limit = 2.427520890326532e-8

The dominant observed error is therefore stored stiffness translation-nullspace preservation, not further Krylov convergence tuning.

## Retained production prerequisites
Copied byte-for-byte from documented production reference `af3a0473f8161eceddc2f4e54c0fd4ec811d4b62` using Git tree/blob custody:
- `src/core/local-continuum/jacobi-equilibrated-cg.js`
- `src/core/local-continuum/solver.js`
- `src/core/local-continuum/sparse-matrix.js`
- `src/workspace/lafea-analysis-mesh-quality.js`

This deliberately excludes all #1250 temporary `.github/workflows/*` files and post-reference rejected numerical candidates, including the non-qualifying double-double sparse residual path.

## New mechanism under qualification
`src/core/local-continuum/planar-translation-nullspace.js` reconstructs the dependent first-node 2x2 block and its couplings from the retained independent/deformational block H:

K = [ R^T H R   -R^T H ]
    [   -H R        H   ]

where R maps the dependent UX/UY values to the two rigid planar translations of the retained DOFs.

Properties:
- only UX/UY rigid translations are enforced;
- rotation is not projected;
- independent/deformational H is retained apart from roundoff-level symmetry averaging;
- constitutive coefficients, B-bar mean-dilatation, Gauss integration, thickness and loads are unchanged;
- correction magnitude and before/after translation residual are retained as evidence;
- fail-closed correction ceiling = 4096 * machine-epsilon * local-DOF-count relative to stiffness scale;
- any larger correction throws `LAFEA_BBAR_TRANSLATION_NULLSPACE_CORRECTION_EXCEEDS_ROUNDOFF_ENVELOPE`.

`bbar-plane-strain.js` applies this only to the already-integrated B-bar stiffness representation; physical formula IDs remain unchanged.

## Protected invariants
- no engineering acceptance tolerance widened;
- free-DOF residual tolerance unchanged;
- reaction-equilibrium tolerance unchanged;
- internal convergence target unchanged;
- iteration cap unchanged;
- constitutive/B-bar physical equations unchanged;
- pressure/load equations unchanged;
- mesh topology/generation unchanged;
- mesh-quality thresholds unchanged;
- benchmark expected values unchanged;
- release/trust-root authority unchanged;
- no `.github/workflows/*` mutation in PR1258.

## Exact-head qualification
Initial implementation head `80986bcc42ebb6cb5e48a68e9b5ad88c9084d1f4` triggered the existing permanent PR workflows:
- LAFEA B01 untouched baseline — run 32205355017
- LAFEA B01 metamorphic qualification — run 32205355097
- LAFEA B01 fail-closed qualification — run 32205355127
- LAFEA B01 final exact-head qualification — run 32205355150
- LAFEA visible workbench qualification — run 32205355114

Status at allocation: running/queued. No PASS is claimed until observed.

## Acceptance matrix
Before merge eligibility require:
1. focused Lamé L1-L4 including T6/L4/nu=0.4999/REGULAR;
2. integrated B01 exact-head qualification;
3. registered 54-case base matrix;
4. 270-case metamorphic matrix;
5. 16-case fail-closed matrix;
6. rigid-body / affine-patch / T6-Q8 controls;
7. relevant workbench/build collateral;
8. exact current-main ancestry and clean changed-file boundary.

## Current blocker
Qualification outcome not yet observed. If the new roundoff-only reconstruction trips its correction envelope, regresses a control, or leaves the governing reaction gate red, reject/adjust the mechanism rather than relaxing any engineering threshold.

## Exact next action
Inspect exact-head workflow results and first failing log. Repair only a demonstrated PR1258-owned mechanism defect; keep B02D #1254 frozen until B01 is qualified and later merged under separate owner authority.

## Appendix A — next-agent qualification
A1 (20): derive the dependent-block reconstruction and prove both translational null vectors are in its nullspace without assuming a benchmark result.
A2 (20): explain why the correction envelope is a floating-point representation guard rather than an engineering acceptance tolerance.
A3 (20): identify the exact production-reference blobs recovered from #1250 and prove temporary workflows/DD candidates were excluded.
A4 (20): if T6/L4 remains red, decompose free residual, reaction imbalance and stored-K translation action before proposing another mechanism.
A5 (20): prove no B02D, release, lifecycle or trust authority belongs in PR1258.

Takeover threshold: total >= 92/100 and every answer >= 17/20.
