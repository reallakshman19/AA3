# WIP — LAFEA B01 near-incompressible nullspace qualification recovery

HANDOVER_READINESS: IN_PROGRESS
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
BASE_MAIN: f4b838284568827a1241fdd494a219e807cc60f1
SOURCE_RECOVERY_PR: #1250
STACKED_DEPENDENT_PR: #1254
MERGE_AUTHORITY: NOT_GRANTED_FOR_THIS_NEW_PR

## Mission
Create a clean current-main B01 successor carrying only the retained production corrections from PR #1250 plus a narrowly qualified element-stiffness translation-nullspace preservation mechanism. Do not import rejected experimental workflow files or numerical candidates.

## Governing observed defect
For T6/L4/nu=0.4999/REGULAR, the latest #1250 evidence decomposed reaction imbalance into approximately:
- UX external imbalance: -7.357309073086071e-8
- UY external imbalance: -4.7548454062962264e-8
- UX summed free residual: 8.688617895272798e-10
- UY summed free residual: 6.175070082734687e-10
- UX stored full-K translation-nullspace defect: -7.270422894133344e-8
- UY stored full-K translation-nullspace defect: -4.693094705468879e-8
- reaction limit: 2.427520890326532e-8

The dominant defect is therefore stored stiffness translation-nullspace preservation, not further CG convergence tuning.

## Protected invariants
- constitutive/B-bar equations unchanged;
- physical stiffness integral unchanged;
- pressure and load equations unchanged;
- free-DOF acceptance tolerance unchanged;
- internal residual target unchanged;
- iteration cap unchanged;
- mesh geometry and quality thresholds unchanged;
- benchmark expected values unchanged;
- release/trust-root authority unchanged;
- no `.github/workflows/*` mutation in this recovery.

## Recovery plan
1. Copy only retained production corrections from #1250 onto this current-main branch.
2. Add a deterministic B-bar local-stiffness representation step that enforces the two exact rigid translations by symmetric block reconstruction from the retained deformational block; do not project rotation or alter constitutive integration.
3. Run existing exact-head B01 qualification through GitHub Actions without adding workflows.
4. If governing case closes, require full 54/270/16 matrices, Lamé convergence, rigid/affine controls, workbench/build collateral before merge eligibility.
5. Keep #1254 frozen until B01 is qualified and merged.

## Current state
- branch: agent/lafea-b01-nullspace-qualification-20260819
- current stage: RECOVER_RETAINED_PRODUCTION_CORRECTIONS
- exact next action: materialize the retained #1250 production file versions and add the translation-nullspace reconstruction with explicit evidence/guards.
