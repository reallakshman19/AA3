# PR1229 Work Report — LoadCalc Support-Load Execution Indexing

## Identity

- PR: #1229
- Branch: `agent/loadcalc-performance-weight-indexes-main33a1c`
- Exact creation base SHA: `33a1c66539d9ac48e4d95fa5de86bd81e0bb3361`
- Criticality: `ENGINEERING_CRITICAL`
- Merge authority: OWNER ONLY
- PR state: DRAFT
- Latest inspected mergeability: `true`

## Mission

Optimize the existing LoadCalc empirical support-load execution path by eliminating repeated discovery/index construction only. Preserve every current engineering equation, support qualification, application-point authority, blocker/exclusion, equilibrium check, evidence field and output schema.

## Implemented hypothesis

The current-main baseline repeated case-independent discovery:

1. `entityById` was rebuilt once per load case.
2. `edgeById` was rebuilt once per route per load case.
3. `route.entityChainages.find(...)` linearly scanned route chainages for each physical edge.
4. qualified route-support projection was rebuilt once per route per load case despite being case-independent.
5. `supportResults()` rescanned the complete contribution ledger for each support site.

The PR moves those lookups to one execution index plus a per-case contributor index.

## Implementation

`support-load-distribution-v3.js` now builds once per distribution:

```text
entityById
edgeById
routeById -> chainageByEntityId
routeById -> qualified supports for READY routes only
```

The support projection is populated only when:

```text
globalBlockers.length === 0 && route.status === 'READY'
```

which matches the old authority/evaluation boundary.

Per case, `contributorsBySite` is updated in `recordContribution()`. A Set suppresses duplicate site IDs within one contribution, matching the old `allocations.some(...)` contributor semantics, while append timing preserves contribution-ledger order.

Aggregate performance counters are module-local and excluded from engineering output.

## Protected invariants

- No mass formula changes.
- No EMPTY/OPE/HYD equation changes.
- No component CoG authority changes.
- No support capability/tolerance changes.
- No distribution/bracketing algorithm changes.
- No equilibrium equation/tolerance changes.
- No configured-default semantics changes.
- No blocker/exclusion schema changes.
- No evidence schema/hash-domain changes.
- No output schema change.
- No workflow-file changes.

## Quantitative prediction

Let:

```text
C = active load-case count
R = route count
N = dataset entity count
E = global route edge count
Er = physical edges in route r
```

Baseline discovery work approximately:

```text
entity map entries      C*N
edge map entries        C*R*E
chainage comparisons    up to C*sum(Er^2)
support projection      C*R builds
support contributors    sites * ledger scans
```

Target:

```text
entity map entries      N
edge map entries        E
chainage index entries  sum(Er)
chainage lookup         O(1) per physical edge
support projection      <= R builds
support contributors    indexed during ledger recording
```

These are algorithmic operation-count predictions, not wall-clock claims.

## Falsifier

Quarantine/supersede the patch if exact-head equivalence shows any change in:

- route/support ordering;
- contributor ordering;
- blockers/exclusions;
- contribution mass/force/chainage/allocations;
- support reaction values;
- equilibrium totals/residuals;
- output/evidence semantic identity for equivalent authoritative input.

## Coordination / overlap

Live open-PR inspection performed before production mutation.

- PR #1228: LAFEA qualification carrier; no relevant LoadCalc authority overlap identified.
- PR #1227: Master/Preview performance; separate code slice.
- PR #1150: empirical calculation V3 safety/evidence foundation may share empirical-calculation authority. Connector changed-file lookup returned 404, so exact-file overlap remains unverified.

Classification:

```text
SOFTWARE FILE OVERLAP with #1150: UNKNOWN
ENGINEERING AUTHORITY OVERLAP with #1150: POSSIBLE
```

Mitigation: PR #1229 remains lookup/index-only and does not alter method/version/authority semantics. Recheck #1150 before any merge-ready disposition.

## Changed-file ledger

- `src/workspace/engineering-loads/support-load-distribution-v3.js`
- `scripts/support-load-performance-index-check.mjs`
- `agents/WIP-loadcalc-weight-indexes_workreport.md` (pre-PR durable handover)
- `agents/PR1229_workreport.md`

## Validation ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| Live-main grounding | PASS | GitHub metadata/source inspection | repository source |
| Active PR overlap scan | PASS with UNKNOWN #1150 file detail | open PR search; #1150 file endpoint unavailable | GitHub metadata |
| Production source reconstruction review | PASS | current-main file reread in bounded ranges before replacement | repository source |
| PR mergeability | PASS | GitHub reports mergeable=true on latest inspection | GitHub merge calculation |
| Structural index guard | NOT_RUN | `scripts/support-load-performance-index-check.mjs` authored | implementation-coupled structural check |
| Existing empirical numerical/output equivalence | NOT_RUN | executable checkout unavailable | existing repository engineering regression |
| Local checkout attempt | NOT_RUN / INFRASTRUCTURE_BLOCKED | `git ls-remote` failed: `Could not resolve host: github.com` | local execution environment |
| Full repository gates | NOT_RUN | Actions/check execution unavailable in connector/session | repository gates |

No NOT_RUN result is represented as PASS.

## Risks

- `RISK-1229-01`: possible authority overlap with open PR #1150.
- `RISK-1229-02`: exact numerical/output equivalence has not executed.
- `RISK-1229-03`: module-level counters must remain outside engineering output and not become authority.

## Current highest risk

Exact-head numerical/output equivalence is NOT_RUN.

## EXACT_NEXT_ACTION

```text
Run the structural guard plus existing empirical qualification on the exact PR head when an executable checkout is available; compare output/evidence identity to baseline; recheck #1150 overlap; only then consider the next case-independent mass-precompute optimization.
```
