# PR1312 Work Report — EMP1-10 independent WRC source-derived oracle

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `TAKEOVER_AUTHORITY: WRITE_ALLOWED`
- `WORK_INTENT: VALIDATION_ARCHITECTURE`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `PR: #1312`
- `BRANCH: agent/emp1-10-wrc-independent-oracle-decoupling-20260821`
- `CURRENT_MAIN: c24378e94d61526afc6a50fc51e0e5c38eae932e`
- `CURRENT_MAIN_INCREMENT: EMP1-05 / PR #1306`
- `ENGINEERING_HEAD_VALIDATED_BEFORE_MAIN_RECONCILIATION: 42342d4d94ecac7c6481b5a987c97fdf55bce879`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_AUTHORIZED: false`
- `CODE_COMPLIANCE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`

## P0 finding closed

The previous gamma5 “independent” hand calculation imported no production code, but it could still share common-mode WRC interpretation errors because the Table-5 figure map and sign matrix were duplicated as constants. A wrong interpretation could therefore produce PASS/PASS.

EMP1-10 changes the validation architecture so source interpretation and numerical reconstruction are independently derived and mechanically isolated from production semantic modules.

## Authority architecture implemented

```text
retained WRC Table 5 / coefficient transcription
                ↓
reviewed source interpretation artifact
                ↓
independent source-authority parser
                ↓
independent Table-5 numerical kernel
                ↓
