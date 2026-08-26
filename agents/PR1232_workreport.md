# PR1232 Work Report — LoadCalc Empirical Binding Currentness

## Identity

- PR: #1232
- Branch: `agent/loadcalc-performance-binding-currentness-main8fba`
- Exact base SHA: `8fba59cd1ea3e2c712e62419bf43fd639d70db06`
- Criticality: `ENGINEERING_CRITICAL`
- Merge authority: OWNER ONLY
- PR state: DRAFT

## Mission

Remove repeated semantic hashing and authorized empirical binding reconstruction while retaining the exact existing engineering identity values.

## Governing rule

```text
SHA-256 / semantic hash = engineering identity and provenance
runtime revision        = cache currentness only
```

Runtime revisions are never serialized into authorized bindings and never replace engineering hashes.

## Baseline

Each `EngineeringModelStore.#currentEmpiricalBindings()` call recomputed semantic hashes for:

- `dataset.sharedModel`;
- support-site model;
- route-partition model;
- Project Data profile;

and rebuilt/froze the same binding record when all authoritative dependencies were unchanged.

`ProjectDataStore` also repeatedly hashed the same frozen profile from getter/event/origin paths.

## Implementation

### Project Data ownership boundary

Each installed immutable Project Data profile instance receives one cached semantic hash. A separate monotonic runtime revision records currentness. The engineering profile's own `revision` field is unchanged.

### Engineering artifact ownership boundary

`EngineeringModelStore.rebuild()` retains exact binding-domain semantic hashes for:

- full `dataset.sharedModel` object;
- support-site model;
- route-partition model.

A `WeakMap` caches these hashes by immutable object identity. Rebuilding around the same SharedPipingModel object reuses that exact hash; new support/route artifacts are hashed once.

The SharedPipingModel embedded `semanticHash` is deliberately **not** substituted because its payload domain differs from the old runtime binding expression `semanticHash(dataset.sharedModel)`. The optimization caches the old full-object result instead.

### Binding currentness basis

The frozen authorized empirical binding object is cached against:

```text
EngineeringModelStore model runtime revision
ProjectDataStore runtime revision
datasetId
datasetVersion
dataset source SHA-256
line-list source SHA-256
piping-class source SHA-256
component-weight source SHA-256
```

These are exactly the mutable/currentness dependencies represented by the existing binding contract.

`materialMap` is intentionally excluded because it is not represented in that contract.

## Rejected over-optimization

An intermediate design would have threaded `MasterDataController.getRevisionSnapshot()` through `AuthorizedEnrichmentConsumerController`.

That design was rejected before integration because the binding contains master **source hashes**, not row/mapping revisions. The source SHA strings are already cheap and are part of the cache basis. Adding master revision plumbing would increase coupling and invalidate bindings for changes that do not alter binding identity.

The authorized consumer API therefore remains unchanged.

## Protected invariants

Unchanged:

- dataset/source SHA-256 values;
- line-list, piping-class and component-weight source hashes;
- every authorized empirical binding key and value;
- semantic-hash payload/domain of binding identities;
- Project Data engineering `revision` meaning;
- support-site and route model schemas;
- topology/support tolerances;
- empirical equations/methods;
- readiness/blocker logic;
- calculation/evidence/output schemas;
- workflow files.

## Operation-count target

For a stable currentness basis after first construction:

```text
refresh-time artifact/profile semanticHash calls  4 -> 0
refresh-time binding reconstruction               1 -> 0
binding cache hit                                 0 -> 1
```

Hashing is not removed. Every newly installed immutable profile/artifact is still hashed once at its ownership boundary.

## Qualification assets

### `scripts/loadcalc-binding-currentness-check.mjs`

Runtime fixture asserts:

1. repeated Project Data hash reads compute once per immutable profile instance;
2. restoring semantically identical approved Project Data preserves semantic identity while advancing runtime revision;
3. first EngineeringModelStore rebuild computes three artifact hashes;
4. two identical empirical refreshes produce one binding build plus one cache hit;
5. material-map-only source change does not invalidate empirical bindings;
6. component-weight source SHA change invalidates empirical bindings;
7. rebuilding the same dataset reuses the shared-model hash while hashing the newly created support/route artifacts.

### `scripts/loadcalc-binding-currentness-structural-check.mjs`

Source guard asserts:

- Project Data getter/publish paths do not re-run `semanticHash()`;
- all existing authorized binding identity fields remain present;
- binding refresh no longer directly hashes shared/support/route/profile objects;
- the currentness basis contains only relevant runtime/source identities;
- material map is absent from this dependency;
- SHA-256 validation remains in the binding path.

## Validation ledger

| Check | Status | Evidence |
|---|---|---|
| Exact-main grounding | PASS | branch created from `8fba59cd1ea3e2c712e62419bf43fd639d70db06` |
| Bounded diff review | PASS | GitHub compare: two production files + qualification/custody files |
| Inspected open-PR overlap | PASS for inspected candidates | no production overlap found; PR #1022 is LAFEA UI-only |
| Local exact-head checkout | INFRASTRUCTURE_BLOCKED / NOT_RUN | `Could not resolve host: github.com` |
| Runtime currentness check | AUTHORED / NOT_RUN | `scripts/loadcalc-binding-currentness-check.mjs` |
| Structural currentness guard | AUTHORED / NOT_RUN | `scripts/loadcalc-binding-currentness-structural-check.mjs` |
| Existing empirical regression | NOT_RUN | executable checkout unavailable |
| Browser/repository gates | NOT_RUN | executable checkout unavailable |

No NOT_RUN result is represented as PASS.

## Changed-file ledger

- `src/workspace/project-data/project-data-store.js`
- `src/workspace/engineering-model-store.js`
- `scripts/loadcalc-binding-currentness-check.mjs`
- `scripts/loadcalc-binding-currentness-structural-check.mjs`
- `agents/WIP-loadcalc-binding-currentness_workreport.md`
- `agents/PR1232_workreport.md`

## Falsifier

Reject/quarantine this optimization if exact-head execution changes any:

- authorized binding key/value;
- source SHA validation behavior;
- authorization freshness transition;
- readiness/blocker outcome;
- empirical calculation/output semantic identity for equivalent authoritative input;
- Project Data semantic identity for equivalent content.

## Highest current risk

The authored runtime fixtures have not executed on the exact PR head because repository checkout remains network-blocked.

## EXACT_NEXT_ACTION

```text
Run both new currentness checks plus existing authorized empirical and browser/repository regressions on the exact PR head. Compare authorized bindings and empirical output identity to the pre-PR base before merge disposition.
```
