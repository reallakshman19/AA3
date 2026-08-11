# Integrated LAFEA Common/Stage Architecture — Living Work Report

## PR Mission Control

- **Mission:** evolve LAFEA into one governed analysis platform with common engineering infrastructure and explicit stage-specific physics/authority while preserving lifecycle, mesh custody, numerical verification, and fail-closed release semantics.
- **Source task:** #1025.
- **PR:** #1038, DRAFT.
- **Branch:** `agent/integrated-lafea-common-stage-roadmap`.
- **Original base:** `a587867963cc9199caca6e7adfa03af95a316aa2`.
- **Current validated implementation HEAD:** `1dab5bc4b6a73f0f4fac474d37130f6c47be37f6`.
- **Current `main` last observed:** `084e0587ce1d3d17c87670456226bd6534891ed9`.
- **Current stage:** Stage 10 — Batch 3B LAFEA.3 source-mesh content identity, IN_PROGRESS.
- **Last completed stage:** Stage 9 — Batch 3A canonical continuum geometry identity.
- **Engineering status:** IN_PROGRESS.
- **Validation status:** Stage 9 exact-head bounded certification PASS; Stage 10 NOT_RUN.
- **Current blockers:** final PR closure remains blocked on current-`main` reconciliation (RISK-004). Repository-integration attribution remains red from unrelated LFEA piping defect ISS-001 while its complete repository gate and hygiene steps pass.
- **Exact next action:** make the legacy LAFEA.3 `ANALYSIS_MESH` artifact identify canonical mesh content only, keep execution/recovery physics evidence separate, add focused production regression, then exact-head validate.

## Handover in 60 Seconds

### Completed bounded increments

1. Production stage adapter now owns route family and semantic input requirements.
2. LAFEA.1 and LAFEA.3 consume one shared unit-factor registry without changing stage unit contracts.
3. FE thickness edits are `SECTION_PROPERTY`; analytical pipe-wall thickness remains `GEOMETRY`.
4. Legacy LAFEA.3 `ANALYSIS_GEOMETRY.artifactHash` now comes from canonical coordinates/topology only.

### Stage 9 validated truth

The production LAFEA.3 geometry record is stable across:

```text
material-property edits
section/thickness edits
load edits
boundary-condition edits
provenance-only source-reference edits
```

and changes for:

```text
node-coordinate edits
stable node/topology identity edits
```

The geometry record still carries exact current `sourceHash` and `canonicalModelHash` parents. Stable geometry identity therefore does **not** automatically imply current evidence after a source edit; explicit revalidation remains required.

### Why Stage 10 exists

The legacy LAFEA.3 mesh hash is still broader than mesh content. It currently hashes:

```text
analysisGeometryHash
meshProfileHash
sourceMesh = essentially the full LAFEA.3 source document
retainedAcceptedMeshEvidence = stiffness/element/numerical evidence
```

The source document contains materials, element thickness, constraints, loads, result requests, and provenance. Retained mesh evidence contains stiffness-related numerical evidence. Consequently the legacy `ANALYSIS_MESH.artifactHash` changes for edits that do not alter discretization.

The repository already has the correct semantic distinction in `lafea-analysis-mesh-contract.js`:

```text
meshHash       = canonical mesh content
artifactHash   = broader governed evidence envelope (in explicit custody paths)
```

Stage 10 aligns the legacy lifecycle producer with the **mesh-content** side of that distinction. It will not change currentness rules.

---

## Governing Engineering Invariants

1. UI/render state is never engineering authority.
2. Calculation success is not release qualification.
3. Geometry identity, mesh-content identity, execution evidence, recovery evidence, custody evidence, and release evidence remain distinct.
4. No old source/model/mesh hash is copied forward to manufacture currentness.
5. Stable artifact identity is not equivalent to current parent binding.
6. LAFEA.6 remains fail-closed unsupported.
7. No `.github/workflows/*` changes without explicit Owner authorization.
8. Every new abstraction must have an immediate production consumer and focused regression.
9. Stage 10 is LAFEA.3-only; LAFEA.4/.5 legacy geometry/mesh hashing remains unchanged.

---

## Mission Status

