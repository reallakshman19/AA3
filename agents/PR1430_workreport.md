# PR1430 — Load Calc permanent ancillary distributed mass

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY_WITH_EXECUTION_NOT_RUN
PR_RECOVERY_STATE: HEALTHY_DRAFT_SOURCE_AUDITED
TAKEOVER_AUTHORITY: WRITE_ALLOWED_WITHIN_CLAIM
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
CRITICALITY: ENGINEERING_CRITICAL
WORK_INTENT: IMPLEMENT
PR: #1430
ISSUE: #1321
BRANCH: agent/issue-1321-ancillary-distributed-mass
MAIN_HEAD_LAST_CHECKED: 761632915155e0e9eb31c4cde74af539e69ec015
MERGE_BASE: 6d4a7cbdd75208b918540be0bbea12d04af83ae4
ENGINEERING_CONTENT_BASIS: 4e15df088ce6bc98112f6d1cb1da8d18ef84ea0b
MAIN_DRIFT: 2 unrelated WRC/EMP.1 source-governance commits behind
COORDINATION: SAFE_AFTER_STALE_REGISTRY_AND_MAIN_DRIFT_RECONCILIATION
CURRENT_STAGE: IMPLEMENTATION_AND_STANDARD_AGGREGATE_WIRING_COMPLETE_EXECUTION_NOT_RUN
CURRENT_BLOCKER: exact-head executable validation unavailable in current infrastructure
EXACT_NEXT_ACTION: execute node scripts/run-non-fea-checks.mjs on a functioning checkout/runner; then imports/build/relevant browser checks; patch only an evidenced failing falsifier
```

## Mission

Close Issue #1321 permanent-distributed-mass support for optional cladding/jacket and tracing mass per length without creating a second engineering authority mechanism or silently assuming zero.

Implemented effective fields:
- `CLADDING_WEIGHT` — `kg/m`
- `TRACING_WEIGHT` — `kg/m`

No universal product default or source-column alias is introduced. Missing ancillary values remain absent/non-blocking; explicit governed zero is preserved; negative/non-finite values fail closed.

## Production trace

```text
Project configured default / explicit Product default
  -> existing exact scope/precedence engine
  -> complete exact component coverage required for LINE promotion
  -> common-enriched LINE fields
       permanent.claddingWeightKgPerM
       permanent.tracingWeightKgPerM
  -> authorized effective-value ledger
       CLADDING_WEIGHT / TRACING_WEIGHT
  -> authorized effective execution projection
       claddingMassPerLengthKgPerM
       tracingMassPerLengthKgPerM
  -> resolveBaseMass()
       claddingKg = cladding kg/m * pipe length m
       tracingKg  = tracing kg/m * pipe length m
  -> baseMassKg = metalKg + insulationKg + claddingKg + tracingKg
  -> unchanged EMPTY/OPE/HYD fluid composition
  -> unchanged support allocation/statics/equilibrium
```

## Independent engineering oracle

Focused 1 m case:

```text
OD = 100 mm
wall = 5 mm
ID = 90 mm
material density = 7850 kg/m3
cladding = 2 kg/m
tracing = 1 kg/m
```

```text
metal area = pi/4 * (0.100^2 - 0.090^2)
           = 0.001492256510455 m2
metal mass = 11.714213607073 kg
ancillary  = (2 + 1) * 1 = 3.000000000000 kg
OPE fluid @ 800 kg/m3  = 5.089380098815 kg
HYD fluid @ 1000 kg/m3 = 6.361725123519 kg