mutation/load falsifiers + production comparison
```

CAUx remains secondary historical worked-case evidence only. It does not define WRC method authority and does not authorize production curve selection.

## Source authority split

### WRC Table 5 — primary validation authority

`docs/emp1/WRC537_2013_Tables_and_Charts.md`, Table 5, pp.41–42 supplies:

- allowed figure/reference cells;
- algebraic sign placement;
- reversal statement for opposite load direction.

### Reviewed interpretation artifact

`validation/emp1/wrc537-2013/table5-reviewed-interpretation-v1.json` binds retained source cells to reviewed engineering meanings and records:

- eight recovery locations;
- required source anchors;
- WRC-allowed figure alternatives;
- historical gamma5 worked-case alternatives separately from production authority;
- reviewed sign arrays;
- `productionMethodAuthority=false`;
- semantic hash `654e33f7fa7124c78e827bffeae06570d7feb401624291c823a6218b6bd012d2`.

### CAUx — secondary validation only

`docs/emp1/CAUx_2017_WRC01f_pages_24-31.md` is used only to validate the historical worked-case AB/CD / alternative selection represented by the frozen gamma5 comparison vector.

It does not remove or weaken EMP1-06 production curve-selection authority.

## Independent import firewall

Isolated oracle modules live under:

`scripts/oracles/emp1-wrc537/**`

CI mechanically rejects:

- `src/core/**` imports;
- `src/workspace/**` imports;
- production Table-5 evaluator imports;
- production bounded-adapter imports;
- production longitudinal-moment selector imports;
- copied `FIGURE_BASE` constants;
- copied production-style `SIGN` constants.

Observed result:

```text
PASS_ZERO_PRODUCTION_SEMANTIC_IMPORTS
productionSemanticImports = 0
copiedProductionConstantPatterns = 0
```

## Independent numerical oracle

`scripts/oracles/emp1-wrc537/table5-handcalc.mjs` independently reconstructs:

1. dimensional scale factors;
2. load-direction sign application;
3. A/B/C/D upper/lower stress contributions;
4. algebraic superposition;
5. plane-stress Tresca stress intensity.

No production Table-5 helper is consumed by this kernel.

## Mandatory falsifiers implemented

`scripts/emp1-wrc537-independent-oracle-falsifiers.mjs` proves the oracle can detect wrong logic.

Observed exact-head matrix:

```text
production comparison cases:
P+, P-, Vc+, Vc-, Vl+, Vl-, Mc+, Mc-, Ml+, Ml-, Mt+, Mt-, ALL+

singleLoadCases                    6
loadReversalCases                  6
zeroIsolationCases                 6
superpositionCases                 2
deliberateFigureCorruptionsDetected 2
deliberateSignCorruptionsDetected   2
```

Status:

`PASS_COMMON_MODE_FALSIFIERS`

## Evidence hashes observed at validated head

```text
sourceSemanticHash        ccc3715aeefe71cbca4fffbee36c24d037e45a531636d65d24bf475312518890
table5InterpretationHash  654e33f7fa7124c78e827bffeae06570d7feb401624291c823a6218b6bd012d2
signAuthorityHash         be95253de1fb7d07a3662b92b29364da4b29e4251e2c8af2383618d99c82e985
historicalFigureMapHash   1343b2febc9895345d93749f31fb756f18543442cc415ce3d2a5e09f5cd5c920
overallAuthorityHash      e1a56de01be61ea04fedc0de4eabd8fced3f141ddb9fce43be6b365cf6feaaf5
```

## Historical benchmark disposition

### gamma5

Frozen semantic hash remains unchanged:

`5daeb3a84828cf19017e6d1d0a70bd3478929713973948f875f21cec463a80aa`

Classification is now explicit:

`HISTORICAL_GAMMA5_COMPARISON_VECTOR`

and the result carries:

- `engineeringAuthorityScope=HISTORICAL_COMPARISON_VECTOR_ONLY`;
- `fullWrcSemanticAuthority=false`;
- `productionAuthority=false`;
- `productionImports=[]`;
- `productionObservationUsed=false`.

### gamma15

The existing historical gamma15 baseline is replayed through the isolated source-derived numerical kernel and remains:

`Du = 19.492158999951467 MPa`.

The frozen artifact is not silently regenerated.

## Exact-head validation observed at `42342d4d94ecac7c6481b5a987c97fdf55bce879`

| Check | Status | Evidence |
|---|---|---|
| dedicated independent WRC source oracle | PASS | Actions run `32462629985`, exact-head checkout verified |
| import firewall | PASS | same run, 0 production semantic imports |
| reviewed/source interpretation decoupling | PASS | same run, `PASS_INDEPENDENT_ORACLE_INTERPRETATION_DECOUPLED` |
| common-mode falsifier matrix | PASS | same run, `PASS_COMMON_MODE_FALSIFIERS` |
| frozen gamma5 historical comparison | PASS | same run; semantic hash unchanged |
| gamma15 independent baseline | PASS | same run; Du = 19.492158999951467 MPa |
| EMP.1 current-main independent baseline | PASS | Actions run `32462629973` |
| EMP.1 gamma5 bounded route on current main | PASS | Actions run `32462629963` |
| EMP.1 runEmp1 bounded gamma5 orchestration | PASS | Actions run `32462629962` |

All exact-head EMP.1 suites remained green after the stronger firewall/falsifiers were added.

## Changed-file ledger

1. `.github/workflows/emp1-gamma5-main-route.yml` — require firewall, source-decoupling and falsifiers before route regression.
2. `.github/workflows/emp1-main-baseline.yml` — require firewall/decoupling/falsifiers before gamma15 baseline.
3. `.github/workflows/emp1-wrc-independent-oracle.yml` — dedicated exact-head independent-oracle qualification workflow.
4. `agents/PR1312_workreport.md` — living handover/evidence record.
5. `docs/emp1/WRC537_2013_Independent_Oracle_Authority.md` — authority split and falsification ledger.
6. `scripts/emp1-wrc-gamma5-full-table5-independent-handcalc.mjs` — isolated source authority + numerical kernel; no copied figure/sign semantics.
7. `scripts/emp1-wrc537-independent-oracle-decoupling-check.mjs` — gamma5/gamma15 source-authority replay.
8. `scripts/emp1-wrc537-independent-oracle-falsifiers.mjs` — six-load/reversal/isolation/superposition and mutation suite.
9. `scripts/emp1-wrc537-independent-oracle-import-firewall-check.mjs` — common-mode dependency firewall.
10. `scripts/emp1-wrc537-independent-source-authority-lib.mjs` — compatibility re-export to isolated oracle.
11. `scripts/oracles/emp1-wrc537/source-authority.mjs` — strict WRC/CAUx/reviewed interpretation validator.
12. `scripts/oracles/emp1-wrc537/table5-handcalc.mjs` — independent numerical reconstruction.
13. `validation/emp1/wrc537-2013/table5-reviewed-interpretation-v1.json` — source-derived reviewed interpretation identity.

No `src/**` production calculation file is changed by EMP1-10.

## Production authority retained

Production C remains suspended for all four current independent source-authority blockers:

1. `WRC_CYLINDRICAL_LOAD_AXIS_SIGN_UNRESOLVED`
2. `WRC_LONGITUDINAL_MOMENT_CURVE_SELECTION_AUTHORITY_UNRESOLVED`
3. `WRC_ATTACHMENT_OUTSIDE_RADIUS_SOURCE_BASIS_UNQUALIFIED`
4. `WRC_CYLINDRICAL_4_5_APPLICABILITY_SOURCE_BASIS_UNQUALIFIED`

EMP1-09 limitation also remains:

- `WRC_TABLE5_EIGHT_POINTS_NOT_GLOBAL_ABSOLUTE_MAXIMUM`

EMP1-10 does not authorize:

- pressure thrust / nonzero Δp;
- non-unity `Kn/Kb`;
- WRC297/nozzle-neck assessment;
- global EMP.1.C;
- code-compliance PASS;
- release qualification.

## Current reconciliation state

PR #1306 merged after the validated EMP1-10 engineering head, advancing main to:

`c24378e94d61526afc6a50fc51e0e5c38eae932e`.

The #1306 files do not overlap EMP1-10's validation/oracle file set. PR #1312 must nevertheless be rebuilt on that exact main ancestry and exact-head workflows re-observed before merge.

## NOT_RUN / deferred

- Browser/UI: NOT_RUN / not applicable to EMP1-10; no UI or production file changed.
- Full repository release suite: NOT_RUN; independent-oracle scope only.
- Production route activation: deliberately NOT_RUN / unauthorized.
- Route-authority currentness debt from EMP1-05 remains a mandatory future gate before any production C reauthorization.

## Exact next actions

1. Rebuild the 13-file EMP1-10 delta on `main@c24378e9...` without altering #1306 production/workspace files.
2. Re-observe dedicated oracle + baseline + gamma5 exact-head workflows.
3. Update this report only if final-head evidence differs.
4. Production remains fail closed regardless of EMP1-10 PASS.

## Appendix A — takeover qualification

1. Why is “zero production imports” alone insufficient for independence? Because duplicated semantic constants can create common-mode PASS/PASS without imports.
2. What is primary authority for allowed Table-5 figure cells and algebraic signs? Retained WRC 537 Table 5 pp.41–42.
3. What is the reviewed interpretation artifact for? To make OCR/engineering binding explicit, reviewable and hash-addressed without using production code.
4. What is CAUx allowed to prove? Only the historical worked-case location/alternative selection used by the frozen comparison vector.
5. What may CAUx not prove? General WRC production method/curve-selection authority.
6. How does CI prove semantic independence? Import firewall plus deliberate sign/figure corruption, six isolated loads, reversal and superposition falsifiers.
7. What unchanged artifact proves the source-derived path did not silently tune the gamma5 benchmark? Frozen gamma5 semantic hash `5daeb3...`.
8. Does EMP1-10 reauthorize production C? No.
9. Which production files changed? None.
