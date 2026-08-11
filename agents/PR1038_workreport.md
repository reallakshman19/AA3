# Integrated LAFEA Common/Stage Architecture — Living Work Report

## PR Mission Control

- **Mission:** evolve LAFEA into one governed analysis platform with common engineering infrastructure and explicit stage-specific physics/authority while preserving lifecycle, mesh custody, numerical verification, and fail-closed release semantics.
- **Source task:** #1025.
- **PR:** #1038, DRAFT.
- **Branch:** `agent/integrated-lafea-common-stage-roadmap`.
- **Original base:** `a587867963cc9199caca6e7adfa03af95a316aa2`.
- **Last validated implementation HEAD:** `1dab5bc4b6a73f0f4fac474d37130f6c47be37f6`.
- **Current Stage 10 implementation HEAD:** `7747d9a9e21bb4ef41dd2fb9fe4e1176b951a9c1`.
- **Current `main` last observed:** `084e0587ce1d3d17c87670456226bd6534891ed9`.
- **Current stage:** Stage 10 — Batch 3B LAFEA.3 source-mesh content identity, IMPLEMENTED / VALIDATION_PENDING.
- **Engineering status:** IN_PROGRESS.
- **Validation status:** Stage 9 PASS; Stage 10 exact-head run not yet attached when this report revision was written.
- **Closure blockers:** RISK-004 current-main reconciliation; ISS-001 unrelated LFEA piping repository-attribution contradiction.
- **Exact next action:** validate this exact branch head through the bounded non-bucket certification and retained numerical/browser/meshing gates; do not begin currentness/reuse changes unless Stage 10 is green.

## Handover in 60 Seconds

### Completed validated increments

1. **Stages 4–6 — common/stage routing:** production stage adapter owns `ANALYTICAL` / `FEA` / `UNSUPPORTED` route family and semantic input requirements; guided workflow consumes it; LAFEA.6 remains unsupported.
2. **Stage 7 — common unit factors:** LAFEA.1 and LAFEA.3 consume `src/core/lafea-common-input/units.js`; stage-specific unit contracts and error semantics remain local. Validated head `569dfaa8642ffeebb3cd3b866e9626b125659193`.
3. **Stage 8 — dependency taxonomy:** FE element/shell thickness is `SECTION_PROPERTY`; analytical pipe-wall thickness remains `GEOMETRY`. Geometry/mesh currentness remains fail-closed. Validated head `5709110edb38539853f02c6e0a5e6fd715cc68d7`.
4. **Stage 9 — LAFEA.3 geometry identity:** legacy `ANALYSIS_GEOMETRY.artifactHash` is now canonical coordinate/topology identity only; exact `sourceHash` and `canonicalModelHash` parents remain. Validated head `1dab5bc4b6a73f0f4fac474d37130f6c47be37f6`.

### Stage 10 implementation truth

Stage 10 aligns the legacy LAFEA.3 mesh artifact with the repository's existing canonical analysis-mesh content contract.

The LAFEA.3 lifecycle producer previously included the full source document and retained stiffness/numerical mesh evidence in `ANALYSIS_MESH.artifactHash`. That conflated discretization identity with material, section, load/BC, provenance, and execution evidence.

It now uses:

```text
canonical continuum geometry projection
        ↓
canonical lafea-analysis-mesh/v1
        ↓
lafeaAnalysisMeshContentHash(...)
        ↓
legacy LAFEA.3 ANALYSIS_MESH.artifactHash
```

The canonical source-authored mesh contains only:

```text
meshIdentity = LAFEA.3/SOURCE_AUTHORED/<geometry semantic hash>
nodes         = nodeId + canonical x/y + z=0
elements      = elementId + elementType + nodeIds
```

It explicitly excludes material assignment, thickness, source reference/provenance, constraints, loads, result requests, stiffness matrices, element stress/stiffness evidence, recovery evidence, source hash, and canonical-model hash.

Physics evidence is **not removed from the calculation chain**: LAFEA.3 execution and recovery hashes still consume the accepted numerical result evidence, load-case evidence, formula trace, canonical model, and clean mesh hash.

