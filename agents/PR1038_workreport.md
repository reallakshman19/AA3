# Integrated LAFEA Common/Stage Architecture — Living Work Report

## PR Mission Control

- **Mission:** evolve LAFEA into one governed analysis platform with common engineering infrastructure and explicit stage-specific physics/authority while preserving lifecycle, mesh custody, numerical verification, and fail-closed release semantics.
- **Source task:** #1025.
- **PR:** #1038, DRAFT.
- **Branch:** `agent/integrated-lafea-common-stage-roadmap`.
- **Original base:** `a587867963cc9199caca6e7adfa03af95a316aa2`.
- **Current validated implementation HEAD:** `5709110edb38539853f02c6e0a5e6fd715cc68d7`.
- **Current `main` observed:** `084e0587ce1d3d17c87670456226bd6534891ed9`.
- **Current stage:** Stage 8 — Batch 2A dependency-change taxonomy, COMPLETE.
- **Next stage:** Stage 9 — geometry-specific authority / parent identity, NOT_STARTED.
- **Engineering status:** VALIDATED.
- **Validation status:** Stage 8 exact-head bounded certification, main gate, hybrid browser, and dedicated meshing qualification PASS.
- **Current blockers:** final PR closure remains blocked on explicit current-`main` reconciliation. Cross-product repository integration attribution has a known unrelated LFEA piping defect (ISS-001).
- **Exact next action:** before changing authority contracts, inspect the current `ANALYSIS_GEOMETRY` producer/custody path and define the minimum geometry-specific parent identity that can survive material/load/section edits without silently rebinding retained evidence.

## Handover in 60 Seconds

### What is true now

- `docs/IntegratedLAFEAroadmap.md` is the governing implementation roadmap.
- LAFEA stage routing and semantic input requirements are centralized in the production-consumed stage analysis adapter.
- LAFEA.1/.2 remain analytical, LAFEA.3/.4/.5 remain FE, and LAFEA.6 remains fail-closed unsupported.
- Common unit scale facts are owned by `src/core/lafea-common-input/units.js` and consumed by the real LAFEA.1 and LAFEA.3 production unit adapters.
- FE element/shell thickness is now semantically classified as `SECTION_PROPERTY`, not `GEOMETRY`.
- `SECTION_PROPERTY` is authorized only by the current FE lifecycle profile (`LAFEA.3/.4/.5`). It is not authorized for LAFEA.1, LAFEA.2, or LAFEA.6.
- LAFEA.1 nominal pipe-wall thickness and corrosion allowance remain `GEOMETRY` because they define the analytical pipe-wall geometry.
- Stage 8 deliberately does **not** keep retained geometry or mesh evidence `CURRENT` after a section edit. Under the current exact-parent contract they remain `REVALIDATION_REQUIRED`; solver/recovery/convergence evidence becomes `STALE`.
- No solver formula, FE element formulation, mesher, mesh-custody hash, release rule, or workflow YAML was changed in Stage 8.

### Why mesh preservation is not implemented yet

Current FE lifecycle lineage defines `ANALYSIS_GEOMETRY` with parents:

```text
sourceHash
canonicalModelHash
```

A material/load/section edit changes the source/canonical model even if geometry coordinates and topology are unchanged. Therefore merely leaving retained geometry/mesh `CURRENT` would assert a false parent binding.

The required sequence is:

```text
semantic source-change taxonomy        COMPLETE
        ↓
geometry-specific authority identity   NEXT
        ↓
dependency-aware mesh preservation     LATER
```

No old hash may be copied forward to manufacture currentness.

---

## Governing Engineering Invariants

1. UI state is not solver authority.
2. Calculation success is not release qualification.
3. Producer, custody, geometry, mesh, result, verification, and release identities remain distinct.
4. Stale/revalidation evidence remains retained and auditable; it is never silently rebound.
5. Shared infrastructure may remove duplicated facts but may not broaden physics, accepted input vocabulary, or release claims.
6. LAFEA.6 stays unsupported.
7. No `.github/workflows/*` changes without explicit Owner authorization.
8. Every new abstraction or authority field requires a real production consumer and focused regression in the same batch.
9. Exact parent authority outranks convenience: currentness may only be retained when the parent identity actually remains current.

---

## Mission Status

