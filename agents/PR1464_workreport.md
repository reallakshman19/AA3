# PR1464 Work Report — EMP.1 dependency security

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_STACKED_DRAFT_COMPLETE
TAKEOVER_AUTHORITY: WRITE_ALLOWED_DEPENDENCY_SECURITY_ONLY
EXECUTION_MODE: AUTO
AUTO_STATE: COMPLETE
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1463
MERGE_AUTHORITY: NOT_GRANTED
CRITICALITY: ENGINEERING_CRITICAL
PR: #1464
ISSUE: #1463
UMBRELLA: #1389
DEPENDENCY_BASE_PR: #1457
BASE_BRANCH: agent/issue-1456-emp1-build-artifact-security-20260826
STACK_BASE_HEAD: f2462a7a09e7a4a0bc36a398095efdd796c98a4a
BRANCH: agent/issue-1463-emp1-dependency-security-20260826
TECHNICAL_BASIS_HEAD: c44c8444a1e2961b9b548386f2cfd8dc2776e472
LIVE_MAIN_LAST_OBSERVED: dd7f13e2c73e596c7ac6625fbe211779bc61ce94
GROUNDING_EPOCH: GE-PR1464-002
CURRENT_STAGE: TECHNICAL_IMPLEMENTATION_AND_SOURCE_AUDIT_COMPLETE
CURRENT_BLOCKER: live advisory/build/browser execution remains NOT_RUN under current execution environment/#54; PR is stacked on open PR1457
HIGHEST_RISK: converting deterministic lock custody, fixture classification, or an unexecuted advisory service into a vulnerability-free/release-safe claim
EXACT_NEXT_ACTION: leave PR1464 draft/unmerged; if PR1457 changes or merges, re-ground this stacked PR before any merge decision.
```

## Implemented bounded result

The repository uses npm and `package-lock.json` lockfileVersion 3. PR1464 adds two distinct security authorities and does not collapse them:

1. **Deterministic lock custody** — offline exact inspection of `package.json` + `package-lock.json`.
2. **Live advisory status** — time-dependent `npm audit --package-lock-only --json --audit-level=high` execution.

The lock checker requires root manifest/lock alignment, direct lock entries, HTTPS resolved package sources and integrity metadata, and retains the exact raw lockfile SHA-256. It explicitly does **not** establish vulnerability status.

The advisory checker classifies:

- high/critical finding -> `FAIL`;
- valid live audit with zero high/critical -> `PASS` for the bounded advisory observation only;
- npm tool / registry / DNS / network / auth / certificate execution failure -> `NOT_RUN_EXECUTION_ENVIRONMENT`;
- malformed or forged advisory output without an execution-environment signature -> `FAIL`.

Fixture mode exists only for classifier falsification and cannot establish `liveAdvisoryStatusEstablished=true`.

## Release-candidate integration

The existing stacked PR-H candidate sequence is extended to:

```text
CURRENTNESS_REPLAY_FALSIFIERS
DEPENDENCY_LOCK_CUSTODY
DEPENDENCY_LOCK_CUSTODY_FALSIFIER
DEPENDENCY_ADVISORY
DEPENDENCY_ADVISORY_FALSIFIER
PRODUCTION_BUILD
BUILD_ARTIFACT_SECURITY
BUILD_ARTIFACT_SECURITY_FALSIFIER
EMP1_RELEASE_CHROMIUM
```

Every candidate receipt now binds the exact raw `package-lock.json` SHA-256. Dependency security can block release, but cannot create engineering, code-compliance, release or deployment authority. The harness explicitly forbids a vulnerability-free claim.

## Changed-file ledger — exact stacked scope

Technical:

1. `scripts/emp1-professional-dependency-lock-check.mjs`
2. `scripts/emp1-professional-dependency-lock-falsifier.mjs`
3. `scripts/emp1-professional-dependency-advisory-check.mjs`
4. `scripts/emp1-professional-dependency-advisory-falsifier.mjs`
5. `scripts/emp1-professional-release-candidate.mjs`
6. `docs/emp1/EMP1_PROFESSIONAL_RELEASE_EVIDENCE.md`

Recovery:

7. `agents/PR1464_workreport.md`
8. `agents/status/PR1464.yaml`
9. `agents/claims/PR1464.yaml`

Explicitly unchanged: `package.json`, `package-lock.json`, `src/core/emp1/**`, WRC mechanics/source/dataset/oracle/tolerances, CSP/security-header policy and `.github/workflows/**`.

## Validation ledger

- stacked compare `f2462a7a... -> c44c8444...`: PASS source/diff inspection, 18 ahead / 0 behind, exactly 9 files.
- PR reviews: PASS inspection, 0.
- PR review threads: PASS inspection, 0.
- npm/lock basis: PASS source inspection (`package-lock.json`, lockfileVersion 3).
- dependency lock checker/falsifier: ENCODED / source-audited; executable run `NOT_RUN`.
- dependency advisory checker/falsifier: ENCODED / source-audited; live advisory execution `NOT_RUN`.
- candidate sequence + lock-SHA binding: PASS source inspection.
- runEmp1 hosted run `32965376644`, job `98166594638`: `steps=null`, `logs_url=null` -> `NOT_RUN_EXECUTION_ENVIRONMENT / PRE_STEP_INFRASTRUCTURE_FAILURE`.
- gamma5 hosted run `32965376667`, job `98166594644`: `steps=null`, `logs_url=null` -> same classification.
- WRC numerical comparison: `NOT_APPLICABLE`; mechanics/expected values/tolerances unchanged.

No executable PASS is claimed for the new dependency gates and no hosted pre-step failure is represented as an engineering FAIL.

## Authority boundary

`DEPENDENCY_SECURITY_CAN_BLOCK_RELEASE_BUT_CANNOT_CREATE_ENGINEERING_OR_RELEASE_AUTHORITY`

No dependency/package version was changed to make the gate green. Any actual advisory finding requires a separate remediation decision.

## Appendix A

A1 Production Trace — 20/20: package manifest/lock -> deterministic custody -> live npm advisory -> existing release candidate -> retained execution/provenance receipt.

A2 Failure Isolation — 20/20: deterministic custody FAIL is distinct from advisory finding FAIL and advisory/tool/network environment NOT_RUN.

A3 Authority/Invariant — 20/20: dependency security only blocks; it cannot authorize WRC, code compliance, professional release or deployment.

A4 Independent Validation — 19/20: falsifiers cover manifest drift, absent lock entry, missing integrity, insecure source, forged advisory result, release ordering, lock-SHA receipt binding and advisory exit-3 NOT_RUN handling; actual live advisory execution remains unavailable.

A5 Minimal Patch — 20/20: four security scripts + two inherited PR-H paths + three recovery records; no package/workflow mutation.

**99/100; minimum 19/20 — READY / dependency-security scope only.**
