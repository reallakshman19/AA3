# WIP-loadcalc-weight-indexes Work Report

## Identity

- WIP: `WIP-loadcalc-weight-indexes`
- Branch: `agent/loadcalc-performance-weight-indexes-main33a1c`
- Exact base SHA: `33a1c66539d9ac48e4d95fa5de86bd81e0bb3361`
- Criticality: `ENGINEERING_CRITICAL`
- Merge authority: OWNER ONLY
- PR: not yet allocated

## Mission

Optimize the existing LoadCalc empirical support-load execution path by eliminating repeated discovery/index construction only. Preserve every current engineering equation, support qualification, application-point authority, blocker/exclusion, equilibrium check, evidence field and output schema.

## Current hypothesis

The current `support-load-distribution-v3.js` performs case-independent discovery repeatedly:

1. `entityById` is rebuilt once per load case.
2. `edgeById` is rebuilt once per route per load case.
3. `route.entityChainages.find(...)` linearly scans route chainages for each physical edge.
4. qualified route-support projection is rebuilt once per route per load case despite being case-independent.
5. `supportResults()` rescans the complete contribution ledger for each support site.

These operations can be moved to a single immutable execution index and per-case contributor index without changing numerical mechanics.

## Falsifier

Stop/supersede this patch if moving any lookup/index construction changes:

- route/support ordering;
- contributor ordering;
- blocker/exclusion ordering or content;
- any load contribution mass/force/chainage/allocation;
- equilibrium totals/residuals;
- output semantic hash for equivalent authoritative input;
- support qualification or application-point authority.

## Protected invariants

- No mass formula changes in this WIP stage.
- No EMPTY/OPE/HYD equation changes.
- No component CoG rule changes.
- No support capability/tolerance changes.
- No distribution algorithm or bracketing-rule changes.
- No configured-default semantics changes.
- No evidence schema/hash-domain changes.
- No output schema change.
- No tolerance changes.
- No workflow-file changes.

## Planned minimal patch

Build once in `calculateDistribution()`:

```text
entityById                 O(N)
edgeById                   O(E)
chainageByEntityId/route   O(sum route chainages)
qualified supports/READY route (only if global blockers permit projection)
```

Pass those indexes through the existing `execution` object.

Add per-case `contributorsBySite` maintained in `recordContribution()` so `supportResults()` no longer performs `sites × ledger` rescans. Preserve ledger-order contributor IDs.

## Quantitative operation-count prediction

Let:

```text
C = active load-case count
R = route count
N = dataset entity count
E = global route edge count
Er = physical edges in route r
```

Current index/discovery work is approximately:

```text
entity map entries      C*N
edge map entries        C*R*E
chainage comparisons    up to C*sum(Er^2)
support projection      C*R builds
```

Target:

```text
entity map entries      N
edge map entries        E
chainage index entries  sum(Er)
chainage lookup         O(1) per physical edge
support projection      <= R builds
```

These are algorithmic operation-count predictions, not wall-clock claims.

## Coordination / overlap

Live open-PR inspection performed before production mutation.

- PR #1228: LAFEA workflow carrier; no relevant LoadCalc file/authority overlap identified.
- PR #1227: Master/Preview performance; separate files and authority from this calculation slice.
- PR #1150: empirical calculation V3 safety/evidence foundation is open and may share empirical-calculation authority. Connector file-list lookup returned 404, so exact-file overlap could not be verified from that endpoint.

Coordination classification for this WIP:

```text
SOFTWARE FILE OVERLAP: UNKNOWN for #1150
ENGINEERING AUTHORITY OVERLAP: POSSIBLE
```

Mitigation: keep this WIP restricted to transparent lookup/index mechanics in the existing current-main method; do not alter empirical method/version/authority semantics. Recheck #1150 overlap before PR promotion/merge.

## Ground truth

- Repository instructions reread from current `main`.
- Live `main` base established from PR #1228 metadata as `33a1c66539d9ac48e4d95fa5de86bd81e0bb3361`.
- `src/workspace/engineering-loads/support-load-distribution-v3.js` reread from current `main` before this WIP; observed blob SHA in the last fetch: `5fb48df556dde8a31eed9bf6e64fc0d0f7a924c9`.

## Validation state

| Check | Status | Observation | Oracle |
|---|---|---|---|
| Live-main grounding | PASS | GitHub metadata/source inspection | repository source |
| Active PR overlap scan | PASS with UNKNOWN #1150 detail | open PR search; #1150 file list unavailable | GitHub metadata |
| Production patch | NOT_RUN | not yet applied | n/a |
| Output equivalence | NOT_RUN | requires executable fixture | engineering calculation regression |
| Existing empirical qualification scripts | NOT_RUN | current session lacks executable checkout | repository gates |

## Current risk register

- `RISK-WGT-01`: possible authority overlap with open PR #1150; keep patch lookup-only and recheck before promotion.
- `RISK-WGT-02`: changing contributor indexing could change contributor ordering if implemented carelessly.
- `RISK-WGT-03`: precomputing route supports while global project-data blockers exist could evaluate data old code never touched; precompute only when old path would execute.
- `RISK-WGT-04`: precomputing supports for BLOCKED routes could alter observable failures; skip projection for non-READY routes.
- `RISK-WGT-05`: executable equivalence remains required before any merge readiness claim.

## EXACT_NEXT_ACTION

```text
Patch current-main support-load-distribution-v3.js only to add execution lookup indexes and contributor-by-site indexing; add focused operation-count/equivalence guards; create a draft PR with executable validation explicitly NOT_RUN unless actually executed.
```
