# WIP work report — EMP1-23 WRC off-axis longitudinal-moment extrema authority

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `ISSUE: #1354`
- `BASE: main@d871a987a91ae843b873b7762f324bba758ed5ac`
- `BRANCH: agent/emp1-23-off-axis-extrema-source`
- `MERGE_AUTHORITY: OWNER_GRANTED_IN_CHAT_2026-08-23`
- `PRODUCTION_CODE_CHANGED: false`
- `WORKFLOW_FILES_CHANGED: false`
- `OFF_AXIS_PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_ABSOLUTE_MAXIMUM_AUTHORITY: false`
- `GAMMA5_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORITY: false`
- `RELEASE_QUALIFIED: false`

## Objective

Qualify only what the retained WRC source evidence supports about longitudinal-moment off-axis curves `1B-1/2B-1`, while preventing a comparison-only selector from being mistaken for production applicability or global-maximum authority.

## Current source/production baseline

Existing eight-point authority:

`docs/emp1/WRC537_2013_Longitudinal_Moment_Eight_Point_Authority.md`

Qualified recovery domain:

`Au, Al, Bu, Bl, Cu, Cl, Du, Dl`

Qualified longitudinal-moment selection:

- circumferential stress: `1B`;
- longitudinal stress: `2B`.

Boundaries:

- no continuous/intermediate-point search;
- `absoluteShellMaximumAssured=false`;
- `1B-1/2B-1` unauthorized by this route.

## Retained source finding

The retained source ledger records:

- Table 5 references `1B or 1B-1` and `2B or 2B-1` for longitudinal-moment bending;
- §4.4 describes the `-1` curves as maximum longitudinal-moment bending stresses away from the axes of symmetry;
- their stated applicability is limited, to the best of WRC knowledge, to a round flexible-nozzle connection;
- §4.3.6/eight-point custody does not assure that the absolute maximum stress intensity occurs at the eight Table-5 points.

## Comparison selector audit

`src/core/emp1/emp1-wrc537-longitudinal-moment-curve-selection.js` retains a comparison selector:

```text
mode = OFF_AXIS_MAXIMUM
attachmentShape = ROUND
connectionFlexibility = FLEXIBLE_NOZZLE
applicabilitySourceRef required
```

It yields `1B-1/2B-1` but explicitly returns:

`productionAuthorityForTable5EightPointRoute=false`.

This is software gating, not a source-qualified method for classifying a real connection as `FLEXIBLE_NOZZLE`. A caller-supplied classification/source string is insufficient production authority.

## Maximum-claim separation

Three claims are explicitly separated:

A. off-axis longitudinal-moment component maximum;
B. combined shell stress at one common physical location;
C. global absolute shell stress intensity under arbitrary six-component loading.

Authority for A does not imply B or C.

If independently maximized components occur at different angles, combining them would create a synthetic stress state unless source evidence provides a conservative/common-location combination rule.

## Unresolved production-critical authority

1. source-qualified flexible-nozzle classification rule;
2. physical off-axis recovery location/angle;
3. whether 1B-1 and 2B-1 maxima coincide;
4. whether other load-family stresses may be recovered at that same point;
5. positive/negative Ml sign-location mapping;
6. inside/outside surface recovery;
7. exact Original-curve domain intersection for off-axis use;
8. whether continuous search/location recovery is required;
9. common-location combined-stress authority;
10. global absolute stress-intensity authority.

## Changed-file ledger

1. `validation/emp1/wrc537-2013/off-axis-longitudinal-moment-source-qualification-v1.json`
2. `docs/emp1/WRC537_2013_Off_Axis_Longitudinal_Moment_Authority.md`
3. `scripts/emp1-wrc537-off-axis-longitudinal-source-check.mjs`
4. this workreport, to be renamed after PR allocation.

No production, route registry, WRC numerical, oracle, tolerance, UI, package or workflow file is changed.

## Validation ledger

### VAL-OA-01 — current-main grounding
- status: `PASS`
- basis: remote repository inspection
- main: `d871a987a91ae843b873b7762f324bba758ed5ac`

### VAL-OA-02 — retained source authority
- status: `PASS_BOUNDED_SOURCE_INTERPRETATION`
- 1B/2B eight-point route and 1B-1/2B-1 off-axis distinction retained.

### VAL-OA-03 — comparison-selector boundary
- status: `PASS_SOURCE_INSPECTION`
- round/flexible/source-ref requirements present;
- production authority for eight-point route false.

### VAL-OA-04 — common-location/global-max authority
- status: `BLOCKED_EXPECTED`
- no source-qualified recovery-location coincidence or global-maximum rule exists in current repository evidence.

### VAL-OA-05 — primary binary-page re-observation
- status: `NOT_RUN_PRIMARY_PAGE_ACCESS`
- pinned source identity retained; no missing source rule guessed.

### VAL-OA-06 — focused Node checker
- status: `NOT_RUN_EXECUTION_ENVIRONMENT`
- checker authored; no runtime PASS claimed under current environment limitations.

## Current disposition

`BLOCKED_OFF_AXIS_PRODUCTION_AUTHORITY_RECOVERY_AND_APPLICABILITY_UNRESOLVED`

## Protected invariants

- eight-point production route remains 1B/2B;
- no `FLEXIBLE_NOZZLE` inference from user/caller label;
- no separately maximized component superposition without common-location authority;
- no global absolute maximum claim;
- no off-axis production route;
- no gamma/beta/pressure/SCF expansion;
- no global/code/release authority.

## Next gate

Obtain controlled source evidence that defines flexible-nozzle applicability and off-axis physical recovery/location/superposition semantics. Only after that may independent numerical cases or a production route be proposed.

## Appendix A — takeover questions

1. What exactly do 1B-1/2B-1 represent according to retained source custody?
2. Why are they not selectable alternatives in the eight-point production route?
3. What does the source require regarding round flexible nozzle applicability?
4. Why is caller-supplied `FLEXIBLE_NOZZLE` not production authority?
5. What is the existing eight-point recovery set?
6. Does the current route perform a continuous junction search?
7. Does the current route assure the absolute shell maximum?
8. Why can independently maximized stress components not be blindly superposed?
9. Is the physical angular location of 1B-1/2B-1 maxima source-qualified in current evidence?
10. Is coincidence of 1B-1 and 2B-1 maxima proven?
11. What authority is needed before other load-family stresses may be combined at an off-axis point?
12. What is the distinction between component maximum and global stress-intensity maximum?
13. Does this increment change production mechanics?
14. What exact source gate must close before an off-axis production route is proposed?

Target takeover score: >=92/100 total and every question >=17/20 before production semantic widening.
