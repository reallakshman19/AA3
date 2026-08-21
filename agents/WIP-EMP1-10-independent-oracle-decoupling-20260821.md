# EMP1-10 WIP — independent WRC oracle decoupling

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `BRANCH: agent/emp1-10-wrc-independent-oracle-decoupling-20260821`
- `BASE_MAIN: 38c6cb5d4324581fc0ed8348ce7c5137886dd106`
- `MERGE_AUTHORITY: NOT_GRANTED_FOR_EMP1_10`
- `PRODUCTION_ROUTE_AUTHORIZED: false`

## Finding

The gamma5 independent hand calculation independently parsed WRC curve coefficients, but it hardcoded the same location-to-figure interpretation and Table-5 sign matrices used by production. The gamma15 historical baseline likewise contains a hardcoded sign matrix and a frozen figure map. This leaves a common-mode interpretation path: production and validation can agree numerically while sharing the same engineering mapping error.

## Implemented repair

- add a scripts-only source-authority parser with zero `src/core` imports;
- parse Table-5 sign placement directly from retained WRC Table 5;
- parse exact location-to-figure mapping from the independent CAUx/Hexagon worked-report tables, used only as secondary validation evidence to disambiguate retained OCR/merged cells;
- gamma5 handcalc consumes the source-derived authority object and removes local figure/sign constants;
- preserve the frozen gamma5 semantic payload/hash; source-derived interpretation must reproduce it;
- independently verify gamma15 frozen figure mapping and replay gamma15 stresses with WRC-source-derived signs before accepting the historical baseline;
- run the decoupling check in both independent-baseline and gamma5 route workflows.

## Authority boundary

No production WRC calculation code is changed. CAUx is not production method authority. Existing production suspension reasons remain unchanged. The separate governed 1B/1B-1 and 2B/2B-1 selector remains the production curve-selection boundary.

## Validation state

- GitHub Actions: `NOT_RUN` until PR is opened.
- Local repository execution: `NOT_RUN`.

## Exact next action

Commit this slice, open a draft PR, run the three EMP.1 workflows, repair any source-parser edge cases, then replace this WIP with `agents/PR<NUMBER>_workreport.md`.

## Appendix A

1. Why did the old handcalc not provide independent interpretation evidence even though it imported no production modules?
2. Which source is authoritative for Table-5 sign placement?
3. Why is CAUx permitted as a validation disambiguator but prohibited from production-method authority?
4. How does the frozen gamma5 semantic hash falsify an incorrect source parser?
5. How is the unchanged gamma15 historical baseline independently checked without rewriting its frozen artifact?
