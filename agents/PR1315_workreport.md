# PR1315 Work Report — EMP1-13 WRC r0 typed source basis

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `PR: #1315`
- `PR_STATE: DRAFT_FIXED_AWAITING_EXECUTION_ENVIRONMENT`
- `BRANCH: agent/emp1-13-r0-source-basis-20260821`
- `BASE_MAIN: d80fdd2e82734da31abe926a373203a0183a3ca3`
- `ENGINEERING_CODE_HEAD: 4244d2ad540a731063a6ebdab581e155ce3002da`
- `MERGE_AUTHORITY: NOT_GRANTED_FOR_PR1315`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`

## Mission

Close `WRC_ATTACHMENT_OUTSIDE_RADIUS_SOURCE_BASIS_UNQUALIFIED` for the bounded WRC 537 cylindrical route by making the product source explicitly own and hash the physical `r0` meaning: **outside radius of the attachment at the shell juncture**. Preserve `beta = 0.875*r0/Rm`; do not infer `r0` from display/SVG geometry and do not silently promote legacy generic-diameter data.

## Engineering finding

The pre-EMP1-13 product source carried only:

```text
geometryIdentity
attachmentDiameter
unit
sourceReference
```

The UI happened to call the field “outside diameter”, but that wording was not part of the normalized calculation source contract. Therefore the old evidence correctly remained comparison-only: `CALLER_DECLARED_SOURCE_LOCATOR_ONLY / UNQUALIFIED_FOR_PRODUCTION`.

The WRC source meaning was already retained and the numerical relation was already correct:

```text
r0 = outside radius of cylindrical attachment at shell juncture
r0 = outsideDiameter / 2
beta = 0.875 * r0 / Rm
```

EMP1-13 changes source custody and runtime authority, not these equations.

## Implemented authority chain

1. `emp1-wrc537-attachment-source-authority.js` defines one typed source authority with:
   - `diameterBasis = OUTSIDE_DIAMETER_AT_SHELL_JUNCTURE`;
   - `physicalLocation = ATTACHMENT_SHELL_JUNCTURE`;
   - positive outside diameter;
   - geometry identity;
   - canonical unit;
   - engineering source reference;
   - internally derived source-binding semantic hash;
   - outer authority semantic hash;
   - exact authority payload shape;
   - `productionObservationUsedToSetAuthority = false`.
2. The source-binding hash is replayed from the exact normalized product-shaped payload. A caller cannot attach an unrelated hash to otherwise valid fields and obtain authority.
3. Workbench run-input is `emp1-workbench-run-input/v3`. Legacy v2 is explicitly rejected with `EMP1_WORKBENCH_V2_ATTACHMENT_GEOMETRY_REBIND_REQUIRED`; there is no silent migration.
4. Product execution verifies the typed attachment unit equals the retained canonical LAFEA length unit before creating source authority, and verifies the core authority binding hash equals the normalized product attachment hash.
5. B/C source custody retains the typed authority and derives `r0 = outsideDiameter/2`. Historical direct callers remain supported for comparison but their legacy evidence remains `UNQUALIFIED_FOR_PRODUCTION`.
6. `requireEmp1Wrc537QualifiedR0SourceCustody()` is required after fresh A/B custody replay at the C execution boundary.
7. The direct gamma5 route independently requires qualified typed r0 authority, exact r0/value agreement, and route unit `mm`; bypassing orchestration cannot bypass these checks once production route authorization is eventually enabled.
8. The UI explicitly shows **outside diameter at shell juncture** and locked physical basis; DOM values remain drafts until the v3 source command is normalized.

## Quantitative retained oracle

The existing qualification geometry remains unchanged:

```text
Rm = 100 mm
T  = 20 mm
outside diameter = 35.42857142857143 mm
r0 = 17.714285714285715 mm
beta = 0.875 * r0 / Rm = 0.155
```

No gamma/beta/Table-5 coefficient or stress equation was changed by EMP1-13.

## Falsification coverage

`emp1-wrc537-r0-source-authority-check.mjs` now covers:

- typed binding acceptance;
- source-binding hash parity with normalized v3 product geometry;
- `r0` and `beta` replay;
- missing typed runtime authority rejection;
- valid-but-different outside diameter rejected by route geometry (`EMP1_WRC537_GAMMA5_ZERO_DP_R0_SOURCE_VALUE_MISMATCH`);
- legacy comparison evidence rejected for production custody;
- legacy v2 product input requires explicit re-binding;
- diameter-basis spoof rejection;
- physical-location spoof rejection;
- source-binding hash drift rejection;
- outer authority hash drift rejection;
- extra-field authority-shape spoof rejection;
- production-observation contamination rejection.

`emp1-wrc537-r0-unit-coherence-check.mjs` independently covers:

- `mm` typed authority acceptance;
- mixed `in` authority rejected by the SI-mm route (`EMP1_WRC537_GAMMA5_ZERO_DP_R0_SOURCE_UNIT_MISMATCH`);
- registry/method scope advertises `canonicalLengthUnit = mm`;
- production route remains unauthorized.

`emp1-workbench-product-run-qualification.mjs` was upgraded to v5 and is now part of the gamma5 workflow. It exercises the actual product transaction and checks:

- valid v3 typed source geometry reaches prepared C custody;
- retained source-binding hash equals the normalized product geometry hash;
- `r0 = 17.714285714285715 mm`, `beta = 0.155`;
- attachment changes invalidate B/C source custody;
- legacy v2, wrong basis, wrong location and wrong unit fail closed;
- closed axis and r0 blockers do not reappear;
- production C remains unexecuted while the route is suspended.

## Static bounded-route authority after EMP1-13

Historical blocker identifiers remain exported for audit/replay, but the live bounded route suspension set is now exactly:

1. `WRC_LONGITUDINAL_MOMENT_CURVE_SELECTION_AUTHORITY_UNRESOLVED`
2. `WRC_CYLINDRICAL_4_5_APPLICABILITY_SOURCE_BASIS_UNQUALIFIED`

Resolved from the live set:

- `WRC_CYLINDRICAL_LOAD_AXIS_SIGN_UNRESOLVED` — EMP1-12;
- `WRC_ATTACHMENT_OUTSIDE_RADIUS_SOURCE_BASIS_UNQUALIFIED` — EMP1-13.

The route still remains:

```text
registered = false
engineeringUseAuthorized = false
productionUseAuthorized = false
globalEmp1CRouteAuthority = false
releaseQualified = false
```

Nonzero differential pressure, non-unity/Appendix-B SCF, gamma outside the bounded route, code-compliance acceptance, nozzle-neck/WRC-297 qualification, and global EMP.1.C are not authorized by this PR.

## Protected invariants

- WRC Table-5 equations unchanged.
- WRC curve coefficients/data unchanged.
- Frozen gamma5 and gamma15 numerical oracles unchanged.
- `gamma = Rm/T` unchanged.
- `beta = 0.875*r0/Rm` unchanged.
- Zero-dp upstream load-transfer mechanics unchanged.
- WRC load-axis polarity authority from EMP1-12 unchanged.
- Kn/Kb unity-only authority unchanged.
- No generic diameter fallback and no v2 silent promotion.
- UI does not author engineering authority independently of normalized source state.

## Validation ledger

### Exact engineering code head

`4244d2ad540a731063a6ebdab581e155ce3002da`

GitHub Actions on that exact head:

| Workflow | Run | Observed state |
|---|---:|---|
| EMP.1 current-main independent baseline | `32483325411` | `NOT_RUN / RUNNER_INFRASTRUCTURE_BLOCKED` — job `96774262378`, `steps=null`, `logs_url=null` |
| EMP.1 runEmp1 bounded gamma5 orchestration | `32483325530` | `NOT_RUN / RUNNER_INFRASTRUCTURE_BLOCKED` — job `96774262726`, `steps=null`, `logs_url=null` |
| EMP.1 gamma5 bounded route on current main | `32483325371` | `NOT_RUN / RUNNER_INFRASTRUCTURE_BLOCKED` — job `96774262248`, `steps=null`, `logs_url=null` |

GitHub labels each run `failure`, but no workflow step or test command executed. Therefore these are **not software-test FAIL evidence and not PASS evidence**. The same zero-step/no-log condition was repeatedly observed on earlier PR1315 heads and PR1314.

### Local execution

`NOT_RUN`: this execution environment has no matching repository checkout and no authenticated local GitHub CLI/network path. No local runtime PASS is claimed.

### Source-level review

`PASS_SOURCE_REVIEW` for the code structure and authority boundaries listed above. This is not a substitute for runtime qualification.

## Changed-file ledger

1. `.github/workflows/emp1-gamma5-main-route.yml` — typed r0, unit-coherence, and workbench transaction gates.
2. `agents/PR1315_workreport.md` — living handover/evidence record.
3. `scripts/emp1-public-product-check.mjs` — post-r0 product/registry truth.
4. `scripts/emp1-workbench-product-run-qualification.mjs` — actual v3 product transaction qualification.
5. `scripts/emp1-wrc-gamma5-axis-authority-suspension-check.mjs` — exactly two remaining source blockers.
6. `scripts/emp1-wrc537-r0-source-authority-check.mjs` — typed r0/hash/value/schema falsifiers.
7. `scripts/emp1-wrc537-r0-unit-coherence-check.mjs` — mixed-unit falsifier.
8. `src/core/emp1/emp1-c-bounded-route-registry.js` — r0 source-qualified runtime state and live blocker removal.
9. `src/core/emp1/emp1-wrc537-attachment-source-authority.js` — typed source authority and hash replay.
10. `src/core/emp1/emp1-wrc537-gamma5-zero-dp-orchestration.js` — fresh qualified r0 custody required at C execution.
11. `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js` — direct source/value/unit runtime guard.
12. `src/core/emp1/emp1-wrc537-source-custody.js` — typed authority retention, replay, and qualified r0 custody.
13. `src/core/emp1/index.js` — authority exports.
14. `src/workspace/emp1-workbench-product-run.js` — normalized-source-to-core authority binding and canonical unit check.
15. `src/workspace/emp1-workbench-run-state.js` — v3 typed source schema and explicit v2 re-bind failure.
16. `src/workspace/emp1-workbench-run-view.js` — explicit shell-juncture outside-diameter UI evidence.

## Exact next action

1. Restore an executable validation path (GitHub Actions runner/account/repository condition or an authorized matching local checkout).
2. Execute the three EMP.1 workflows on the exact current code content.
3. Do not mark ready or merge until the actual test commands execute and pass.
4. After green evidence, refresh this report with executed-step run IDs and request fresh PR-specific merge authorization.
5. After PR1315 merges, proceed to one of the two remaining source-authority blockers; do not bundle it into EMP1-13.

## Appendix A — takeover qualification

1. Why is a UI label saying “outside diameter” insufficient calculation authority?
2. Which exact typed fields establish the WRC `r0` physical meaning?
3. Why must v2 data be re-bound rather than defaulting the new basis/location fields?
4. Which hash proves the normalized source binding, and which hash proves the authority envelope?
5. Why does the core creator derive the source-binding hash instead of trusting a caller-supplied hash?
6. Why must product execution compare the attachment unit to retained LAFEA units, and why does the direct route still enforce `mm`?
7. What falsifier proves a valid-but-different typed diameter cannot be used with an unrelated route `r0`?
8. Why is legacy caller-declared evidence retained for comparison but rejected for production?
9. Which two live source-authority blockers remain after EMP1-13?
10. Why are zero-step GitHub Actions failures neither software PASS nor software FAIL evidence?
