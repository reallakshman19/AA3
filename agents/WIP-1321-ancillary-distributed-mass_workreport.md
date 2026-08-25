# WIP-1321-ancillary-distributed-mass

## Recovery header

- Repository: `reallaksh19/Advanced_Analysis`
- Source issue: #1321
- Branch: `agent/issue-1321-ancillary-distributed-mass`
- Base / live main at grounding: `6d4a7cbdd75208b918540be0bbea12d04af83ae4`
- Work intent: IMPLEMENT
- Criticality: ENGINEERING_CRITICAL
- Merge authority: OWNER_ONLY
- Coordination: `SAFE_AFTER_STALE_REGISTRY_RECONCILIATION`
- Historical note: `agents/claims/PR1323.yaml` still claims broad Load Calc paths but PR #1323 is closed and continuation #1328 is merged; no open PR was found for cladding/tracing/ancillary distributed mass.

## Mission

Implement the next bounded #1321 mass-composition primitive: optional per-line cladding/jacket and tracing/permanent ancillary mass per length, consumed through the existing effective-value authority path and added exactly once to PIPE distributed base mass.

## Scope

New effective fields:
- `CLADDING_WEIGHT` — kg/m
- `TRACING_WEIGHT` — kg/m

They are optional `when available` values. This slice does **not** create a universal zero product default and does not make absence a blocker. Explicit/configured/product records, if supplied through the existing authority pipeline, must be traceable and hash-bound.

## Proposed production trace

```text
effective-value ledger
  -> optional CLADDING_WEIGHT / TRACING_WEIGHT per LINE target
  -> authorized effective execution projection
  -> pipeSectionProperties line projection
     claddingMassPerLengthKgPerM
     tracingMassPerLengthKgPerM
  -> support-load-distribution-v3 resolveBaseMass()
  -> kg/m × pipe developed length
  -> base pipe mass = metal + insulation + cladding + tracing
  -> unchanged case fluid composition / gravity statics / equilibrium
```

## Protected invariants

- pipe metal mass formula unchanged;
- insulation mass formula unchanged;
- EMPTY/OPE/HYD fluid composition unchanged;
- component point-mass ownership unchanged;
- no dry-mass double counting across PIPE vs component point mass;
- no universal ancillary-mass assumption;
- missing optional ancillary values do not block and contribute zero by absence, not by fabricated evidence;
- negative/non-finite ancillary mass is invalid;
- no statics allocation/equilibrium/tolerance/workflow change.

## Prediction / falsifier

For one 1.0 m pipe, adding `CLADDING_WEIGHT=2 kg/m` and `TRACING_WEIGHT=1 kg/m` must increase case mass by exactly `3 kg` for EMPTY/OPE/HYD without changing fluid mass or allocation fractions. Removing both values must restore the previous result. A negative value, duplicated use, component-point application, or effect on fluid composition falsifies the design.

## Expected changed files

- `src/workspace/project-data/non-fea-field-registry.js`
- `src/workspace/engineering-loads/authorized-empirical-effective-execution-projection.js`
- `src/workspace/project-data/project-data-contract.js`
- `src/workspace/engineering-loads/support-load-distribution-v3.js`
- `scripts/authorized-empirical-ancillary-distributed-mass-check.mjs`
- recovery records

## Validation state

All branch-head execution checks: `NOT_RUN` at WIP initialization.

## EXACT_NEXT_ACTION

Allocate draft PR and PR-number custody, then implement the two optional effective fields, projection and base-mass composition with focused hand-arithmetic regression. Do not add product defaults or source-column guesses in this slice.