# PR1405 — Issue #1371 post-merge exact-current-main certification

## Recovery header

```text
HANDOVER_READINESS: READY_FOR_VALIDATION
PR_RECOVERY_STATE: CONTINUE
TAKEOVER_AUTHORITY: VALIDATION_METADATA_AND_COMMENT_ONLY_TRIGGER
EXECUTION_MODE: AUTO
MERGE_AUTHORITY: OWNER_ONLY
VALIDATION_PR_MERGE: PROHIBITED
SOURCE_TASK: Issue #1371
PR: #1405 (DRAFT / VALIDATION ONLY)
BRANCH: agent/issue-1371-postmerge-cert-20260824
LIVE_MAIN_AT_BRANCH: c2018c4b81e4c45f151ad7e59efd7d903ad7de97
APPLICATION_RUNTIME_DIFF_FROM_MAIN: NONE
CURRENT_STAGE: POST_MERGE_EXACT_CURRENT_MAIN_CERTIFICATION
EXACT_NEXT_ACTION: trigger the retained LAFEA visible-workbench workflow with a comment-only workflow-file touch; inspect actual steps/logs; if and only if all required gates execute and pass, open a separate registry-cleanup PR. Never merge PR1405.
```

## Mission

All Issue #1371 source PRs are already merged in required order:

1. #1388 -> `d0eab542213ff469c77dd05c093b49b5449c7a81`
2. #1390 -> `902bb2bb8f09ea2a483e96f3fb585e3139410a73`
3. #1392 -> `f412575ad3abf62ed2b4dda0fc41959456ee52cb`
4. #1393 -> `ff5a7353f3759d72ba27be37095c7f5e06b5f7e2`

Live main then advanced to `c2018c4b81e4c45f151ad7e59efd7d903ad7de97` via EMP.1 #1404. AD-01 classifies that drift SAFE: its nine paths are EMP.1 release-evidence/recovery only with no Issue #1371 LAFEA overlap.

PR1405 exists only to obtain exact-current-main executable evidence because the connected GitHub capability cannot invoke `workflow_dispatch`, while the retained visible-workbench workflow is PR path-filtered. The only planned non-recovery change is a comment in `.github/workflows/lafea-visible-workbench.yml`; workflow semantics and all application/runtime/test/oracle files remain byte-identical to current main.

## Required exact-head qualification

The retained visible-workbench lane must actually execute:

- B4 frozen source validation;
- B4-1/B4-2/B4-3 production-vs-frozen shell comparison;
- shell product response;
- frozen B01/B02 continuum gates plus LAFEA.3 source/domain/product checks;
- Issue #1371 merge-order guard = PASS;
- cross-stage anti-drift/deterministic-hash checks;
- Chromium LAFEA.3 and LAFEA.4 Model -> Mesh -> Analyse -> Output journeys;
- build and clean-tree checks already present in the carrier.

Encoded-but-unexecuted checks are NOT_RUN. Any command-level failure after steps exist is engineering evidence and must be isolated at the first wrong boundary.

## Registry boundary

Protected wording remains:

`Production geometry-to-mesh-to-convergence orchestration is incomplete.`

No registry change is authorized on this validation PR. A separate cleanup PR may be created only after executed PASS evidence.

## Validation matrix

| Gate | Status | Evidence |
|---|---|---|
| source merge order | PASS_SOURCE_CONTROL | A -> B -> C -> D merged |
| current-main drift | PASS_SOURCE_INSPECTION | #1404 EMP.1-only |
| application/runtime equality to main | PASS_SOURCE_CONTROL | branch created from current main; no application/runtime/test/oracle edits |
| workflow trigger semantic equality | PENDING_SOURCE_INSPECTION | comment-only workflow touch planned |
| B4 production qualification | NOT_RUN | exact PR1405 head pending |
| continuum qualification | NOT_RUN | exact PR1405 head pending |
| merge-order + anti-drift | NOT_RUN | exact PR1405 head pending |
| Chromium LAFEA.3/.4 | NOT_RUN | exact PR1405 head pending |
| registry cleanup | BLOCKED | executed PASS required |

## Risks / decisions

- `RISK-01`: comment-only trigger accidentally changes YAML semantics. Control: only a YAML comment line; no key/value/indentation change.
- `RISK-02`: older-head evidence substituted for current head. Control: inspect PR1405 exact-head run only.
- `RISK-03`: validation PR merged. Control: `VALIDATION_PR_MERGE: PROHIBITED`.
- `RISK-04`: zero-step failure mislabeled engineering FAIL. Control: inspect step/log payload.

## Appendix A

A1 production trace 20/20; A2 failure isolation 20/20; A3 authority/invariant 20/20; A4 independent validation 18/20 pending execution; A5 minimal patch 20/20. Total 98/100. Falsifier: any application/runtime/test/oracle diff from current main, any workflow semantic change beyond comment, or any NOT_RUN represented as PASS.
