# PR1406 — EMP.1 Ubuntu 24.04 runner routing repair

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL_EVIDENCE_INFRASTRUCTURE
MUTATION_AUTHORITY: WRITE_ALLOWED_BY_OWNER_FIX_INSTRUCTION
MERGE_AUTHORITY: OWNER_ONLY
PR: #1406
ISSUES: #54; #1389; #1333
BRANCH: agent/issue-54-emp1-ubuntu2404-runner-fix-20260824
BASE: main@c2018c4b81e4c45f151ad7e59efd7d903ad7de97
CURRENT_STAGE: RUNNER_PIN_IMPLEMENTED_AWAITING_EXACT_HEAD_EXECUTION
HIGHEST_RISK: mistaking step creation or a routing experiment for engineering qualification
EXACT_NEXT_ACTION: complete WIP->PR recovery migration, then inspect exact-head workflow jobs; PASS only if real steps execute and the engineering commands themselves pass.
```

## Mission and diagnosis

Repair the current PR-D exact-head hosted execution blocker without changing WRC mechanics or engineering authority.

Current critical EMP.1 workflows repeatedly produced GitHub jobs with `steps=null` and `logs_url=null` under `runs-on: ubuntu-latest`. Retained Issue #54 PR #117 evidence used explicit `ubuntu-24.04` and reached checkout, Node, `npm ci`, deterministic checks, browser, build and clean-tree execution. Current unrelated PR #1405 showed the same pre-step symptom on `ubuntu-latest`, so the defect is not EMP.1 numerical code.

Hypothesis: current hosted routing for the mutable `ubuntu-latest` label is failing in this repository/account state. Minimal falsifier: pin only the three PR-D-critical jobs to `ubuntu-24.04`.

## Implemented patch

Exactly these semantic substitutions:

```text
.github/workflows/emp1-gamma5-main-route.yml          ubuntu-latest -> ubuntu-24.04
.github/workflows/emp1-main-baseline.yml              ubuntu-latest -> ubuntu-24.04
.github/workflows/emp1-03-runemp1-orchestration.yml   ubuntu-latest -> ubuntu-24.04
```

No workflow command, trigger, permission, artifact behavior, expected value, tolerance, oracle, production code, route/registry or release authority changed. No self-hosted runner or secret/security expansion was introduced.

## Coordination

PR #1401 does not write these files but explicitly protects workflow mutation inside PR-D. This separate PR preserves that boundary. If #1406 merges, PR #1401 must re-ground to the resulting exact `main` before generating 01–10.

## Validation ledger

| Check | Status | Basis |
|---|---|---|
| main grounding | PASS | live GitHub main `c2018c4...` |
| #1401 exact-file overlap | PASS_NO_WRITE_OVERLAP | #1401 changes recovery files only |
| prior current EMP.1 pre-step failure | PASS_OBSERVED | steps/logs absent |
| unrelated #1405 current-main pre-step reproduction | PASS_OBSERVED | LAFEA job steps/logs absent |
| retained explicit ubuntu-24.04 executable precedent | PASS_RETAINED | #117 / run 30692282812 |
| patch scope = three runner labels only | PASS_SOURCE_INSPECTION | diff audit pending final head |
| exact-head job step creation | NOT_RUN / pending |
| engineering commands | NOT_RUN |
| numerical qualification | NOT_RUN / NOT_CLAIMED |

## Authority invariants

All remain false/unmodified:
- bounded production route authorization;
- registry registration / engineering-use authorization;
- global EMP.1.C authority;
- code compliance;
- release qualification.

## Appendix A

A1 Production trace — 20/20. Runner routing is upstream of checkout and cannot itself alter WRC numerics; any merge invalidates PR-D's former exact target.

A2 Failure isolation — 20/20. Pre-step failure is separated from engineering assertion failure; the runner label is an explicit falsifiable hypothesis.

A3 Authority/invariant — 20/20. No self-hosted/security/numerical/source/release authority expansion.

A4 Independent validation — 19/20. Retained explicit-24.04 executable precedent exists; this PR's exact-head execution is still pending.

A5 Minimal patch — 20/20. Exactly three `runs-on` substitutions plus recovery metadata.

**99/100; minimum 19/20 — HANDOVER_READY.**

## Historical

WIP authority: `WIP-54-EMP1-RUNNER-20260824`; superseded by PR #1406 after allocation.
