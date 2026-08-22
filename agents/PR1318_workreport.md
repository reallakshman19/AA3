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
- `ENGINEERING_CODE_HEAD_BEFORE_FINAL_REPORT: e97d850822f0e8652397eff3bc52e3eb1d205a22`
- `MAIN_DIVERGENCE: 16_AHEAD_0_BEHIND`
- `MERGE_AUTHORITY: GRANTED_BY_OWNER_IN_CHAT_2026-08-22`
- `MERGE_AUTHORITY_SCOPE: MERGE_FAIL_CLOSED_REQUALIFICATION_PACKAGE_ONLY`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `CODE_COMPLIANCE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`

## Final disposition
EMP1-16 may merge under owner authorization as a fail-closed requalification package. It does **not** reactivate production. The sole live bounded-route suspension remains:

`WRC_GAMMA5_ROUTE_REQUALIFICATION_REQUIRED_AFTER_SOURCE_AUTHORITY_CLOSURE`

The historical production qualification `3b4375407dc9484c80144f2d9a5b555000d0257021108cd799923ed6fede1a8e` remains active in code until a future executable exact-head reobservation proves the new production candidate against the frozen post-authority oracle.

## P0 finding closed by this package
The historical gamma5 comparison vector cannot qualify the repaired bounded route because it used longitudinal-moment bending figures `1B-1 / 2B-1`. EMP1-14 qualified `1B / 2B` for the bounded eight-point A/B/C/D shell-juncture recovery domain. Reusing the historical vector would therefore be a common-mode numerical authorization defect.

## Independent physical benchmark
The validation oracle starts from physical global quantities, not preselected WRC component signs:

```text
vessel longitudinal +X
foundation radial line +Z (unoriented)
source point           [0,0,1000] mm
target/WRC point       [0,0,0] mm
source force           [-400,250,1000] N
source moment          [-250000,-200000,700000] N.mm
```

Independent statics gives:

```text
+P  = [ 0, 0,-1]
+Vc = [ 0, 1, 0]
+Vl = [ 1, 0, 0]
+Mc = [-1, 0, 0]
+Ml = [ 0, 1, 0]
+Mt = [ 0, 0, 1]

(r_source-r_target) x F = [-250000,-400000,0] N.mm
M_target = [-500000,-600000,700000] N.mm
WRC = {P:-1000,Vc:250,Vl:-400,Mc:500000,Ml:-600000,Mt:700000}
```

## Source-derived current longitudinal ordinates
For gamma=5, beta=0.155, ORIGINAL source rows:
- Figure 1B, PDF p.107: `0.06123300282237935`
- Figure 2B, PDF p.115: `0.09730171780398315`

Historical off-axis values `1B-1=0.06104247731814361` and `2B-1=0.09617686766359428` remain comparison-only for this route.

## Frozen post-authority oracle
Artifact:
`validation/emp1/wrc537-2013/gamma5-post-authority-physical-oracle-v1.json`

Semantic SHA-256:
`60771128f8261057bf73fa6c183ace5df25f3ee98f417f58da25a6135d8b2e18`

Expected MPa stress-intensity vector:

```text
Au 72.67281563686576
Al 66.18009495654130
Bu 66.31741974972616
Bl 61.76250020459521
Cu 60.13784797265036
Cl 57.95382326192188
Du 65.42702806161043
Dl 61.29961833018388
```

Only A/B differ from historical `1B-1/2B-1` recovery; C/D remain unchanged. This is the expected physical fingerprint because longitudinal-moment bending contributes to the A/B families in this retained Table-5 sign/recovery arrangement.

## Gate A implemented
1. `scripts/oracles/emp1-wrc537/physical-statics.mjs` — independent reference transfer, cylindrical WRC basis, projection and roundtrip; zero production imports.
2. `scripts/oracles/emp1-wrc537/curve-fit-source.mjs` — exact ORIGINAL source parser supporting both row-oriented and transposed coefficient layouts; no interpolation/fallback.
3. `scripts/emp1-wrc-gamma5-post-authority-independent-refreeze.mjs` — frozen-oracle replay from retained source.
4. `scripts/emp1-wrc-gamma5-post-authority-refreeze-falsifiers.mjs` — source/target, radial polarity, force/moment, historical `-1` selection and sign-corruption falsifiers.
5. Existing independent-oracle import firewall covers the new oracle modules/entrypoints.
6. Existing independent-oracle CI entrypoints invoke the new refreeze/falsifier checks without workflow-YAML modification.

## Gate B staged but intentionally not crossed
`scripts/emp1-wrc-gamma5-axis-authority-suspension-check.mjs` now requires the current production candidate to match:
- exact independent WRC load package;
- exact `1B/2B` figure map;
- all 32 stress values to the frozen oracle;
- current axis, r0, longitudinal-selection and §4.5 source authorities;
- route still suspended during candidate comparison.

Candidate qualification artifact:
`validation/emp1/wrc537-2013/gamma5-zero-dp-route-qualification-v2.json`

Candidate semantic SHA-256:
`9ea591a1918175b3e415d77f1adc4398645ca0503a699cfe8139d9dd3c69b4c7`

