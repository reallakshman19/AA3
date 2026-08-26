# PR1457 Work Report — EMP.1 deployable artifact security gate

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_DRAFT_IMPLEMENTATION_COMPLETE
TAKEOVER_AUTHORITY: WRITE_ALLOWED_RELEASE_ARTIFACT_SECURITY_ONLY
EXECUTION_MODE: AUTO
AUTO_STATE: COMPLETE
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1456
MERGE_AUTHORITY: NOT_GRANTED
CRITICALITY: ENGINEERING_CRITICAL
PR: #1457
ISSUE: #1456
UMBRELLA: #1389
BRANCH: agent/issue-1456-emp1-build-artifact-security-20260826
BASE_MAIN: 29c688db4a021db900d1f8c67f56f777f73f4ddc
BASE_TREE: 60d0fa231c52a561b9d6cc50d1099abff8500880
TECHNICAL_BASIS_HEAD: 28970fe78f0ad1a41a706d927aaeb92793e05552
PRE_RECOVERY_HEAD_OBSERVED: 11c44cf3cf4968928047848572595637b9ec169a
GROUNDING_EPOCH: GE-PR1457-003
CURRENT_STAGE: FINAL_EXACT_HEAD_EXECUTION_REOBSERVED
CURRENT_BLOCKER: scanner/falsifier/build/browser execution remains NOT_RUN because hosted jobs fail before step creation; merge authority not granted
HIGHEST_RISK: treating an artifact hash or scanner policy as release/security certification, or exposing matched proprietary/credential contents
EXACT_NEXT_ACTION: leave PR1457 draft/unmerged pending explicit Owner merge authorization; re-ground live main/head/diff/reviews immediately before any merge.
```

Recovery-only commits after `TECHNICAL_BASIS_HEAD` do not alter the engineering/security implementation. Read the current PR head from live GitHub metadata.

## 1. Defect isolated

The PR-H release harness built and hashed `dist/` but did not inspect the exact deployable bytes for controlled engineering source documents, source maps, key/credential containers, or high-confidence credential signatures. A deterministic artifact hash proves byte identity, not deployment suitability. Vite also copies the complete `public/` tree into `dist/`, so bundle-only inspection is insufficient.

## 2. Implemented gate

`scripts/emp1-professional-build-artifact-security-check.mjs` recursively scans the selected artifact tree (`dist/` by default) and fails closed on:

1. `WRC537_2013.pdf` basename;
2. `CAUx 2017 - WRC01f.pdf` basename;
3. exact WRC raw SHA-256 `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2` even if renamed;
4. exact CAUx raw SHA-256 `c1e92798a7bc172d649007ad88f6be548651f07a01cb2fbf83343e2283e0e83e` even if renamed;
5. `*.map` source maps;
6. `*.pem`, `*.key`, `*.p12`, `*.pfx` key/credential containers;
7. `.env`, `.env.*`, `.npmrc` credential configuration;
8. private-key PEM headers;
9. high-confidence GitHub PAT signatures;
10. high-confidence AWS access-key IDs;
11. deployable symlinks.

Diagnostics return deterministic violation code + relative deployable path only. Matched source/secret contents are never emitted.

The controlled source hashes are custody discriminators only; they do not grant redistribution or engineering authority.

## 3. Independent falsifier

`scripts/emp1-professional-build-artifact-security-falsifier.mjs` constructs temporary artifacts and requires:

- clean artifact PASS;
- both controlled basenames FAIL;
- live WRC bytes to reproduce the frozen WRC SHA-256 and fail after rename;
- live CAUx bytes to reproduce the frozen CAUx SHA-256 and fail after rename;
- source map/key container/`.env.production` FAIL;
- private-key header FAIL;
- synthetic GitHub PAT and AWS key FAIL without value echo;
- release ordering `PRODUCTION_BUILD -> BUILD_ARTIFACT_SECURITY -> BUILD_ARTIFACT_SECURITY_FALSIFIER -> EMP1_RELEASE_CHROMIUM`.

A repository source search found no obvious `AKIA`, `github_pat_`, `ghp_`, or private-key-header collision before technical freeze. This is source inspection, not an executed `dist/` scan.

## 4. Release integration

`scripts/emp1-professional-release-candidate.mjs` changes only the gate list by inserting:

```text
BUILD_ARTIFACT_SECURITY
BUILD_ARTIFACT_SECURITY_FALSIFIER
```

immediately after `PRODUCTION_BUILD` and before `EMP1_RELEASE_CHROMIUM`.

Existing exact build-artifact hashing and deployment-receipt binding remain unchanged. A clean scan is necessary release evidence but cannot independently qualify the candidate.

## 5. Exact scope

Technical:

1. `scripts/emp1-professional-build-artifact-security-check.mjs`
2. `scripts/emp1-professional-build-artifact-security-falsifier.mjs`
3. `scripts/emp1-professional-release-candidate.mjs`
4. `docs/emp1/EMP1_PROFESSIONAL_RELEASE_EVIDENCE.md`

Recovery:

5. `agents/PR1457_workreport.md`
6. `agents/status/PR1457.yaml`
7. `agents/claims/PR1457.yaml`

Protected/unmodified:

```text
src/core/emp1/**
WRC mechanics / route / registry
WRC source semantics / dataset / oracle / tolerances
controlled source PDF bytes
validation/emp1/wrc537-2013/**
CSP/security-header policy
dependency-vulnerability policy
runtime error-presentation policy
.github/workflows/**
```

## 6. Validation ledger

| ID | Status | Observation |
|---|---|---|
| ARTSEC-001 | PASS_SOURCE_INSPECTION | complete artifact recursive walk |
| ARTSEC-002 | PASS_SOURCE_INSPECTION | WRC/CAUx basename guards |
| ARTSEC-003 | PASS_SOURCE_INSPECTION | WRC/CAUx exact SHA-256 guards including renamed-copy falsifier design |
| ARTSEC-004 | PASS_SOURCE_INSPECTION | source maps and credential/key containers rejected |
| ARTSEC-005 | PASS_SOURCE_INSPECTION | PEM/GitHub/AWS signatures rejected |
| ARTSEC-006 | PASS_SOURCE_INSPECTION | diagnostics code/path only; matched value suppressed |
| ARTSEC-007 | PASS_SOURCE_INSPECTION | symlink rejection |
| ARTSEC-008 | PASS_SOURCE_INSPECTION | release harness post-build/pre-Chromium ordering |
| ARTSEC-009 | PASS_SOURCE_INSPECTION | artifact hash/deployment receipt chain preserved |
| ARTSEC-010 | PASS_SOURCE_INSPECTION | exact net scope remains seven paths |
| ARTSEC-011 | NOT_RUN | real `dist/` scanner execution unavailable |
| ARTSEC-012 | NOT_RUN | independent falsifier execution unavailable |
| ARTSEC-013 | NOT_RUN_EXECUTION_ENVIRONMENT | final-head-observed runEmp1 run `32947344631`, job `98110849057`: `steps=null`, `logs_url=null` |
| ARTSEC-014 | NOT_RUN_EXECUTION_ENVIRONMENT | final-head-observed gamma5 run `32947344620`, job `98110847342`: `steps=null`, `logs_url=null` |
| ARTSEC-015 | NOT_APPLICABLE | WRC numerical comparison; mechanics/expected values/tolerances unchanged |

Hosted classification: `NOT_RUN_EXECUTION_ENVIRONMENT / PRE_STEP_INFRASTRUCTURE_FAILURE`. No `NOT_RUN` is promoted to PASS or engineering FAIL.

## 7. Unqualified security scope

This PR does not qualify:

```text
CSP / security headers
dependency vulnerability review
runtime error-content leakage policy
general penetration testing
broader application security certification
```

Those remain separate PR-H obligations.

## 8. Authority boundary

Invariant:

`BUILD_ARTIFACT_SECURITY_CAN_REJECT_DEPLOYABLE_BYTES_BUT_CANNOT_CREATE_ENGINEERING_OR_RELEASE_AUTHORITY`

This PR grants none of engineering source authority, WRC method authority, runtime route authority, code compliance, release qualification, deployment authority, or broader security certification.

## 9. Appendix A — implementation takeover qualification

### A1 Production Trace — 20/20
Exact candidate -> release prerequisites -> production build -> complete deployable-artifact scanner -> independent scanner falsifier -> release Chromium -> deterministic artifact identity -> deployment evidence.

### A2 Failure Isolation — 20/20
The defect is post-build deployable-byte exposure, not WRC mechanics/source semantics/browser calculation. Violation classes isolate source name/hash, map/key/config class, secret signature and symlink conditions.

### A3 Authority / Invariant — 20/20
Artifact security rejects bytes only. No engineering, source, route, code, release or deployment authority is created.

### A4 Independent Validation — 19/20
The falsifier matrix covers both controlled-source hashes, credential/no-echo cases and harness ordering. Executable proof remains NOT_RUN because jobs fail before step allocation.

### A5 Minimal Patch — 20/20
Four technical files plus three recovery records; core/WRC/workflows/CSP/dependency policy remain untouched.

**Total: 99/100; minimum 19/20 — READY / OWNER MERGE AUTHORIZATION STILL REQUIRED.**
