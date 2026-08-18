# PR1227 Work Report — LoadCalc Master/Preview Performance

## Identity

- PR: #1227
- Branch: `agent/loadcalc-performance-master-transaction`
- Original base SHA: `460c79990e8c3c8572ffeb408159a6f12cf4f723`
- Current recorded PR head before this work-report commit: `5b8027351e5a9c714a8e31033a3608355facd28c`
- Criticality: `ENGINEERING_CRITICAL`
- Merge authority: OWNER ONLY
- PR state: DRAFT

## Mission

Reduce LoadCalc Master Data and Master Preview redundant work without changing engineering equations, master-data authority, source provenance hashes, calculation semantics, or fail-closed behavior.

Approved architectural rule:

```text
Hashes establish engineering identity.
Revisions establish runtime currentness.
Indexes eliminate repeated discovery.
Transactions ensure one logical change causes one invalidation.
```

## Scope implemented

1. Transactional master import and mapping commit.
2. Per-master IndexedDB row persistence with legacy aggregate read compatibility.
3. Monotonic per-master runtime revisions, separate from source hashes.
4. Draft-only mapping edits until explicit validated Apply Mapping.
5. Lazy/cached/debounced Master Preview full-text search.
6. Reuse already-normalized master rows for Preview search.
7. Eliminate per-row Line List mapping/config parsing in Preview search.
8. Aggregate operation counters for source-level/performance qualification.

## Protected invariants

- Source SHA/sourceHash remains engineering provenance identity.
- Runtime master revision is not a substitute for source identity.
- Failed draft mapping validation must not replace the last valid authoritative mapping.
- Preview/calculation consume only applied `masterContext` state.
- Search indexes are presentation-only and never calculation authority.
- No tolerance, formula, load, density, support, topology, or empirical-calculation semantics are modified.
- No workflow-file changes.

## Quantitative predictions

### Logical master import

Before:

```text
3 controller mutations
3 persistence snapshots
3 MASTER_DATA_UPDATED events
```

After:

```text
1 controller mutation
1 changed-master persistence request
1 MASTER_DATA_UPDATED event
```

Operation-count reduction: 3 -> 1 = 66.7% fewer persistence/event operations for this path.

### Initial Master Preview

For a 10,000-row master with 50 visible preview rows:

Before: full search-row construction occurred during initial render.

After: full-search source-row visits = 0 until the first non-empty query; initial render uses the existing 50-row preview only.

These are operation-count predictions, not wall-clock claims.

## Issues / risks

- `ISS-1227-01`: Exact-head executable qualification is not available in the current connector/local environment.
- `RISK-1227-01`: PR base has drifted since creation. Live `main` later advanced to `33a1c66539d9ac48e4d95fa5de86bd81e0bb3361`; rebase/reconciliation is required before merge review.
- `RISK-1227-02`: IndexedDB V1->V2 migration path is read-compatible but executable browser persistence migration remains NOT_RUN.
- `RISK-1227-03`: Draft mapping UX must remain visibly distinguishable from applied engineering state.

## Decisions

- `DEC-1227-01`: Keep legacy atomic setters for compatibility; production Master UI uses transactional APIs.
- `DEC-1227-02`: Runtime revisions are monotonic within process lifetime, including Clear.
- `DEC-1227-03`: Do not persist derived Preview search indexes.
- `DEC-1227-04`: Full search materialization is lazy and presentation-only.

## Changed-file ledger

- `src/workspace/master-data-controller.js`
- `src/workspace/master-data-ui.js`
- `src/calc-workspace/cii-standalone-port/xml-cii-master-context.js`
- `src/calc-workspace/cii-standalone-port/ui-adapted/xml-cii-adapted-import-masters.js`
- `src/calc-workspace/cii-standalone-port/ui-adapted/xml-cii-adapted-import-preview-search.js`
- `scripts/master-data-containment-check.mjs`
- `agents/PR1227_workreport.md`

## Validation ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| Current-main source reread before initial mutation | PASS | GitHub connector source fetch | repository source |
| PR diff/source review | PASS | Connector diff inspection | source-level structural review |
| Master operation-count assertions | NOT_RUN | Regression script authored | implementation-coupled executable check |
| Browser IndexedDB migration | NOT_RUN | No executable browser path in session | browser behavior |
| Master UI draft/applied interaction | NOT_RUN | Source contract authored | browser behavior |
| Full repository gates | NOT_RUN | GitHub Actions endpoint unavailable; no local checkout/`gh` | repository gates |

No NOT_RUN result is represented as PASS.

## Coordination

At latest inspection, open PRs include unrelated LAFEA/WRC work plus empirical-calculation PR #1150. PR #1227 modifies Master/Preview paths, not the support-load mechanics file targeted by the next performance slice. Exact overlap with stale/open empirical branches must be reassessed before any merge/rebase.

## Highest current risk

Base drift plus lack of executable exact-head qualification.

## EXACT_NEXT_ACTION

```text
Reconcile PR #1227 onto the then-current main, inspect conflicts/overlap, run master-data containment + browser persistence/UI qualification on the exact reconciled head, and keep draft until those results are recorded.
```
