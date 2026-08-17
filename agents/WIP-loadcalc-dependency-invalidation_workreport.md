# WIP — LoadCalc Dependency-Directed Invalidation

- Branch: `agent/loadcalc-performance-dependency-invalidation-main8fba`
- Exact base: `8fba59cd1ea3e2c712e62419bf43fd639d70db06`
- Criticality: `ENGINEERING_CRITICAL`
- Merge authority: OWNER ONLY

## Mission
Remove false refresh/rebuild dependencies in LoadCalc without changing engineering authority.

## Grounded findings
- LoadCalc previously called `refreshTopologyCheck()` for Project Data and Master Data engineering notifications.
- The canonical topology-check basis contains dataset identity/version/SHA, topology graph hash, attachment-model hash, restraint-model hash, and gap-review tolerance. Master Data and Project Data are absent.
- EngineeringModelController previously rebuilt support-site and route-partition models for every Project Data edit.
- Those builders consume only support-site grouping tolerance, port-match tolerance, auto-carrier coincidence tolerance, and route-joining rules.

## Implemented boundary
- Master changes still stale common/empirical authority and refresh empirical authorization once, but are routed as `reason: authorization-changed` with `governingChange: master-data-changed` so LoadCalc does not request topology refresh.
- Project Data changes always stale common/empirical authority and refresh empirical authorization once.
- Support/route models rebuild only when the four-value Project Data topology-model basis changes.
- Project/master governing-change identity is retained separately so Empirical V3 remains fail-closed.
- Dataset/topology/restraint/gap-review topology-check triggers are unchanged.

## Quantitative target
```text
master-data change: false topology refresh 1 -> 0; empirical refresh 2 -> 1
load-only Project Data: support/route rebuild 1 -> 0; false topology refresh 1 -> 0; empirical refresh 2 -> 1
topology-policy Project Data: support/route rebuild 1 -> 1; false topology refresh 1 -> 0; empirical refresh 2 -> 1
```
These are event-chain operation counts, not wall-clock claims.

## Protected invariants
No topology checker basis, Project Data authority, topology tolerances, support/route formulas, master semantics, empirical methods, blocker/readiness rules, output schemas, evidence hashes, or workflow files change.

## Qualification
- `scripts/loadcalc-dependency-invalidation-check.mjs` exercises actual controller seams with counters.
- `scripts/loadcalc-dependency-invalidation-structural-check.mjs` guards routing and topology-dependency boundaries.
- Exact-head execution remains `NOT_RUN` until an executable checkout is available. No NOT_RUN result is represented as PASS.
