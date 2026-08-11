# Integrated LAFEA Common/Stage Architecture — Living Work Report

## PR Mission Control

- **Mission:** evolve LAFEA into one governed analysis platform with common engineering infrastructure and explicit stage-specific physics/authority while preserving lifecycle, mesh custody, numerical verification, and fail-closed release semantics.
- **Source task:** #1025.
- **PR:** #1038, DRAFT.
- **Branch:** `agent/integrated-lafea-common-stage-roadmap`.
- **Original base:** `a587867963cc9199caca6e7adfa03af95a316aa2`.
- **Current validated implementation HEAD:** `569dfaa8642ffeebb3cd3b866e9626b125659193`.
- **Current `main` last observed before Batch 1A:** `084e0587ce1d3d17c87670456226bd6534891ed9`.
- **Current stage:** Stage 8 — Batch 2A dependency-change taxonomy.
- **Last completed stage:** Stage 7 — Batch 1A shared unit-conversion primitive.
- **Engineering status:** IN_PROGRESS.
- **Validation status:** Stage 7 bounded exact-head certification PASS; Stage 8 NOT_STARTED.
- **Current blockers:** final PR closure remains blocked on explicit current-`main` reconciliation. Cross-product repository integration attribution has a known unrelated LFEA piping defect (ISS-001).
- **Exact next action:** add `SECTION_PROPERTY` as a governed FE source-change class, reclassify continuum/shell thickness descriptors, preserve current lifecycle status behavior, and add focused exact-head regression.

## Handover in 60 Seconds

### What is true now

- The integrated architecture roadmap is in `docs/IntegratedLAFEAroadmap.md`.
- Stage route family and semantic input requirements are centralized in the production-consumed stage analysis adapter.
- LAFEA.1/.2 remain analytical, LAFEA.3/.4/.5 remain FE, LAFEA.6 remains fail-closed unsupported.
- Common unit scale facts are now owned by `src/core/lafea-common-input/units.js` and consumed by both LAFEA.1 and LAFEA.3 production unit adapters.
- Stage-specific required unit keys, canonical unit maps, validation errors, derived dimensions, and physics remain local.
- Exact-head Batch 1A validation passed the focused common-unit guard, retained numerical core, foundation, meshing, solver, workbench, canvas, Chromium, syntax/import, build, hygiene, main-gate, bundle diagnostic, and hybrid-browser checks.
- The first Batch 1A focused run exposed only an over-strict test literal for `1e-6 / 1000`; production behavior was unchanged. The test was corrected to assert the actual derivation, then the exact-head certification passed.

### Important new finding

The target invalidation model cannot safely keep a retained mesh `CURRENT` after a material/load/section edit under the current parent contract, because `ANALYSIS_GEOMETRY` is bound to both `sourceHash` and `canonicalModelHash`. A source/model change therefore breaks exact geometry lineage even when geometry coordinates did not change.

This means the implementation sequence must be:

```text
semantic change taxonomy
    ↓
geometry-specific authority / projection identity
    ↓
dependency-aware mesh preservation
```

Do **not** simply change `REVALIDATION_REQUIRED` to `CURRENT`; that would copy old authority across a changed source without a valid parent binding.

### Stage 8 objective

Correct one current semantic error without changing custody authority:

```text
LAFEA.3 element thickness
LAFEA.4 shell thickness
LAFEA.5 host-shell thickness
```

are section/property edits, not geometric-coordinate/topology edits. Introduce `SECTION_PROPERTY` as an FE engineering source change class and route those descriptors through it. Current lifecycle invalidation statuses intentionally remain the same as other non-geometry source edits until geometry authority is split in a later batch.

---

## Governing Engineering Invariants

1. UI state is not solver authority.
2. Calculation success is not release qualification.
3. Producer/custody/currentness evidence remains exact and fail-closed.
4. No source/mesh evidence is silently repaired by copying old hashes forward.
5. Shared infrastructure may remove duplicated facts but may not broaden physics or accepted inputs.
6. LAFEA.6 stays unsupported.
7. No `.github/workflows/*` changes without explicit Owner authorization.
8. Every new abstraction/change class must have a real production consumer and focused regression in the same batch.

---

## Mission Status

