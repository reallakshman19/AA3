# Integrated LAFEA Common/Stage Architecture — Living Work Report

## PR Mission Control

- **Mission:** evolve LAFEA into one governed analysis platform with common engineering infrastructure and explicit stage-specific physics/authority while preserving lifecycle, mesh custody, numerical verification, and fail-closed release semantics.
- **Source task:** #1025.
- **PR:** #1038, DRAFT.
- **Branch:** `agent/integrated-lafea-common-stage-roadmap`.
- **Original base:** `a587867963cc9199caca6e7adfa03af95a316aa2`.
- **Current reconciled `main`:** `271d04fa2674ab68367808d05f2429ec5e236a6e`.
- **Current implementation HEAD before this report sync:** `b02c7a172c6b3ea0290ac64328556c47c7533daf`.
- **Last exact-head runtime-validated engineering increment:** Stage 9 at `1dab5bc4b6a73f0f4fac474d37130f6c47be37f6`.
- **Current stage:** Stage 11 — explicit LAFEA.3 non-geometric geometry/mesh revalidation, IMPLEMENTED / RUNTIME_GATE_UNAVAILABLE.
- **Engineering status:** IN_PROGRESS.
- **Runtime validation status:** no exact-head GitHub Actions workflow exists on the reconciled branch because current `main` removed the old workflow fleet; no Stage 10 or Stage 11 runtime pass is claimed.
- **Current-main status:** RECONCILED; branch was verified behind-by-0 after the two-parent merge.
- **Closure blockers:** ISS-001 unrelated LFEA piping repository-attribution contradiction remains out of assignment scope; exact-head executable validation infrastructure is currently absent from `main`.
- **Exact next action:** obtain/restore an Owner-authorized executable gate without reviving removed workflow YAML, run Stage 10/11 focused + bounded certification on the exact head, then proceed to retained-solve reuse policy only if those gates pass.

## Handover in 60 Seconds

### Completed / validated increments

1. **Stages 4–6 — common/stage routing:** production stage adapter owns `ANALYTICAL` / `FEA` / `UNSUPPORTED` route family and semantic input requirements; guided workflow consumes it; LAFEA.6 remains unsupported.
2. **Stage 7 — common unit factors:** LAFEA.1 and LAFEA.3 consume `src/core/lafea-common-input/units.js`; stage-specific unit contracts and error semantics remain local. Validated head `569dfaa8642ffeebb3cd3b866e9626b125659193`.
3. **Stage 8 — dependency taxonomy:** FE element/shell thickness is `SECTION_PROPERTY`; analytical pipe-wall thickness remains `GEOMETRY`. The missed workbench/orchestrator `SECTION_PROPERTY` classification was subsequently repaired and covered by a live post-run edit regression. Validated taxonomy head `5709110edb38539853f02c6e0a5e6fd715cc68d7`; closure repair is present on the current branch.
4. **Stage 9 — LAFEA.3 geometry identity:** legacy `ANALYSIS_GEOMETRY.artifactHash` is canonical coordinate/topology identity only; exact `sourceHash` and `canonicalModelHash` parents remain. Exact-head validated at `1dab5bc4b6a73f0f4fac474d37130f6c47be37f6`.

### Implemented increments awaiting a current executable gate

