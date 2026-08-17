# WIP — LoadCalc Binding Currentness / Semantic-Hash Performance

- Branch: `agent/loadcalc-performance-binding-currentness-main8fba`
- Exact base: `8fba59cd1ea3e2c712e62419bf43fd639d70db06`
- Criticality: ENGINEERING_CRITICAL
- Merge: OWNER ONLY

## Mission
Remove repeated semantic hashing and empirical-binding reconstruction without weakening provenance.

Rule: `SHA-256 / semantic hash = engineering identity`; `runtime revision = cache currentness only`.

## Current findings
- `EngineeringModelStore.#currentEmpiricalBindings()` re-hashes shared model, support-site model, route-partition model and Project Data profile on every refresh.
- Those engineering artifacts are immutable/deep-frozen at their ownership boundaries.
- SharedPipingModel's embedded `semanticHash` is not substituted because current bindings hash the full model object; preserve the existing hash domain exactly.
- MasterDataController already has monotonic per-master revisions.

## Bounded implementation
- cache Project Data profile hash when the immutable profile is installed;
- add monotonic Project Data runtime revision separate from engineering profile `revision`;
- cache shared/support/route binding hashes at EngineeringModelStore rebuild;
- add model runtime revision;
- cache frozen empirical bindings by model revision + Project Data runtime revision + line-list/piping-class/weight revisions;
- ignore material-map-only revision for this binding dependency;
- production consumer supplies revision snapshots;
- missing revision basis uses conservative binding reconstruction.

## Protected invariants
No provenance SHA changes, semantic-hash domain changes, binding value changes, engineering revision changes, equations/tolerances, readiness rules, evidence schemas or workflows.

## Qualification target
One rebuild => 3 artifact hashes. Same relevant revision basis => 1 binding build then cache hits with no artifact rehash. Material-map-only change => cache hit. Weight revision change => rebuild binding; if source hashes unchanged, binding values remain identical.

Executable repository/browser qualification remains NOT_RUN until run.