EMPTY = 14.714213607073 kg
OPE   = 19.803593705888 kg
HYD   = 21.075938730592 kg
```

Every canonical case must gain exactly `3 kg` relative to the identical no-ancillary case. Fluid mass and support allocation fractions must remain unchanged. This is an independent analytical oracle, not repository execution PASS evidence.

## Protected invariants

- metal and insulation formulas unchanged;
- EMPTY/OPE/HYD fluid composition unchanged;
- component point-mass ownership unchanged;
- ancillary mass is case-independent PIPE distributed mass and applied exactly once;
- no universal cladding/tracing assumption;
- no source-column guess;
- complete LINE coverage required for line-wide defaults;
- support allocation/statics/equilibrium/tolerances unchanged;
- `.github/workflows/**` unchanged.

## Effective changed-file ledger — exactly 14

Production / authority chain:
1. `src/workspace/project-data/non-fea-field-registry.js`
2. `src/workspace/project-data/non-fea-configured-default-provider.js`
3. `src/workspace/project-data/non-fea-common-enriched-configured-default-overlay.js`
4. `src/workspace/project-data/non-fea-common-enriched-product-default-overlay.js`
5. `src/workspace/engineering-loads/authorized-empirical-effective-value-ledger.js`
6. `src/workspace/engineering-loads/authorized-empirical-effective-execution-projection.js`
7. `src/workspace/project-data/project-data-contract.js`
8. `src/workspace/engineering-loads/support-load-distribution-v3.js`

Qualification:
9. `scripts/authorized-empirical-ancillary-distributed-mass-check.mjs`
10. `scripts/non-fea-ancillary-default-authority-check.mjs`
11. `scripts/run-non-fea-checks.mjs`

Recovery:
12. `agents/PR1430_workreport.md`
13. `agents/status/PR1430.yaml`
14. `agents/claims/PR1430.yaml`

The aggregate patch is exactly two entries: one invokes the ancillary mass regression after existing mass-composition checks; one invokes the Project/Product ancillary authority regression after the product engineering-default profile check.

## Regression falsifiers

### `authorized-empirical-ancillary-distributed-mass-check.mjs`
- no projected ancillary key when authority is absent;
- explicit zero survives projection/validation;
- negative ancillary value rejects;
- exactly +3 kg EMPTY/OPE/HYD for the retained 1 m case;
- metal, insulation, fluid terms and allocation fractions unchanged;
- equilibrium closure unchanged;
- semantic identity changes when ancillary values change.

### `non-fea-ancillary-default-authority-check.mjs`
- Project configured defaults promote only with complete exact line coverage;
- Product defaults use the same scope engine and LINE promotion seam;
- partial component coverage produces `CONFIGURED_DEFAULT_LINE_PARTIAL_COVERAGE` and no LINE field;
- no source-column alias is introduced.

### `run-non-fea-checks.mjs`
The canonical Non-FEA aggregate now owns both focused regressions. A future aggregate PASS therefore cannot silently skip #1430.

## Coordination / drift

- live `main = 761632915155e0e9eb31c4cde74af539e69ec015` at last grounding;
- merge base = `6d4a7cbdd75208b918540be0bbea12d04af83ae4`;
- both main-only commits are WRC/EMP.1 source-governance/evidence work with no #1430 overlap;
- historical PR #1323 is closed/unmerged and its broad claim is stale by live lineage;
- no reviews or review threads were present when last checked;
- PR remains OPEN / DRAFT / MERGEABLE / UNMERGED.

## Validation ledger

| ID | Status | Observation |
|---|---|---|
| C-001 | PASS | live repository grounding and non-overlapping main drift |
| C-002 | PASS | exactly 14 declared changed paths after aggregate wiring |
| C-003 | PASS_SOURCE_INSPECTION | field registry adds only the two ancillary kg/m fields |
| C-004 | PASS_SOURCE_INSPECTION | configured/product defaults reuse existing scope precedence and complete-LINE promotion |
| C-005 | PASS_SOURCE_INSPECTION | effective ledger adds only two common-field mappings |
| C-006 | PASS_SOURCE_INSPECTION | execution projection keeps ancillary fields optional and finite/non-negative |
| C-007 | PASS_SOURCE_INSPECTION | `resolveBaseMass()` adds only kg/m × length; no fluid/statics/equilibrium change |
| C-008 | PASS_INDEPENDENT_ANALYTICAL | retained 1 m oracle requires exactly +3 kg |
| C-009 | PASS_SOURCE_INSPECTION | canonical Non-FEA aggregate now invokes both #1430 regressions |
| C-010 | NOT_RUN_EXECUTION_ENVIRONMENT_DNS | local checkout unavailable: `Could not resolve host: github.com` |
| C-011 | NOT_RUN_EXECUTION_ENVIRONMENT_PRE_STEP_RUNNER_UNAVAILABLE | exact-head PR workflows create jobs but expose no executable steps / runner assignment |
| C-012 | NOT_RUN | `node scripts/authorized-empirical-ancillary-distributed-mass-check.mjs` |
| C-013 | NOT_RUN | `node scripts/non-fea-ancillary-default-authority-check.mjs` |
| C-014 | NOT_RUN | `node scripts/run-non-fea-checks.mjs` |
| C-015 | NOT_RUN | imports/build/relevant browser-E2E checks |

`NOT_RUN` is not PASS. No workflow mutation was made to manufacture validation evidence.

## Decisions / risks

- `DEC-1430-001` ACTIVE — ancillary permanent mass belongs to PIPE distributed base mass, not component point mass.
- `DEC-1430-002` ACTIVE — missing optional ancillary value is not equivalent to explicit zero evidence.
- `DEC-1430-003` ACTIVE — configured/product defaults reuse existing scope precedence and complete-LINE promotion.
- `DEC-1430-004` ACTIVE — standard Non-FEA qualification must invoke both focused #1430 regressions.
- `RISK-1430-001` CONTROLLED_BY_DIFF — duplicate composition would overstate gravity; only one base-mass composition site changed.
- `RISK-1430-002` CONTROLLED_BY_AUTHORITY — partial line coverage cannot create a line-wide ancillary value.
- `RISK-1430-003` OPEN_EXECUTION — source-valid code and regressions remain unexecuted because checkout/runner infrastructure is unavailable.

## Appendix A — takeover qualification

### A1 — Production trace — 20/20
Trace is complete from configured/product scope selection through LINE promotion, effective-value mapping, execution projection, PIPE base mass, and canonical aggregate qualification ownership.

### A2 — Failure isolation — 19/20
Falsifiers isolate absence fabrication, partial-line promotion, negative values, numerical double application, and missing aggregate ownership. One point retained because execution is NOT_RUN.

### A3 — Authority / invariant — 20/20
No source aliases, universal default, new precedence engine, component point-mass authority, fluid authority, statics, equilibrium, tolerance, or workflow changes.

### A4 — Independent validation — 17/20
Independent arithmetic plus two focused regressions and aggregate wiring exist. Executable PASS is unavailable.

### A5 — Next commit / minimal patch — 20/20
No further production mutation is justified absent a failing executable falsifier.

**Total = 96/100; minimum = 17/20 — TAKEOVER QUALIFIED / HANDOVER READY WITH EXECUTION NOT_RUN.**

## Owner-facing disposition

PR #1430 is source-complete and validation-wired, but not execution-complete. Keep it draft/unmerged until the canonical Non-FEA aggregate plus imports/build/browser validation execute successfully. Merge authority remains Owner-only and has not been granted.