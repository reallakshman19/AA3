# PR1318 Work Report — EMP1-16 gamma5 physical-vector refreeze / route requalification

## Recovery header
- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: IMPLEMENT`
- `PR: #1318`
- `BRANCH: agent/emp1-16-gamma5-route-requalification-20260821`
- `BASE_MAIN: 9882ab152bfe2676bc915a5f93ad6b69a01a58f8`
- `BASE_INCREMENT: EMP1-15 / PR #1317`
- `MERGE_AUTHORITY: NOT_GRANTED_FOR_SUCCESSOR`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `CODE_COMPLIANCE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`

## Mission
Refreeze and requalify the bounded WRC 537 cylindrical gamma=5 zero-dP Table-5 route after EMP1-12..15 closed axis/sign, r0 source, longitudinal-curve, and §4.5 applicability source authority. Production must remain fail-closed until an independent physical global-load -> WRC-load -> 32-value Table-5 oracle is frozen and re-observed.

## P0 diagnosis
The historical gamma5 oracle is not the current-route oracle. It used longitudinal-moment bending figures `1B-1 / 2B-1` (historical CAUx off-axis maximum selection), while EMP1-14 qualified `1B / 2B` for the bounded eight-point A/B/C/D recovery domain. Reusing historical `5daeb3...` or route qualification `3b437...` would therefore be a common-mode authorization defect.

## Independent physical benchmark selected
Use the existing post-axis-fix physical fixture, starting from global quantities rather than preselected WRC signs:
- vessel longitudinal +X;
- source point `[0,0,1000]` mm;
- WRC/attachment target `[0,0,0]` mm;
- source force `[-400,250,1000]` N;
- source moment `[-250000,-200000,700000]` N·mm.

Independent statics gives:
- +P = -Z;
- +Vc = +Y;
- +Vl = +X;
- +Mc = -X;
- +Ml = +Y;
- +Mt = +Z;
- target moment `[-500000,-600000,700000]` N·mm;
- WRC loads `{P:-1000,Vc:250,Vl:-400,Mc:500000,Ml:-600000,Mt:700000}`.

## Source-derived longitudinal ordinates
Retained WRC transcription independently confirms, gamma=5 original at beta=0.155:
- Figure 1B ordinate = `0.06123300282237935`;
- Figure 2B ordinate = `0.09730171780398315`.
Historical `1B-1 / 2B-1` ordinates are not current eight-point production authority.

## Candidate post-authority stress vector
Independent Table-5 reconstruction with the existing source-derived signs and all unchanged figure selections except `Mlbend: 1B/2B` gives candidate MPa values:
- circumferential = `[44.51629933358771,-31.003982095484233,-39.096558206599155,27.601747564693834,-49.315070994484095,47.400691735684504,55.42761143907113,-51.57302408513721]`;
- longitudinal = `[61.1959258532143,-56.99348483902428,-55.031954369647046,52.76972145059135,-29.83022154451227,26.871799811934032,35.17585811855568,-30.199929789779283]`;
- shear = `[17.97635208556807,17.97635208556807,17.52712442361514,17.52712442361514,18.11112038415395,18.11112038415395,17.39235612502926,17.39235612502926]`;
- stress intensity = `[72.67281563686576,66.1800949565413,66.31741974972616,61.76250020459521,60.13784797265036,57.95382326192188,65.42702806161043,61.299618330183876]`.

These are `CANDIDATE_INDEPENDENT_REPRODUCTION`, not yet a frozen repository qualification record.

## Two-gate authorization design
A. Freeze an isolated validation-only physical/statics + source-derived Table-5 oracle with zero production semantic imports.
B. Only after the frozen vector re-observes the current production candidate may the route qualification hash/registry authorization be updated. Global EMP.1.C, code compliance and release remain false regardless.

## Protected invariants
- WRC coefficients and Table-5 equations unchanged unless independent source reproduction disproves them.
- gamma = Rm/T; beta = 0.875*r0/Rm.
- exact gamma=5 source row only; no interpolation/fallback.
- Kn=Kb=1; zero-dP only.
- eight shell-juncture points only; no global absolute maximum claim.
- `1B/2B` for bounded eight-point Ml bending; `1B-1/2B-1` remain off-axis comparison only.
- qualified axis/r0/§4.5 authorities required.

## Validation ledger
- source inspection of Figure 1B gamma5 row: PASS_SOURCE_INSPECTION.
- source inspection of Figure 2B gamma5 row: PASS_SOURCE_INSPECTION.
- independent in-session physical statics arithmetic: PASS_INDEPENDENT_REPRODUCTION.
- independent in-session Table-5 candidate reconstruction: PASS_INDEPENDENT_REPRODUCTION.
- repository exact-head oracle script: NOT_RUN / not yet implemented.
- GitHub Actions: NOT_RUN for successor engineering implementation.

## Current stage
`IMPLEMENT_GATE_A_INDEPENDENT_REFREEZE`

## Exact next action
Add scripts-only physical statics oracle and a new frozen post-authority gamma5 vector that parses the retained WRC source and uses 1B/2B; add import firewall/falsifiers. Do not change production authorization in Gate A.

## Appendix A — takeover qualification
1. Why can the historical gamma5 vector no longer authorize the current route?
2. Derive the target moment from the selected global source force/moment and source/target points.
3. Derive all six WRC load components without using production transform code.
4. Which two source ordinates change between the historical and post-EMP1-14 vectors?
5. Why must C/D stresses remain identical while A/B may change for this fixture?
6. What common-mode dependency must the new oracle import firewall prohibit?
7. What evidence is required before replacing qualification hash `3b437...`?
8. Which production authorities remain false even after bounded-route requalification?
