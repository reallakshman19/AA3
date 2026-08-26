# PR1311 Work Report — EMP1-09 WRC Table-5 eight-point extrema authority

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `PR: #1311`
- `BRANCH: agent/emp1-09-wrc-eight-point-extrema-scope-20260821`
- `BASE_MAIN: 68f6790a2087ead390eb6f06b3213fb465b5f36a`
- `VALIDATED_ENGINEERING_HEAD: ad05878e4bea39359edb212378ee58281be2d23b`
- `MERGE_AUTHORITY: NOT_GRANTED_FOR_PR1311`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `QUALIFICATION_STATE: PASS_READY_FOR_OWNER_MERGE_DECISION`

## Finding

WRC 537 §4.3.6 permits arbitrary-loading stress evaluation at eight cylindrical shell-juncture points but explicitly does not assure that the absolute maximum stress intensity occurs at one of those points. Prior EMP.1 results exposed the eight values without a machine-readable extrema-authority boundary, allowing downstream code to promote `max(stressIntensity[8])` into an unsupported global shell maximum.

## Implemented repair

- Table-5 result schema v3 adds `extremaScope`;
- exact evaluated location set is `Au, Al, Bu, Bl, Cu, Cl, Du, Dl`;
- the only reported extrema summary is `MAXIMUM_OVER_EVALUATED_TABLE5_EIGHT_POINTS_ONLY` plus its governing evaluated location;
- `absoluteShellMaximumAssured=false`;
- `arbitraryLoadingGlobalMaximumAuthority=false`;
- `continuousJunctureSearchPerformed=false` and `intermediatePointSearchPerformed=false`;
- bounded adapter propagates the extrema contract;
- route registry carries limitation `WRC_TABLE5_EIGHT_POINTS_NOT_GLOBAL_ABSOLUTE_MAXIMUM` separately from the existing four production suspension reasons;
- regression check proves the existing UI remains safely worded as `Eight-location shell stress trace` and that no global-maximum field is emitted.

## Engineering non-scope

No WRC coefficient, curve ordinate, Table-5 dimensional stress equation, sign matrix, load transform, gamma/beta domain, §4.5 applicability rule, pressure policy, Kn/Kb rule, or FEM path changed. No continuous/off-axis interpolation or global search was invented.

## Validation

Exact engineering head `ad05878e4bea39359edb212378ee58281be2d23b`:

- `EMP.1 current-main independent baseline` — **PASS**, run `32454580358`.
- `EMP.1 runEmp1 bounded gamma5 orchestration` — **PASS**, run `32454580383`.
- `EMP.1 gamma5 bounded route on current main` — **PASS**, run `32454580359`.
  - frozen independent Table-5 oracle remains unchanged;
  - new eight-point extrema-scope check PASS;
  - public product projection retains the new limitation without changing the production suspension set.
- Local connector execution: `NOT_RUN`; no local PASS is claimed.

## Authority state after PR1311

Production gamma5 remains suspended for the same four independent reasons:

1. `WRC_CYLINDRICAL_LOAD_AXIS_SIGN_UNRESOLVED`
2. `WRC_LONGITUDINAL_MOMENT_CURVE_SELECTION_AUTHORITY_UNRESOLVED`
3. `WRC_ATTACHMENT_OUTSIDE_RADIUS_SOURCE_BASIS_UNQUALIFIED`
4. `WRC_CYLINDRICAL_4_5_APPLICABILITY_SOURCE_BASIS_UNQUALIFIED`

The eight-point/global-maximum issue is now represented as an explicit method limitation rather than a fabricated fifth suspension reason.

## Exact next action

PR #1311 is qualified and ready for owner merge decision. After merge, address the remaining independent-oracle common-mode risk: the current hand calculation duplicates production interpretation choices for figure mapping/sign matrices and therefore is not sufficiently independent to falsify those interpretation defects.

## Appendix A

1. Why can the maximum of eight WRC Table-5 values not be called the absolute shell maximum under arbitrary loading?
2. What exact `extremaScope` fields prevent that overclaim?
3. Why is no continuous circumferential interpolation/search added in this PR?
4. Why is the extrema condition a retained limitation rather than an additional route suspension reason?
5. What remains common-mode between the frozen hand calculation and production interpretation after this PR?
