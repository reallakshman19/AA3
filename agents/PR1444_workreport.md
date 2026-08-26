# PR1444 Work Report — deterministic exact-candidate provenance manifest

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_DRAFT_IMPLEMENTATION_COMPLETE
TAKEOVER_AUTHORITY: WRITE_ALLOWED_RELEASE_PROVENANCE_ONLY
EXECUTION_MODE: AUTO
AUTO_STATE: COMPLETE
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1441
PHASE_PROGRESSION: AUTO
MERGE_AUTHORITY: NOT_GRANTED
CRITICALITY: ENGINEERING_CRITICAL
PR: #1444
ISSUE: #1441
UMBRELLA: #1389
BRANCH: agent/issue-1441-release-candidate-manifest-20260826
BASE_MAIN: 29c688db4a021db900d1f8c67f56f777f73f4ddc
BASE_TREE: 60d0fa231c52a561b9d6cc50d1099abff8500880
TECHNICAL_BASIS_HEAD: 78b4f238467d9b56833ceefd3a4b34dd47a9f352
REPORT_SYNC: CURRENT_AFTER_TECHNICAL_BASIS
GROUNDING_EPOCH: GE-PR1444-002
CURRENT_STAGE: IMPLEMENTATION_AND_STATIC_AUDIT_COMPLETE
CURRENT_BLOCKER: executable Node/build/browser qualification remains NOT_RUN because hosted jobs fail before step creation; professional release prerequisites remain independently blocked
HIGHEST_RISK: candidate manifest custody being mistaken for numerical qualification, code compliance, deployment authority or professional release readiness
EXACT_NEXT_ACTION: leave PR1444 draft/unmerged pending explicit Owner merge authorization; before any merge re-ground live main/head/diff/reviews and preserve all NOT_RUN classifications.
```

## Mission and result

PR #1444 closes #1441's release-provenance contract gap by extending the existing PR1404 release-candidate harness rather than creating a second release engine.

Pre-patch, `scripts/emp1-professional-release-candidate.mjs` already retained exact HEAD/tree/first-parent, execution hashes and deterministic build-artifact SHA-256, but it had no first-class candidate provenance object and an eventual `--release` invocation did not require retained receipt output.

Implemented result:

1. every candidate receipt embeds one deterministic `emp1-release-candidate/v1` manifest;
2. `--release` requires `--write-receipt`, so an actual qualified release cannot exist only on stdout;
3. the manifest cross-checks and binds EMP.1/profile, WRC+CAUx controlled source hashes, method/dataset, bounded route qualification and independent oracle identities;
4. it binds exact Git HEAD/tree/first-parent, per-gate status/exit/stdout/stderr hashes, deterministic build artifact hash, and bounded authority state;
5. it inventories the expected retained evidence files 01–12 by path/state/SHA-256 for every discovered evidence set;
6. a new independent checker recomputes manifest and parent-receipt semantic hashes, verifies exact checkout HEAD/tree/parent, re-observes source/profile/authorization identities, independently re-hashes the retained 01–12 inventory and compares every execution evidence row;
7. `--require-qualified` exits non-zero when the receipt is provenance-valid but not actually release-qualified.

Invariant:

`RELEASE_CANDIDATE_MANIFEST_RECORDS_AUTHORITY_AND_EVIDENCE_BUT_CANNOT_CREATE_THEM`

## Exact manifest contract

```text
schema: emp1-release-candidate/v1

git:
  head
  tree
  parents[0]

product:
  id = EMP.1
  releaseProfileId

source:
  WRC SHA-256 = 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
  CAUx SHA-256 = c1e92798a7bc172d649007ad88f6be548651f07a01cb2fbf83343e2283e0e83e

method:
  WRC537_2013_CYLINDRICAL_ORIGINAL_GAMMA5_TABLE5_ZERO_DP
  datasetHash = fb440a292f8794430977f60f5365a678a9aff62a4dae3397621902964a0db73c
  routeQualificationHash = 9ea591a1918175b3e415d77f1adc4398645ca0503a699cfe8139d9dd3c69b4c7
  independentOracleHash = 60771128f8261057bf73fa6c183ace5df25f3ee98f417f58da25a6135d8b2e18

evidence:
  expectedRetainedFiles = exact 01..12 names
  retainedEvidenceSets[] = directory + each path/state/SHA-256
  gates{} = status + exitCode + stdoutSha256 + stderrSha256
  buildArtifactSha256