| Work item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Living work report | P0 | IN_PROGRESS | All | This file |
| Integrated roadmap | P0 | DONE | 1 | `docs/IntegratedLAFEAroadmap.md` |
| Common/stage route + semantic input boundary | P0 | VALIDATED | 4–6 | exact-head PASS |
| Batch 1A shared unit factors | P0 | DONE | 7 | `569dfaa...` exact-head PASS |
| Batch 2A section-property taxonomy | P0 | DONE | 8 | `5709110...` exact-head PASS |
| Geometry-specific authority identity | P0 | NOT_STARTED | 9 | next authority gate |
| Dependency-aware mesh preservation | P0 | NOT_STARTED | later | depends on Stage 9 |
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
| DEC-002 | Decision | P0 | ACCEPTED | Extend production-consumed boundaries; no speculative parallel capability service. |
| DEC-003 | Decision | P0 | ACCEPTED | LAFEA.4/.5 share shell infrastructure only where engineering meaning is identical. |
| DEC-004 | Decision | P0 | ACCEPTED | New common abstractions require immediate real consumers. |
| DEC-005 | Decision | P0 | VALIDATED | Common stage adapter is semantic and UI-independent. |
| DEC-006 | Decision | P0 | VALIDATED | Batch 1A shares only unit scale facts; stage unit contracts remain local. |
| DEC-007 | Decision | P0 | VALIDATED | Do not keep mesh current across a changed source until geometry has an exact geometry-specific parent identity. |
| DEC-008 | Decision | P0 | VALIDATED | FE thickness is `SECTION_PROPERTY`; analytical pipe-wall dimensions remain `GEOMETRY`. |
| DEC-009 | Decision | P0 | ACCEPTED | Stage 9 must introduce/derive geometry authority from geometry-relevant source projection, not from arbitrary UI state or copied previous hashes. |
| RISK-001 | Risk | High | MITIGATED | Commonization boundary is covered by retained exact-head numerical/product checks. |
| RISK-002 | Risk | High | MITIGATED | Release/custody authority did not change through Stages 7–8. |
| RISK-004 | Risk | High | IN_PROGRESS | PR branch diverged from current `main`; final closure requires synchronization and full revalidation. |
| ISS-001 | Defect | P1 | BLOCKED | Pre-existing LFEA piping attribution contradiction; out of assignment scope. |
| IMP-001 | Improvement | P0 | DONE | Guided input requirements centralized at stage adapter. |
| IMP-003 | Improvement | P0 | DONE | Shared LAFEA.1/LAFEA.3 unit-factor registry with production consumers. |
| IMP-004 | Improvement | P0 | DONE | FE section-property change taxonomy corrected and validated. |

---

## Stage History

### Stages 1–3 — baseline, roadmap, report, draft PR

**Stage decision: COMPLETE.**

Pinned the initial base, inventoried current stage/lifecycle/meshing truth, created the roadmap and living report, and opened draft PR #1038 before production changes.

### Stages 4–6 — first common/stage production boundary

**Stage decision: COMPLETE.**

Implemented production-consumed route classification (`ANALYTICAL`, `FEA`, `UNSUPPORTED`) and semantic input capabilities (`materials`, `restraints`, `loads`) in `lafea-stage-analysis-adapter.js`; `lafea-guided-workflow.js` consumes them. Focused and aggregate exact-head validations passed. No solver/custody/release authority changed.

### Stage 7 — Batch 1A shared unit-conversion primitive

**Stage decision: COMPLETE.**

#### Implemented

- Added `src/core/lafea-common-input/units.js` containing frozen unit-to-canonical scale facts.
- Converted LAFEA.1 `local-stress/units.js` and LAFEA.3 `local-continuum/units.js` into real production consumers.
- Kept required dimensions, canonical unit maps, validation errors, and derived dimensions stage-local.
- Added `scripts/lafea-common-input-units-check.mjs` to the established non-bucket aggregate.

#### Validation deviation

The first focused test asserted the ideal literal `1e-9` for `1e-6 / 1000`; JavaScript evaluates the existing production derivation as `9.999999999999999e-10`. Production code was unchanged. The test was corrected to assert the exact derivation.

#### Validated implementation head

`569dfaa8642ffeebb3cd3b866e9626b125659193`

PASS: focused common-unit guard, bounded non-bucket, numerical core, foundation, meshing, solver, workbench, canvas, Chromium, syntax/import, build/hygiene, main-gate, bundle diagnostic, hybrid browser.

### Stage 8 — Batch 2A dependency-change taxonomy

**Stage decision: COMPLETE.**

#### Objective

Correct the semantic classification of FE thickness edits without prematurely changing mesh/currentness authority.

#### Implemented

1. Added `SECTION_PROPERTY` to the governed input invalidation vocabulary.
2. Added `SECTION_PROPERTY` to lifecycle source-change vocabulary.
3. Authorized `SECTION_PROPERTY` only for `FEA_MESH_RECOVERY_V1` (`LAFEA.3/.4/.5`).
4. Added it to workbench typed source-transition routing.
5. Reclassified:
   - `LAFEA.3.element.thickness`;
   - `LAFEA.4.element.thickness`;
   - `LAFEA.5.shell.element.thickness`.
