# WIP — Evidence Alias Normalization Cache

- Branch: `agent/evidence-alias-normalization-cache-main69921`
- Exact base: `69921a19a01b30744e42c212c65075bdda8b30b4`
- Scope: shared-piping-model evidence index lookup only
- Merge authority: OWNER ONLY

## Grounded hotspot
The evidence index is already built once per entity, which is retained. However, every `findFirstIndexedEvidence()` / `findAllIndexedEvidence()` call normalized each static alias string again with regex replacement + uppercasing.

Static property/support alias arrays are frozen in `property-specs.js`, and support fallback groups are also frozen. For the current specs:
- non-support entity lookup path: 79 alias normalizations/entity;
- support entity with all fallback groups exercised: up to 115 alias normalizations/entity.

At 4,884 entities:
```text
all non-support reference       385,836 alias normalizations
all support + full fallback     561,660 alias normalizations
```

## Implemented boundary
- `WeakMap` keyed by alias-array identity;
- cache normalized aliases only when `Object.isFrozen(aliases)` is true;
- cache value is itself frozen;
- mutable/dynamic alias arrays are always normalized on every call, so later mutation is observed immediately;
- both `findFirstIndexedEvidence()` and `findAllIndexedEvidence()` consume the same normalized-alias helper;
- root indexing, alias precedence, root precedence, match ordering and evidence values are unchanged.

## Deterministic operation-count target
```text
4,884 all-non-support reference:
  alias normalizations 385,836 -> 79 after static warm-up  (-99.9795%)

4,884 all-support/full-fallback reference:
  alias normalizations 561,660 -> 115 after static warm-up (-99.9795%)
```
These are algorithmic counts, not wall-clock speedup claims.

## Protected invariants
No evidence-index recursion, depth, key normalization rule, property spec, support fallback authority, alias ordering, source-root ordering, evidence source path, diagnostic rule, engineering value normalization, calculation method, evidence schema or hash domain changes.

## Qualification
- exact reconstructed Node test: **PASS 3/3** in this session;
  - frozen arrays normalize once and share cache across first/all lookups;
  - mutable arrays are not cached and mutation is observed;
  - alias-first and root-order precedence remain unchanged.
- structural/operation-count guard: authored;
- exact branch diff containment: pending final GitHub compare;
- full repository checkout: **INFRASTRUCTURE_BLOCKED / NOT_RUN** (`Could not resolve host: github.com`);
- full shared-model/browser/release suites: **NOT_RUN**.

No NOT_RUN result is represented as PASS.
