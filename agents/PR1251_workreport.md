# PR1251 — LAFEA Shell Route Expectation Repair

## Current state

- Repository: `reallaksh19/Advanced_Analysis`
- Base: merged bundle prerequisite main `0cad4952ade59791a4f7c39882c3d6b504f99ef1`
- Branch: `agent/lafea-shell-route-expectation-repair-20260818`
- Scope: test-authority correction only
- Production source changes: none
- Engineering formulation/solver/mesh thresholds: unchanged
- TECH-13 trust root: unchanged / NULL
- Merge authority: owner explicitly authorized on 2026-08-18

## RCA

Current production LAFEA.4 owns a bounded product-refinement route. The planar route fixture is outside that qualified product surface and production correctly fails closed with `LAFEA4_SHELL_PRODUCT_REFINEMENT_SURFACE_NOT_QUALIFIED`. The existing checker still expected the older generic `LAFEA_SHELL_LOCAL_REFINEMENT_NOT_QUALIFIED` code for both LAFEA.4 and LAFEA.5.

LAFEA.5 still has no product-refinement route and therefore retains the generic rejection.

## Change

Update only `scripts/lafea-shell-workbench-route-check.mjs` so the expected rejection is stage-specific:

- LAFEA.4 -> `LAFEA4_SHELL_PRODUCT_REFINEMENT_SURFACE_NOT_QUALIFIED`
- LAFEA.5 -> `LAFEA_SHELL_LOCAL_REFINEMENT_NOT_QUALIFIED`

No production behavior is changed.

## Qualification

Acceptance requires the governed shell mesh compiler/execution custody step to PASS on the exact branch head. Later workflow failures caused by independent B01/B02 gates remain inherited and are not reclassified as PASS.
