# PR1291 work report — EMP.1.C exact source-tabulated gamma boundary

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `ISSUE: #1261`
- `PR: #1291`
- `BRANCH: agent/emp1-c-exact-gamma-qualified-route-issue1261`
- `BASE_AFTER_PR1287_MERGE: fa21da0f948133c471b4679e7e8a634491db9e0b`
- `MERGE_AUTHORITY: NOT_GRANTED`
- `EMP1_C_ROUTE_REGISTERED: false`
- `RELEASE_QUALIFIED: false`
- `CURRENT_STAGE: EXACT_GAMMA_PRIMARY_PDF_ORACLE_QUALIFICATION`

## Owner instruction consumed

The owner authorized merge of PR #1287 and instructed proceeding to the next increment. PR #1287 was squash-merged with expected-head protection. PR #1291 is the successor.

## Why this increment exists

PR #1287 reduced the remaining method-wide uncertainty to one item: WRC537 does not state a uniquely qualified programmable algorithm for selecting/interpolating between non-tabulated cylindrical shell parameter gamma curves.

This PR does not invent such an interpolation rule. Instead it defines a narrower source-faithful capability:

```text
EXACT SOURCE-TABULATED GAMMA -> potentially admissible
NON-TABULATED GAMMA          -> BLOCKED
ORIGINAL -> EXTRAPOLATED     -> no fallback
BLANK-GAMMA SOURCE ROW       -> unselectable
```

This is a discrete source lookup, not interpolation.

## Source authority

Frozen WRC source:

```text
document   = docs/emp1/WRC537_2013.pdf
raw SHA256 = 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
curve fit  = RATIONAL_5_OVER_6
X          = beta for cylindrical curves
```

Curve equation:

```text
Y = (a + c*beta + e*beta^2 + g*beta^3 + i*beta^4)
    / (1 + b*beta + d*beta^2 + f*beta^3 + h*beta^4 + j*beta^5)
```

## Cylindrical source inventory re-observed by the new selector

```text
coefficient tables            = 28
qualified curves              = 321
unresolved curves             = 1
source-qualified scalars      = 3,210
source-unresolved scalars     = 10

Original qualified curves     = 177
Original unresolved curves    = 1
Extrapolated qualified curves = 144
Extrapolated unresolved       = 0
```

The sole unresolved curve is the inherited `WRC537-FIG1B-ORIGINAL-GAMMA-BLANK` source row. It remains represented with `gamma=null` and `productionSelectable=false`; gamma=10 is not inferred from neighboring rows.

## Exact-gamma selector contract

New module:

`script/emp1-wrc-cylindrical-exact-gamma-lib.mjs`

The selector requires:

1. explicit figure;
2. explicit variant: `ORIGINAL` or `EXTRAPOLATED`;
3. finite positive runtime gamma;
4. source-row gamma identity within a `1e-12` relative machine-roundoff band only.

The tolerance is not an engineering interpolation tolerance. It only prevents a mathematically exact source value from failing because of floating representation.

When no source gamma matches, the result is blocked. No bracketing, Y interpolation, coefficient interpolation, nearest-neighbor choice, or variant fallback occurs.

## Falsifiers already passing

CI exact-gamma run #1 proved:

- inherited full-domain state remains blocked only by `WRC537_NON_TABULATED_GAMMA_SELECTION_UNQUALIFIED`;
- 28 / 321 / 1 source cardinality is reproduced;
- midpoint gamma between two source curves is blocked;
- cross-variant fallback is blocked;
- blank-gamma row remains unselectable;
- rational evaluator agrees with independently written duplicate arithmetic.

The first automatically selected exact source case was:

```text
Figure  = 1A
Variant = Original
gamma   = 5
beta    = 0.155
Y       = 0.10525347243142809
```

This value is not yet a frozen independent engineering oracle because the same generic selector supplied the coefficient row. The next gate therefore re-observes WRC PDF page 95 directly using Poppler and will freeze the numerical oracle only after independent row parsing succeeds.

## Capability record

`validation/emp1/wrc537-2013/exact-gamma-capability-v1.json`

Current status:

```text
PASS_BOUNDED_EXACT_TABULATED_GAMMA_SELECTION
engineeringAuthority = true for selection/evaluation boundary
productionAuthority  = false
fullMethodAuthority  = false
boundedProductionComparisonAllowed = false
globalEmp1CRouteRegistrationAllowed = false
```

CI binds the capability record back to the live source-derived parser counts and source SHA. A policy/count/hash drift is a failure.

## Current engineering boundary

Qualified now:

- source-custodied cylindrical coefficient rows with resolved gamma identity;
- exact source-tabulated gamma selection;
- explicit Original/Extrapolated custody;
- rational beta curve evaluation;
- deterministic rejection of non-tabulated gamma.

Not qualified yet:

- interpolation between gamma curves;
- assigning identity to the blank 1B Original row;
- bounded production comparison until an independent exact-gamma numerical oracle is frozen;
- global EMP.1.C route registration.

## Next actions

1. Independently parse the selected 1A Original gamma=5 coefficients from the frozen WRC PDF page 95, not through the generic Markdown selector.
2. Freeze an exact-gamma numerical oracle and semantic hash.
3. Re-observe the oracle in a second run.
4. Only then permit a bounded production comparison for exact-tabulated gamma cases.
5. Compare the actual EMP.1.C cylindrical evaluator against the frozen oracle with no expected-value mutation from production.
6. If that comparison passes, create a bounded method authorization record that explicitly excludes non-tabulated gamma and the blank 1B row.
7. Keep the global route fail-closed unless product dispatch can enforce that bounded domain without fallback.

## Changed-file ledger

- `scripts/emp1-wrc-cylindrical-exact-gamma-lib.mjs` — source parser, exact-gamma selector, rational evaluator.
- `scripts/emp1-wrc-cylindrical-exact-gamma-self-test.mjs` — cardinality, midpoint, fallback, anomaly, and evaluator falsifiers.
- `validation/emp1/wrc537-2013/exact-gamma-capability-v1.json` — bounded authority contract.
- `.github/workflows/emp1-c-exact-gamma.yml` — expected-blocked full-domain state plus bounded qualification CI and primary-PDF re-observation.
- `agents/status/PR1291.yaml` — current machine-readable state.
- `agents/claims/PR1291.yaml` — current claims and blockers.
- `agents/PR1291_workreport.md` — this living handover report.

## Appendix A — next-agent expert questions

1. Does the WRC PDF SHA still match `698fcdc3...c27b2`?
2. Does the cylindrical parser still produce exactly 28 tables, 321 qualified curves, and one unresolved curve?
3. Is the unresolved `1B Original` row still represented without an inferred gamma?
4. Can a runtime gamma halfway between two source values ever return PASS? It must not.
5. Can an Original request ever consume an Extrapolated row? It must not.
6. Is the `1e-12` gamma band used only for floating roundoff identity, never engineering interpolation?
7. Is the rational 5-over-6 formula preserved exactly?
8. Was the exact-gamma oracle obtained independently from the frozen PDF rather than copied from production/selector output?
9. Were expected oracle values frozen before any production EMP.1.C comparison?
10. Does bounded authorization, if later granted, explicitly exclude non-tabulated gamma and the blank 1B row?
11. Does product dispatch fail closed when the bounded domain is not satisfied?
12. Is global EMP.1.C route registration still false until that dispatch proof exists?