| Work item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Living work report | P0 | IN_PROGRESS | All | This file |
| Integrated roadmap | P0 | DONE | 1 | `docs/IntegratedLAFEAroadmap.md` |
| Common/stage route + semantic input boundary | P0 | VALIDATED | 4–6 | exact-head PASS |
| Batch 1A shared unit factors | P0 | DONE | 7 | `569dfaa...` bounded certification PASS |
| Batch 2A section-property change taxonomy | P0 | IN_PROGRESS | 8 | plan below |
| Geometry-specific authority identity | P0 | NOT_STARTED | next | prerequisite to mesh preservation |
| Dependency-aware mesh preservation | P0 | NOT_STARTED | later | blocked by geometry parent contract |
| Named physical regions / probes | P0 | NOT_STARTED | later | roadmap |
| Meshing integration / lineage | P0 | NOT_STARTED | later | roadmap |
| Canonical solver-model compiler | P0 | NOT_STARTED | later | roadmap |
| Results / semantic comparison | P1 | NOT_STARTED | later | roadmap |
| Verification center | P1 | NOT_STARTED | later | roadmap |
| Standalone runtime/history/release/dossier | P1 | NOT_STARTED | later | roadmap |
| Current-main branch reconciliation | P0 | IN_PROGRESS | closure | RISK-004 |
| Cross-product attribution defect | P1 | BLOCKED | existing | ISS-001 |

---

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | One common LAFEA platform plus explicit stage physics/capability adapters. |
| DEC-002 | Decision | P0 | ACCEPTED | Extend production-consumed boundaries; no speculative parallel service. |
| DEC-003 | Decision | P0 | ACCEPTED | LAFEA.4/.5 share shell infrastructure only where engineering meaning is identical. |
| DEC-004 | Decision | P0 | ACCEPTED | New common abstractions require immediate real consumers. |
| DEC-005 | Decision | P0 | ACCEPTED | Common adapter is semantic/UI-independent. |
| DEC-006 | Decision | P0 | VALIDATED | Batch 1A shares unit scale facts only; stage unit contracts remain local. |
| DEC-007 | Decision | P0 | ACCEPTED | Do not keep mesh current across changed source until a geometry-specific parent identity exists. |
| DEC-008 | Decision | P0 | ACCEPTED | FE thickness is `SECTION_PROPERTY`; analytical pipe-wall dimensions remain `GEOMETRY`. |
| RISK-001 | Risk | High | VALIDATED | Commonization boundary protected by exact-head numerical/product checks. |
| RISK-002 | Risk | High | VALIDATED | Release/custody authority remained unchanged through Batch 1A. |
| RISK-004 | Risk | High | IN_PROGRESS | PR branch was 22 commits behind `main` before Batch 1A; final closure requires reconciliation/revalidation. |
| ISS-001 | Defect | P1 | BLOCKED | Pre-existing LFEA piping anti-drift/governance-recording contradiction causes repository attribution failure. Out of scope. |
| IMP-001 | Improvement | P0 | DONE | Guided input requirements centralized at stage adapter. |
| IMP-003 | Improvement | P0 | DONE | Shared LAFEA.1/LAFEA.3 unit factor registry with real consumers and focused gate. |
| IMP-004 | Improvement | P0 | IN_PROGRESS | Correct FE section-property source-change taxonomy. |

---

## Stage History

### Stages 1–3 — baseline, roadmap, report, draft PR

**Decision: COMPLETE.**

Pinned the initial base, inventoried current LAFEA stage/lifecycle/meshing truth, created the roadmap and living report, and opened draft PR #1038 before production changes.

### Stages 4–6 — first common/stage boundary

**Decision: COMPLETE.**

Implemented production-consumed route classification (`ANALYTICAL`, `FEA`, `UNSUPPORTED`) and semantic input capabilities (`materials`, `restraints`, `loads`) in `lafea-stage-analysis-adapter.js`; the guided workflow consumes them. Focused and aggregate exact-head validations passed. No solver/custody/release authority changed.

### Stage 7 — Batch 1A shared unit-conversion primitive

**Decision: COMPLETE.**

#### Implemented

- Added `src/core/lafea-common-input/units.js` with frozen unit-to-canonical factor facts and fail-closed lookup.
- Converted LAFEA.1 `local-stress/units.js` to consume the shared factors.
- Converted LAFEA.3 `local-continuum/units.js` to consume the shared factors.
- Kept stage-specific canonical unit sets and required dimensions local.
- Kept LAFEA.3 `bodyForceIntensity` as an explicitly derived local dimension.
- Added `scripts/lafea-common-input-units-check.mjs` and wired it into the established non-bucket aggregate.
- No workflow YAML, solver, mesh custody, recovery, or release file changed.

#### Validation issue and correction

