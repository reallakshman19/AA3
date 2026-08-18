# PR1248 — Current-Main Production Bundle Hard-Ceiling Repair

# CURRENT STATE — READ FIRST

```text
HANDOVER_READINESS: READY_FOR_CONTINUATION
REPOSITORY: reallaksh19/Advanced_Analysis
PR: #1248 (draft)
BRANCH: agent/main-bundle-hard-ceiling-repair-20260818
BASE_SHA: 585a897afa0f5c9799cb68a58de00a55808062b3
EXECUTION_MODE: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
CURRENT_STAGE: SECOND_BOUNDED_LEAF_AUDIT
CURRENT_BLOCKER: first leaf recovered 16,364 B; 9,215 B remains over 1,179,648 B ceiling
EXACT_NEXT_ACTION: audit a second presentation-only leaf sized to recover >9,215 B; do not mutate until import direction/top-level state are source-qualified. After any second split, require hard-ceiling PASS followed by Chromium generated-chunk boot.
```

## Mission
Restore the existing production bundle hard-ceiling gate on current main as a prerequisite for PR #1246 TECH-13 exact-head qualification.

Authoritative baseline:

```text
hard ceiling                         1,179,648 B
exact-main main chunk                 1,205,227 B
required recovery                        25,579 B
```

PR #1246's additional 22,238 B is a separate incremental concern. PR #1248 owns the pre-existing current-main debt only unless explicitly re-scoped.

## Constraints / Falsifiers
- Do not raise/bypass `bundle-chunk-check.mjs`.
- Do not force stateful controllers/stores/workbenches into chunks based on size alone.
- Chunk-size PASS with TDZ/evaluation-order/browser failure is FAIL.
- No engineering calculations, mesh/solver policy, TECH-13 authority, or release-state changes.
- Browser boot of generated production chunks is mandatory after the byte gate passes.
- No merge without explicit owner authorization.

## Validation Ledger
### VAL-BASE-BUNDLE-01 — FAIL / PREEXISTING_BY_EXACT_EXECUTION
Exact-main application source `585a897a...`: main chunk `1,205,227 B`; ceiling `1,179,648 B`; deficit `25,579 B`.

### VAL-PROFILE-01 — PASS
Run `32098815421`, artifact `9310846299`. Rollup profile of 333 main-entry modules. Largest contributors included controller `41,758 B`, `load-calc-consumer-view.js 32,589 B`, stateful linear-piping workbench `28,104 B`, LAFEA discretization panel `25,745 B`, and `lafea-results-view.js 22,205 B`.

### VAL-CANDIDATE-1-SOURCE-01 — PASS
`load-calc-consumer-view.js` is presentation-only at module load, with no controller/store/singleton; its sole source dependency is the import-free topology gap policy. Stateful consumer controller remains graph-owned.

### VAL-CANDIDATE-1-BYTES-01 — FAIL / INSUFFICIENT
Exact head `7026821af2bc9c3e11cdfef9bd4beb02075fc643`, run `32099451684`, artifact `9311059672`:

```text
exact-main baseline                  1,205,227 B
post-split main chunk                1,188,863 B
reduction                               16,364 B
leaf chunk                              21,641 B
remaining over ceiling                   9,215 B
recovered fraction of requirement       63.974%
```

The single leaf does not satisfy the hard gate. Chromium proof is therefore `NOT_RUN`, not PASS.

### VAL-CANDIDATE-1-CYCLE-01 — NO NEW CANDIDATE CYCLE OBSERVED
Captured production log contains one circular-chunk warning only:
`core-fea-benchmarks -> core-application -> core-fea-benchmarks`.
No warning names `load-calc-consumer-view`. This does **not** prove runtime safety; browser remains required after byte PASS.

## Candidate ranking / exclusions
- `load-calc-consumer-controller.js 41,758 B`: stateful controller — excluded from size-only splitting.
- `linear-piping-results-workbench.js 28,104 B`: stateful workbench — excluded.
- `lfea-preflight-ui.js 22,241 B`: has module-level mutable `phase1ReviewSurfaceHandle` and imports `masterDataController` singleton — excluded.
- `lafea-results-view.js 22,205 B`: next read-only audit candidate; no mutation authorized until its presentation dependencies are checked.

## Current Production Mutation
`vite.config.js` currently contains one bounded rule:
`load-calc-consumer-view.js -> load-calc-consumer-view`.
It remains provisional because byte gate has not passed and browser proof is NOT_RUN.

## Changed-File Ledger
1. `vite.config.js` — provisional first presentation leaf split.
2. `scripts/lafea-bundle-main-module-profile.mjs` — diagnostic Rollup rendered-byte profile.
3. `scripts/lafea-bundle-build-size-evidence.mjs` — exact failed-build chunk/shortfall/cycle evidence.
4. `scripts/lafea-bundle-production-browser-boot.mjs` — generated production chunk Chromium falsifier; not yet executed because byte gate fails.
5. `.github/workflows/lafea-visible-workbench.yml` — temporary prerequisite instrumentation to run profile/build/evidence/browser before known unrelated shell regression.
6. `agents/PR1248_workreport.md` — living authority.

## Exact Continuation State
```text
1. Source-audit lfea-results-view.js and its presentation dependencies.
2. If and only if one-way/stateless, add bounded second presentation chunk.
3. Run exact build evidence; require main <= 1,179,648 B.
4. If byte PASS, install Chromium and execute production-preview boot proof.
5. Any generated-cycle/TDZ/page/console error rejects the chunk design.
6. Then clean temporary diagnostics and preserve a minimal regression carrier.
7. Keep draft; no merge without owner authorization.
```
