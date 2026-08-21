# WIP — EMP1-15 WRC 537 §4.5 applicability source authority

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: IMPLEMENT`
- `MUTATION_AUTHORITY: WRITE_ALLOWED`
- `BRANCH: agent/emp1-15-wrc-45-source-authority-20260821`
- `BASE_MAIN: 73a427e40f18b9964e551af89690b21f854a3c49`
- `MERGE_AUTHORITY: NOT_GRANTED_FOR_SUCCESSOR`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`

## Mission

Close only `WRC_CYLINDRICAL_4_5_APPLICABILITY_SOURCE_BASIS_UNQUALIFIED` for the existing bounded WRC 537 cylindrical gamma5 zero-dP Table-5 route. Preserve every other route limitation and do not change WRC coefficients, Table-5 algebra/signs, gamma/beta, pressure policy, SCF policy, eight-point recovery semantics, or off-axis maximum authority.

## Source arbitration

Retained project ledger: `docs/emp1/WRC537_2013_Applicability.md`.

Independent re-observation of public copies of the retained WRC text confirms:

- §4.5.1 External Radial Load: the report curves use `l/Rm = 8`; ordinary practical deviations are discussed, but results are explicitly not considered applicable when cylinder length `l < Rm`. The production floor therefore remains `l >= Rm` when radial load `P` is active.
- §4.5.2 External Moment: longitudinally off-center attachments are applicable provided the attachment is at least `0.5 Rm` from the end of the cylinder. The production floor remains nearest-end distance `>= 0.5 Rm` when `Mc` or `Ml` is active.
- §4.5.3 remains shell-stress-only; it does not authorize nozzle/attachment stress.

The open defect is not the two inequalities. The defect is that current `applicabilityEvidence` accepts caller-declared numbers/source strings with `sourceQualification = UNQUALIFIED_FOR_PRODUCTION`; the route has no typed, immutable engineering-source authority binding cylinder length and attachment/end geometry to retained A/B/C custody.

## Planned repair

1. Add a typed WRC §4.5 geometry-source authority object with exact semantic hash/shape/source references.
2. Bind at minimum: cylinder length, attachment longitudinal station from a declared cylinder datum, and source references sufficient to derive distances to both cylinder ends.
3. Derive `nearestCylinderEndDistance = min(x, l-x)`; do not accept caller-authored nearest distance as production authority.
4. Require consistent canonical length units and `0 <= x <= l`.
5. Make load-conditional applicability use the derived geometry authority.
6. Reject source/hash/unit/value/datum drift and deliberate nearest-end spoofing.
7. Remove only `WRC_CYLINDRICAL_4_5_APPLICABILITY_SOURCE_BASIS_UNQUALIFIED` after route/registry/public-product/transaction evidence is reconciled.
8. Keep route production fail-closed until complete route refreeze/requalification is executed; do not silently reuse historical `3b437...` as new §4.5 authority.

## Current technical diagnosis

Current `src/core/emp1/emp1-wrc537-cylindrical-applicability.js` normalizes `cylinderLength` and `nearestCylinderEndDistance` from caller evidence and preserves source strings, but deliberately marks the source qualification `UNQUALIFIED_FOR_PRODUCTION`. This is the first wrong authority boundary.

## Protected invariants

- `l < Rm` remains outside source limits for active radial `P`.
- nearest end distance `< 0.5 Rm` remains outside source limits for active `Mc`/`Ml`.
- equality at `l/Rm = 1` and end-distance/Rm `= 0.5` remains boundary PASS for comparison/applicability.
- no new §4.5 geometric restriction for `Vc`, `Vl`, or `Mt` alone.
- host-shell stress only; no nozzle/attachment stress authority.
- no WRC numerical coefficient/equation/sign changes.
- no global absolute maximum claim.
- no workflow-file change unless separately authorized.

## Validation ledger

- Source arbitration: `PASS_SOURCE_REOBSERVATION` by source inspection; independent public copies agree on §4.5.1/.2 wording.
- Local runtime: `NOT_RUN`.
- GitHub Actions: `NOT_RUN` for successor head.

## Exact next action

Open the successor draft PR, allocate the permanent `agents/PR<NUMBER>_workreport.md`, then implement typed §4.5 geometry-source authority and its falsifiers before changing route suspension metadata.