### Stage 10 does not change currentness

Stable geometry/mesh identity does not authorize retained evidence automatically. Stage 8 behavior remains:

```text
non-geometric source edit
→ CANONICAL_MODEL STALE
→ ANALYSIS_GEOMETRY REVALIDATION_REQUIRED
→ ANALYSIS_MESH REVALIDATION_REQUIRED
→ EXECUTION / RECOVERY / CONVERGENCE STALE
```

No old hash is copied forward and no mesh evidence is promoted to current in Stage 10.

---

## Governing Engineering Invariants

1. UI/render state is never engineering authority.
2. Calculation success is not release qualification.
3. Geometry identity, mesh-content identity, execution evidence, recovery evidence, custody evidence, and release evidence remain distinct.
4. No previous source/model/mesh hash may be copied forward to manufacture currentness.
5. Stable artifact identity is not equivalent to a current parent binding.
6. Producer-owned mesh hashes are not reinterpreted.
7. LAFEA.6 remains fail-closed unsupported.
8. No `.github/workflows/*` change without explicit Owner authorization.
9. Every new authority abstraction requires an immediate production consumer and focused regression.
10. Stage 10 is LAFEA.3-only; legacy LAFEA.4/.5 geometry/mesh hashing remains unchanged.

---

## Engineering Decisions / Risks

| ID | Type | Status | Summary |
|---|---|---|---|
| DEC-001 | Decision | ACCEPTED | One common LAFEA platform plus explicit stage physics/capability adapters. |
| DEC-006 | Decision | VALIDATED | Unit commonization shares scale facts, not stage unit authority. |
| DEC-007 | Decision | VALIDATED | No mesh-current preservation until geometry/mesh parent evidence is explicitly revalidated. |
| DEC-008 | Decision | VALIDATED | FE thickness is `SECTION_PROPERTY`; analytical pipe-wall thickness remains `GEOMETRY`. |
| DEC-009 | Decision | VALIDATED | LAFEA.3 geometry identity excludes material/section/load/BC/provenance semantics. |
| DEC-010 | Decision | VALIDATED | Geometry artifact identity is separate from exact source/model parent binding. |
| DEC-011 | Decision | IMPLEMENTED | Legacy LAFEA.3 mesh artifact identifies discretization content, not stiffness/load/result evidence. |
| DEC-012 | Decision | IMPLEMENTED | Execution/recovery retain physics/numerical evidence removed from mesh identity. |
| DEC-013 | Decision | ACCEPTED | Explicit revalidation must compare newly derived canonical identities; stable hashes alone do not authorize reuse. |
| RISK-004 | Risk | OPEN | PR branch must be reconciled with current `main` and fully revalidated before closure. |
| ISS-001 | Defect | BLOCKED | Unrelated LFEA piping repository-attribution contradiction; out of assignment scope. |

---

## Stage 9 — Canonical LAFEA.3 Geometry Identity — COMPLETE

### Implementation

- Added `src/workspace/lafea-continuum-geometry-projection.js`.
- Projection validates the canonical local-continuum model and retains canonical length unit, node IDs + canonical coordinates, and element IDs/types/connectivity.
- `lafea-lifecycle-producers.js` uses the projection semantic hash for LAFEA.3 `ANALYSIS_GEOMETRY.artifactHash` only.
- LAFEA.4/.5 retain their existing path.
- Added `scripts/lafea-continuum-geometry-identity-check.mjs` to the established non-bucket aggregate.

### Validated behavior

```text
material edit          → same geometry hash
section edit           → same geometry hash
load edit              → same geometry hash
BC edit                → same geometry hash
provenance edit        → same geometry hash
node coordinate edit   → different geometry hash
node/topology-ID edit  → different geometry hash
```

Exact source authority and canonical-model evidence still change for non-geometric edits, and geometry records bind the new exact parents.

### Evidence

Exact head `1dab5bc4b6a73f0f4fac474d37130f6c47be37f6` passed focused geometry identity, bounded non-bucket enforcement, numerical core, foundation, meshing, solver, workbench, canvas, Chromium, syntax/import, build/hygiene, main-gate, hybrid browser, T6/bundle diagnostics, and dedicated meshing qualification.

