# PR1243 Work Report — Merged LoadCalc / SJSON Performance Stack Qualification

## Recovery header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: RESTRICTED

PR_HEAD_OBSERVED: b71292cb829cd0d83209d16f403026cc1df06c87
REPORT_BASIS_HEAD: b71292cb829cd0d83209d16f403026cc1df06c87
MAIN_HEAD_LAST_CHECKED: 585a897afa0f5c9799cb68a58de00a55808062b3
MERGE_BASE: 585a897afa0f5c9799cb68a58de00a55808062b3
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: NOT_REQUIRED_NO_TAKEOVER
GROUNDING_EPOCH: GE-001
LAST_DURABLE_CHECKPOINT: 2026-08-18T02:23Z
CURRENT_STAGE: QUALIFICATION / FIXTURE_BINDING_BLOCKED
CURRENT_BLOCKER: exact external LARGE_MODEL_4884_ENTITY bytes are not bound; P0_ACCEPTED=false
HIGHEST_RISK: treating targeted/source or historical benchmark evidence as current exact-head full qualification or P0 acceptance
EXACT_NEXT_ACTION: bind the exact 25,219,174-byte ATTRIBUTE-AML_ASIM-1835_managed_stage_enriched_stage.json source, verify its SHA/identity, run exact-head P0 + PR1243 qualification gates, and obtain explicit Owner P0 acceptance before any P1 production salvage
```

`TAKEOVER_AUTHORITY=RESTRICTED` means this PR is authorized to remain an evidence/qualification vehicle only. It must not acquire P1 production changes. `APPENDIX_A_STATUS=NOT_REQUIRED_NO_TAKEOVER` applies to this continuing workstream; a future incoming agent taking over this engineering-critical PR begins READ_ONLY and must complete Appendix A before technical mutation.

## Handover in 60 Seconds

- PR #1243 is the active **qualification-only** vehicle for the already-merged LoadCalc/SJSON performance stack from #1227, #1229, #1230, #1232, #1237, #1240, #1241 and #1242.
- It changes no production source and no workflow.
- Live `main` and merge base at GE-001 are `585a897afa0f5c9799cb68a58de00a55808062b3`; branch is `behind_by=0`.
- Targeted numerical/parity/source checks found no engineering mismatch; complete exact-head application/build/browser qualification is still `NOT_RUN`.
- Controlling P1 Work Pack Issue #541 and merged P0 PR #544 keep `P0_ACCEPTED=false`; P1 production changes therefore remain unauthorized.
- #1244/#1245 have been separately put on `SALVAGE_PARTIAL / AUTHORITY_HOLD`; do not absorb their production diffs into #1243.
- Recovered real large-model source basename/path: `F:\CODE-5-SS\ATTRIBUTE-AML_ASIM-1835_managed_stage_enriched_stage.json`.
- Required source SHA-256: `88e62782772d743e9236d13775476826f9649ab06d3161de35dc500baa85a9c6`.
- Exact next action is fixture binding + exact-head P0/qualification execution, not another optimization.

## Identity and classification

```text
WORK_INTENT: INVESTIGATE / VALIDATE
REPOSITORY_STATE: EXISTING_PR
MUTATION_AUTHORITY: WRITE_ALLOWED_FOR_QUALIFICATION_AND_RECOVERY_ONLY
CRITICALITY: ENGINEERING_CRITICAL
EXECUTION_MODE: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
```

- Repository: `reallaksh19/Advanced_Analysis`
- PR: #1243
- Branch: `agent/performance-stack-qualification-main68efa`
- Base branch: `main`
- Current production qualification target: `585a897afa0f5c9799cb68a58de00a55808062b3`
- Original merged performance-stack head: `68efa98c62537f0fdad127d0ccdd45fb6e8a328f`
- PR head before this recovery-metadata update: `b71292cb829cd0d83209d16f403026cc1df06c87`
- PR state at GE-001: OPEN / DRAFT / mergeable

## Mission

Qualify the combined merged performance changes from PRs #1227, #1229, #1230, #1232, #1237, #1240, #1241 and #1242 on one exact current production tree without changing production code, engineering equations, authority, tolerances, hashes, or workflows.

The required conclusion is stronger than “each optimization looked safe in isolation.” The combined stack must preserve source identity, normalized engineering values, LoadCalc authority/currentness, support-load arithmetic/equilibrium, evidence custody, blocker/readiness semantics, and browser/runtime correctness.

## GE-001 — live grounding epoch

Verified from live GitHub on 2026-08-18:

```text
main head:       585a897afa0f5c9799cb68a58de00a55808062b3
PR head:         b71292cb829cd0d83209d16f403026cc1df06c87
merge base:      585a897afa0f5c9799cb68a58de00a55808062b3
branch relation: ahead_by=4 / behind_by=0
PR state:        OPEN / DRAFT / mergeable
changed files:   3, qualification-only
reviews:         0
review threads:  0
commit statuses: 0
workflow runs:   0
```

Repository coordination registries are absent on current main:

- `agents/MASTER_INDEX.md`: not present;
- `agents/status/`: not present;
- `agents/claims/`: not present.

Therefore live PR state/diffs are the mutable coordination authority.

### Active overlap check

Current open PR #1246 was inspected. Its TECH-13 LAFEA.4 promotion/refinement paths do not overlap #1243's qualification-only paths and its engineering authority domain is distinct.

Classification relative to #1246: `SAFE`.

#1244/#1245 are related P1 observability candidates, but are now authority-held. #1243 must not silently inherit or merge their production changes.

## Main-race custody

At qualification branch creation, production `main` was:

`68efa98c62537f0fdad127d0ccdd45fb6e8a328f`

During PR creation, `main` advanced to:

`585a897afa0f5c9799cb68a58de00a55808062b3`

through a large LFEA pipeline/UI merge. The concurrent merge did not alter the performance-core production files from #1227–#1242, but it did change application/bootstrap/package/browser-facing paths. The qualification branch was therefore reconciled onto exact `585a897a...` rather than treating the stale performance-only head as current.

Live compare at GE-001 confirms `behind_by=0` and a qualification-only diff.

## Source-task authority reconciliation

Controlling P1 Work Pack: Issue #541.

Merged P0 PR #544 explicitly distinguishes evidence machinery from acceptance:

```text
P0 implementation machinery may be present
P0_ACCEPTED remains false until exact-head execution and explicit Owner acceptance
P1 may continue measurement/proposal preparation
P1-P7 production edits remain blocked until P0 acceptance
```

Issue #541 later records:

```text
P1_Q0_IMPLEMENTATION_PRESENT: true
P0_ACCEPTED: false
P1_QUALIFICATION_STATUS: BLOCKED
P1_PRODUCTION_FIX_AUTHORIZED: false
```

This does **not** block #1243 because #1243 is qualification-only. It does block promotion of #1244/#1245 or another production optimization until the P0 gate is satisfied.

## Recovered authoritative large-model fixture custody

Current production `scripts/run-advanced-tab-benchmarks.mjs` identifies the historical real-project source as:

```text
F:\CODE-5-SS\ATTRIBUTE-AML_ASIM-1835_managed_stage_enriched_stage.json
```

unless overridden by `ADVANCED_REAL_PROJECT_DATASET`.

The same production benchmark freezes the independent expected identity:

```text
schema: inputxml-managed-stage/v1
sha256: 88e62782772d743e9236d13775476826f9649ab06d3161de35dc500baa85a9c6
byteLength: 25219174
rawRootCount: 276
rawNodeCount: 4884
rawSupportCount: 1331
normalizedPipeCount: 3277
normalizedSupportCount: 1331
normalizedComponentCount: 276
```

The published advanced-tab benchmark artifact historically reports expected = actual for that identity. This is useful provenance, but it is **historical artifact evidence**, not current exact-head P0 acceptance.

The current ChatGPT Library does not expose an exact file with that basename. A similarly named AML managed-stage candidate previously inspected does not match the governed SHA/identity. No substitute fixture is permitted.

## Qualification runner

Added:

`scripts/performance-stack-exact-head-qualification.mjs`

The runner fails closed unless:

1. the declared target is an exact 40-hex Git object;
2. the checkout is the exact target or has the target as an ancestor; and
3. every path above the target is qualification-only.

Allowed qualification paths after recovery cleanup:

- `scripts/performance-stack-exact-head-qualification.mjs`;
- `agents/PR1243_workreport.md`.

`agents/WIP-performance-stack-qualification_workreport.md` is obsolete after PR allocation and is scheduled for deletion as recovery-metadata cleanup.

No production or workflow path may exist above the qualified production target.

Runner classifications remain distinct:

```text
FAIL
FULL_PASS
TARGETED_PASS_FULL_NOT_RUN
NOT_RUN
```

An omitted build/browser gate cannot become PASS.

## Targeted runner inventory

The runner is authored to execute:

1. Master Data containment;
2. support-load execution-index/base-mass structural guard;
3. independent EMPTY/OPE/HYD mass hand check;
4. empirical formula production fixture;
5. LoadCalc binding-currentness structural guard;
6. LoadCalc binding-currentness runtime fixture;
7. LoadCalc dependency-invalidation structural guard;
8. LoadCalc dependency-invalidation runtime fixture;
9. staged SJSON identity operation guard;
10. immutable snapshot evidence-reuse operation guard;
11. frozen evidence-alias cache operation guard;
12. affected `node:test` regressions.

Optional `--repository-gates` adds:

- `npm run check:imports`;
- `npm run build`.

Optional `--browser` adds the governed 4,884-entity P1 browser/invalidation route, but it may only be treated as authoritative when the exact content-addressed fixture is bound and P0 authority is satisfied.

## Executed / inspected evidence

### Q1-A — support-load mass hand arithmetic

Status: **PASS**  
Observation: `LOCAL_EXECUTION`  
Oracle: `ANALYTICAL`

Exact current-main hand-check values:

```text
inside diameter = 154.08 mm
metal            = 134.252021893143 kg
insulation       =  19.545575773942 kg
EMPTY            = 153.797597667084 kg
OPE              = 229.080257741813 kg
HYD              = 242.206010945431 kg
```

For EMPTY/OPE/HYD, `Object.is(oldMass, newMass)` passed, preserving IEEE-754 association across the preprocessing change.

### Q1-B — staged SJSON identity extraction

Status: **PASS 5/5**  
Observation: `LOCAL_EXECUTION` using a reconstructed exact-current-main ESM workspace  
Oracle: `INDEPENDENT_REPRODUCTION` for legacy-search parity plus implementation-coupled regression coverage

Coverage:

- direct/nested/root precedence;
- parent inheritance;
- depth-four boundary;
- truthy non-string first-match/stringification semantics;
- BRANCH source-name override;
- independent retained copy of the removed legacy search algorithm.

No identity mismatch was observed in the targeted suite. Historical 4,884-node generated parity evidence also recorded zero identity mismatches for unchanged production blobs; that historical result is not promoted to a current full-run PASS.

### Q1-C — frozen evidence-alias cache

Status: **PASS 3/3**  
Observation: `LOCAL_EXECUTION`  
Oracle: `IMPLEMENTATION_COUPLED`

Proved:

- frozen alias arrays normalize once and reuse cached keys;
- mutable aliases remain deliberately uncached and mutation is observed;
- alias/root precedence is unchanged.

### Q1-D — immutable SourcePackageSnapshot reuse

Status: **PASS at source/custody boundary**  
Observation: `SOURCE_INSPECTION`  
Oracle: `AUTHORITATIVE_REFERENCE` against the production authority chain

Verified:

```text
parsed upload
  -> cloneJsonValue(input.sourcePackage)
  -> deep-frozen SourcePackageSnapshot
  -> staged index reads sourceSnapshot.sourcePackage
  -> normalized entity reuses only frozen snapshot subtrees
