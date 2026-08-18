# WIP — P1 Required Stage Observability

## Identity

- Branch: `agent/p1-stage-observability-main585a`
- Exact base: `585a897afa0f5c9799cb68a58de00a55808062b3`
- Criticality: `ENGINEERING_CRITICAL` because timing wrappers surround support/route and viewport engineering-artifact construction
- Scope: measurement-only
- Merge authority: OWNER ONLY

## Mission

Close the currently named P1 stage-observability gap without introducing a second telemetry framework or changing engineering results.

The governed P1 observer requires exactly:

- SUPPORT_SITE_CONSTRUCTION
- ROUTE_CONSTRUCTION
- MODEL_ZONE_PROJECTION
- RESOLVED_GEOMETRY_CONSTRUCTION
- RENDER_MODEL_CONSTRUCTION
- THREE_MATERIALIZATION
- SCENE_INSTALLATION
- FIT

Three materialization, scene installation and fit were already measured through the existing gated `non-fea-p0-observability.js` User Timing path. This slice adds the five missing ownership boundaries and points P1 at that same namespace.

## Production wrappers

`EngineeringModelStore.rebuild()`:

```text
SUPPORT_SITE_CONSTRUCTION -> buildSupportSiteModel(dataset, profile)
ROUTE_CONSTRUCTION        -> buildRoutePartitionModel(dataset, profile)
```

`ViewportPanel.renderDataset()`:

```text
MODEL_ZONE_PROJECTION             -> projectDatasetForModelZone(...)
RESOLVED_GEOMETRY_CONSTRUCTION    -> buildResolvedEngineeringGeometry(...)
RENDER_MODEL_CONSTRUCTION         -> buildViewportRenderModel(scoped)
```

Existing `three-viewport-scene.js` remains unchanged and already emits:

```text
THREE_MATERIALIZATION -> workspace:p0:THREE_MATERIALIZATION
SCENE_INSTALLATION    -> workspace:p0:GPU_SCENE_INSTALL
FIT                   -> workspace:p0:FIT
```

## Gating

No timing is active in ordinary production use.

The P1 Playwright run now opens:

`/?nonFeaP0Evidence=1`

which activates the existing gated User Timing path before the authoritative fixture is imported.

## P1 evidence semantics

The observer's required stage IDs are unchanged. Only the underlying measure names now point to the existing `workspace:p0:*` namespace.

Important anti-regression: `detailedStageMeasurements()` still uses the **first matching measure entry**. An intermediate edit that summed all later action occurrences was detected and reverted before PR creation. Therefore initial-stage evidence semantics remain unchanged.

## Protected invariants

No change to:

- support-site input/output/schema/hash;
- route partition input/output/schema/hash;
- model-zone projection result;
- resolved engineering geometry result;
- viewport render model result;
- Three materialization or installation behavior;
- fit behavior;
- P1 stage IDs/schema;
- P1 invalidation evidence schema;
- numerical method, tolerance, blocker/readiness, source/evidence authority;
- workflows.

## Qualification asset

`scripts/p1-required-stage-observability-check.mjs` asserts:

- all five new wrappers surround the exact existing production functions;
- the three existing Three/FIT measures remain present;
- all eight P1 stage IDs map to the correct `workspace:p0:*` measure names;
- first-occurrence evidence semantics remain `[0]` rather than aggregation;
- the P1 browser run explicitly enables `nonFeaP0Evidence=1`.

Status: AUTHORED / NOT_RUN in a complete checkout.

## Browser authority blocker remains

This PR closes source-level stage observability, but it does not grant a valid P1 run by itself.

Current P0/P1 repository evidence still records the 4,884 fixture as external and unbound:

```text
path = null
bindingSource = UNBOUND
status = UNBOUND
expected SHA-256 = 88e62782772d743e9236d13775476826f9649ab06d3161de35dc500baa85a9c6
```

P0 owner acceptance is false. Therefore current-head P1 browser timing remains NOT_RUN / BLOCKED until the accepted fixture bytes/path are bound and P0 acceptance exists.

## Changed-file ledger

Production:
- `src/workspace/engineering-model-store.js`
- `src/workspace/viewport-panel.js`

Qualification/browser harness:
- `e2e/p1-browser-observer.js`
- `e2e/p1-current-main-performance.spec.js`
- `scripts/p1-required-stage-observability-check.mjs`
- `agents/WIP-p1-required-stage-observability_workreport.md`

No workflow file changes.

## Validation truth

- exact-base branch creation: PASS;
- production diff containment after first implementation: PASS by GitHub compare;
- intermediate evidence-aggregation regression: FOUND and FIXED before PR;
- P1 first-occurrence evidence semantics: PASS by final source inspection;
- structural anti-drift check: AUTHORED / NOT_RUN;
- exact 4,884 P1 browser run: NOT_RUN / fixture/P0 authority blocked;
- build/import/repository gate: NOT_RUN.

No NOT_RUN is represented as PASS.

## Falsifier

Reject this slice if timing-enabled execution changes any returned engineering artifact, hash/evidence identity, blocker/readiness state, render-model content, camera state beyond the existing fit operation, or P1 evidence semantics.

## EXACT_NEXT_ACTION

Run the structural guard and existing affected tests on an execution-capable exact PR head. Keep the PR draft. Once the governed 4,884 fixture is explicitly bound and P0 accepted, execute P1 and require `observabilityGaps=[]` before using stage timings to select another optimization.