# WIP Issue 1463 Work Report — EMP.1 dependency security

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: WIP_ALLOCATED_STACKED_ON_PR1457
TAKEOVER_AUTHORITY: WRITE_ALLOWED_DEPENDENCY_SECURITY_ONLY
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1463
MERGE_AUTHORITY: NOT_GRANTED
CRITICALITY: ENGINEERING_CRITICAL
ISSUE: #1463
UMBRELLA: #1389
DEPENDENCY_BASE_PR: #1457
BRANCH: agent/issue-1463-emp1-dependency-security-20260826
STACK_BASE_HEAD: f2462a7a09e7a4a0bc36a398095efdd796c98a4a
LIVE_MAIN_LAST_OBSERVED: dd7f13e2c73e596c7ac6625fbe211779bc61ce94
GROUNDING_EPOCH: GE-WIP1463-001
CURRENT_STAGE: WIP_ALLOCATION
CURRENT_BLOCKER: live npm advisory execution requires npm registry/advisory connectivity; hosted execution may remain NOT_RUN under #54
HIGHEST_RISK: converting deterministic lock custody or an unexecuted advisory command into a vulnerability-free/release-safe claim
EXACT_NEXT_ACTION: allocate stacked draft PR on PR1457 branch; migrate WIP records; implement lock-custody checker, advisory gate, falsifiers, candidate provenance binding and PR-H documentation.
```

## Authority / overlap

This work is intentionally stacked on open PR #1457 because #1457 already owns `scripts/emp1-professional-release-candidate.mjs` and `docs/emp1/EMP1_PROFESSIONAL_RELEASE_EVIDENCE.md`.

No package version change is authorized. No workflow YAML change is authorized. Dependency security may block release but cannot create engineering, code-compliance, release or deployment authority.

## Intended technical scope

1. `scripts/emp1-professional-dependency-lock-check.mjs`
2. `scripts/emp1-professional-dependency-lock-falsifier.mjs`
3. `scripts/emp1-professional-dependency-advisory-check.mjs`
4. `scripts/emp1-professional-dependency-advisory-falsifier.mjs`
5. `scripts/emp1-professional-release-candidate.mjs`
6. `docs/emp1/EMP1_PROFESSIONAL_RELEASE_EVIDENCE.md`

Recovery after PR allocation:
7. `agents/PR<NUMBER>_workreport.md`
8. `agents/status/PR<NUMBER>.yaml`
9. `agents/claims/PR<NUMBER>.yaml`

## Appendix A — takeover qualification

A1 Production Trace — 20/20: `package.json` + `package-lock.json` -> deterministic custody checker -> live npm advisory gate -> existing exact-candidate release harness -> retained execution hashes/receipt.

A2 Failure Isolation — 20/20: distinguishes malformed/drifted/insecure lock custody (deterministic FAIL), high/critical advisory findings (executed FAIL), and missing npm/network/advisory execution (NOT_RUN).

A3 Authority/Invariant — 20/20: dependency security can block release only; no package upgrade, WRC authority, code compliance, release or deployment authority is created.

A4 Independent Validation — 19/20: falsifiers cover manifest/lock drift, missing direct lock entry, missing integrity/insecure source and forged advisory classifications; live advisory execution may remain NOT_RUN under #54/environment.

A5 Minimal Patch / Next Commit — 20/20: four bounded security scripts + existing candidate/doc + three recovery files; no workflow/package-version mutation.

**Score: 99/100; minimum 19/20 — WRITE_ALLOWED dependency security only.**