5. **Stage 10 — LAFEA.3 mesh content identity:** legacy `ANALYSIS_MESH.artifactHash` now uses the repository-native canonical analysis-mesh content contract for LAFEA.3 only. Material/section/load/BC/provenance and numerical evidence no longer contaminate mesh identity; execution/recovery still retain physics evidence.
6. **Stage 11 — explicit LAFEA.3 revalidation:** after an eligible non-geometric source edit, the workbench can canonicalize the current document without solver execution, re-derive geometry and mesh identities, compare them against retained `REVALIDATION_REQUIRED` evidence, dry-run all lifecycle registrations, and only then rebind current exact parents. Execution/recovery remain stale and release remains unqualified.

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
10. Stage 10/11 are LAFEA.3-only; legacy LAFEA.4/.5 geometry/mesh hashing remains unchanged.
11. Revalidation may establish only the artifact currentness it proves; it must not promote execution, recovery, convergence, report, or release authority.
12. A bounded revalidation call must expose one coherent public publication, not intermediate parent-registration states.

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
| DEC-013 | Decision | IMPLEMENTED | Revalidation derives current identities and compares them with retained evidence; no old parent hash is copied forward. |
| DEC-014 | Decision | IMPLEMENTED | Revalidation dry-runs the exact lifecycle registrations before mutation and publishes one final orchestrator state. |
| RISK-004 | Risk | CLOSED | PR branch reconciled with pinned current `main`; verified behind-by-0. |
| RISK-005 | Risk | OPEN | Current `main` has no old LAFEA GitHub Actions workflow fleet, so exact-head runtime certification cannot currently be attached. |
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

## Stage 10 — LAFEA.3 Source-Mesh Content Identity — IMPLEMENTED / RUNTIME_GATE_UNAVAILABLE

### Production implementation

`src/workspace/lafea-continuum-source-mesh.js` constructs repository-native `lafea-analysis-mesh/v1` from the canonical LAFEA.3 continuum projection:

```text
meshIdentity = LAFEA.3/SOURCE_AUTHORED/<geometry semantic hash>
nodes         = nodeId + canonical x/y + z=0
elements      = elementId + elementType + nodeIds
```

For LAFEA.3 only:

```text
ANALYSIS_GEOMETRY.artifactHash
  = canonical continuum geometry projection hash

ANALYSIS_MESH.artifactHash
  = lafeaAnalysisMeshContentHash(canonical source-authored mesh)
```

The mesh hash excludes material assignment, thickness, provenance, constraints, loads, result requests, stiffness matrices, element stress/stiffness evidence, recovery evidence, source hash, and canonical-model hash.

Physics evidence is not removed from the calculation chain. LAFEA.3 execution continues to bind canonical model, clean mesh, physical load case, solver profile, retained accepted mesh evidence, load-case results, and formula trace. Recovery continues to bind execution + mesh + recovery profile + accepted recovery evidence.

### Focused regression present in branch

`scripts/lafea-continuum-mesh-identity-check.mjs` uses actual LAFEA.3 workbench executions + producer batches and asserts stable mesh identity across material, section, load, BC, and provenance edits, with changed geometry/mesh identity for coordinate and topology-ID edits.

The focused check is wired into `scripts/lafea-nonbucket-stack-check.mjs`.

### Validation truth

Stage 10 implementation existed before current-main reconciliation, but no exact-head workflow attached to the final aggregate-wired Stage 10 head. Current `main` later removed the old `.github/workflows/*` fleet. Therefore **Stage 10 is implemented but no exact-head runtime PASS is claimed**.

---

## Current-Main Reconciliation — COMPLETE

The draft PR had diverged after upstream advanced substantially and removed the previous workflow fleet.

Reconciliation procedure:

1. pinned feature head `494e1df70cec872b9e6bb8e25ca11e78943d6fc0`;
2. pinned current `main` `271d04fa2674ab68367808d05f2429ec5e236a6e`;
3. verified the PR-owned file set against upstream changes and found no overlap on the assignment-owned LAFEA implementation/test paths;
4. built a merge tree from the **current main tree** and overlaid only the exact PR-owned blobs;
5. created two-parent merge commit `59ad4a9fc0c79f7b55a607d3fd80e0f31c84ccd9`;
6. verified `main → feature` as `ahead`, ahead-by-47, behind-by-0 immediately after reconciliation.

This deliberately preserved upstream workflow removals and did not reintroduce `.github/workflows/*`.

---

## Stage 11 — Explicit Non-Geometric Geometry/Mesh Revalidation — IMPLEMENTED / RUNTIME_GATE_UNAVAILABLE

### Scope

