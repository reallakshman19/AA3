# Integrated LAFEA Common/Stage Architecture — Living Work Report

## PR Mission Control

- **Mission:** evolve LAFEA into one governed analysis platform with common engineering infrastructure and explicit stage-specific physics/authority while preserving lifecycle, mesh custody, numerical verification, and fail-closed release semantics.
- **Source task:** #1025.
- **PR:** #1038, DRAFT.
- **Branch:** `agent/integrated-lafea-common-stage-roadmap`.
- **Original base:** `a587867963cc9199caca6e7adfa03af95a316aa2`.
- **Last validated implementation HEAD:** `5709110edb38539853f02c6e0a5e6fd715cc68d7`.
- **Current report HEAD before Stage 9 production edits:** `ed19b3e1256102effed00c637a1f316fbdecf7ab`.
- **Current `main` observed:** `084e0587ce1d3d17c87670456226bd6534891ed9`.
- **Current stage:** Stage 9 — Batch 3A LAFEA.3 canonical geometry identity, IN_PROGRESS.
- **Last completed stage:** Stage 8 — FE `SECTION_PROPERTY` taxonomy.
- **Engineering status:** IN_PROGRESS.
- **Validation status:** Stage 8 exact-head PASS; Stage 9 NOT_RUN.
- **Current blockers:** final PR closure remains blocked on explicit current-`main` reconciliation. Cross-product repository integration attribution has unrelated LFEA piping defect ISS-001.
- **Exact next action:** add a production-consumed LAFEA.3 canonical geometry projection, make the legacy lifecycle producer use its semantic hash for `ANALYSIS_GEOMETRY`, add focused stability/change regression, and run exact-head retained suites.

## Handover in 60 Seconds

### Completed architecture increments

1. Stage route/input semantics centralized in the existing production stage adapter.
2. Shared unit scale facts consumed by real LAFEA.1 and LAFEA.3 unit adapters.
3. FE thickness edits classified as `SECTION_PROPERTY`, while LAFEA.1 pipe-wall thickness remains true geometry.
4. No batch has promoted release, changed numerical formulas, or silently repaired stale evidence.

### Stage 9 finding

The repository already contains a strong pure planar geometry contract for the domain-first LAFEA.3 route:

```text
analysisGeometryHash = hash(
  geometryId,
  coordinateSystemId,
  lengthUnit,
  vertices,
  segments,
  loops
)
```

That domain-first hash correctly excludes material, section, load, and BC semantics.

The older/common lifecycle producer does not. Its current `ANALYSIS_GEOMETRY` hash is derived from:

```text
sourceHash
canonicalModelHash
source nodes
source elements
```

and raw element rows include:

```text
elementId
elementType
nodeIds
materialId
thickness
sourceReference
```

Therefore a material/section/provenance edit can change legacy `ANALYSIS_GEOMETRY` identity even when physical coordinates/topology do not change.

### Stage 9 principle

Fix the **artifact identity first**, not currentness.

The Stage 9A result must be:

```text
same canonical geometry
+ changed material/section/load/BC/provenance
→ same ANALYSIS_GEOMETRY artifactHash

changed coordinates/topology
→ different ANALYSIS_GEOMETRY artifactHash
```

The lifecycle record will still carry exact current `sourceHash` and `canonicalModelHash` parents. A changed source therefore still requires explicit geometry revalidation. Mesh evidence will not be promoted or preserved in this batch.

---

## Governing Engineering Invariants

1. UI/render geometry is never engineering geometry authority.
2. Calculation success is not release qualification.
3. No previous source/canonical/mesh hash is copied forward to manufacture currentness.
4. Geometry artifact identity and geometry evidence parent binding are separate concepts.
5. Producer, custody, mesh, recovery, verification, and release hashes remain distinct.
6. LAFEA.6 remains unsupported.
7. No `.github/workflows/*` changes without explicit Owner authorization.
8. Every new authority helper must have an immediate production consumer and focused regression.
9. Stage 9 is LAFEA.3-only; shell geometry identity is deferred until the continuum pattern is proven.

---

## Mission Status

