# PR1309 Work Report — EMP1-07 WRC r0 outside-radius custody

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `PR: #1309`
- `BRANCH: agent/emp1-07-wrc-r0-outside-radius-custody-20260821`
- `BASE_MAIN: 3fabeda25d06c36f392e22101648aa52eba809ea`
- `VALIDATED_ENGINEERING_HEAD: c1a93de5831cf623170faaef077126a4929d39c8`
- `MERGE_AUTHORITY: NOT_GRANTED_FOR_PR1309`
- `GAMMA5_PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_REGISTERED: false`
- `QUALIFICATION_STATE: PASS_READY_FOR_OWNER_MERGE_DECISION`

## Finding

The retained WRC method definition states cylindrical `r0` is the **outside radius of the cylindrical attachment**. Prior EMP.1 custody hash-bound a generic `attachmentDiameter` / `attachmentRadius` number but did not encode that physical radius basis. A nozzle inside or mean diameter could therefore remain internally consistent while producing the wrong `beta = 0.875*r0/Rm`.

## Implemented repair

- added EMP.1 attachment geometry evidence with explicit `OUTSIDE_DIAMETER_AT_SHELL_JUNCTURE` basis;
- separately semantic-hash-bound the attachment physical-basis evidence;
- source custody derives and exposes `attachmentOutsideRadius` with `OUTSIDE_RADIUS_AT_SHELL_JUNCTURE` basis;
- source custody binds the attachment geometry evidence hash alongside the LAFEA.2 geometry evidence hash;
- qualified WRC geometry rejects an unlabeled generic `attachmentRadius`;
- comparison compatibility may retain a numeric alias only after the WRC outside-radius basis is established;
- added `WRC_ATTACHMENT_OUTSIDE_RADIUS_SOURCE_BASIS_UNQUALIFIED` as an independent production suspension reason because the current attachment source locator remains caller-declared rather than independently parsed/verified.

## Numerical check

For the frozen comparison geometry:

```text
Rm = 100 mm
T  = 20 mm
attachment outside diameter = 35.42857142857143 mm
r0 = OD_attachment / 2 = 17.714285714285715 mm
beta = 0.875 * r0 / Rm = 0.155
```

An input carrying only `attachmentRadius=17.714285714...` without the outside-radius semantic field is rejected from qualified WRC geometry with `EMP1_WRC537_BOUNDED_ATTACHMENT_OUTSIDE_RADIUS_REQUIRED`.

## Validation ledger

Exact engineering head `c1a93de5831cf623170faaef077126a4929d39c8`:

- `EMP.1 current-main independent baseline` — **PASS**, run `32450085860`.
- `EMP.1 runEmp1 bounded gamma5 orchestration` — **PASS**, run `32450085858`.
- `EMP.1 gamma5 bounded route on current main` — **PASS**, run `32450085868`.
  - independent frozen Table-5 oracle retained;
  - WRC r0 outside-radius source/custody check PASS;
  - longitudinal-moment curve-selection policy PASS;
  - zero-dp load producer PASS;
  - fail-closed gamma5 authority PASS;
  - public-product blocked-authority truth PASS.
- local connector execution — `NOT_RUN`; no local PASS claimed.

## Authority boundary

This PR closes the semantic ambiguity but does **not** claim the attachment-diameter source is independently qualified. Production remains suspended on:

1. `WRC_CYLINDRICAL_LOAD_AXIS_SIGN_UNRESOLVED`;
2. `WRC_LONGITUDINAL_MOMENT_CURVE_SELECTION_AUTHORITY_UNRESOLVED`;
3. `WRC_ATTACHMENT_OUTSIDE_RADIUS_SOURCE_BASIS_UNQUALIFIED`.

No WRC coefficient, Table-5 dimensional equation, pressure policy, Kn/Kb rule, gamma/beta range, load-transfer formula, or FEM path is changed.

## Exact next action

PR #1309 is qualified and ready for owner merge decision. After merge, proceed to WRC §4.5 applicability gates: cylinder length/end proximity and the shell-only stress limitation. Do not widen production authority while those applicability inputs remain absent.

## Appendix A — takeover questions

1. Why is a hash-bound radius number insufficient without an outside/inside/mean physical basis?
2. Where is the WRC `r0` outside-radius definition retained and how is it represented in source custody now?
3. Why is `attachmentRadius` still allowed only as a compatibility numeric alias after outside-radius authority is established?
4. What is still unqualified about the attachment source even after this PR?
5. Which three independent production suspension reasons remain?
6. What WRC §4.5 applicability checks should be implemented next?