LAFEA.3 legacy lifecycle route only. No LAFEA.4/.5 changes, no solver-kernel changes, no mesh-custody v2 promotion, no release changes, and no workflow-YAML changes.

### Production contract

Added `src/workspace/lafea-continuum-revalidation.js`.

Eligible source changes:

```text
MATERIAL_PROPERTY
SECTION_PROPERTY
LOAD_OR_BC
MODEL_METADATA
```

Required retained pre-state:

```text
CANONICAL_MODEL     STALE
ANALYSIS_GEOMETRY   REVALIDATION_REQUIRED
ANALYSIS_MESH       REVALIDATION_REQUIRED
```

The batch then:

1. validates exact current source authority against the normalized current source;
2. canonicalizes the current source without calling `calculate`;
3. derives a new canonical-model hash bound to the new `sourceHash`;
4. re-derives canonical geometry identity;
5. re-derives canonical analysis-mesh content identity and mesh-profile hash;
6. compares geometry, mesh, and mesh-profile identity to retained evidence;
7. fails before mutation if any identity differs;
8. constructs only three CURRENT/PASS records with current exact parents;
9. dry-runs those records through the existing lifecycle parent/prerequisite rules;
10. commits them through the orchestrator's suppressed retained-store boundary;
11. publishes one final coherent state.

Successful revalidation establishes:

```text
CANONICAL_MODEL     CURRENT/PASS, new source parent
ANALYSIS_GEOMETRY   CURRENT/PASS, same identity + new source/model parents
ANALYSIS_MESH       CURRENT/PASS, same identity + current geometry/profile parents
EXECUTION           STALE
RECOVERY            STALE
CONVERGENCE         not promoted
REPORT_EVIDENCE     not promoted
RELEASE             NOT QUALIFIED
```

### Public workbench action

`revalidateContinuumGeometryMesh()` is exposed through the canonical workbench orchestrator API.

The method rejects:

- non-LAFEA.3 stages;
- domain-first/shell governed-v2 routes;
- non-current lifecycle source binding;
- missing exact source authority;
- geometry-class changes;
- already-current/non-revalidation lifecycle state;
- geometry identity mismatch;
- mesh-profile mismatch;
- mesh identity mismatch.

### Focused regression present in branch

Added `scripts/lafea-continuum-revalidation-check.mjs` and wired it into bounded non-bucket aggregate schema v19.

The regression is designed to exercise the real workbench and assert:

- material edit → revalidation succeeds;
- section edit → revalidation succeeds;
- BC edit (`LOAD_OR_BC`) → revalidation succeeds;
- base calculation result remains null after edit and after revalidation;
- canonical model changes and binds the current source;
- geometry and mesh identities equal the pre-edit retained identities;
- all three revalidated records match hashes **and parent hashes** from an independent normal qualified producer run of the edited document;
- execution and recovery remain stale;
- release remains unqualified;
- a second revalidation attempt is rejected once currentness is established;
- coordinate and topology edits are classified as `GEOMETRY` and rejected without promotion.

### Publication audit

Initial Stage 11 wiring used the retained store directly and would have exposed three intermediate fail-closed states. Before closure this was corrected at `b02c7a172c6b3ea0290ac64328556c47c7533daf`: the batch is dry-run first, registrations use the orchestrator's existing `invokeRetained` suppressed-publication boundary, and one final state is published.

### Validation truth

Exact head `70ca6ecfbff77505f60b67fedc333eb472fd31e7` had no commit status checks and no workflow runs. The publication correction head `b02c7a172c6b3ea0290ac64328556c47c7533daf` was statically diff-audited; executable CI remains unavailable because current `main` contains no old LAFEA workflow fleet. **No Stage 11 runtime PASS is claimed.**

---

## Validation / Evidence Ledger

