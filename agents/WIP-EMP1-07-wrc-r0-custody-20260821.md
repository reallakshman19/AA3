# EMP1-07 WIP — WRC r0 outside-radius custody

## Recovery header

- Repository: `reallaksh19/Advanced_Analysis`
- Base: `main@3fabeda25d06c36f392e22101648aa52eba809ea`
- Criticality: ENGINEERING_CRITICAL
- State: IMPLEMENTED_PENDING_PR_QUALIFICATION
- Production gamma5 route: SUSPENDED

## Finding

The retained WRC method definition states `r0` is the **outside radius of the cylindrical attachment**. The EMP.1 geometry chain previously carried an unlabeled `attachmentDiameter`/`attachmentRadius`. Its number was hash-bound, but its physical radius basis was not. An attachment inside or mean diameter could therefore remain internally self-consistent while producing the wrong `beta = 0.875*r0/Rm`.

## Repair

- add EMP.1 attachment geometry evidence with explicit `OUTSIDE_DIAMETER_AT_SHELL_JUNCTURE` basis;
- hash-bind that physical-basis evidence separately from the generic correlation geometry evidence;
- derive and expose `attachmentOutsideRadius` plus `OUTSIDE_RADIUS_AT_SHELL_JUNCTURE` basis in WRC source custody;
- qualified WRC geometry rejects an unlabeled generic `attachmentRadius`;
- comparison-only legacy geometry remains distinguishable as `LEGACY_UNQUALIFIED_ATTACHMENT_RADIUS`;
- retain a compatibility numeric alias only after the outside-radius basis is established;
- add production suspension reason `WRC_ATTACHMENT_OUTSIDE_RADIUS_SOURCE_BASIS_UNQUALIFIED` because current attachment source evidence is still a caller-declared source locator, not independently parsed/verified authority.

## Important authority statement

This PR closes the **semantic ambiguity** and makes it impossible to reauthorize production while the `r0` source basis is merely declared. It does not claim that the current caller-supplied attachment source reference is independently qualified. Production remains fail closed.

## Validation target

- source definition guard for WRC `r0`;
- exact outside-radius derivation and beta check;
- ambiguous generic-radius falsifier;
- attachment-evidence hash binding;
- existing independent Table-5, longitudinal-curve, zero-dp load, axis-authority and public-product checks.
