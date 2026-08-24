# PR1406 — EMP.1 Ubuntu 24.04 runner routing repair

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: ABANDON_REJECTED_HYPOTHESIS
WORK_INTENT: IMPLEMENT -> INVESTIGATION_COMPLETE
CRITICALITY: ENGINEERING_CRITICAL_EVIDENCE_INFRASTRUCTURE
MUTATION_AUTHORITY: WRITE_ALLOWED_BY_OWNER_FIX_INSTRUCTION
MERGE_AUTHORITY: OWNER_ONLY
PR: #1406
ISSUES: #54; #1389; #1333
BRANCH: agent/issue-54-emp1-ubuntu2404-runner-fix-20260824
BASE: main@c2018c4b81e4c45f151ad7e59efd7d903ad7de97
FALSIFIER_HEAD: a5b22d2d068164be785f30151ef0b2da1f6a5de8
CURRENT_STAGE: HYPOTHESIS_REJECTED_DO_NOT_MERGE
HIGHEST_RISK: merging a falsified CI workaround or representing step creation as engineering qualification
EXACT_NEXT_ACTION: close PR1406 unmerged; keep main unchanged; pursue account/runner capacity or another independently justified execution transport. Do not modify PR-D numerical authority.
```

## Mission and diagnosis

PR1406 tested one surgical hypothesis for the current PR-D hosted execution blocker without changing WRC mechanics or engineering authority.

Current critical EMP.1 workflows repeatedly produced GitHub jobs with `steps=null` and `logs_url=null` under `runs-on: ubuntu-latest`. Retained Issue #54 PR #117 evidence had previously used explicit `ubuntu-24.04` and reached checkout, Node, `npm ci`, deterministic checks, browser, build and clean-tree execution. Current unrelated PR #1405 also reproduced the pre-step symptom, proving the recurrence is not EMP.1 numerical code.

Hypothesis tested: current routing for the mutable `ubuntu-latest` label was the cause. Falsifier: pin only the three PR-D-critical jobs to explicit `ubuntu-24.04` and require real step creation.

## Implemented experiment

Exactly these semantic substitutions were made on the disposable branch:

```text
.github/workflows/emp1-gamma5-main-route.yml          ubuntu-latest -> ubuntu-24.04
.github/workflows/emp1-main-baseline.yml              ubuntu-latest -> ubuntu-24.04
.github/workflows/emp1-03-runemp1-orchestration.yml   ubuntu-latest -> ubuntu-24.04
```

No workflow command, trigger, permission, artifact behavior, expected value, tolerance, oracle, production code, route/registry or release authority changed. No self-hosted runner or secret/security expansion was introduced.

## Falsifier result — REJECTED

Exact PR1406 head `a5b22d2d068164be785f30151ef0b2da1f6a5de8` produced:

```text
32717605012 / job 97402064994 / qualify-gamma5-route        / failure / steps=null / logs_url=null
32717605022 / job 97402064877 / qualify-runemp1-orchestration / failure / steps=null / logs_url=null
32717605065 / job 97402064864 / independent-handcalc         / failure / steps=null / logs_url=null
```

No checkout or repository command executed. Therefore:

```text
UBUNTU_LATEST_LABEL_HYPOTHESIS = REJECTED
UBUNTU_24_04_PIN_FIX           = FAIL_AS_INFRASTRUCTURE_REPAIR
ENGINEERING_COMMAND_STATUS     = NOT_RUN
NUMERICAL_QUALIFICATION        = NOT_RUN / NOT_CLAIMED
MERGE_DISPOSITION              = DO_NOT_MERGE
```

The explicit 24.04 pin is not the repair and must not enter `main`.

## Infrastructure provenance found after falsifier

Historical repository evidence shows:

- PR #376 merged a B7H self-hosted route requiring `[self-hosted, linux, x64, lafea]` but no B7H executable PASS ever existed; Issue #269 remained pending a registered matching runner.
- M001 commit `d086cc9ca5ab32866ec071d82954e375442574bb` later removed 95 obsolete/non-functional CI workflow files, including B7H.
- M001/related repository history explicitly records exhausted GitHub Actions credits and that restoring deleted workflow scaffolding cosmetically is not a valid fix.

Therefore re-adding B7H without a confirmed registered runner would not be evidence and is not justified by this failed label experiment.

## Coordination

PR #1401 remains separate, draft and unmerged. Since #1406 will not merge, PR1401's current exact-main target is not invalidated by this experiment.

## Validation ledger

| Check | Status | Basis |
|---|---|---|
| main grounding | PASS | live GitHub main `c2018c4...` |
| #1401 exact-file overlap | PASS_NO_WRITE_OVERLAP | #1401 changes recovery files only |
| prior current EMP.1 pre-step failure | PASS_OBSERVED | steps/logs absent |
| unrelated #1405 current-main pre-step reproduction | PASS_OBSERVED | LAFEA job steps/logs absent |
| retained explicit ubuntu-24.04 executable precedent | PASS_RETAINED | historical #117 / run 30692282812 |
| patch scope = three runner labels only | PASS_SOURCE_INSPECTION | exact branch content |
| explicit ubuntu-24.04 gamma5 job | NOT_RUN_EXECUTION_ENVIRONMENT | run 32717605012 / job 97402064994 / no steps/logs |
| explicit ubuntu-24.04 orchestration job | NOT_RUN_EXECUTION_ENVIRONMENT | run 32717605022 / job 97402064877 / no steps/logs |
| explicit ubuntu-24.04 independent job | NOT_RUN_EXECUTION_ENVIRONMENT | run 32717605065 / job 97402064864 / no steps/logs |
| hypothesis | FAIL_FALSIFIED | explicit 24.04 does not restore step creation |
| engineering commands | NOT_RUN | no step instantiated |
| numerical qualification | NOT_RUN / NOT_CLAIMED | no engineering execution |

## Authority invariants

All remain false/unmodified:
- bounded production route authorization;
- registry registration / engineering-use authorization;
- global EMP.1.C authority;
- code compliance;
- release qualification.

## Appendix A

A1 Production trace — 20/20. Runner routing is upstream of checkout and cannot itself alter WRC numerics.

A2 Failure isolation — 20/20. The explicit-24.04 falsifier rejected the routing-label hypothesis without conflating infrastructure failure and engineering failure.

A3 Authority/invariant — 20/20. No self-hosted/security/numerical/source/release authority expansion occurred.

A4 Independent validation — 20/20. All three exact-head jobs independently reproduced the same pre-step state; the hypothesis is decisively rejected.

A5 Minimal next action — 20/20. Do not merge; close experiment and pursue actual account/runner capacity or independently qualified execution transport.

**100/100; minimum 20/20 — HANDOVER_READY / ABANDON_REJECTED_HYPOTHESIS.**

## Historical

WIP authority `WIP-54-EMP1-RUNNER-20260824` was retired after PR #1406 allocation. PR #1406 is a retained falsified experiment and must close unmerged.
