# PR1393 — Issue #1371 PR-D cross-stage anti-drift / viewport identity / registry gate

Issue: https://github.com/reallaksh19/Advanced_Analysis/issues/1371

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY_FOR_VALIDATION
PR_RECOVERY_STATE: CONTINUE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: AUTO
AUTO_STATE: BLOCKED_BY_HOSTED_RUNNER_INFRASTRUCTURE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_TASK: Issue #1371
PR_OR_WIP: PR1393
BRANCH: agent/issue-1371-pr-d-anti-drift-20260824
MAIN_HEAD_LAST_CHECKED: 1176f66eb94686f99d4f302930d46f17ff876083
MERGE_BASE: 1176f66eb94686f99d4f302930d46f17ff876083
APPENDIX_A_STATUS: PASS 96/100
CURRENT_STAGE: cross-stage custody + viewport mesh identity validation
CURRENT_BLOCKER: hosted visible-workbench jobs fail before checkout with steps=null
REGISTRY_CLEANUP: BLOCKED_PENDING_EXECUTED_EXACT_HEAD_EVIDENCE
HIGHEST_RISK: first executable anti-drift run may expose a stale-parent or identity assumption that source inspection alone cannot prove
EXACT_NEXT_ACTION: execute scripts/lafea1371-cross-stage-anti-drift-check.mjs on an exact head; only after executed PASS and Chromium PASS reconsider LAFEA.3 registry wording.
```

## Mission

Prove deterministic source/mesh/solver/execution custody across LAFEA.3 and LAFEA.4, prove engineering edits revoke old authority while allowing physically reusable mesh content to be regenerated, expose the exact retained mesh content identity at the Engineering viewport boundary, and prevent registry/documentation claims from outrunning executed evidence.

## Current route trace

### LAFEA.3

```text
normalized source
→ issueLafeaSourceAuthority()
→ governed domain + geometry evidence
→ retained T6 analysis mesh
→ continuum preflight
→ compileLafeaContinuumSolverModel()
→ DOMAIN_FIRST_COMPILED_SOLVER_MODEL
→ accepted result
→ lifecycle EXECUTION / RECOVERY
→ result presenter
→ live Engineering viewport using exact retained mesh evidence
```

### LAFEA.4

```text
normalized source
→ issueLafeaSourceAuthority()
→ shell midsurface evidence
→ retained CST_DKT_TRI3 mesh
→ compileLafeaShellSolverModel()
→ SHELL_RETAINED_MESH_COMPILED_SOLVER_MODEL
→ accepted LOCAL_SHELL_RESULT
→ lifecycle EXECUTION / RECOVERY
→ result presenter
→ live Engineering viewport using exact retained mesh evidence
```

## Source authority

The anti-drift executable uses the public normalized-source and source-authority routes for both stages. Deterministic replay requires identical normalized source to reproduce `sourceHash`.

A real LAFEA.3 material edit is performed through the public typed descriptor:

```text
LAFEA.3.material.elasticModulus / MAT
200000 MPa → 210000 MPa
```

Expected custody after the source change:

- new sourceHash;
- old source-parented domain/geometry/mesh/preflight/execution/recovery cannot remain current;
- unchanged geometry/profile may regenerate identical **mesh content**;
- parent-bound mesh evidence artifact must be reissued under the new source parent;
- solver/execution identities must change.

LAFEA.4 similarly exercises a material edit and a changed mesh profile to revoke old midsurface/mesh/solver/execution/recovery authority.

## Benchmark authority

PR1393 does not own numerical benchmark expected values. It consumes product execution only to prove custody/invalidation semantics.

Independent numerical authority remains:

```text
LAFEA.3: frozen Kirsch + B02C + B-bar/Lame programme
LAFEA.4: PR1388 frozen B4-1/B4-2 analytical definitions + separate production comparator
B4-3: BLOCKED_SOURCE_REQUIRED
```

No frozen expected value/tolerance is changed in PR1393.

## Mechanics prediction before execution

For the homogeneous force-controlled LAFEA.3 Sample:

```text
E_old = 200000 MPa
E_new = 210000 MPa
K_new/K_old = 1.05
u_new/u_old = 1/1.05 = 0.9523809523809523
predicted displacement change = -4.7619047619%
predicted stress change ≈ 0%
```

The regression declares this before post-edit execution and then compares the retained result. This distinction is important: a displacement-controlled problem would instead keep imposed displacement and scale stress/reactions approximately +5%.

## Mesh content versus evidence custody

The required post-edit distinction is explicit:

```text
same geometry/profile
→ regenerated mesh content hash may equal baseline meshHash
new source parent
→ regenerated mesh evidence artifactHash must differ
→ solverModelHash must differ
→ compiledExecutionHash must differ
```

Old parent-bound evidence cannot remain authoritative merely because the geometry produced the same mesh coordinates/connectivity.

## Viewport retained-mesh identity

The live Engineering viewport already renders the exact `input.retainedMeshEvidence` object through `renderLafeaRetainedMeshOverlay`. PR1393 adds identity observability without changing render/recovery numerical authority:

```text
viewport.retainedMeshIdentity.meshHash
  = retainedAnalysisMeshEvidenceV2.meshHash