| Work item | Priority | Status | Evidence |
|---|---:|---|---|
| Integrated roadmap | P0 | DONE | `docs/IntegratedLAFEAroadmap.md` |
| Common/stage route + semantic input boundary | P0 | VALIDATED | prior exact-head PASS |
| Shared LAFEA.1/.3 unit factors | P0 | DONE | `569dfaa...` PASS |
| FE section-property taxonomy | P0 | DONE | `5709110...` PASS |
| LAFEA.3 canonical geometry identity | P0 | IN_PROGRESS | Stage 9 plan below |
| Explicit geometry revalidation/currentness | P0 | NOT_STARTED | later batch |
| Mesh identity/preservation after nongeometry edit | P0 | NOT_STARTED | depends on geometry + mesh projections |
| Named physical regions/probes | P0 | NOT_STARTED | roadmap |
| Canonical solver-model compiler | P0 | NOT_STARTED | roadmap |
| Results/verification center | P1 | NOT_STARTED | roadmap |
| Runtime extraction/history/release/dossier | P1 | NOT_STARTED | roadmap |
| Current-main reconciliation | P0 | IN_PROGRESS | RISK-004 |
| Cross-product attribution defect | P1 | BLOCKED | ISS-001 |

---

## Engineering Item Register

| ID | Type | Status | Summary |
|---|---|---|---|
| DEC-001 | Decision | ACCEPTED | One common LAFEA platform plus explicit stage physics/capability adapters. |
| DEC-005 | Decision | VALIDATED | Common stage adapter is semantic/UI-independent. |
| DEC-006 | Decision | VALIDATED | Unit commonization shares scale facts, not stage unit authority. |
| DEC-007 | Decision | VALIDATED | No mesh-current preservation until exact geometry parent identity exists. |
| DEC-008 | Decision | VALIDATED | FE thickness is `SECTION_PROPERTY`; analytical pipe-wall thickness stays `GEOMETRY`. |
| DEC-009 | Decision | ACCEPTED | Canonical LAFEA.3 geometry identity must exclude material, section, loads/BCs, and provenance-only metadata. |
| DEC-010 | Decision | ACCEPTED | Stage 9 changes artifact identity only; existing source/canonical parent binding stays exact and fail-closed. |
| IMP-003 | Improvement | DONE | Shared unit-factor registry. |
| IMP-004 | Improvement | DONE | FE section-property taxonomy. |
| IMP-005 | Improvement | IN_PROGRESS | Stable LAFEA.3 legacy lifecycle geometry artifact identity. |
| RISK-004 | Risk | IN_PROGRESS | Branch/main divergence must be reconciled before PR closure. |
| ISS-001 | Defect | BLOCKED | Unrelated LFEA piping repository-attribution contradiction. |

---

## Stage History

### Stages 1–3 — baseline / roadmap / draft PR

**Stage decision: COMPLETE.**

Pinned base truth, created `docs/IntegratedLAFEAroadmap.md`, created the living report, and opened draft PR #1038 before production changes.

### Stages 4–6 — production common/stage boundary

**Stage decision: COMPLETE.**

Centralized route classification and semantic input requirements in `lafea-stage-analysis-adapter.js`; `lafea-guided-workflow.js` consumes them. Exact-head focused/aggregate checks passed.

### Stage 7 — shared unit scale facts

**Stage decision: COMPLETE.**

Added `src/core/lafea-common-input/units.js`; LAFEA.1 and LAFEA.3 production unit adapters consume it. Stage contracts/errors remain local. Validated head: `569dfaa8642ffeebb3cd3b866e9626b125659193`.

### Stage 8 — FE `SECTION_PROPERTY` taxonomy

**Stage decision: COMPLETE.**

Added `SECTION_PROPERTY` as an FE-only source-change class and reclassified LAFEA.3/.4/.5 element thickness. LAFEA.1 nominal/corrosion thickness remains geometry. Current lifecycle behavior remains fail-closed:

```text
CANONICAL_MODEL        STALE
ANALYSIS_GEOMETRY      REVALIDATION_REQUIRED
ANALYSIS_MESH          REVALIDATION_REQUIRED
EXECUTION/RECOVERY     STALE
```

