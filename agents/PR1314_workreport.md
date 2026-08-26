# PR1314 Work Report — EMP1-12 cylindrical WRC load-axis polarity

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: IMPLEMENT`
- `PR: #1314`
- `PR_STATE: OWNER_DIRECTED_MERGE_WITH_ACTIONS_INFRASTRUCTURE_EXCEPTION`
- `BRANCH: agent/emp1-12-wrc-axis-sign-authority-main-20260821`
- `BASE_MAIN: 3548739bd8a09da6833331b027e231465bade773`
- `BASE_INCREMENT: EMP1-11 / PR #1313`
- `ENGINEERING_HEAD_BEFORE_REPORT_REFRESH: d1520a59039545d9f1ba8a2357b45100a9537ff4`
- `MERGE_AUTHORITY: GRANTED_BY_OWNER_IN_CHAT_2026-08-21`
- `ACTIONS_INFRASTRUCTURE_STATE: FAILED_BEFORE_STEP_EXECUTION_NO_LOG_BLOB`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`

## Mission

Close only `WRC_CYLINDRICAL_LOAD_AXIS_SIGN_UNRESOLVED` for the bounded WRC537 cylindrical route. Do not infer WRC polarity from the generic foundation radial hint, change Table-5 arithmetic, or imply that the remaining WRC source-authority blockers are resolved.

## Controlled source custody

Primary retained document:

```text
docs/emp1/WRC537_2013.pdf
SHA-256 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
```

Source locators retained by the axis authority contract:

- §4.1 Figure 2 — cylindrical load/stress convention;
- Table 4, pp.39–40 — cylindrical stress signs and recovery locations;
- Table 5, pp.41–42 — signed cylindrical load computation/superposition;
- §4.3.4 Eq.47 — torsional shear term;
- §4.3.5 Eqs.48–49 — circumferential/longitudinal shear terms.

CAUx/CAESAR convention is retained only as a secondary independent worked cross-check, not as WRC method authority.

## Engineering finding

The retained LAFEA.1 foundation `eZ/radialHint` proves a radial **line**, not WRC load polarity. Standard fixture geometry demonstrates the distinction:

```text
vessel longitudinal +X
raw foundation eZ      +Z
load source point      [0,0,+1000]
attachment target      [0,0,0]
physical inward +P     -Z
```

Therefore copying raw `eZ` to WRC +P would reverse the physical radial-load convention for this case.

## Implemented authority contract

For a selected retained load case:

```text
+P  = normalize(targetPointGlobal - sourcePointGlobal)
+VL = +vessel longitudinal
+VC = +VL × +P
+MC = -VL
+ML = +VC
+MT = -P
```

The implementation additionally requires:

1. source→target vector is nonzero;
2. +P is orthogonal to vessel longitudinal axis;
3. +P is collinear with the retained foundation radial line, either polarity;
4. axis evidence retains exact foundation model/result hashes and source references;
5. production C consumes only `QUALIFIED_SOURCE_POLARITY` evidence;
6. coincident source/target remains fail-closed rather than borrowing raw eZ polarity;
7. IEEE signed zero is canonicalized to `+0` before authority evidence is retained.

## Defect found during qualification attempt

An isolated strict Node evidence check exposed `-0` values from cross-product/scaling operations in `Vc/Mc/Ml/Mt`. Although numerically zero, `assert.deepStrictEqual` distinguishes `-0` and `0`; retaining signed zero would make deterministic evidence comparisons brittle.

Fixed in `d1520a59039545d9f1ba8a2357b45100a9537ff4` by canonicalizing zero in vector normalization, cross products, scaling, inward-vector construction and residual storage. The independent strict micro-oracle then passed the exact basis below and the frozen gamma5 WRC vector.

## Independent falsifiers

`scripts/emp1-wrc537-cylindrical-axis-authority-check.mjs` freezes the standard-fixture basis independently of production projection:

```text
P   [ 0, 0,-1]
Vc  [ 0, 1, 0]
Vl  [ 1, 0, 0]
Mc  [-1, 0, 0]
Ml  [ 0, 1, 0]
Mt  [ 0, 0, 1]
```

Repository CI intends to check:

- 12 signed ± component probes;
- 6 WRC→global→WRC roundtrips;
- coincident source/target fails closed;
- non-radial source→target rejects;
- retained basis tamper rejects;
- secondary CAUx cross-check reproduces `{P:-161,Vc:-53,Vl:-2109,Mc:121,Ml:33,Mt:-775}`.

The in-session isolated Node statics micro-oracle independently re-evaluated the production basis formulas and physically corrected fixture and passed:

```text
basis = {
  P:[0,0,-1], Vc:[0,1,0], Vl:[1,0,0],
  Mc:[-1,0,0], Ml:[0,1,0], Mt:[0,0,1]
}
WRC loads = {
  P:-1000, Vc:250, Vl:-400,
  Mc:500000, Ml:-600000, Mt:700000
}
```

This isolated check is **not** represented as a full repository regression.

## Route authority effect

The historical blocker identifier is retained for audit/replay, but it is removed from the bounded route's **live** suspension set.

Remaining live production suspension reasons are exactly:

1. `WRC_LONGITUDINAL_MOMENT_CURVE_SELECTION_AUTHORITY_UNRESOLVED`
2. `WRC_ATTACHMENT_OUTSIDE_RADIUS_SOURCE_BASIS_UNQUALIFIED`
3. `WRC_CYLINDRICAL_4_5_APPLICABILITY_SOURCE_BASIS_UNQUALIFIED`

The route remains:

```text
registered=false
engineeringUseAuthorized=false
productionUseAuthorized=false
globalEmp1CRouteAuthority=false
releaseQualified=false
```

Global EMP.1.C still retains its broader `WRC_SIGN_ARBITRATION_OPEN` blocker. This PR closes only the bounded cylindrical runtime axis contract.

## Protected invariants

- WRC Table-5 equations unchanged.
- Curve coefficients/data unchanged.
- Frozen gamma5 Table-5 oracle unchanged.
- Frozen gamma15 baseline unchanged.
- Zero-dp upstream load-transfer mechanics unchanged.
- Kn=Kb=1 bounded custody unchanged.
- Nonzero differential pressure remains blocked.
- General Appendix-B SCF remains blocked.
- No code-compliance or release interpretation added.
- No editable WRC axis UI control added.

## UI change

The engineering evidence view is read-only and now distinguishes:

- foundation `eZ` = radial line, not WRC polarity authority;
- source/target points used to resolve +P;
- source-qualified +P/+Vc/+Vl/+Mc/+Ml/+Mt vectors;
- axis authority identity/SHA and radial alignment.

The DOM remains presentation only and cannot author calculation vectors.

## Changed-file ledger

1. `.github/workflows/emp1-gamma5-main-route.yml` — add independent axis gate.
2. `.github/workflows/emp1-03-runemp1-orchestration.yml` — re-observe axis closure while preserving historical EMP1-03 scope guard.
3. `src/core/emp1/emp1-wrc537-cylindrical-axis-authority.js` — new physical polarity authority contract + signed-zero canonicalization.
4. `src/core/emp1/emp1-wrc537-source-custody.js` — bind axis evidence to retained A/B ancestry.
5. `src/core/emp1/emp1-wrc537-gamma5-zero-dp-orchestration.js` — require qualified axis evidence before C execution.
6. `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js` — route boundary consumes axis authority; remove bounded axis blocker from live set.
7. `src/core/emp1/emp1-c-bounded-route-registry.js` — expose axis authority and three remaining source blockers.
8. `src/core/emp1/index.js` — export axis authority API.
9. `scripts/emp1-wrc537-cylindrical-axis-authority-check.mjs` — independent vector/reversal oracle.
10. `scripts/emp1-wrc-gamma5-axis-authority-suspension-check.mjs` — convert old suspension check to closure + remaining-blocker guard.
11. `scripts/emp1-public-product-check.mjs` — bounded/global authority truth checks.
12. `src/workspace/emp1-engineering-evidence-view.js` — read-only polarity evidence.
13. `agents/PR1314_workreport.md` — this living handover record.

## Validation ledger

Engineering head before this report refresh: `d1520a59039545d9f1ba8a2357b45100a9537ff4`.

| Check | Status | Evidence |
|---|---|---|
| isolated WRC axis/statics strict Node micro-oracle | **PASS** | exact six-vector basis + frozen gamma5 WRC load vector; signed-zero falsifier found and repaired |
| PR Actions attempt 1, gamma5 route | **INFRASTRUCTURE FAIL / NOT_RUN** | run `32479039967`; job created with zero steps, `logs_url=null`, job log blob 404 |
| PR Actions attempt 1, orchestration | **INFRASTRUCTURE FAIL / NOT_RUN** | run `32479039747`; same zero-step startup behavior |
| PR Actions attempt 1, baseline | **INFRASTRUCTURE FAIL / NOT_RUN** | run `32479039956`; same zero-step startup behavior |
| rerun of failed jobs | **INFRASTRUCTURE FAIL / NOT_RUN** | reproduced zero-step/no-log failure |
| PR Actions after signed-zero repair, gamma5 route | **INFRASTRUCTURE FAIL / NOT_RUN** | run `32479337238`; job `96762152363`, zero steps, no log blob |
| PR Actions after signed-zero repair, orchestration | **INFRASTRUCTURE FAIL / NOT_RUN** | run `32479337214`; zero-step startup failure |
| PR Actions after signed-zero repair, baseline | **INFRASTRUCTURE FAIL / NOT_RUN** | run `32479337261`; zero-step startup failure |
| production Pages/browser UI | **NOT_RUN** | no executable Actions runner evidence available on this PR head |
| full repository regression | **NOT_RUN** | not claimed |

These Action conclusions are not classified as software FAIL because no checkout/setup/test step executed. No CI PASS is claimed.

## Merge disposition

Owner explicitly instructed `fix and merge, proceed next`. Under that owner direction, the merge is permitted with the above validation exception retained permanently in this workreport. This is **not** a release qualification: the WRC production route remains disabled by three independent source-authority blockers, so this increment cannot expose the bounded WRC evaluator as an engineering production result.

## Exact next action after merge

Re-ground merged main and inspect existing partial qualification for the three remaining source blockers. Select the first blocker that can be closed with primary/controlled source evidence rather than merely restating an existing fail-closed policy.

## Appendix A — takeover qualification

1. Why is foundation `eZ` an insufficient WRC +P authority even when it is orthogonal to vessel eX?
2. Derive the standard-fixture six-component WRC basis from the physical source/target geometry.
3. Why is `abs(dot(radialLine,+P))≈1` allowed instead of requiring `dot≈+1`?
4. What must happen when the selected load source and target points coincide?
5. Which exact ancestry hashes bind the new axis evidence to A/B custody?
6. Why does removing the bounded axis suspension reason not clear global `WRC_SIGN_ARBITRATION_OPEN`?
7. List the three production suspension reasons that must remain after this PR.
8. Explain why the CAUx vector is a cross-check rather than method-source authority.
9. Why must signed zero be canonicalized in retained vector evidence?
10. What is the next valid engineering step after PR1314 merge?
