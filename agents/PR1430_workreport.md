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
MAIN_HEAD_LAST_CHECKED: cf0ee98ecf2de1ec359961a1588af324ea51ef3f
MERGE_BASE: 6d4a7cbdd75208b918540be0bbea12d04af83ae4
MAIN_DRIFT: 1 unrelated WRC source-governance commit behind
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

For the retained 1 m focused case:

```text
OD = 100 mm
wall = 5 mm
ID = 90 mm
material density = 7850 kg/m3
cladding = 2 kg/m
tracing = 1 kg/m
```

Independent arithmetic:

```text
metal area = pi/4 * (0.100^2 - 0.090^2)
           = 0.001492256510455 m2
metal mass = 11.714213607073 kg per 1 m
ancillary  = (2 + 1) * 1
           = 3.000000000000 kg
```

Therefore every canonical case must gain exactly `3 kg` relative to the identical no-ancillary case. OPE/HYD fluid mass must be numerically unchanged and support allocation fractions must be identical because the same spatially uniform line load is only scaled in magnitude.

Reference fluid terms for the fixture:

```text
OPE fluid @ 800 kg/m3 = 5.089380098815 kg
HYD fluid @ 1000 kg/m3 = 6.361725123519 kg
```

Expected total masses after ancillary addition:

```text
EMPTY = 14.714213607073 kg
OPE   = 19.803593705888 kg
HYD   = 21.075938730592 kg
```

These values are an independent analytical oracle. They are not reported as repository execution PASS because the focused scripts could not be executed in the present environment.

## Protected invariants

- metal geometry/density formula unchanged;
- insulation formula and insulation authority unchanged;
- EMPTY/OPE/HYD fluid composition unchanged;
- component point-mass ownership unchanged;
- no ancillary component point mass is introduced;
- no universal cladding/tracing default is introduced;
- no source-column aliases are guessed;
- absence remains optional/non-blocking;
- explicit governed zero is accepted and remains explicit;
- negative/non-finite ancillary values fail closed before gravity execution;
- ancillary mass is case-independent and composed exactly once in PIPE base mass;
- support allocation, statics, equilibrium, tolerances and workflow logic are unchanged;
- `.github/workflows/**` unchanged.

## Effective changed-file ledger — 13 files

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

No `src/core/non-fea-enrichment/index.js` mutation is present; an earlier claim entry for that untouched path was removed during custody reconciliation.

## Focused regression intent

### `authorized-empirical-ancillary-distributed-mass-check.mjs`

Defined falsifiers:

- field registration and `kg/m` unit;
- no projected key when ancillary authority is absent;
- explicit governed zero survives projection and Project Data validation;
- negative ancillary value rejected with `EMPIRICAL_EFFECTIVE_EXECUTION_VALUE_INVALID`;
- +3 kg exactly for EMPTY/OPE/HYD in the 1 m 2+1 kg/m case;
- metal, insulation and fluid terms unchanged;
- support allocation fractions unchanged;
- equilibrium closes;
- execution semantic identity changes when ancillary values change.

### `non-fea-ancillary-default-authority-check.mjs`

Defined falsifiers:

- Project configured defaults promote to one LINE value only with complete exact source-component coverage;
- Product defaults use the same scope engine and promote through the same LINE seam;
- one-component-only coverage of a two-component line yields `CONFIGURED_DEFAULT_LINE_PARTIAL_COVERAGE` and does not publish a LINE ancillary field;
- no source-column alias is introduced.

## Coordination / drift audit

Current repository observations:

- live `main = cf0ee98ecf2de1ec359961a1588af324ea51ef3f`;
- PR branch merge base = `6d4a7cbdd75208b918540be0bbea12d04af83ae4`;
- PR was 20 commits ahead / 1 commit behind before recovery-record refresh;
- the one newer main commit is WRC/code-acceptance source governance only and has no #1430 path or authority overlap;
- historical broad PR #1323 is `CLOSED`, `merged=false`; its claim is stale by live PR lineage;
- no active review or review thread exists on #1430;
- #1430 remains OPEN / DRAFT / MERGEABLE / UNMERGED.

Coordination classification: `SAFE_AFTER_STALE_REGISTRY_AND_MAIN_DRIFT_RECONCILIATION`.

## Validation ledger

