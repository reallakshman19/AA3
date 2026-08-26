# PR1464 Work Report — EMP.1 dependency security

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_STACKED_DRAFT
TAKEOVER_AUTHORITY: WRITE_ALLOWED_DEPENDENCY_SECURITY_ONLY
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
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
PR_HEAD_AT_ALLOCATION: 0733cde1d296338da35d540a9ee6a0122adbb4a2
LIVE_MAIN_LAST_OBSERVED: dd7f13e2c73e596c7ac6625fbe211779bc61ce94
GROUNDING_EPOCH: GE-PR1464-001
CURRENT_STAGE: WIP_TO_PR_RECOVERY_MIGRATION
CURRENT_BLOCKER: live npm advisory execution requires npm/advisory connectivity; hosted execution may remain NOT_RUN under #54
HIGHEST_RISK: converting lock custody or unexecuted advisory tooling into a vulnerability-free/release-safe claim
EXACT_NEXT_ACTION: retire WIP records; implement deterministic lock custody, independent falsifiers, live advisory classification, candidate provenance binding and PR-H documentation.
```

## Grounded dependency basis

- package manager: npm
- `package-lock.json`: present
- lockfileVersion: 3
- `package.json`: semver ranges retained
- exact resolved dependency graph: lockfile custody
- no dependency/package version mutation authorized in this PR

## Intended technical scope

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

## Authority boundary

`DEPENDENCY_SECURITY_CAN_BLOCK_RELEASE_BUT_CANNOT_CREATE_ENGINEERING_OR_RELEASE_AUTHORITY`

A deterministic lock check can establish exact dependency custody; it cannot establish current vulnerability status. A live npm advisory command may establish bounded advisory evidence only when it actually executes and its result is parsed. Tool/network/advisory launch failure is NOT_RUN, never PASS. High/critical advisory findings are FAIL. No package version will be changed merely to make a gate green.

## Appendix A

A1 Production Trace — 20/20: package manifest/lock -> deterministic custody -> live npm advisory -> existing release candidate -> retained execution/provenance receipt.

A2 Failure Isolation — 20/20: deterministic custody FAIL is distinct from advisory finding FAIL and advisory/tool environment NOT_RUN.

A3 Authority/Invariant — 20/20: dependency security only blocks; it cannot authorize WRC, code compliance, professional release or deployment.

A4 Independent Validation — 19/20: falsifiers cover manifest drift, absent lock entry, missing integrity, insecure source and forged advisory result; actual advisory execution may remain unavailable under #54/environment.

A5 Minimal Patch — 20/20: four security scripts + two inherited PR-H paths + three recovery records; no package/workflow mutation.

**99/100; minimum 19/20 — WRITE_ALLOWED dependency security only.**
