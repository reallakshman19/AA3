# WRC 537 (2013) cylindrical surface/sign authority

Status: `BLOCKED_PRIMARY_SURFACE_SIGN_SEMANTICS_UNQUALIFIED`

## Current bounded implementation

The existing cylindrical Table-5 implementation evaluates `Au, Al, Bu, Bl, Cu, Cl, Du, Dl` with fixed sign arrays and algebraic load-polarity reversal. This PR does **not** change those arrays or any numerical mechanics.

## Source-authority boundary

The retained legacy WRC extraction is explicitly `NOT_READY_FOR_IMPLEMENTATION`. It records candidate membrane ± bending surface reconstruction but also marks the exact cylindrical sign reconstruction unresolved pending direct verification of the controlled WRC General Equation and cylindrical sign tables.

Therefore the repository does not yet claim primary-source authority for:

- the physical surface meaning of `u` and `l`;
- the exact physical meaning of A/B/C/D;
- membrane/bending sign reconstruction at each point;
- the complete P/Mc/Ml/Vc/Vl/Mt sign matrix;
- common-point superposition semantics needed before stress-intensity reconstruction.

## Fail-closed rules

Do not infer `u/l` from naming intuition, generic shell theory, CAUx output, or current production output. Do not alter current sign arrays from OCR/secondary evidence. Do not take absolute values before algebraic component superposition. Code-compliance and release authority remain false.

## Closure evidence

Direct primary-source observation must retain exact document digest, page/section/table/equation locators, point/surface definitions, sign multipliers, load-polarity rule, and at least one independently reproducible positive/negative sign case.