First implementation head `00220e17056db3b52efc015cc99cd86485af1780` passed all retained product/numerical checks but the new focused test failed because it expected floating-point `1e-9` exactly while production evaluates `1e-6 / 1000` as `9.999999999999999e-10`. This was a test defect only.

The test was corrected to assert the exact production derivation. No production code changed in the correction.

#### Validated head

`569dfaa8642ffeebb3cd3b866e9626b125659193`

PASS on the exact head:

- bounded non-bucket aggregate including `lafea-common-input-units`;
- retained LAFEA numerical core;
- LAFEA.1 foundation checks;
- retained meshing, solver, workbench and canvas checks;
- scoped Chromium validation;
- strict syntax/import checks;
- production build and patch hygiene;
- `main-gate`;
- LAFEA bundle diagnostic;
- LAFEA hybrid browser validation.

Dedicated meshing qualification was still completing its final aggregate step when this report stage was opened; the same retained meshing checks already passed inside the bounded exact-head certification.

#### Authority statement

- numerical formulas changed: **no**;
- accepted unit vocabulary broadened: **no**;
- canonical units changed: **no**;
- lifecycle semantics changed: **no**;
- mesh custody changed: **no**;
- release authority changed: **no**.

---

## Stage 8 — Batch 2A dependency-change taxonomy

### Current truth

`LAFEA_INVALIDATION_CLASSES` and lifecycle source change classes currently include:

```text
MATERIAL_PROPERTY
GEOMETRY
LOAD_OR_BC
MODEL_METADATA
```

In the current descriptors:

- LAFEA.3 `element.thickness` is `GEOMETRY`;
- LAFEA.4 `element.thickness` is `GEOMETRY`;
- LAFEA.5 `shell.element.thickness` is `GEOMETRY`.

Those thickness values affect section/stiffness behavior but do not change nodal coordinates or element topology. Treating them as geometry prevents a future correct dependency graph from distinguishing remesh-relevant edits from solve-only section edits.

LAFEA.1 nominal pipe thickness/corrosion allowance remain `GEOMETRY` because they define the analytical pipe-wall geometry itself.

### Objective

Introduce a bounded semantic source-change class:

```text
SECTION_PROPERTY
```

for FE section/thickness edits and route the three existing FE thickness descriptors through it.

### Expected scope

```text
agents/PR1038_workreport.md
src/workspace/lafea-stage-input-descriptors.js
src/workspace/lafea-lifecycle-profiled.js
src/workspace/lafea-lifecycle-profiles.js
src/workspace/lafea-workbench-source-state.js
scripts/lafea-section-property-invalidation-check.mjs
scripts/lafea-nonbucket-stack-check.mjs
```

No workflow YAML, numerical engine, mesh producer, custody, solver, recovery, or release module is in scope.

### Planned implementation

1. Add `SECTION_PROPERTY` to the governed descriptor invalidation vocabulary.
2. Add it to lifecycle source-change classes.
3. Authorize it only in `FEA_MESH_RECOVERY_V1` for current stages LAFEA.3/.4/.5.
4. Add it to workbench source transition classification.
5. Reclassify only FE thickness descriptors:
   - `LAFEA.3.element.thickness`;
   - `LAFEA.4.element.thickness`;
   - `LAFEA.5.shell.element.thickness`.
6. Keep LAFEA.1 wall-thickness geometry descriptors unchanged.
7. Preserve current lifecycle status transition for all non-geometry source changes: canonical model/downstream stale; geometry/mesh `REVALIDATION_REQUIRED` under the current parent contract.
8. Add focused regression proving semantic classification, FE-only lifecycle authorization, LAFEA.1 geometry retention, and unchanged artifact-status behavior.
9. Wire the focused regression into the existing non-bucket aggregate.

### Expected behavior

A typed FE thickness edit emits `SECTION_PROPERTY`, not `GEOMETRY`. It does **not yet** preserve the mesh as `CURRENT`; exact lineage remains fail-closed until a later geometry-authority batch can provide a parent identity independent of full source/canonical-model changes.

### Edge cases

- LAFEA.1 pipe nominal thickness and corrosion allowance remain geometry changes.
- LAFEA.6 does not gain `SECTION_PROPERTY` authorization.
- Whole-document replacement remains conservatively broad.
- Unknown/untyped edits retain current fail-closed fallback behavior.
- No stale evidence is promoted or rebound.

### Validation plan

- focused `lafea-section-property-invalidation` script;
- U2 descriptor/edit checks;
- U3 lifecycle/source-state checks;
- bounded non-bucket aggregate;
- retained numerical/core/meshing/solver/workbench checks;
- syntax/import/build/hygiene exact-head CI.

