# PR1432 — LAFEA.3 source-authoritative retained-refinement salvage

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY_FOR_VALIDATION
PR_RECOVERY_STATE: SALVAGE_PARTIAL_CLEAN_SUCCESSOR
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: AUTO_MODE
CRITICALITY: ENGINEERING_CRITICAL
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_PREDECESSOR: PR #1270 (CLOSED_SUPERSEDED)
PR: #1432
BRANCH: agent/lafea3-local-refinement-current-main-salvage-20260825
MAIN_HEAD_LAST_CHECKED: 7b2a8119aa5faeee7cc102c894991851019c5a7b
INTEGRATION_HEAD: 24bb22bf7092f493fbc536ff39bbbad06876d6bf
CURRENT_STAGE: INTEGRATED_CURRENT_MAIN_VALIDATION_BLOCKED_BY_HOSTED_RUNNER_ALLOCATION
APPENDIX_A_STATUS: PASS 98/100, minimum 19/20
ENGINEERING_FAILURE_PROVEN: false
```

## Handover in 60 seconds

PR #1432 is the clean successor to stale/contaminated #1270 and carries one bounded LAFEA.3 retained-refinement vertical slice:

```text
current source/domain/geometry
-> retained parent v2 mesh
-> one governed retained NODE/ELEMENT target
-> source-authoritative affine mapped remesh
-> generic mesh quality
-> independent actual shared-edge adjacency gate
-> v2 retained evidence/custody
-> Discretization UI bound to the same producer envelope
-> existing preflight/solver consumes retained child
```

After PR #1433 merged, #1432 was one commit behind current main. Its branch was reconciled **without history rewrite** by a two-parent merge commit:

```text
parent 1 = prior PR1432 head 7f397c8f01f18415579568ff11d785d53cae0721
parent 2 = current main 7b2a8119aa5faeee7cc102c894991851019c5a7b
merge     = 24bb22bf7092f493fbc536ff39bbbad06876d6bf
```

The resulting tree is current main plus exactly the ten reviewed #1432 paths. No #1433 production path was overwritten.

## Mission / authority trace

```text
source authority
-> analysis domain + geometry evidence
-> retained parent v2 analysis mesh
-> retained-mesh refinement command/plan
-> SOURCE_AFFINE_BALANCED_METRIC_GRID_V1
-> producer output
-> generic mesh quality
-> actual shared-edge longest-corner-edge ratio
-> v2 evidence construction
-> retained v2 custody
-> UI disclosure/input gating
-> existing preflight / solve consumption
```

Current numerical/Run authority remains the retained v2 mesh. This PR does **not** grant v3 refinement lineage or authority.

## Retained engineering correction

The predecessor first falsified the prior local-remesh route against the unchanged actual-topology adjacency authority:

```text
parent max adjacent ratio ~= 1.34088    PASS
old radial/Delaunay child ~= 1.98579    BLOCK
radial halo candidate     ~= 1.97822    BLOCK
qualified limit                       = 1.5
```

The first wrong boundary was generated child topology/size transition, not solver, benchmark, oracle or tolerance.

Qualified first production envelope:

```text
stage                         LAFEA.3
construction                  SOURCE_AFFINE_BALANCED_METRIC_GRID_V1
families                      T3 / T6
maximum targets               1
source geometry               one straight 4-sided affine/parallelogram outer loop
holes                         not qualified
minimum included angle        75 deg
maximum side-length ratio     10/3
minimum target param offset   0.15
minimum local/global ratio    0.25
adjacent size authority       bound mesh-profile value; candidate qualified at 1.5
Q8                            not qualified
```

`createLafeaAnalysisMeshEvidenceV2()` independently recomputes actual shared-edge characteristic-length ratios for LAFEA.3 `:LOCAL_REFINEMENT:` meshes before custody. Planned spacing does not self-certify the child.

## Current-main UI correction

The original current-main UI invited multiple target IDs even though the qualified producer permits `maximumTargets = 1`, and it duplicated the LAFEA.3 minimum ratio as a hidden `global * 0.25` literal.

The current PR panel now:

- imports `LAFEA_RETAINED_MESH_REFINEMENT_POLICY` from production;
- discloses one-target/minimum-ratio authority;
- uses a one-ID placeholder for LAFEA.3;
- rejects multiple IDs before dispatch;
- derives the LAFEA.3 minimum target ratio from production policy;
- discloses actual-topology acceptance before custody;
- leaves the LAFEA.4 TECH-13 product branch unchanged.

The existing `scripts/lafea-refinement-solve-ui-check.mjs` was reconciled to assert the production-policy binding.

## Integration with merged PR #1433 v3 custody

Merged main now creates a parallel `retainedAnalysisMeshCandidateV3` only after generic LAFEA.3 automatic mesh generation.

The integrated #1432 head proves in production source that local refinement does **not** inherit that lineage:

```js
const produced = produceLafeaRetainedMeshRefinement(...);
const validated = validateLafeaAnalysisMeshEvidenceV2(produced.evidence);
evidence.set(stageId, validated);
v3Candidates.set(stageId, null);
```

Therefore the combined behavior is:

```text
qualified automatic LAFEA.3 generation
-> v2 retained mesh + parallel v3 pre-authority candidate

