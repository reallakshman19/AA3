# WIP-1321 — Gravity-method request authority

## Recovery header
- repository: `reallaksh19/Advanced_Analysis`
- issue: #1321
- branch: `agent/issue-1321-gravity-method-request-authority`
- base: `main@29c688db4a021db900d1f8c67f56f777f73f4ddc`
- criticality: ENGINEERING_CRITICAL
- execution mode: AUTO
- merge authority: OWNER_ONLY / NOT_GRANTED
- workflow policy: owner instructed workflow gating be skipped as a continuation blocker; unexecuted checks remain NOT_RUN

## Mission
Create governed gravity-method request authority so the #1321 built-in profile can declare `gravityMethod=AUTO` with Product-default provenance and feed the already-qualified `empirical-gravity-method-selection/v1` selector. This slice does not yet change V2 runtime-package execution or scenario authorization.

## Ground truth
- AUTO selector mechanics already exist and are separately qualified by `scripts/empirical-gravity-method-selection-check.mjs`.
- AUTO currently has no production caller outside `engineering-support-load-store.calculateAuto()`.
- no `loadCalculation.gravityMethod` Project Data field exists.
- no `PD-GRAVITY-METHOD` Product default exists.
- configured V2 runtime package still requires an explicit V2/V3 method.

## Intended scope
- add Project Data `loadCalculation.gravityMethod`;
- add Product default `PD-GRAVITY-METHOD = AUTO` and bump profile version;
- add fail-closed request authority/provenance contract for AUTO/V2/V3;
- bridge effective request authority into the existing selector without changing selector mechanics;
- add focused regression and canonical aggregate ownership if absent.

## Invariants
- explicit project V2/V3 request shadows Product AUTO;
- invalid explicit method never falls back to AUTO;
- malformed Product-default provenance blocks;
- selector fallback policy remains unchanged;
- AUTO selection is not execution authorization;
- no runtime-package schema, scenario authorization, solver, statics, tolerance, or workflow change.

## Exact next action
Allocate draft PR, migrate custody, implement the bounded request-authority bridge, and reconcile source checks.