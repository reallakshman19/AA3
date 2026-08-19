# PR1266 Work Report — EMP.1.A production run-state retention

## Current state

- Issue: #1261
- Parent PR: #1264
- Parent head at branch cut: `2e26413b0950a80ecb78423f3972fac9c8dc8e6d`
- Branch: `agent/emp1-a-run-state-retention-issue1261`
- Intent: engineering-critical production-browser RCA and minimal repair
- Merge authority: `NOT_GRANTED`
- Handover readiness: `READY`

## Failure being isolated

Exact-head Stage-17 evidence from merged #1265 reached the production EMP.1.A Run action but the expected `[data-role="lafea-result-highlights"]` did not render. The captured browser trace proves the Run click fired and source custody entered the run transaction; the failure is downstream of the click.

Expected after Run:

```text
LAFEA.1 execution.status = QUALIFIED
LAFEA.1 execution.result present
visible summary contains Max |transferred force|
```

Observed browser assertion:

```text
result-highlights element absent
```

## Current RCA boundary

Source inspection establishes:

1. `LafeaWorkbenchController.run()` delegates directly to orchestrator `store.run()`.
2. Base workbench `run()` calculates with `executeLafeaStage(...)` and stores `stage.execution`.
3. Analytical rendering passes `stage.execution` directly to `renderLafeaEvidence(...)`.
4. `renderLafeaEvidence(...)` creates `lafea-result-highlights` whenever execution is `QUALIFIED` and has a result.

Therefore the defect is not a result-label/presenter typo. The next discriminator is whether the production-shell state loses `stage.execution` or whether a later projection/remount drops it.

## Diagnostic regression added

`e2e/lafea-emp1-a-run-state.spec.js` records exact before/after production-shell state immediately around the Run click and asserts:

- active stage remains `LAFEA.1`;
- lifecycle binding becomes `CURRENT`;
- execution becomes `QUALIFIED`;
- result exists;
- transferred-force highlights render.

The Stage-17 runner executes this probe before the larger combined EMP.1 journey so the first broken state boundary is visible in CI.

## Authority boundary

No WRC mechanics, CAUx values, coefficients, signs, tolerance changes, FEM code, workflow files, or EMP.1.C route registration are in scope.

## Validation

- source-level RCA: `PASS_REVIEW`
- exact-head diagnostic browser execution: `PENDING`
- production repair: `NOT_STARTED`
- WRC/CAUx engineering qualification: unchanged `BLOCKED`
- release qualification: `false`

## Next action

Use the exact diagnostic state emitted by CI to patch only the first state-custody boundary that fails. Do not weaken the browser assertion and do not substitute a presenter-only workaround if `stage.execution` is actually being lost.
