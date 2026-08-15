# PR #1145 — Canonical Thermal ROM Custody Phase

> Current consolidated PR handover: `agents/PR1145_workreport.md`. This file retains the detailed canonical-custody phase ledger.

## Recovery header

- Repository: `reallaksh19/Advanced_Analysis`
- PR: `#1145`
- WORK_INTENT: `IMPLEMENT`
- CRITICALITY: `ENGINEERING_CRITICAL`
- Baseline main: `c35ae6eb04cf819a2ed4f839f45b3e05fdeccff6`
- Phase start head: `ccdeeabdf1d19f73deaf5bd3d8db9115324f7a45`
- Canonical-custody engineering head before report reconciliation: `ef96112caca1aa2735a05f89b1794a11bcf53c6e`
- Working branch: `agent/empirical-rom-compatibility-20260815`
- Merge authority: not granted.
- Coordination: `SAFE` — active LAFEA work is disjoint from empirical piping ROM paths.

## Handover in 60 Seconds

This phase closes the first canonical-custody seam for the analytical thermal restraint ROM. It does **not** change the solution into FEA.

New experimental entrypoint:

`executeCanonicalSourceBoundThermalRomCompatibility(...)`

Authority chain:

```text
normalized empirical request + exact topology/support/restraint hashes
  + sealed StagedJSON process authority
  + sealed/materialized material + circular section authority
  + source-backed support/ground movement authority
  + explicit root/coordinate selection
  -> straight PIPE analytical support-station spans
  -> thermal strain / free reference displacement
  -> unit-load virtual-work flexibility F
  -> (F+S)R = target-reference
  -> reaction + compatibility + conditioning + energy evidence
```

No production method registration, Load Calc dispatch, publication, or export path is changed.

## Implemented files

Added in this phase:

1. `src/workspace/engineering-loads/adapters/canonical-thermal-rom-authority-adapter.js`
   - verifies request/topology/attachment/restraint currentness;
   - rejects tolerance-inferred/ambiguous topology;
   - requires exact all-restraint coverage in the selected region;
   - requires one rigid governed root anchor;
   - accepts only bilateral translational coordinate restraints (`RESTRAINED`/explicit `SPRING`);
   - rejects gaps, friction and non-root multi-axis anchors;
   - binds process temperatures to sealed StagedJSON process authority;
   - binds E/G/mean CTE and circular section properties to sealed material/section receipts;
   - splits straight PIPE centerlines at governed support attachment stations as analytical ROM spans;
   - computes coordinate target movement relative to the governed root support movement;
   - calls the already-qualified-in-this-PR thermal reference + force-method compatibility core.

2. `src/workspace/engineering-loads/adapters/canonical-thermal-rom-source-bound-execution.js`
   - public experimental source-bound gate;
   - permits only `SOURCE_BACKED_SUPPORT_DISPLACEMENT` as support/ground movement custody;
   - rejects a `QUALIFIED_FREE_EXPANSION_TO_SUPPORT_MAPPING` as support/ground movement authority;
   - permits movement source kinds `GOVERNED_IMPORT` / `APPROVED_ENGINEERING_DATA` only;
   - requires empirical coordinate frame vertical axis exactly `[0,0,1]` because the movement authority is `GLOBAL_XYZ_Z_UP`; no implicit frame transformation is allowed.

3. `scripts/empirical-canonical-thermal-custody-source-check.mjs`
   - source guard proving required canonical authority imports/markers exist;
   - rejects finite-element solver/global-stiffness and old empirical multiplier markers.

4. `agents/PR1145_canonical_custody_workreport.md`
   - this detailed phase handover.

## Frozen authority rules

- No raw SJSON is consumed.
- No ambient/reference temperature is defaulted.
- No CTE is guessed.
- No missing support movement becomes `0 m`.
- Free-expansion mapping cannot become support/ground movement authority.
- No finite gap or friction is linearized.
- No restraint in the selected connected region may be silently omitted.
- No tolerance-inferred topology is consumed.
- The root support is an explicitly selected governed rigid anchor; selection is reference-structure bookkeeping, not a new engineering property.
- Current mean-CTE bridge is valid only when governed reference temperature equals material catalog baseline `293.15 K`, and operating temperature matches the sealed OPERATING material-state evaluation temperature.
- Support-station splitting creates analytical ROM spans, not finite elements.
- Current movement bridge is `GLOBAL_XYZ_Z_UP` only; no unqualified coordinate-frame transformation is performed.

