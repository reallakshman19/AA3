# PR1401 Work Report — EMP.1 exact-head gamma5 requalification / independent review

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED_FOR_EXECUTION_EVIDENCE_ONLY
MERGE_AUTHORITY: OWNER_AUTHORIZED_BUT_MANDATORY_EVIDENCE_GATE_NOT_SATISFIED
PR: #1401
ISSUES: #1389 PR-D; #1333; #54
BRANCH: agent/issue-1389-pr-d-gamma5-exact-head-20260824
MAIN_HEAD_LAST_CHECKED: c2018c4b81e4c45f151ad7e59efd7d903ad7de97
EXACT_EXECUTION_TARGET: c2018c4b81e4c45f151ad7e59efd7d903ad7de97
LATEST_RUNNER_PROBE_HEAD: e99f40cff037051db074dce07a95c38a00abb704
GROUNDING_EPOCH: GE-D-011
CURRENT_STAGE: OWNER_MERGE_REQUEST_RECEIVED_BUT_EVIDENCE_GATE_BLOCKS_MERGE; LATEST_RUNNER_RERUN_PRE_STEP_FAILED
BLOCKER: Issue #54 / current EMP.1 hosted job still fails before step creation; connected GitHub control plane exposes rerun/inspection but no runner/billing/policy administration or repository archive checkout
HIGHEST_RISK: merging recovery metadata as a substitute for genuine files 01-10, or fabricating stale execution evidence
EXACT_NEXT_ACTION: obtain an executable exact-head environment; verify main is still c2018c4...; generate genuine 01-10 through the retained producer/review/proposal chain; only then reconsider merge and PR-E.
```

Owner instruction `merge, proceed next` on 2026-08-24 is explicit merge authority, but it does not satisfy the repository's mandatory engineering-evidence acceptance gate. PR1401 therefore remains unmerged until genuine execution evidence exists.

## 1. Current sequence and exact target

Merged predecessor/support phases:

```text
PR-B #1398 -> merged
PR-C #1400 -> merged
PR-G #1403 -> merged at 0f85cac384532b5cc35bc24ecedd729275027eb6
PR-H #1404 -> merged at c2018c4b81e4c45f151ad7e59efd7d903ad7de97
```

PR-D is mechanically based on current `main@c2018c4b81e4c45f151ad7e59efd7d903ad7de97` and changes only its three recovery records until successful execution. Any later movement of main invalidates the execution target.

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

No file 01-10 may be hand-authored, reconstructed from static inspection, copied from an older head, generated from production output, or retained after exact-target drift.

## 3. Existing execution contract

Merged PR #1327 tooling remains authoritative for PR-D. Acceptance requires:

- exact `--expected-head` equality and clean checkout;
- exact HEAD/tree/parent custody;
- 6/6 loads `P,Vc,Vl,Mc,Ml,Mt`;
- 32/32 stress comparisons across four stress families and Au..Dl;
- every tolerance ratio `<= 1` under frozen abs `1e-12`, rel `1e-11` policy;
- 10/10 producer anti-forgery falsifiers;
- independent 23-stage replay and byte/hash custody;
- 6/6 review-layer falsifiers;
- bounded non-authorizing proposal/check/falsifier receipts 08-10;
- production/global/code/release authority false throughout PR-D.

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

Protected from PR-D mutation:

- gamma5 production route and bounded registry;
- Table-5 evaluator;
- physical oracle, candidate qualification and tolerance policy;
- frozen release profile/benchmark/readiness records;
- `.github/workflows/**`.

If execution reveals a mechanics/oracle/tolerance mismatch, stop and isolate it. Never weaken a gate or rebaseline expected values to obtain PASS.

## 5. Execution truth

### Current-main probe family

A clean recovery-only probe based on current main previously created these jobs:

```text
32712164106 / job 97385705174 / qualify-runemp1-orchestration / failure / steps=null / logs_url=null
32712164189 / job 97385705524 / qualify-gamma5-route         / failure / steps=null / logs_url=null
32712164121 / job 97385705344 / independent-handcalc          / failure / steps=null / logs_url=null
```

A later recovery-only head `e99f40cff037051db074dce07a95c38a00abb704` created run `32712369510`, gamma5 job `97386330940`, also with `steps=null` / `logs_url=null`.

### Owner-authorized latest retry

After the current `merge, proceed next` instruction, job `97386330940` was explicitly rerun. GitHub created replacement job:

```text
run 32712369510 / attempt 2
job 97397137459 / qualify-gamma5-route
status completed / conclusion failure
steps = null
logs_url = null
run_started_at = 2026-08-24T10:16:41Z
```

Classification:

`NOT_RUN_EXECUTION_ENVIRONMENT / PRE_STEP_INFRASTRUCTURE_FAILURE`

No checkout, Node command, WRC calculation, independent oracle comparison, producer/replay/falsifier/review/proposal step executed. The GitHub conclusion `failure` is neither engineering FAIL nor PASS.

Issue #54 contains historical heads where hosted execution recovered and reached checkout, but the current EMP.1 exact-head family has again reproduced the pre-step condition. Therefore historical runner recovery cannot be substituted for current PR-D evidence.

The connected GitHub surface exposes workflow inspection and rerun, but no Actions billing/quota/policy/runner administration and no complete repository archive/checkout path. Plugin discovery found no additional GitHub Actions/runner administration plugin. No workflow mutation is authorized merely to make CI green.

## 6. Validation ledger

| ID | Status | Observation / basis |
|---|---|---|
| D-001 | PASS | live main remains `c2018c4...` |
| D-002 | PASS | PR-D effective diff remains recovery-only |
| D-003 | PASS | producer/review/proposal contracts and frozen identities retained |
| D-004 | NOT_RUN_EXECUTION_ENVIRONMENT | current-main runEmp1 job `97385705174`: no steps/logs |
| D-005 | NOT_RUN_EXECUTION_ENVIRONMENT | current-main gamma5 job `97385705524`: no steps/logs |
| D-006 | NOT_RUN_EXECUTION_ENVIRONMENT | current-main independent job `97385705344`: no steps/logs |
| D-007 | NOT_RUN_EXECUTION_ENVIRONMENT | later gamma5 job `97386330940`: no steps/logs |
| D-008 | NOT_RUN_EXECUTION_ENVIRONMENT | owner-requested rerun job `97397137459`: no steps/logs |
| D-009 | NOT_RUN | genuine 01-10 producer/review/proposal execution |
| D-010 | NOT_GENERATED | files 01-10 |
| D-011 | NOT_CLAIMED | numerical qualification PASS |
| D-012 | PASS | production/global/code/release authority remains false |

## 7. Changed-file ledger

Before genuine execution PR-D changes exactly:

1. `agents/PR1401_workreport.md`
2. `agents/status/PR1401.yaml`
3. `agents/claims/PR1401.yaml`

After successful execution, only the controlled generated 01-10 evidence files may be added.

## 8. Merge disposition

`OWNER_AUTHORIZED_BUT_BLOCKED_MANDATORY_EXACT_HEAD_EVIDENCE_NOT_GENERATED`

Do not merge PR1401 as a process-only placeholder. PR-E bounded production authorization and PR-F post-promotion evidence remain blocked until PR-D genuinely executes and passes. PR-H being merged does not relax this prerequisite.

## 9. Appendix A — Implementation Takeover Qualification

A1 Production trace — **20/20**. Exact target, evidence chain, frozen identities and downstream dependency are explicit.

A2 Failure isolation — **20/20**. Current pre-step failure is separated from engineering PASS/FAIL and from historical runner recovery on unrelated heads.

A3 Authority/invariant — **20/20**. PR-D cannot authorize production/global/code/release or mutate frozen oracle/tolerances.

A4 Independent validation — **19/20**. Full producer/replay/falsifier matrix is retained; genuine exact-current execution remains NOT_RUN.

A5 Minimal next action — **20/20**. Obtain an executable exact-head environment, re-ground main, generate genuine 01-10 only, and stop on mechanics drift.

**Total: 99/100; minimum 19/20 — HANDOVER_READY / MERGE_BLOCKED_BY_MANDATORY_EVIDENCE.**
