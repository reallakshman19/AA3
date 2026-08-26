# PR1471 Work Report — Issue #1321 current Common Input empirical mass projection

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY_FOR_CONTINUATION
PR_RECOVERY_STATE: SOURCE_COMPLETE_AUTHORITY_REPAIRED_EXECUTION_NOT_RUN
CRITICALITY: ENGINEERING_CRITICAL
EXECUTION_MODE: AUTO
REPOSITORY: reallaksh19/Advanced_Analysis
PR: #1471
BRANCH: agent/issue-1321-current-common-input-effective-projection
UPSTREAM: merged #1461 -> merged #1465 -> #1471
CURRENT_MAIN: 9832b9cc418ecbffe54edb96bbb90ca08f05426a
MERGE_AUTHORITY: GRANTED_BY_OWNER_CURRENT_TURN
EXACT_NEXT_ACTION: synchronize exact six-file #1471 delta onto current main, re-read final patch/reviews, then squash merge if unchanged
```

## Handover in 60 seconds

PR #1471 creates a **projection-only per-entity/per-load-case mass receipt** for routine Load Calc execution. It requires the merged #1465 current system Run authorization and the exact fully READY Common Input, then derives numerical mass only from the **sealed `commonInput.enrichedModel`**.

Final authority flow:

```text
fully READY/current Common Input
+ #1465 system Run authorization/currentness
+ sealed enriched shared model
→ existing model-load geometry projection
→ existing fitting derivation + mass resolver
→ existing exact configured-default ancillary overlay
→ add component OPE/HYD contained-fluid evidence
→ immutable per-entity/per-case mass receipt
```

It does **not** create legacy common-enriched publication/handoff authority, a governed runtime package, reactions, support allocation, equilibrium results, or execution authorization.

## Critical defect found before merge and repaired

### Defect

An intermediate implementation treated the Common Input-bound workspace `loadPrimitiveSet` as the numerical base because its semantic hash was already sealed.

Live production tracing falsified that assumption:

`src/workspace/model-load-controller.js::buildAndCommit()` builds `ModelLoadStore` from:

```text
SHARED_MODEL_EVENTS.CHANGED
→ this.sharedModel
→ buildModelLoadFoundation(this.sharedModel, this.topologyGraph)
→ ModelLoadStore.setFoundation()
```

That is the ordinary shared-model stream. It is **not proof that the exact enriched engineering properties sealed by Common Input were the primitive set's mass basis**. A hash-current workspace primitive set could therefore be numerically different from the enriched Common Input and silently discard master/default enrichment.

Classification:

```text
DEFECT: WORKSPACE_LOAD_PRIMITIVE_SET_RAW_SHARED_MODEL_NOT_ENRICHED_COMMON_INPUT_MASS_AUTHORITY
SEVERITY: ENGINEERING_AUTHORITY / NUMERICAL INPUT
DISPOSITION: REPAIRED_BEFORE_MERGE
```

### Repair

The final implementation never accepts or consumes an external/workspace primitive set as its numerical mass source.

It now uses:

```text
commonInput.enrichedModel
→ buildPipingPortTopologyGraph()
→ projectEngineeringLoadSources()
→ derivePipeLikeFittingWeightEvidence()
→ resolveComponentCaseMass()
```

This is the existing model-load source-normalization and mass-resolution stack, applied to the exact sealed enriched model. No second mass formulas or precedence table are introduced.

The Common Input `authorityContracts.loadPrimitiveSet.semanticHash` remains recorded only as **currentness/source-authority evidence**. Fixed policy explicitly states:

```text
massBasisSource = SEALED_COMMON_INPUT_ENRICHED_MODEL
sourceLoadPrimitiveSetUsedAsNumericalBasis = false
effectiveLoadSourceProjectionRebuiltDeterministically = true
existingMassResolverReused = true
executionGravityConsumed = false
supportStaticsExecuted = false
```

## Numerical semantics preserved

The existing model-load resolver remains authoritative for:

- direct `unitPipeWeightKgPerM` versus section/density-derived pipe mass;
- direct `fluidWeightOpeKgPerM` / `fluidWeightHydKgPerM` versus density-derived fluid mass;
- direct `insulationWeightKgPerM` versus geometry/density-derived insulation mass;
- same-branch pipe-like fitting derived dry mass;
- negligible `GASKET` / `GASK` exact zero dry mass;
- negative/double-count/missing-evidence blocking semantics.

PR #1471 adds only two qualified Issue #1321 layers not owned by that resolver:

1. `CLADDING_WEIGHT` / `TRACING_WEIGHT`, promoted through the existing `createNonFeaCommonEnrichedConfiguredDefaultOverlay()` full-line exact-coverage rule and added only to PIPE distributed mass.
2. `componentFluidWeightOpeKg` / `componentFluidWeightHydKg`, added by case to non-PIPE point dry mass while retaining their selected enriched evidence.

No equivalent density is manufactured for direct kg/m evidence.

## Focused falsifier

`scripts/current-common-input-empirical-mass-projection-check.mjs` deliberately separates raw workspace/source mass from enriched Common Input mass.

Raw source/workspace fixture:

```text
PIPE dry       4.0 kg/m
insulation     0.5 kg/m
OPE fluid      1.0 kg/m
HYD fluid      1.5 kg/m
VALVE dry      50 kg
component fluid absent
```

The raw EMPTY PIPE primitive is therefore `4.5 kg/m`.

Sealed enriched Common Input fixture:

```text
PIPE dry       10 kg/m
insulation      1 kg/m
OPE fluid       2 kg/m
HYD fluid       3 kg/m
cladding         2 kg/m
tracing          1 kg/m
VALVE dry      100 kg
VALVE OPE        8 kg
VALVE HYD       10 kg
```

Expected projected masses:

```text
PIPE EMPTY = (10 + 1 + 2 + 1) * 2 m = 28 kg
PIPE OPE   = (10 + 1 + 2 + 2 + 1) * 2 m = 32 kg
PIPE HYD   = (10 + 1 + 3 + 2 + 1) * 2 m = 34 kg
VALVE EMPTY/OPE/HYD = 100 / 108 / 110 kg
GASK EMPTY/OPE/HYD  = 0 / 0 / 0 kg
```

The regression also changes the raw workspace primitive authority while holding the enriched model fixed. Projected masses must remain identical while source-currentness/projection identity changes. This directly falsifies any accidental return to raw primitive numerical authority.

Other encoded negative controls cover altered projection policy, rehashed mass composition, stale summary, forged effective load-source-projection hash, reseal/currentness drift, legacy handoff/publication dependencies, and any support-statistics call.

## Authority / protected boundaries

- READY Common Input is required; PARTIALLY_READY/BLOCKED cannot use the routine #1465 path.
- #1465 system Run authorization must be current against the exact Common Input seal and authority revision vector.
- No `baselineId`, `handoffId`, publication decision, reviewer identity or legacy authorized-input identity is synthesized.
- Product engineering default table remains the shipped empty profile; if it becomes non-empty without Common Input currentness custody, this projection fails closed.
- No Run-controller routing is changed here.
- No support-load allocation/statics, equilibrium, load factor, gravity execution, tolerance, solver, fallback or workflow file is changed.
- Existing explicit legacy authorization path remains supported.

## Exact changed-file ledger

Expected net scope is exactly six paths:

1. `src/workspace/engineering-loads/current-common-input-empirical-mass-projection.js`
2. `scripts/current-common-input-empirical-mass-projection-check.mjs`
3. `scripts/run-non-fea-checks.mjs` — one focused-check registration
4. `agents/PR1471_workreport.md`
5. `agents/claims/PR1471.yaml`
6. `agents/status/PR1471.yaml`

Protected and unchanged:

- `src/workspace/load-calc-consumer-controller.js`
- `src/workspace/engineering-loads/support-load-distribution-v3.js`
- `src/workspace/engineering-loads/authorized-empirical-load-execution-v2.js`
- `src/core/non-fea-common-checker/**`
- support allocation/equilibrium/tolerances
- `.github/workflows/**`

## Appendix A — implementation takeover qualification

- A1 Production trace: **20/20** — traced #1461 Run, #1465 authorization, Common Input enrichment, workspace ModelLoadStore source, model-load source projection/resolver, ancillary/content composition and support-load kernel boundary.
- A2 Failure isolation: **20/20** — proved raw workspace primitives can be current yet not be the enriched Common Input numerical mass basis; defect repaired before merge.
- A3 Authority/invariant: **20/20** — exact enriched Common Input is numerical basis; raw primitive is currentness-only; no legacy/human authority or execution eligibility created.
- A4 Independent validation: **18/20** — live cross-module source/falsifier review complete; exact repository execution remains unavailable.
- A5 Minimal patch: **20/20** — new projection + focused regression + aggregate registration + recovery only; no kernel/statics change.

**Score: 98/100; minimum 18/20.**

## Validation truth

```text
live source trace / defect isolation              PASS
exact intended source-scope review                PASS
raw-vs-enriched falsifier design inspection       PASS
authority/fail-closed review                      PASS
focused projection checker execution              NOT_RUN
Non-FEA aggregate execution                       NOT_RUN
npm run check:imports                             NOT_RUN
npm run build                                     NOT_RUN
git diff --check                                  NOT_RUN
```

A faithful local repository materialization previously failed before checkout with:

```text
Could not resolve host: github.com
```

No `NOT_RUN` is represented as PASS.

## Successor boundary

The next bounded slice may make the support-load kernel consume this sealed per-entity/per-case mass receipt. It must preserve the existing force formula, route allocation, CoG/application-point rules, first-moment accounting and equilibrium checks. In particular it must admit the projection's authorized zero-mass gasket without epsilon mass or topology mutation, and must not re-add ancillary/content mass already included by #1471.
