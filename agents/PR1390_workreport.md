# PR1390 — Issue #1371 PR-B LAFEA.3 Model → Mesh → Analyse → Output closure

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY_FOR_VALIDATION
PR_RECOVERY_STATE: CONTINUE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: AUTO
AUTO_STATE: BLOCKED_INFRASTRUCTURE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_TASK: Issue #1371
PR_OR_WIP: PR1390
BRANCH: agent/issue-1371-pr-b-lafea3-closure-20260823
MAIN_HEAD_LAST_CHECKED: 1176f66eb94686f99d4f302930d46f17ff876083
MERGE_BASE: 1176f66eb94686f99d4f302930d46f17ff876083
APPENDIX_A_STATUS: PASS 96/100
CURRENT_STAGE: LAFEA.3 source/domain/custody + traceability validation
CURRENT_BLOCKER: hosted visible-workbench jobs fail before checkout with steps=null
HIGHEST_RISK: source/domain physical parity or retained result identity mismatch once execution actually starts
EXACT_NEXT_ACTION: run the chained continuum gate on an exact head; if it starts, capture the actual governing element/IP/value/hash identities below rather than changing tolerances or mechanics.
```

## Root cause and correction

The normalized `pipePadContinuumSource()` Sample contains five restraints and six nodal forces across CASE-A/CASE-B. The previous governed domain retained only the N01/N04 restraints and CASE-A F1–F4. N02/N03 were not geometry features, and CASE-B F5/F6 were omitted.

PR1390 adds `src/workspace/lafea3-simulated-domain-provider.js`, preserves N02/N03 as explicit collinear boundary vertices, and derives every RESTRAINT and CONCENTRATED_LOAD attachment from the normalized source document. Physics parity is matched at exact physical coordinates; generated mesh node IDs remain implementation identities and no nearest-node mapping is introduced.

Protected unchanged:
- T6 / 30 mm Sample profile and mesh-quality thresholds;
- `src/core/local-continuum/**` formulation, stiffness, solver and recovery;
- B01/B02 frozen definitions, probes, expected values and tolerances;
- browser specs/workflow YAML/release authority.

## Hosted gate wiring

The existing Chromium carrier executes `scripts/lafea-b01-b02-gate0-diagnostic.mjs`. PR1390 preserves all existing frozen B01/B02 imports first, then runs:

```text
scripts/lafea3-simulated-source-authority-check.mjs
scripts/lafea3-sample-generate-retain-check.mjs
scripts/lafea3-visible-continuum-preflight-check.mjs
```

Thus independent continuum benchmark gates execute before the Sample product/custody checks. No browser contract was added.

## §14 LAFEA.3 result traceability — authoritative von Mises

The required trace is encoded even though the hosted runner has not yet produced the actual governing runtime ID/value. The visible accepted-result path is:

```text
Visible output row
  Analysis results → Engineering result summary → "Max von Mises"
  and detailed presenter row
  "<CASE> · Element <ELEMENT_ID> · <GP_ID> · von Mises equivalent stress"

→ presenter selection
  src/workspace/lafea-results-view.js::buildContinuumHighlights()
  scans result.loadCaseResults[*].elementResults[*].gaussPointResults[*].vonMises
  for T6/Q8

→ registered detailed presenter
  src/workspace/lafea-result-presenters/local-continuum.js::presentLocalContinuum()
  requires recoveryLayer === "INTEGRATION_POINT"
  sourcePath =
  result.loadCaseResults[caseIndex]
    .elementResults[elementIndex]
    .gaussPointResults[pointIndex]
    .vonMises

→ retained result field / recovery location
  loadCaseResult.elementResults[<element>].gaussPointResults[<ip>].vonMises
  authority = INTEGRATION_POINT_RETAINED_ENGINEERING_RESULT
  no nodal stress projection / no cross-element averaging is accepted as authority

→ element / integration point
  <ELEMENT_ID> = the exact retained T6 elementResult.elementId
  <GP_ID>      = the retained gaussPointResults[<ip>].pointId
  ACTUAL_RUNTIME_ELEMENT_ID = NOT_RUN / INFRASTRUCTURE
  ACTUAL_RUNTIME_GP_ID      = NOT_RUN / INFRASTRUCTURE
  ACTUAL_RUNTIME_VALUE_MPA  = NOT_RUN / INFRASTRUCTURE

→ compiled solver model
  src/workspace/lafea-continuum-solver-model.js
  compileElements(meshEvidence, ...)
  copies retained row.elementId, row.elementType and [...row.nodeIds] exactly
  compileNodes(meshEvidence)
  copies retained nodeId/x/y/z exactly
  compiled.parents.meshHash = meshEvidence.meshHash
  compiled.parents.meshArtifactHash = meshEvidence.artifactHash

→ retained mesh identities
  stage.retainedAnalysisMeshEvidenceV2.mesh.elements
    .find(row => row.elementId === <ELEMENT_ID>)
  gives the exact nodeIds consumed by the compiled solver model;
  those nodeIds resolve in retainedAnalysisMeshEvidenceV2.mesh.nodes.
  The existing Chromium Sample spec also requires
  preflight.meshHash === retained.meshHash
  and execution.meshHash === retained.meshHash.

→ source authority
  compiled.parents.sourceHash
  === stage.sourceAuthority.sourceHash
  === domain.sourceHash
  === geometryEvidence.sourceHash
  === meshEvidence.sourceHash
  ACTUAL_RUNTIME_SOURCE_HASH = NOT_RUN / INFRASTRUCTURE
```

### First-wrong-value isolation for the continuum trace

If the visible Max von Mises differs from a frozen benchmark, inspect in this order and stop at the first mismatch:

1. visible row `sourcePath` and governing element/IP identity;
2. retained `gaussPointResults[ip].vonMises` and stress tensor at that exact IP;
3. retained `elementResult.elementId` versus compiled solver `elements[*].elementId`;
4. exact compiled `nodeIds`/node coordinates versus retained mesh element/node identities;
5. compiled `parents.meshHash` versus retained evidence `meshHash`;
6. compiled `parents.sourceHash` versus stage source authority;
7. only after those identities agree, inspect T6 B-matrix/Jacobian/recovery mechanics.

Do **not** substitute a moving maximum, smoothed nodal field, nearby element, or changed tolerance.

## Source → solve custody trace

```text
pipePadContinuumSource() normalized document
→ issueLafeaSourceAuthority().sourceHash
→ source-faithful governed domain + geometry evidence
→ retainedAnalysisMeshEvidenceV2 (T6 / 30 mm, CURRENT_PASS)
→ compileLafeaContinuumSolverModel()
→ retainedContinuumPreflightEvidence (no solver execution)
→ registered route DOMAIN_FIRST_COMPILED_SOLVER_MODEL
→ accepted LOCAL_CONTINUUM_RESULT
→ lifecycle EXECUTION + RECOVERY artifacts
→ result highlights + retained detailed presenter
→ exact retained mesh overlay in Engineering viewport
```

## Validation truth

Observed exact-head jobs still fail before checkout. Representative visible-workbench evidence:

```text
run 32676052562
job 97284253375
conclusion failure
steps null
```

Earlier explicit retry likewise returned `steps=null`. Therefore:

| Check | Status |
|---|---|
| source/domain source inspection | PASS / SOURCE_INSPECTION |
| source/domain/custody executable checks | NOT_RUN / INFRASTRUCTURE |
| frozen Kirsch/B02C/B-bar programme in hosted attempt | NOT_RUN / INFRASTRUCTURE |
| Chromium Model→Mesh→Analyse→Output journey | NOT_RUN / INFRASTRUCTURE |
| actual governing element/IP/value/hash capture | NOT_RUN / INFRASTRUCTURE |
| engineering assertion failure observed | NO |

No encoded-but-unexecuted check is represented as PASS.

## Changed-file ledger

- `src/workspace/lafea-simulated-source-provider.js`
- `src/workspace/lafea3-simulated-domain-provider.js`
- `scripts/lafea3-simulated-source-authority-check.mjs`
- `scripts/lafea3-sample-generate-retain-check.mjs`
- `scripts/lafea3-visible-continuum-preflight-check.mjs`
- `scripts/lafea-b01-b02-gate0-diagnostic.mjs`
- report/status/claim metadata.

## Hypothesis / falsifier

Hypothesis: exact source-derived attachments plus explicit N02/N03 geometry features restore physical fidelity without changing numerical authority.

Falsifier: a runner shows a blocked retained T6 mesh, non-unique exact feature mapping, CASE-B/constraint parity mismatch, compiled source-parent mismatch, or any need for nearest-node mapping, threshold weakening, solver edits or oracle edits.

## Completion boundary

Keep PR draft and owner-only. On first real execution, record actual `<ELEMENT_ID>`, `<GP_ID>`, retained node IDs, sourceHash, meshHash, solverModelHash, compiledExecutionHash and reported value into this trace. Until then the trace structure is SOURCE_INSPECTION-complete but runtime evidence remains NOT_RUN.
