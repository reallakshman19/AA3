# PR1399 — Issue #1371 A→B→C→D combined validation overlay

## Recovery header

```text
HANDOVER_READINESS: READY_FOR_VALIDATION
PR_RECOVERY_STATE: CONTINUE
TAKEOVER_AUTHORITY: VALIDATION_WRITES_ONLY
EXECUTION_MODE: MANUAL
AUTO_STATE: VALIDATING_COMBINED_HEAD
MERGE_AUTHORITY: OWNER_ONLY
VALIDATION_PR_MERGE: PROHIBITED
SOURCE_TASK: Issue #1371
PR: #1399 (DRAFT / VALIDATION ONLY)
BRANCH: agent/issue-1371-integration-validation-20260824
LIVE_MAIN_AT_COMPOSITION: e985b50d81d0d241db27313562c8cc12cd7cc27d
RUNTIME_OVERLAY_COMMIT: e532a2337b99f3d3eac6c36eee1f28a4126e963b
PR_HEAD_AT_ALLOCATION: 496a466dbfa2a540fdae17ac459540dcc91c1262
EXACT_NEXT_ACTION: inspect the exact PR1399 visible-workbench job; require the merge-order guard to PASS because PR-B is present. Never merge PR1399.
```

## Mission

PR1399 is a temporary exact-head qualification surface for the Issue #1371 source-PR order:

```text
PR-A #1388 → PR-B #1390 → PR-C #1392 → PR-D #1393
```

It does not merge, close, supersede or retarget any source PR. Owner merge authority for #1388/#1390/#1392/#1393 remains unchanged.

## Composition authority

The runtime overlay was built directly from `main@e985b50d81d0d241db27313562c8cc12cd7cc27d` by reusing the exact Git blob identities of 23 engineering/test paths from the source PRs. Per-PR `agents/**` metadata was intentionally excluded because it does not affect runtime qualification.

Source PR heads represented:

- #1388: `35bfe49fa5f8c1ca8f1e7c704fe91c35e6c42906`
- #1390: `1a6602aff6caa8404affadcc9d431fac8b2ec7c6`
- #1392: `dd48b454eb6a8073a94f90a0c08ec5a437dc184a`
- #1393: `c6246167ca4513eb7d8292135d259043fccee6c1`

There was no exact runtime/test path conflict and no hand-resolved merge content.

## Required exact-head gates

The existing `LAFEA visible workbench qualification` lane must execute:

1. frozen B4 definition validation;
2. B4-1/B4-2 production-vs-frozen shell comparison;
3. existing shell response qualification;
4. frozen B01/B02 gates followed by PR-B LAFEA.3 source/domain/product checks;
5. `lafea1371-pr-b-merge-order-guard.mjs` = **PASS**, not `NOT_APPLICABLE`;
6. PR-D cross-stage anti-drift/deterministic hash checks;
7. existing Chromium LAFEA.3 and LAFEA.4 Model→Mesh→Analyse→Output journeys.

B4-3 remains `BLOCKED_SOURCE_REQUIRED` and is not fabricated by this integration surface.

## Validation matrix

| Gate | Status | Observation | Oracle |
|---|---|---|---|
| live-main drift | PASS | main change #1394 is unrelated EMP.1 authority | SOURCE_INSPECTION |
| exact runtime blob composition | PASS | exact source-PR Git blobs, no conflicts | SOURCE_CONTROL |
| frozen B4 values altered by composition | PASS | exact frozen blobs reused | FROZEN_ANALYTICAL |
| combined Node qualification | NOT_RUN | exact PR1399 job pending inspection | PRODUCT/FROZEN |
| merge-order guard | NOT_RUN | PR-B is present and guard is now execution-eligible | CUSTODY_REGRESSION |
| Chromium | NOT_RUN | exact PR1399 job pending inspection | PRODUCT_REGRESSION |

No encoded-but-unexecuted test is represented as PASS.

## Result traceability / first-wrong-value rule

PR1399 does not introduce a new result contract. It aggregates the §14 traceability already retained in PR1390 and PR1392. If execution exposes a discrepancy, isolate the first wrong boundary rather than modifying multiple mechanics or an oracle.

## Highest risks

- first executable combined head may expose a genuine cross-PR interaction;
- merge-order guard may fail when PR-B is present;
- hosted Actions may again fail before checkout with `steps=null`;
- B4-3 remains source-blocked.

## Authority boundaries

PR1399 is validation-only and **must never be merged**. It grants no production, registry, release or formulation authority. It does not authorize weakened tolerances, new shell mappings, display-derived stress authority, or oracle changes.

The LAFEA.3 registry limitation remains protected until the actual source PR sequence is merged and required exact-head evidence passes.

## Appendix A

Takeover qualification remains 96/100 from the completed #1371 source-PR grounding. This PR adds only source-control composition and exact-head validation. Falsifier: any runtime path whose content differs from its cited source-PR blob, any manual conflict resolution, or any merged use of PR1399 invalidates this validation surface.
