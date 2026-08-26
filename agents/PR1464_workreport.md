# PR1464 Work Report — EMP.1 dependency security + absorbed deployed-header child

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_STACKED_DRAFT_CHILD_PR1470_ABSORBED
TAKEOVER_AUTHORITY: WRITE_ALLOWED_STACK_RECONCILIATION_ONLY
EXECUTION_MODE: AUTO
AUTO_STATE: COMPLETE
SCOPE_AUTHORITY: ISSUE_1463_WITH_MERGED_CHILD_1466_CUSTODY
MERGE_AUTHORITY: NOT_GRANTED
CRITICALITY: ENGINEERING_CRITICAL
PR: #1464
ISSUE: #1463
UMBRELLA: #1389
DEPENDENCY_BASE_PR: #1457
BASE_BRANCH: agent/issue-1456-emp1-build-artifact-security-20260826
STACK_BASE_HEAD: f2462a7a09e7a4a0bc36a398095efdd796c98a4a
BRANCH: agent/issue-1463-emp1-dependency-security-20260826
DEPENDENCY_TECHNICAL_BASIS: c44c8444a1e2961b9b548386f2cfd8dc2776e472
ABSORBED_CHILD_PR: #1470
ABSORBED_CHILD_MERGE_SHA: 9f73e0fc8c5db06cec137fb0041190596ae4acf3
PRE_RECOVERY_HEAD: 9f73e0fc8c5db06cec137fb0041190596ae4acf3
LIVE_MAIN_LAST_OBSERVED: f15bab4af0009888f41b856f820cb3ab7a152520
GROUNDING_EPOCH: GE-PR1464-003
CURRENT_STAGE: CHILD_STACK_ABSORPTION_RECONCILED
CURRENT_BLOCKER: upstream PR1457 remains unmerged and current main has advanced independently; live advisory/build/browser/deployed-header evidence remain NOT_RUN
HIGHEST_RISK: treating the wider effective PR1464 diff as if #1463 itself granted CSP/header authority, or treating encoded security gates as executed release evidence
EXACT_NEXT_ACTION: leave PR1464 draft/unmerged; re-ground PR1457 against current main before any future stack merge decision.
```

## Stack topology

PR1470 was explicitly owner-authorized and squash-merged **into this PR1464 branch**, not into `main`. Therefore PR1464 now carries two bounded child domains:

1. original #1463 dependency lock/advisory security; and
2. absorbed #1466 deployed CSP/security-header observation from merged PR1470.

The #1463 authority boundary is not widened by carrying #1466 content. Each child keeps its own invariant.

## Original #1463 dependency-security invariant

`DEPENDENCY_SECURITY_CAN_BLOCK_RELEASE_BUT_CANNOT_CREATE_ENGINEERING_OR_RELEASE_AUTHORITY`

Implemented dependency controls remain unchanged:

- npm lockfile v3 custody/integrity checker + falsifiers;
- live `npm audit --package-lock-only --json --audit-level=high` gate;
- environment/service failure = `NOT_RUN_EXECUTION_ENVIRONMENT`;
- high/critical findings = FAIL;
- exact `package-lock.json` SHA-256 bound into candidate receipt;
- fixture audit cannot establish live advisory authority;
- no package version changes or vulnerability-free claim.

## Absorbed #1466 deployed-header invariant

`DEPLOYED_SECURITY_HEADERS_CAN_BLOCK_RELEASE_BUT_CANNOT_CREATE_ENGINEERING_RELEASE_OR_BROWSER_COMPATIBILITY_AUTHORITY`

Merged child #1470 contributes:

- provider-neutral CSP/security-header policy;
- live same-origin HTTPS deployed-header observer after deployment-receipt verification;
- bounded `nosniff`, Referrer-Policy and Permissions-Policy;
- network/TLS/DNS failure = NOT_RUN;
- category-only/non-echo diagnostics;
- no HTML/meta-CSP or provider configuration;
- no browser-compatibility claim from static policy/fixture PASS.

## Effective release sequence

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
DEPLOYMENT_EVIDENCE
DEPLOYMENT_SECURITY_HEADERS
```

All gates can reject release; none grants WRC engineering authority, code compliance or professional release by itself.

## Changed-file ledger — current effective PR1464 diff

Exact compare before this recovery write:

```text
base   = f2462a7a09e7a4a0bc36a398095efdd796c98a4a
head   = 9f73e0fc8c5db06cec137fb0041190596ae4acf3
status = 22 ahead / 0 behind
files  = exactly 16
reviews = 0
threads = 0
```

16 paths:

1. `agents/PR1464_workreport.md`
2. `agents/status/PR1464.yaml`
3. `agents/claims/PR1464.yaml`
4. `agents/PR1470_workreport.md`
5. `agents/status/PR1470.yaml`
6. `agents/claims/PR1470.yaml`
7. `docs/emp1/EMP1_PROFESSIONAL_RELEASE_EVIDENCE.md`
8. `docs/emp1/EMP1_PROFESSIONAL_DEPLOYED_SECURITY_HEADERS.md`
9. `scripts/emp1-professional-dependency-lock-check.mjs`
10. `scripts/emp1-professional-dependency-lock-falsifier.mjs`
11. `scripts/emp1-professional-dependency-advisory-check.mjs`
12. `scripts/emp1-professional-dependency-advisory-falsifier.mjs`
13. `scripts/emp1-professional-security-header-policy.mjs`
14. `scripts/emp1-professional-deployment-security-headers-check.mjs`
15. `scripts/emp1-professional-deployment-security-headers-falsifier.mjs`
16. `scripts/emp1-professional-release-candidate.mjs`

Protected unchanged across this effective stack: `package.json`, `package-lock.json`, `index.html`, `analyze.html`, provider-specific deployment config, `src/core/emp1/**`, WRC mechanics/source/dataset/oracle/tolerance and `.github/workflows/**`.

## Validation truth

- dependency-security source/diff validation: PASS from prior GE-PR1464-002;
- deployed-header child source/diff validation: PASS from PR1470 merge gate;
- combined effective diff/reviews/threads: PASS source inspection, 16 files, 0/0;
- post-child-merge hosted workflows on `9f73e0fc...`: only queued/non-engineering-relevant jobs observed at this recovery point; no new executable PASS claimed;
- live dependency advisory: NOT_RUN;
- build/browser/deployed-header observation: NOT_RUN;
- WRC numerical comparison: NOT_APPLICABLE.

No `NOT_RUN` is promoted to PASS.

## Authority boundary

```text
dependency security can block release        = true
deployed-header security can block release   = true
vulnerability-free claim                     = false
browser compatibility from static CSP        = false
engineering authority granted                = false
code compliance granted                      = false
release authority granted                    = false
deployment authority granted                 = false
```

## Appendix A

A1 Production Trace — 20/20.
A2 Failure Isolation — 20/20.
A3 Authority/Invariant — 20/20.
A4 Independent Validation — 19/20; real live advisory/build/browser/deployment/header execution remains NOT_RUN.
A5 Minimal Patch/Next Commit — 20/20; this epoch changes recovery records only after child absorption.

**99/100; minimum 19/20.**