| ID | Status | Observation basis | Oracle class |
|---|---|---|---|
| C-001 | PASS | live GitHub state: main `cf0ee98e...`, PR open/draft/mergeable | repository state |
| C-002 | PASS | changed-file diff is limited to 13 declared paths | GitHub compare / PR patches |
| C-003 | PASS_SOURCE_INSPECTION | field registry adds only `CLADDING_WEIGHT` / `TRACING_WEIGHT`, both `kg/m`, default-eligible | source contract |
| C-004 | PASS_SOURCE_INSPECTION | configured/product defaults reuse existing exact scope and complete-LINE promotion rules | source contract |
| C-005 | PASS_SOURCE_INSPECTION | authorized ledger maps only the two new common fields to the two new effective IDs | source contract |
| C-006 | PASS_SOURCE_INSPECTION | execution projection treats ancillary fields as optional and validates finite non-negative exact effective values | source contract |
| C-007 | PASS_SOURCE_INSPECTION | `resolveBaseMass()` adds only `kg/m * length`; fluid/statics/equilibrium paths unchanged | source mechanics inspection |
| C-008 | PASS_INDEPENDENT_ANALYTICAL | 1 m / 2+1 kg/m case independently requires exactly +3 kg in all cases | hand calculation |
| C-009 | PASS | PR reviews = 0; review threads = 0 | GitHub PR state |
| C-010 | PASS | current main drift is unrelated WRC source-governance only | commit inspection |
| C-011 | NOT_RUN_EXECUTION_ENVIRONMENT_DNS | local `git clone` failed: `Could not resolve host: github.com` | execution environment |
| C-012 | NOT_RUN_EXECUTION_ENVIRONMENT_PRE_STEP_RUNNER_UNAVAILABLE | exact-head hosted jobs completed failure with `steps=[]`, `runner_id=0` | GitHub Actions infrastructure |
| C-013 | NOT_RUN | `node scripts/authorized-empirical-ancillary-distributed-mass-check.mjs` | executable regression |
| C-014 | NOT_RUN | `node scripts/non-fea-ancillary-default-authority-check.mjs` | executable regression |
| C-015 | NOT_RUN | standard Non-FEA/import/build/browser checks | executable validation |

`NOT_RUN` is not PASS. No workflow file is changed to manufacture execution evidence.

## Risks / decisions

- `DEC-1430-001` ACTIVE — ancillary permanent mass belongs to PIPE distributed base mass, not component point mass.
- `DEC-1430-002` ACTIVE — missing optional ancillary value is not equivalent to explicit zero evidence.
- `DEC-1430-003` ACTIVE — configured/product defaults must use existing scope precedence and complete-LINE promotion; no second default resolver.
- `RISK-1430-001` CONTROLLED_BY_DIFF — duplicate composition would overstate all gravity cases; only one `resolveBaseMass()` composition site exists in this patch.
- `RISK-1430-002` CONTROLLED_BY_AUTHORITY — partial line coverage must not create one line-wide ancillary value.
- `RISK-1430-003` OPEN_EXECUTION — source-valid code remains unexecuted because both local network and hosted runner infrastructure are unavailable.
- `DEBT-1430-001` OPEN — execute exact-head focused + standard validation when a functioning runner/checkout is available.

## Appendix A — implementation takeover qualification

### A1 — Production trace — 20/20

Incoming agent must trace both authority routes through configured/product scope selection, complete-LINE promotion, common-enriched publication, effective-value ledger mapping, execution projection and `resolveBaseMass()`. Current trace is documented above and matches the changed production files.

### A2 — Failure isolation — 19/20

Primary falsifiers are bounded: missing ancillary row must remain absent; partial component coverage must block LINE promotion; negative value must fail at execution projection; a numerical delta other than exactly `kg/m * length` isolates the kernel composition. One point retained because executable confirmation is NOT_RUN.

### A3 — Authority / invariant — 20/20

The patch does not create source aliases, a universal default, a new precedence engine, component point-mass authority, or a new fluid/statics path. Authority remains in existing Project/Product default and common-enriched/effective-value contracts.

### A4 — Independent validation — 17/20

Independent hand arithmetic is available and two exact repository regressions are defined. Local and hosted execution are unavailable, therefore no executable PASS is claimed. Minimum takeover threshold is met but execution debt remains explicit.

### A5 — Next commit / minimal patch — 20/20

Next production mutation should be **none** unless focused execution exposes a defect. The next legitimate commit is recovery/validation evidence after exact-head tests run, or a minimal defect correction tied to a failing falsifier.

**Total = 96/100; minimum = 17/20 — TAKEOVER QUALIFIED / HANDOVER READY WITH EXECUTION NOT_RUN.**

## Owner-facing disposition

The engineering change is source-complete and bounded, but merge should not be recommended as validation-complete until the focused regressions and standard repository checks execute on a functioning environment. PR remains draft and unmerged. Merge authority is still Owner-only and has not been granted in this turn.