Validated head `5709110edb38539853f02c6e0a5e6fd715cc68d7` passed focused invalidation regression, bounded non-bucket enforcement, numerical core, foundation, meshing, solver, workbench, canvas, Chromium, syntax/import, build/hygiene, main-gate, hybrid browser, and dedicated meshing qualification.

---

## Stage 9 — Batch 3A LAFEA.3 Canonical Geometry Identity

### Current truth

Two lineages coexist:

1. **Domain-first LAFEA.3** already has `lafea-analysis-geometry/v1`, a canonical geometry semantic hash independent of material/load/section data.
2. **Legacy/common lifecycle producer** computes `ANALYSIS_GEOMETRY` from `sourceHash + canonicalModelHash + sourceMesh nodes/elements`, and the element rows include non-geometric fields.

The general lifecycle record then parent-binds `ANALYSIS_GEOMETRY` to exact `sourceHash` and `canonicalModelHash`. That parent binding is useful and will remain.

### Objective

Make the legacy/common LAFEA.3 `ANALYSIS_GEOMETRY.artifactHash` describe canonical geometry only, so the artifact identity can remain stable across non-geometric engineering edits while parent records continue to prove which exact source/model revalidated it.

### Expected scope

```text
agents/PR1038_workreport.md
src/workspace/lafea-continuum-geometry-projection.js      new
src/workspace/lafea-lifecycle-producers.js                modify
scripts/lafea-continuum-geometry-identity-check.mjs       new
scripts/lafea-nonbucket-stack-check.mjs                   modify
```

No general lifecycle schema/parent-key change, no mesh producer/custody change, no numerical-kernel change, no release change, no workflow YAML.

### Engineering projection

Use the already-canonical LAFEA.3 model as input. The projection should retain only:

```text
schema
stageId
canonical length unit
nodes:
  nodeId
  x
  y
elements:
  elementId
  elementType
  nodeIds
```

Exclude:

```text
materialId
thickness
sourceReference
source ancestry
loads
constraints
result requests
qualification metadata
```

Rationale:

- coordinates and element connectivity/type determine the legacy source-authored FE geometry/topology;
- material assignment and thickness affect stiffness/section semantics, not coordinate/topology identity;
- loads/BCs do not define the mesh geometry;
- source references are provenance, not physical geometry;
- canonical coordinates make physically equivalent declared length-unit representations normalize before hashing.

### Planned implementation

1. Add a small LAFEA.3-only projection module that validates the canonical local-continuum model and returns a frozen canonical projection plus `semanticHash` using `canonicalLafeaSha256`.
2. In `feaRecords`, use this projection only for `stageId === 'LAFEA.3'` when producing the `ANALYSIS_GEOMETRY` artifact hash.
3. Preserve the existing LAFEA.4/.5 geometry-hash path unchanged in Stage 9A.
4. Preserve the `ANALYSIS_GEOMETRY` record parents `{ sourceHash, canonicalModelHash }` unchanged.
5. Do not change `ANALYSIS_MESH` hashing/currentness in this batch.
6. Add a focused production regression that runs actual LAFEA.3 stores/producer batches and proves hash invariance/change behavior.
7. Wire the focused regression into the existing non-bucket aggregate.

### Expected behavior

For qualified LAFEA.3 runs:

```text
baseline                    → geometry hash G
elastic modulus changed     → geometry hash G
thickness changed           → geometry hash G
load magnitude changed      → geometry hash G
constraint value changed    → geometry hash G
provenance-only source ref  → geometry hash G
node coordinate changed     → geometry hash G2 != G
```

Canonical model/source hashes are expected to change in the non-geometric cases; only geometry artifact identity remains stable.

### Edge cases

- T3 declared rotation/reflection canonicalization remains governed by the existing canonical model; projection does not repair topology.
- T6/Q8 node order remains meaningful and therefore participates in the projection hash.
- Element IDs and node IDs remain part of identity because existing loads/refinement mappings use stable engineering IDs.
- Element type changes geometry/topology identity.
- A change from raw `mm` to physically equivalent `m` should not change geometry identity if the canonical model resolves to identical canonical coordinates/unit.
- Invalid canonical models fail closed before projection.
- Shell stages remain on their existing path and must show no changed evidence hashes due to this batch.

