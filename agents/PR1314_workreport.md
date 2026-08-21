# PR1314 Work Report — EMP1-12 cylindrical WRC load-axis polarity

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: IMPLEMENT`
- `PR: #1314`
- `PR_STATE: DRAFT_VALIDATION_PENDING`
- `BRANCH: agent/emp1-12-wrc-axis-sign-authority-main-20260821`
- `BASE_MAIN: 3548739bd8a09da6833331b027e231465bade773`
- `BASE_INCREMENT: EMP1-11 / PR #1313`
- `ENGINEERING_HEAD_VALIDATED: NOT_YET_VALIDATED`
- `MERGE_AUTHORITY: GRANTED_BY_OWNER_IN_CHAT_2026-08-21`
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
6. coincident source/target remains fail-closed rather than borrowing raw eZ polarity.

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

Required checks:

- 12 signed ± component probes;
- 6 WRC→global→WRC roundtrips;
- coincident source/target fails closed;
- non-radial source→target rejects;
- retained basis tamper rejects;
- secondary CAUx cross-check reproduces `{P:-161,Vc:-53,Vl:-2109,Mc:121,Ml:33,Mt:-775}`.

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
3. `src/core/emp1/emp1-wrc537-cylindrical-axis-authority.js` — new physical polarity authority contract.
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

Current report creation head predecessor: `b45028a010103dd5dbb0589571d127a00d84ee1d`.

| Check | Status | Evidence |
|---|---|---|
| independent six-component axis oracle | NOT_RUN / pending PR Actions |
| gamma5 bounded route suite | NOT_RUN / pending PR Actions |
| runEmp1 orchestration suite | NOT_RUN / pending PR Actions |
| current-main independent baseline | NOT_RUN / pending PR Actions |
| public product projection | NOT_RUN / pending PR Actions |
| production Pages/browser UI | NOT_RUN / pending triggered workflow |
| full repository regression | NOT_RUN / not claimed unless triggered |
| local connector runtime execution | NOT_RUN / environment has no executable repository checkout |

No PASS is claimed until exact-head Actions evidence exists.

## Next action

1. Observe exact PR-head workflows.
2. Diagnose and repair any source-level failure without weakening axis custody or frozen Table-5 expectations.
3. Refresh this ledger to the exact validated head.
4. Merge PR #1314 under owner-granted authority only after required exact-head checks pass.
5. Re-ground merged main and start the next remaining WRC source-authority blocker.

## Appendix A — takeover qualification

1. Why is foundation `eZ` an insufficient WRC +P authority even when it is orthogonal to vessel eX?
2. Derive the standard-fixture six-component WRC basis from the physical source/target geometry.
3. Why is `abs(dot(radialLine,+P))≈1` allowed instead of requiring `dot≈+1`?
4. What must happen when the selected load source and target points coincide?
5. Which exact ancestry hashes bind the new axis evidence to A/B custody?
6. Why does removing the bounded axis suspension reason not clear global `WRC_SIGN_ARBITRATION_OPEN`?
7. List the three production suspension reasons that must remain after this PR.
8. Explain why the CAUx vector is a cross-check rather than method-source authority.
9. Which Table-5/frozen numerical artifacts are intentionally unchanged?
10. What is the next valid engineering step if all PR1314 checks pass?
