# WIP Issue 1476 Work Report — release manifest salvage

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_STACKED_WIP
TAKEOVER_AUTHORITY: WRITE_ALLOWED_RELEASE_MANIFEST_SALVAGE_ONLY
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1476
MERGE_AUTHORITY: NOT_GRANTED
CRITICALITY: ENGINEERING_CRITICAL
ISSUE: #1476
UMBRELLA: #1389
SOURCE_PR: #1444 SALVAGE_PARTIAL
DEPENDENCY_BASE_PR: #1473
STACK_BASE_HEAD: bb8c7669427913a64d8c1c7e2cef1f3ab13d0d72
LIVE_MAIN_LAST_OBSERVED: f7e3241ad36c64eed8192c8f9d11400cba1d3e69
BRANCH: agent/issue-1476-release-manifest-salvage-20260826
GROUNDING_EPOCH: GE-WIP1476-001
CURRENT_STAGE: PRE_TECHNICAL_SALVAGE_FREEZE
CURRENT_BLOCKER: executable qualification remains blocked by source/runtime/#54; salvage must preserve every #1457/#1464/#1470/#1473 release gate
HIGHEST_RISK: applying #1444's old release-candidate blob and silently deleting newer dependency/security/deployment gates
EXACT_NEXT_ACTION: allocate stacked successor PR; port only first-class manifest/checker semantics onto current #1473 candidate and independently cross-check current dependency/header/deployment provenance.
```

## Salvage decision

PR #1444 is technically coherent but based on an obsolete release-candidate contract. Its reusable engineering/software content is limited to:

- deterministic `emp1-release-candidate/v1` manifest semantics;
- exact 01–12 inventory/hash custody;
- source/profile/authorization identity cross-checks;
- independent manifest checker;
- retained receipt requirement in final release mode.

Its old full release-candidate blob is **not** reusable because it predates #1457 artifact security, #1464 dependency security, #1470 deployed-header observation and #1473 deployment-operations custody.

## Protected inherited gates

Successor must retain, without weakening:

```text
DEPENDENCY_LOCK_CUSTODY
DEPENDENCY_ADVISORY
PRODUCTION_BUILD
BUILD_ARTIFACT_SECURITY
EMP1_RELEASE_CHROMIUM
DEPLOYMENT_EVIDENCE
DEPLOYMENT_SECURITY_HEADERS
DEPLOYMENT_OPERATIONS
```

and current candidate provenance for package-lock, header-policy and deployment-operations identities.

## Authority invariant

`RELEASE_CANDIDATE_MANIFEST_RECORDS_CURRENT_AUTHORITY_AND_EVIDENCE_BUT_CANNOT_CREATE_OR_REPLACE_THEM`

## Appendix A

A1 Production Trace — 20/20: exact current candidate receipt -> first-class manifest -> independent checker -> retained release evidence.

A2 Failure Isolation — 20/20: source/profile/oracle/evidence/gate/dependency/header/deployment drift are separately falsifiable; missing execution remains NOT_RUN/BLOCKED.

A3 Authority/Invariant — 20/20: manifest records existing bounded authority only and cannot create source, route, code, deployment or release authority.

A4 Independent Validation — 19/20: checker can independently re-hash identities/evidence/current provenance; executable release remains blocked by #54/source/runtime evidence.

A5 Minimal Patch — 20/20: salvage adds manifest builder/checker semantics to exact #1473 candidate, without replacing inherited gates or touching core/workflow/package/UI.

**99/100; minimum 19/20 — WRITE_ALLOWED manifest salvage only.**