---

## Stage 10 — LAFEA.3 Source-Mesh Content Identity — IMPLEMENTED / VALIDATION_PENDING

### Files changed in this batch

```text
agents/PR1038_workreport.md
src/workspace/lafea-continuum-source-mesh.js
src/workspace/lafea-lifecycle-producers.js
scripts/lafea-continuum-mesh-identity-check.mjs
scripts/lafea-nonbucket-stack-check.mjs
```

No lifecycle schema/parent-key, explicit mesh custody v1/v2, solver kernel, shell-stage, release, or workflow-YAML file is changed.

### Production implementation

#### `src/workspace/lafea-continuum-source-mesh.js`

New LAFEA.3-only adapter:

- consumes the validated canonical continuum geometry projection;
- constructs repository-native `lafea-analysis-mesh/v1`;
- sets `z=0` for planar continuum nodes;
- uses deterministic mesh identity tied to canonical geometry identity;
- canonicalizes through existing `canonicalLafeaAnalysisMesh`.

#### `src/workspace/lafea-lifecycle-producers.js`

For LAFEA.3 only:

```text
ANALYSIS_GEOMETRY.artifactHash
  = canonical continuum geometry projection hash

ANALYSIS_MESH.artifactHash
  = lafeaAnalysisMeshContentHash(canonical source-authored mesh)
```

For LAFEA.4/.5 the old hash path remains unchanged.

The producer still requires accepted retained mesh evidence. LAFEA.3 execution continues to hash:

```text
canonicalModelHash
meshHash
physicalLoadCaseHash
solverProfileHash
accepted execution evidence:
  result.meshEvidence
  result.loadCaseResults
  formulaTrace
```

Recovery continues to bind execution + mesh + recovery profile + accepted recovery evidence.

### Focused regression

Added `scripts/lafea-continuum-mesh-identity-check.mjs` using actual LAFEA.3 workbench executions + producer batches.

It asserts:

```text
material edit         → same mesh hash, different execution hash
section edit          → same mesh hash, different execution hash
load edit             → same mesh hash, different execution hash
BC edit               → same mesh hash, different execution hash
provenance edit       → same mesh hash, different execution hash
coordinate edit       → different geometry + mesh hash
topology-ID edit      → different geometry + mesh hash
```

It also asserts:

- mesh content hash differs from geometry hash;
- mesh parent `analysisGeometryHash` equals the current geometry artifact;
- execution parent `meshHash` equals the clean mesh artifact;
- source and canonical-model evidence remain exact and change when appropriate;
- release remains unqualified.

The focused check is wired into `scripts/lafea-nonbucket-stack-check.mjs`; aggregate report schema is now v18 and declares `continuumMeshIdentityIntegrated: true`.

### Patch-scope audit

Commit `3033b9c99ef34032ac0af95a0b1d626e680ce74e` changed only the intended LAFEA.3 mesh-hash branch plus imports/helper. The conditional preserves the legacy LAFEA.4/.5 hash path exactly. Numerical execution/recovery evidence remains intact.

### Validation state

Implementation/aggregate head before this report synchronization:

`7747d9a9e21bb4ef41dd2fb9fe4e1176b951a9c1`

At the time this report revision was written, GitHub had not attached exact-head workflow runs to `7747d9...`; preceding Stage 10 commits were being exercised, but they did not contain the final aggregate wiring. Therefore **no Stage 10 pass is claimed yet**.

Required exact-head validation before Stage 10 can close:

- bounded non-bucket aggregate including `lafea-continuum-mesh-identity`;
- retained LAFEA numerical core and LAFEA.1 foundation;
- retained meshing, solver, workbench, canvas;
- Chromium browser validation;
- syntax/import/build/hygiene;
- main-gate;
- hybrid browser and dedicated meshing qualification when triggered.

---

## Next Batch Gate — Explicit Non-Geometric Geometry/Mesh Revalidation

**Status: NOT_STARTED. Do not implement until Stage 10 passes.**

