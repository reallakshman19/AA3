# EMP1-09 WIP — WRC Table-5 eight-point extrema authority

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `BRANCH: agent/emp1-09-wrc-eight-point-extrema-scope-20260821`
- `BASE_MAIN: 68f6790a2087ead390eb6f06b3213fb465b5f36a`
- `MERGE_AUTHORITY: NOT_GRANTED_FOR_EMP1_09`
- `PRODUCTION_ROUTE_AUTHORIZED: false`

## Finding

WRC 537 §4.3.6 permits arbitrary-loading stress evaluation at eight shell-juncture points but explicitly does not assure that the absolute maximum stress intensity occurs at one of them. The current numerical result exposes the eight stress intensities but lacks a machine-readable extrema-authority contract, allowing a downstream consumer to compute `Math.max(stressIntensity)` and mislabel it as a global shell maximum.

## Implemented repair

- Table-5 schema v3 adds `extremaScope`;
- explicitly records the eight evaluated locations;
- reports only `MAXIMUM_OVER_EVALUATED_TABLE5_EIGHT_POINTS_ONLY` with governing one of A/B/C/D upper/lower locations;
- sets `absoluteShellMaximumAssured=false` and `arbitraryLoadingGlobalMaximumAuthority=false`;
- records that no continuous juncture or intermediate-point search is performed;
- carries limitation code `WRC_TABLE5_EIGHT_POINTS_NOT_GLOBAL_ABSOLUTE_MAXIMUM` into the bounded-route registry;
- keeps the limitation separate from the four existing production suspension reasons;
- regression check locks the existing safe UI label `Eight-location shell stress trace` and rejects a global-maximum field.

## Non-scope

No WRC coefficient, curve ordinate, Table-5 stress equation, sign matrix, load transformation, gamma/beta domain, §4.5 applicability rule, pressure policy, Kn/Kb rule, or FEM path is changed. No interpolation or off-axis search is invented.

## Validation state

- GitHub Actions: `NOT_RUN` until PR is opened.
- Local connector execution: `NOT_RUN`.
- Independent frozen Table-5 numerical oracle must remain unchanged.

## Exact next action

Publish this commit, open draft PR, run the three EMP.1 workflows including the new extrema-scope check, then replace this WIP with `agents/PR<NUMBER>_workreport.md`.

## Appendix A

1. Why is the maximum of the eight Table-5 stress intensities not a global shell maximum?
2. Which source section governs this limitation for cylindrical arbitrary loading?
3. What machine-readable fields prevent downstream overclaiming?
4. Why is no continuous/off-axis interpolation added here?
5. Why is this an engineering limitation rather than a new production suspension reason by itself?