```

The guard confirms:

- authoritative source-package clone remains `1 -> 1`;
- per-entity evidence `clonePlain()` calls remain `24,420 -> 0` at 4,884 entities;
- `requireImmutableSourceItem()` remains fail-closed on frozen items;
- normalized evidence is not sourced from mutable upload memory.

The complete runtime regression remains `NOT_RUN`.

### Q1-E — LoadCalc binding currentness

Status: **PASS at exact-source contract boundary**  
Observation: `SOURCE_INSPECTION`  
Oracle: `AUTHORITATIVE_REFERENCE`

Verified invariants:

- Project Data semantic hash cached per installed immutable profile instance;
- runtime revision separate from engineering profile revision;
- binding refresh uses precomputed shared/support/route semantic identities;
- runtime basis includes model revision, Project Data runtime revision, dataset identity/version, and dataset/Line List/Piping Class/Component Weight SHA identities;
- Material Map remains outside the empirical binding contract;
- SHA-256 provenance validation remains in the binding path;
- immutable artifact hash cache remains object-identity scoped.

Runtime currentness fixture: `NOT_RUN`.

### Q1-F — dependency-directed invalidation

Status: **PASS at exact-source contract boundary**  
Observation: `SOURCE_INSPECTION`  
Oracle: `AUTHORITATIVE_REFERENCE`

Verified:

- exactly four Project Data inputs govern support/route rebuild currentness;
- load-only Project Data changes stale empirical/common input without rebuilding support/route;
- topology-policy changes still rebuild/request topology refresh;
- Master Data changes do not rebuild support/route and publish `topologyCheckAffected:false`;
- LoadCalc suppresses topology refresh only when metadata is explicitly false; omitted/true retains conservative fallback;
- canonical topology basis remains dataset/topology/attachment/restraint/tolerance only;
- current `src/main.js` still invalidates Empirical V3 on the established `project-data-changed/master-data-changed` contract.

Runtime dependency-invalidation fixtures: `NOT_RUN`.

### Q1-G — support-load execution index/base-mass mechanics

Status: **PASS at exact-source mechanics boundary**  
Observation: `SOURCE_INSPECTION` plus Q1-A analytical execution  
Oracle: `ANALYTICAL` for mass association, `AUTHORITATIVE_REFERENCE` for preserved production seams

Verified:

- entity/edge/chainage indexes are distribution-scoped;
- support projection remains only for globally unblocked READY routes;
- base mass resolved once per unique executable physical entity;
- per-case loop consumes precomputed mass artifact;
- fluid mass remains case-dependent;
- floating-point association remains `(metal + insulation) + fluid`;
- uniform/point distribution and equilibrium seams remain unchanged;
- performance counters remain observational and outside engineering output.

Complete empirical production fixture: `NOT_RUN`.

### Q1-H — historical real-project import benchmark

Status: **PASS — HISTORICAL ONLY**  
Observation: `ARTIFACT_INSPECTION`  
Oracle: `AUTHORITATIVE_REFERENCE`

Published advanced-tab qualification reports exact expected = actual for the authoritative 25,219,174-byte source and the frozen 4,884/3,277/1,331 identity.

Limitation: this does **not** establish current exact-head P0 acceptance and cannot satisfy the current browser/command-ladder gate by itself.

## Validation ledger

| Gate | Status | Observation | Oracle | Current limitation |
|---|---|---|---|---|
| Current production target custody | PASS | REMOTE_EXECUTION | NONE | exact GitHub live state GE-001 |
| `behind_by=0` / merge base current main | PASS | REMOTE_EXECUTION | NONE | exact GitHub compare |
| Qualification-only diff | PASS | REMOTE_EXECUTION | NONE | no production/workflow paths |
| Reviews / threads | PASS | REMOTE_EXECUTION | NONE | none present |
| Commit statuses / workflow runs | NOT_RUN | REMOTE_EXECUTION | NONE | zero statuses/runs exist |
| Runner syntax | PASS | LOCAL_EXECUTION | IMPLEMENTATION_COUPLED | syntax only |
| Support-load hand arithmetic | PASS | LOCAL_EXECUTION | ANALYTICAL | targeted mechanism |
| Staged identity targeted suite | PASS 5/5 | LOCAL_EXECUTION | INDEPENDENT_REPRODUCTION | reconstructed exact modules |
| Evidence alias cache suite | PASS 3/3 | LOCAL_EXECUTION | IMPLEMENTATION_COUPLED | targeted regression |
| Immutable snapshot reuse | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | runtime test still NOT_RUN |
| Binding currentness | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | runtime fixture NOT_RUN |
| Dependency invalidation | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | runtime fixture NOT_RUN |
| Support-load indexing/base mass | PASS | SOURCE_INSPECTION + LOCAL_EXECUTION | ANALYTICAL | integrated empirical fixture NOT_RUN |
| Historical real-project fixture identity | PASS HISTORICAL | ARTIFACT_INSPECTION | AUTHORITATIVE_REFERENCE | not current-head P0 acceptance |
| Full exact-head targeted runner | NOT_RUN | NOT_OBSERVED | NONE | complete checkout unavailable |
| Integrated empirical production fixture | NOT_RUN | NOT_OBSERVED | AUTHORITATIVE_REFERENCE | exact checkout required |
| Exact-head import check | NOT_RUN | NOT_OBSERVED | NONE | exact checkout required |
| Exact-head production build | NOT_RUN | NOT_OBSERVED | NONE | exact checkout required |
| 4,884 browser timing/invalidation | NOT_RUN | NOT_OBSERVED | AUTHORITATIVE_REFERENCE | exact external bytes unbound + P0 not accepted |
| P0 acceptance gate | FAIL / NOT SATISFIED | ARTIFACT_INSPECTION | AUTHORITATIVE_REFERENCE | Issue #541 / PR #544 state `P0_ACCEPTED=false` |
| P1 production-fix authority | FAIL / NOT AUTHORIZED | ARTIFACT_INSPECTION | AUTHORITATIVE_REFERENCE | must remain blocked until P0 Owner acceptance |

`FAIL / NOT SATISFIED` above describes an authority gate state, not a discovered product numerical failure.

No `NOT_RUN` is represented as PASS.

## Changed-file ledger at GE-001

- `scripts/performance-stack-exact-head-qualification.mjs` — qualification runner only;
- `agents/PR1243_workreport.md` — living recovery/qualification authority;
- `agents/WIP-performance-stack-qualification_workreport.md` — obsolete after PR allocation; scheduled for deletion.

No production file and no `.github/workflows/*` file is changed.

## Active items

- `ISS-001` — complete exact-head combined performance-stack runtime qualification remains unexecuted. **OPEN**.
- `ISS-002` — exact external 25,219,174-byte 4,884-source is not bound in the current execution environment. **OPEN / BLOCKING**.
- `ISS-003` — P0 exact-head executable baseline remains unaccepted. **OPEN / BLOCKING P1 PRODUCTION**.
- `RISK-001` — historical benchmark PASS could be incorrectly promoted to current-head P0 acceptance. **OPEN / PROTECTED AGAINST**.
- `RISK-002` — future main drift after fixture recovery may invalidate current browser/build qualification basis. **OPEN**.
- `DEC-001` — #1243 remains qualification-only and is the permitted evidence vehicle while P1 production is frozen. **ACTIVE**.
- `DEC-002` — no substitute fixture may replace the content-addressed 4,884 authority. **ACTIVE**.
- `DEC-003` — operation-count reductions do not justify another optimization without current wall-clock evidence. **ACTIVE**.
- `QST-001` — explicit Owner P0 acceptance is required after exact-head evidence exists. **OPEN**.

## Falsifier

Quarantine or recommend revert of the merged performance stack if complete exact-head execution changes any:

- source/dataset semantic identity;
- staged identity field or hierarchy;
- normalized engineering value/evidence source;
- authorized empirical binding field/value;
- stale/current authorization transition;
- topology refresh dependency semantics;
- contribution mass/force/allocation;
- support reaction or contributor order;
- CoG/equilibrium result;
- blocker/readiness content/order;
- output/evidence semantic identity for equivalent authoritative input;
- page error/render-owner contract.

A failure to meet current performance thresholds without protected-identity drift is a performance finding, not permission to weaken identity/authority requirements.

## Current disposition

```text
PARTIAL_TARGETED_QUALIFICATION_PASS
FULL_EXACT_HEAD_QUALIFICATION_NOT_RUN
P0_ACCEPTANCE_NOT_SATISFIED
P1_PRODUCTION_FIX_NOT_AUTHORIZED
```

No engineering/numerical mismatch has been observed in executed/source-qualified checks. That is not equivalent to full application qualification.

## EXACT_NEXT_ACTION

```text
1. Obtain the exact external source historically identified as:
   F:\CODE-5-SS\ATTRIBUTE-AML_ASIM-1835_managed_stage_enriched_stage.json

2. Independently verify before use:
   SHA-256 = 88e62782772d743e9236d13775476826f9649ab06d3161de35dc500baa85a9c6
   byteLength = 25219174
   rawRootCount = 276
   rawNodeCount = 4884
   rawSupportCount = 1331
   normalizedPipeCount = 3277
   normalizedSupportCount = 1331
   normalizedComponentCount = 276

3. On an execution-capable exact current-main checkout, run the merged P0 baseline with the bound fixture and browser evidence, plus:
   node scripts/performance-stack-exact-head-qualification.mjs --repository-gates

4. Only after the exact-head P0 report is complete and explicitly accepted by the Owner may P1 production work resume.

5. Re-ground against then-current main before salvaging/reconstructing #1244/#1245 or selecting any further optimization.
```
