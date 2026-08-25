# PR1415 Work Report — EMP.1 retained Table-5 cylindrical Rm authority reconciliation

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_DRAFT_AUDIT_COMPLETE
TAKEOVER_AUTHORITY: WRITE_ALLOWED_SOURCE_GOVERNANCE_ONLY
MERGE_AUTHORITY: NOT_GRANTED
CRITICALITY: ENGINEERING_CRITICAL
PR: #1415
ISSUE: #1377
UMBRELLA: #1389
BRANCH: agent/issue-1377-retained-table5-mean-radius-reconciliation-20260825
PR_HEAD_OBSERVED_BEFORE_RECOVERY: b58f2bf3902f844db58be4205afa3ff816b951d0
ENGINEERING_CONTENT_HEAD: 4d4608ab3fcb703e30fb8fd39b0d63fc2f45b9f5
FINAL_AUDIT_BASIS_HEAD: b3d0952d8a5e883f81b8181221568e3667b2f238
MAIN_HEAD_LAST_CHECKED: 9887ec1c3eb6184c0d590841b23c04ed449f9414
MERGE_BASE: 4461e7699d08b8a1acbbc89cdbea3fd998368ca6
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: CURRENT
GROUNDING_EPOCH: GE-PR1415-002
CURRENT_STAGE: FINAL_SIX_FILE_MAIN_REVIEW_CI_AUDIT_COMPLETE
CURRENT_BLOCKER: physical cylindrical R_m definition remains primary-source blocked; direct WRC page observation and checker execution are NOT_RUN; Owner merge authorization not granted
HIGHEST_RISK: bounded route authorization or deterministic OD/2-minus-assessment-T/2 software behavior being misrepresented as primary WRC physical-radius construction authority
EXACT_NEXT_ACTION: leave PR1415 draft/unmerged; if Owner later authorizes merge, re-ground live main/head/reviews, verify no new six-path overlap, and merge only with an exact-head guard.
```

`ENGINEERING_CONTENT_HEAD` contains the three source-governance recovery changes. Later commits are recovery/evidence metadata only.

## Handover in 60 seconds

PR #1415 is a partial source qualification for Issue #1377. Retained WRC Table 5 pp.41–42 supports only:

```text
Vessel Radius = R_m
gamma = R_m / T
beta  = 0.875 * r_o / R_m
```

It does not qualify how cylindrical `R_m` is physically constructed from OD, ID, thickness, corrosion or assessment geometry.

The current bounded gamma=5 / zero-dp route is separately authorized. The recovered PR therefore preserves two orthogonal authority layers:

```text
SOURCE RECORD
Table-5 R_m symbol/parameter role       = qualified retained source text
physical R_m construction              = blocked
engineering/production authority
  granted by this source record        = false

