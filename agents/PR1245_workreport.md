# PR1245 Work Report — P1 Required Construction Stage Observability

## Identity

- PR: #1245
- Branch: `agent/p1-stage-observability-main585a`
- Exact base SHA: `585a897afa0f5c9799cb68a58de00a55808062b3`
- Criticality: `ENGINEERING_CRITICAL`
- Scope: measurement-only
- Merge authority: OWNER ONLY
- PR state: DRAFT

## Mission

Expose the governed P1 construction-stage timings at their real ownership boundaries without altering any engineering artifact or introducing a second observability framework.

## Required P1 stage contract

The P1 observer requires:

```text
SUPPORT_SITE_CONSTRUCTION
ROUTE_CONSTRUCTION
MODEL_ZONE_PROJECTION
RESOLVED_GEOMETRY_CONSTRUCTION
RENDER_MODEL_CONSTRUCTION
THREE_MATERIALIZATION
SCENE_INSTALLATION
FIT
```

Before this PR, the browser observer expected `workspace:p1:*` measures that production did not emit. The real viewport already emitted Three materialization, scene-install and fit timing through the gated `workspace:p0:*` observer. This PR reuses that authority and adds the five missing construction timings.

## Production ownership

### EngineeringModelStore

`rebuild(dataset)` retains identical arguments/results but wraps:

```text
buildSupportSiteModel(dataset, profile)
  -> SUPPORT_SITE_CONSTRUCTION

buildRoutePartitionModel(dataset, profile)
  -> ROUTE_CONSTRUCTION
```

### ViewportPanel

`renderDataset(dataset, preview)` retains identical dataflow but wraps:

```text
projectDatasetForModelZone(dataset, this.zoneSelection)
  -> MODEL_ZONE_PROJECTION

buildResolvedEngineeringGeometry(dataset, profile, supportSites)
  -> RESOLVED_GEOMETRY_CONSTRUCTION

buildViewportRenderModel(scoped)
  -> RENDER_MODEL_CONSTRUCTION
```

The projection/filter/callout/render order is unchanged.

### Existing Three ownership

No production change was made to `three-viewport-scene.js`. It already emits:

```text
workspace:p0:THREE_MATERIALIZATION
workspace:p0:GPU_SCENE_INSTALL
workspace:p0:FIT
```

P1 maps `GPU_SCENE_INSTALL` to the governed stage ID `SCENE_INSTALLATION`.

## Gating

The P1 browser route now opens:

`/?nonFeaP0Evidence=1`

The existing observability helper therefore activates only in the governed evidence run. Ordinary production behavior remains the existing direct-callback path.

## Evidence semantics protection

The observer's stage IDs and persisted schema are unchanged.

`detailedStageMeasurements()` continues to take:

```text
performance.getEntriesByName(measureName, 'measure')[0]
```

An intermediate implementation accidentally summed all later occurrences. This would have contaminated initial-stage evidence with Master/Project/Zone/reload actions. It was detected and reverted before PR creation.

Therefore this PR changes only the backing measure-name namespace and missing measurement availability, not first-occurrence evidence semantics.

## Protected invariants

Unchanged:

- support-site and route inputs/results/hashes;
- Project Data topology semantics;
- model-zone projection content;
- resolved engineering geometry content;
- render-model content/order;
- Three object/material construction;
- scene installation behavior;
- fit behavior;
- P1 action/invocation IDs;
- P1 evidence schemas and stage IDs;
- engineering equations, tolerances, blockers/readiness;
- source/evidence authority;
- workflows.

## Qualification

### Source/diff custody

GitHub compare on the pre-PR head reported `behind_by=0` and exactly six intended paths:

Production:
- `src/workspace/engineering-model-store.js`
- `src/workspace/viewport-panel.js`

Qualification/browser:
- `e2e/p1-browser-observer.js`
- `e2e/p1-current-main-performance.spec.js`
- `scripts/p1-required-stage-observability-check.mjs`
- `agents/WIP-p1-required-stage-observability_workreport.md`

PR report is the seventh custody file after PR creation.

Production delta was +26/-9 lines across two files. No workflow or contract module changed.

### Structural guard

`scripts/p1-required-stage-observability-check.mjs` proves:

- five new wrappers surround the exact existing builders;
- Three/FIT existing measures remain;
- all eight required stage IDs map to exact `workspace:p0:*` names;
- first-occurrence `[0]` semantics remain;
- aggregation is prohibited;
- P1 explicitly enables the gated timing route.

Status: **AUTHORED / NOT_RUN** in a complete repository checkout.

### Browser execution

**NOT_RUN / BLOCKED**.

The governed 4,884 fixture is still external/unbound and P0 acceptance remains false. This PR does not substitute any fixture or grant acceptance.

Required fixture identity remains:

```text
SHA-256      88e62782772d743e9236d13775476826f9649ab06d3161de35dc500baa85a9c6
entityCount  4884
pipeCount    3277
supportCount 1331
```

## Validation ledger

| Gate | Status |
|---|---|
| Exact base grounding | PASS |
| `behind_by=0` before PR creation | PASS |
| Bounded production diff | PASS |
| Five owner wrappers | PASS by exact source inspection |
| Existing Three/FIT ownership | PASS by exact source inspection |
| First-occurrence evidence semantics | PASS by exact source inspection |
| Structural guard | AUTHORED / NOT_RUN |
| Exact 4,884 P1 browser | NOT_RUN / fixture + P0 authority blocked |
| Build/import/repository gates | NOT_RUN |

No NOT_RUN is represented as PASS.

## Current disposition

`SOURCE_OBSERVABILITY_IMPLEMENTED / GOVERNED_P1_EXECUTION_STILL_BLOCKED`

This PR can remove the source-level observability-gap reason once executed, but it cannot create a valid P1 performance result without fixture binding, owner acceptance and exact-head browser evidence.

## Falsifier

Reject/quarantine if instrumentation changes any builder return value, semantic hash, blocker/readiness state, render-model content, camera state beyond the already-existing fit, or P1 first-occurrence evidence semantics.

## Highest current risk

The five wrappers have not executed in the full browser/application path on the exact PR head. The source changes are intentionally small, but support/route and render-model ownership are engineering-critical boundaries.

## EXACT_NEXT_ACTION

Run the structural guard and affected application tests on an execution-capable exact PR head. Keep #1245 draft. Bind the approved 4,884 fixture and obtain P0 owner acceptance; then execute P1 and require `observabilityGaps=[]` before choosing another production optimization.