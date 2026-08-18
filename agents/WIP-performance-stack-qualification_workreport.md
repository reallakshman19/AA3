# WIP — Merged Performance Stack Qualification

## Identity

- Branch: `agent/performance-stack-qualification-main68efa`
- Original branch creation base: `68efa98c62537f0fdad127d0ccdd45fb6e8a328f`
- Current production qualification target after concurrent main advance: `585a897afa0f5c9799cb68a58de00a55808062b3`
- Criticality: `ENGINEERING_CRITICAL`
- Scope: qualification-only; no production code or workflow changes
- Merge authority: OWNER ONLY

## Mission

Qualify the combined merged performance stack from PRs #1227, #1229, #1230, #1232, #1237, #1240, #1241 and #1242 on the exact current production tree.

This batch must answer whether the optimizations coexist without changing engineering identity, source/evidence authority, support-load results, blocker/readiness semantics or browser/runtime correctness.

## Main advance during qualification setup

While PR #1243 was being created, `main` advanced by one large LFEA pipeline/UI merge from `68efa98c...` to `585a897a...`.

The new merge does not touch the performance-core files changed by #1227–#1242, but it does change `src/main.js` and `package.json`; therefore build/browser qualification must target `585a897a...`, not the stale performance-only head.

The qualification branch is reconciled onto this exact current main while retaining only qualification files above it.

## Qualification policy

The runner must fail closed when the production tree is not exactly the declared target.

It may run on the qualification branch only when every changed path above the target SHA is qualification-only.

Required targeted checks include:

- Master Data containment;
- support-load execution indexing and base-mass arithmetic;
- empirical formula production fixture;
- LoadCalc binding-currentness structural/runtime checks;
- dependency-directed invalidation structural/runtime checks;
- staged SJSON identity extraction structural/runtime parity checks;
- immutable SourcePackageSnapshot evidence reuse structural/runtime checks;
- frozen evidence-alias cache structural/runtime checks;
- affected repository `node:test` regressions.

Repository build/import and browser P1 gates are separately classified. If they are not explicitly executed, the final classification must remain `TARGETED_PASS_FULL_NOT_RUN`, never `FULL_PASS`.

## Protected invariants

No change is permitted to:

- source SHA-256 or semantic-hash domains;
- dataset identity/version/source-node identity;
- line/branch/system/zone identity semantics;
- normalized entity engineering values;
- SharedPipingModel/support-site/route-partition engineering identity;
- support-load mass, force, allocation, reaction, CoG or equilibrium results;
- empirical blocker/readiness semantics;
- topology tolerances or engineering formulas;
- evidence source paths/order or authorization bindings;
- UI calculation authority.

## Current validation truth

- current-main target custody: **PASS** by GitHub comparison/branch inspection;
- qualification-only diff intent: **PASS**; branch reconciliation pending final compare after this update;
- runner syntax: **PASS** in local Node;
- local exact-head checkout: **INFRASTRUCTURE_BLOCKED / NOT_RUN** (`Could not resolve host: github.com`);
- exact-head GitHub workflow runs: **NONE** at last inspection;
- #1240 targeted reconstructed tests: prior **PASS 5/5** plus 4,884-node **0 identity mismatches**;
- #1242 targeted reconstructed tests: prior **PASS 3/3**;
- #1241 source authority/immutability chain: prior source-inspection **PASS**; exact merged runtime test still requires execution;
- full merged build/import/browser qualification: **NOT_RUN**.

No `NOT_RUN` result may be represented as PASS.

## Coordination

Open-PR scan showed active LAFEA/WRC537 work. The newly merged LFEA pipeline changed `src/main.js`/`package.json`, which is why current-main build/browser qualification is mandatory. This PR itself must not modify `.github/workflows/*` or production files.

## Changed-file ledger

- `agents/WIP-performance-stack-qualification_workreport.md`
- `scripts/performance-stack-exact-head-qualification.mjs`
- planned after PR-number custody update: `agents/PR1243_workreport.md`

## Highest current risk

The stack was merged from individually bounded PRs, some with full repository/browser execution unavailable. The strongest remaining risks are:

1. interaction between runtime currentness/invalidation changes (#1232/#1237);
2. immutable evidence-reference reuse (#1241);
3. browser/build interaction with the newly merged LFEA pipeline on current `main`.

## EXACT_NEXT_ACTION

Reconcile this qualification-only branch onto `585a897afa0f5c9799cb68a58de00a55808062b3`, execute every tractable targeted check from exact merged blobs, and keep repository/browser gates explicitly `NOT_RUN` until actually executed.