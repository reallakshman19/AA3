# WIP — Merged Performance Stack Qualification

## Identity

- Branch: `agent/performance-stack-qualification-main68efa`
- Exact creation base: `68efa98c62537f0fdad127d0ccdd45fb6e8a328f`
- Criticality: `ENGINEERING_CRITICAL`
- Scope: qualification-only; no production code or workflow changes
- Merge authority: OWNER ONLY

## Mission

Qualify the combined merged performance stack from PRs #1227, #1229, #1230, #1232, #1237, #1240, #1241 and #1242 on one exact repository head.

This batch must answer whether the optimizations coexist without changing engineering identity, source/evidence authority, support-load results, blocker/readiness semantics or browser/runtime correctness.

## Current merged head

`68efa98c62537f0fdad127d0ccdd45fb6e8a328f`

## Qualification policy

The runner must fail closed when the checkout SHA is not the declared exact head.

Required targeted checks include:

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

- exact current-main grounding: **PASS** by GitHub branch inspection;
- local exact-head checkout: **INFRASTRUCTURE_BLOCKED / NOT_RUN** (`Could not resolve host: github.com`);
- exact-head GitHub workflow runs: **NONE** at last inspection;
- #1240 targeted reconstructed tests: prior **PASS 5/5** plus 4,884-node **0 identity mismatches**;
- #1242 targeted reconstructed tests: prior **PASS 3/3**;
- #1241 source authority/immutability chain: prior source-inspection **PASS**; exact merged runtime test still requires execution;
- full merged build/import/browser qualification: **NOT_RUN**.

No `NOT_RUN` result may be represented as PASS.

## Coordination

Open-PR scan at branch creation showed active LAFEA/WRC537 work, but no current PR targeting the planned qualification-only paths. This PR must not modify `.github/workflows/*`.

## Changed-file ledger

- `agents/WIP-performance-stack-qualification_workreport.md`
- planned: `scripts/performance-stack-exact-head-qualification.mjs`

## Highest current risk

The stack was merged from individually bounded PRs, some with full repository/browser execution unavailable. The strongest remaining risk is interaction between optimizations on the final combined head, especially immutable evidence-reference reuse (#1241) and runtime invalidation/currentness (#1232/#1237).

## EXACT_NEXT_ACTION

Create and inspect the exact-head qualification runner, then execute every tractable targeted check on the merged head. Keep build/browser gates explicitly `NOT_RUN` until actually executed.