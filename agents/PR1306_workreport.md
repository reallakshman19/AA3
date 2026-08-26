# PR1306 Work Report — EMP1-05 fail-closed visible A→B→C workspace transaction

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `TAKEOVER_AUTHORITY: WRITE_ALLOWED`
- `WORK_INTENT: IMPLEMENT`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `ISSUE: #1261`
- `PR: #1306`
- `PR_STATE: AUTHORIZED_FOR_MERGE`
- `BRANCH: agent/emp1-05-visible-abc-workspace-20260821`
- `BASE_MAIN: 38c6cb5d4324581fc0ed8348ce7c5137886dd106`
- `BASE_MAIN_AUTHORITY_INCREMENT: EMP1-09 / PR #1311`
- `MERGE_AUTHORITY: GRANTED_BY_OWNER_2026-08-21`
- `CURRENT_STAGE: CLEAN_CURRENT_MAIN_RECONCILIATION_COMPLETE`
- `GLOBAL_EMP1_C_ROUTE_REGISTERED: false`
- `GAMMA5_PRODUCTION_ROUTE_AUTHORIZED: false`
- `WORKSPACE_C_TRANSACTION_WIRED: true`
- `WORKSPACE_C_PRODUCTION_EXECUTION_WIRED: false`
- `RELEASE_QUALIFIED: false`

## Mission

Provide one engineer-facing EMP.1 transaction across retained A/B mechanics and governed C preparation without weakening the fail-closed WRC production boundary.

The workspace may execute EMP.1.A and EMP.1.B, derive source-bound C custody from their retained evidence, retain current/stale transaction evidence, and explain why C is blocked. It must not call the WRC537 gamma=5 production route or present a production WRC stress result while route authority is suspended.

## Current-main reconciliation

The historical PR branch was rebuilt as a clean one-commit product/workspace delta on `main@38c6cb5d4324581fc0ed8348ce7c5137886dd106` after EMP1-06/07/08/09 were merged.

Clean engineering head before this documentation-only update:

`4d30a5a46fcb2b409d2204956173ab4fcdda306a`

At that head the branch was **1 ahead / 0 behind** main and changed only the EMP1-05 workspace/product files. Newer production WRC authority files from EMP1-06/07/08/09 were deliberately not transplanted from the historical #1306 branch.

Current production suspension reasons retained from main:

1. `WRC_CYLINDRICAL_LOAD_AXIS_SIGN_UNRESOLVED`
2. `WRC_LONGITUDINAL_MOMENT_CURVE_SELECTION_AUTHORITY_UNRESOLVED`
3. `WRC_ATTACHMENT_OUTSIDE_RADIUS_SOURCE_BASIS_UNQUALIFIED`
4. `WRC_CYLINDRICAL_4_5_APPLICABILITY_SOURCE_BASIS_UNQUALIFIED`

Current Table-5 limitation also remains retained:

- `WRC_TABLE5_EIGHT_POINTS_NOT_GLOBAL_ABSOLUTE_MAXIMUM`

No production route, coefficient, sign matrix, curve-selection rule, r0 basis, §4.5 applicability rule, extrema rule, pressure policy, Kn/Kb rule, or release authority is changed by this PR.

## Implemented workspace seam

### 1. Lightweight run-input/currentness state

`src/workspace/emp1-workbench-run-state.js` owns a UI-independent contract for selected load/pressure identities, source-referenced attachment geometry, semantic hashes and current/stale classification.

Caller-authored WRC `Rm`, `T`, `r0`, gamma, beta, reference coordinates, axes, `Kn`, and `Kb` are not accepted in the route request.

### 2. Product-owned transaction

`src/workspace/emp1-workbench-product-run.js`:

1. executes/retains EMP.1.A;
2. refreshes B source evidence from the actual A execution;
3. executes/retains EMP.1.B;
4. derives source-bound attachment/WRC custody;
5. prepares governed C source custody;
6. inspects both route-module and bounded-registry production authority;
7. while production is suspended, retains a machine-readable blocked C artifact and invokes production C zero times.

The blocked artifact contains no production WRC stress field.

### 3. Visible product truth

The analytical workspace exposes source binding, transaction currentness, A/B/prepared-C hashes, invocation counts and suspension reasons. The C step remains visibly `BLOCKED` and disabled. `renderEmp1CorrelationResultEvidence()` receives a C result only when `boundedLocalRouteExecuted===true`.

### 4. Lazy numerical dependency

The heavy EMP.1 product executor is dynamically imported only when the engineer invokes the EMP.1 preparation transaction. The normal workbench startup does not statically import the WRC numerical executor through the new controller path.

## Authority boundary

Permitted:

```text
A load/reference mechanics        retained qualified engine
B nominal section screening      retained qualified engine
A→B source refresh               governed existing bridge
C source custody preparation     source-bound current A/B evidence
attachment diameter              source-referenced canonical length unit
historical/currentness evidence  retained workspace transaction
```

