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
ENGINEERING_CONTENT_BASIS: 560f13254917ca05cb78dc4edf4033a76f0d393c
HOSTED_RECOVERY_BASIS: a5c7c24df98d7ee93abec8b1cce2917081e7254d
MAIN_DRIFT: 2 unrelated WRC source-governance commits behind
COORDINATION: SAFE_AFTER_STALE_REGISTRY_AND_MAIN_DRIFT_RECONCILIATION
CURRENT_STAGE: IMPLEMENTATION_COMPLETE_SOURCE_AUDITED_EXECUTION_NOT_RUN
CURRENT_BLOCKER: exact-head executable validation unavailable in current infrastructure
EXACT_NEXT_ACTION: execute focused regressions plus standard Non-FEA/import/build checks on a functioning checkout; if green, refresh this report and request Owner merge decision
```

## Mission

Close the Issue #1321 permanent-distributed-mass gap for optional cladding/jacket and tracing mass per length without creating a second engineering authority mechanism.

Implemented effective fields:

- `CLADDING_WEIGHT` — `kg/m`
- `TRACING_WEIGHT` — `kg/m`

No universal zero product default is introduced. The shipped product engineering-default table remains empty. Missing ancillary values remain optional; absence is not converted into fabricated zero evidence.

## Production trace

```text
Project configured default or explicitly supplied product default
  -> existing scope/precedence engine
  -> complete component coverage required for LINE promotion
  -> common-enriched fields
       permanent.claddingWeightKgPerM
       permanent.tracingWeightKgPerM
  -> authorized effective-value ledger
       CLADDING_WEIGHT / TRACING_WEIGHT
  -> authorized effective execution projection
       pipeSectionProperties.claddingMassPerLengthKgPerM
       pipeSectionProperties.tracingMassPerLengthKgPerM
  -> resolveBaseMass()
       claddingKg = cladding kg/m * pipe length m
       tracingKg  = tracing kg/m  * pipe length m
  -> baseMassKg = metalKg + insulationKg + claddingKg + tracingKg
  -> resolveCaseMass()
       + unchanged EMPTY/OPE/HYD fluid term
  -> unchanged uniform-load allocation and equilibrium accounting
```

## Engineering rule and independent arithmetic

Retained focused case:

```text
OD = 100 mm
wall = 5 mm
ID = 90 mm
material density = 7850 kg/m3
length = 1 m
cladding = 2 kg/m
tracing = 1 kg/m
```

Independent arithmetic:

```text
metal area = pi/4 * (0.100^2 - 0.090^2)
           = 0.001492256510455 m2
metal mass = 11.714213607073 kg
ancillary  = (2 + 1) * 1
           = 3.000000000000 kg
OPE fluid @ 800 kg/m3  = 5.089380098815 kg
HYD fluid @ 1000 kg/m3 = 6.361725123519 kg

