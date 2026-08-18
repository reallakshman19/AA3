# PR1243 Work Report — Merged LoadCalc / SJSON Performance Stack Qualification

## Identity

- PR: #1243
- Branch: `agent/performance-stack-qualification-main68efa`
- Current production qualification target: `585a897afa0f5c9799cb68a58de00a55808062b3`
- Original performance-stack merge head: `68efa98c62537f0fdad127d0ccdd45fb6e8a328f`
- Qualification branch head before this report: `680f4a91d409a211b95657d59b145170a7639283`
- Criticality: `ENGINEERING_CRITICAL`
- Scope: qualification-only
- Merge authority: OWNER ONLY
- PR state: DRAFT

## Mission

Qualify the combined merged performance changes from PRs #1227, #1229, #1230, #1232, #1237, #1240, #1241 and #1242 without changing production code, engineering equations, authority, tolerances, hashes or workflows.

The desired answer is not merely that each optimization looked safe in isolation. The combined stack must retain source identity, normalized engineering values, LoadCalc authority/currentness, support-load arithmetic/equilibrium, and browser/runtime correctness on one exact production head.

## Main-race custody

At qualification branch creation, production `main` was:

`68efa98c62537f0fdad127d0ccdd45fb6e8a328f`

While #1243 was being created, `main` advanced to:

`585a897afa0f5c9799cb68a58de00a55808062b3`

through a large LFEA pipeline/UI merge.

The concurrent merge did not touch the performance-core files changed by #1227–#1242, but it did change `src/main.js`, `package.json`, UI/bootstrap paths and browser-facing behavior. Therefore qualification was deliberately retargeted to `585a897a...` rather than claiming the stale `68efa...` tree was still current.

The branch was reconciled with a two-parent commit onto exact `585a897a...`. GitHub compare then reported `behind_by=0` with only qualification files above `main`.

## Qualification runner

Added:

`scripts/performance-stack-exact-head-qualification.mjs`

The runner fails closed unless:

1. the declared target is an exact 40-hex Git object;
2. the current checkout is either the exact target or has that target as an ancestor; and
3. every path above the target is qualification-only.

Qualification-only paths are limited to:

- `scripts/performance-stack-exact-head-qualification.mjs`;
- `agents/WIP-performance-stack-qualification_workreport.md`;
- `agents/PR1243_workreport.md`.

No production or workflow path is allowed above the target.

The runner has separate classifications:

- `FAIL`;
- `FULL_PASS`;
- `TARGETED_PASS_FULL_NOT_RUN`;
- `NOT_RUN`.

An omitted build/browser gate cannot become PASS.

## Targeted runner inventory

The exact-head runner is authored to execute:

1. Master Data containment;
2. support-load execution-index/base-mass structural guard;
3. independent EMPTY/OPE/HYD mass hand check;
4. empirical formula production fixture;
5. LoadCalc binding-currentness structural guard;
6. LoadCalc binding-currentness runtime fixture;
7. LoadCalc dependency-invalidation structural guard;
8. LoadCalc dependency-invalidation runtime fixture;
9. staged SJSON identity operation guard;
10. immutable snapshot evidence-reuse operation guard;
11. frozen evidence-alias cache operation guard;
12. the affected `node:test` regressions.

Optional `--repository-gates` adds:

- `npm run check:imports`;
- `npm run build`.

Optional `--browser` adds the governed 4,884-entity P1 Playwright run with `P1_EXACT_HEAD_SHA` forced to the production target.

## Executed evidence available in this environment

### Q1-A — support-load hand arithmetic

**PASS**.

The exact current-main hand-check source was inspected and executed locally. The preprocessed expression is IEEE-754 identical to the prior left-associated expression:

```text
inside diameter = 154.08 mm
metal            = 134.252021893143 kg
insulation       =  19.545575773942 kg
EMPTY            = 153.797597667084 kg
OPE              = 229.080257741813 kg
HYD              = 242.206010945431 kg
```

For EMPTY/OPE/HYD, `Object.is(oldMass, newMass)` passed.

### Q1-B — staged SJSON identity extraction

**PASS 5/5** using a reconstructed ESM workspace populated from the exact current-main production/test modules.