The record deliberately remains:

```text
status=CANDIDATE_PENDING_EXECUTABLE_PRODUCTION_REOBSERVATION
engineeringAuthority=false
productionRouteAuthority=false
boundedRouteRegistrationAllowed=false
```

`scripts/emp1-wrc-gamma5-route-requalification-candidate-check.mjs` additionally requires the route and registry to continue pointing to historical `3b437...`; any premature authorization is a test failure.

## Validation truth
### Source/static evidence
- 1B gamma5 source row: `PASS_SOURCE_INSPECTION`
- 2B gamma5 source row: `PASS_SOURCE_INSPECTION`
- physical global-to-target statics/WRC projection: `PASS_INDEPENDENT_REPRODUCTION`
- post-authority 32-value Table-5 arithmetic: `PASS_INDEPENDENT_REPRODUCTION`
- oracle SHA `607711...`: `PASS_INDEPENDENT_REPRODUCTION`
- candidate qualification SHA `9ea591...`: `PASS_INDEPENDENT_REPRODUCTION`
- production code source audit: fail-closed route state retained; no production registration change in PR

### Exact-head GitHub Actions
Latest audited code head before final report: `e97d850822f0e8652397eff3bc52e3eb1d205a22`.

Runs:
- independent WRC source oracle: `32508737684`
- gamma5 bounded route: `32508737597`
- runEmp1 orchestration: `32508737688`
- current-main independent baseline: `32508737628`

Independent-source job `96854710761` reports `steps=null`, `logs_url=null`; no checkout/setup/Node step executed. This is classified:

`NOT_RUN_EXECUTION_ENVIRONMENT`

It is neither software PASS nor software FAIL evidence. The same runner/startup condition is retained as the validation exception for this merge.

Full local exact-head repository regression: `NOT_RUN_EXECUTION_ENVIRONMENT` because no exact repository checkout is available in the runtime.

## Protected invariants
- No WRC coefficient or Table-5 algebra/sign change.
- `gamma = Rm/T`; `beta = 0.875*r0/Rm`.
- exact gamma=5 source row only; no interpolation/cross-variant fallback.
- Kn=Kb=1 only.
- differential pressure exactly zero only.
- eight shell-juncture points only; no global absolute maximum claim.
- bounded Ml bending uses `1B/2B`; `1B-1/2B-1` remain off-axis comparison only.
- qualified axis/r0/§4.5 authorities remain mandatory.
- bounded production route remains suspended after this merge.
- global EMP.1.C remains false.
- code-compliance authority remains false.
- release qualification remains false.

## Changed-file ledger
1. `agents/PR1318_workreport.md`
2. `scripts/emp1-wrc-gamma5-axis-authority-suspension-check.mjs`
3. `scripts/emp1-wrc-gamma5-post-authority-independent-refreeze.mjs`
4. `scripts/emp1-wrc-gamma5-post-authority-refreeze-falsifiers.mjs`
5. `scripts/emp1-wrc-gamma5-route-requalification-candidate-check.mjs`
6. `scripts/emp1-wrc537-independent-oracle-decoupling-check.mjs`
7. `scripts/emp1-wrc537-independent-oracle-falsifiers.mjs`
8. `scripts/emp1-wrc537-independent-oracle-import-firewall-check.mjs`
9. `scripts/oracles/emp1-wrc537/curve-fit-source.mjs`
10. `scripts/oracles/emp1-wrc537/physical-statics.mjs`
11. `validation/emp1/wrc537-2013/gamma5-post-authority-physical-oracle-v1.json`
12. `validation/emp1/wrc537-2013/gamma5-zero-dp-route-qualification-v2.json`

No workflow file and no production calculation source file is changed by this PR.

## Merge disposition
Owner explicitly instructed `fix and merge` on 2026-08-22. Merge is authorized with the exact validation exception above because the package remains fail-closed and cannot expose the candidate as an engineering production result.

This owner authorization does **not** authorize future removal of the requalification suspension, route registration, global EMP.1.C, code compliance or release.

## Exact next engineering action after merge
Create a successor from merged main that first re-runs the existing executable Gate A/Gate B checks when the runner is available. Only after exact-head 32/32 production-candidate PASS may it promote v2 qualification, switch `3b437... -> 9ea591...`, add retained-workbench route-authority currentness invalidation, and remove the bounded requalification suspension. Those changes require their own PR and merge authorization.

## Appendix A — takeover qualification
1. Why can historical oracle `5daeb3...` not authorize the current bounded route?
2. Derive `M_target` from source/target/global force/global moment.
3. Derive all six WRC components without production transform code.
4. Which two source ordinates changed, and why do only A/B results move?
5. Reproduce the post-authority stress-intensity vector and governing point.
6. What dependencies must the independent import firewall prohibit?
7. What semantics are bound by candidate qualification `9ea591...`?
8. Why must `3b437...` remain active until executable Gate B PASS?
9. What route-authority currentness invalidation is mandatory before future authorization?
10. Which authorities remain false even after bounded gamma5 requalification?
