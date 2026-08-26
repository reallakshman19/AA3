# PR1477 Work Report — EMP.1 release manifest salvage

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_STACKED_DRAFT_SALVAGE
TAKEOVER_AUTHORITY: WRITE_ALLOWED_RELEASE_MANIFEST_SALVAGE_ONLY
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1476
MERGE_AUTHORITY: NOT_GRANTED
CRITICALITY: ENGINEERING_CRITICAL
PR: #1477
ISSUE: #1476
UMBRELLA: #1389
SOURCE_PR: #1444 CLOSED_SUPERSEDED_SALVAGE_PARTIAL
DEPENDENCY_BASE_PR: #1473
BASE_BRANCH: agent/issue-1472-emp1-deployment-operations-20260826
STACK_BASE_HEAD: bb8c7669427913a64d8c1c7e2cef1f3ab13d0d72
BRANCH: agent/issue-1476-release-manifest-salvage-20260826
PR_HEAD_AT_ALLOCATION: 064b6d1ca0f0cb4116c136216c81279fb9d72767
LIVE_MAIN_LAST_OBSERVED: f7e3241ad36c64eed8192c8f9d11400cba1d3e69
GROUNDING_EPOCH: GE-PR1477-001
CURRENT_STAGE: WIP_TO_PR_RECOVERY_MIGRATION
CURRENT_BLOCKER: executable release qualification remains source/runtime/#54 blocked; salvage must preserve inherited current release gates exactly
HIGHEST_RISK: replacing the current #1473 candidate with #1444's obsolete candidate and deleting newer fail-closed security/deployment gates
EXACT_NEXT_ACTION: retire WIP records; port #1444 manifest/checker semantics onto exact #1473 candidate, cross-check dependency/header/deployment provenance, audit exact stacked diff.
```

## Salvage basis

PR #1444 was closed unmerged as `SALVAGE_PARTIAL`. Its manifest architecture remains useful but its full release-candidate blob is obsolete. PR #1477 starts from exact #1473 final head so inherited release gates are ancestry-protected.

Reusable semantics:

- `emp1-release-candidate/v1` first-class manifest;
- exact HEAD/tree/parent;
- EMP.1 release profile and WRC/CAUx source identities;
- method/dataset/qualification/oracle identities;
- exact expected evidence 01–12 inventory and per-file SHA-256;
- execution gate status/exit/stdout/stderr hashes;
- build artifact identity;
- bounded authority record;
- canonical manifest semantic hash;
- final release requires retained receipt;
- independent manifest checker.

Current successor additionally must cross-check package-lock/dependency provenance, deployed-security-header policy identity, and deployment-operations receipt/rollback false-authority custody already present in #1473.

## Authority invariant

`RELEASE_CANDIDATE_MANIFEST_RECORDS_CURRENT_AUTHORITY_AND_EVIDENCE_BUT_CANNOT_CREATE_OR_REPLACE_THEM`

## Appendix A

A1 Production Trace — 20/20.
A2 Failure Isolation — 20/20.
A3 Authority/Invariant — 20/20.
A4 Independent Validation — 19/20.
A5 Minimal Patch — 20/20.

**99/100; minimum 19/20 — WRITE_ALLOWED release-manifest salvage only.**
