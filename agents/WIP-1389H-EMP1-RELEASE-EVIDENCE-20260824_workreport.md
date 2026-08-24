# WIP-1389H — EMP.1 professional release evidence harness

## CURRENT RECOVERY STATE

```text
HANDOVER_READINESS: READY
WIP: WIP-1389H-EMP1-RELEASE-EVIDENCE-20260824
ISSUE: #1389 PR-H
BRANCH: agent/issue-1389-pr-h-release-evidence-20260824
BASE: main@0f85cac384532b5cc35bc24ecedd729275027eb6
GROUNDING_EPOCH: GE-H-001
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL_RELEASE_EVIDENCE
MUTATION_AUTHORITY: WRITE_ALLOWED_AFTER_APPENDIX_A
OVERLAP: SAFE_AGAINST_PR1401_RECOVERY_ONLY
CURRENT_STAGE: CLAIMED_BEFORE_PRODUCT_MUTATION
EXACT_NEXT_ACTION: allocate draft PR, migrate WIP records to PR-number records, then implement fail-closed release-candidate policy/execution harness without changing route/registry/release authority.
```

## Mission

Implement Issue #1389 PR-H as a deterministic release-evidence harness. The harness must be useful now in blocked state and later on an exact release candidate. It must distinguish policy-readiness from actual execution and must never declare deployment/release while PR-D/E/F or #54 remain unresolved.

Planned behavior:

- one machine-readable release-readiness contract tied to the frozen bounded profile;
- one Node policy checker that validates exact required gates and returns a blocked current state without granting authority;
- one release execution harness that runs the existing source/profile/product/replay checks, production build, and EMP.1 browser test on one exact working tree when execution is available;
- `--release` mode must fail closed until all mandatory evidence is present and every command actually executes successfully;
- no workflow mutation and no route/registry/qualification/tolerance/oracle mutation.

## Live truth

- current main after owner-merged PR-G #1403: `0f85cac384532b5cc35bc24ecedd729275027eb6`;
- PR-D #1401 remains open/draft with three recovery files only;
- #1401 exact-head files 01–10 remain NOT_GENERATED;
- production/global/code/release authority remains false;
- Issue #54 continues to produce hosted jobs with `steps=null` / `logs_url=null`;
- PR-G UI now exposes independent calculated/method-qualified/code/released states and eight-point limitations.

## Protected authority

No PR-H change may modify:

- `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js`;
- `src/core/emp1/emp1-c-bounded-route-registry.js`;
- WRC numerical/Table-5 code;
- frozen oracle/tolerance/qualification values;
- release-profile semantic definition;
- `.github/workflows/**`;
- code-compliance or deployment authority.

## Risks / decisions

- RISK-H-01: encoded checks mistaken for executed evidence. Control: every gate records `PASS|FAIL|NOT_RUN`; policy checker cannot fabricate execution receipts.
- RISK-H-02: release harness passes while PR-D/E/F evidence is absent. Control: explicit mandatory artifact/state checks and `--release` exit 2 while blocked.
- RISK-H-03: build/browser command presence mistaken for successful execution. Control: release execution receipt must retain command, exit code and stdout/stderr identity.
- RISK-H-04: security validation is vague. Decision: minimum release security gate covers strict JSON/currentness boundaries and no UI-authored authority; no claim of broader application security certification.
- DEC-H-01: PR-H may merge while blocked if it only adds the fail-closed harness; it cannot declare professional deployment.
- DEC-H-02: no workflow file will be changed merely to work around #54.

## Planned changed-file boundary

- `validation/emp1/release/emp1-professional-release-readiness-v1.json`
- `scripts/emp1-professional-release-readiness-check.mjs`
- `scripts/emp1-professional-release-candidate.mjs`
- `package.json` — add explicit policy/release commands only
- `docs/emp1/EMP1_PROFESSIONAL_RELEASE_EVIDENCE.md`
- PR recovery records

## Validation ledger

| ID | Status | Observation | Oracle |
|---|---|---|---|
| H-001 | PASS | main grounded at 0f85cac... | GITHUB_INSPECTION |
| H-002 | PASS | #1401 is recovery-only and authority-blocked | GITHUB_INSPECTION |
| H-003 | PASS | PR-H files are disjoint from #1401 | SOURCE_INSPECTION |
| H-004 | NOT_RUN | release policy checker | NOT_OBSERVED |
| H-005 | NOT_RUN | release candidate execution harness | NOT_OBSERVED |
| H-006 | NOT_RUN | build/browser exact-head execution | NOT_OBSERVED |

## Appendix A — implementation authorization

### A1 Production trace — 20/20
Release authority is downstream of source custody, P0 semantics, gamma5 independent oracle, exact-head PR-D evidence, bounded authorization, post-promotion evidence, product checks, build/browser/replay and release profile. PR-H must only aggregate/execute these gates.

### A2 Current failure isolation — 20/20
The current hard blocker is execution/evidence: #1401 lacks generated 01–10 and #54 prevents real hosted steps. PR-H cannot repair this by editing authority booleans or writing synthetic receipts.

### A3 Authority / invariant — 20/20
Current route/registry/global/code/release booleans remain false. The harness may test them, never change them.

### A4 Independent validation — 19/20
Policy/readiness logic can be source-inspected and run when a checkout is available; actual build/browser/release evidence is currently NOT_RUN because the execution environment remains blocked.

### A5 Minimal patch — 20/20
One declarative readiness contract, one policy checker, one execution harness, package commands, documentation, recovery records. No production numerical or authority mutation.

**Total: 99/100; minimum 19/20 — WRITE_ALLOWED.**
