# PR1423 Work Report — WRC/code-acceptance authority reconciliation

## Current recovery state

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED_SOURCE_GOVERNANCE_ONLY
MERGE_AUTHORITY: OWNER_ONLY
PR: #1423
ISSUE: #1381
UMBRELLA: #1389
BRANCH: agent/issue-1381-code-acceptance-reconciliation-20260825
MAIN_HEAD_LAST_CHECKED: 9887ec1c3eb6184c0d590841b23c04ed449f9414
MERGE_BASE: 9887ec1c3eb6184c0d590841b23c04ed449f9414
CRITICALITY: ENGINEERING_CRITICAL
COORDINATION: SAFE
CURRENT_STAGE: SOURCE_BOUNDARY_RECONCILIATION_COMPLETE_DRAFT_OWNER_REVIEW
HIGHEST_RISK: treating bounded WRC route authorization as downstream code-classification or allowable authority
EXACT_NEXT_ACTION: Owner review/merge decision for PR #1423. Keep #1381 open after merge for genuine primary-WRC plus governing-code/edition/service closure.
```

## Mission and result

PR #1423 reconciles Issue #1381 against the current post-authorization route state without inventing a code-allowable method.

Current live production fact at the exact merge base:

```text
EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED = true
registry.registered = true
registry.engineeringUseAuthorized = true
globalEmp1CRouteAuthority = false
registry.releaseQualified = false
```

The #1381 source boundary now explicitly retains the invariant:

`BOUNDED_WRC_ROUTE_AUTHORIZATION_DOES_NOT_BACK_PROPAGATE_TO_CODE_ACCEPTANCE`

Therefore bounded WRC calculation/runtime authority may remain true while all downstream acceptance authority remains false:

```text
codeStressClassificationAuthority = false
allowableComparisonAuthority       = false
codeComplianceAuthority            = false
releaseAuthority                   = false
```

## Implemented engineering-governance change

### Retained authority record

`validation/emp1/wrc537-2013/stress-classification-code-boundary-v1.json` now records the current authorized bounded route/registry state and explicitly denies propagation into code classification, allowable comparison, compliance or release.

The record remains:

`BLOCKED_CODE_CLASSIFICATION_AND_ACCEPTANCE_AUTHORITY_UNQUALIFIED`

It also records controlled WRC source identity and direct-page observation state:

```text
WRC raw SHA-256 = 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
WRC git blob     = ce861233928154145a9257efbbf8dbef3f5a17d1
primary page re-observation = NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT
```

### Retained CAUx reference boundary

The retained CAUx pp.24–31 transcription shows a separate downstream stress-classification/allowable layer on page 24 using terms such as `Pm`, `Pl`, `Q`, `Smh` and `Smc`, while subsequent pages separately report WRC loads/curves/stresses.

PR #1423 records this only as:

`REFERENCE_ONLY_NOT_WRC_PRIMARY_SOURCE_NOT_PRODUCTION_CODE_METHOD_AUTHORITY`

CAUx does not define WRC stress categories or production code acceptance.

### Static anti-drift checker

`scripts/emp1-wrc537-stress-classification-code-boundary-check.mjs` now requires both sides of the current truth:

- route authorization = true;
- registry registered / bounded engineering use = true;
- global EMP.1.C = false;
- release qualified = false;
- code classification / allowable / compliance / release authority = false;
- professional release state remains not ready;
- Table-5 remains host-shell/eight-point calculation only and contains no code-category/allowable authority tokens.

Intended checker result when executable:

`PASS_CURRENT_AUTHORIZED_ROUTE_CODE_ACCEPTANCE_BOUNDARY_STATIC_CHECK`

Actual checker execution is **NOT_RUN** in this connected environment; encoded logic is not reported as execution PASS.

## Still unresolved / issue remains open

PR #1423 does **not** close #1381. Still required from authoritative primary/code sources:

- exact primary WRC wording and page locator for acceptability responsibility;
- whether WRC assigns any result to ASME primary/secondary/peak categories;
- pressure-stress combination/classification authority;
- Appendix-B category implications;
- governing code, edition/addenda and service/load condition;
- exact classification/combination and allowable basis;
- fatigue stress-range/cycle-count method where applicable;
- evidence/hash binding between WRC result and separate downstream code assessment;
- release/approval method.

No B31.3 vessel-shell allowable default is introduced.

## Final changed-file ledger

Exactly six effective files relative to current main:

1. `validation/emp1/wrc537-2013/stress-classification-code-boundary-v1.json`
2. `scripts/emp1-wrc537-stress-classification-code-boundary-check.mjs`
3. `docs/emp1/WRC537_2013_Stress_Classification_Code_Authority.md`
4. `agents/PR1423_workreport.md`
5. `agents/status/PR1423.yaml`
6. `agents/claims/PR1423.yaml`

Superseded WIP report/status/claim were removed.

Protected unchanged:

- `src/core/emp1/**` including route/registry/Table-5 mechanics;
- `validation/emp1/release/**`;
- source/dataset/oracle/tolerance artifacts;
- aggregate P0 gate;
- UI/browser product code;
- `.github/workflows/**`.

Unexplained changed files: 0.

## Validation ledger

| ID | Status | Observation / oracle |
|---|---|---|
| C-001 | PASS | LIVE_GITHUB: main and merge base = `9887ec1c3eb6184c0d590841b23c04ed449f9414` |
| C-002 | PASS | SOURCE_INSPECTION: existing #1381 artifact/checker/doc and merged #1382 baseline |
| C-003 | PASS | SOURCE_INSPECTION: current route authorized; registry registered/bounded engineering use true; global/release false |
| C-004 | PASS | ARTIFACT_INSPECTION: professional current-state keeps code compliance/release/deployment false and releaseReady false |
| C-005 | PASS | RETAINED_TRANSCRIPTION_INSPECTION: CAUx demonstrates a separate downstream classification/allowable layer; reference-only |
| C-006 | NOT_RUN_EXECUTION_ENVIRONMENT | exact WRC PDF pages: exact blob resolves but binary/base64 payload is empty |
| C-007 | NOT_RUN | `node scripts/emp1-wrc537-stress-classification-code-boundary-check.mjs` not executed in a complete checkout |
| C-008 | NOT_APPLICABLE | numerical WRC comparison: production mechanics unchanged |
| C-009 | PASS | GitHub compare: exactly 6 intended files, branch 0 behind current main at implementation reconciliation |
| C-010 | PASS | PR reviews/comments/inline threads: none |
| C-011 | NOT_RUN_EXECUTION_ENVIRONMENT | hosted EMP.1 workflows all failed before step creation; no engineering command executed |

Hosted PR-head evidence at `09ab3d2df61fcfd0a3907a80e024d3175df99c26`:

```text
32813470694 / 97697146828 / independent-source-oracle       / steps=null / logs_url=null
32813470652 / 97697146629 / independent-handcalc            / steps=null / logs_url=null
32813470633 / 97697146844 / qualify-gamma5-route            / steps=null / logs_url=null
32813470637 / 97697146673 / qualify-runemp1-orchestration    / steps=null / logs_url=null
```

Classification: `NOT_RUN_EXECUTION_ENVIRONMENT / PRE_STEP_INFRASTRUCTURE_FAILURE` under #54. This is neither product PASS nor engineering FAIL.

## Active register

- `ISS-1423-001` P0 OPEN — exact primary WRC acceptability wording/page locator unavailable.
- `RISK-1423-001` P0 OPEN — production route authorization could be misread as code approval.
- `DEC-1423-001` P0 ACTIVE — route authority and code-acceptance authority remain orthogonal.
- `DEC-1423-002` P0 ACTIVE — CAUx classification is reference evidence only; no authority promotion.
- `QST-1423-001` P0 OPEN — future governing code/edition/service/classification method selection.
- `DEBT-1423-001` P1 OPEN — #54 prevents hosted executable evidence.

## Appendix A — implementation takeover qualification

A1 Production Trace — **20/20**. Authorized route/registry and downstream code/release state are traced independently and reconciled in the retained artifact/checker/doc.

A2 Failure Isolation — **20/20**. The unresolved engineering item is source/code acceptance authority, not WRC numerical execution or route registration.

A3 Authority / Invariant — **20/20**. The checker requires bounded route authority true while classification/allowable/compliance/release remain false.

A4 Independent Validation — **19/20**. Route, registry, professional state and CAUx retained reference were cross-checked; direct primary-WRC page observation and executable checker remain unavailable.

A5 Minimal Patch — **20/20**. Exactly three existing #1381 governance files plus PR recovery records; no production/profile/oracle/workflow mutation.

**Total: 99/100; minimum 19/20 — HANDOVER_READY.**
