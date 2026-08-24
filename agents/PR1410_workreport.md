# PR1410 — Issue #1371 exact-current-main certification

## Recovery header

```text
HANDOVER_READINESS: READY_FOR_VALIDATION
PR_RECOVERY_STATE: CONTINUE
CRITICALITY: ENGINEERING_CRITICAL
PR: #1410 (DRAFT / VALIDATION ONLY)
BRANCH: agent/issue-1371-postmerge-cert-14c648d-20260824
LIVE_MAIN_AT_BRANCH: 14c648d485cf386f28c6817a068b7eb5da1f7689
IMMUTABLE_EXACT_MAIN_REF: validation/issue-1371-merged-14c648d
EXECUTION_MODE: AUTO
MERGE_AUTHORITY: OWNER_ONLY
VALIDATION_PR_MERGE: PROHIBITED
APPLICATION_RUNTIME_DIFF_FROM_MAIN: NONE
CURRENT_STAGE: EXACT_CURRENT_MAIN_CERTIFICATION
```

## Grounding and drift

Issue #1371 implementation PRs #1388, #1390, #1392 and #1393 are merged. Previous certification epoch targeted `a59547c8554b6244b2ea94aedd4d59fa0fb15d1f` and ended NOT_RUN / PRE_STEP_INFRASTRUCTURE_FAILURE.

Live main advanced to `14c648d485cf386f28c6817a068b7eb5da1f7689` via owner-merged EMP.1 #1408. Exact compare from the previous epoch contains six EMP.1 files only:
- `agents/PR1408_workreport.md`
- `agents/claims/PR1408.yaml`
- `agents/status/PR1408.yaml`
- `src/core/emp1/emp1-c-bounded-route-registry.js`
- `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js`
- `validation/emp1/wrc537-2013/gamma5-zero-dp-route-authorization-v1.json`

AD-01 = SAFE / EMP1_ONLY_NO_LAFEA1371_AUTHORITY_OVERLAP. No LAFEA runtime/oracle/browser/workflow/registry path changed.

Immutable ref `validation/issue-1371-merged-14c648d` points exactly to current main.

## Exact qualification required

The retained `LAFEA visible workbench qualification` must actually execute and pass:
- independent frozen shell source checks;
- B4-1/B4-2/B4-3 production-vs-frozen comparison;
- shell product-response path;
- frozen B01/B02 continuum checks plus LAFEA.3 source/domain/product custody;
- Issue #1371 merge-order guard;
- cross-stage anti-drift and deterministic hashes;
- Chromium LAFEA.3 and LAFEA.4 Model -> Mesh -> Analyse -> Output journeys;
- build and clean-tree checks.

Encoded but unexecuted = NOT_RUN. A workflow conclusion is not an engineering FAIL when no repository step exists.

## Trigger boundary

The workflow is pull-request path filtered. PR1410 may add exactly one comment-only line to `.github/workflows/lafea-visible-workbench.yml` to satisfy the existing path filter. No key, runner, permission, trigger, command, benchmark, Chromium route, or workflow semantic may change. After classification, restore the workflow blob byte-for-byte and close PR1410 unmerged.

## Registry boundary

Issue #1371 §17 remains binding. Protected wording remains:

`Production geometry-to-mesh-to-convergence orchestration is incomplete.`

No registry-cleanup proposal is allowed until all relevant exact-head gates actually execute and pass.

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

- zero-step Actions failure mislabeled engineering FAIL;
- prior-head evidence treated as current-head authority;
- validation PR accidentally merged;
- registry limitation removed without executed all-gates PASS.

EXACT_NEXT_ACTION: add one comment-only workflow line; inspect exact-head steps/logs; classify; restore workflow byte-for-byte; close PR1410 unmerged unless all gates genuinely execute and pass, in which case retain evidence and open a separate registry-cleanup PR.

## Appendix A

A1 trace 20/20; A2 failure isolation 20/20; A3 authority/invariant 20/20; A4 independent validation 18/20 pending exact-head execution; A5 minimal patch 20/20. Total 98/100.