### Validation plan

Focused:

- baseline vs material edit = same geometry hash;
- baseline vs section edit = same geometry hash;
- baseline vs load/BC edit = same geometry hash;
- baseline vs provenance-only metadata = same geometry hash;
- baseline vs node-coordinate edit = different geometry hash;
- producer batch consumes the projection hash as `ANALYSIS_GEOMETRY.artifactHash`;
- parent record still contains exact current `sourceHash` and `canonicalModelHash`.

Retained:

- bounded non-bucket aggregate;
- LAFEA.3 numerical core;
- foundation/analytical routes;
- retained meshing/solver/workbench/canvas;
- Chromium, syntax/import, build/hygiene;
- main-gate and dedicated meshing qualification as triggered.

### Risks

- accidentally using source/raw rather than canonical coordinates;
- excluding topology that meshing/refinement actually depends on;
- changing LAFEA.4/.5 hash behavior unintentionally;
- treating stable artifact identity as proof of current parent binding;
- tests asserting only helper behavior while the real producer still uses old hashing.

**Stage decision: PARTIAL until implementation + exact-head evidence complete.**

---

## Changed-File Ledger

Validated assignment files through Stage 8:

```text
agents/PR1038_workreport.md
docs/IntegratedLAFEAroadmap.md
scripts/lafea-common-input-units-check.mjs
scripts/lafea-nonbucket-stack-check.mjs
scripts/lafea-section-property-invalidation-check.mjs
scripts/lafea-ui-workflow-truthfulness-check.mjs
src/core/lafea-common-input/units.js
src/core/local-continuum/units.js
src/core/local-stress/units.js
src/workspace/lafea-guided-workflow.js
src/workspace/lafea-lifecycle-profiled.js
src/workspace/lafea-lifecycle-profiles.js
src/workspace/lafea-stage-analysis-adapter.js
src/workspace/lafea-stage-input-descriptors.js
src/workspace/lafea-workbench-source-state.js
```

Stage 9 planned files are listed in its scope section. No `.github/workflows/*` file is authorized.

---

## Validation / Evidence Ledger

| Evidence | Head | Status |
|---|---|---|
| Common/stage first slice | `d01de620...` | PASS |
| Batch 1A common units | `569dfaa864...` | PASS |
| Batch 2A section taxonomy | `5709110edb...` | PASS |
| Stage 8 main-gate / hybrid / meshing exact-head | `5709110edb...` | PASS |
| Stage 9 focused geometry identity | — | NOT_RUN |
| Stage 9 bounded regression | — | NOT_RUN |
| Repository integration attribution | current heads | BLOCKED — ISS-001 unrelated |
| Current-main integrated PR | — | NOT_STARTED |

---

## Known / Deferred Work

- **ISS-001:** unrelated LFEA repository-attribution contradiction — BLOCKED / OUT OF SCOPE.
- **RISK-004:** branch/main reconciliation required before closure.
- Mesh artifact identity still includes broader source mesh/evidence and is not addressed in Stage 9A.
- Explicit geometry revalidation/currentness across non-geometric source edits remains deferred.
- LAFEA.4/.5 geometry projection follows only after LAFEA.3 is proven.
- Named physical regions/probes, solver-model compiler, result comparison, verification center, standalone runtime/history/release/dossier remain roadmap work.

---

## Next-Agent Handover

- **Current stage:** Stage 9 / Batch 3A, IN_PROGRESS.
- **Last validated implementation head:** `5709110edb38539853f02c6e0a5e6fd715cc68d7`.
- **Start here:** add `lafea-continuum-geometry-projection.js`; consume it in the LAFEA.3 branch of `lafea-lifecycle-producers.js`.
- **Do not alter:** lifecycle parent keys, mesh hash/currentness, shell-stage geometry identity, solver numerics, release, workflow YAML.
- **Required proof:** production producer-batch geometry hash stable for material/section/load/BC/provenance edits and changed for coordinate/topology edit.
- **Highest risk:** confusing stable geometry artifact identity with current authority; parents must remain exact and changed-source revalidation must remain explicit.