### Risks

- accidental authorization of a new change class for analytical/unsupported profiles;
- changing status behavior rather than only taxonomy;
- future code treating `SECTION_PROPERTY` as mesh-current before geometry parent authority exists.

**Stage decision: IN_PROGRESS.**

---

## Changed-File Ledger

| File | Stage | Purpose | Status |
|---|---:|---|---|
| `docs/IntegratedLAFEAroadmap.md` | 1 | integrated architecture roadmap | DONE |
| `agents/PR1038_workreport.md` | all | living report | IN_PROGRESS |
| `src/workspace/lafea-stage-analysis-adapter.js` | 4 | route/input capability boundary | VALIDATED |
| `src/workspace/lafea-guided-workflow.js` | 4 | production consumer | VALIDATED |
| `scripts/lafea-ui-workflow-truthfulness-check.mjs` | 4 | focused route/input regression | VALIDATED |
| `src/core/lafea-common-input/units.js` | 7 | shared unit factors | VALIDATED |
| `src/core/local-stress/units.js` | 7 | LAFEA.1 shared-unit consumer | VALIDATED |
| `src/core/local-continuum/units.js` | 7 | LAFEA.3 shared-unit consumer | VALIDATED |
| `scripts/lafea-common-input-units-check.mjs` | 7 | focused common-unit regression | VALIDATED |
| `scripts/lafea-nonbucket-stack-check.mjs` | 4,7,8 | bounded aggregate wiring | IN_PROGRESS |
| Stage 8 files listed above | 8 | section-property taxonomy | NOT_STARTED |

Current PR changed-file count before Stage 8 production edits: 10 files. No `.github/workflows/*` file is changed.

---

## Validation / Evidence Ledger

| Evidence | Head | Status | Notes |
|---|---|---|---|
| First common/stage slice | `d01de620...` | PASS | exact-head bounded suite |
| Batch 1A focused common-unit + nonbucket | `569dfaa864...` | PASS | exact-head certification |
| Batch 1A numerical core/foundation | `569dfaa864...` | PASS | retained numerical/product suites |
| Batch 1A solver/workbench/canvas | `569dfaa864...` | PASS | retained suites |
| Batch 1A Chromium/syntax/import/build/hygiene | `569dfaa864...` | PASS | exact-head certification |
| Batch 1A main-gate | `569dfaa864...` | PASS | all steps |
| Batch 1A hybrid browser | `569dfaa864...` | PASS | exact candidate head |
| Repository integration attribution | `569dfaa864...` | BLOCKED | ISS-001 pre-existing LFEA piping gate contradiction |
| Current-main integration | — | NOT_STARTED | required before closure |
| Stage 8 focused/aggregate validation | — | NOT_STARTED | next |

---

## Known / Deferred Work

### ISS-001 — pre-existing cross-product integration defect

Pinned-base LFEA piping anti-drift code rejects a literal governed release-ledger path that another pinned-base governance-recording module contains. The repository integration matrix therefore reports full-gate failure. This PR does not modify either file. Keep out of scope unless Owner explicitly expands scope.

### RISK-004 — branch divergence

Before Batch 1A, PR #1038 was 22 commits behind current `main`, with no direct overlap found in the then-existing PR files. Final closure requires explicit synchronization/integration and full revalidation. Do not merge while this remains unresolved.

### Geometry authority prerequisite

True mesh preservation for material/load/section edits is deferred until the FE geometry artifact can bind to geometry-specific source/model identity rather than the entire changed source/canonical model. This is the next architecture dependency after Stage 8 taxonomy.

---

## Next-Agent Handover

- **Current stage:** Stage 8, Batch 2A `SECTION_PROPERTY` taxonomy.
- **Last validated head:** `569dfaa8642ffeebb3cd3b866e9626b125659193`.
- **Start files:** `lafea-stage-input-descriptors.js`, `lafea-lifecycle-profiled.js`, `lafea-lifecycle-profiles.js`, `lafea-workbench-source-state.js`.
- **Do not change:** solver numerics, mesh producer/custody, release, workflow YAML.
- **Do not claim:** mesh can remain current after section edit yet.
- **Required focused proof:** FE thickness emits/accepts `SECTION_PROPERTY`; LAFEA.1 pipe-wall thickness stays `GEOMETRY`; current lifecycle artifact status transition is unchanged and fail-closed.
- **After Stage 8:** open a geometry-authority batch before attempting dependency-aware mesh preservation.