Coverage includes:

- direct/nested/root precedence;
- parent inheritance;
- depth-four boundary;
- truthy non-string first-match/stringification semantics;
- BRANCH source-name override;
- independent copy of the removed legacy search algorithm.

No identity mismatch was observed in the targeted suite. The earlier 4,884-node generated parity qualification also retained `0` identity mismatches for the unchanged production blobs.

### Q1-C — frozen evidence-alias cache

**PASS 3/3** using exact current-main `evidence-index.js`, neutral immutable primitives and the exact current-main test.

Proved:

- frozen alias arrays normalize once and reuse cached keys;
- mutable aliases are deliberately uncached and mutation is observed;
- alias/root precedence is unchanged.

### Q1-D — immutable SourcePackageSnapshot evidence reuse

**PASS — structural authority/custody guard** against exact current-main source.

The exact current-main source proves:

```text
parsed upload
  -> cloneJsonValue(input.sourcePackage)
  -> deep-frozen SourcePackageSnapshot
  -> staged index reads sourceSnapshot.sourcePackage
  -> normalized entity reuses only frozen snapshot subtrees
```

The structural guard confirms:

- authoritative source-package clone remains `1 -> 1`;
- per-entity evidence `clonePlain()` calls remain `24,420 -> 0` at 4,884 entities;
- `requireImmutableSourceItem()` remains fail-closed on `Object.isFrozen(item)`;
- normalized evidence is not sourced from mutable upload memory.

The full repository execution of `tests/dataset-adapter-immutable-source-reuse.test.mjs` is still **NOT_RUN** in this environment; source-level custody PASS is not represented as that runtime test passing.

### Q1-E — LoadCalc binding currentness

**PASS — exact current-main source-contract audit**.

Verified retained invariants:

- Project Data semantic hash is cached per installed immutable profile instance;
- Project Data runtime revision remains separate from engineering profile revision;
- binding refresh uses precomputed shared/support/route semantic identities;
- runtime basis includes model revision, Project Data runtime revision, dataset identity/version and dataset/Line List/Piping Class/Component Weight SHA identities;
- Material Map remains outside the empirical binding contract;
- SHA-256 provenance validation remains in the binding path;
- immutable artifact hash cache remains keyed by object identity.

The dedicated runtime currentness script remains **NOT_RUN** without a complete executable checkout.

### Q1-F — dependency-directed invalidation

**PASS — exact current-main source-contract audit**.

Verified:

- exactly four Project Data inputs govern support/route rebuild currentness;
- load-only Project Data changes stale empirical/common input but do not rebuild support/route models;
- topology-policy Project Data changes still rebuild and request topology refresh because `EngineeringModelStore.rebuild()` invalidates the stored topology snapshot;
- Master Data changes never rebuild support/route models and publish `topologyCheckAffected:false`;
- LoadCalc suppresses topology refresh only when metadata is explicitly `false`; omitted/true retains the conservative fallback;
- canonical topology-check basis remains dataset/topology/attachment/restraint/tolerance only;
- current `src/main.js`, including the newly merged LFEA pipeline changes, still invalidates Empirical V3 on the original `project-data-changed/master-data-changed` reason contract;
- no `governingChange` / `effectiveChange = governingChange` optimization metadata leaked into `src/main.js`.

The dedicated runtime dependency-invalidation scripts/tests remain **NOT_RUN** without a complete executable checkout.

### Q1-G — support-load index/base-mass source mechanics

**PASS — exact current-main structural/source audit**.

Verified on current production source:

- entity/edge/chainage indexes are distribution-scoped;
- support projection remains only for globally unblocked READY routes;
- base mass is resolved once per unique executable physical entity;
- per-case loop uses the precomputed mass artifact;
- fluid mass remains case-dependent;
- floating-point association remains `(metal + insulation) + fluid`;
- uniform/point distribution and equilibrium seams remain unchanged;
- performance counters remain observational and outside engineering output.

The complete empirical production fixture is still **NOT_RUN** in this environment.

## Gates still NOT_RUN

The following have not executed on one complete exact checkout of `585a897a...` and must remain `NOT_RUN`:

