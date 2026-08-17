# WIP — LoadCalc Dependency-Directed Invalidation

- Branch: `agent/loadcalc-performance-dependency-invalidation-main8fba`
- Creation base: `8fba59cd1ea3e2c712e62419bf43fd639d70db06`
- Criticality: `ENGINEERING_CRITICAL`
- Merge authority: OWNER ONLY

## Mission
Remove false refresh/rebuild dependencies in LoadCalc without changing engineering authority or existing event reason semantics.

## Grounded findings
- LoadCalc previously called `refreshTopologyCheck()` for every Project Data and Master Data engineering notification.
- The canonical topology-check basis contains dataset identity/version/SHA, topology graph hash, attachment-model hash, restraint-model hash, and gap-review tolerance. Master Data and Project Data are absent.
- `EngineeringModelController` previously rebuilt support-site and route-partition models for every Project Data edit.
- `buildSupportSiteModel()` consumes only `topology.supportSiteGroupingToleranceMm`.
- `buildRoutePartitionModel()` consumes only `topology.portMatchToleranceMm`, `topology.autoCarrierCoincidenceToleranceMm`, and `topology.routeJoiningRules`.
- Current `engineeringModelStore.rebuild()` unconditionally invalidates `topologyEditCheckSnapshotStore`; therefore a Project Data change that actually rebuilds derived models must still re-establish the topology snapshot.

## Implemented boundary
- Project Data keeps the existing `reason: project-data-changed` contract.
- A runtime-only stable basis tracks the four values actually consumed by support/route builders.
- Load/evidence/source-only Project Data changes skip support/route rebuild and publish `topologyCheckAffected: false`.
- A Project Data change to any of the four derived-model inputs rebuilds once and publishes `topologyCheckAffected: true`, preserving the required topology refresh after the store invalidates its snapshot.
- Master Data keeps the existing `reason: master-data-changed` contract, never rebuilds support/route models, and publishes `topologyCheckAffected: false`.
- LoadCalc suppresses its heavy topology refresh only when the metadata is explicitly `false`; a legacy publisher that omits the metadata retains the prior fail-safe refresh behavior.
- Project and Master Data always stale common/empirical authority and refresh empirical authorization.
- `src/main.js` and Empirical V3 invalidation stay on their original project/master reason-string contract and are byte-identical to current `main`.
- Dataset/topology/restraint/gap-review topology-check triggers are unchanged.

## Quantitative target
```text
master-data change:
  support/route rebuild            0 -> 0
  false topology refresh request   1 -> 0

load-only Project Data:
  support/route rebuild            1 -> 0
  false topology refresh request   1 -> 0

topology-policy Project Data:
  support/route rebuild            1 -> 1
  topology refresh request         1 -> 1  (required by current rebuild invalidation side-effect)

legacy project/master publisher without dependency metadata:
  topology refresh request         1 -> 1  (fail-safe compatibility)
```
The eliminated topology refresh on Master/load-only changes also eliminates the topology-triggered `refreshAuthorizedEmpiricalPackage()` call that follows a successful canonical check. These are event-chain operation counts, not wall-clock claims.

## Protected invariants
No topology checker basis, Project Data authority, topology tolerances, support/route formulas, master semantics, empirical methods, blocker/readiness rules, output schemas, evidence hashes, Empirical V3 invalidation contract, or workflow files change.

## Qualification
- `tests/engineering-model-controller-dataset-guard.test.mjs` covers load-only 0 rebuild, topology-policy 1 rebuild + recheck metadata, Master 0 rebuild, and conservative uninitialized-basis behavior.
- `tests/load-calc-dependency-invalidation.test.mjs` covers explicit false suppression, explicit true refresh, and legacy fallback.
- `scripts/loadcalc-dependency-invalidation-check.mjs` exercises actual controller seams with operation counters and all-four-input basis sensitivity.
- `scripts/loadcalc-dependency-invalidation-structural-check.mjs` guards the four dependencies, current store invalidation side-effect, explicit metadata path, unchanged topology basis, unchanged `src/main.js` invalidation contract, and legacy fallback.
- Exact-head execution remains `NOT_RUN` while the local environment cannot resolve `github.com` and no automatic PR workflow is present. No NOT_RUN result is represented as PASS.