| Evidence | Head | Status |
|---|---|---|
| Common/stage first slice | `d01de620...` | PASS |
| Shared unit factors | `569dfaa864...` | PASS |
| Section-property taxonomy | `5709110edb...` | PASS |
| Canonical geometry identity | `1dab5bc4b6...` | PASS |
| Stage 10 mesh identity | current branch | IMPLEMENTED / EXACT_HEAD_RUNTIME_UNAVAILABLE |
| Current-main reconciliation | `59ad4a9fc0...` | COMPLETE, behind-by-0 at reconciliation |
| Stage 11 explicit revalidation | `b02c7a172c...` | IMPLEMENTED / EXACT_HEAD_RUNTIME_UNAVAILABLE |
| Repository integration attribution | latest tested heads | BLOCKED by ISS-001 enforcement only |

---

## Changed-File Ledger

Assignment-owned / modified paths now include:

```text
agents/PR1038_workreport.md
docs/IntegratedLAFEAroadmap.md
scripts/lafea-common-input-units-check.mjs
scripts/lafea-continuum-geometry-identity-check.mjs
scripts/lafea-continuum-mesh-identity-check.mjs
scripts/lafea-continuum-revalidation-check.mjs
scripts/lafea-nonbucket-stack-check.mjs
scripts/lafea-section-property-invalidation-check.mjs
scripts/lafea-ui-workflow-truthfulness-check.mjs
src/core/lafea-common-input/units.js
src/core/local-continuum/units.js
src/core/local-stress/units.js
src/workspace/lafea-continuum-geometry-projection.js
src/workspace/lafea-continuum-revalidation.js
src/workspace/lafea-continuum-source-mesh.js
src/workspace/lafea-guided-workflow.js
src/workspace/lafea-lifecycle-producers.js
src/workspace/lafea-lifecycle-profiled.js
src/workspace/lafea-lifecycle-profiles.js
src/workspace/lafea-stage-analysis-adapter.js
src/workspace/lafea-stage-input-descriptors.js
src/workspace/lafea-workbench-evidence-actions.js
src/workspace/lafea-workbench-orchestrator-api.js
src/workspace/lafea-workbench-orchestrator-store.js
src/workspace/lafea-workbench-source-state.js
```

No `.github/workflows/*` file has been changed or reintroduced by this assignment.

---

## Known / Deferred Work

- **ISS-001:** unrelated LFEA piping repository-attribution contradiction — OUT OF SCOPE.
- **RISK-005:** exact-head executable CI gate absent after upstream workflow removal.
- Retained **solve/recovery reuse** is deliberately not authorized yet. Stage 11 revalidates only canonical model/geometry/mesh currentness.
- LAFEA.4/.5 equivalent geometry/mesh identity and revalidation cleanup are deferred until the continuum pattern is executable-gate validated.
- Domain-first/v2 mesh custody remains a separate authority path and is not bridged by Stage 11.
- Named physical regions/probes, solver-model compiler, semantic result comparison, verification center, standalone runtime/history/release/dossier remain roadmap work.

---

## Next-Agent Handover

- **Current stage:** Stage 11 implementation complete; runtime qualification unavailable on current repository workflow state.
- **Current implementation head before report sync:** `b02c7a172c6b3ea0290ac64328556c47c7533daf`.
- **Current reconciled main:** `271d04fa2674ab68367808d05f2429ec5e236a6e`.
- **Last exact-head runtime-validated engineering head:** `1dab5bc4b6a73f0f4fac474d37130f6c47be37f6`.
- **Do not redo:** Stage 9 geometry projection, Stage 10 source-mesh identity, Stage 11 revalidation contract/action/regression/aggregate wiring.
- **Do not change without a new bounded decision:** lifecycle parent keys, domain-first mesh custody v2, LAFEA.4/.5 hashing, solver numerics, release semantics, or workflow YAML.
- **Do not claim:** Stage 10 or Stage 11 runtime PASS until an executable exact-head gate actually runs.
- **Next engineering decision after executable validation:** whether any retained execution/recovery evidence can ever be explicitly revalidated/reused after non-geometric changes. Default remains **STALE / rerun required**.
- **Highest risk:** allowing stable geometry/mesh identity to leak into solver-result or release reuse authority without separate explicit evidence and semantic comparability rules.
