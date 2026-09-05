# External validation update — EP-0008

VALIDATION_TARGET_BEFORE_REPAIR: 9910d2f95a1a8946ea625702de6f3a50b163c6e3
REPAIR_TARGET: 3a8b4e7241ed341deb4f54175ad14f893a7af241
MAIN_COMPARATOR: 80f335b750a13a06741a787106949bada1ad7f37
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
- `node scripts/emp1-analytical-layout-check.mjs` at repair target `3a8b4e72...` -> `EMP1_ANALYTICAL_LAYOUT_CHECK_PASS`

## Analytical-layout repair disposition

At `9910d2f9...`, the layout checker failed before assertions with `ReferenceError: Cannot access 'FakeDocument' before initialization`.

LEG-006 repair `3a8b4e72...` moved the existing `FakeDocument` / `FakeNode` declarations before first use without changing assertions or production source. External re-execution now PASSes, so the deterministic test-harness defect is CLOSED.

## Build gate differential

#1660 material-target build:
- Vite completed production bundling;
- post-build `bundle-chunk-check.mjs` failed because `main-CPVXjxUz.js` was `1,936,884` bytes against the retained hard ceiling `1,179,648` bytes.

Current-main comparator `80f335b7...`:
- advanced shell contract check passed;
- Vite completed production bundling (`2057 modules transformed`, `built in 31.52s`);
- post-build `bundle-chunk-check.mjs` failed because `main-DTcLi5Ur.js` was `1,932,886` bytes against the same `1,179,648`-byte ceiling.

Classification:
- `FAIL_BUILD_BUNDLE_BUDGET_INHERITED`: current `main` independently fails the same retained hard ceiling, so #1660 did not create the pass-to-fail gate transition;
- the observed #1660 target chunk is `3,998` bytes larger than the current-main comparator; therefore this evidence does not establish zero bundle contribution by #1660;
- the inherited bundle-budget failure remains a repository-level build blocker and must not be weakened or bypassed under issue #1651.

## Browser evidence

Focused Playwright remains `BLOCKED_ENVIRONMENT`: project-local Chromium 1217 is absent and no automated browser product assertion executed. Manual localhost inspection is permitted as separate human-observed UI evidence for this checkpoint and remains PENDING unless separately returned.

## Authority

No engineering calculation, WRC/Pressure mechanics, benchmark retained source/value/tolerance, route authorization, code/release state, roadmap or workflow-YAML authority is changed by this validation record.
