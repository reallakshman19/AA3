# PR1407 — Issue #1371 exact-current-main certification

## Recovery header

```text
HANDOVER_READINESS: READY_FOR_VALIDATION
PR_RECOVERY_STATE: CONTINUE
TAKEOVER_AUTHORITY: VALIDATION_METADATA_AND_COMMENT_ONLY_TRIGGER
EXECUTION_MODE: AUTO
MERGE_AUTHORITY: OWNER_ONLY
VALIDATION_PR_MERGE: PROHIBITED
SOURCE_TASK: Issue #1371
PR: #1407 (DRAFT / VALIDATION ONLY)
BRANCH: agent/issue-1371-postmerge-cert-a59547c-20260824
LIVE_MAIN_AT_BRANCH: a59547c8554b6244b2ea94aedd4d59fa0fb15d1f
APPLICATION_RUNTIME_DIFF_FROM_MAIN: NONE
CURRENT_STAGE: EXACT_CURRENT_MAIN_CERTIFICATION
EXACT_NEXT_ACTION: use one comment-only line in retained visible-workbench workflow to satisfy its existing pull_request path filter; inspect exact-head steps/logs; restore workflow byte-for-byte; close PR1407 unmerged; only executed all-gates PASS may unlock a separate registry-cleanup PR.
```

## Grounding and drift

Issue #1371 implementation PRs #1388, #1390, #1392 and #1393 are merged. Prior certification epoch targeted `c2018c4b81e4c45f151ad7e59efd7d903ad7de97`. Live main is now `a59547c8554b6244b2ea94aedd4d59fa0fb15d1f` after owner-merged EMP.1 #1401.

AD-01: SAFE. The only new files are `agents/PR1401_workreport.md`, `agents/claims/PR1401.yaml`, and `agents/status/PR1401.yaml`; there is no #1371 LAFEA runtime/oracle/browser/carrier/registry overlap.

Immutable exact-main ref `validation/issue-1371-merged-a59547c` is verified IDENTICAL to main (0 ahead, 0 behind, 0 changed files).

## Exact qualification required

The retained `LAFEA visible workbench qualification` must actually execute and pass:

- independent frozen shell source checks;
- B4-1/B4-2/B4-3 production-vs-frozen comparison;
- shell product-response path;
- frozen B01/B02 continuum checks plus LAFEA.3 source/domain/product custody;
- Issue #1371 merge-order guard;
- cross-stage anti-drift and deterministic hashes;
- existing Chromium LAFEA.3 and LAFEA.4 Model -> Mesh -> Analyse -> Output journeys;
- build and clean-tree checks.

Encoded but unexecuted = NOT_RUN. A workflow conclusion alone is not an engineering FAIL if no repository step exists.

## Infrastructure context

PR #1406 independently falsified `ubuntu-latest` label routing as the cause: explicit `ubuntu-24.04` jobs `32717605012/97402064994`, `32717605022/97402064877`, and `32717605065/97402064864` all returned `steps=null`, `logs_url=null`. No #1371 workflow/source mutation is justified from that result.

## Registry boundary

Issue #1371 §17 is binding: only after all relevant gates pass may registry wording be proposed for change. Protected wording remains:

`Production geometry-to-mesh-to-convergence orchestration is incomplete.`

PR1407 has no registry authority and must never be merged.

## Validation matrix

| Gate | Status |
|---|---|
| source implementation merged | PASS_SOURCE_CONTROL |
| current-main drift | PASS_SOURCE_INSPECTION |
| immutable exact-main ref | PASS_SOURCE_CONTROL |
| application/runtime equality to main | PASS_SOURCE_CONTROL |
| workflow trigger semantic equality | PENDING comment-only trigger |
| B4 production qualification | NOT_RUN |
| continuum qualification | NOT_RUN |
| merge-order/anti-drift | NOT_RUN |
| Chromium LAFEA.3/.4 | NOT_RUN |
| registry cleanup | BLOCKED |

## Risks

- RISK-01 zero-step Actions failure mislabeled engineering FAIL;
- RISK-02 prior-head evidence treated as exact-current-head authority;
- RISK-03 validation PR accidentally merged;
- RISK-04 registry limitation removed without executed all-gates PASS.

## Appendix A

A1 trace 20/20; A2 failure isolation 20/20; A3 authority/invariant 20/20; A4 independent validation 18/20 pending exact-head execution; A5 minimal patch 20/20. Total 98/100.