viewport.retainedMeshIdentity.artifactHash
  = retainedAnalysisMeshEvidenceV2.artifactHash

getState().retainedMeshHash
getState().retainedMeshArtifactHash
DOM data-retained-mesh-hash
DOM data-retained-mesh-artifact-hash
```

Thus the viewport can prove the displayed mesh **content identity** is the retained solve mesh while preserving the separate parent-bound evidence identity. The generic recovery/render packet's legacy artifact-parent hash is not silently relabeled.

The anti-drift executable requires this equality for both LAFEA.3 and LAFEA.4. After the E-only LAFEA.3 edit/regeneration, viewport content mesh hash must remain the same while the artifact hash changes.

## Hosted validation plumbing

No new browser test file or workflow YAML was added. The existing `scripts/lafea-stage17-browser-run.mjs` carrier executes:

```text
node scripts/lafea1371-cross-stage-anti-drift-check.mjs
```

before the existing Chromium suite. The existing Playwright set remains unchanged in PR1393.

## ISS / RISK / DEC / QST

- `ISS-1371D-01` RESOLVED_BY_IMPLEMENTATION_PENDING_EXECUTION — test-only deterministic source/mesh/solver/execution replay and invalidation gate exists.
- `ISS-1371D-02` RESOLVED_BY_IMPLEMENTATION_PENDING_EXECUTION — live viewport exposes retained mesh content hash separately from mesh evidence artifact hash.
- `ISS-1371D-03` BLOCKED_BY_EVIDENCE — LAFEA.3 registry limitation cannot be cleaned until exact-head engineering/product gates execute and pass.
- `RISK-1371D-01` ACTIVE — first run may show current lifecycle projection semantics differ from the encoded stale/current assertions.
- `RISK-1371D-02` CONTROLLED — content-hash reuse is explicitly distinguished from evidence reuse; test does not demand needless mesh-content changes after an E-only edit.
- `DEC-1371D-01` — viewport content identity is exposed at the live retained-mesh boundary rather than redefining generic render-packet artifact lineage.
- `DEC-1371D-02` — registry wording remains protected during infrastructure NOT_RUN.
- `QST-1371D-01` NONE within mutation scope; remaining registry action is evidence-gated, not a design ambiguity.

## Changed-file ledger

- `scripts/lib/lafea1371-custody-assertions.mjs` — test-only custody helper;
- `scripts/lafea1371-cross-stage-anti-drift-check.mjs` — deterministic replay, edits, mechanics prediction, viewport identity assertions;
- `scripts/lafea-stage17-browser-run.mjs` — existing Chromium carrier binding;
- `src/workspace/lafea-live-workbench-viewport.js` — mesh content/artifact identity observability only;
- `agents/PR1393_workreport.md`;
- `agents/status/PR1393.yaml`;
- `agents/claims/PR1393.yaml`.

Protected: production source/lifecycle mutation semantics, continuum/shell solvers and recovery, mesh thresholds, frozen benchmark targets/tolerances, browser specs, workflow YAML, registry wording, release authority.

## Validation matrix

| Check | Status | Observation | Oracle |
|---|---|---|---|
| edit descriptors/orchestrator invalidation trace | PASS | SOURCE_INSPECTION | IMPLEMENTATION_COUPLED |
| viewport uses exact retained mesh evidence object | PASS | SOURCE_INSPECTION | custody contract |
| viewport content/artifact identity assertions | NOT_RUN | encoded in anti-drift command; hosted steps never start | custody contract |
| deterministic LAFEA.3 replay | NOT_RUN | hosted steps never start | PRODUCT_REGRESSION |
| LAFEA.3 E-edit 1/1.05 displacement regression | NOT_RUN | hosted steps never start | analytical mechanics prediction + product result |
| LAFEA.4 deterministic/source/profile invalidation | NOT_RUN | hosted steps never start | PRODUCT_REGRESSION |
| Chromium product route | NOT_RUN | run `32676935349`, job `97286689033`, `steps=null` on prior exact head | PRODUCT_REGRESSION |
| registry wording update | NOT_APPLICABLE / BLOCKED | executable evidence absent | evidence gate |

No encoded-but-unexecuted check is represented as PASS. Engineering assertion failure observed: **NO**.

## Independent oracle classification

```text
PR1393 anti-drift checks          = IMPLEMENTATION_COUPLED custody regression
E-edit displacement factor        = independent first-order linear-elastic prediction
LAFEA.3 Kirsch/B-bar/Lame         = FROZEN_ANALYTICAL independent programme
LAFEA.4 B4-1/B4-2                 = FROZEN_ANALYTICAL independent definitions
LAFEA.4 product/Chromium           = PRODUCT_REGRESSION
```

## Main-drift audit

Live main last checked: `1176f66eb94686f99d4f302930d46f17ff876083`. PR1393 was grounded on this merge base and was 0 commits behind at the last AD-01 comparison. PR1388/1390/1392 own distinct benchmark/product paths; the viewport observability seam does not overlap their numerical authority. Re-run compare before owner merge request.

## Registry/documentation closure

Protected current LAFEA.3 statement:

```text
Production geometry-to-mesh-to-convergence orchestration is incomplete.
```

Issue #1371 permits changing it only after relevant exact-head gates **execute and pass**. Jobs that fail before checkout are not evidence. No registry or user-facing capability widening is in this PR.

## Failure isolation

If anti-drift execution fails, stop at the first wrong boundary:

```text
SOURCE_AUTHORITY
DOMAIN_OR_GEOMETRY_PARENT
MESH_CONTENT_IDENTITY
MESH_EVIDENCE_ARTIFACT_IDENTITY
PREFLIGHT
SOLVER_MODEL
COMPILED_EXECUTION
RECOVERY
VIEWPORT_RETAINED_MESH_IDENTITY
```

Do not invalidate every descendant by assertion just to make the test green; first identify which exact parent contract disagrees.

## Highest remaining risk

The first actual execution may expose a mismatch between intended custody semantics and current store publication behavior. If that occurs, the correct response is to isolate the first stale/current identity, not to weaken the negative regression or force all hashes to change.

## EXACT_NEXT_ACTION

On an exact head run:

```bash
node scripts/lafea1371-cross-stage-anti-drift-check.mjs
node scripts/lafea-stage17-browser-run.mjs
```

If the Node gate passes but Chromium fails later, classify separately. Only after relevant engineering/product evidence passes may a registry wording patch be proposed.

## Appendix A qualification

Takeover qualification remains `PASS 96/100`; every A1–A5 score exceeded the issue threshold. The bounded viewport identity observability change does not widen solver or benchmark authority.
