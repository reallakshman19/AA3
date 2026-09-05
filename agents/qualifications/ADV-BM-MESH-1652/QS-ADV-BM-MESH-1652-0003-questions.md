# QS-ADV-BM-MESH-1652-0003 — refinement-dispatch qualification refresh

QUESTION_SET_ID: QS-ADV-BM-MESH-1652-0003
QUALIFICATION_PROFILE: FEA
QUALIFICATION_PROFILE_VERSION: 2
QUALIFICATION_SCOPE_ID: QSCOPE-ADV-BM-MESH-1652-PRODUCER-MESH-QUALIFICATION
SUPERSEDES: QS-ADV-BM-MESH-1652-0002
TRIGGER: Owner post-LEG-003 executable evidence cleared the source-authority and two-hole-quality boundaries and exposed stale generic local-refinement assertions in the three determinism-imported curved-shell qualifiers.
QUESTION_DISPLAY: HIDE

## Q1 — Production trace / refinement dispatch

Trace `workbench.refineAnalysisMesh()` for generated shell evidence. LAFEA.4 with a retained shell midsurface enters the bounded TECH-13 product-refinement route; LAFEA.5 falls back to the generic stage refinement route. Within LAFEA.4, cylindrical and cylindrical-hole surfaces are product-scope candidates while periodic cylinders are explicitly outside product scope.

Falsifier: treating all three LAFEA.4 curved surfaces as if they still used the historical generic `LAFEA_SHELL_LOCAL_REFINEMENT_NOT_QUALIFIED` path.

## Q2 — Failure isolation

Separate the Owner-observed failures from BM-MESH meshing authority:

- cylinder/hole: the old qualifier invokes a refinement action that the view model already exposes as disabled; that invocation enters the separate TECH-13 candidate kernel and currently reaches the exact-point representation boundary (`LAFEA_SHELL_CURVED_POINT_KEYS_INVALID` / `LAFEA_SHELL_CURVED_HOLE_POINT_KEYS_INVALID`);
- periodic: the current LAFEA.4 product scope rejects the surface first with `LAFEA4_SHELL_PRODUCT_REFINEMENT_PERIODIC_NOT_QUALIFIED`.

These are refinement-dispatch/product-route effects, not failures of the generated parent mesh, its determinism, quality thresholds, source authority, or solver-model binding.

Falsifier: changing the graded-refinement executor, inverse-surface point contracts, product promotion, or mesh-quality policy in BM-MESH to make the old assertion pass.

## Q3 — Authority / invariant separation

Preserve these boundaries:

- LAFEA.4 product refinement is a separate protected authority surface; BM-MESH does not repair or promote it;
- when the product UI policy says refinement is disabled, this producer/determinism qualifier verifies the disabled state and retained-parent invariance without invoking the disabled product action;
- LAFEA.5 may continue to verify the generic fail-closed refinement rejection;
- periodic LAFEA.4 remains outside product-refinement scope;
- no source-authority, mesher, quality, solver/compiler, benchmark/oracle, convergence, workflow, roadmap, release, temperature, or TECH-13 production mutation is authorized.

## Q4 — Independent numerical witness

The already-observed LAFEA.4 two-hole geometry still has a 40 mm minimum material ligament and a two-elements-across sizing prerequisite, giving a geometric ceiling of `40 / 2 = 20 mm`. The 15 mm case satisfies that sizing prerequisite yet is quality-blocked under current policy, confirming that the refinement-dispatch failure is downstream and logically separate from the parent-mesh sizing/quality evidence.

## Q5 — Minimal safe repair

Allowed material scope is limited to:

- `scripts/lafea-shell-curved-cylinder-check.mjs`
- `scripts/lafea-shell-curved-hole-check.mjs`
- `scripts/lafea-shell-periodic-cylinder-check.mjs`

For LAFEA.4, assert the current view-model product-refinement disposition and do not invoke the disabled refinement action from these mesh producer qualifiers. For LAFEA.5, retain the generic rejected-refinement assertion. Preserve the retained parent artifact hash in both cases.

NO-PATCH: `src/workspace/lafea4-shell-*`, inverse-surface contracts, product promotion/activation, mesher, quality thresholds/classification, source authority, solver/compiler, oracle/convergence, workflows, roadmaps, release/temperature authority.
