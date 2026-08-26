# PR1432 — LAFEA.3 source-authoritative retained-refinement salvage

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY_FOR_VALIDATION
PR_RECOVERY_STATE: CONTINUE_CURRENT_MAIN
TAKEOVER_AUTHORITY: WRITE_ALLOWED_WITHIN_EXISTING_REFINEMENT_SCOPE
EXECUTION_MODE: OWNER_DIRECTED
CRITICALITY: ENGINEERING_CRITICAL
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_PREDECESSOR: PR #1270 (CLOSED_SUPERSEDED)
PR: #1432
BRANCH: agent/lafea3-local-refinement-current-main-salvage-20260825
MAIN_HEAD_LAST_CHECKED: 3d79ea6889c08cf6a37229655ecbd3ec3dc89a20
CURRENT_SYNC_HEAD_BEFORE_RECOVERY_UPDATE: 39a911ef406d37d08e99067931e1288203e83e4e
CURRENT_STAGE: CURRENT_MAIN_SYNCHRONIZED_CROSS_CHAIN_INVALIDATION_AUDITED_EXECUTION_NOT_RUN
ENGINEERING_FAILURE_PROVEN: false
EXACT_NEXT_ACTION: execute the retained-refinement qualification suite from an exact clean checkout when runtime becomes available; keep PR draft/unmerged until separate owner merge authority is granted.
```

## Handover in 60 seconds

PR #1432 is the clean successor to contaminated PR #1270. It carries one bounded LAFEA.3 retained-refinement vertical slice:

```text
current source/domain/geometry
→ retained parent v2 mesh
→ one governed retained NODE/ELEMENT target
→ source-authoritative affine mapped remesh
→ generic mesh quality
→ independent actual shared-edge adjacency gate
→ v2 retained evidence/custody
→ Discretization UI bound to the same producer envelope
→ existing preflight/solver consumes retained child
```

The branch has now been re-grounded onto current `main@3d79ea6889c08cf6a37229655ecbd3ec3dc89a20` without history rewrite and without changing the reviewed ten-path delta.

Real current-head executable qualification is still `NOT_RUN` in this agent environment. No `NOT_RUN` result is represented as PASS.

## Current-main synchronization — 2026-08-26

The branch had drifted behind main after later Issue #1371 and Issue #1321 merges. Exact overlap review found no changes to any of the seven #1432 production/qualification paths in the intervening main commits.

The first synchronization preserved the reviewed ten blobs exactly on top of:

```text
main = f15bab4af0009888f41b856f820cb3ab7a152520
sync = 1d3d06581610f075ea5751fbcb26b08d822ccc29
```

While that synchronization was being completed, main advanced one further commit:

```text
3d79ea6889c08cf6a37229655ecbd3ec3dc89a20
Load Calc: consume current mass receipt in support statics (#1475)
```

That commit is Issue #1321 support-load statics work and has no LAFEA refinement path or authority overlap. A second two-parent synchronization produced:

```text
39a911ef406d37d08e99067931e1288203e83e4e
```

After that synchronization:

```text
behind main = 0
changed paths = exactly 10
```

No production/qualification #1432 blob was rewritten during either synchronization.

## Exact changed-file ledger — 10 paths

Production/product:

```text
src/core/lafea-meshing/refinement-fields.js
src/workspace/lafea-analysis-mesh-evidence-v2.js
src/workspace/lafea-retained-mesh-refinement-grading.js
src/workspace/lafea-retained-mesh-refinement.js
src/workspace/lafea-discretization-generation-panel.js
```

Qualification/regression:

```text
scripts/lafea3-mapped-refinement-envelope-check.mjs
scripts/lafea-refinement-solve-ui-check.mjs
```

Recovery:

```text
agents/PR1432_workreport.md
agents/status/PR1432.yaml
agents/claims/PR1432.yaml
```

No workflow, stage-registry/release, continuum solver, B01/B02 benchmark, LAFEA.4 TECH-13 implementation, EMP.1 or Issue #1321 production path belongs to the PR diff.

## Production authority and engineering correction

The predecessor falsified its former local-remesh route against the unchanged actual-topology adjacency authority:

```text
parent max adjacent ratio ~= 1.34088    PASS
old radial/Delaunay child ~= 1.98579    BLOCK
radial halo candidate     ~= 1.97822    BLOCK
qualified limit                       = 1.5
```

The first wrong boundary was the generated child topology/size transition, not the continuum solver, benchmark, oracle or tolerance.

The retained correction uses:

```text
SOURCE_AFFINE_BALANCED_METRIC_GRID_V1
```

within the deliberately narrow first-production envelope:

```text
stage                         LAFEA.3
families                      T3 / T6
maximum targets               1
source geometry               straight four-sided affine/parallelogram outer loop
holes                         not qualified
minimum included angle        75 deg
maximum side-length ratio     10/3
minimum target param offset   0.15
minimum local/global ratio    0.25
adjacent size authority       bound mesh-profile value; candidate basis 1.5
Q8                            not qualified
```

No threshold, oracle or tolerance is weakened.

## Retained-child custody

`planLafeaRetainedMeshRefinement()` binds the exact retained parent through:

```text
parentMeshArtifactHash
parentMeshHash
sourceHash
analysisDomainHash
analysisGeometryHash
meshProfileHash
commandHash
planHash
```

The producer refuses a stale parent, wrong source/domain/geometry, unqualified family, multiple targets, or a local/global target ratio below the qualified envelope.

`produceLafeaRetainedMeshRefinement()` requires the child to be physically different from its parent:

```text
changed = evidence.meshHash !== parentEvidence.meshHash
if !changed → LAFEA_RETAINED_MESH_REFINEMENT_NO_MESH_CHANGE
```

A BLOCK child is also rejected before custody.

`createLafeaAnalysisMeshEvidenceV2()` independently recomputes actual shared-edge longest-corner-edge adjacency for LAFEA.3 `:LOCAL_REFINEMENT:` meshes before accepting the child. Planned spacing does not self-certify the retained mesh.

## v3-lineage invalidation

Current main has a parallel Mesh Workspace v3 pre-authority candidate for ordinary automatic LAFEA.3 generation. Local v2 refinement must not inherit that lineage.

The integrated workbench route performs:

```text
produce retained v2 refinement
→ validate new v2 evidence
→ replace retained v2 evidence
→ v3Candidates.set(stageId, null)
```

Therefore:

```text
automatic generation
→ retained v2 + possible v3 pre-authority candidate

then governed local v2 refinement
→ new retained v2 child
→ v3 candidate cleared
→ no v3 local-refinement authority implied
```

This remains the correct boundary until v3 local refinement has an independent qualification.

## Interaction with merged Q1–Q5 implementation-authorization chain

Merged main now includes PR #1450/#1462 implementation-authorization custody and PR #1474 Section 17 readiness/cleanup-proposal custody. This interaction was audited after the current-main synchronization.

### Mesh identity

The Q1 implementation-authorization gate retains:

```text
retainedMeshHash
retainedMeshArtifactHash
solverModelHash
compiledExecutionHash
recoveryArtifactHash
viewportMeshHash
viewportMeshArtifactHash
```

and proves the viewport mesh identity equals the retained analysis-mesh evidence.

The exact-head retention wrapper additionally requires the Q1 direct-loaded-element addendum to use the same:

```text
sourceHash
retainedMeshHash
solverModelHash
compiledExecutionHash
recoveryArtifactHash
```

as the main Q1 receipt.

### Exact-head invalidation

The retained implementation-authorization envelope records the full Git `repositoryHead` and is sealed only from a clean checkout.

Section 17 readiness then requires:

```text
implementationAuthorizationVerification.repositoryHead
== current repositoryHead
```

and rejects any mismatch as stale evidence.

Consequences:

1. If #1432 later merges after an older Q1–Q5 receipt was produced, that receipt becomes stale solely because the exact Git HEAD changed, even if the default Sample mesh happened to remain numerically identical.
2. If a governed local refinement changes a retained child, the child `meshHash` also changes and downstream retained-v2/v3 custody cannot silently reuse the old mesh identity.
3. Section 17 cannot use a pre-#1432 implementation receipt on a post-#1432 main line.
4. No duplicate invalidation mechanism or additional solver/mesher patch is required in #1432.

Cross-chain disposition:

```text
PASS_SOURCE_INSPECTION
NO_NEW_MECHANICS_CHANGE_REQUIRED
REAL_EXECUTION_STILL_NOT_RUN
```

## Current-main UI/producer alignment

The current panel:

- imports `LAFEA_RETAINED_MESH_REFINEMENT_POLICY` from production;
- discloses the one-target and minimum-ratio envelope;
- uses a one-ID LAFEA.3 target placeholder;
- blocks multiple IDs before dispatch using `maximumTargets`;
- uses production `minimumTargetRatio` rather than a duplicate hidden literal;
- discloses that a retained local-refinement child reaches custody only after actual shared-edge transition acceptance;
- leaves the LAFEA.4 TECH-13 product branch unchanged.

## Historical predecessor evidence — provenance only

On predecessor exact head `beaccbcac2dd553e7ac9778675d8bcae1ed84115`:

```text
mapped-envelope positives         48 / 48 PASS
maximum actual adjacency          1.3282147318170396 < 1.5
maximum axis interval ratio       1.4560120314109846 < 1.5
minimum scaled Jacobian           0.23728455020922165 > 0.2
minimum angle                     13.726327548800704 deg
threshold changes                 false
```

This remains provenance only and is not current-head executable PASS.

## Protected invariants

```text
no adjacency-threshold weakening
no scaled-Jacobian-threshold weakening
no target-ratio weakening
no Q8 promotion
no multi-target promotion
no solver/formulation/recovery change
no benchmark expected-value change
no tolerance widening
no stage-registry/release widening
no workflow mutation
no LAFEA.4 semantic mutation
no v3 local-refinement authority
no reuse of stale exact-head Q1-Q5/Section 17 evidence
```

## Validation ledger

| Gate | Status | Observation | Oracle |
|---|---|---|---|
| current main grounding | PASS | `main@3d79ea6889c08cf6a37229655ecbd3ec3dc89a20` | GitHub readback |
| 13-commit prior drift | PASS_SAFE | no exact overlap in seven production/qualification paths | commit/path compare |
| #1475 during-sync drift | PASS_SAFE | Issue #1321 only | commit/source inspection |
| current-main synchronization | PASS | two non-destructive two-parent custody commits | Git ancestry/tree custody |
| exact ten-path diff | PASS | no extra path | Git compare |
| retained child changes mesh identity or blocks | PASS_SOURCE_INSPECTION | `NO_MESH_CHANGE` guard + meshHash comparison | production source |
| actual adjacency independently rechecked | PASS_SOURCE_INSPECTION | v2 evidence gate | production source |
| local refinement clears v3 candidate | PASS_SOURCE_INSPECTION | integrated mesh-generation state | production source |
| Q1 retains mesh/solver/execution/recovery identity | PASS_SOURCE_INSPECTION | merged implementation gate | current main source |
| Q1 direct addendum trace parity | PASS_SOURCE_INSPECTION | exact-head retain wrapper | current main source |
| Section 17 rejects stale repository HEAD | PASS_SOURCE_INSPECTION | readiness v3 | current main source |
| mapped-envelope executable check | NOT_RUN | no executable checkout | retained-refinement qualification |
| refinement solve/UI executable check | NOT_RUN | no executable checkout | product regression |
| broad LAFEA/browser/build | NOT_RUN | execution environment unavailable | runtime/build gates |

No unexecuted check is represented as PASS.

## Failure isolation when execution becomes available

Stop at the first authoritative failure:

```text
SOURCE / DOMAIN / GEOMETRY PARENT
→ COMMAND / PLAN
→ MAPPED CONSTRUCTION
→ GENERIC QUALITY
→ ACTUAL ADJACENCY
→ V2 EVIDENCE
→ CUSTODY
→ V3-LINEAGE INVALIDATION
→ UI / COMMAND DISPATCH
→ PREFLIGHT / SOLVER CONSUMPTION
→ Q1 EXACT-HEAD CUSTODY IF RUN AS PART OF ISSUE #1371 QUALIFICATION
```

Do not mutate upstream mechanics until the first wrong boundary is established.

## Required execution sequence when a real checkout is available

```bash
node scripts/lafea3-mapped-refinement-envelope-check.mjs
node scripts/lafea-refinement-solve-ui-check.mjs
node scripts/lafea-retained-mesh-refinement-check.mjs
npm run check:lafea-core
npm run check:lafea-workbench
npm run check:lafea-standalone
```

If #1432 is merged before Issue #1371 implementation authorization is executed, the later Q1–Q5 command must run from the resulting new exact main HEAD.

## Coordination

- #1270: `CLOSED_SUPERSEDED`, provenance only.
- #1433: merged v3 pre-authority custody; local v2 refinement clears its candidate.
- #1450/#1462: merged Q1–Q5 exact-head implementation-authorization gate/harness.
- #1474: merged Section 17 exact-head registry-closure readiness contract.
- #1258/#1259: continuum/B01/B02 numerical mechanics, untouched by #1432.
- Issue #1321 load-calc work through #1475: exact-file/authority disjoint.

Classification:

```text
COORDINATION_REQUIRED_BUT_BOUNDED
```

## Appendix A — takeover qualification

```text
A1 Production Trace            20/20
A2 Current Failure Isolation   20/20
A3 Authority / Invariant       20/20
A4 Independent Validation      19/20
A5 Next-Commit / Minimal Patch 19/20
TOTAL                           98/100
MINIMUM                         19/20
```

Points remain withheld only because current-head executable qualification is unavailable.

## EXACT_NEXT_ACTION

Keep PR #1432 draft/unmerged. No further production mutation is justified by the current-main or authorization-chain audit. Execute the listed qualification suite when a real exact checkout becomes available, or re-ground only on new main drift/review input. Merge requires a new explicit owner instruction for #1432.
