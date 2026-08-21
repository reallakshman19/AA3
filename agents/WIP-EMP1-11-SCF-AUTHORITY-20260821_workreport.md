# WIP Work Report — EMP1-11 WRC stress-concentration authority

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: IMPLEMENT`
- `BRANCH: agent/emp1-11-unity-scf-authority-20260821`
- `BASE_MAIN: 5b28ec78ead6eb9eb55982973feda0c399c532e0`
- `BASE_INCREMENT: EMP1-10 / PR #1312`
- `PR: NOT_YET_ALLOCATED`
- `MERGE_AUTHORITY: NOT_GRANTED_FOR_EMP1_11`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GENERAL_APPENDIX_B_SCF_AUTHORIZED: false`

## Mission

Close the remaining Kn/Kb authority ambiguity without inventing WRC Appendix-B production data. Preserve the historical unity-only custody payload and make the product explicitly state that Kn=Kb=1 means no Appendix-B SCF amplification, not general SCF completion.

## Source finding

`docs/01_WRC537_METHOD_DEFINITION.md` is marked `NOT_READY_FOR_IMPLEMENTATION` and states that the licensed WRC 537 PDF was unavailable to that extraction. It identifies Appendix-B candidate Eqs. B.3–B.5 and Kn/Kb meanings, but that evidence is not sufficient to implement a general non-unity SCF route.

## Implemented so far

1. Added `emp1-wrc537-stress-concentration-authority.js`.
2. Preserved exact historical source-custody payload `{Kn:1,Kb:1,authority:PINNED_BOUNDED_ROUTE_UNITY_ONLY}`.
3. Source-custody validation now rejects value, authority and payload-shape spoofing.
4. Added separate general-SCF authority state: `UNITY_ONLY`, Appendix-B authority false, non-unity authority false, extraction state `NOT_READY_FOR_IMPLEMENTATION`.
5. Route registry now exposes unity/general-SCF semantics and visible Appendix-B limitation.
6. Added quantitative validation script proving Table-5 Kn/Kb multipliers are numerically active while product authority remains non-unity blocked.
7. Added gamma5 workflow gate and public-product assertions.
8. Added engineering authority ledger in `docs/emp1/WRC537_2013_Stress_Concentration_Authority.md`.

## Protected invariants

- Table-5 numerical equations unchanged.
- Curve coefficients/data unchanged.
- gamma5 frozen historical comparison unchanged.
- gamma15 baseline unchanged.
- four existing WRC production suspension reasons unchanged.
- gamma5 production route remains unregistered/unauthorized.
- global/full-domain C false.
- release/code-compliance authority false.
- no Appendix-B formula implementation in production.

## Validation ledger

- focused `emp1-wrc537-stress-concentration-authority-check.mjs`: `NOT_RUN` until PR workflow executes.
- `EMP.1 gamma5 bounded route on current main`: `NOT_RUN` on this head.
- `EMP.1 current-main independent baseline`: `NOT_RUN` on this head.
- `EMP.1 runEmp1 bounded gamma5 orchestration`: `NOT_RUN` on this head.
- independent WRC source oracle: `NOT_RUN` on this head.
- browser/UI runtime: `NOT_RUN`; UI change is metadata-driven through the existing C blocked-scope list.
- full repository regression: `NOT_RUN`.

## Changed-file ledger

- `.github/workflows/emp1-gamma5-main-route.yml`
- `src/core/emp1/emp1-wrc537-stress-concentration-authority.js`
- `src/core/emp1/emp1-wrc537-source-custody.js`
- `src/core/emp1/emp1-c-bounded-route-registry.js`
- `src/core/emp1/index.js`
- `scripts/emp1-wrc537-stress-concentration-authority-check.mjs`
- `scripts/emp1-public-product-check.mjs`
- `docs/emp1/WRC537_2013_Stress_Concentration_Authority.md`
- this workreport

## Appendix A — takeover qualification

1. Why must the historical `{Kn,Kb,authority}` payload shape remain unchanged?
2. What source status prevents implementing B.3–B.5 as production equations now?
3. What is the engineering difference between unity multipliers and general Appendix-B SCF authority?
4. How does the new falsifier prove Kn/Kb are numerically active rather than cosmetic?
5. Which two deliberate spoof classes must source-custody validation reject besides non-unity values?
6. Does EMP1-11 remove any of the four existing gamma5 suspension reasons? Correct answer: no.
7. Does EMP1-11 authorize non-unity Kn/Kb? Correct answer: no.
