# WIP — SJSON Staged Identity Search Performance

- Branch: `agent/sjson-identity-search-performance-main69921`
- Exact base: `69921a19a01b30744e42c212c65075bdda8b30b4`
- Scope: staged source identity extraction only
- Merge authority: OWNER ONLY

## Grounded hotspot
For every staged source node, `inheritedIdentity()` previously called `firstSourceValue()` independently for four fields: `lineId`, `branchId`, `systemId`, and `zoneId`. Each call built a normalized alias `Set` and recursively searched the same source record with direct-key-before-nested DFS semantics through depth 4.

For the 4,884-node reference scale:
- primary `item` identity-search starts: `4,884 × 4 = 19,536`;
- normalized alias-set constructions: `4,884 × 4 = 19,536`.

## Implemented
- precompile the four normalized alias sets once at module initialization;
- replace four independent recursive identity searches with one combined per-record traversal;
- retain the legacy root sequence: `item`, `sourceAttributes`, `attributes`, `enrichedAttributes`;
- retain direct keys before nested keys, object insertion order, depth `<= 4`, first match per field per root, falsy-match retry only at the next root, parent inheritance, and BRANCH name override.

## Quantitative operation-count target
```text
4,884-node reference
primary item identity-search starts   19,536 -> 4,884   (-75%)
normalized alias Set constructions    19,536 -> 4       (-99.9795%)
```
These are deterministic algorithmic counts, not wall-clock speedup claims.

## Protected invariants
No source entity ID rules, source node keys, JSON pointers, hierarchy, diagnostics, duplicate handling, branch-name parsing, line/service/class propagation, index schema, source snapshot/hash, normalized entity schema, engineering equations, or evidence authority changes.

## Qualification assets
- `tests/staged-model-index-identity-performance.test.mjs`: direct/nested/root precedence, falsy fallback, inheritance, depth-four boundary, truthy-object stringification, BRANCH override.
- `tests/staged-model-index-identity-legacy-equivalence.test.mjs`: independent copy of the removed legacy generic identity-search algorithm used as an oracle.
- `scripts/staged-model-index-identity-performance-check.mjs`: structural anti-drift and operation-count guard.

## Executed evidence in this session
Full repository checkout remains blocked by DNS, so the exact connector-sourced module and its small neutral dependency closure were reconstructed offline for execution.

- targeted Node tests: **PASS — 5/5**;
- independent legacy-oracle test: **PASS**;
- generated 4,884-node mixed parity run: **PASS — 0 identity mismatches**;
- reconstructed 4,884-node index elapsed time: ~139 ms on this runtime, recorded only as observational context, not a before/after claim.

## Remaining qualification truth
- exact branch diff containment: **PASS** by GitHub compare;
- full repository exact-head checkout: **INFRASTRUCTURE_BLOCKED / NOT_RUN** (`Could not resolve host: github.com`);
- full existing staged/shared-model regression suite: **NOT_RUN**;
- browser/repository release gates: **NOT_RUN**;
- GitHub Actions/status evidence: to be checked after PR creation.

No NOT_RUN result is represented as PASS.