then governed local v2 refinement
-> new retained v2 child
-> v3 candidate cleared
-> no v3 refinement authority implied
```

This is the correct authority boundary until an independent v3 local-refinement qualification exists.

## Exact changed-file ledger — 10 files

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

No workflow, registry/release, solver, B01/B02 benchmark, EMP.1, LAFEA.4 TECH-13 implementation, or v3-candidate production file is changed by the PR diff.

## Protected invariants

```text
no adjacency threshold weakening
no scaled-Jacobian threshold weakening
no target-ratio weakening
no Q8 promotion
no multi-target promotion
no solver/formulation/recovery change
no frozen benchmark/expected-value change
no tolerance widening
no registry/release-authority widening
no workflow mutation
no LAFEA.4 TECH-13 semantic mutation
no v3 local-refinement authority
```

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

This is provenance only, not current-head execution PASS.

## Current validation ledger

| Gate | Status | Observation | Evidence / oracle |
|---|---|---|---|
| predecessor salvage blob custody | PASS | SOURCE_INSPECTION | exact Git blob identity |
| clean PR ledger | PASS | SOURCE_INSPECTION | exactly 10 bounded files |
| current-main UI/producer alignment | PASS | SOURCE_INSPECTION | production policy imported/enforced |
| integrated current-main ancestry | PASS | SOURCE_INSPECTION | two-parent merge, no history rewrite |
| automatic generation creates v3 candidate | PASS | SOURCE_INSPECTION | merged #1433 production state |
| local v2 refinement clears v3 candidate | PASS | SOURCE_INSPECTION | integrated `refineMesh()` route |
| v2 numerical authority preserved | PASS | SOURCE_INSPECTION | retained v2 evidence remains consumer |
| mapped-envelope Node | NOT_RUN | NOT_OBSERVED | no executable runtime |
| retained refinement replay/UI | NOT_RUN | NOT_OBSERVED | no executable runtime |
| LAFEA visible-workbench | NOT_RUN | REMOTE_PRE_STEP_ONLY | run 32917049552 / job 98022830986, runner_id=0, steps=[] |
| broad source/build/browser | NOT_RUN | NOT_OBSERVED | infrastructure |

No unexecuted engineering/product check is PASS.

## Failure classification when execution recovers

Stop at the first executed authoritative failure:

```text
SOURCE/DOMAIN/GEOMETRY PARENT
-> COMMAND/PLAN
-> MAPPED CONSTRUCTION
-> GENERIC QUALITY
-> ACTUAL ADJACENCY
-> V2 EVIDENCE
-> CUSTODY
-> V3-LINEAGE INVALIDATION
-> CURRENT-MAIN UI/COMMAND DISPATCH
-> PREFLIGHT/SOLVER CONSUMPTION
```

Do not mutate upstream mechanics until the first wrong boundary is established.

## Coordination

- #1270: CLOSED_SUPERSEDED, provenance only.
- #1433: MERGED at `7b2a8119aa5faeee7cc102c894991851019c5a7b`; generic v3 pre-authority custody is now base behavior.
- #1258/#1259: B01/B02 numerical mechanics, untouched.
- #1246: LAFEA.4 TECH-13, shared panel branch preserved.

Classification: `COORDINATION_REQUIRED_BUT_BOUNDED`.

## Appendix A

```text
A1 Production Trace            20/20
A2 Current Failure Isolation   20/20
A3 Authority / Invariant       20/20
A4 Independent Validation      19/20
A5 Next-Commit / Minimal Patch 19/20
TOTAL                           98/100
MINIMUM                         19/20
TAKEOVER_AUTHORITY              WRITE_ALLOWED
```

Points remain withheld only because current-head executable qualification is unavailable.

## AUTO MODE continuation

Do not manually rerun the same zero-step job. Re-open execution only when a legitimate recovery trigger exists.

When execution becomes available, run in this order:

```text
node scripts/lafea3-mapped-refinement-envelope-check.mjs
node scripts/lafea-refinement-solve-ui-check.mjs
node scripts/lafea-retained-mesh-refinement-check.mjs
npm run check:lafea-core
npm run check:lafea-workbench
npm run check:lafea-standalone
then targeted Chromium / broad closure as applicable
```

Stop at the first authoritative executed failure.

## EXACT_NEXT_ACTION

Keep #1432 draft and Owner-only. No further #1432 production mutation is justified while runtime remains unavailable. Proceed to the next non-overlapping production workstream; return to #1432 only on legitimate execution recovery, new main drift, review input, or explicit owner merge authorization.
