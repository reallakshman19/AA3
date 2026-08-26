# WRC 537 (2013) — Longitudinal-moment curve authority for EMP.1 Table-5 eight-point route

## Status

`QUALIFIED_FOR_BOUNDED_TABLE5_EIGHT_POINT_SELECTION`

This ledger closes only the curve-selection question for the existing bounded EMP.1 cylindrical Table-5 route. It does not authorize a continuous circumferential maximum search or infer nozzle flexibility.

## Retained source custody

- Method: WRC 537, 2013 cylindrical-shell local stress method.
- Pinned source SHA-256: `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`.
- Table 5, retained transcription pages 41–42: longitudinal-moment bending references are `1B or 1B-1` and `2B or 2B-1`.
- Section 4.4: the `-1` curves represent maximum longitudinal-moment bending stress away from the axes of symmetry; their stated applicability is limited, to the best of WRC knowledge, to a round flexible nozzle connection.
- Section 4.3.6 / EMP1-09 retained scope: arbitrary cylindrical loading is evaluated at the eight Table-5 shell-juncture locations, while WRC does not assure that the absolute maximum stress intensity occurs at one of those eight points.

The retained Table-5 transcription is `docs/emp1/WRC537_2013_Tables_and_Charts.md`. The source interpretation was already separated from the independent numerical oracle in EMP1-10.

## Engineering disposition

The bounded route evaluates exactly:

```text
Au, Al, Bu, Bl, Cu, Cl, Du, Dl
```

and explicitly performs no continuous/intermediate-point search. For this eight-point recovery domain, longitudinal-moment bending uses the axis-of-symmetry curves:

```text
circumferential stress family: Figure 1B
longitudinal stress family:    Figure 2B
```

The route therefore does **not** need to classify the attachment as a flexible nozzle to perform its Table-5 eight-point calculation.

The off-axis maximum curves remain outside this bounded route:

```text
1B-1 / 2B-1
```

They may only be considered by a separate off-axis evaluation that has explicit round flexible-nozzle applicability custody. They are not an alternative selectable production branch inside the Table-5 eight-point route.

## Software authority contract

`EMP1_WRC537_TABLE5_EIGHT_POINT_LONGITUDINAL_AUTHORITY` binds:

- pinned WRC source hash;
- exact source locators;
- exact eight recovery locations;
- `continuousJunctureSearchPerformed = false`;
- `absoluteShellMaximumAssured = false`;
- production selection `1B/2B`;
- off-axis `1B-1/2B-1` explicitly unauthorized by this route;
- semantic hash and exact object shape;
- `productionObservationUsedToSetAuthority = false`.

`evaluateEmp1Wrc537CylindricalBoundedQualifiedNumerics` requires this authority object. The comparison evaluator retains the separate explicit selector so source-qualified off-axis experiments remain possible without becoming production authority.

## Falsifiers

Qualification must reject:

1. an eight-point authority changed to `OFF_AXIS_MAXIMUM`;
2. `1B-1/2B-1` substituted into the qualified eight-point selection;
3. changed/reordered recovery locations;
4. hidden authority fields;
5. changed source locators;
6. semantic-hash drift;
7. any claim that the eight-point envelope is the global absolute shell maximum.

## Resulting bounded-route state

Resolved blocker:

```text
WRC_LONGITUDINAL_MOMENT_CURVE_SELECTION_AUTHORITY_UNRESOLVED
```

Remaining WRC source-authority suspension reason:

```text
WRC_CYLINDRICAL_4_5_APPLICABILITY_SOURCE_BASIS_UNQUALIFIED
```

Still outside route authority include off-axis longitudinal-moment maximum, nonzero differential pressure, non-unity SCF, non-tabulated gamma, beta outside the bounded dataset, global EMP.1.C authority, code compliance and release qualification.
