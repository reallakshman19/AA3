# PR1471 Work Report — Issue #1321 current Common Input empirical mass projection

## Recovery header
- Repository: `reallaksh19/Advanced_Analysis`
- PR: #1471 — `Load Calc: project current Common Input into empirical execution values`
- Branch: `agent/issue-1321-current-common-input-effective-projection`
- Stack base: PR #1465 exact head `1912bfa2fb3516643b4a5331e77c704c16b8969a`
- Upstream: PR #1461 -> PR #1465 -> PR #1471
- Current main observed at takeover: `dd7f13e2c73e596c7ac6625fbe211779bc61ce94`
- Criticality: ENGINEERING_CRITICAL
- Execution mode: AUTO
- Merge authority: OWNER_ONLY_NOT_GRANTED
- State: WRITE_ALLOWED_BOUNDED_MASS_PROJECTION

## Handover in 60 seconds
PR #1471 owns only the numerical **mass projection** from a fully READY/current Common Input plus the #1465 system Run authorization. It must not publish/authorize a legacy common-enriched baseline/handoff and must not yet route Run or execute support statics.

The decisive source finding is that neither existing numerical source can be reused unchanged:

1. `model-load primitive set` preserves direct-vs-derived pipe/fluid/insulation mass, same-branch fitting derivation and negligible gasket zero mass, but does not include Issue #1321 cladding/tracing or case-dependent component-contained fluid.
2. `authorized-empirical-effective-execution-projection/v1` includes ancillary/content composition, but is rooted in legacy `authorized-empirical-load-input/v1` and published baseline/handoff authority and forces line density/section maps that do not represent every Common Input READY mass basis.

Therefore the bounded successor projection is:

```text
#1465 current system Run decision
+ fully READY/current Common Input
+ enriched shared model
+ existing model-load mass resolver
+ existing exact configured-default ancillary overlay
→ per physical entity / per requested load case mass receipt
```

The projection reuses `resolveComponentCaseMass()` and `derivePipeLikeFittingWeightEvidence()` for the established model-load mass rules. It adds only the two Issue #1321 composition layers those functions do not own: line cladding/tracing and component OPE/HYD contained fluid.

## Locked invariants
1. No `baselineId`, `handoffId`, publication decision, reviewer identity, legacy authority ID or synthetic legacy hash.
2. `runAuthorization` must be current against the exact Common Input snapshot through PR #1465 currentness validation.
3. Common Input must be READY/current/error-free; PARTIALLY_READY/BLOCKED cannot project routine execution masses.
4. Exact physical identity comes from the existing common-enriched target inventory and `componentKey`; no fuzzy/nearest mapping.
5. The projection consumes already-selected enriched-model evidence; it does not define a second source/master/default rank table.
6. Existing model-load resolver owns direct-vs-derived pipe/fluid/insulation mass semantics.
7. Existing `derivePipeLikeFittingWeightEvidence()` owns missing fitting dry-mass derivation.
8. Existing negligible gasket behavior remains exact zero; no epsilon mass.
9. Ancillary cladding/tracing uses the existing configured-default common-enriched overlay and exact full-line coverage rule.
10. Component-contained fluid remains additive by OPE/HYD case and never overwrites dry component mass.
11. No support allocation/statics equation, reaction distribution, equilibrium tolerance, gravity factor, solver or workflow change.
12. Projection is not execution authorization and does not publish a calculation event.

## Important parity findings
### A. `loadPrimitiveSet` is incomplete for current Issue #1321 execution
`src/core/model-loads/primitive-builder.js` and `component-mass-resolver.js` correctly retain:
- direct or density-derived PIPE mass;
- direct or density-derived OPE/HYD line fluid;
- direct or density-derived insulation;
- same-branch pipe-like fitting derived dry mass;
- negligible gasket zero dry mass.

But they do not add:
- `CLADDING_WEIGHT` / `TRACING_WEIGHT`;
- `COMPONENT_OPERATING_FLUID_WEIGHT` / `COMPONENT_HYDRO_FLUID_WEIGHT`.

