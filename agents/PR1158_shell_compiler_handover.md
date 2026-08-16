# PR #1158 — Retained Shell Mesh → Solver Model Handover

## Status

- PR: #1158
- Branch: `agent/lafea456-meshing-completion-20260815`
- Merge authority: owner only
- Merge state: **NOT READY until exact-head checks execute**
- Release authority: not granted
- Runtime status at authoring: GitHub Actions capacity prevents jobs from starting; zero-step workflow conclusions are `BLOCKED_EXTERNAL / NOT_RUN`, not engineering test failures and not passes.

## P0 closed in source architecture

The former shell path allowed a retained LAFEA.4/.5 mesh to be displayed/custodied while the legacy document mesh remained the calculation input. PR #1158 now has an explicit governed execution lineage:

`sourceHash → shell parent → retained meshHash → shell compiler → solverModelHash → executionMeshBindingHash → compiledExecutionHash → RECOVERY`

The workbench shell `Run` path no longer falls through to the legacy retained calculation while governed shell midsurface/mesh custody is active.

## LAFEA.4 compiler authority

Compiler: `LAFEA.4-5/RETAINED_SHELL_MESH_SOLVER_COMPILER@1.0.0`

Qualified mapping envelope is intentionally bounded:

- one referenced material;
- one uniform thickness;
- generated node director/tangent bases reconstructed from the retained parametric midsurface;
- UX/UY/UZ only when a single identical global value covers every source node;
- R1/R2 only when the whole-surface prescribed value is exactly zero;
- source nodal loads are rejected after remeshing;
- pressure is transferred only when one identical pressure and sense covers every source element;
- partial BC regions, partial pressure regions, nonuniform section regions and general nodal-load interpolation remain fail-closed.

A nontrivial qualification script uses a whole-surface pressure case and requires retained-mesh execution, nonzero applied pressure loading, and accepted force/moment equilibrium. Negative cases require source nodal loads and nonzero local rotations to be rejected.

## LAFEA.5 compiler authority

LAFEA.5 remains caller-authored source-mesh authority:

- no remesh;
- no coordinate mutation;
- no connectivity mutation;
- retained mesh must equal the canonical `shellTemplate` mesh;
- trunnion load distribution remains in `local-trunnion-footprint`;
- generated shell model is proved against the same retained mesh before execution evidence is accepted.

The execution proof uses the same official retained `meshHash` as mesh custody and lifecycle `ANALYSIS_MESH`.

## Workbench and lifecycle integration

New/updated boundaries:

- `lafea-shell-solver-model.js` — bounded compiler and solver-model binding projection.
- `lafea-shell-preparation-projection.js` — compiler-derived preflight; avoids the generic unqualified preparation producer and avoids a first-run lifecycle circular dependency.
- `lafea-workbench-shell-execution-state.js` — authoritative shell execution state.
- `lafea-workbench-shell-run-actions.js` — shell Run route with exact mesh/solver-model binding.
- `lafea-domain-first-mesh-custody.js` — promotes shell `usableForRun` only after compiler binding.
- `lafea-workbench-readiness.js` — shell result currentness requires exact source/domain/geometry/mesh/solver-model/lifecycle alignment.
- `lafea-lifecycle-producers.js` — lifecycle `ANALYSIS_MESH.artifactHash` is the actual retained mesh hash for the governed shell route; lifecycle parent-key contract remains exact.
- `lafea-workbench-orchestration-projection.js` — shell source-model, compiler preflight, authorization, execution and results states reflect the governed route.

## Qualification checks added

`node scripts/lafea-shell-compiled-execution-check.mjs`

Requires:

1. LAFEA.4 retained mesh compile and nontrivial whole-surface pressure solve.
2. LAFEA.4 force and moment equilibrium accepted.
3. LAFEA.4 source-node load transfer rejected.
4. LAFEA.4 nonzero local R1/R2 transfer rejected.
5. LAFEA.5 retained source mesh equals the workflow-generated shell mesh.
6. LAFEA.4 and LAFEA.5 headless workbench Run paths use `SHELL_RETAINED_MESH_COMPILED_SOLVER_MODEL`.
7. `execution.meshHash === retainedAnalysisMeshEvidenceV2.meshHash`.
8. lifecycle `ANALYSIS_MESH.artifactHash === execution.meshHash`.
9. lifecycle `EXECUTION.artifactHash === execution.compiledExecutionHash`.
10. lifecycle RECOVERY is CURRENT/PASS and result readiness is current.

The real browser acceptance `e2e/lafea-shell-sample-mesh.spec.js` also requires Sample → mesh/adopt → compiler → enabled Run → authoritative execution and lifecycle hash equality before taking the real viewport screenshot.

## CI status rule

The visible-workbench workflow now contains static syntax checks for the compiler/preflight/execution modules and executes the shell Sample, negative-envelope and compiled-execution checks before browser qualification.

Do not promote this PR to merge-ready merely because the source implementation is present. Require an exact-head workflow with real executed steps. A GitHub Actions job with `steps: []` is `BLOCKED_EXTERNAL / NOT_RUN`.
