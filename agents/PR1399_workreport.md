# PR1399 — Issue #1371 A→B→C→D combined validation overlay

## Recovery header

```text
HANDOVER_READINESS: READY_FOR_VALIDATION
PR_RECOVERY_STATE: CONTINUE
TAKEOVER_AUTHORITY: VALIDATION_WRITES_ONLY
EXECUTION_MODE: AUTO
AUTO_STATE: BLOCKED_BY_HOSTED_RUNNER_INFRASTRUCTURE
MERGE_AUTHORITY: OWNER_ONLY
VALIDATION_PR_MERGE: PROHIBITED
SOURCE_TASK: Issue #1371
PR: #1399 (DRAFT / VALIDATION ONLY)
BRANCH: agent/issue-1371-integration-validation-20260824
LIVE_MAIN_AT_COMPOSITION: e985b50d81d0d241db27313562c8cc12cd7cc27d
LATEST_RUNTIME_OVERLAY_HEAD: a1eafa5cb32dd1e0b32039794f40e13d290f8624
CURRENT_BLOCKER: exact-head hosted jobs fail before checkout with steps=null
EXACT_NEXT_ACTION: when execution is restored, run the existing visible-workbench lane and require B4-1/B4-2/B4-3, PR-B merge-order, anti-drift, continuum and Chromium gates to PASS. Never merge PR1399.
```

## Mission

PR1399 is a temporary exact-head qualification surface for:

```text
PR-A #1388 → PR-B #1390 → PR-C #1392 → PR-D #1393
```

It does not merge, close, supersede or retarget any source PR. Owner merge authority for #1388/#1390/#1392/#1393 remains unchanged.

## Composition authority

The branch is based on `main@e985b50d81d0d241db27313562c8cc12cd7cc27d`. Runtime/test paths are copied from source PRs without manual conflict resolution. PR-A was refreshed in this batch after its B4-3 source qualification; B/C/D runtime blobs remain unchanged.

Source PR heads represented by the current runtime overlay:

- #1388: `ba307e0199b065a38ecb9e85bccd7b3a97f33770`
- #1390: `1a6602aff6caa8404affadcc9d431fac8b2ec7c6`
- #1392: `dd48b454eb6a8073a94f90a0c08ec5a437dc184a`
- #1393: `c6246167ca4513eb7d8292135d259043fccee6c1`

The four refreshed PR-A blobs on PR1399 exactly equal the source PR blob identities:

```text
B4-3 definition        9b6490fca45507a25b3bdf29a4e3785dfd9d7185
B4 freeze manifest     3fbe2418ad88d0e079b8f0374305a562661b189e
independent freeze gate a84a38625b99f02044023c746d6659a380f05601
production comparator   5ea115577c3a2c69a6a3cd11746bc0b8c9471163
```

## B4-3 integration state

B4-3 is no longer `BLOCKED_SOURCE_REQUIRED`. PR-A now freezes the primary published Batoz–Bathe–Ho 1980 DKT twisting-square reference (`DOI 10.1002/nme.1620151205`) with exact source locations Figure 2 / p.1777, §4.2.2 / p.1793 and Figure 16 / p.1797.

The combined head therefore requires all three shell independent benchmarks:

1. B4-1 analytical membrane patch;
2. B4-2 analytical pure-bending patch;
3. B4-3 primary published four-triangle DKT twisting plate.

Frozen B4-3 source values include signed `FZ(C)=-22.2411080763025 N`, `UZ(O)=-1.58496 mm`, `UZ(C)=-6.33984 mm`, `Mx=My=0`, `Mxy=11.12055403815125 N`. Source-derived tolerances remain immutable. A separate diagnostic reconstruction reproduced the published solution to floating-point roundoff, but that is source-oracle sanity only and not a production PASS.

## Required exact-head gates

The existing visible-workbench lane must execute, in its retained fail-closed ordering:

1. B4 source/freeze validation;
2. B4-1/B4-2/B4-3 production-vs-frozen shell comparison;
3. existing shell response qualification;
4. frozen B01/B02 gates followed by PR-B LAFEA.3 source/domain/product checks;
5. `lafea1371-pr-b-merge-order-guard.mjs` = **PASS** because PR-B is present;
6. PR-D cross-stage anti-drift/deterministic-hash checks;
7. existing Chromium LAFEA.3/LAFEA.4 Model→Mesh→Analyse→Output journeys.

## Validation matrix

| Gate | Status | Observation | Oracle |
|---|---|---|---|
| live-main drift | PASS | main remains `e985b50d…`; #1394 is unrelated EMP.1 authority | SOURCE_INSPECTION |
| exact runtime blob composition | PASS | source-PR Git blobs copied without conflict resolution | SOURCE_CONTROL |
| B4-3 primary-source qualification | PASS_SOURCE_INSPECTION | primary DOI/page/figure/source values frozen on PR-A and copied exactly | PRIMARY_PUBLISHED_REFERENCE |
| B4-3 independent DKT source sanity | PASS_SOURCE_ORACLE_SANITY | published deflections/resultants independently reconstructed | PRIMARY_PUBLISHED_REFERENCE |
| combined Node qualification | NOT_RUN | visible-workbench run `32684270443`, job `97306324330`, `steps=null` | PRODUCT/FROZEN |
| PR-B merge-order guard | NOT_RUN | PR-B is present; job never reached checkout | CUSTODY_REGRESSION |
| cross-stage anti-drift | NOT_RUN | job never reached checkout | CUSTODY/MECHANICS_REGRESSION |
| Chromium | NOT_RUN | job never reached checkout | PRODUCT_REGRESSION |

No encoded-but-unexecuted test is represented as PASS and no engineering assertion failure has been observed.

## Result traceability / first-wrong-value rule

PR1399 introduces no new result authority. It aggregates the §14 traceability retained in PR1390/PR1392 and shell oracle custody retained in PR1388. If executable validation fails, isolate the first wrong boundary; do not change multiple mechanics, an oracle or a tolerance in one response.

## Authority boundaries

PR1399 is validation-only and **must never be merged**. It grants no production, registry, release or broader formulation authority. The LAFEA.3 registry limitation remains protected until the owner-controlled source PR sequence has executed required exact-head gates successfully.

## Appendix A

Takeover qualification remains 96/100. Falsifier: any runtime path differing from its cited source-PR blob, hidden/manual conflict resolution, or merged use of PR1399 invalidates this validation surface.