Therefore the load primitive set cannot be treated as the full current numerical authority.

### B. Legacy execution projection is also not a universal Common Input adapter
The Common Input checker allows MASS_COVERAGE from direct kg/m evidence. `WEIGHT_AND_GRAVITY` and `SUSTAINED_REACTIONS` require MASS_COVERAGE but not SECTION_COVERAGE. A fully READY routine model may therefore legitimately use direct `unitPipeWeightKgPerM`, `fluidWeight*KgPerM` or `insulationWeightKgPerM` without a density-derived mass basis. A current projection must retain that basis rather than manufacture equivalent density.

### C. Existing support-load kernel has a later input-semantic blocker
`support-load-distribution-v3.js::componentMass()` currently requires positive non-PIPE `componentWeightsKg`. Common Input/model-load readiness permits gasket types as exact zero self-weight. A later kernel-input cutover must consume the sealed #1471 mass projection (or equivalently admit the explicit authorized zero) rather than fabricate epsilon mass or mutate topology. This is deferred from #1471 because #1471 is projection-only.

## Takeover Appendix A
### A1 — Production trace — 20/20
Traced #1461 Run -> #1465 system Run authorization -> current Common Input -> model-load foundation/primitive builder -> component mass resolver -> legacy effective execution projection -> support-load kernel mass composition.

### A2 — Failure isolation — 20/20
Two incompatible assumptions isolated: `loadPrimitiveSet` omits newer ancillary/content mass; legacy execution projection assumes the published handoff/effective-ledger chain and density-oriented line maps. Falsifier: any proposed adapter that either drops cladding/content or invents baseline/handoff/density evidence is invalid.

### A3 — Authority invariant — 20/20
Projection must consume current selected evidence and existing default overlays only; it cannot establish approval. PR #1465 remains the product-policy decision/currentness layer and projection remains a downstream numerical receipt.

### A4 — Independent validation — 18/20
Cross-checked Common Input MASS_COVERAGE, model-load resolver, fitting/gasket behavior, ancillary default overlay, component-content fields and support-load composition source. Executable repository checks remain NOT_RUN.

### A5 — Minimal patch — 20/20
Smallest safe implementation is a new current mass projection contract + focused falsifier + aggregate registration. No legacy contract rewrite and no support-load kernel modification in this PR.

**Score: 98/100; minimum 18/20. TAKEOVER_AUTHORITY = WRITE_ALLOWED for the bounded mass-projection slice.**

## Planned exact scope
1. `src/workspace/engineering-loads/current-common-input-empirical-mass-projection.js`
2. `scripts/current-common-input-empirical-mass-projection-check.mjs`
3. `scripts/run-non-fea-checks.mjs` — registration only
4. `agents/PR1471_workreport.md`
5. `agents/claims/PR1471.yaml`
6. `agents/status/PR1471.yaml`

Temporary WIP custody is removed after claim/status creation.

Protected:
- `src/workspace/load-calc-consumer-controller.js`
- `src/workspace/engineering-loads/support-load-distribution-v3.js`
- `src/workspace/engineering-loads/authorized-empirical-load-execution-v2.js`
- legacy authorized input/handoff schemas
- `src/core/non-fea-common-checker/**`
- support allocation/equilibrium/tolerances
- `.github/workflows/**`

## Validation truth
Source inspection is observed. Executable checks are **NOT_RUN** because the available faithful checkout path previously failed before materialization with `Could not resolve host: github.com`. No NOT_RUN result is represented as PASS.

## EXACT_NEXT_ACTION
Implement the immutable per-entity/per-load-case mass projection using the model-load mass resolver, exact configured-default ancillary overlay and explicit component-content addition. Add falsifiers for direct-mass basis, fitting derivation, gasket zero, ancillary/content retention, stale Run authorization/Common Input and absence of legacy authority identities. Keep #1471 draft/unmerged.