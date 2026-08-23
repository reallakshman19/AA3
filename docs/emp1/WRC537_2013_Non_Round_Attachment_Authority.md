# WRC 537 non-round attachment authority

## Decision

The current EMP.1.C WRC 537 bounded route remains cylindrical + round attachment only.

The retained legacy method extraction contains secondary/unqualified evidence that WRC 537 includes rectangular loading geometry (`C1`, `C2`) and a candidate square-attachment parameter note. However, that extraction is explicitly `NOT_READY_FOR_IMPLEMENTATION` and was not primary-PDF verified for these non-round rules.

Therefore non-round/rectangular/square attachments are recognized only as a candidate separate WRC 537 source family. They are not authorized for calculation or production use in this increment.

## Prohibited surrogate geometry

The following are not acceptable substitutes for source qualification:

- equal-area equivalent circle;
- equal-perimeter equivalent circle;
- hydraulic/equivalent diameter;
- using the round outside radius `r0` or round beta equation for a rectangular footprint;
- reusing round coefficient rows because the resulting dimensions are similar;
- fitting a surrogate radius to match a known stress result.

Any such mapping would be a new engineering model, not a source-qualified WRC 537 rule.

## Primary-source closure required

Before non-round implementation, verify directly from the controlled WRC 537 source:

1. exact supported non-round attachment families;
2. exact `C1`/`C2` definitions and orientation;
3. all non-round nondimensional parameter equations;
4. parameter domains and inclusivity;
5. curve/table/coefficient inventory by load and stress component;
6. Original/Extrapolated usage rules;
7. sign/load-reference convention;
8. stress components, surfaces and physical recovery locations;
9. aspect-ratio and configuration restrictions;
10. hollow/solid/rigid/flexible/reinforced applicability;
11. interpolation/extrapolation policy;
12. at least one source/reference numerical example for independent reproduction.

Until then:

`attachmentShape = ROUND` remains the only authorized bounded-route shape.

`nonRoundCalculationAllowed = false`

`equivalentRoundApproximationAllowed = false`

`globalEmp1CRouteRegistrationAllowed = false`

No production numerical, workflow, gamma/beta, pressure, SCF, off-axis/global, nozzle/attachment-component, code or release authority is changed by this source-governance increment.
