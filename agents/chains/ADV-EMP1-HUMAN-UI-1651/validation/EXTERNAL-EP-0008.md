# External validation update — EP-0008

VALIDATION_TARGET_BEFORE_REPAIR: 9910d2f95a1a8946ea625702de6f3a50b163c6e3
REPAIR_TARGET: 3a8b4e7241ed341deb4f54175ad14f893a7af241
OBSERVED_BY: Owner/local verifier
DATE: 2026-09-05

## Observed PASS

- `node scripts/emp1-plain-language-labels-check.mjs`
- `node scripts/emp1-governed-vector-table-check.mjs`
- `node scripts/emp1-professional-workflow-check.mjs`
- `node scripts/emp1-benchmark-evidence-ui-check.mjs`
- `node scripts/emp1-issue1651-acceptance-check.mjs`
- `npm run check:imports`
- `git diff --check`

## Repaired test-harness failure

At `9910d2f9...`, `node scripts/emp1-analytical-layout-check.mjs` failed before assertions with `ReferenceError: Cannot access 'FakeDocument' before initialization`.

LEG-006 repair `3a8b4e72...` moves `FakeDocument` / `FakeNode` declarations before first use. The repair changes no assertions and no production source. Re-execution at the repair target is PENDING_EXTERNAL_REVALIDATION; it is not yet PASS.

## Build gate

`npm run build` completed Vite transformation/rendering and then failed in `scripts/bundle-chunk-check.mjs` because `main-CPVXjxUz.js` was 1,936,884 bytes while the retained hard ceiling is 1,179,648 bytes.

Classification at this endpoint: `FAIL_BUILD_BUNDLE_BUDGET_CAUSALITY_UNRESOLVED`.

Do not weaken the bundle limit. Current `main` advanced from PR base `b39f7673...` to `80f335b7...`, but that drift contains only BM-MESH chain artifacts and meshing-check scripts; no Vite config, bundle checker, package script, or application `src/**` file changed. A build at current `main` is therefore the required differential comparator:
- if current `main` reproduces the same bundle-budget failure, classify the gate as inherited/outside #1651;
- if current `main` passes, #1660 must remain blocked for bundle-causality investigation.

## Browser evidence

Focused Playwright remains `BLOCKED_ENVIRONMENT`: project-local Chromium 1217 is absent and no product assertion executed. Owner elected manual localhost inspection as human-observed UI evidence for this checkpoint. Manual inspection remains PENDING unless separately returned.

## Authority

No engineering calculation, WRC/Pressure mechanics, benchmark retained source/value/tolerance, route authorization, code/release state, roadmap or workflow-YAML authority is changed by this validation/repair record.
