# WRC 537 independent-oracle interpretation authority

## Purpose

This ledger closes the validation common-mode defect in which the independent EMP.1 hand calculation reproduced the same figure-selection map and Table-5 sign matrix as production code. Agreement between two implementations is not independent evidence when both implementations can share the same interpretation error.

## Source split

| Datum | Independent validation source | Use |
|---|---|---|
| Table-5 stress sign placement at Au/Al/Bu/Bl/Cu/Cl/Du/Dl | `docs/emp1/WRC537_2013_Tables_and_Charts.md`, Table 5, pp.41–42 | Parsed at runtime into the validation sign matrix. |
| Location-to-figure mapping | `docs/emp1/CAUx_2017_WRC01f_pages_24-31.md`, pp.24 and 27 dimensionless-load tables | Independent secondary worked-report disambiguator for OCR/merged-cell ambiguity in retained Table 5. |
| Curve coefficients | `docs/emp1/WRC537_2013_Tables_and_Charts.md`, individual figure coefficient tables | Parsed independently by the hand calculation as before. |
| 1B/1B-1 and 2B/2B-1 production selection | Separate governed selector/check introduced by EMP1-06 | Not granted authority by CAUx; the historical frozen handcalc continues to represent its published/off-axis B1 example. |

## Authority boundary

CAUx/Hexagon is **validation evidence only**. It does not upgrade WRC method authority, does not resolve the existing production curve-selection suspension, and does not authorize production use. Production remains fail-closed for all existing WRC authority blockers.

The gamma5 independent hand calculation now consumes `deriveIndependentWrc537Table5Authority(...)` and contains neither a local figure map nor a local sign matrix. The gamma15 historical artifact is intentionally unchanged; before it is accepted, the new decoupling check independently verifies its frozen figure map against CAUx and reconstructs its stresses using signs parsed from WRC Table 5.

## Falsification intent

If production and an old handcalc share the same wrong constant, the source-derived parser is unaffected. If the retained source mapping/sign evidence changes, the parser output changes and either the frozen gamma5 semantic payload or the gamma15 source-sign replay fails. No production observation is used to set the independent authority object.