The next architectural goal is not “keep mesh current because change class says so.” It is an explicit transaction that derives the new canonical model without running solver physics, recomputes geometry/mesh identities, compares them with retained evidence, and only then issues new current parent bindings if equality is proven.

Current composition already separates:

```text
normalizeDocument
→ canonicalize
→ calculate
```

although the public `executeLafeaStage` helper currently bundles canonicalization and calculation. A future bounded batch may expose a pure canonicalization/projection surface for revalidation.

Non-negotiable requirements for that future batch:

1. LAFEA.3 first only.
2. No solver calculation needed merely to prove unchanged geometry/mesh content.
3. Revalidation must derive current canonical geometry/mesh from the new source; no previous hash copying.
4. Material/section/load/BC-only edits may revalidate geometry/mesh only if derived identities match retained identities.
5. Coordinate/topology edits must fail revalidation and remain stale/revalidation-required.
6. Execution/recovery remain stale after any physics input change even if mesh is revalidated.
7. Release remains fail-closed.

---

## Validation / Evidence Ledger

| Evidence | Head | Status |
|---|---|---|
| Common/stage first slice | `d01de620...` | PASS |
| Shared unit factors | `569dfaa864...` | PASS |
| Section-property taxonomy | `5709110edb...` | PASS |
| Canonical geometry identity | `1dab5bc4b6...` | PASS |
| Stage 10 mesh identity | `7747d9a9e2...` | VALIDATION_PENDING |
| Repository integration attribution | latest tested heads | BLOCKED by ISS-001 enforcement only |
| Current-main integrated PR | — | NOT_STARTED |

---

## Changed-File Ledger

Assignment files currently include:

```text
agents/PR1038_workreport.md
docs/IntegratedLAFEAroadmap.md
scripts/lafea-common-input-units-check.mjs
scripts/lafea-continuum-geometry-identity-check.mjs
scripts/lafea-continuum-mesh-identity-check.mjs
scripts/lafea-nonbucket-stack-check.mjs
scripts/lafea-section-property-invalidation-check.mjs
scripts/lafea-ui-workflow-truthfulness-check.mjs
src/core/lafea-common-input/units.js
src/core/local-continuum/units.js
src/core/local-stress/units.js
src/workspace/lafea-continuum-geometry-projection.js
src/workspace/lafea-continuum-source-mesh.js
src/workspace/lafea-guided-workflow.js
src/workspace/lafea-lifecycle-producers.js
src/workspace/lafea-lifecycle-profiled.js
src/workspace/lafea-lifecycle-profiles.js
src/workspace/lafea-stage-analysis-adapter.js
src/workspace/lafea-stage-input-descriptors.js
src/workspace/lafea-workbench-source-state.js
```

No `.github/workflows/*` file has been changed by this assignment.

---

## Known / Deferred Work

- **ISS-001:** unrelated LFEA piping repository-attribution contradiction — OUT OF SCOPE.
- **RISK-004:** current-main reconciliation required before final PR closure.
- Explicit geometry/mesh revalidation and dependency-aware retained-mesh currentness — next only after Stage 10 is validated.
- LAFEA.4/.5 equivalent geometry/mesh identity cleanup — deferred until continuum pattern is proven.
- Named physical regions/probes, solver-model compiler, semantic result comparison, verification center, standalone runtime/history/release/dossier remain roadmap work.

---

## Next-Agent Handover

- **Current stage:** Stage 10 validation.
- **Last validated head:** `1dab5bc4b6a73f0f4fac474d37130f6c47be37f6`.
- **Stage 10 implementation head before report sync:** `7747d9a9e21bb4ef41dd2fb9fe4e1176b951a9c1`.
- **Do not redo:** geometry projection, source-mesh projection, mesh-identity test, or aggregate wiring.
- **Do not start:** explicit revalidation/currentness until exact-head Stage 10 validation is green.
- **Do not change:** lifecycle parent keys, explicit mesh custody v1/v2, LAFEA.4/.5 hashing, solver numerics, release, workflow YAML.
- **Highest risk:** mistaking stable mesh content identity for authority to reuse retained evidence without a new exact-parent revalidation transaction.
