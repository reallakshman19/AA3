# PR1393 — Issue #1371 PR-D cross-stage anti-drift / viewport identity / registry gate

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
APPENDIX_A_STATUS: PASS 96/100 from #1371
CURRENT_STAGE: cross-stage custody + viewport mesh identity validation
CURRENT_BLOCKER: hosted visible-workbench jobs fail before checkout with steps=null
REGISTRY_CLEANUP: BLOCKED_PENDING_EXECUTED_EXACT_HEAD_EVIDENCE
EXACT_NEXT_ACTION: execute scripts/lafea1371-cross-stage-anti-drift-check.mjs on exact head; only after executed PASS reconsider registry wording.
```

## Mission

Prove cross-stage deterministic custody and invalidation for LAFEA.3/.4, distinguish mesh content reuse from parent-bound evidence reuse, expose the retained mesh content identity at the Engineering viewport boundary, and keep registry claims fail-closed until exact-head evidence actually executes.

## Implemented boundaries

### Test-only custody helper

`scripts/lib/lafea1371-custody-assertions.mjs` centralizes accepted execution and stale-authority assertions. It grants no production authority.

### Cross-stage anti-drift executable

`scripts/lafea1371-cross-stage-anti-drift-check.mjs` exercises:

- deterministic identical-source/profile replay;
- LAFEA.3 real material edit `E: 200000 → 210000 MPa` through the public typed descriptor;
- predeclared mechanics prediction `u_new/u_old = 1/1.05 = 0.9523809523809523` and approximately unchanged force-controlled stress;
- immediate revocation of old source-parented domain/geometry/mesh/preflight/execution/recovery authority;
- regeneration with unchanged geometry/profile reproducing the same mesh **content** hash but a different parent-bound mesh evidence artifact;
- changed solver/execution identities after the material edit;
- LAFEA.4 deterministic replay, material-edit invalidation and mesh-profile invalidation.

### Viewport retained mesh identity

`src/workspace/lafea-live-workbench-viewport.js` continues to pass the exact retained mesh evidence object into `renderLafeaRetainedMeshOverlay`. PR1393 adds identity observability only:

```text
viewport.retainedMeshIdentity.meshHash     = retainedAnalysisMeshEvidenceV2.meshHash
viewport.retainedMeshIdentity.artifactHash = retainedAnalysisMeshEvidenceV2.artifactHash
getState().retainedMeshHash                = content hash
getState().retainedMeshArtifactHash        = parent-bound evidence artifact hash
DOM data-retained-mesh-hash                = content hash
DOM data-retained-mesh-artifact-hash       = artifact hash
```

This intentionally does **not** reinterpret the generic recovery/render packet's legacy artifact-parent hash. Content identity and evidence identity stay separate instead of one being relabeled as the other.

The anti-drift executable instantiates the live viewport model for both LAFEA.3 and LAFEA.4 and requires the viewport content hash to equal the exact retained v2 evidence `meshHash`. After the E-only edit/regeneration, the viewport content hash must remain equal while the artifact hash must change.

## Mechanics prediction before execution

For the homogeneous linear force-controlled LAFEA.3 Sample:

```text
E_old = 200000 MPa
E_new = 210000 MPa
K_new / K_old = 1.05
u_new / u_old = 1 / 1.05 = 0.9523809523809523
predicted displacement change = -4.7619047619%
stress change ≈ 0% because D ∝ E and strain ∝ 1/E
```

A displacement-controlled problem would instead retain imposed displacement and scale stress/reactions approximately +5%; that is not the case asserted by this regression.

## Custody expectation after E-only edit

Physics:
- geometry unchanged;
- mesh topology/content may be reused exactly;
- constitutive model changes;
- solver model/execution/recovery change.

Custody:
- old source authority stale;
- old parent-bound domain/geometry/mesh evidence cannot remain current;
- regenerated mesh content hash may repeat;
- regenerated mesh artifact hash must change because its source parent changed;
- solverModelHash and compiledExecutionHash must change;
- old results cannot remain authoritative.

## Changed-file ledger

- `scripts/lib/lafea1371-custody-assertions.mjs` — test helper;
- `scripts/lafea1371-cross-stage-anti-drift-check.mjs` — deterministic replay/edit/viewport identity regression;
- `scripts/lafea-stage17-browser-run.mjs` — invokes the anti-drift Node gate before the unchanged Chromium test set;
- `src/workspace/lafea-live-workbench-viewport.js` — bounded mesh content/artifact identity observability only;
- `agents/PR1393_workreport.md`;
- `agents/status/PR1393.yaml`;
- `agents/claims/PR1393.yaml`.

Protected unchanged:
- source/lifecycle mutation semantics;
- continuum and shell formulations, stiffness, solver and recovery;
- mesh quality thresholds;
- benchmark targets/tolerances;
- browser E2E specs;
- workflow YAML;
- registry wording;
- release authority.

## Validation truth

| Check | Status | Evidence |
|---|---|---|
| source/API invalidation trace | PASS / SOURCE_INSPECTION | typed edit descriptors and orchestrator invalidation inspected |
| exact retained mesh overlay source | PASS / SOURCE_INSPECTION | viewport passes `input.retainedMeshEvidence` directly to retained mesh overlay |
| viewport content/artifact identity contract | ENCODED / NOT_RUN | anti-drift executable now asserts both identities |
| LAFEA.3 E-edit mechanics/custody regression | NOT_RUN / INFRASTRUCTURE | hosted job did not start steps |
| LAFEA.4 source/profile invalidation regression | NOT_RUN / INFRASTRUCTURE | hosted job did not start steps |
| Chromium product journey | NOT_RUN / INFRASTRUCTURE | visible-workbench jobs have `steps=null` |
| registry wording update | NOT_APPLICABLE / BLOCKED | exact-head engineering evidence has not executed |

No encoded-but-unexecuted check is represented as PASS.

## Registry closure

Protected current LAFEA.3 wording remains:

`Production geometry-to-mesh-to-convergence orchestration is incomplete.`

Issue #1371 permits cleanup only after the relevant exact-head gates execute and pass. Infrastructure failure before checkout is not evidence for changing this statement.

## Failure isolation if anti-drift execution fails

Classify the first stale or inconsistent boundary:

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

Do not invalidate every descendant by assertion merely to make a test green; identify which parent contract failed first.

## Coordination

PR1388 owns frozen shell benchmark authority. PR1390 owns LAFEA.3 source/domain fidelity. PR1392 owns LAFEA.4 Sample pressure/output. PR1393 does not change those files or their numerical targets. Live main remains the merge base and overlap state is SAFE.

## EXACT_NEXT_ACTION

On an exact PR head, execute:

```bash
node scripts/lafea1371-cross-stage-anti-drift-check.mjs
node scripts/lafea-stage17-browser-run.mjs
```

If the Node gate passes but Chromium fails later, classify those separately. Do not change registry wording until both the required engineering and product evidence has actually executed and passed.

# Appendix A

Takeover qualification remains `PASS 96/100`; this bounded viewport-observability change does not widen numerical authority or invalidate the original qualification basis.