EMPTY = 14.714213607073 kg
OPE   = 19.803593705888 kg
HYD   = 21.075938730592 kg
```

Every canonical case must therefore gain exactly `3 kg` relative to its identical no-ancillary case. Fluid mass and support allocation fractions must be unchanged. These values are an independent analytical oracle; they are not repository execution PASS evidence.

## Protected invariants

- metal geometry/density formula unchanged;
- insulation formula and authority unchanged;
- EMPTY/OPE/HYD fluid composition unchanged;
- component point-mass ownership unchanged;
- no ancillary component point mass introduced;
- no universal cladding/tracing default introduced;
- no source-column aliases guessed;
- absence remains optional/non-blocking;
- explicit governed zero remains explicit and valid;
- negative/non-finite ancillary values fail closed before gravity execution;
- ancillary mass is case-independent and composed exactly once in PIPE base mass;
- support allocation, statics, equilibrium, tolerances and workflow unchanged;
- `.github/workflows/**` unchanged.

## Effective changed-file ledger — exactly 13

Production / authority chain:

1. `src/workspace/project-data/non-fea-field-registry.js`
2. `src/workspace/project-data/non-fea-configured-default-provider.js`
3. `src/workspace/project-data/non-fea-common-enriched-configured-default-overlay.js`
4. `src/workspace/project-data/non-fea-common-enriched-product-default-overlay.js`
5. `src/workspace/engineering-loads/authorized-empirical-effective-value-ledger.js`
6. `src/workspace/engineering-loads/authorized-empirical-effective-execution-projection.js`
7. `src/workspace/project-data/project-data-contract.js`
8. `src/workspace/engineering-loads/support-load-distribution-v3.js`

Focused qualification definitions:

9. `scripts/authorized-empirical-ancillary-distributed-mass-check.mjs`
10. `scripts/non-fea-ancillary-default-authority-check.mjs`

Recovery records:

11. `agents/PR1430_workreport.md`
12. `agents/status/PR1430.yaml`
13. `agents/claims/PR1430.yaml`

No `src/core/non-fea-enrichment/index.js` mutation is present; an earlier stale claim entry for that untouched path was removed.

## Focused regression intent

### `authorized-empirical-ancillary-distributed-mass-check.mjs`

Falsifiers defined for:

- field registration and `kg/m` unit;
- no projected ancillary key when authority is absent;
- explicit governed zero through projection and Project Data validation;
- negative ancillary rejection with `EMPIRICAL_EFFECTIVE_EXECUTION_VALUE_INVALID`;
- exactly +3 kg for EMPTY/OPE/HYD in the 1 m / 2+1 kg/m case;
- unchanged metal, insulation and fluid terms;
- unchanged support allocation fractions;
- equilibrium closure;
- changed execution semantic identity when ancillary values change.

### `non-fea-ancillary-default-authority-check.mjs`

Falsifiers defined for:

- Project configured defaults promote to one LINE value only with complete exact source-component coverage;
- Product defaults use the same scope engine and LINE seam;
- one-component-only coverage on a two-component line produces `CONFIGURED_DEFAULT_LINE_PARTIAL_COVERAGE` and no LINE ancillary field;
- no source-column alias introduced.

## Coordination / drift audit

Latest repository observations:

- live `main = 761632915155e0e9eb31c4cde74af539e69ec015`;
- merge base = `6d4a7cbdd75208b918540be0bbea12d04af83ae4`;
- after recovery refresh the PR is 23 commits ahead / 2 commits behind;
- both main-only commits after the merge base are WRC/EMP.1 source-governance/evidence work;
- latest main-only commit adds PR1425 WRC cylindrical-stress semantics records/docs/check only;
- neither main-only commit touches any #1430 production, regression, or recovery path;
- historical broad PR #1323 is `CLOSED`, `merged=false`; its claim is stale by live PR lineage;
- #1430 reviews = 0; review threads = 0;
- #1430 remains OPEN / DRAFT / MERGEABLE / UNMERGED.

Coordination classification: `SAFE_AFTER_STALE_REGISTRY_AND_MAIN_DRIFT_RECONCILIATION`.

## Validation ledger

| ID | Status | Observation basis | Oracle class |
|---|---|---|---|
| C-001 | PASS | live main `76163291...`; #1430 open/draft/mergeable | repository state |
| C-002 | PASS | current diff remains exactly 13 declared files | GitHub compare / PR patches |
| C-003 | PASS_SOURCE_INSPECTION | only `CLADDING_WEIGHT` / `TRACING_WEIGHT` added to field registry, both `kg/m` and default-eligible | source contract |
| C-004 | PASS_SOURCE_INSPECTION | configured/product defaults reuse exact scope precedence and complete-LINE promotion | source contract |
| C-005 | PASS_SOURCE_INSPECTION | authorized ledger adds only two common-field mappings | source contract |
| C-006 | PASS_SOURCE_INSPECTION | execution projection keeps ancillary fields optional and validates finite non-negative effective values | source contract |
| C-007 | PASS_SOURCE_INSPECTION | `resolveBaseMass()` adds only `kg/m * length`; fluid/statics/equilibrium unchanged | source mechanics inspection |
| C-008 | PASS_INDEPENDENT_ANALYTICAL | independent 1 m case requires exactly +3 kg in all canonical cases | hand calculation |
| C-009 | PASS | reviews = 0; review threads = 0 | GitHub PR state |
| C-010 | PASS | two main-only commits are WRC source-governance/evidence only; no overlap | GitHub compare |
| C-011 | NOT_RUN_EXECUTION_ENVIRONMENT_DNS | local `git clone` failed: `Could not resolve host: github.com` | execution environment |
| C-012 | NOT_RUN_EXECUTION_ENVIRONMENT_PRE_STEP_RUNNER_UNAVAILABLE | hosted run on recovery basis `a5c7c24d...`: job `97875533686`, `steps=[]`, `runner_id=0` | GitHub Actions infrastructure |
| C-013 | NOT_RUN | `node scripts/authorized-empirical-ancillary-distributed-mass-check.mjs` | executable regression |
| C-014 | NOT_RUN | `node scripts/non-fea-ancillary-default-authority-check.mjs` | executable regression |
| C-015 | NOT_RUN | standard Non-FEA/import/build/browser checks | executable validation |

`NOT_RUN` is not PASS. No workflow change was made to manufacture execution evidence.

## Risks / decisions

- `DEC-1430-001` ACTIVE — ancillary permanent mass belongs to PIPE distributed base mass, not component point mass.
- `DEC-1430-002` ACTIVE — missing optional ancillary value is not equivalent to explicit zero evidence.
- `DEC-1430-003` ACTIVE — configured/product defaults use existing scope precedence and complete-LINE promotion; no second resolver.
- `RISK-1430-001` CONTROLLED_BY_DIFF — duplicate composition would overstate gravity; only one `resolveBaseMass()` composition site exists in this patch.
- `RISK-1430-002` CONTROLLED_BY_AUTHORITY — partial line coverage cannot create a line-wide ancillary value.
- `RISK-1430-003` OPEN_EXECUTION — source-valid code remains unexecuted because local network and hosted runner infrastructure are unavailable.
- `DEBT-1430-001` OPEN — execute exact-head focused plus standard validation on a functioning runner/checkout.

## Appendix A — implementation takeover qualification

### A1 — Production trace — 20/20

Trace is complete from configured/product scope selection through common LINE promotion, effective-value mapping, execution projection and PIPE base-mass consumption.

### A2 — Failure isolation — 19/20

Bounded falsifiers identify absence fabrication, partial-line promotion, invalid negative values and numerical double application. One point retained because executable confirmation is NOT_RUN.

### A3 — Authority / invariant — 20/20

No source aliases, universal default, new precedence engine, component point-mass authority, fluid authority, statics, equilibrium or workflow change is introduced.

### A4 — Independent validation — 17/20

Independent hand arithmetic and two exact repository regression definitions exist. Local and hosted execution remain unavailable, so no executable PASS is claimed.

### A5 — Next commit / minimal patch — 20/20

No further production mutation is justified without a failing executable falsifier. Next legitimate change is validation evidence or a minimal correction tied to a real failed check.

**Total = 96/100; minimum = 17/20 — TAKEOVER QUALIFIED / HANDOVER READY WITH EXECUTION NOT_RUN.**

## Owner-facing disposition

The engineering slice is source-complete, bounded and handover-ready, but not validation-complete. Keep PR #1430 draft and unmerged until focused and standard checks execute successfully. Merge authority remains Owner-only and has not been granted.