| Work item | Priority | Status | Evidence |
|---|---:|---|---|
| Integrated roadmap | P0 | DONE | `docs/IntegratedLAFEAroadmap.md` |
| Common/stage route + semantic inputs | P0 | VALIDATED | prior exact-head PASS |
| Shared LAFEA.1/.3 unit factors | P0 | DONE | `569dfaa...` PASS |
| FE section-property taxonomy | P0 | DONE | `5709110...` PASS |
| LAFEA.3 canonical geometry identity | P0 | DONE | `1dab5bc...` PASS |
| LAFEA.3 canonical source-mesh identity | P0 | IN_PROGRESS | Stage 10 plan below |
| Explicit geometry/mesh revalidation | P0 | NOT_STARTED | later batch |
| Dependency-aware mesh preservation | P0 | NOT_STARTED | requires explicit revalidation |
| Named physical regions/probes | P0 | NOT_STARTED | roadmap |
| Canonical solver-model compiler | P0 | NOT_STARTED | roadmap |
| Results/comparison/verification center | P1 | NOT_STARTED | roadmap |
| Standalone runtime/history/release/dossier | P1 | NOT_STARTED | roadmap |
| Current-main reconciliation | P0 | IN_PROGRESS | RISK-004 |
| Cross-product attribution defect | P1 | BLOCKED | ISS-001 |

---

## Engineering Decisions / Risks

| ID | Type | Status | Summary |
|---|---|---|---|
| DEC-001 | Decision | ACCEPTED | One common LAFEA platform plus explicit stage physics/capability adapters. |
| DEC-006 | Decision | VALIDATED | Unit commonization shares scale facts, not stage unit authority. |
| DEC-007 | Decision | VALIDATED | No mesh-current preservation until exact geometry/mesh parent evidence can be revalidated. |
| DEC-008 | Decision | VALIDATED | FE thickness is `SECTION_PROPERTY`; analytical wall thickness remains geometry. |
| DEC-009 | Decision | VALIDATED | LAFEA.3 geometry identity excludes material/section/load/BC/provenance semantics. |
| DEC-010 | Decision | VALIDATED | Geometry artifact identity changed; source/model parent contract remained exact. |
| DEC-011 | Decision | ACCEPTED | Legacy LAFEA.3 mesh artifact should identify discretization content, not stiffness/load/result evidence. |
| DEC-012 | Decision | ACCEPTED | Execution/recovery hashes remain responsible for physics/numerical evidence removed from mesh identity. |
| RISK-004 | Risk | IN_PROGRESS | Branch is not closure-ready until synchronized with current `main` and revalidated. |
| ISS-001 | Defect | BLOCKED | Unrelated LFEA piping repository-attribution contradiction; out of scope. |

---

## Stage History

### Stages 1–3 — baseline / roadmap / draft PR

**COMPLETE.** Pinned the initial base, retained the integrated roadmap and living report, and opened draft PR #1038 before production changes.

### Stages 4–6 — first common/stage production boundary

**COMPLETE.** Centralized route classification (`ANALYTICAL`, `FEA`, `UNSUPPORTED`) and semantic input requirements in the existing stage adapter; guided workflow consumes them.

### Stage 7 — shared unit scale facts

**COMPLETE.** Added `src/core/lafea-common-input/units.js`; real LAFEA.1/LAFEA.3 unit adapters consume it. Stage-specific required dimensions, canonical maps, errors, and derived dimensions remain local. Validated head `569dfaa8642ffeebb3cd3b866e9626b125659193`.

### Stage 8 — FE `SECTION_PROPERTY` taxonomy

**COMPLETE.** Added FE-only `SECTION_PROPERTY` and reclassified LAFEA.3/.4/.5 element thickness. LAFEA.1 wall thickness remains geometry. Current lifecycle stays conservative: canonical/downstream stale, geometry/mesh revalidation required. Validated head `5709110edb38539853f02c6e0a5e6fd715cc68d7`.

### Stage 9 — Batch 3A canonical LAFEA.3 geometry identity

**Stage decision: COMPLETE.**

#### Implemented