Still false/blocked:

- gamma5 WRC production execution while current source-authority blockers remain;
- global/full-domain EMP.1.C;
- non-tabulated gamma;
- nonzero differential pressure / pressure-thrust route;
- non-unity Kn/Kb;
- WRC297/nozzle-neck qualification;
- code-compliance PASS semantics;
- release qualification.

## Changed-file ledger relative to EMP1-09 main

| Path | Purpose |
|---|---|
| `src/workspace/emp1-workbench-run-state.js` | normalized source binding and currentness |
| `src/workspace/emp1-workbench-product-run.js` | A/B execution + fail-closed C preparation transaction |
| `src/workspace/emp1-workbench-run-view.js` | source binding/currentness/suspension UI |
| `src/workspace/lafea-workbench-controller.js` | workspace-owned transaction + lazy executor |
| `src/workspace/lafea-workbench-view.js` | transaction projection and preparation action |
| `src/workspace/lafea-analytical-calc-content.js` | transaction panels and guarded C result presentation |
| `src/workspace/lafea-guided-workflow-view.js` | suspended-C explanation while C remains disabled |
| `src/core/emp1/emp1-public-product-contract.js` | distinguish workspace wiring from production C authority |
| `scripts/emp1-workbench-product-run-qualification.mjs` | focused transaction/currentness/fail-closed falsifiers |
| `agents/PR1306_workreport.md` | living handover/evidence record |

## Exact-head validation observed at engineering head `4d30a5a4...`

| Check | Status | Evidence |
|---|---|---|
| branch vs EMP1-09 main | PASS | 1 ahead / 0 behind, clean ten-file delta |
| EMP.1 current-main independent baseline | PASS | Actions run `32461428962` |
| EMP.1 gamma5 bounded route on current main | PASS | Actions run `32461428959` |
| EMP.1 runEmp1 bounded gamma5 orchestration | PASS | Actions run `32461429013` |
| LAFEA B01 fail-closed qualification | PASS | Actions run `32461428946` |
| standalone LAFEA production boundary/build | PASS | visible-workbench run `32461428999`, steps before Pages build |
| production Pages bundle ceiling | FAIL / PRE-EXISTING RELEASE INFRASTRUCTURE DEBT | run `32461428999`: `main-*.js = 1,524,212 B` vs hard ceiling `1,179,648 B`; Chromium skipped. This same bundle-ceiling class was already recorded before EMP1-05; this PR does not relax the ceiling. |
| Chromium EMP.1 journey | NOT_RUN | skipped because production Pages build stopped at hard chunk ceiling |
| LAFEA B01 final B-bar Lamé convergence diagnostic | FAIL / OUTSIDE EMP1-05 CHANGE SURFACE | run `32461428975`: `REACTION_EQUILIBRIUM_FAILURE` in B-bar Lamé fixture; B01 fail-closed suite is separately green |
| focused `emp1-workbench-product-run-qualification.mjs` | NOT_RUN | no existing workflow owns this new script; no PASS is claimed |
| full repository regression | NOT_RUN | not claimed |

## Deliberate non-waivers

- The `1,179,648 B` production chunk ceiling is not raised or bypassed.
- The B-bar Lamé reaction-equilibrium failure is not suppressed.
- Chromium is not reported as PASS when it did not run.
- The focused new transaction script is not reported as PASS when it did not run.
- Production C remains suspended despite the workspace transaction being wired.

## Known debt carried forward

### Route-authority currentness

Current transaction currentness hashes A document, B document, attachment geometry and local-route input. A future production reauthorization/suspension transition must also invalidate any retained C production result through a route-authority semantic hash. This is not currently an executable wrong-result path because production C is suspended and this PR cannot create a production WRC stress result. It becomes a mandatory gate before any future C production reauthorization.

### Independent-oracle common-mode risk

The existing WRC comparison hand calculation is not sufficient as final semantic qualification if it duplicates production figure-selection/sign interpretation. The next P0 increment is EMP1-10: build a source-derived, import-isolated WRC interpretation oracle with mutation falsifiers. Production remains fail closed during that work.

## Appendix A — takeover qualification

1. **Can workspace wiring authorize C production?** No. It owns state/custody/presentation only; route-module plus registry authority must independently authorize production.
2. **What may the workspace do now?** Run/retain A and B, derive source-bound C custody, retain blocked preparation evidence and explain blockers.
3. **What must not appear now?** A production WRC stress result, global C authority, code-compliance PASS, or release qualification.
4. **What invalidates retained transaction evidence today?** A/B document, attachment geometry, and local route identity drift.
5. **What additional invalidation is required before future production C?** Route-authority semantic-hash drift.
6. **What is the next engineering priority?** EMP1-10 independent source-derived WRC oracle and deliberate common-mode falsification.