BOUNDED RUNTIME
route authorized                       = true
registry registered                    = true
bounded engineering/production use     = true
global EMP.1.C                         = false
code compliance                        = false
release qualified                      = false
```

Invariant:

`BOUNDED_WRC_ROUTE_AUTHORIZATION_DOES_NOT_BACK_PROPAGATE_TO_CYLINDRICAL_RM_PHYSICAL_DEFINITION_SOURCE_AUTHORITY`

No production geometry, WRC numerical mechanics, route/registry, aggregate P0 gate, release profile/current-state, oracle, tolerance or workflow changed.

## Current repository grounding

Takeover began read-only against:

```text
main             = 9887ec1c3eb6184c0d590841b23c04ed449f9414
pre-recovery PR  = b58f2bf3902f844db58be4205afa3ff816b951d0
merge base       = 4461e7699d08b8a1acbbc89cdbea3fd998368ca6
pre-recovery     = 17 ahead / 3 behind
reviews          = 0
review threads   = 0
paths            = exactly 6
```

The three commits on main after the merge base do not overlap any PR1415 path. Recovery disposition: `CONTINUE`; coordination state: `SAFE_SOURCE_GOVERNANCE_RECOVERY`.

Final audit at `b3d0952d8a5e883f81b8181221568e3667b2f238` versus the same live main found:

```text
23 ahead / 3 behind
exactly 6 effective paths
reviews = 0
review threads = 0
PR = OPEN / DRAFT / MERGEABLE / UNMERGED
```

The branch remains behind because it was not rebased merely to rewrite unrelated current-main history. The drift is non-overlapping with this source-governance assignment.

## Production / semantic trace

`src/core/emp1/emp1-wrc537-source-custody.js` derives:

```text
shellThickness = geometryEvidence.pipeThickness
outerRadius    = geometryEvidence.pipeOutsideDiameter / 2
meanRadius     = outerRadius - shellThickness / 2
```

and records `PIPE_OD_OVER_2_MINUS_ASSESSMENT_THICKNESS_OVER_2`.

`src/core/emp1/emp1-wrc537-cylindrical-bounded-adapter.js` then computes:

```text
gamma = meanRadius / shellThickness
beta  = 0.875 * attachmentOutsideRadius / meanRadius
```

The same `meanRadius` enters §4.5 applicability and Table-5 geometry. This is deterministic implementation behavior, not primary-source proof that `OD/2 - assessmentThickness/2` is the universal WRC physical definition of `R_m`.

On current main and this PR branch:

```text
EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED = true
method engineeringUseAuthorized             = true
method productionUseAuthorized              = true
registry registered                         = true
registry engineeringUseAuthorized           = true
globalEmp1CRouteAuthority                   = false
releaseQualified                            = false
```

## Source custody and qualified subset

Controlled source:

- WRC 537 (2013)
- raw SHA-256 `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`
- Git blob SHA-1 `ce861233928154145a9257efbbf8dbef3f5a17d1`
- retained transcription `docs/emp1/WRC537_2013_Tables_and_Charts.md`, Table 5, pp.41–42
- direct PDF page observation: `NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT`.

Qualified retained subset:

- Table-5 cylindrical symbol `R_m`;
- label `Vessel Radius`;
- `R_m` role in gamma;
- `R_m` role in beta;
- legacy `R_c` notation superseded for this Table-5 symbol/role only.

Still blocked:

- physical mean/midsurface definition;
- exact OD/ID/T construction;
- nominal/corroded/assessment/measured basis;
- consistency with physical shell-thickness basis;
- corrosion/local thinning treatment;
- ovality/out-of-roundness;
- locally thickened/insert/tapered geometry;
- §4.5 radius identity from this increment.

## Implemented recovery

1. `validation/emp1/wrc537-2013/cylindrical-mean-radius-source-qualification-v1.json`
   - keeps partial/blocking status;
   - labels record-local authority explicitly;
   - keeps physical-radius/source-record engineering/production authority false;
   - records current bounded route true;
   - adds no-back-propagation invariant/prohibition.
2. `scripts/emp1-wrc537-cylindrical-mean-radius-source-check.mjs`
   - requires retained `R_m` role true;
   - requires physical construction false;
   - requires source-record engineering/production authority false;
   - independently requires bounded route/method/registry authority true;
   - requires global/release false;
   - requires no numerical mutation.
   - intended success: `PASS_CURRENT_AUTHORIZED_ROUTE_TABLE5_RM_ROLE_PHYSICAL_RADIUS_DEFINITION_STILL_BLOCKED`.
3. `docs/emp1/WRC537_2013_Cylindrical_Mean_Radius_Authority.md`
   - publishes the two-layer authority matrix and production trace.

The checker itself remains `NOT_RUN`; encoded logic is not execution evidence.

## Effective changed-file ledger — exactly six

1. `validation/emp1/wrc537-2013/cylindrical-mean-radius-source-qualification-v1.json`
2. `scripts/emp1-wrc537-cylindrical-mean-radius-source-check.mjs`
3. `docs/emp1/WRC537_2013_Cylindrical_Mean_Radius_Authority.md`
4. `agents/PR1415_workreport.md`
5. `agents/status/PR1415.yaml`
6. `agents/claims/PR1415.yaml`

## Protected no-mutation

- `src/core/emp1/emp1-wrc537-source-custody.js`
- `src/core/emp1/emp1-wrc537-cylindrical-bounded-adapter.js`
- `src/core/emp1/emp1-wrc537-cylindrical-table5.js`
- `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js`
- `src/core/emp1/emp1-c-bounded-route-registry.js`
- aggregate P0 gate
- release profile/current-state contracts
- source/oracle/tolerance/qualification/evidence artifacts outside #1377
- `.github/workflows/**`.

## Validation ledger

| ID | Status | Observation / oracle |
|---|---|---|
| R-001 | PASS | live main / merge-base / PR re-grounded |
| R-002 | PASS | exact six-file scope retained before and after recovery |
| R-003 | PASS | 3-main-commit drift has no exact-path overlap |
| R-004 | PASS | reviews 0; review threads 0 |
| R-005 | PASS_SOURCE_INSPECTION | `R_m → gamma/beta → §4.5/Table5` trace |
| R-006 | PASS_SOURCE_INSPECTION | bounded route/method/registry true; global/release false |
| R-007 | PASS_SOURCE_INSPECTION | retained Table-5 `R_m` symbol and gamma/beta role preserved |
| R-008 | PASS_SOURCE_INSPECTION | physical definition and OD/ID/T construction remain false |
| R-009 | PASS_SOURCE_INSPECTION | source-record vs runtime authority separated |
| R-010 | NOT_RUN_EXECUTION_ENVIRONMENT | direct WRC primary-page observation unavailable |
| R-011 | NOT_RUN | mean-radius source checker Node execution |
| R-012 | NOT_APPLICABLE | numerical comparison; production mechanics unchanged |
| R-013 | PASS | final compare at `b3d0952...`: 23 ahead / 3 behind, exactly six paths |
| R-014 | NOT_RUN_EXECUTION_ENVIRONMENT | hosted gamma5 run `32848526229` / job `97803744049`: `steps=null`, `logs_url=null` |
| R-015 | NOT_RUN_EXECUTION_ENVIRONMENT | hosted handcalc `32848526146` / job `97803744180`: `steps=null`, `logs_url=null` |
| R-016 | NOT_RUN_EXECUTION_ENVIRONMENT | hosted runEmp1 `32848526094` / job `97803743746`: `steps=null`, `logs_url=null` |
| R-017 | NOT_RUN_EXECUTION_ENVIRONMENT | hosted source oracle `32848526102` / job `97803743632`: `steps=null`, `logs_url=null` |

Hosted classification is `NOT_RUN_EXECUTION_ENVIRONMENT / PRE_STEP_INFRASTRUCTURE_FAILURE` under #54. It is neither product PASS nor engineering-code FAIL.

## Active register

- `ISS-1377-001` P0 OPEN — exact physical cylindrical `R_m` definition unresolved.
- `RISK-1377-001` P0 OPEN — route authorization may be misused as physical source proof.
- `DEC-1377-001` P0 ACTIVE — retained `R_m` symbol/parameter role is qualified only to retained Table-5 text.
- `DEC-1377-002` P0 ACTIVE — `OD/2 - assessmentThickness/2` remains software custody behavior, not universal WRC authority.
- `DEC-1377-003` P0 ACTIVE — source-record and bounded-runtime authority are orthogonal.
- `DEC-1377-004` P0 ACTIVE — no production geometry/numerical mutation is authorized.
- `DEBT-1377-001` P1 OPEN — direct PDF and executable checker remain unavailable.

## Takeover chain

Original engineering basis: `f43d7b82883524c7f83d45e9fdd59b63bc379328`.

Previous audited head: `b58f2bf3902f844db58be4205afa3ff816b951d0`.

Current engineering recovery basis: `4d4608ab3fcb703e30fb8fd39b0d63fc2f45b9f5`.

Current final audit basis: `b3d0952d8a5e883f81b8181221568e3667b2f238`.

Recovery decision: `CONTINUE`.

## Appendix A — implementation takeover qualification

A1 Production Trace — **20/20**. Traced LAFEA.2 OD/thickness → source custody `meanRadius` → bounded geometry gamma/beta → §4.5/Table5 use.

A2 Failure Isolation — **20/20**. No numerical defect claimed; isolated authority-bookkeeping ambiguity created by later route authorization.

A3 Authority / Invariant — **20/20**. Source symbol/role, physical construction, bounded runtime, global C, code and release authority remain distinct.

A4 Independent Validation — **19/20**. Live main/branch route, registry, diff, source record, production trace and review state cross-checked; direct PDF/checker execution remain NOT_RUN.

A5 Minimal Patch — **20/20**. Same three source-governance files plus three recovery files; all production/release/oracle/workflow paths protected.

**Total: 99/100; minimum 19/20 — TAKEOVER QUALIFIED / HANDOVER READY.**
