# WIP — Issue #1371 exact-main certification at 14c648d

```text
HANDOVER_READINESS: READY_FOR_VALIDATION
PR_RECOVERY_STATE: WIP_PRE_PR
CRITICALITY: ENGINEERING_CRITICAL
SOURCE_TASK: Issue #1371
BRANCH: agent/issue-1371-postmerge-cert-14c648d-20260824
LIVE_MAIN_AT_BRANCH: 14c648d485cf386f28c6817a068b7eb5da1f7689
IMMUTABLE_EXACT_MAIN_REF: validation/issue-1371-merged-14c648d
EXECUTION_MODE: AUTO
MERGE_AUTHORITY: OWNER_ONLY
VALIDATION_BRANCH_MERGE: PROHIBITED
APPLICATION_RUNTIME_DIFF_FROM_MAIN: NONE
CURRENT_STAGE: EXACT_CURRENT_MAIN_CERTIFICATION
```

Current-main drift from the previous #1371 certification epoch is owner-merged EMP.1 #1408 only. Exact compare `a59547c... -> 14c648d...` contains six EMP.1 files and zero LAFEA runtime/oracle/browser/workflow/registry overlap.

Issue #1371 implementation PRs are already merged. This branch exists only to trigger the retained path-filtered `LAFEA visible workbench qualification` against exact current-main code. A single comment-only line may be added to `.github/workflows/lafea-visible-workbench.yml`; no workflow semantics, application/runtime/test/oracle code, registry wording, benchmark target, or tolerance may change.

PASS requires executed exact-head evidence for B4-1/B4-2/B4-3, LAFEA.3 continuum qualification, merge-order/cross-stage anti-drift, Chromium LAFEA.3/.4 journeys, build and clean-tree checks. Encoded but unexecuted remains NOT_RUN.

Protected registry wording remains `Production geometry-to-mesh-to-convergence orchestration is incomplete.` and cannot change until all relevant gates execute and pass.

EXACT_NEXT_ACTION: allocate draft validation PR; replace WIP recovery with PR-numbered workreport/status/claim; add one comment-only workflow trigger; inspect exact-head job steps/logs; classify honestly; restore workflow byte-for-byte; close validation PR unmerged.

Appendix A: A1 20/20; A2 20/20; A3 20/20; A4 18/20 pending execution; A5 20/20. Total 98/100.
