# PR1313 Work Report — EMP1-11 WRC stress-concentration authority

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: IMPLEMENT`
- `PR: #1313`
- `PR_STATE: DRAFT_QUALIFIED_PENDING_OWNER_MERGE_AUTHORITY`
- `BRANCH: agent/emp1-11-unity-scf-authority-20260821`
- `BASE_MAIN: 5b28ec78ead6eb9eb55982973feda0c399c532e0`
- `BASE_INCREMENT: EMP1-10 / PR #1312`
- `ENGINEERING_HEAD_VALIDATED: cbcdd1fb9e54ddb82b34f6c5bd5e05f9eb98c4fd`
- `MERGE_AUTHORITY: NOT_GRANTED_FOR_PR1313`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GENERAL_APPENDIX_B_SCF_AUTHORIZED: false`

## Mission

Close the remaining Kn/Kb authority ambiguity without inventing WRC Appendix-B production data. Preserve the historical unity-only custody payload and make the product explicitly state that Kn=Kb=1 means no Appendix-B SCF amplification, not general SCF completion.

## Source finding

`docs/01_WRC537_METHOD_DEFINITION.md` is marked `NOT_READY_FOR_IMPLEMENTATION` and states that the licensed WRC 537 PDF was unavailable to that extraction. It identifies Appendix-B candidate Eqs. B.3–B.5 and Kn/Kb meanings, but that evidence is not sufficient to implement a general non-unity SCF route.

## Implemented

1. Added `emp1-wrc537-stress-concentration-authority.js`.
2. Preserved exact historical source-custody payload `{Kn:1,Kb:1,authority:PINNED_BOUNDED_ROUTE_UNITY_ONLY}`.
3. Source-custody validation rejects non-unity values, authority-string spoofing, and payload-shape spoofing.
4. Added a separate general-SCF authority state: `UNITY_ONLY`, Appendix-B authority false, non-unity authority false, extraction state `NOT_READY_FOR_IMPLEMENTATION`.
5. Route registry exposes unity/general-SCF semantics and visible `WRC_APPENDIX_B_GENERAL_SCF_NOT_SOURCE_QUALIFIED` blocked scope.
6. Added a quantitative validation script proving Table-5 Kn/Kb multipliers are numerically active while product authority remains non-unity blocked.
7. Added gamma5 workflow gate and public-product assertions.
8. Added engineering authority ledger in `docs/emp1/WRC537_2013_Stress_Concentration_Authority.md`.

## Protected invariants

- Table-5 numerical equations unchanged.
- Curve coefficients/data unchanged.
- gamma5 frozen historical comparison unchanged, including semantic hash `5daeb3a84828cf19017e6d1d0a70bd3478929713973948f875f21cec463a80aa`.
- gamma15 baseline unchanged.
- four existing WRC production suspension reasons unchanged:
  1. `WRC_CYLINDRICAL_LOAD_AXIS_SIGN_UNRESOLVED`
  2. `WRC_LONGITUDINAL_MOMENT_CURVE_SELECTION_AUTHORITY_UNRESOLVED`
  3. `WRC_ATTACHMENT_OUTSIDE_RADIUS_SOURCE_BASIS_UNQUALIFIED`
  4. `WRC_CYLINDRICAL_4_5_APPLICABILITY_SOURCE_BASIS_UNQUALIFIED`
- gamma5 production route remains unregistered/unauthorized.
- global/full-domain C false.
- release/code-compliance authority false.
- no Appendix-B formula implementation in production.

## Exact-head validation ledger

Engineering head: `cbcdd1fb9e54ddb82b34f6c5bd5e05f9eb98c4fd`.

| Check | Status | Evidence |
|---|---|---|
| EMP.1 current-main independent baseline | PASS | Actions run `32465123648` |
| EMP.1 runEmp1 bounded gamma5 orchestration | PASS | Actions run `32465123671` |
| EMP.1 gamma5 bounded route on current main | PASS | Actions run `32465123718` |
| focused unity-only SCF authority | PASS | gamma5 run `32465123718`, job `96720007185`, step `Qualify WRC unity-only stress-concentration authority` |
| historical SCF custody shape | PASS | focused output: `historicalCustodyShapePreserved=true`; orchestration also PASS |
| Appendix-B source state | PASS fail-closed | `NOT_READY_FOR_IMPLEMENTATION`; primary-source implementation authority false |
| Kn numerical multiplier falsifier | PASS | `Kn=1.2` produced membrane scale ratio `1.2` |
| Kb numerical multiplier falsifier | PASS | `Kb=1.3` produced bending scale ratio `1.3` |
| independent-oracle import firewall/decoupling/falsifiers | PASS | gamma5 run `32465123718` steps 4–6 |
| frozen gamma5 oracle | PASS unchanged | gamma5 run `32465123718`; semantic hash unchanged |
| WRC r0 outside-radius custody | PASS | gamma5 run `32465123718` |
| WRC §4.5 applicability policy | PASS | gamma5 run `32465123718` |
| WRC Table-5 eight-point extrema scope | PASS | gamma5 run `32465123718` |
| longitudinal-moment curve-selection policy | PASS | gamma5 run `32465123718` |
| zero-dp upstream WRC load producer | PASS | gamma5 run `32465123718` |
| fail-closed gamma5 route authority | PASS | same four production suspension reasons retained |
| public product SCF truth | PASS | limitations include unity-only and Appendix-B-not-qualified; release false |
| separate `EMP.1 independent WRC source oracle` workflow on this exact head | NOT_RUN / NOT_OBSERVED | no separate run claimed; equivalent oracle checks executed and passed inside gamma5 workflow |
| browser/UI runtime | NOT_RUN | no interactive SCF controls added; existing metadata-driven blocked-scope renderer is used |
| full repository regression | NOT_RUN | not claimed for this bounded EMP.1 authority slice |

### Focused SCF qualification result

```text
status                                   PASS_UNITY_ONLY_SCF_AUTHORITY_FAILS_CLOSED
historical custody shape preserved       true
Kn                                       1
Kb                                       1
mode                                     UNITY_ONLY
general Appendix-B authority             false
non-unity authorized                     false
source extraction state                  NOT_READY_FOR_IMPLEMENTATION
candidate equations                      B.3, B.4, B.5
Kn multiplier probe                      1.2
Kb multiplier probe                      1.3
production authority granted             false
```

The 1.2 and 1.3 probes are numerical falsifiers only. They demonstrate that the low-level Table-5 kernel actively multiplies membrane terms by Kn and bending terms by Kb. They do not authorize those non-unity factors for the bounded product route.

## Product/UI truth

Current route limitations are:

1. `WRC_TABLE5_EIGHT_POINTS_NOT_GLOBAL_ABSOLUTE_MAXIMUM`
2. `UNITY_STRESS_CONCENTRATION_MULTIPLIERS_ONLY`
3. `WRC_APPENDIX_B_GENERAL_SCF_NOT_SOURCE_QUALIFIED`

The existing C authority UI consumes the route blocked-scope/limitation metadata. No editable Kn/Kb control is introduced because that would imply unsupported general Appendix-B authority.

## Changed-file ledger

- `.github/workflows/emp1-gamma5-main-route.yml` — add focused SCF authority gate.
- `src/core/emp1/emp1-wrc537-stress-concentration-authority.js` — unity custody plus separate general-SCF authority state.
- `src/core/emp1/emp1-wrc537-source-custody.js` — validate exact unity custody values/authority/shape.
- `src/core/emp1/emp1-c-bounded-route-registry.js` — expose unity/general-SCF semantics and limitations.
- `src/core/emp1/index.js` — export SCF authority API.
- `scripts/emp1-wrc537-stress-concentration-authority-check.mjs` — source-state, spoof and numerical multiplier falsifiers.
- `scripts/emp1-public-product-check.mjs` — assert public SCF truth.
- `docs/emp1/WRC537_2013_Stress_Concentration_Authority.md` — engineering authority ledger and reopen gate.
- `agents/PR1313_workreport.md` — living handover/evidence record.

## Remaining boundary / next increment

EMP1-11 does not attempt a general Appendix-B implementation. Reopening non-unity SCFs requires primary-source custody, exact B.3–B.5 symbol/applicability definitions, authoritative equation-selection policy, independent multi-geometry hand calculations, and mutation falsifiers.

After EMP1-11, the highest-value remaining independent engineering increment should return to a current production suspension reason rather than expand unqualified Appendix-B scope. Candidate priority is `WRC_CYLINDRICAL_LOAD_AXIS_SIGN_UNRESOLVED`: close the physical WRC load-axis/sign convention from primary/controlled evidence and independent single-load reversal cases, without changing Table-5 numerics unless the oracle disproves them.

## Appendix A — takeover qualification

1. Why must the historical `{Kn,Kb,authority}` payload shape remain unchanged?
2. What source status prevents implementing B.3–B.5 as production equations now?
3. What is the engineering difference between unity multipliers and general Appendix-B SCF authority?
4. How does the new falsifier prove Kn/Kb are numerically active rather than cosmetic?
5. Which two deliberate spoof classes must source-custody validation reject besides non-unity values?
6. Does EMP1-11 remove any of the four existing gamma5 suspension reasons? Correct answer: no.
7. Does EMP1-11 authorize non-unity Kn/Kb? Correct answer: no.
8. Why is a separate independent-oracle workflow still marked NOT_RUN/NOT_OBSERVED even though oracle checks passed? Because this exact head had no separately observed run of that workflow; the checks ran inside the gamma5 workflow and are reported only at that scope.
