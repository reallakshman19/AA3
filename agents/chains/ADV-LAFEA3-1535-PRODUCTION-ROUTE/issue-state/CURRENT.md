# Issue Current State — #1535 LAFEA.3 ordinary production route / #1569 BM-005 rigor

ISSUE_BASIS_ID: IB-0001
ISSUE_CURRENT_STATE_BASIS: IB-0001
ISSUE_CURRENT_STATE_ENDPOINT: EP-0029
WORK_ITEM_KEY: github:reallaksh19/Advanced_Analysis#1535
SUBORDINATE_VV_WORK_ITEM: github:reallaksh19/Advanced_Analysis#1569
ENGINEERING_MERGE_HEAD: 0f8b9443d9e578c5509f880713438ddc0b8c0fa4
CURRENT_MAIN_AT_LEG_START: fad372eaf55487b10a2cbcad5ff8438b71e031ff
ACTIVE_PR: #1581 DRAFT
ACTIVE_BRANCH: engineering/lafea3-1569-bm005-runner
MERGE_AUTHORITY: OWNER_ONLY
MERGE_AUTHORIZED: FALSE

## Acceptance ledger

| ID | Status | Evidence / disposition |
|---|---|---|
| TASK-001 | PARTIAL | Ordinary geometry/domain intake plus governed mesh/preflight/compiler/convergence plumbing are on main; exact-head BM-005 execution still has not started. |
| TASK-002 | PARTIAL | Curved geometry route and mapped Q8 producer are merged; faithful execution remains blocked before checkout. |
| TASK-003 | PARTIAL | T3/T6/Q8 capability and focused checks exist; integrated exact-head execution remains pending. |
| TASK-004 | PASS | Historical continuum documentation remains subordinate to live source authority. |
| TASK-005 | PASS_STATIC_SOURCE | Richards Lamé source custody and independent oracle record are merged. |
| TASK-006 | PARTIAL | Visible Run -> Convergence -> Results composition is merged; real engineer/browser replay remains NOT_RUN. |
| TASK-007 | PASS_STATIC_SOURCE | Frozen BM-005 package/report contract is merged: Q8 quarter-annulus, four-level ladder, fixed physical probe, convergence-policy binding, negative control and audit hashes. |
| TASK-008 | PASS_WORKFLOW_WIRING / EXECUTION_NOT_RUN | Owner-authorized dedicated BM-005 read-only workflow exists in Draft #1581 and triggers on the intended PR head, but hosted jobs terminate with `steps=null` before checkout. |

## Frozen BM-005 package

Case: `BM-005-LAME-CONT-CYL-01` / existing `CONT-CYL-01` family.

```text
Ri=50 mm
Ro=100 mm
Pi=10 MPa
Po=0
E=200000 MPa
nu=0.3
plane stress
Q8 mapped quarter-annulus
h=40/20/10/5 mm
r=2
probe r=73 mm, theta=37 deg
u_expected=0.003819703196347032 mm
```

Primary oracle: K. L. Richards, *Design Engineer's Handbook*, 1st ed., CRC Press, 2012, Ch.6 p.157 Eqs.6.3–6.4 and §6.3 p.158. Production output cannot alter the frozen oracle, probe, mesh ladder, convergence-policy constants or acceptance after observations.

## LEG-009 hosted runner

Owner authorized workflow-YAML scope by saying `proceed next` after EP-0027 explicitly named that authority gate.

Draft PR #1581 adds `.github/workflows/lafea3-bm005-qualification.yml` with `contents: read` only. It checks out the exact event head, asserts exact HEAD/clean tree/diff, uses Node 22, syntax-checks the BM-005 scripts, executes the existing harness, captures stdout/stderr/exit code under `/tmp`, uploads receipts always, and propagates the harness exit.

First dedicated probe:

```text
PR head: cafc767334b91f71294de1efe2b4f3ed483941a0
workflow run: 33321472589
attempt-1 job: 99284076931 -> completed/failure, steps=null
artifacts: []
rerun job: 99284139696 -> completed/failure, steps=null
```

This proves workflow trigger/wiring only. It does not prove checkout, syntax, BM-005, or any numerical boundary. The correct classification is `NOT_RUN_EXECUTION_BLOCKED`, not BM-005 FAIL.

## Benchmark / qualification truth

| ID | Status | Evidence / disposition |
|---|---|---|
| BM-001 | PASS_FOCUSED | Prior focused T3/T6/Q8 mechanics/Jacobian evidence. |
| BM-002 | PASS_FOCUSED | Prior Kirsch benchmark with independent analytical oracle custody. |
| BM-003 | NOT_RUN | Integrated Lamé software execution not retained as current exact-head evidence. |
| BM-004 | PASS_FOCUSED | Prior solver/Jacobian/imposed-displacement/fail-closed focused controls. |
| BM-005 | NOT_RUN_EXECUTION_BLOCKED | Dedicated workflow is wired but hosted executor terminates before checkout; no harness stdout/report exists. |
| BM-006 | NOT_RUN | Same-case real engineer/browser walkthrough remains unexecuted. |

VISIBLE_USER_REPLAY_STATUS: STATIC_COMPOSITION_MERGED / BROWSER_NOT_RUN
CORE_FEA_COMPLETION_STATUS: NOT_PROVEN
RELEASE_QUALIFIED: FALSE

## Protected unchanged authority

No changes to element formulations, stiffness/load assembly, solver, recovery, mesher mathematics/quality thresholds, pressure semantics, physical-probe mathematics, convergence mathematics/policy, frozen benchmark oracle/tolerances, Owner roadmap, LAFEA.4/.5 numerical semantics, code assessment or release authority. Workflow authority is limited to the single bounded runner in #1581.

## Exact next action

Do not add another workflow and do not patch engineering code. Obtain a functioning hosted runner or faithful clean local checkout and execute the already-retained BM-005 harness. The evidence classifications are:

- failure before checkout/step 1 -> `BM-005 NOT_RUN_EXECUTION_BLOCKED`;
- harness machine-readable `status=FAIL` or pre-report rejection -> true BM-005 failure boundary; isolate it and create fresh pre-work before patching;
- harness `status=PASS` -> persist exact report as `agents/chains/ADV-LAFEA3-1535-PRODUCTION-ROUTE/validation/BM005-<candidateHeadSha>.json`, then perform BM-006 in a real browser.

Do not weaken oracle, mesh ladder, tolerances or convergence policy to obtain PASS.