## ROM / FEA boundary

Allowed cross-domain reuse:

- qualified material-property resolution;
- qualified circular pipe-section resolution.

Those are property authorities only. The runtime route does **not** consume a finite-element solution.

Prohibited / not used:

- finite-element solver execution;
- global nodal stiffness assembly;
- `K u = f` solution route;
- FE displacement/reaction recovery as runtime authority;
- empirical response multipliers;
- direct thermal-force injection.

## Governing thermal/material custody

For each selected source component:

1. `referenceTemperature` and `operatingTemperature` must be explicitly `DECLARED` by sealed `stagedjson-process-authority/v1`, with retained evidence.
2. Current approved-mean CTE formulation requires:

```text
T_reference = 293.15 K
```

within the phase comparison tolerance.
3. The process operating temperature must equal the sealed OPERATING material-state evaluation temperature.
4. The material state is re-materialized and its semantic/evidence hashes must reproduce the sealed receipt.
5. E, G and `thermalExpansionCoefficient` come from that sealed operating material state.
6. Area, Iy, Iz and polar J come from a verified circular pipe-section resolution; exact `Iy == Iz` is required.
7. The thermal core receives:

```text
coefficientBasis = APPROVED_MEAN_BETWEEN_REFERENCE_AND_ANALYSIS
```

No generalized `alpha(T)` or non-baseline total-expansion-difference claim is made.

## Governing restraint/movement custody

- Restraint occurrence identity, host component, attachment, axis, stiffness, gap/friction and translational states come from the current normalized request/effective restraint authority.
- Root must be a rigid translational anchor and carries no finite stiffness/gap/friction.
- Non-root anchors are blocked pending explicit multi-axis coordinate expansion.
- Coordinate state must be `RESTRAINED` or `SPRING`; `SPRING` requires positive governed stiffness.
- Every restraint occurrence in the selected connected region must appear exactly once as root or coordinate.
- Support/ground movement must have one qualified source-backed movement authority per selected support site.
- Coordinate target movement is relative to the moving root:

```text
delta_target_i = d_i dot (u_support_i - u_root)
```

- `pipeDisplacementM` from the movement-authority contract is not consumed by this ROM bridge.

## Analytical route partition

The selected region must be an acyclic connected region made only of two-port straight `PIPE` components.

Canonical topology joints are collapsed using exact topology connections. Each selected support attachment's governed `projectedPointCanonical` is checked against the straight centerline and used to split the component into analytical spans. The physical centerline is unchanged.

Evidence records:

```text
supportStationSplitCreatesFiniteElements = false
toleranceInferredTopologyConsumed = false
```

## Validation ledger

### VAL-EMPROM-CUSTODY-001 — source grounding

- STATUS: `PASS`
- OBSERVATION: `SOURCE_INSPECTION`
- Confirmed live authority contracts for:
  - StagedJSON process temperatures and evidence hashes;
  - material-state resolution and source/evidence hashes;
  - circular section resolution;
  - support attachment/restraint authority;
  - source-backed support displacement authority.

### VAL-EMPROM-CUSTODY-002 — source guard

- STATUS: `PASS`
- OBSERVATION: `LOCAL_EXECUTION`
- Result:

```text
PASS: canonical thermal ROM custody source guard
```

Required markers include sealed process/material/section/support authorities, exact topology, source-backed movement, no implicit zero movement, baseline mean-CTE gate and GLOBAL_XYZ_Z_UP-only frame custody.

Prohibited markers include FEA solver/global stiffness route and old empirical response multipliers.

### VAL-EMPROM-CUSTODY-003 — source syntax

- STATUS: `PASS`
- OBSERVATION: `LOCAL_EXECUTION`
- `node --check` passed for locally materialized copies of:
  - `canonical-thermal-rom-authority-adapter.js`;
  - `canonical-thermal-rom-source-bound-execution.js`.

