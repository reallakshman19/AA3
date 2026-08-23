# PR1378 Work Report — EMP1-33 cylindrical mean-radius source boundary

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `PR: #1378`
- `ISSUE: #1377`
- `BRANCH: agent/emp1-33-cylindrical-mean-radius-source-boundary`
- `BASE_MAIN: 8072f41a106c3e4b84d315604e548c1d28133689`
- `MERGE_AUTHORITY: GRANTED_BY_OWNER_CHAT_2026-08-23`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`

## Mission

Freeze the source boundary around the cylindrical WRC host-shell radius. Do not modify the current deterministic `meanRadius = OD/2 - assessmentThickness/2` calculation. Distinguish internal geometric consistency from primary-source authority for the physical cylindrical radius definition.

## Engineering finding

Current EMP.1 source custody derives:

```text
outerRadius = pipeOutsideDiameter / 2
meanRadius  = outerRadius - assessmentPipeThickness / 2
gamma       = meanRadius / shellThickness
beta        = 0.875 * attachmentOutsideRadius / meanRadius
```

The retained extraction `docs/01_WRC537_METHOD_DEFINITION.md` is explicitly `NOT_READY_FOR_IMPLEMENTATION`. It retains two different radius facts:

- spherical shell: `R_m`, confirmed mean/midsurface radius with `R_m = R_i + T/2 = (R_o + R_i)/2`;
- cylindrical shell: `R_c`, described as mean radius but with the exact geometric definition marked `UNRESOLVED — exact definition not OCR-readable`.

Therefore neither the current code field name `meanRadius` nor the confirmed spherical relation may be used as primary cylindrical authority.

## Implemented source boundary

This PR adds only:

1. `validation/emp1/wrc537-2013/cylindrical-mean-radius-source-qualification-v1.json`
   - records current software derivation as an observation;
   - retains cylindrical `Rc` versus spherical `Rm` distinction;
   - keeps all cylindrical radius construction authority flags false;
   - explicitly prohibits spherical-semantic transfer and OD/ID shortcuts.
2. `docs/emp1/WRC537_2013_Cylindrical_Mean_Radius_Authority.md`
   - documents the engineering distinction and primary-source reopen gate.
3. `scripts/emp1-wrc537-cylindrical-mean-radius-source-check.mjs`
   - fail-closed assertions for the ledger state.
4. this living workreport.

## Protected invariants

- current production/source-custody code unchanged;
- `meanRadius = OD/2 - assessmentThickness/2` unchanged;
- `gamma = meanRadius/T` unchanged;
- `beta = 0.875*r0/meanRadius` unchanged;
- WRC §4.5 length/end-distance logic unchanged;
- attachment `r0` authority from EMP1-13 unchanged;
- shell-thickness basis remains source-gated by EMP1-32;
- no spherical, pressure, SCF, off-axis, nearby-interaction, code or release authority widened.

## Validation truth

- source-level review: `PASS_SOURCE_REVIEW`;
- local Node execution: `NOT_RUN` in the connected repository environment;
- runtime PASS: **not claimed**;
- production numerical behavior: unchanged.

## Changed-file ledger

1. `agents/PR1378_workreport.md`
2. `docs/emp1/WRC537_2013_Cylindrical_Mean_Radius_Authority.md`
3. `scripts/emp1-wrc537-cylindrical-mean-radius-source-check.mjs`
4. `validation/emp1/wrc537-2013/cylindrical-mean-radius-source-qualification-v1.json`

No `.github/workflows/*`, production evaluator, adapter, route registry, coefficients, tolerances or UI files are changed.

## Current disposition

`BLOCKED_PRIMARY_CYLINDRICAL_RADIUS_DEFINITION_UNRESOLVED`

A later implementation increment requires direct primary-source closure of the exact cylindrical radius symbol/definition, OD/ID/T relation, geometry assessment basis, and treatment of local/nonuniform geometry.

## Appendix A — takeover qualification

1. What is the current software equation used to derive host-shell mean radius?
2. Which upstream quantities feed that equation?
3. What cylindrical radius symbol is retained in the legacy WRC extraction?
4. Why is the spherical `R_m` definition insufficient cylindrical authority?
5. Why does a deterministic algebraic construction not establish physical source authority?
6. Which downstream WRC parameters depend on the host-shell radius?
7. Why must EMP1-32 shell-thickness basis and EMP1-33 radius basis remain linked but distinct?
8. What geometry cases remain unresolved: corrosion, measured local diameter, ovality, thickened/tapered shell?
9. Which production files are intentionally untouched by this PR?
10. What exact primary-source evidence is required before changing radius custody?

Takeover score requirement: 92/100 total and every answer >=17/20 before changing engineering semantics.
