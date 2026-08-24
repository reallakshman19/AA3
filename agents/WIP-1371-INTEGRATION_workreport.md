# Issue #1371 — A→B→C→D combined validation overlay

## Recovery header

```text
HANDOVER_READINESS: READY_FOR_VALIDATION
PR_RECOVERY_STATE: CONTINUE
TAKEOVER_AUTHORITY: VALIDATION_WRITES_ONLY
EXECUTION_MODE: MANUAL
AUTO_STATE: VALIDATING_COMBINED_HEAD
MERGE_AUTHORITY: OWNER_ONLY
SOURCE_TASK: Issue #1371
BRANCH: agent/issue-1371-integration-validation-20260824
LIVE_MAIN_AT_COMPOSITION: e985b50d81d0d241db27313562c8cc12cd7cc27d
RUNTIME_OVERLAY_COMMIT: e532a2337b99f3d3eac6c36eee1f28a4126e963b
EXACT_NEXT_ACTION: open a draft validation PR and execute the existing visible-workbench qualification on the exact combined head; do not merge this validation PR.
```

## Mission

Produce a temporary, non-authorizing validation head that is runtime-equivalent to applying Issue #1371 phases in the required order:

```text
PR-A #1388 → PR-B #1390 → PR-C #1392 → PR-D #1393
```

This branch does not merge, close, supersede or retarget those source PRs. Owner merge authority for each source PR remains unchanged.

## Composition authority

The overlay was created directly from `main@e985b50d81d0d241db27313562c8cc12cd7cc27d` by replacing only the exact engineering/test blobs changed by the four source PRs. Per-PR `agents/**` metadata was deliberately not copied; those files do not participate in runtime qualification.

Source PR heads used for the overlay:

- #1388: `35bfe49fa5f8c1ca8f1e7c704fe91c35e6c42906`
- #1390: `1a6602aff6caa8404affadcc9d431fac8b2ec7c6`
- #1392: `dd48b454eb6a8073a94f90a0c08ec5a437dc184a`
- #1393: `c6246167ca4513eb7d8292135d259043fccee6c1`

No exact engineering/test path conflict exists among the four overlays. No manual conflict resolution was performed.

## Required combined-head gates

The existing `LAFEA visible workbench qualification` lane must execute, on this exact head:

- frozen LAFEA.4 B4 definition validation;
- B4-1/B4-2 production-vs-frozen shell comparison;
- existing shell response qualification;
- LAFEA.3 frozen B01/B02 gates followed by PR-B source/domain/product checks;
- PR-D merge-order guard, which must be **PASS** (not `NOT_APPLICABLE`) because PR-B is present;
- cross-stage source/mesh invalidation and deterministic hash checks;
- existing Chromium LAFEA.3 and LAFEA.4 Model→Mesh→Analyse→Output journeys.

## Validation truth before PR allocation

| Gate | Status | Observation | Oracle |
|---|---|---|---|
| live-main drift | PASS | main advanced only by unrelated EMP.1 #1394 | SOURCE_INSPECTION |
| exact-path overlay conflicts | PASS | none across 23 runtime files | DIFF/FILE INSPECTION |
| frozen B4 values mutated by integration | PASS | exact source PR blobs reused | FROZEN_ANALYTICAL |
| combined executable checks | NOT_RUN | validation PR not yet allocated | PRODUCT/FROZEN |
| Chromium | NOT_RUN | validation PR not yet allocated | PRODUCT_REGRESSION |

No unexecuted gate is represented as PASS.

## Highest risks

- The first executable combined head may expose a real PR interaction not visible on standalone branches.
- The PR-D merge-order guard must prove edited-source parent regeneration with PR-B present.
- The hosted runner has repeatedly failed before checkout with `steps=null`; if repeated here, classify `NOT_RUN / INFRASTRUCTURE`.
- B4-3 remains `BLOCKED_SOURCE_REQUIRED`; this validation branch must not fabricate a reference value.

## Authority boundaries

No merge authority, registry authority, release authority, unsupported shell formulation, remeshed nodal-load transfer, partial-boundary mapping, tolerance weakening or oracle mutation is introduced by this validation branch.

The LAFEA.3 registry limitation remains protected until executed exact-head evidence passes on merged code.

## Appendix A — takeover qualification

This validation overlay inherits the completed #1371 takeover qualification basis from PR-A/B/C/D. The new decision is limited to source-control composition and validation plumbing. Score: 96/100; each section remains at least 19/20. Falsifier: any overlay file whose blob differs from its cited source-PR version or any hidden conflict resolution invalidates this branch and requires reconstruction.
