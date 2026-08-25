# PR1415 Work Report — EMP.1 retained Table-5 cylindrical Rm authority reconciliation

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_DRAFT_RECONCILED_TO_CURRENT_ROUTE_STATE
TAKEOVER_AUTHORITY: WRITE_ALLOWED_SOURCE_GOVERNANCE_ONLY
MERGE_AUTHORITY: NOT_GRANTED
CRITICALITY: ENGINEERING_CRITICAL
WORK_INTENT: SOURCE_GOVERNANCE_RECONCILIATION
PR: #1415
ISSUE: #1377
UMBRELLA: #1389
BRANCH: agent/issue-1377-retained-table5-mean-radius-reconciliation-20260825
PR_HEAD_OBSERVED_BEFORE_RECOVERY: b58f2bf3902f844db58be4205afa3ff816b951d0
REPORT_BASIS_HEAD: 4d4608ab3fcb703e30fb8fd39b0d63fc2f45b9f5
MAIN_HEAD_LAST_CHECKED: 9887ec1c3eb6184c0d590841b23c04ed449f9414
MERGE_BASE: 4461e7699d08b8a1acbbc89cdbea3fd998368ca6
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: CURRENT
GROUNDING_EPOCH: GE-PR1415-002
CURRENT_STAGE: CURRENT_ROUTE_STATE_RECONCILED_FINAL_AUDIT_PENDING
CURRENT_BLOCKER: physical cylindrical R_m definition remains primary-source blocked; direct WRC page observation and checker execution are NOT_RUN; Owner merge authorization not granted
HIGHEST_RISK: allowing bounded route authorization or deterministic OD/2-minus-assessment-T/2 software behavior to masquerade as primary WRC physical-radius construction authority
EXACT_NEXT_ACTION: audit exact six-file diff against live main, reviews/threads and hosted execution; synchronize evidence metadata only; leave PR1415 draft/unmerged pending explicit Owner merge authorization.
```

`REPORT_BASIS_HEAD` is the engineering-content head containing the three source-governance updates. Later commits may update only PR recovery metadata.

## Handover in 60 seconds

PR #1415 remains a **partial source qualification** for Issue #1377. The retained WRC Table-5 transcription supports only:

```text
Vessel Radius = R_m
gamma = R_m / T
beta  = 0.875 * r_o / R_m
```

It still does **not** qualify the physical construction of cylindrical `R_m` from OD/ID/thickness/corrosion/assessment geometry.

The original PR was created before later repository evolution and its recovery records could be read as though `engineeringUseAuthorized=false` / `productionUseAuthorized=false` described the live bounded route. That is now ambiguous because the separately governed gamma=5 / zero-dp route is currently authorized.

The current invariant is:

`BOUNDED_WRC_ROUTE_AUTHORIZATION_DOES_NOT_BACK_PROPAGATE_TO_CYLINDRICAL_RM_PHYSICAL_DEFINITION_SOURCE_AUTHORITY`

The source record therefore keeps its own engineering/production authority false while explicitly recording the independent current bounded-route state as true.

No production geometry, WRC numerics, aggregate P0 gate, release profile, oracle, tolerance or workflow is changed.

## Live repository grounding — GE-PR1415-002

Observed before mutation:

```text
live main      = 9887ec1c3eb6184c0d590841b23c04ed449f9414
PR head        = b58f2bf3902f844db58be4205afa3ff816b951d0
merge base     = 4461e7699d08b8a1acbbc89cdbea3fd998368ca6
branch state   = 17 ahead / 3 behind
PR             = OPEN / DRAFT / MERGEABLE / UNMERGED
reviews        = 0
review threads = 0
changed paths  = 6
```

The three main commits after the merge base do not touch any of PR #1415's six paths. Coordination classification: `SAFE_SOURCE_GOVERNANCE_RECOVERY`; no conflict resolution requires guessing engineering intent.

## Production / semantic trace

### 1. Source custody

`src/core/emp1/emp1-wrc537-source-custody.js` derives:

```text
shellThickness = geometryEvidence.pipeThickness
outerRadius    = geometryEvidence.pipeOutsideDiameter / 2
meanRadius     = outerRadius - shellThickness / 2
```

and retains the derivation label:

`PIPE_OD_OVER_2_MINUS_ASSESSMENT_THICKNESS_OVER_2`.

### 2. Bounded geometry

`src/core/emp1/emp1-wrc537-cylindrical-bounded-adapter.js` consumes `meanRadius` and computes:

```text
gamma = meanRadius / shellThickness
beta  = 0.875 * attachmentOutsideRadius / meanRadius
```

### 3. Downstream use

That same `meanRadius` is used in:

- bounded-domain gamma/beta selection;
- cylindrical §4.5 applicability evaluation;
- Table-5 cylindrical stress geometry.

### 4. Current bounded route

On both current main and the PR branch:

```text
EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED = true
method engineeringUseAuthorized             = true
method productionUseAuthorized              = true
registry registered                         = true
registry engineeringUseAuthorized           = true
globalEmp1CRouteAuthority                   = false
releaseQualified                            = false
```

This runtime state is independent of the unresolved physical source meaning of cylindrical `R_m`.

## Retained source custody

- document: WRC 537 (2013)
- raw SHA-256: `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`
- Git blob SHA-1: `ce861233928154145a9257efbbf8dbef3f5a17d1`
- retained transcription: `docs/emp1/WRC537_2013_Tables_and_Charts.md`, Table 5, pp.41–42
- direct current-turn PDF page observation: `NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT`

## Qualified retained-source subset

- cylindrical Table-5 source symbol `R_m`;
- geometry label `Vessel Radius`;
- `R_m` is the Table-5 vessel-radius input;
- `R_m` is used in retained Table-5 `gamma`;
- `R_m` is used in retained Table-5 `beta`;
- legacy cylindrical `R_c` notation is superseded for this Table-5 symbol/role only.

## Still blocked

- proof that `R_m` is physically a midsurface/mean radius;
- exact OD/ID/`T` construction;
- nominal/corroded/assessment/measured geometry basis;
- physical consistency between `R_m` and selected shell-thickness basis;
- corrosion geometry treatment;
- local diameter / ovality / out-of-roundness;
- locally thickened/insert/tapered shell treatment;
- §4.5 radius identity from this increment;
- any claim that current `OD/2 - assessmentThickness/2` is a universal WRC source rule.

## Implemented recovery

### Source qualification JSON

`validation/emp1/wrc537-2013/cylindrical-mean-radius-source-qualification-v1.json`

- preserves the existing partial/blocking status;
- labels `authority` as authority granted by this source record only;
- keeps physical-radius and record-local engineering/production authority false;
- records the separately authorized current bounded route;
- adds the no-back-propagation invariant;
- adds an explicit prohibition against using route authorization as physical-radius source proof.

### Static checker

`scripts/emp1-wrc537-cylindrical-mean-radius-source-check.mjs`

Now requires both sides of current truth simultaneously:

1. retained Table-5 `R_m` symbol/parameter role is qualified;
2. physical `R_m` construction remains false/unqualified;
3. source-record engineering/production authority remains false;
4. bounded route module/method/registry authority is true;
5. global C/release remain false;
6. no production numeric mutation occurred.

Intended executable success string:

`PASS_CURRENT_AUTHORIZED_ROUTE_TABLE5_RM_ROLE_PHYSICAL_RADIUS_DEFINITION_STILL_BLOCKED`

Actual Node execution remains `NOT_RUN` until observed in a complete checkout.

### Authority note

`docs/emp1/WRC537_2013_Cylindrical_Mean_Radius_Authority.md`

Now contains an explicit two-layer authority matrix and the production trace above.

## Effective changed-file ledger — must remain exactly six

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
- `validation/emp1/release/emp1-wrc537-gamma5-p0-source-semantics-gate-v1.json`
- release profile/current-state contracts
- all oracle/tolerance/qualification/evidence artifacts
- `.github/workflows/**`

## Validation ledger

| ID | Status | Observation / oracle |
|---|---|---|
| R-001 | PASS | live main `9887ec1...`; PR pre-recovery head `b58f2bf...`; merge base `4461e769...` |
| R-002 | PASS | effective PR scope was exactly six paths before recovery |
| R-003 | PASS | branch was 17 ahead / 3 behind; main drift did not overlap the six PR paths |
| R-004 | PASS | reviews 0; review threads 0 |
| R-005 | PASS_SOURCE_INSPECTION | `R_m → gamma/beta → §4.5/Table5` production trace established |
| R-006 | PASS_SOURCE_INSPECTION | current branch/main route module and registry are authorized; global/release remain false |
| R-007 | PASS_SOURCE_INSPECTION | retained Table-5 `Vessel Radius R_m`, gamma and beta role preserved |
| R-008 | PASS_SOURCE_INSPECTION | physical mean/midsurface and OD/ID/T construction remain false |
| R-009 | PASS_SOURCE_INSPECTION | source-record authority and bounded-route authority explicitly separated |
| R-010 | NOT_RUN_EXECUTION_ENVIRONMENT | direct WRC primary-page observation unavailable through connected binary transport |
| R-011 | NOT_RUN | `node scripts/emp1-wrc537-cylindrical-mean-radius-source-check.mjs` |
| R-012 | NOT_APPLICABLE | numerical comparison; production WRC mechanics unchanged |
| R-013 | PENDING_FINAL_AUDIT | final exact six-file compare / reviews / threads / hosted execution |

No `NOT_RUN` is represented as PASS.

## Active register

- `ISS-1377-001` P0 OPEN — exact physical cylindrical `R_m` definition remains primary-source unresolved.
- `RISK-1377-001` P0 OPEN — route authorization may be misread as source proof for current `meanRadius` construction.
- `DEC-1377-001` P0 ACTIVE — retain Table-5 `R_m` symbol/role; do not infer physical construction.
- `DEC-1377-002` P0 ACTIVE — current `OD/2 - assessmentThickness/2` is software custody behavior, not universal WRC authority.
- `DEC-1377-003` P0 ACTIVE — source-record authority and bounded-runtime authority are orthogonal.
- `DEC-1377-004` P0 ACTIVE — no production geometry/numerical mutation is authorized by this reconciliation.
- `DEBT-1377-001` P1 OPEN — direct primary PDF re-observation and executable checker remain unavailable in the connected environment.

## Takeover chain

Original engineering basis: `f43d7b82883524c7f83d45e9fdd59b63bc379328`.

Previous audited head before current takeover: `b58f2bf3902f844db58be4205afa3ff816b951d0`.

Current takeover grounding epoch: `GE-PR1415-002` against `main@9887ec1c3eb6184c0d590841b23c04ed449f9414`.

Recovery decision: `CONTINUE`. No quarantine/supersession required because intent is reconstructible, six-file scope remains coherent, main drift has no exact-path overlap, and no expected numerical value/tolerance changed.

## Appendix A — implementation takeover qualification

### A1 Production Trace — 20/20

Traced retained LAFEA.2 OD/thickness through `emp1-wrc537-source-custody.js` to `meanRadius`, then through `deriveEmp1Wrc537CylindricalBoundedGeometry()` to gamma/beta, §4.5 applicability and Table-5 geometry.

### A2 Current Failure Isolation — 20/20

No numerical defect is inferred. The recovery target is authority bookkeeping ambiguity after later bounded-route authorization: source-record false authority must not be read as live route false, and live route true must not back-propagate into unresolved physical `R_m` semantics.

### A3 Authority / Invariant — 20/20

`R_m` symbol/parameter authority, physical radius construction authority, bounded runtime authorization, global C authority, code acceptance and release authority are explicitly separated.

### A4 Independent Validation — 19/20

Live main/branch route and registry, PR diff, retained source record, production source-custody path and review state were independently cross-checked. Direct PDF page observation and checker execution remain NOT_RUN.

### A5 Minimal Patch / Next Commit — 20/20

Only the existing three source-governance files plus three recovery records are in scope. Production route/registry/geometry/numerics, aggregate P0 gate, release state/profile, oracle/tolerance and workflows remain protected.

**Total: 99/100; minimum 19/20 — TAKEOVER QUALIFIED / HANDOVER READY.**
