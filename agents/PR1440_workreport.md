# PR1440 — Load Calc governed gravity-method request authority

## Current recovery state
- repository: `reallaksh19/Advanced_Analysis`
- issue: #1321
- PR: #1440 (draft)
- branch: `agent/issue-1321-gravity-method-request-authority`
- base / merge base: `29c688db4a021db900d1f8c67f56f777f73f4ddc`
- criticality: ENGINEERING_CRITICAL
- execution mode: AUTO
- merge authority: OWNER_ONLY / NOT_GRANTED
- workflow policy: owner instructed workflow gating be skipped as a continuation blocker; unexecuted checks remain NOT_RUN
- coordination: SAFE_NO_OPEN_GRAVITY_METHOD_AUTHORITY_PR

## Mission
Add a governed `loadCalculation.gravityMethod` request, Product-default it to `AUTO`, retain effective authority/default provenance, and bridge it into the existing conservative `empirical-gravity-method-selection/v1` mechanics without changing selector policy or execution authorization.

## Ground truth
Current main already implements AUTO selector policy and focused regression. It chooses V3 with complete qualified CoG, V2 only for missing CoG, and refuses unsafe fallback when known eccentricity/ambiguous/off-route/invalid evidence exists. However:
- Project Data has no gravityMethod field;
- Product default profile has no `PD-GRAVITY-METHOD` despite Issue #1321 requiring it;
- production selection APIs take a raw request string rather than a governed effective Project Data request;
- configured V2 runtime packages still require an explicit V2/V3 method, which is deliberately outside this slice.

## Intended scope
1. `src/workspace/project-data/project-data-fields.js`
2. `src/workspace/project-data/non-fea-product-default-profile.js`
3. new `src/workspace/project-data/non-fea-gravity-method-authority.js`
4. narrow bridge in `src/workspace/engineering-loads/empirical-gravity-method-selection.js`
5. focused authority/bridge regression
6. canonical aggregate ownership if absent
7. recovery records.

## Invariants
- Product default fills only empty gravityMethod slot;
- project explicit AUTO/V2/V3 shadows Product default;
- invalid explicit request never falls back;
- malformed Product provenance blocks;
- existing AUTO selector policy/hashes remain deterministic;
- selection remains not execution authorization;
- no runtime-package/controller/scenario/mechanics/tolerance/solver/workflow change.

## Independent falsifier
Raw empty profile -> gravity-method authority BLOCKED. Product-composed profile -> READY request AUTO with `PD-GRAVITY-METHOD` provenance. Explicit V2 project request -> READY V2 and Product default shadowed. Explicit `BOGUS` -> BLOCKED and no fallback. Governed AUTO request plus complete CoG -> V3; same governed request plus missing CoG -> V2; known off-route evidence -> no selected method.

## Exact next action
Migrate remaining WIP files, implement bounded field/default/authority bridge, strengthen regressions, reconcile Product-default version consumers and exact PR diff.