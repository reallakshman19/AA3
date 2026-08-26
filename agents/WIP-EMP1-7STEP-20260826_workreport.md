# WIP-EMP1-7STEP-20260826 — seven-step professional EMP.1 workflow

## CURRENT RECOVERY STATE

```text
HANDOVER_READINESS: READY_FOR_PR_ALLOCATION
PR_RECOVERY_STATE: HEALTHY_NEW_WIP
TAKEOVER_AUTHORITY: WRITE_ALLOWED_PRESENTATION_ONLY
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1447
MERGE_AUTHORITY: NOT_GRANTED
CRITICALITY: ENGINEERING_CRITICAL
ISSUE: #1447
UMBRELLA: #1389
BRANCH: agent/issue-1447-emp1-seven-step-workflow-20260826
BASE_MAIN: 29c688db4a021db900d1f8c67f56f777f73f4ddc
BASE_TREE: 60d0fa231c52a561b9d6cc50d1099abff8500880
GROUNDING_EPOCH: GE-WIP-7STEP-001
CURRENT_STAGE: PR_ALLOCATION
CURRENT_BLOCKER: executable browser/Node validation remains NOT_RUN under #54; presentation work only
HIGHEST_RISK: presentation step status becoming a second engineering authority or hiding stale C evidence
EXACT_NEXT_ACTION: allocate draft PR, migrate WIP recovery records, implement seven-step pure presentation over existing A/B/C governed state.
```

## Pre-patch defect

`renderEmp1AssessmentWorkflow()` exposes `projection.steps` directly as A/B/C buttons. #1389 requires the professional presentation sequence `Basis & Source → Geometry → Loads → Load Transfer → Section Screening → Local Correlation → Review & Evidence`; these are presentation tasks, not calculators.

## Intended technical scope

1. `src/workspace/emp1-professional-workflow-presentation.js` (new pure projection)
2. `src/workspace/lafea-guided-workflow-view.js`
3. `scripts/emp1-professional-workflow-check.mjs` (new)
4. focused browser/source regression only if needed

No `src/core/emp1/**`, WRC mechanics, route/registry, source/oracle/tolerance, release profile/evidence, or workflow YAML mutation.

## Appendix A

A1 Production Trace 20/20 — current main constructs governed A/B/C in `buildEmp1ProductProjection()`, augments C currentness in `LafeaWorkbenchView`, and renders `renderEmp1AssessmentWorkflow()` before source/evidence/run/result cards.

A2 Failure Isolation 20/20 — defect is primary workflow presentation exposing A/B/C implementation structure; numerical mechanics are not implicated.

A3 Authority / Invariant 20/20 — seven-step status must derive only from existing A/B/C projection/currentness and never create run/source/release authority.

A4 Independent Validation 19/20 — exact label/order/backing-map can be source-checked; browser execution remains NOT_RUN under #54.

A5 Minimal Patch 20/20 — one pure presentation module, one view integration, one focused checker plus recovery records.

**99/100; minimum 19/20 — WRITE_ALLOWED presentation-only.**