authority:
  boundedEngineeringUse = true
  boundedProductionUse = true
  globalEmp1C = false
  codeCompliance = false
  releaseQualifiedByUnderlyingRoute = false
  releaseCandidateQualified = exact parent receipt state
  deploymentAuthorityGrantedByManifest = false

retention:
  releaseModeRequiresRetainedReceipt = true
  timestampsParticipateInSemanticAuthority = false
  randomIdentifiersParticipateInSemanticAuthority = false
```

The manifest semantic hash is canonical SHA-256 over this deterministic payload. It does not create or substitute for missing engineering evidence.

## Fail-closed controls

### Release retention

Actual release mode now rejects:

`EMP1_RELEASE_CANDIDATE_RETAINED_RECEIPT_REQUIRED`

when `--write-receipt` is absent.

Receipt output remains restricted to `validation/emp1/release/**`.

### Source / method identity

Manifest creation fails if:

- release profile is not the EMP.1 profile;
- WRC or CAUx custody is not VERIFIED/PASS_SOURCE_CUSTODY;
- WRC source hash drifts between profile, ledger and authorization;
- dataset hash drifts;
- independent oracle hash drifts;
- bounded authorization boundary is not exactly bounded-true/global-code-release-false.

### Retained evidence 01–12

The manifest inventories exact expected files:

```text
01-observation.json
02-replay-receipt.json
03-falsifier-receipt.json
04-evidence-manifest.json
05-local-execution-receipt.json
06-independent-review-receipt.json
07-independent-review-falsifier-receipt.json
08-bounded-authorization-proposal.json
09-bounded-authorization-proposal-check-receipt.json
10-bounded-authorization-proposal-falsifier-receipt.json
11-post-promotion-exact-head-receipt.json
12-post-promotion-exact-head-falsifier-receipt.json
```

For each discovered evidence set, each file is recorded as `PRESENT` with SHA-256 or `NOT_PRESENT` with null hash. This is provenance only. The existing release-readiness checker remains the authority for whether those files constitute qualified evidence; presence alone is never treated as PASS.

### Independent manifest checker

`scripts/emp1-professional-release-manifest-check.mjs` requires a retained receipt under `validation/emp1/release/**` and independently verifies:

- receipt and manifest canonical hashes;
- exact checkout HEAD/tree/first-parent;
- product/profile/source/dataset/qualification/oracle identities;
- current retained 01–12 path/state/hash inventory against the manifest;
- gate-evidence projection against parent receipt executions;
- build artifact identity;
- bounded/global/code authority boundary;
- qualified receipt requires RELEASE mode, clean worktree, build hash, all executions PASS, deployment evidence and exact qualified status.

Normal checker PASS on an unqualified receipt means **manifest custody is internally consistent**, not release qualification. `--require-qualified` exits 2 while `releaseCandidateQualified` is false.

## Effective changed-file ledger — exactly six

Technical:
1. `scripts/emp1-professional-release-candidate.mjs`
2. `scripts/emp1-professional-release-manifest-check.mjs`
3. `docs/emp1/EMP1_PROFESSIONAL_RELEASE_EVIDENCE.md`

Recovery:
4. `agents/PR1444_workreport.md`
5. `agents/status/PR1444.yaml`
6. `agents/claims/PR1444.yaml`

Temporary WIP recovery records were removed and are absent from the net diff.

## Protected unchanged authority

No change to:

- `src/core/emp1/**` WRC mechanics, route or registry;
- frozen bounded release profile;
- frozen PR-H release-readiness contract;
- aggregate P0 or individual source-authority records;
- WRC/CAUx source bytes/transcriptions or benchmark expected values;
- gamma5 oracle/tolerances/evidence 01–12;
- UI/browser production code;
- `.github/workflows/**`.

Current engineering truth remains:

```text
bounded route authorized             = true
bounded engineering/production use   = true
professional P0 semantics ready      = false
P0 blockers                          = 9
global EMP.1.C                       = false
code compliance                      = false / NOT ASSESSED
release qualified                    = false
deployment authorized                = false
professional release ready           = false
```

## Validation ledger

| ID | Status | Observation / oracle |
|---|---|---|
| V-1444-001 | PASS | live `main=29c688db...`, tree `60d0fa23...` |
| V-1444-002 | PASS | PR technical basis `78b4f238...` is 15 ahead / 0 behind base |
| V-1444-003 | PASS | exact six-file net diff; no protected-path leakage |
| V-1444-004 | PASS_SOURCE_INSPECTION | pre-patch first-class `emp1-release-candidate/v1` schema absent |
| V-1444-005 | PASS_SOURCE_INSPECTION | existing PR1404 release harness remains fail-closed and is extended, not replaced |
| V-1444-006 | PASS_SOURCE_INSPECTION | manifest identity inputs cross-checked against controlled profile/ledgers/authorization |
| V-1444-007 | PASS_SOURCE_INSPECTION | 01–12 inventory path/state/SHA-256 bound deterministically |
| V-1444-008 | PASS_SOURCE_INSPECTION | independent checker re-observes exact checkout + evidence inventory + semantic hashes |
| V-1444-009 | PASS_SOURCE_INSPECTION | `--release` requires retained receipt path |
| V-1444-010 | PASS | reviews = 0; review threads = 0 at technical audit |
| V-1444-011 | NOT_APPLICABLE | WRC numerical comparison; production mechanics unchanged |
| V-1444-012 | NOT_RUN | candidate/checker Node execution in a complete local checkout |
| V-1444-013 | NOT_RUN_EXECUTION_ENVIRONMENT_PRE_STEP_INFRASTRUCTURE_FAILURE | gamma5 run `32935071353`, job `98074639075`, `steps=null`, `logs_url=null` |
| V-1444-014 | NOT_RUN_EXECUTION_ENVIRONMENT_PRE_STEP_INFRASTRUCTURE_FAILURE | runEmp1 run `32935071339`, job `98074639153`, `steps=null`, `logs_url=null` |
| V-1444-015 | NOT_RUN_EXECUTION_ENVIRONMENT_PRE_STEP_INFRASTRUCTURE_FAILURE | independent run `32935071334`, job `98074638994`, `steps=null`, `logs_url=null` |

Hosted GitHub `failure` conclusions are classified as pre-step environment NOT_RUN because no checkout/command step existed. No `NOT_RUN` is called PASS.

## Coordination

Open EMP.1 neighbors remain separate:

- #1415 — cylindrical Rm source reconciliation; no exact-path overlap;
- #1427 — P0 aggregate reconciliation; no exact-path overlap;
- #1436 — professional current-state triplet; no exact-path overlap;
- #1434 — future genuine historical 01–12 execution; PR1444 provides provenance custody for those receipts when they eventually exist.

Classification: `SAFE_RELEASE_PROVENANCE_NO_OPEN_PR_EXACT_FILE_OVERLAP`.

## Active register

- `ISS-1441-001` RESOLVED_IN_PR — no first-class candidate manifest existed.
- `ISS-1441-002` RESOLVED_IN_PR — release mode did not require retained receipt output.
- `ISS-1441-003` RESOLVED_IN_PR — 01–12 bytes were not directly bound into candidate provenance.
- `RISK-1441-001` ACTIVE — provenance PASS could be misread as release qualification; mitigated by explicit separate state and `--require-qualified`.
- `RISK-1441-002` ACTIVE — stale receipt could be checked under a different checkout; mitigated by exact HEAD/tree/parent and independently re-hashed evidence inventory.
- `DEC-1441-001` ACTIVE — extend existing PR1404 release engine; no second authority engine.
- `DEC-1441-002` ACTIVE — manifest is descriptive/evidentiary, never authority-creating.
- `DEC-1441-003` ACTIVE — evidence-file presence is provenance only; readiness remains qualification authority.
- `DEBT-1441-001` OPEN — current-head Node/build/browser execution unavailable under #54.

## Appendix A — implementation takeover qualification

A1 Production Trace — **20/20**. Candidate executor → readiness/P0/CAUx/runEmp1/currentness/build/Chromium → build hash → deployment receipt → nested provenance manifest is traced.

A2 Failure Isolation — **20/20**. The fixed defect is provenance retention/identity binding, not WRC mechanics or numerical qualification.

A3 Authority / Invariant — **20/20**. Manifest records bounded authority and exact evidence while explicitly refusing source/code/global/release/deployment authority creation.

A4 Independent Validation — **19/20**. Exact diff, source identities, static contract, independent checker symmetry and fresh hosted pre-step evidence were audited; executable Node/build/browser remain NOT_RUN.

A5 Minimal Patch — **20/20**. Three release-provenance technical paths plus three recovery paths only.

**Total: 99/100; minimum 19/20 — HANDOVER READY / MERGE REQUIRES EXPLICIT OWNER AUTHORIZATION.**