- Added `src/workspace/lafea-continuum-geometry-projection.js`.
- Projection validates the canonical local-continuum model and retains only:
  - canonical length unit;
  - node identity and canonical x/y coordinates;
  - element identity, element type, and node connectivity.
- Excludes material assignment, thickness, source references, ancestry, loads, constraints, result requests, and qualification metadata.
- `lafea-lifecycle-producers.js` now uses that projection semantic hash as the legacy LAFEA.3 `ANALYSIS_GEOMETRY.artifactHash`.
- LAFEA.4/.5 retain the pre-existing geometry-hash path.
- General lifecycle parent keys remain `{ sourceHash, canonicalModelHash }`.
- Added `scripts/lafea-continuum-geometry-identity-check.mjs` to the established non-bucket aggregate.

#### Focused production proof

Actual workbench executions + producer batches demonstrated:

```text
baseline geometry hash = G
material edit           = G
section edit            = G
load edit               = G
BC edit                 = G
provenance edit         = G
node coordinate edit   != G
node/topology ID edit  != G
```

For every non-geometric edit:

- exact source authority changed;
- canonical-model evidence changed;
- geometry artifact identity remained equal;
- geometry record parent hashes matched the new exact source/model.

#### Validated exact head

`1dab5bc4b6a73f0f4fac474d37130f6c47be37f6`

PASS:

- focused geometry-identity regression through bounded non-bucket aggregate;
- retained LAFEA numerical core;
- LAFEA.1 foundation;
- retained meshing, solver, workbench, canvas;
- scoped Chromium;
- strict syntax/import;
- production build and exact patch hygiene;
- bounded certification matrix + enforcement;
- `main-gate`;
- bundle/T6 integration diagnostics;
- hybrid browser validation;
- dedicated LAFEA meshing exact-head qualification.

Repository integration attribution remained red only at its known enforcement matrix; its legacy aggregate, complete repository gate, and hygiene all passed. ISS-001 remains unrelated.

#### Authority statement

- solver formulas changed: **no**;
- material/section/load/BC semantics changed: **no**;
- geometry parent binding weakened: **no**;
- mesh currentness changed: **no**;
- release authority changed: **no**.

---

## Stage 10 — Batch 3B LAFEA.3 Source-Mesh Content Identity

### Objective

Make legacy LAFEA.3 `ANALYSIS_MESH.artifactHash` describe source-authored discretization content only, while leaving exact lifecycle invalidation/currentness unchanged.

### Expected scope

```text
agents/PR1038_workreport.md
src/workspace/lafea-continuum-source-mesh.js             new
src/workspace/lafea-lifecycle-producers.js                modify
scripts/lafea-continuum-mesh-identity-check.mjs           new
scripts/lafea-nonbucket-stack-check.mjs                   modify
```

No lifecycle schema/parent-key change, no mesh producer/custody v1/v2 change, no numerical kernel, no shell-stage change, no release, no workflow YAML.

### Planned engineering contract

Create a deterministic LAFEA.3 source-authored analysis-mesh representation from the validated canonical continuum model:

```text
schema: lafea-analysis-mesh/v1
meshIdentity: deterministic LAFEA.3 source-authored identity derived from canonical geometry identity
nodes:
  nodeId, canonical x, canonical y, z=0
elements:
  elementId, elementType, nodeIds
```

Then use existing `lafeaAnalysisMeshContentHash(...)` for the legacy LAFEA.3 lifecycle `ANALYSIS_MESH.artifactHash`.

This keeps mesh identity distinct from geometry identity because the existing mesh hash schema is different, while ensuring both change on actual coordinate/topology changes.

### Explicit exclusions from mesh identity

```text
materialId
thickness
sourceReference
constraints
loads
result requests
stiffness matrices
element stress/stiffness evidence
recovery evidence
source/canonical model hashes
```

Those belong to model/execution/recovery authority, not discretization content.

### Parent/currentness rule retained

The lifecycle record still has parents:

```text
analysisGeometryHash
meshProfileHash
```

and Stage 8 invalidation still marks geometry/mesh `REVALIDATION_REQUIRED` after a non-geometric source edit. Stage 10 does not promote retained mesh to current.

### Focused acceptance criteria

