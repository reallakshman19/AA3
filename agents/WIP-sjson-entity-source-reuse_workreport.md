# WIP — SJSON Immutable Source Evidence Reuse

- Branch: `agent/sjson-entity-source-reuse-main69921`
- Exact base: `69921a19a01b30744e42c212c65075bdda8b30b4`
- Scope: workspace dataset normalization only
- Merge authority: OWNER ONLY

## Grounded hotspot
`createSourcePackageSnapshot()` already makes the single authoritative JSON clone of the uploaded parsed package and deep-freezes that complete source tree. `normalizeWorkspaceDataset()` then indexes `sourceSnapshot.sourcePackage`, so every staged `item` is already an immutable snapshot record.

Despite that, `buildEntityProperties()` previously ran `clonePlain()` independently for five evidence subtrees on every normalized entity:
- `sourceAttributes`
- `attributes`
- `enrichedAttributes`
- `nativeParams`
- `diagnostics`

For the 4,884-entity reference scale this is up to `4,884 × 5 = 24,420` redundant JSON stringify/parse clone operations after the authoritative snapshot clone has already been created.

## Implemented boundary
- preserve `createSourcePackageSnapshot()` and its `cloneJsonValue(input.sourcePackage)` provenance clone unchanged;
- continue indexing only `sourceSnapshot.sourcePackage`;
- require each entity-normalization source item to be frozen (`Object.isFrozen(item)`), otherwise fail closed;
- reuse the five frozen snapshot subtrees directly inside normalized entity properties;
- use frozen shared empty `{}` / `[]` sentinels when an optional subtree is absent;
- retain every other `clonePlain()` boundary in `dataset-adapter.js`, including dataset source/axis metadata and edit/rebuild cloning.

## Quantitative operation-count target
```text
4,884-entity reference
per-entity source-evidence clonePlain calls   24,420 -> 0   (-100%)
authoritative SourcePackageSnapshot clone          1 -> 1   (preserved)
```
These are deterministic operation counts, not wall-clock speedup claims.

## Protected invariants
No parsed-upload authority, SourcePackageSnapshot hash domain, source semantic hash, source byte hash, staged model index, source entity ID, normalized entity field/value, evidence lookup order, geometry extraction, shared-model conversion, editing semantics, engineering equation, tolerance, blocker/readiness rule, or evidence schema changes.

The normalized dataset remains isolated from the mutable upload object because the reused references come only from the independent deep-frozen SourcePackageSnapshot clone.

## Qualification assets
- `tests/dataset-adapter-immutable-source-reuse.test.mjs`
  - proves upload object and snapshot are different references;
  - proves entity evidence points to frozen snapshot subtrees;
  - proves post-normalization upload mutation cannot alter entity/snapshot evidence;
  - proves missing optional evidence uses frozen empty sentinels.
- `scripts/dataset-adapter-immutable-source-reuse-check.mjs`
  - guards the retained authoritative snapshot clone/freeze;
  - guards indexing through `sourceSnapshot.sourcePackage`;
  - prohibits `clonePlain()` returning inside `buildEntityProperties()`;
  - requires the frozen-source-item guard;
  - records 24,420 -> 0 per-entity evidence clone operations at 4,884 entities.

## Validation truth
- exact branch diff containment / `behind_by=0`: **PASS** by GitHub compare;
- source authority/immutability chain: **PASS** by current source inspection;
- targeted runtime test: **AUTHORED / NOT_RUN** (full dataset-adapter dependency closure not reconstructed locally yet);
- structural operation-count guard: **AUTHORED / NOT_RUN**;
- full repository checkout: **INFRASTRUCTURE_BLOCKED / NOT_RUN** (`Could not resolve host: github.com`);
- full shared-model/browser/release suites: **NOT_RUN**.

No NOT_RUN result is represented as PASS.
