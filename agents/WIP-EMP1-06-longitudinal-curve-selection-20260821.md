# EMP1-06 WIP — WRC longitudinal-moment curve-selection authority

- Base: `main@564b67a478dd660fbf39e780f289f4739c0e7261`
- Criticality: ENGINEERING_CRITICAL
- State: READY_FOR_PR

## Finding

WRC537 Table 5 requires `1B or 1B-1` and `2B or 2B-1`; Section 4.4 identifies the `-1` curves as off-axis maximum-stress curves and states their applicability, to the best of WRC knowledge, only for a round flexible nozzle connection. Current EMP.1 hard-coded `1B-1/2B-1` from `attachmentShape=ROUND` alone.

## Repair

- remove `1B-1/2B-1` from the static figure map;
- add explicit longitudinal-moment bending selection contract;
- `AXIS_OF_SYMMETRY` resolves to `1B/2B`;
- `OFF_AXIS_MAXIMUM` resolves to `1B-1/2B-1` only for explicit ROUND + FLEXIBLE_NOZZLE + applicability source reference;
- gamma5 comparison candidate uses axis-of-symmetry curves rather than silently asserting flexible-nozzle applicability;
- add `WRC_LONGITUDINAL_MOMENT_CURVE_SELECTION_AUTHORITY_UNRESOLVED` as an independent production suspension reason.

No production route is reauthorized. No WRC coefficient or dimensional stress equation changes.