Actual LAFEA.3 workbench producer batches must prove:

```text
material edit        → same mesh artifact hash
section edit         → same mesh artifact hash
load edit            → same mesh artifact hash
BC edit              → same mesh artifact hash
provenance edit      → same mesh artifact hash
coordinate edit      → different mesh artifact hash
topology identity    → different mesh artifact hash
```

Additionally:

- mesh hash must differ from geometry hash;
- execution hash must still change when material/section/load/BC physics changes;
- execution parent `meshHash` must equal the new clean mesh artifact hash;
- release remains unqualified;
- LAFEA.4/.5 retained regression remains green.

### Risks

- misusing `meshIdentity` so metadata leaks back into content identity;
- accidentally removing physics evidence from execution/recovery hashes as well;
- treating stable mesh hash as automatic currentness;
- changing explicit mesh-custody v1/v2 behavior.

**Stage decision: IN_PROGRESS; production code not yet changed for Stage 10.**

---

## Changed-File Ledger

Validated through Stage 9:

```text
agents/PR1038_workreport.md
docs/IntegratedLAFEAroadmap.md
scripts/lafea-common-input-units-check.mjs
scripts/lafea-continuum-geometry-identity-check.mjs
scripts/lafea-nonbucket-stack-check.mjs
scripts/lafea-section-property-invalidation-check.mjs
scripts/lafea-ui-workflow-truthfulness-check.mjs
src/core/lafea-common-input/units.js
src/core/local-continuum/units.js
src/core/local-stress/units.js
src/workspace/lafea-continuum-geometry-projection.js
src/workspace/lafea-guided-workflow.js
src/workspace/lafea-lifecycle-producers.js
src/workspace/lafea-lifecycle-profiled.js
src/workspace/lafea-lifecycle-profiles.js
src/workspace/lafea-stage-analysis-adapter.js
src/workspace/lafea-stage-input-descriptors.js
src/workspace/lafea-workbench-source-state.js
```

Stage 10 planned files are listed above. No `.github/workflows/*` modification is authorized.

---

## Validation / Evidence Ledger

| Evidence | Head | Status |
|---|---|---|
| First common/stage slice | `d01de620...` | PASS |
| Shared unit factors | `569dfaa864...` | PASS |
| Section-property taxonomy | `5709110edb...` | PASS |
| Canonical geometry identity | `1dab5bc4b6...` | PASS |
| Stage 9 main-gate / browser / meshing | `1dab5bc4b6...` | PASS |
| Stage 10 mesh identity | — | NOT_RUN |
| Repository integration attribution | `1dab5bc4b6...` | BLOCKED by ISS-001 only |
| Current-main integrated PR | — | NOT_STARTED |

---

## Known / Deferred Work

- **ISS-001:** unrelated LFEA piping attribution contradiction — OUT OF SCOPE.
- **RISK-004:** branch/main reconciliation required before PR closure.
- Explicit geometry/mesh revalidation across non-geometric edits — deferred until geometry + mesh identities are both stable.
- Actual dependency-aware retained-mesh currentness — deferred until a governed revalidation transaction exists.
- LAFEA.4/.5 equivalent geometry/mesh identity cleanup — deferred until continuum path is proven.
- Named physical regions/probes, solver-model compiler, semantic result comparison, verification center, standalone runtime/history/release/dossier remain roadmap work.

---

## Next-Agent Handover

- **Current stage:** Stage 10 / Batch 3B, IN_PROGRESS.
- **Last validated implementation head:** `1dab5bc4b6a73f0f4fac474d37130f6c47be37f6`.
- **Start here:** create `lafea-continuum-source-mesh.js` from the canonical continuum geometry projection and existing `lafea-analysis-mesh-contract` content hash.
- **Modify only:** LAFEA.3 branch of legacy `lafea-lifecycle-producers.js` plus focused regression/aggregate wiring.
- **Do not alter:** lifecycle parent keys, invalidation currentness, explicit mesh custody v1/v2, shell stages, solver numerics, release, workflow YAML.
- **Highest risk:** confusing clean mesh content identity with evidence currentness. Stable hash does not authorize reuse by itself.
