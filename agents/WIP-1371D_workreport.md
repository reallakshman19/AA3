# WIP-1371D — Issue #1371 cross-stage anti-drift and registry closure

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY_FOR_IMPLEMENTATION
PR_RECOVERY_STATE: NEW_PR_REQUIRED
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
PHASE_PROGRESSION: AUTO
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_TASK: Issue #1371
PR_OR_WIP: WIP-1371D
BRANCH: agent/issue-1371-pr-d-anti-drift-20260824
REPORT_BASIS_HEAD: 1176f66eb94686f99d4f302930d46f17ff876083
MAIN_HEAD_LAST_CHECKED: 1176f66eb94686f99d4f302930d46f17ff876083
MERGE_BASE: 1176f66eb94686f99d4f302930d46f17ff876083
APPENDIX_A_STATUS: PASS 96/100 from #1371; PR-D re-grounded
GROUNDING_EPOCH: GE-1371D-01
CURRENT_STAGE: PR-D implementation
CURRENT_BLOCKER: registry wording cleanup BLOCKED until executed exact-head evidence exists
HIGHEST_RISK: accidentally invalidating everything by policy assertion instead of proving current parent-specific stale semantics
EXACT_NEXT_ACTION: add test-only custody assertions and cross-stage deterministic replay/source-edit/mesh-profile invalidation regression; retain current registry limitation unchanged until exact-head engineering evidence actually executes and passes.
```

## Issue authority for PR-D

Mandatory anti-drift gates from #1371:
- AD-01 live-main drift comparison;
- AD-02 changed engineering source makes dependent old mesh/preflight/execution non-current and Run blocked;
- AD-03 changed mesh profile/retained mesh makes old solver/preflight/execution/recovery non-authoritative;
- AD-04 frozen oracle independence unchanged;
- AD-05 deterministic semantic hashes reproducible for identical normalized source/profile/producer;
- AD-06 no silent fallback engineering values.

Issue section 16 explicitly permits a test-only execution-custody helper and requires a source-mutation invalidation regression. Section 17 permits registry wording cleanup only after relevant exact-head gates PASS. Hosted LAFEA engineering jobs are currently NOT_RUN because runners have repeatedly failed before checkout/steps, so registry wording must remain unchanged in this PR.

## Planned test programme

LAFEA.3:
1. build the current Sample through source authority → governed domain/geometry → T6/30 retained mesh → current preflight → accepted compiled workbench execution;
2. replay from identical normalized source/profile in a fresh store and require deterministic sourceHash, meshHash, solverModelHash and compiled execution hash contracts where deterministic contract applies;
3. record baseline CASE-A displacement/stress response;
4. before mutation predict `E: 200000 → 210000 MPa`: force-controlled linear-elastic displacement scales by `1/1.05 = 0.95238095238`; stress remains approximately unchanged because `D ∝ E` and strain `∝ 1/E`;
5. edit E through public `setScalar('LAFEA.3.material.elasticModulus','MAT','210000')`;
6. assert source hash changes, old domain/geometry/mesh/preflight/execution/recovery cannot remain authoritative and Run is not ready;
7. regenerate governed parents/profile/mesh against the new source, rerun, require same deterministic mesh content hash for unchanged geometry/profile, changed solver/execution identity, displacement ratio approximately 1/1.05 and stress approximately unchanged for CASE-A.

LAFEA.4:
1. build current Sample to accepted retained-mesh shell execution;
2. edit material E through public descriptor;
3. assert source authority changes and old midsurface/mesh/solver/execution/recovery cannot remain current;
4. separately bind a changed shell mesh profile and assert old solver/execution/recovery authority is revoked.

No production lifecycle code, solver mechanics, mesh thresholds, benchmark definitions or expected values will change.

## Registry closure state

Current LAFEA.3 registry limitation saying production geometry-to-mesh-to-convergence orchestration is incomplete remains protected. This PR will not soften/remove it because exact-head runtime evidence is not currently available. A future owner-authorized follow-up may update wording only after all relevant merged phases and executed gates pass.

## Coordination

PR1388/PR1390/PR1392 are separate unmerged phases. PR-D is intentionally test-only from current main and will not touch their exact files, frozen oracles, product presenters, fixtures or numerical kernels. Classification: SAFE.

## Validation truth at grounding

All new runtime checks NOT_RUN. Source/API tracing confirms current orchestrator invalidates geometry/mesh-generation and clears continuum/shell execution authority whenever a document digest changes; public typed descriptors classify material, section, geometry and load/BC edits explicitly. These are source-inspection facts, not runtime PASS claims.