### VAL-EMPROM-CUSTODY-004 — independent custody/mechanics oracles

- STATUS: `PASS`
- OBSERVATION: `LOCAL_EXECUTION / INDEPENDENT_REPRODUCTION`

Checks:

1. moving root `[1,0,0] mm`, support `[3,2,0] mm`, X coordinate:
   - expected relative target = `2 mm`;
   - reproduced `0.002 m`.
2. baseline `293.15 K`, operating `393.15 K`, approved mean `alpha=12e-6/K`:
   - expected strain = `0.0012`;
   - reproduced.
3. 10 m centerline split into 4 m + 6 m:
   - exact total length closure = `10 m`;
   - thermal expansion partitions `4.8 mm + 7.2 mm = 12 mm`.
4. fully restrained oracle:
   - `E=200 GPa`, `A=0.004 m2`, strain `0.0012`;
   - expected/reproduced `R = -960000 N`.

### VAL-EMPROM-CUSTODY-005 — full repository import-graph execution

- STATUS: `NOT_RUN / INFRASTRUCTURE_BLOCKED`
- OBSERVATION: `NOT_OBSERVED`
- Attempted a clean branch checkout for repository-level execution.
- Git clone could not resolve `github.com` in the local container environment.
- This is infrastructure/network blocking, not a mechanics or source-test failure.

### VAL-EMPROM-CUSTODY-006 — branch scope/currentness

- STATUS: `PASS`
- OBSERVATION: `SOURCE_INSPECTION`
- At canonical-custody engineering head `ef96112caca1aa2735a05f89b1794a11bcf53c6e` before report-only reconciliation:
  - branch was `behind_by: 0` relative to live main;
  - main/merge base remained `c35ae6eb04cf819a2ed4f839f45b3e05fdeccff6`;
  - PR delta was exactly 12 files;
  - no production empirical restraint-network runtime/profile, method registry, Load Calc UI/dispatch/publication/export file was changed.

### VAL-EMPROM-CUSTODY-007 — exact-head GitHub workflows/statuses

- STATUS: `NOT_RUN / NOT_OBSERVED` at canonical-custody engineering head `ef96112caca1aa2735a05f89b1794a11bcf53c6e`.
- GitHub workflow runs: `[]`.
- GitHub commit statuses: `[]`.
- Empty lists are not called PASS.
- Final report-only head is reconciled in `agents/PR1145_workreport.md` / PR conversation.

## Remaining limitations / next authority work

1. **Non-baseline reference temperature**
   - current mean-CTE bridge requires `T_reference = 293.15 K`;
   - generalized total thermal expansion should use a separately governed total-expansion function/difference or qualified `alpha(T)` integration.
2. **Component mechanics**
   - only straight two-port PIPE in this canonical bridge;
   - elbows/tees/reducers need separately qualified component flexibility/thermal kinematics.
3. **Contact/gaps/friction**
   - explicitly blocked; requires separately qualified active-set/contact layer.
4. **Multi-axis non-root anchors**
   - blocked pending explicit independent-coordinate expansion and dependent-coordinate policy.
5. **Coordinate transforms**
   - current source-backed movement bridge is GLOBAL_XYZ_Z_UP only; no transformed-frame support movement yet.
6. **Support rotations**
   - target custody currently uses translational support movement only.
7. **Full repository execution**
   - still required when infrastructure can provide a checkout/run environment.
8. **Production integration**
   - not registered, not published, not wired to Load Calc.

## PR / release disposition

- PR #1145 remains `OPEN / DRAFT`.
- Canonical custody state: `EXPERIMENTAL_SOURCE_BOUND_ROM`.
- Existing production behavior: unchanged.
- Production registration/publication: `NOT_REQUESTED / NOT_GRANTED`.
- Merge authority: not granted.
- DO NOT MERGE without explicit owner authorization.

## EXACT_NEXT_ACTION

After this canonical custody phase, the next mechanics boundary should be chosen deliberately between:

1. generalized non-baseline thermal expansion / temperature-dependent material expansion authority; or
2. analytical elbow/component flexibility and thermal kinematics;

before any contact/gap active-set or production cutover work.
