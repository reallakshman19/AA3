# PR1401 Work Report — EMP.1 exact-head gamma5 requalification / independent review

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED_FOR_EXECUTION_EVIDENCE_ONLY
MERGE_AUTHORITY: OWNER_ONLY_AND_MANDATORY_EVIDENCE_GATED
PR: #1401
ISSUES: #1389 PR-D; #1333
BRANCH: agent/issue-1389-pr-d-gamma5-exact-head-20260824
MAIN_HEAD_LAST_CHECKED: c2018c4b81e4c45f151ad7e59efd7d903ad7de97
EXACT_EXECUTION_TARGET: c2018c4b81e4c45f151ad7e59efd7d903ad7de97
EXACT_TARGET_PROBE_HEAD: d850cd412f23a2fd9ada24a4e802fc0dc267d573
GROUNDING_EPOCH: GE-D-010
CURRENT_STAGE: CURRENT_MAIN_TARGET_PROBED_PRE_STEP_INFRASTRUCTURE_BLOCKED
BLOCKER: Issue #54 / all fresh EMP.1 jobs completed before step creation; no complete executable checkout is available
HIGHEST_RISK: stale/fabricated files 01-10 or merging PR-D as a substitute for genuine qualification
EXACT_NEXT_ACTION: restore a functioning runner, verify main still equals c2018c4..., then execute the genuine 01-10 producer/review/proposal chain. If main moves first, invalidate this target and re-ground again. Do not merge PR1401 until mandatory evidence exists.
```

Later commits changing only this recovery report/status do not become an engineering execution basis. The exact-target probe basis is `d850cd412f23a2fd9ada24a4e802fc0dc267d573`.

## 1. Current sequence and exact target

Merged predecessor/release-support phases now include:

```text
PR-B #1398 -> merged
PR-C #1400 -> merged
PR-G #1403 -> merged at 0f85cac384532b5cc35bc24ecedd729275027eb6
PR-H #1404 -> merged at c2018c4b81e4c45f151ad7e59efd7d903ad7de97
```

PR-G and PR-H changed presentation/release-evidence surfaces only and did not authorize or modify the bounded WRC numerical route. Current PR-D exact execution target is the current merged main:

`c2018c4b81e4c45f151ad7e59efd7d903ad7de97`

The recovery-only PR branch was mechanically refreshed onto that main with no engineering-code change. Any later main movement invalidates the exact target before genuine execution.

## 2. Mandatory PR-D outputs

Only script-generated evidence is valid:

```text
01-observation.json
02-replay-receipt.json
03-falsifier-receipt.json
04-evidence-manifest.json
05-local-execution-receipt.json
06-independent-review-receipt.json
07-independent-review-falsifier-receipt.json
08-bounded-authorization-proposal.json
09-bounded-authorization-proposal-check-receipt.json
10-bounded-authorization-proposal-falsifier-receipt.json
```

No file 01-10 may be hand-authored, reconstructed from static inspection, copied from an older head, or retained after target drift.

## 3. Existing execution contract

Merged PR #1327 tooling remains the execution authority for this phase. Acceptance requires:

- exact `--expected-head` equality and clean checkout;
- exact HEAD/tree/parent custody;
- 6/6 loads `P,Vc,Vl,Mc,Ml,Mt`;
- 32/32 stress comparisons across four families and eight points;
- every tolerance ratio `<= 1` under frozen abs `1e-12`, rel `1e-11` policy;
- 10/10 producer falsifiers;
- independent 23-stage replay and byte/hash custody;
- 6/6 review-layer falsifiers;
- bounded proposal/check/falsifier receipts 08-10;
- false production/global/code/release authority throughout PR-D.

Frozen identities:

```text
candidate qualification = 9ea591a1918175b3e415d77f1adc4398645ca0503a699cfe8139d9dd3c69b4c7
physical oracle         = 60771128f8261057bf73fa6c183ace5df25f3ee98f417f58da25a6135d8b2e18
WRC source SHA-256      = 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
bounded dataset hash    = fb440a292f8794430977f60f5365a678a9aff62a4dae3397621902964a0db73c
```

## 4. Protected authority — unchanged

```text
EMP1_WRC537_GAMMA5_ZERO_DP_ROUTE_AUTHORIZED = false
registry.registered = false
registry.engineeringUseAuthorized = false
globalEmp1CRouteAuthority = false
codeCompliance = false / NOT_ASSESSED
releaseQualified = false
```

Protected from mutation:

- gamma5 production route and bounded registry;
- Table-5 evaluator;
- physical oracle, candidate qualification and frozen tolerance policy;
- frozen release profile/benchmark/readiness records;
- `.github/workflows/**`.

If execution reveals a mechanics/oracle/tolerance mismatch, stop and isolate it. Do not weaken a gate or rebaseline expected values to obtain PASS.

## 5. Current exact-target hosted probe

Recovery-only branch head `d850cd412f23a2fd9ada24a4e802fc0dc267d573` contains current `main@c2018c4...` plus only the three PR1401 recovery files. GitHub launched all three existing EMP.1 workflows:

```text
32712164106 / job 97385705174 / qualify-runemp1-orchestration / completed failure / steps=null / logs_url=null
32712164189 / job 97385705524 / qualify-gamma5-route         / completed failure / steps=null / logs_url=null
32712164121 / job 97385705344 / independent-handcalc          / completed failure / steps=null / logs_url=null
```

Classification for all three:

`NOT_RUN_EXECUTION_ENVIRONMENT / PRE_STEP_INFRASTRUCTURE_FAILURE (#54)`

No checkout, Node command, WRC calculation, independent oracle comparison, producer, replay, falsifier, review or authorization-proposal step executed. GitHub's workflow conclusion `failure` is not an engineering FAIL and is not PASS.

Previous probes/reruns exhibited the same pre-step condition. Direct alternate checkout also failed before repository access. Genuine execution on the current exact target therefore remains NOT_RUN and files 01-10 remain NOT_GENERATED.

## 6. Validation ledger

| ID | Status | Observation / basis |
|---|---|---|
| D-001 | PASS | current main re-grounded at `c2018c4...` after PR-H merge |
| D-002 | PASS | PR-D branch mechanically refreshed with exactly three recovery files |
| D-003 | PASS | producer/review/proposal contracts and frozen identities unchanged |
| D-004 | PASS | PR-G/PR-H do not authorize production or alter WRC numerical mechanics |
| D-005 | NOT_RUN_EXECUTION_ENVIRONMENT | exact-target runEmp1 job `97385705174`, steps/logs null |
| D-006 | NOT_RUN_EXECUTION_ENVIRONMENT | exact-target gamma5 job `97385705524`, steps/logs null |
| D-007 | NOT_RUN_EXECUTION_ENVIRONMENT | exact-target independent job `97385705344`, steps/logs null |
| D-008 | NOT_RUN | genuine 01-10 producer/review/proposal execution |
| D-009 | NOT_GENERATED | files 01-10 |
| D-010 | NOT_CLAIMED | numerical qualification PASS |
| D-011 | PASS | production/global/code/release authority remains false |

## 7. Changed-file ledger

Before genuine execution PR-D changes exactly:

1. `agents/PR1401_workreport.md`
2. `agents/status/PR1401.yaml`
3. `agents/claims/PR1401.yaml`

After genuine successful execution, only the controlled generated 01-10 evidence files may be added.

## 8. Merge disposition

`BLOCKED_MANDATORY_EXACT_HEAD_EVIDENCE_NOT_GENERATED`

PR-D must not be merged as a process-only placeholder. PR-E bounded authorization and PR-F files 11-12 remain blocked until the genuine PR-D chain executes and passes. PR-H is merged only as a fail-closed future release harness; it does not relax this gate.

## 9. Appendix A — Implementation Takeover Qualification

A1 Production trace — **20/20**. Exact target, evidence chain, frozen identities and downstream dependency are explicit.

A2 Failure isolation — **20/20**. The current-target hosted failures are proven pre-step infrastructure events, separated from engineering PASS/FAIL and target drift.

A3 Authority/invariant — **20/20**. PR-D cannot authorize production/global/code/release or mutate frozen oracle/tolerances.

A4 Independent validation — **19/20**. Full producer/replay/falsifier matrix is retained; genuine exact-current execution remains NOT_RUN.

A5 Minimal next action — **20/20**. Use a functioning complete runner, re-check current main, generate genuine 01-10 only, and stop on any mechanics drift.

**Total: 99/100; minimum 19/20 — HANDOVER_READY / MERGE_BLOCKED_BY_MANDATORY_EVIDENCE.**