- full `scripts/performance-stack-exact-head-qualification.mjs` targeted runner as one process;
- `scripts/empirical-formula-register-check.mjs` production fixture;
- LoadCalc binding-currentness runtime fixture;
- LoadCalc dependency-invalidation runtime fixture;
- full immutable-source-reuse runtime test;
- full merged affected Node suite as one exact-checkout invocation;
- `npm run check:imports` on exact current head;
- `npm run build` on exact current head;
- 4,884-entity P1 browser timing/invalidation run;
- full release/repository gate.

Direct local checkout is still blocked by DNS:

`Could not resolve host: github.com`

GitHub reports no automatic workflow run on the #1243 head at the latest inspection.

## Q2 — 4,884 browser measurement status

The governed P1 harness exists and requires:

- exact execution ID;
- exact production SHA;
- content-addressed 4,884-entity fixture path;
- accepted source SHA-256 `88e62782772d743e9236d13775476826f9649ab06d3161de35dc500baa85a9c6`;
- current browser evidence;
- current render-owner/long-task/invalidation evidence.

The fixture path is intentionally not inferred from the SHA or substituted with another model. The current environment cannot execute the repository/browser harness, therefore Q2 remains **NOT_RUN / BLOCKED BY EXECUTION ENVIRONMENT**.

No wall-clock performance improvement is claimed from the operation-count reductions alone.

## Changed-file ledger

- `scripts/performance-stack-exact-head-qualification.mjs`
- `agents/WIP-performance-stack-qualification_workreport.md`
- `agents/PR1243_workreport.md`

No production file and no `.github/workflows/*` file is changed.

## Validation ledger

| Gate | Status |
|---|---|
| Current production target custody `585a897a...` | PASS |
| Branch reconciled to current main / `behind_by=0` | PASS |
| Qualification-only diff | PASS |
| Runner syntax | PASS |
| Support-load hand arithmetic | PASS |
| Staged identity targeted suite | PASS 5/5 |
| Evidence alias cache targeted suite | PASS 3/3 |
| Immutable snapshot reuse source/custody guard | PASS |
| Binding-currentness exact-source contract | PASS |
| Dependency-invalidation exact-source contract | PASS |
| Support-load index/base-mass exact-source contract | PASS |
| Integrated empirical production fixture | NOT_RUN |
| Currentness runtime fixture | NOT_RUN |
| Dependency invalidation runtime fixture | NOT_RUN |
| Full immutable-source runtime test | NOT_RUN |
| Exact-head import check | NOT_RUN |
| Exact-head production build | NOT_RUN |
| 4,884 P1 browser run | NOT_RUN |
| Automatic GitHub workflow on PR head | NONE |

No `NOT_RUN` is represented as PASS.

## Current disposition

`PARTIAL_TARGETED_QUALIFICATION_PASS / FULL_EXACT_HEAD_QUALIFICATION_NOT_RUN`

There is currently no observed engineering/numerical mismatch in the executed or source-qualified checks. That is not equivalent to full application qualification.

## Falsifier

Quarantine or revert the performance stack if complete exact-head execution changes any:

- source/dataset semantic identity;
- staged identity field or hierarchy;
- normalized engineering value/evidence source;
- authorized empirical binding field/value;
- stale/current authorization transition;
- topology refresh dependency semantics;
- contribution mass/force/allocation;
- support reaction or contributor order;
- CoG/equilibrium result;
- blocker/readiness content/order;
- output/evidence semantic identity for equivalent authoritative input;
- page error/render-owner contract.

## Highest current risk

The combined stack has not yet executed through the complete current-main empirical + build + 4,884-browser path after the concurrent LFEA UI/pipeline merge.

## EXACT_NEXT_ACTION

```text
On an execution-capable checkout of 585a897afa0f5c9799cb68a58de00a55808062b3 (or the then-current reconciled production head):

1. run `node scripts/performance-stack-exact-head-qualification.mjs --repository-gates`;
2. provide the accepted content-addressed 4,884-entity fixture and run the same runner with `--browser`;
3. accept a performance disposition only if the complete evidence is current to that exact head;
4. do not start the next production optimization from operation counts alone.
```
