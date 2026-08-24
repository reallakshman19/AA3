# PR1407 — Issue #1371 exact-current-main certification

## Recovery header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: CLOSED_UNMERGED
TAKEOVER_AUTHORITY: READ_ONLY_AFTER_CLASSIFICATION
EXECUTION_MODE: AUTO
MERGE_AUTHORITY: OWNER_ONLY
VALIDATION_PR_MERGE: PROHIBITED
SOURCE_TASK: Issue #1371
PR: #1407 (CLOSED / UNMERGED / VALIDATION ONLY)
BRANCH: agent/issue-1371-postmerge-cert-a59547c-20260824
CERTIFIED_MAIN_EPOCH: a59547c8554b6244b2ea94aedd4d59fa0fb15d1f
IMMUTABLE_EXACT_MAIN_REF: validation/issue-1371-merged-a59547c
CERTIFICATION_HEAD: 0c355076e8ea7346f2844f9b16cc330382d34132
VISIBLE_WORKBENCH_RUN: 32720783742
VISIBLE_WORKBENCH_JOB: 97411545033
HOSTED_ENGINEERING_EXECUTION: NOT_RUN_PRE_STEP_INFRASTRUCTURE_FAILURE
APPLICATION_RUNTIME_DIFF_FROM_MAIN: NONE
WORKFLOW_SEMANTICS_DIFF_FROM_MAIN: NONE_AFTER_RESTORE
CURRENT_STAGE: TERMINAL_VALIDATION_CHECKPOINT
EXACT_NEXT_ACTION: do not mutate #1371 engineering/registry authority; on a future exact eligible head where checkout/repository steps actually start, capture all-gates execution and only then consider a separate registry-cleanup PR under Issue #1371 §17.
```

## Grounding and drift

Issue #1371 implementation PRs #1388, #1390, #1392 and #1393 are merged. Prior certification epoch targeted `c2018c4b81e4c45f151ad7e59efd7d903ad7de97`. Live main for this certification epoch was `a59547c8554b6244b2ea94aedd4d59fa0fb15d1f` after owner-merged EMP.1 #1401.

AD-01 classification was SAFE. The drift from `c2018c4b...` to `a59547c...` contained only:

- `agents/PR1401_workreport.md`
- `agents/claims/PR1401.yaml`
- `agents/status/PR1401.yaml`

There was zero overlap with Issue #1371 LAFEA runtime, benchmark/oracle, browser, carrier, registry or validation authority.

Immutable ref `validation/issue-1371-merged-a59547c` was verified IDENTICAL to the certified main epoch: 0 ahead, 0 behind, 0 changed files.

## Certification surface

PR1407 was created directly from the certified main epoch. Its exact certification head `0c355076e8ea7346f2844f9b16cc330382d34132` differed from that main only by:

- `agents/PR1407_workreport.md`;
- `agents/status/PR1407.yaml`;
- `agents/claims/PR1407.yaml`;
- one YAML comment in `.github/workflows/lafea-visible-workbench.yml` used solely to satisfy the workflow's existing PR path filter.

No application/runtime/test/oracle/benchmark/registry code changed. The workflow comment changed no YAML key/value, runner, command, benchmark, trigger condition or Chromium route.

After classification, PR1407 was closed unmerged and the workflow file was restored byte-for-byte to main blob `3f45d7c58b27bb277c1a1d2d6aca901520fa5935`.

## Exact-head hosted evidence

`LAFEA visible workbench qualification`:

```text
head        = 0c355076e8ea7346f2844f9b16cc330382d34132
run         = 32720783742
job         = 97411545033
status      = completed
conclusion  = failure
steps       = null
logs        = none
checkout    = NOT_EXECUTED
repo command= NOT_EXECUTED
```

Classification: **NOT_RUN / PRE_STEP_INFRASTRUCTURE_FAILURE**.

This is not an engineering FAIL because no repository step existed. It is not PASS because none of the required engineering gates executed.

## Required gates still unexecuted on this exact head

- frozen shell source/freeze validation;
- B4-1/B4-2/B4-3 production-vs-frozen comparison;
- shell product-response qualification;
- frozen B01/B02 continuum qualification and LAFEA.3 source/domain/product custody;
- Issue #1371 merge-order guard;
- cross-stage anti-drift and deterministic hashes;
- existing Chromium LAFEA.3 and LAFEA.4 Model -> Mesh -> Analyse -> Output journeys;
- build and clean-tree checks.

All remain **NOT_RUN**, not failed.

## Infrastructure context

PR #1406 independently falsified the `ubuntu-latest` label hypothesis: explicit `ubuntu-24.04` jobs still returned `steps=null` and no logs. No further #1371 workflow/source mutation is justified merely to manufacture execution.

## Registry boundary

Issue #1371 §17 remains binding: only after all relevant gates **execute and pass** may registry wording be proposed for change.

Protected wording remains:

`Production geometry-to-mesh-to-convergence orchestration is incomplete.`

PR1407 has no registry authority and was intentionally closed without merge.

## Validation matrix

| Gate | Status | Evidence |
|---|---|---|
| source implementation merged | PASS_SOURCE_CONTROL | #1388 -> #1390 -> #1392 -> #1393 |
| current-main drift | PASS_SOURCE_INSPECTION | EMP.1 #1401 recovery-only |
| immutable exact-main ref | PASS_SOURCE_CONTROL | identical to `a59547c...` |
| application/runtime equality | PASS_SOURCE_CONTROL | no runtime/test/oracle diff |
| workflow semantic equality | PASS_SOURCE_CONTROL | comment-only trigger, then exact blob restore |
| B4 production qualification | NOT_RUN | job had no steps |
| continuum qualification | NOT_RUN | job had no steps |
| merge-order/anti-drift | NOT_RUN | job had no steps |
| Chromium LAFEA.3/.4 | NOT_RUN | job had no steps |
| registry cleanup | BLOCKED | executed all-gates PASS absent |

## Risks / decisions

- `RISK-01`: zero-step Actions failure mislabeled engineering FAIL. Controlled by explicit NOT_RUN classification.
- `RISK-02`: prior-head evidence treated as exact-current-head authority. Controlled by immutable epoch ref and exact head/run IDs.
- `RISK-03`: validation PR accidentally merged. Controlled: PR1407 closed unmerged.
- `RISK-04`: registry limitation removed without executed all-gates PASS. Controlled: no registry PR created.

## Appendix A

A1 production trace 20/20; A2 failure isolation 20/20; A3 authority/invariant 20/20; A4 independent validation 18/20 because runtime evidence remains unavailable; A5 minimal patch 20/20. Total 98/100.

Falsifier: any claim that run `32720783742` executed a repository command or proves engineering PASS is false; its job payload has `steps=null` and no logs.
