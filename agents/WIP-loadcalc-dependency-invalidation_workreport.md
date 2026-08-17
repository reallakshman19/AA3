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
- Those builders consume only support-site grouping tolerance, port-match tolerance, auto-carrier coincidence tolerance, and route-joining rules.

## Implemented boundary
- Project Data keeps the existing `reason: project-data-changed` contract and publishes `topologyCheckAffected: false` because Project Data is not part of the canonical topology-check basis.
- Master Data keeps the existing `reason: master-data-changed` contract and publishes `topologyCheckAffected: false` for the same reason.
- LoadCalc suppresses its heavy topology refresh only when that explicit metadata is `false`; a legacy publisher that omits the metadata retains the prior fail-safe refresh behavior.
- Project Data always stales common/empirical authority and refreshes empirical authorization once.
- Support/route models rebuild only when the four-value Project Data topology-model basis changes.
- Master Data still stales common/empirical authority and refreshes empirical authorization once, but never rebuilds support/route models.
- `src/main.js` and Empirical V3 invalidation stay on their original project/master reason-string contract and are byte-restored to current `main`.
- Dataset/topology/restraint/gap-review topology-check triggers are unchanged.

## Quantitative target
```text
master-data change: false topology refresh request 1 -> 0; support/route rebuild remains 0
load-only Project Data: support/route rebuild 1 -> 0; false topology refresh request 1 -> 0
topology-policy Project Data: support/route rebuild remains 1; false topology refresh request 1 -> 0
legacy project/master publisher without dependency metadata: topology refresh remains 1 (fail-safe compatibility)
```
The eliminated topology refresh also removes the topology-triggered authorized-package refresh that follows a successful canonical check. These are event-chain operation counts, not wall-clock claims.

## Protected invariants
No topology checker basis, Project Data authority, topology tolerances, support/route formulas, master semantics, empirical methods, blocker/readiness rules, output schemas, evidence hashes, Empirical V3 invalidation contract, or workflow files change.

## Qualification
- `scripts/loadcalc-dependency-invalidation-check.mjs` exercises actual controller seams with counters and includes a legacy-publisher fallback assertion.
- `scripts/loadcalc-dependency-invalidation-structural-check.mjs` guards the four dependencies, explicit metadata path, unchanged topology basis, unchanged `src/main.js` invalidation contract, and legacy fallback.
- `tests/engineering-model-controller-dataset-guard.test.mjs` records the preserved reason string plus new dependency metadata.
- Exact-head execution remains `NOT_RUN` while the local environment cannot resolve `github.com` and no automatic PR workflow is present. No NOT_RUN result is represented as PASS.