6. Changed those descriptor descendant declarations from all-engineering/mesh-affecting to model/downstream-only.
7. Kept LAFEA.1 pipe nominal thickness and corrosion allowance as `GEOMETRY`.
8. Added `scripts/lafea-section-property-invalidation-check.mjs` and wired it into the existing non-bucket aggregate.

#### Actual lifecycle behavior

For a current LAFEA.3 chain, applying `SECTION_PROPERTY` produces:

```text
SOURCE                 new CURRENT source hash
CANONICAL_MODEL        STALE
ANALYSIS_GEOMETRY      REVALIDATION_REQUIRED
ANALYSIS_MESH          REVALIDATION_REQUIRED
EXECUTION              STALE
RECOVERY               STALE
CONVERGENCE            STALE
```

This is intentionally conservative. The semantic taxonomy is corrected, but retained geometry/mesh is not promoted across a changed parent authority.

#### Focused proof

The Stage 8 regression proves:

- the three FE thickness descriptors are `SECTION_PROPERTY`;
- their descriptor descendants exclude `MESH`;
- LAFEA.3/.4/.5 lifecycle profiles authorize the class;
- LAFEA.1/.2/.6 do not authorize it;
- LAFEA.1 analytical pipe-wall thickness remains `GEOMETRY`;
- lifecycle geometry/mesh remain `REVALIDATION_REQUIRED`, not `CURRENT`;
- release authority remains unchanged.

#### Patch-scope deviation and correction

During the first full-file lifecycle edit, patch audit found one unintended message-only change in a legacy validation error string. It had no engineering effect, but it was outside scope and was reverted before Stage 8 validation. The resulting production diff is limited to the intended taxonomy/source-routing changes.

#### Validated implementation head

`5709110edb38539853f02c6e0a5e6fd715cc68d7`

Exact-head PASS:

- focused `lafea-section-property-invalidation` through the bounded non-bucket aggregate;
- retained LAFEA numerical core;
- LAFEA.1 foundation checks;
- retained meshing checks;
- solver checks;
- workbench and canvas checks;
- scoped Chromium non-bucket validation;
- strict syntax and import-boundary checks;
- production build;
- exact patch hygiene;
- bounded certification matrix + enforcement;
- `main-gate`;
- LAFEA bundle diagnostic;
- LAFEA hybrid browser validation;
- dedicated LAFEA meshing exact-head qualification.

#### Authority statement

- numerical formulas changed: **no**;
- material/section constitutive physics changed: **no**;
- mesh producer changed: **no**;
- retained mesh promoted across a source edit: **no**;
- custody hash interpretation changed: **no**;
- release authority changed: **no**;
- LAFEA.6 enabled: **no**.

---

## Stage 9 Gate — Geometry-Specific Authority / Parent Identity

**Status: NOT_STARTED.**

This is an authority-sensitive batch and must be planned from current production contracts before code changes.

### Required investigation

Trace the exact current production path for:

```text
stage document
→ canonical model
→ analysis-geometry evidence
→ mesh request / mesh evidence
→ mesh custody
→ current/stale projection
```

Identify which parts of source state actually define geometry for LAFEA.3 first. The target is a deterministic geometry-relevant projection/hash that changes for coordinate/topology/geometry-feature edits but does not change for material, section, load, or BC-only edits.

### Non-negotiable constraints

- Do not derive authority from rendered/display geometry.
- Do not copy old `sourceHash` or `canonicalModelHash` forward.
- Do not reinterpret producer-owned mesh hashes.
- Do not make existing retained mesh current merely because a change class says it is non-geometric.
- Preserve old evidence as stale/revalidation evidence where exact parent lineage cannot be proven.
- Introduce the smallest production-consumed contract; no broad new geometry framework in one patch.
- LAFEA.3 is the first target; shell stages follow only after the continuum path is proven.

### Stage 9 exit concept

A focused test must demonstrate both directions:

```text
material/section/load edit
→ geometry-specific identity unchanged

node coordinate/topology/physical geometry edit
→ geometry-specific identity changed
```

Only after that identity is bound into lifecycle/custody may a later batch consider preserving mesh currentness for non-geometric edits.

---

## Changed-File Ledger

Current assignment files:

