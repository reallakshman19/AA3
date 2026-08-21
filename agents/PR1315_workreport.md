# PR1315 Work Report — EMP1-13 WRC r0 typed source basis

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `PR: #1315`
- `PR_STATE: DRAFT_AWAITING_EXECUTION_ENVIRONMENT`
- `BRANCH: agent/emp1-13-r0-source-basis-20260821`
- `BASE_MAIN: d80fdd2e82734da31abe926a373203a0183a3ca3`
- `ENGINEERING_CODE_HEAD_BEFORE_REPORT: d110579b099742119c4a6d05b41b3745b6ceeb85`
- `MERGE_AUTHORITY: NOT_GRANTED_FOR_PR1315`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`

## Mission

Close `WRC_ATTACHMENT_OUTSIDE_RADIUS_SOURCE_BASIS_UNQUALIFIED` by making the EMP.1 product source explicitly own and hash the physical WRC cylindrical `r0` meaning: **outside radius of the attachment at the shell juncture**. Preserve `beta = 0.875*r0/Rm`; do not infer r0 from display/SVG geometry and do not silently promote legacy generic-diameter data.

## Implemented authority chain

1. `emp1-wrc537-attachment-source-authority.js` defines the typed source contract:
   - `diameterBasis = OUTSIDE_DIAMETER_AT_SHELL_JUNCTURE`;
   - `physicalLocation = ATTACHMENT_SHELL_JUNCTURE`;
   - positive outside diameter;
   - geometry identity;
   - canonical unit;
   - engineering source reference;
   - replayable source-binding semantic hash;
   - `productionObservationUsedToSetAuthority = false`.
2. Workbench run-input schema is v3. Legacy v2 requires explicit re-binding and is not silently upgraded.
3. Workbench execution verifies the attachment unit equals the retained canonical LAFEA source length unit before creating source authority.
4. B/C source custody retains the typed authority and derives `r0 = outsideDiameter/2`; legacy caller-declared evidence remains `UNQUALIFIED_FOR_PRODUCTION`.
5. Orchestration requires qualified r0 custody before any future production C execution and passes the typed attachment authority to the route.
6. The direct exported gamma5 route has its own runtime guard; bypassing orchestration cannot avoid r0 source validation.
7. Direct route r0 authority is bound to the route's actual SI-mm numerical contract. Mixed-unit typed authority fails closed.
8. UI wording now states **outside diameter at shell juncture**, source reference, and legacy re-binding behavior.

## Static blocker state after EMP1-13

Resolved from bounded-route static suspension set:

- `WRC_ATTACHMENT_OUTSIDE_RADIUS_SOURCE_BASIS_UNQUALIFIED`

Still active:

1. `WRC_LONGITUDINAL_MOMENT_CURVE_SELECTION_AUTHORITY_UNRESOLVED`
2. `WRC_CYLINDRICAL_4_5_APPLICABILITY_SOURCE_BASIS_UNQUALIFIED`

The route remains `registered=false`, `engineeringUseAuthorized=false`, and `productionUseAuthorized=false`. Nonzero differential pressure, non-unity SCF / Appendix-B SCF, gamma outside the qualified bounded route, and global EMP.1.C remain unsupported/blocked scope rather than newly authorized behavior.

## Falsification coverage added

`scripts/emp1-wrc537-r0-source-authority-check.mjs` covers:

- typed binding acceptance;
- r0 and beta replay;
- legacy evidence rejected for production;
- v2 product source requires re-binding;
- diameter-basis spoof rejection;
- physical-location spoof rejection;
- source-binding hash drift rejection;
- outer authority hash drift rejection;
- authority-shape spoof rejection;
- production-observation contamination rejection;
- direct-route source/geometry r0 mismatch rejection.

`scripts/emp1-wrc537-r0-unit-coherence-check.mjs` covers:

- SI-mm typed authority acceptance;
- mixed `in` source authority rejected by the SI-mm gamma5 route;
- registry/method scope advertises `canonicalLengthUnit = mm`;
- production route remains unauthorized.

Existing axis/public-product checks were updated so they require exactly the two remaining source suspension reasons and prove the old r0 blocker is absent without enabling production.

## Validation ledger

### GitHub Actions — execution environment blocked

Exact code head `d110579b099742119c4a6d05b41b3745b6ceeb85` triggered:

- `EMP.1 current-main independent baseline` — run `32483130032` — GitHub conclusion `failure` **before any step executed**; job reports `steps=null`, `logs_url=null`.
- `EMP.1 gamma5 bounded route on current main` — run `32483130110` — GitHub conclusion `failure` **before any step executed**; job `96773670871` reports `steps=null`, `logs_url=null`.
- `EMP.1 runEmp1 bounded gamma5 orchestration` — run `32483130180` — GitHub conclusion `failure` **before any step executed**.

This zero-step/no-log behavior also predates the final EMP1-13 edits and is observable on earlier PR1315 heads and the already-merged PR1314 head. GitHub public status reported Actions operational; therefore the repository/account runner execution condition remains unresolved. These runs are **not software-test FAIL evidence** because no test command executed, but they are also **not PASS**.

### Local execution

- `NOT_RUN`: no usable repository checkout/network path is available in this execution environment.

### Source-level review

- `PASS_SOURCE_REVIEW`: typed source binding, hash replay, product canonical-unit check, custody, direct-route guard, static blocker removal, and fail-closed unit/r0 mismatch behavior inspected at exact branch source.
- Runtime qualification remains `NOT_RUN` until an execution environment actually starts the test commands.

## Changed-file ledger

- `.github/workflows/emp1-gamma5-main-route.yml` — add typed r0 and unit-coherence gates.
- `agents/PR1315_workreport.md` — living handover record.
- `scripts/emp1-public-product-check.mjs` — post-r0 registry/product truth.
- `scripts/emp1-wrc-gamma5-axis-authority-suspension-check.mjs` — two remaining static source blockers.
- `scripts/emp1-wrc537-r0-source-authority-check.mjs` — typed-r0 falsifiers.
- `scripts/emp1-wrc537-r0-unit-coherence-check.mjs` — mixed-unit falsifier.
- `src/core/emp1/emp1-c-bounded-route-registry.js` — source-qualified r0 state; runtime evidence required; SI-mm scope.
- `src/core/emp1/emp1-wrc537-attachment-source-authority.js` — typed source authority and replayable binding hash.
- `src/core/emp1/emp1-wrc537-gamma5-zero-dp-orchestration.js` — qualified custody required at execution.
- `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js` — remove static r0 blocker; direct runtime source/value/unit guard.
- `src/core/emp1/emp1-wrc537-source-custody.js` — retain typed authority and qualified r0 custody.
- `src/core/emp1/index.js` — authority exports.
- `src/workspace/emp1-workbench-product-run.js` — create authority from normalized source; canonical unit check.
- `src/workspace/emp1-workbench-run-state.js` — v3 typed attachment schema; v2 re-bind failure.
- `src/workspace/emp1-workbench-run-view.js` — explicit shell-juncture outside-diameter evidence UI.

## Exact next action

1. Restore an executable validation path (GitHub Actions runner/account/repository condition or an authorized matching local checkout).
2. Execute the three EMP.1 workflows/scripts on the exact current PR head.
3. Do not mark ready or merge unless the actual commands execute and pass.
4. After green exact-head evidence, update this report with run IDs, mark PR ready for review, and request fresh PR-specific merge authorization.
5. After PR1315 merges, proceed to the next static source blocker; do not weaken or bundle it into this PR.

## Appendix A — takeover qualification

1. Why is a UI label saying “outside diameter” insufficient calculation authority?
2. What exact typed fields establish WRC r0 physical meaning?
3. Why must v2 data be re-bound instead of defaulting new basis/location fields?
4. Which hash proves the typed product binding itself, and which hash proves the authority envelope?
5. Why must product execution compare the attachment unit to the retained canonical LAFEA source unit?
6. Why does the direct route still enforce `mm` even after the workbench unit check?
7. How is source/geometry r0 mismatch falsified?
8. Why is legacy caller-declared source evidence retained for comparison but rejected for production?
9. Which two static source-authority blockers remain after EMP1-13?
10. Why are zero-step GitHub Actions failures neither software PASS nor software FAIL evidence?
