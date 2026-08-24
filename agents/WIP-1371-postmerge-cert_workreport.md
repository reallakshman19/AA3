# Issue #1371 post-merge exact-current-main certification work report

## Recovery header

```text
HANDOVER_READINESS: READY_FOR_VALIDATION
PR_RECOVERY_STATE: CONTINUE
TAKEOVER_AUTHORITY: VALIDATION_METADATA_ONLY
EXECUTION_MODE: AUTO
MERGE_AUTHORITY: OWNER_ONLY
VALIDATION_PR_MERGE: PROHIBITED
SOURCE_TASK: Issue #1371
BRANCH: agent/issue-1371-postmerge-cert-20260824
LIVE_MAIN_AT_BRANCH: c2018c4b81e4c45f151ad7e59efd7d903ad7de97
RUNTIME_DIFF_FROM_MAIN: NONE
CURRENT_STAGE: POST_MERGE_EXACT_CURRENT_MAIN_CERTIFICATION
EXACT_NEXT_ACTION: allocate a draft validation-only PR so existing LAFEA pull-request workflows execute against current merged main plus recovery metadata only; classify real steps honestly; never merge this validation PR.
```

## Mission

Issue #1371 implementation source PRs are already merged in required order:

1. #1388 -> `d0eab542213ff469c77dd05c093b49b5449c7a81`
2. #1390 -> `902bb2bb8f09ea2a483e96f3fb585e3139410a73`
3. #1392 -> `f412575ad3abf62ed2b4dda0fc41959456ee52cb`
4. #1393 -> `ff5a7353f3759d72ba27be37095c7f5e06b5f7e2`

Live main subsequently advanced to `c2018c4b81e4c45f151ad7e59efd7d903ad7de97` through EMP.1 PR #1404. AD-01 inspection classifies that one-commit drift SAFE: its nine changed files are EMP.1 release-evidence/recovery assets only and do not overlap Issue #1371 LAFEA runtime, oracle, browser, carrier, registry or recovery authority.

This branch is created directly from current main and adds recovery metadata only. Therefore the repository runtime/test/oracle tree exercised by pull-request workflows is the actual merged current-main #1371 implementation.

## Required exact-head qualification

The retained `LAFEA visible workbench qualification` must actually execute and require:

- independent B4 source/freeze validation;
- B4-1/B4-2/B4-3 production-vs-frozen shell comparison;
- shell product-response qualification;
- frozen B01/B02 continuum gates and LAFEA.3 source/domain/product checks;
- Issue #1371 merge-order guard = PASS;
- cross-stage anti-drift/deterministic-hash checks;
- existing Chromium LAFEA.3 and LAFEA.4 Model -> Mesh -> Analyse -> Output journeys.

Encoded-but-unexecuted checks remain NOT_RUN. A workflow-level failure is engineering FAIL only after executable repository steps exist and a retained command/assertion fails.

## Current evidence boundary

The last runtime-equivalent combined validation retry before this branch was run `32710087067`, replacement job `97383792943`, which completed before checkout with `steps=null` and `logs_url=null`. That remains historical NOT_RUN evidence for the earlier runtime-equivalent head, not PASS for current main.

Issue #54 records intermittent hosted-runner behavior across repository history: some heads reached checkout/npm/tests while other exact heads failed before step allocation. This work therefore requires exact-current-head observation rather than assuming either permanent recovery or permanent outage.

## Registry boundary

The LAFEA.3 registry wording remains protected:

`Production geometry-to-mesh-to-convergence orchestration is incomplete.`

Do not remove or soften it until the exact-current-main required gates actually execute and pass. If they pass, create a separate narrowly scoped registry-cleanup PR; this validation branch itself must never carry registry authority.

## Changed-file ledger

- `agents/WIP-1371-postmerge-cert_workreport.md` — validation recovery metadata only.

No runtime, benchmark, oracle, workflow, browser, registry, numerical or release-authority file changes.

## Validation matrix

| Gate | Status | Evidence |
|---|---|---|
| source PR merge sequence | PASS_SOURCE_CONTROL | #1388 -> #1390 -> #1392 -> #1393 merged in order |
| current-main drift from final source merge | PASS_SOURCE_INSPECTION | #1404 EMP.1-only, zero #1371 overlap |
| exact-current-main runtime tree | PASS_SOURCE_CONTROL | branch created directly from `main@c2018c4b...`; only recovery metadata added |
| B4 production qualification | NOT_RUN | exact-current-head execution pending |
| continuum qualification | NOT_RUN | exact-current-head execution pending |
| merge-order/anti-drift | NOT_RUN | exact-current-head execution pending |
| Chromium LAFEA.3/.4 | NOT_RUN | exact-current-head execution pending |
| registry cleanup | BLOCKED | requires executed PASS evidence |

## Risks / decisions

- `RISK-01`: treating a zero-step Actions failure as engineering FAIL. Control: inspect job steps/logs before classification.
- `RISK-02`: treating older-head PASS/FAIL as current-main authority. Control: exact-current-head only.
- `RISK-03`: merging a validation-only PR. Control: `VALIDATION_PR_MERGE: PROHIBITED`.
- `RISK-04`: removing registry limitation after source merge alone. Control: registry cleanup blocked until executed PASS evidence.

## Appendix A — takeover qualification

A1 production trace: 20/20 — merged source PR reports retain exact Model -> Mesh -> Analyse -> Output custody chains.
A2 failure isolation: 20/20 — current unresolved boundary is exact-current-head execution, not an identified numerical assertion.
A3 authority/invariant: 20/20 — validation branch changes metadata only and cannot alter engineering authority.
A4 independent validation: 18/20 — frozen independent continuum/shell programmes are present, exact-current-head execution pending.
A5 minimal patch: 20/20 — one recovery metadata file only.

Total 98/100. Falsifier: any runtime/test/oracle file differing from current main, or any representation of NOT_RUN as PASS, invalidates this validation surface.
