# PR1315 Work Report — EMP1-13 WRC r0 typed source basis

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `PR: #1315`
- `PR_STATE: DRAFT_IMPLEMENTING`
- `BRANCH: agent/emp1-13-r0-source-basis-20260821`
- `BASE_MAIN: d80fdd2e82734da31abe926a373203a0183a3ca3`
- `MERGE_AUTHORITY: NOT_GRANTED_FOR_PR1315`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`

## Mission

Close `WRC_ATTACHMENT_OUTSIDE_RADIUS_SOURCE_BASIS_UNQUALIFIED` by making the EMP.1 product source explicitly own and hash the physical meaning required by WRC cylindrical `r0`: **outside radius of the attachment at the shell juncture**. Do not change `beta = 0.875*r0/Rm` or silently promote existing generic-diameter inputs.

## Current finding

Current workbench source carries only:

```text
geometryIdentity
attachmentDiameter
unit
sourceReference
```

The UI label says “outside diameter,” but the normalized source contract does not retain `diameterBasis` or `physicalLocation`. `emp1-wrc537-source-custody.js` therefore correctly marks the existing evidence `UNQUALIFIED_FOR_PRODUCTION` / `CALLER_DECLARED_SOURCE_LOCATOR_ONLY`.

## Planned source contract

A production-eligible r0 binding must retain and hash:

```text
diameterBasis = OUTSIDE_DIAMETER_AT_SHELL_JUNCTURE
physicalLocation = ATTACHMENT_SHELL_JUNCTURE
outsideDiameter > 0
canonical unit
sourceReference
geometryIdentity
sourceBindingSemanticHash
productionObservationUsedToSetAuthority = false
```

Legacy run-input v2 must not be silently migrated to this meaning. Re-binding is required.

## First implementation

Added `src/core/emp1/emp1-wrc537-attachment-source-authority.js` with a strict authority creator/validator. It rejects generic basis, wrong physical location, absent source/hash/unit, nonpositive diameter, production-observation contamination and semantic-hash drift.

## Protected invariants

- WRC Table-5 arithmetic unchanged.
- `gamma` and `beta` formulas unchanged.
- r0 continues to mean outside radius at shell juncture.
- attachment diameter is not derived from SVG/display geometry.
- no generic diameter fallback.
- no silent v2 → qualified-v3 migration.
- route remains suspended until this and the remaining source blockers are fully integrated/qualified.

## Validation ledger

- PR-head Actions: NOT_RUN / implementation incomplete.
- Local repository runtime: NOT_RUN.
- New authority module source review: IMPLEMENTED, not yet integration-qualified.

## Next action

1. bump the workbench run-input source schema and require typed basis/location;
2. create hash-bound qualified attachment evidence from normalized product input;
3. retain it through B/C custody;
4. require it before any future production C execution;
5. add legacy-v2, basis spoof, location spoof, hash drift and unit falsifiers;
6. update read-only UI evidence;
7. only then remove the live r0 suspension reason.

## Appendix A

1. Why is an input label saying “outside diameter” insufficient calculation authority?
2. Why must old v2 data be re-bound instead of defaulting the new basis fields?
3. Which fields make the physical WRC r0 meaning machine-verifiable?
4. Why does a free-text sourceReference alone remain insufficient?
5. Which hash must change if the attachment geometry binding changes?
6. Where must qualified r0 evidence be checked before future production C execution?
7. Which two source-authority blockers remain after r0 closure?
