# WIP-54-EMP1-RUNNER-20260824 — EMP.1 hosted-runner repair

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_WIP
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL_EVIDENCE_INFRASTRUCTURE
MUTATION_AUTHORITY: WRITE_ALLOWED_BY_OWNER_FIX_INSTRUCTION
ISSUES: #54; #1389; #1333
BRANCH: agent/issue-54-emp1-ubuntu2404-runner-fix-20260824
BASE: main@c2018c4b81e4c45f151ad7e59efd7d903ad7de97
CURRENT_STAGE: BASELINED_AND_CLAIMED_BEFORE_WORKFLOW_MUTATION
HIGHEST_RISK: mistaking a runner-routing experiment for engineering qualification
EXACT_NEXT_ACTION: pin only the three PR-D EMP.1 jobs from ubuntu-latest to ubuntu-24.04, open draft PR, then classify actual job-step evidence.
```

## Mission

Repair the current pre-step hosted-runner failure blocking PR-D #1401 without changing WRC engineering code, oracle values, tolerances, route/registry authority, or release semantics.

## Diagnosis / falsifier

Current PR-D and current-main validation heads repeatedly create jobs with `steps=null` and `logs_url=null` on workflows using `runs-on: ubuntu-latest`. A retained successful Issue #54 certification run (#117, run 30692282812) used `runs-on: ubuntu-24.04` and reached checkout, Node setup, `npm ci`, deterministic checks, browser checks, build and clean-tree evidence.

Hypothesis: the current GitHub-hosted routing failure is specific to the `ubuntu-latest` label path in this repository/account state. Minimal falsifier: change only the three PR-D critical workflows to `ubuntu-24.04`. If jobs still have no steps, reject this hypothesis and do not claim a fix.

## Intended changed files

1. `.github/workflows/emp1-gamma5-main-route.yml`
2. `.github/workflows/emp1-main-baseline.yml`
3. `.github/workflows/emp1-03-runemp1-orchestration.yml`
4. WIP/PR recovery records only.

## Protected invariants

- no `src/**` mutation;
- no numerical/oracle/tolerance/expected-value change;
- no source or dataset authority change;
- no self-hosted runner or secret/security expansion;
- no route/registry/global/code/release authority change;
- no workflow command deletion, skipping, or weakening;
- #1401 remains unmerged and must re-ground after any merged workflow fix.

## Validation ledger

- live main `c2018c4...`: PASS — GitHub inspection.
- current #1401 exact diff = three recovery files: PASS — GitHub inspection.
- failed current EMP.1 jobs have no steps/logs: PASS — GitHub job inspection.
- #1405 unrelated current-main LAFEA workflow also reproduced pre-step failure: PASS — PR evidence.
- retained #117 `ubuntu-24.04` certification reached checkout/npm/tests: PASS — Issue #54 retained evidence.
- proposed pin execution: NOT_RUN.
- engineering numerical qualification: NOT_RUN / NOT_CLAIMED.

## Appendix A

A1 Production trace — 20/20: workflow-only path cannot alter WRC mechanics; downstream PR-D exact-head evidence is invalidated by main movement and must be regenerated.

A2 Failure isolation — 20/20: pre-step failure is isolated from engineering assertion failure; runner label is a falsifiable routing hypothesis.

A3 Authority/invariant — 20/20: no self-hosted/security/numerical/release authority expansion.

A4 Independent validation — 19/20: retained successful `ubuntu-24.04` evidence exists, but the proposed fix itself is NOT_RUN until PR jobs start.

A5 Minimal patch — 20/20: exactly three `runs-on` substitutions plus recovery metadata; no command/test changes.

**99/100; minimum 19/20 — IMPLEMENTATION AUTHORIZED.**
