# PR1432 — LAFEA.3 source-authoritative retained-refinement salvage

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY_FOR_VALIDATION
PR_RECOVERY_STATE: SALVAGE_PARTIAL_CLEAN_SUCCESSOR
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: OWNER_PROCEED
CRITICALITY: ENGINEERING_CRITICAL
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_PREDECESSOR: PR #1270
PR: #1432
BRANCH: agent/lafea3-local-refinement-current-main-salvage-20260825
MAIN_HEAD_LAST_CHECKED: a8631581eb440fc69e0164f0a397086bf53bbb52
CURRENT_STAGE: CURRENT_MAIN_PRODUCTION_SALVAGE_PENDING_EXECUTION
APPENDIX_A_STATUS: PASS 98/100, minimum 19/20
```

## Handover in 60 seconds

PR1432 is the clean current-main successor to stale/contaminated PR1270. It carries only the real LAFEA.3 retained-refinement production correction: one source-authoritative mapped remesh route plus an independent actual shared-edge adjacent-size gate before v2 mesh custody. It deliberately excludes PR1270's unrelated EMP.1 repairs, stale UI copies, workflow changes, registry changes, B01/B02 mechanics, and LAFEA.4 TECH-13 work.

Current exact base `a8631581...` differs from the initial grounding base only by merged Load Calc PR1430, which has no LAFEA path/authority overlap.

Current-head executable qualification is NOT_RUN because hosted runners still fail before steps and no exact local checkout is available. Historical predecessor evidence is provenance only, not current-head PASS.

## Mission / production trace

```text
current LAFEA.3 source authority
-> current analysis domain + geometry evidence
-> retained parent v2 analysis mesh
-> governed local-refinement command/plan
-> source-authoritative affine mapped regeneration
-> generic mesh quality
-> actual shared-edge characteristic-length ratio
-> v2 analysis-mesh evidence
-> retained mesh custody
-> existing preflight/solver consumes that retained mesh
```

## Takeover / salvage decision

`SALVAGE_PARTIAL + CLEAN_SUCCESSOR`.

Reasons:

- PR1270 remained open/draft with 78 commits and 19 files.
- its live diff included unrelated EMP.1 production/test files despite a LAFEA.3 assignment;
- its original stack parent PR1268 is already merged;
- it had no reviews or review threads to preserve;
- current main is hundreds of commits beyond its old merge base;
- the critical retained-refinement core files were byte-identical from PR1270 merge base `d24a5a1...` through initial salvage base `920d0ec...`, proving the core correction was not superseded;
- presentation files did move and are intentionally not copied from the stale branch.

PR1270 remains provenance for the first-failure RCA and historical exact-head evidence, not a promotion vehicle.

## First proven failure and retained correction

Predecessor RCA:

```text
parent max adjacent ratio ~= 1.34088    PASS
old radial/Delaunay child ~= 1.98579    BLOCK
radial halo candidate     ~= 1.97822    BLOCK
qualified limit                       = 1.5
```

The failure was post-generation actual topology, not the planned sizing field and not a solver/benchmark/tolerance problem. The threshold was not relaxed.

The retained correction uses `SOURCE_AFFINE_BALANCED_METRIC_GRID_V1` inside a deliberately narrow first-production envelope. It does not self-certify: `createLafeaAnalysisMeshEvidenceV2()` independently recomputes actual shared-edge longest-corner-edge ratios for LAFEA.3 `:LOCAL_REFINEMENT:` meshes before custody.

## Exact scope

Production:

1. `src/core/lafea-meshing/refinement-fields.js`
2. `src/workspace/lafea-analysis-mesh-evidence-v2.js`
3. `src/workspace/lafea-retained-mesh-refinement-grading.js`
4. `src/workspace/lafea-retained-mesh-refinement.js`

Focused qualification:

5. `scripts/lafea3-mapped-refinement-envelope-check.mjs`

Recovery:

6. `agents/PR1432_workreport.md`
7. `agents/status/PR1432.yaml`
8. `agents/claims/PR1432.yaml`

No workflow YAML, EMP.1, stage registry, release authority, solver, recovery, B01/B02 benchmark definition, or LAFEA.4 refinement file is in scope.

## Protected engineering invariants

```text
bound adjacentSizeRatioMax remains authoritative; historical product value 1.5
minimum LAFEA.3 local/global target ratio remains 0.25
scaled-Jacobian threshold unchanged
Q8 local refinement remains unqualified
maximum refinement targets = 1
qualified source geometry = one straight four-sided affine/parallelogram outer loop
minimum included angle = 75 deg
maximum side-length ratio = 10/3
minimum target parametric offset = 0.15
element families = T3/T6 only
no solver/formulation/recovery change
no benchmark target/tolerance change
no generic passing v2 evidence schema/hash widening
no registry/release authority widening
```

## Historical predecessor qualification — provenance only

On predecessor exact head `beaccbcac2dd553e7ac9778675d8bcae1ed84115`:

```text
mapped-envelope positives         48 / 48 PASS
maximum actual adjacency          1.3282147318170396 < 1.5
maximum axis interval ratio       1.4560120314109846 < 1.5
minimum scaled Jacobian           0.23728455020922165 > 0.2
minimum angle                     13.726327548800704 deg
threshold changes                 false
```

Fail-closed cases included unqualified 55°/65° geometry, side ratio 4, target offset 0.14, multiple targets, growth 1.4 and Q8.

This does not count as execution PASS for PR1432.

## Current validation ledger

| ID | Gate | Status | Observation | Oracle |
|---|---|---|---|---|
| V1432-01 | exact-file custody from predecessor for unchanged-base core files | PASS | SOURCE_INSPECTION / Git blob identity | repository custody |
| V1432-02 | current-main base movement `920d0ec -> a863158` | PASS / unrelated | SOURCE_INSPECTION | path + authority classification |
| V1432-03 | focused mapped-envelope Node check | NOT_RUN | execution environment unavailable | product regression + actual topology gate |
| V1432-04 | existing retained-refinement replay/custody check | NOT_RUN | execution environment unavailable | product regression |
| V1432-05 | LAFEA.3 browser path | NOT_RUN | hosted runner unavailable | product regression |
| V1432-06 | broad build/import checks | NOT_RUN | hosted/local execution unavailable | repository closure |

No unexecuted check is PASS.

## Failure classification after execution recovers

Stop at the first executed authoritative failure:

```text
SOURCE/DOMAIN/GEOMETRY PARENT
REFINEMENT COMMAND/PLAN
MAPPED CONSTRUCTION
GENERIC QUALITY
ACTUAL ADJACENCY
V2 EVIDENCE
CUSTODY
PREFLIGHT/SOLVER CONSUMPTION
```

Do not weaken the 1.5 adjacency authority, 0.2 scaled-Jacobian gate, 0.25 target ratio, frozen benchmark values or solver tolerances to obtain green status.

## Coordination

- PR1270: predecessor/superseded promotion vehicle; contamination is intentionally not carried.
- PR1174: Mesh Workspace v3 pre-authority; no v3 activation here.
- PR1258/1259: B01/B02 numerical mechanics; untouched.
- PR1246: LAFEA.4 TECH-13 refinement; untouched.

Current classification: `COORDINATION_REQUIRED_BUT_BOUNDED`.

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

Points withheld only because current-main execution is unavailable.

## EXACT_NEXT_ACTION

When a real runner or exact local checkout is available, on the exact PR head run the focused mapped-envelope and existing retained-refinement replay first. If both pass, continue LAFEA source/build/browser checks. If the first authoritative failure is in this five-file seam, isolate that boundary before any mechanics change. Do not merge until current-head execution evidence is green or the Owner explicitly changes the evidence requirement.
