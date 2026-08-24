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
GROUNDING_EPOCH: GE-D-009
CURRENT_STAGE: REGROUNDED_TO_CURRENT_MAIN_EXECUTION_BLOCKED_BY_EXECUTION_ENVIRONMENT
BLOCKER: Issue #54 / hosted EMP.1 jobs fail before step creation; no complete executable checkout is available
HIGHEST_RISK: stale/fabricated files 01-10 or merging PR-D as a substitute for genuine qualification
EXACT_NEXT_ACTION: execute the genuine 01-10 producer/review/proposal chain on exact current main when a functioning runner exists. If main moves first, invalidate this target and re-ground again. Do not merge PR1401 until mandatory evidence exists.
```

## 1. Current sequence and exact target

Merged predecessor/release-support phases now include:

```text
PR-B #1398 -> merged
PR-C #1400 -> merged
PR-G #1403 -> merged at 0f85cac384532b5cc35bc24ecedd729275027eb6
PR-H #1404 -> merged at c2018c4b81e4c45f151ad7e59efd7d903ad7de97
```

PR-G and PR-H changed presentation/release-evidence surfaces only and did not authorize or modify the bounded WRC numerical route. Current PR-D exact execution target is therefore the current merged main:

`c2018c4b81e4c45f151ad7e59efd7d903ad7de97`

Any later main movement invalidates that exact target before execution.

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
- frozen release profile/benchmark records;
- `.github/workflows/**`.

If execution reveals a mechanics/oracle/tolerance mismatch, stop and isolate it. Do not weaken a gate or rebaseline expected values to obtain PASS.

## 5. Execution truth

Previous hosted probes and controlled reruns all ended before checkout with `steps=null` and `logs_url=null`; direct alternate checkout also failed before repository access. Classification remains:

`NOT_RUN_EXECUTION_ENVIRONMENT / PRE_STEP_INFRASTRUCTURE_FAILURE (#54)`

The PR-H implementation-head probe likewise reproduced the same platform condition on 2026-08-24:

```text
32711488631 / job 97383640772 / qualify-gamma5-route          / steps=null / logs_url=null
32711488637 / job 97383640676 / independent-handcalc           / steps=null / logs_url=null
32711488622 / job 97383640610 / qualify-runemp1-orchestration  / steps=null / logs_url=null
```

Those runs are infrastructure observations only; they are not PR-D exact-target evidence. Genuine execution on `c2018c4...` remains NOT_RUN and files 01-10 remain NOT_GENERATED.

## 6. Validation ledger

| ID | Status | Observation / basis |
|---|---|---|
| D-001 | PASS | current main re-grounded at `c2018c4...` after PR-H merge |
| D-002 | PASS | PR-D diff before execution remains recovery-only |
| D-003 | PASS | producer/review/proposal contracts unchanged |
| D-004 | PASS | PR-G/PR-H do not authorize production or alter WRC numerical mechanics |
| D-005 | NOT_RUN_EXECUTION_ENVIRONMENT | prior direct checkout failed before repository access |
| D-006 | NOT_RUN_EXECUTION_ENVIRONMENT | prior hosted jobs/reruns had no steps/logs |
| D-007 | NOT_RUN | genuine execution on current exact target `c2018c4...` |
| D-008 | NOT_GENERATED | files 01-10 |
| D-009 | NOT_CLAIMED | numerical qualification PASS |
| D-010 | PASS | production/global/code/release authority remains false |

## 7. Changed-file ledger

Before genuine execution PR-D changes exactly:

1. `agents/PR1401_workreport.md`
2. `agents/status/PR1401.yaml`
3. `agents/claims/PR1401.yaml`

After genuine successful execution, only the controlled generated 01-10 evidence files may be added.

## 8. Merge disposition

`BLOCKED_MANDATORY_EXACT_HEAD_EVIDENCE_NOT_GENERATED`

PR-D must not be merged as a process-only placeholder. PR-E bounded authorization and PR-F files 11-12 remain blocked until the genuine PR-D chain executes and passes. PR-H is now merged only as a fail-closed future release harness; it does not relax this gate.

## 9. Appendix A — Implementation Takeover Qualification

A1 Production trace — **20/20**. Exact target, evidence chain, frozen identities and downstream dependency are explicit.

A2 Failure isolation — **20/20**. Infrastructure failure is separated from engineering PASS/FAIL and from main-drift invalidation.

A3 Authority/invariant — **20/20**. PR-D cannot authorize production/global/code/release or mutate frozen oracle/tolerances.

A4 Independent validation — **19/20**. Full producer/replay/falsifier matrix is retained; exact-current execution remains NOT_RUN.

A5 Minimal next action — **20/20**. Use a functioning complete runner, re-check current main, generate genuine 01-10 only, and stop on any mechanics drift.

**Total: 99/100; minimum 19/20 — HANDOVER_READY / MERGE_BLOCKED_BY_MANDATORY_EVIDENCE.**
