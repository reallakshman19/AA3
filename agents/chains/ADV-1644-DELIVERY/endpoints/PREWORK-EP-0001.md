CHAIN_STATE_VERSION: 3
HANDOVER_PROTOCOL_VERSION: 2
CHAIN_ID: ADV-1644-DELIVERY
ENDPOINT_ID: PREWORK-EP-0001
PREDECESSOR_ENDPOINT: NONE
AGENT_INSTANCE_ID: chatgpt:fee73f54-0c6d-4cb2-8a4e-5bc05a121cf2
WORK_ITEM_SOURCE: GITHUB_ISSUE
WORK_ITEM_KEY: github:reallaksh19/Advanced_Analysis#1644
WORK_ITEM_MODE: EXCLUSIVE
CUSTODY_EPOCH: 1

COMMON_PROTOCOL: engineering-pr-delivery-v2
COMMON_PROTOCOL_BASIS: d709bcd61ab8ab4c9545b17923f56d505ac42c20
COMMON_PROTOCOL_STATUS: CURRENT

ISSUE_BASIS_ID: IB-1644-0001
ISSUE_BASIS_FILE: agents/chains/ADV-1644-DELIVERY/issue-basis/IB-1644-0001.md
ISSUE_CURRENT_STATE_FILE: agents/chains/ADV-1644-DELIVERY/issue-state/CURRENT.md
ISSUE_CHAIN_ROOT_COMMENT_ID: 5548816556
ISSUE_ACTIVE_HANDOVER_COMMENT_ID: 5548817255
ISSUE_ENDPOINT_COMMENT_ID: 5548817970
PREVIOUS_ISSUE_ENDPOINT_COMMENT_ID: NONE
ISSUE_HANDOVER_SYNC_STATUS: IN_SYNC

BRANCH: fix/1644-qualification-profile-auto-bind
MATERIAL_LEG_BASE: eabb93cd44c59ce182d73284cb707653917e07c8
MAIN_OBSERVED: eabb93cd44c59ce182d73284cb707653917e07c8
PR: NOT_OPEN_YET
MERGEABILITY: UNKNOWN
REVIEWS: NOT_APPLICABLE
UNRESOLVED_REVIEW_THREADS: NOT_APPLICABLE
REQUIRED_CHECKS: NOT_RUN
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE

ENGINEERING_STATE: IN_PROGRESS
CUSTODY_STATE: HELD
QUALIFICATION_STATE: PASS
WRITE_AUTHORITY: WRITE_ALLOWED
AUTO_STATE: PAUSED
POST_BASIS_DRIFT: MATERIAL_BOUNDARY_CHANGED
QUALIFICATION_COVERAGE: RETAINED_BY_EXPLICIT_OWNER_REQUALIFICATION_FOR_CURRENT_REPAIR_BOUNDARY
CURRENT_STATE_AUTHORITY: CLEAR_FOR_BOUNDED_REPAIR

ROADMAPS: doc/prelight_roamap.md@9267e6475ded4592d6755ade301c08ced7964fa0
ROADMAP_REVIEW_STATUS: COMPLETE
ROADMAP_ALIGNMENT: ALIGNED
ROADMAP_MUTATION_AUTHORITY: NONE

OWNER_QUALIFICATION_BASELINE_DISCOVERY: COMPLETE
OWNER_QUALIFICATION_BASELINE_SOURCE: github:reallaksh19/Advanced_Analysis#1644/Appendix-Expert-Qualification-Questionnaire
OWNER_QUALIFICATION_BASELINE_MANIFEST: agents/chains/ADV-1644-DELIVERY/qualification-baselines/QB-ISSUE-1644-A.json
OWNER_QUALIFICATION_BASELINE_STATUS: SATISFIED

QUALIFICATION_PROTOCOL_VERSION: 3
QUALIFICATION_PROFILE: FEA
QUALIFICATION_PROFILE_VERSION: 2
QUALIFICATION_SCOPE_ID: QSCOPE-1644-LAFEA4-ORACLE-LOADCALC-UX
QUESTION_SET_ID: QS-ISSUE-1644-0001
QUESTION_SET_STATUS: CURRENT_BY_OWNER_REQUALIFICATION_FOR_REPAIR_BOUNDARY
QUESTION_PACK_ACTION: REUSED
QUESTION_DISPLAY: HIDE
PREWORK_QUALIFICATION_READY: TRUE
TAKEOVER_QUALIFICATION_READY: TRUE
CHAIN_HANDOVER_READY: TRUE
HANDOVER_CONTENT_READY: TRUE
HANDOVER_VALIDATION_STATUS: PASS
HANDOVER_VALIDATION_EVIDENCE: repository/Issue custody + explicit Owner qualification disposition; executable material checks remain NOT_RUN until mutation
HANDOVER_READY: TRUE

## Current bounded contribution

Repair only `src/workspace/master-data-ui.js:autoEnsureDefaultQualificationProfile()` so it never binds an unlocked or non-`QUALIFIED` existing profile as a permissive default. Add a focused negative regression. Do not alter LAFEA mechanics, EMP.1/WRC537 authority, the 1179648-byte bundle ceiling, tolerances, or workflow YAML. No merge.

