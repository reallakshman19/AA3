# PR1430 — Load Calc permanent ancillary distributed mass

## Recovery header

- Repository: `reallaksh19/Advanced_Analysis`
- Source issue: #1321
- PR: #1430 (draft)
- Branch: `agent/issue-1321-ancillary-distributed-mass`
- Base / merge base: `6d4a7cbdd75208b918540be0bbea12d04af83ae4`
- Work intent: IMPLEMENT
- Criticality: ENGINEERING_CRITICAL
- Merge authority: OWNER_ONLY
- Coordination: `SAFE_AFTER_STALE_REGISTRY_RECONCILIATION`

## Mission

Add optional per-line cladding/jacket and tracing/permanent ancillary mass per length through the existing effective-value authority path and compose them exactly once into PIPE distributed base mass.

## Scope

Effective fields:
- `CLADDING_WEIGHT` — kg/m
- `TRACING_WEIGHT` — kg/m

No universal zero product default is introduced. Absence remains optional/non-blocking; when a resolved value exists it must be finite, non-negative, traceable and hash-bound.

## Proposed trace

```text
effective-value ledger
  -> optional CLADDING_WEIGHT / TRACING_WEIGHT per LINE
  -> authorized effective execution projection
  -> pipeSectionProperties ancillary kg/m fields
  -> resolveBaseMass()
  -> kg/m × pipe length
  -> metal + insulation + cladding + tracing
  -> unchanged fluid composition / gravity statics / equilibrium
```

## Protected invariants

- metal and insulation formulas unchanged;
- EMPTY/OPE/HYD fluid composition unchanged;
- component point-mass ownership unchanged;
- no universal ancillary-mass assumption;
- missing optional values do not block;
- negative/non-finite values fail closed;
- no statics/equilibrium/tolerance/workflow changes.

## Prediction / falsifier

A 1 m pipe with 2 kg/m cladding and 1 kg/m tracing must gain exactly 3 kg in every case; fluid mass and support allocation fractions must be unchanged. Duplicate application, component-point application, negative acceptance, or case-dependent ancillary mass falsifies the patch.

## Expected changed files

- `src/workspace/project-data/non-fea-field-registry.js`
- `src/workspace/engineering-loads/authorized-empirical-effective-execution-projection.js`
- `src/workspace/project-data/project-data-contract.js`
- `src/workspace/engineering-loads/support-load-distribution-v3.js`
- `scripts/authorized-empirical-ancillary-distributed-mass-check.mjs`
- recovery records

## Validation ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| live main grounding | PASS | `6d4a7cbd...` | GitHub live state |
| open overlap | PASS | no open cladding/tracing ancillary-mass PR found | GitHub PR search |
| registry gap | PASS_SOURCE_INSPECTION | no cladding/tracing effective fields on main | source |
| product-default assumption | PASS_SOURCE_INSPECTION | shipped engineering product-default table remains empty | source |
| execution checks | NOT_RUN | implementation not yet present | NONE |

## EXACT_NEXT_ACTION

Complete PR-number custody migration. Implement optional effective fields and exactly-once PIPE base-mass composition; add focused regression with independent kg/m × length arithmetic.