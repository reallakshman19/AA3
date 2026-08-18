# PR1253 — LAFEA.4 Parent-Normal Geometry Boundary Repair

## Current state
- Base main: `658e6cd32580d215d95258f042cfbae5f0a6db88`
- Scope: one production representation-boundary correction plus this workreport.
- Trust root: NULL.
- Solver/formulation/mesh thresholds: unchanged.
- Merge authority: owner explicitly authorized on 2026-08-18.
- Qualification trigger: workreport-only synchronize; production repair blob unchanged.

## RCA
The parent-normal qualification receives governed analysis-mesh node records containing `{nodeId,x,y,z}`. The inverse cylindrical/curved-hole surface contracts intentionally accept a pure geometric point `{x,y,z}`. Passing the governed record directly caused `LAFEA_SHELL_CURVED_POINT_KEYS_INVALID` before any parent-normal mathematics could execute.

## Repair
Project the already validated node record to its coordinate vector at the representation boundary before calling `cylindricalShellUvAtPoint3d` or `curvedHoleShellUvAtPoint3d`. Do not weaken the inverse-surface contract and do not alter parent-normal equations, tolerances, orientation logic, or mesh evidence.

## Acceptance
The governed shell compiler/execution custody step must pass on the exact head. Any later B01/B02 failure remains independently fail-closed and is not reclassified.