## Active qualification questions — Owner baseline preserved

### Q1 — Production Trace
Repository anchors: `scripts/lafea.4-mitc-adoption-shared-qualification-check.mjs`; `src/core/local-shell/mitc-adoption-recovery.js`; `legacy.meshEvidence.elements[].localFrame`.
Concrete payload: two-triangle patch `A(0,0) B(100,0) C(100,50) D(0,50)`, `E1=[A,B,C]`, `E2=[A,C,D]`; E2 local `ex` along `A→C`; prescribed global `epsilonX=0.0004`, `epsilonY=-0.0001`, `gammaXY=0.00015`, `E=200000 MPa`, `nu=0.3`; MITC `Q1` over the full rectangle.
Required derivation: trace global DOFs through `nodalBasisTransformation.matrix` before B-matrix recovery and show `combinedStress` is already element-local. Explain why an unrotated global oracle can appear valid for an axis-aligned element only.
Authority boundary: production recovery owns local-frame result meaning; the benchmark owns the independent oracle.
Fail if: `combinedStress` is treated as global or production shell recovery is blamed for the demonstrated benchmark-oracle error.

### Q2 — Current Unresolved Problem / Failure Isolation
Repository triage order: input/source → units → geometry/frame/normals → loads → stiffness/kinematics → assembly/solver → recovery/surface convention → local/global projection → presenter.
Concrete payload: `c=2/√5`, `s=1/√5`, engineering-shear rotation, Q1 strain/material values, relative tolerance `1e-8`.
Required derivation: compute E2 local strain with `rotateStrain`, local stress with `planeStress(E,nu,·)`, and independently rotate global stress with `rotateStress`; show agreement. State intermediate `epsilonX`, `epsilonY`, `gammaXY`, `sigmaX`, `sigmaY`, `tauXY` values and identify the first wrong layer if they disagree.
Falsifier: for axis-aligned E1 (`c=1,s=0`) the rotation is identity, so the bug is invisible.
Fail if: CI failure is used to widen `scripts/lafea.4-*.mjs` tolerances instead of isolating the first wrong boundary.

### Q3 — Authority / Invariant
Repository anchors: `validation/emp1/wrc537-2013/gamma5-post-authority-physical-oracle-v1.json`; `scripts/bundle-chunk-check.mjs`.
Protected values: frozen `gamma5-post-authority` semantic payload hash and hard chunk ceiling `1.125 * 1024 * 1024 = 1179648` bytes.
Required technical work: confirm neither TASK-001 nor TASK-002 requires either value to change.
Protected invariant: Issue #1261 owns the EMP.1/WRC537 oracle; Issue #1634 owns production boot/bundle recovery. This work item may not edit either value to make #1639 green.
Invalid shortcut/falsifier: refreeze the hash or raise the ceiling instead of fixing within the owning chain.

### Q4 — Independent Validation
Repository anchors: `src/workspace/master-data-ui.js:autoEnsureDefaultQualificationProfile()`, `src/workspace/load-calc-consumer-controller.js`, `src/workspace/non-fea-common-input-runtime.js:selectQualificationProfile()`.
Independent behavioral oracle: with no qualification profile bound, the runtime may use/bind only a locked `QUALIFIED` profile; it must never silently fabricate, overwrite, or bind an unlocked or non-`QUALIFIED` profile.
Required guards: auto-create only when `profiles.length === 0`; auto-bind only when `!currentConfig.qualificationProfileId`; never override an engineer's existing choice.
Falsifier: a model containing an existing explicitly unlocked or non-`QUALIFIED` profile gets silently overwritten or bound by the auto-ensure path.
Fail if: "no console error" is accepted instead of tracing these state guards.

### Q5 — Next Contribution / Minimal Patch
Safe patch boundary: TASK-001 receives no new numerical change unless new executable evidence isolates a defect there. TASK-002 receives only the smallest repair required by Q4 plus focused validation; no new feature work.
Expected evidence: the Q4 negative case changes from FAIL to PASS; existing unlocked/non-QUALIFIED profile data is byte/semantic unchanged and Common Input remains unbound. A locked `QUALIFIED` row remains eligible for binding when no engineer selection exists.
Protected unchanged domains: EMP.1/WRC537 frozen hash/route authority; `1179648` bundle ceiling; LAFEA mechanics and tolerances; workflow YAML.
Validation: focused behavioral regression, applicable non-FEA checks, lint/build truthfully recorded.
Negative test: reintroducing the `|| activeProfiles[0]` fallback must fail the regression.
No-patch condition: no unrelated CI/workflow/bundle/oracle repair and no merge without Owner disposition.

## Exact next action

Modify the target-selection expression to fail closed when no locked `QUALIFIED` profile exists, add the negative behavioral regression, execute available validation, record a material-leg receipt and successor endpoint, synchronize Issue state/comments, open a draft PR, and stop without merge.