| File | Stage | Purpose | Status |
|---|---:|---|---|
| `docs/IntegratedLAFEAroadmap.md` | 1 | integrated architecture roadmap | DONE |
| `agents/PR1038_workreport.md` | all | living engineering report | IN_PROGRESS |
| `src/workspace/lafea-stage-analysis-adapter.js` | 4 | stage route/input capability boundary | VALIDATED |
| `src/workspace/lafea-guided-workflow.js` | 4 | real guided-workflow consumer | VALIDATED |
| `scripts/lafea-ui-workflow-truthfulness-check.mjs` | 4 | route/input regression | VALIDATED |
| `src/core/lafea-common-input/units.js` | 7 | common unit-factor facts | VALIDATED |
| `src/core/local-stress/units.js` | 7 | LAFEA.1 consumer | VALIDATED |
| `src/core/local-continuum/units.js` | 7 | LAFEA.3 consumer | VALIDATED |
| `scripts/lafea-common-input-units-check.mjs` | 7 | unit commonization regression | VALIDATED |
| `src/workspace/lafea-lifecycle-profiled.js` | 8 | source-change vocabulary | VALIDATED |
| `src/workspace/lafea-lifecycle-profiles.js` | 8 | FE-only class authorization | VALIDATED |
| `src/workspace/lafea-workbench-source-state.js` | 8 | typed source-transition routing | VALIDATED |
| `src/workspace/lafea-stage-input-descriptors.js` | 8 | FE thickness semantic classification | VALIDATED |
| `scripts/lafea-section-property-invalidation-check.mjs` | 8 | focused taxonomy/currentness proof | VALIDATED |
| `scripts/lafea-nonbucket-stack-check.mjs` | 4,7,8 | established aggregate wiring | VALIDATED |

No `.github/workflows/*` file is changed by this assignment.

---

## Validation / Evidence Ledger

| Evidence | Head | Status | Notes |
|---|---|---|---|
| First common/stage slice | `d01de620...` | PASS | bounded exact-head suite |
| Batch 1A common units | `569dfaa864...` | PASS | focused + retained suites |
| Batch 2A section taxonomy | `5709110edb...` | PASS | focused + bounded enforcement |
| Stage 8 main-gate | `5709110edb...` | PASS | all steps |
| Stage 8 hybrid browser | `5709110edb...` | PASS | exact candidate head |
| Stage 8 dedicated meshing qualification | `5709110edb...` | PASS | governed meshing gate |
| Repository integration attribution | `5709110edb...` | BLOCKED | ISS-001 unrelated LFEA piping contradiction |
| Current-main integrated PR | — | NOT_STARTED | required before closure |

### Repository-attribution note

The separate repository-integration attribution job remains red, while its legacy aggregate, complete repository gate, and hygiene steps all execute successfully. The known matrix failure remains attributable to ISS-001 in LFEA piping governance and is outside this assignment. It does not override the bounded LAFEA exact-head PASS evidence.

---

## Branch / Integration Risk

### RISK-004 — current-main divergence

Current `main` is `084e0587ce1d3d17c87670456226bd6534891ed9`, containing the standalone LFEA runtime/shared-linear-solver merge after this PR's original base.

The upstream 22-commit compare did not show direct overlap with the LAFEA files modified by this assignment. Nevertheless, the PR is not considered closure-ready until the feature branch is explicitly synchronized/reconciled with current `main` and the full required suite is re-run on the resulting exact head.

Do not merge PR #1038 while RISK-004 remains open.

---

## Known / Deferred Work

- **ISS-001:** unrelated LFEA repository-attribution contradiction — BLOCKED / OUT OF SCOPE.
- **RISK-004:** branch/main reconciliation — IN_PROGRESS; required before final closure.
- Geometry-specific parent identity — next authority-sensitive batch.
- Mesh preservation for material/section/load-only edits — deferred until geometry parent identity is exact.
- Named physical regions/probes — deferred.
- Deeper meshing/custody lineage consolidation — deferred.
- Canonical solver-model compiler — deferred.
- Result semantic comparison and verification center — deferred.
- Standalone LAFEA runtime/history/release/dossier and eventual physical extraction — deferred until engineering boundaries stabilize.

---

## Next-Agent Handover

- **PR / branch:** #1038 / `agent/integrated-lafea-common-stage-roadmap`.
- **Last validated implementation head:** `5709110edb38539853f02c6e0a5e6fd715cc68d7`.
- **Last completed stage:** Stage 8 — `SECTION_PROPERTY` taxonomy.
- **Stage decision:** COMPLETE.
- **Next stage:** Stage 9 geometry-specific authority / parent identity; NOT_STARTED.
- **Start by reading:** `lafea-lifecycle-profiles.js`, the analysis-geometry producer/evidence/custody modules, mesh request/generation/custody path, and current LAFEA.3 canonical model geometry fields.
- **Do not redo:** route/input adapter, common unit factors, or section-property taxonomy.
- **Do not claim:** non-geometric edits can preserve a current mesh yet.
- **Do not change without evidence:** lifecycle parent keys or custody currentness rules.
- **Highest-risk item:** accidentally creating an authority hash that is merely a projection convenience rather than a deterministic engineering-geometry parent.
- **Exact next recommended action:** inventory the current LAFEA.3 geometry-evidence producer and all consumers of `analysisGeometryHash`, `sourceHash`, and `canonicalModelHash`; then retain a pre-implementation Stage 9 plan in this report before any authority-contract write.
