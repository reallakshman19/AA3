# Integrated LAFEA Common/Stage Architecture — Living Work Report

## PR Mission Control

- **Mission:** evolve LAFEA into one governed analysis platform with common engineering infrastructure and explicit stage-specific physics/authority while preserving lifecycle, mesh custody, numerical verification, and fail-closed release semantics.
- **Source task:** #1025.
- **PR:** #1038, DRAFT, open/mergeable.
- **Branch:** `agent/integrated-lafea-common-stage-roadmap`.
- **Original base:** `a587867963cc9199caca6e7adfa03af95a316aa2`.
- **Current reconciled base:** `main@4482dcc481939c3af1068aea2e2db47baec63984`.
- **Reconciliation commit:** `282cc478943dcc8b06fddd142a588087f85d780c` (`merge(main): reconcile LAFEA architecture branch with current main`).
- **Reconciliation audit:** branch is ahead of current `main`, behind-by-0; PR diff remains exactly the intended 29 LAFEA-owned paths and contains no workflow YAML.
- **Last exact-head runtime-validated engineering increment:** Stage 9 at `1dab5bc4b6a73f0f4fac474d37130f6c47be37f6`.
- **Stage 10/11/12A runtime status:** NOT_RUN on their final heads; no executable exact-head route was attached after workflow retirement, so no runtime PASS is claimed.
- **Current stage:** Stage 12B — compiled-model execution adapter and parity preparation.
- **Engineering status:** IN_PROGRESS.
- **Release status:** unchanged/fail-closed.

## Handover in 60 Seconds

Implemented architecture to date:

1. **Stages 4–6 — common/stage routing:** production stage adapter owns analytical/FEA/unsupported route classification and semantic input requirements.
2. **Stage 7 — common unit facts:** LAFEA.1 and LAFEA.3 consume shared unit-factor facts while retaining stage-specific contracts.
3. **Stage 8 — dependency taxonomy:** FE thickness is `SECTION_PROPERTY`; analytical pipe-wall thickness remains geometry.
4. **Stage 9 — geometry identity:** LAFEA.3 geometry identity is coordinate/topology semantics only. Runtime validated.
5. **Stage 10 — mesh identity:** LAFEA.3 mesh identity is discretization content only; physics evidence stays downstream.
6. **Stage 11 — explicit revalidation:** eligible non-geometric edits rederive and rebind unchanged geometry/mesh without solver execution.
7. **Stage 12A — solver-model compiler:** current domain-first source/domain/geometry/mesh-v2 evidence compiles into deterministic `lafea-continuum-solver-model/v1` through the real workbench API.
8. **Current Stage 12B:** introduce one pure adapter from the compiled model into the existing local-continuum numerical contract, then prove parity before the authoritative orchestrator `run()` route is changed.

## Governing Engineering Invariants

1. UI/render state is never solver authority.
2. Calculation success is not release qualification.
3. Geometry identity, mesh content, solver-model identity, execution, recovery, verification, custody, and release evidence remain distinct.
4. No prior hash is copied forward to manufacture currentness.
5. Producer-owned mesh hashes are not reinterpreted.
6. Loads/restraints bind to physical geometry features, not incidental FE numbering.
7. Compiler output is deterministic and reconstructable from exact current parents.
8. Missing engineering mapping fails closed; the compiler/adapter does not guess.
9. Compilation is not solver execution.
10. Solver execution is not release qualification.
11. Stage 12B must reuse the existing `calculateLocalContinuum` numerical kernel; no second element/assembly/solver/recovery implementation is permitted.
12. Authoritative workbench `run()` must not switch to the compiled route until parity evidence exists.
13. LAFEA.6 remains unsupported/fail-closed.
14. No `.github/workflows/*` change without explicit Owner authorization.

## Engineering Item Register

| ID | Type | Status | Summary |
|---|---|---|---|
| DEC-001 | Decision | ACCEPTED | One common LAFEA platform with explicit stage/family physics adapters. |
| DEC-007 | Decision | VALIDATED | Mesh currentness requires explicit recomputation/revalidation. |
| DEC-009 | Decision | VALIDATED | LAFEA.3 geometry identity excludes non-geometric physics/provenance. |
| DEC-011 | Decision | IMPLEMENTED | LAFEA.3 mesh artifact identifies discretization content only. |
| DEC-013 | Decision | IMPLEMENTED | Revalidation derives current identities; no old parent copying. |
| DEC-014 | Decision | IMPLEMENTED | Revalidation publishes one coherent final state. |
| DEC-015 | Decision | IMPLEMENTED | Solver-model compilation is non-numerical and does not authorize execution. |
| DEC-016 | Decision | IMPLEMENTED | Feature→mesh mapping uses current geometry/mesh evidence, not source FE IDs. |
| DEC-017 | Decision | IMPLEMENTED | Stage 12A requires exact domain/canonical physical-case ID set before compilation. |
| DEC-018 | Decision | PLANNED | Stage 12B adapter must lower compiled solver-model data into the existing local-continuum contract and call the existing kernel unchanged. |
| DEC-019 | Decision | PLANNED | Stage 12B execution is parity/diagnostic authority only; it cannot publish lifecycle execution evidence or release qualification. |
| RISK-005 | Risk | BLOCKED | Exact-head executable workflow/local clone is unavailable; static-only evidence must be labeled as such. |
| RISK-006 | Risk | BOUNDED | Generic feature→mesh mapping remains continuum-owned until execution/parity proves the interface. |
| RISK-007 | Risk | RESOLVED | Branch reconciled to current `main@4482dcc...`; behind-by-0 and 29-file diff confirmed. |
| RISK-008 | Risk | OPEN | Incorrect lowering of domain attachments to solver node/edge/element loads could produce numerically plausible but semantically wrong results. |
| DEBT-001 | Debt | ACCEPTED | Current continuum domain is single-region and lacks section-region identity; compiler supports one material + uniform thickness only. |
| IMP-001 | Improvement | DEFERRED | Extract reusable family-level feature→mesh mapping only after continuum execution/parity proves the interface. |
| ISS-001 | Defect | BLOCKED | Unrelated LFEA piping attribution contradiction remains outside assignment scope. |

## Stage 12A — Implemented Boundary

The public workbench exposes:

```text
workbench.compileContinuumSolverModel()
```

Required current parents:

```text
LAFEA.3
+ domain-first profile
+ CURRENT lifecycle source binding
+ CURRENT_PASS analysis domain
+ CURRENT_PASS analysis geometry
+ CURRENT_PASS governed mesh-v2 custody with usableForRun=true
```

The compiler consumes the normalized current source, canonical LAFEA.3 model, retained domain, retained geometry evidence, and retained mesh-v2 evidence. It returns a frozen solver model with exact parent hashes, material/section assignments, current governed nodes/elements, physical cases, domain attachments mapped to current mesh targets, result requests, qualification profile, and `solverModelHash`.

The compiled artifact explicitly retains:

```text
executionAuthorized = false
releaseQualified = false
```

It does not call the solver or mutate lifecycle state.

## Stage 12B — Pre-Implementation Contract

### Objective

Create a bounded, pure execution adapter:

```text
lafea-continuum-solver-model/v1
  -> validate exact compiled-model contract
  -> lower material/section/current governed mesh
  -> lower compiled attachment targets into existing local-continuum constraints/load cases
  -> construct one canonical local-continuum model
  -> call existing calculateLocalContinuum(...)
  -> return parity/diagnostic execution evidence bound to solverModelHash
```

### Required properties

- no changes to element equations, element integration, assembly, partitioned solve, stress recovery, or result hashing internals;
- no source FE node/element IDs used as authority when the compiled model provides governed mesh targets;
- exact physical-case membership retained;
- restraints and imposed displacements expand onto mapped current nodes only;
- concentrated loads target the mapped current vertex node;
- traction/pressure expand per mapped boundary edge with explicit owning current element ID and exact edge-node set;
- body force/temperature expand per mapped current region element;
- material and uniform-thickness section assignments remain exact;
- unknown payload shape, DOF, target shape, missing owner element, duplicated physical edge, or incompatible attachment kind fails closed;
- adapter output is deterministic and immutable;
- adapter execution result cannot publish retained lifecycle execution/recovery evidence and cannot qualify release.

### Stage 12B production-consumer rule

The new adapter must have a real production consumer in the same increment. The intended consumer is a **non-authoritative parity execution method** on the existing workbench API, separate from `run()`, so the compiled path is executable without silently becoming release/run authority.

Proposed public surface:

```text
workbench.executeContinuumCompiledForParity()
```

That method must:

1. reuse `compileContinuumSolverModel()` readiness/parent checks;
2. call the pure Stage 12B adapter;
3. return the immutable parity result;
4. perform no `publish()` and no lifecycle execution/recovery/release registration;
5. leave `run()` unchanged.

### Parity gate before any authoritative route switch

For the same physical cases and equivalent governed mesh, compare legacy source-authored execution vs compiled execution for:

- displacement vectors;
- reactions;
- integration-point stress quantities;
- strain energy;
- equilibrium/residual evidence;
- deterministic result/evidence hashes where identity-equivalence is expected.

Tolerances must be explicit. Hash mismatches caused only by intentional identity/ancestry differences must be separated from numerical mismatches rather than waived globally.

Only after parity evidence is executable and passes may a later stage consider changing authoritative `workbench.run()` consumption.

## Validation / Evidence Ledger

| Validation | Status | Evidence |
|---|---|---|
| Stage 9 exact-head LAFEA qualification | PASS | focused + bounded + numerical + browser/build gates at `1dab5bc4...` |
| Stage 10 exact final runtime | NOT_RUN | retired workflow fleet / local clone unavailable |
| Stage 11 exact final runtime | NOT_RUN | retired workflow fleet / local clone unavailable |
| Stage 12A static syntax/diff audit | PASS | implementation is bounded and does not execute numerics |
| Stage 12A focused runtime | NOT_RUN | no exact-head execution route attached |
| Current-main reconciliation | PASS | PR #1038 base `4482dcc...`, head `282cc478...`, behind-by-0, intended 29-file diff |
| Stage 12B focused runtime | NOT_RUN | implementation not yet present |
| Stage 12B parity | NOT_RUN | implementation not yet present |

No runtime PASS will be inferred from static review.

## Current PR Changed-File Ledger Before Stage 12B Production Edits

GitHub reconciliation audit reports exactly these 29 PR-owned files:

```text
agents/PR1038_workreport.md
docs/IntegratedLAFEAroadmap.md
scripts/lafea-common-input-units-check.mjs
scripts/lafea-continuum-geometry-identity-check.mjs
scripts/lafea-continuum-mesh-identity-check.mjs
scripts/lafea-continuum-revalidation-check.mjs
scripts/lafea-continuum-solver-model-check.mjs
scripts/lafea-nonbucket-stack-check.mjs
scripts/lafea-section-property-invalidation-check.mjs
scripts/lafea-ui-workflow-truthfulness-check.mjs
src/core/lafea-common-input/units.js
src/core/local-continuum/units.js
src/core/local-stress/units.js
src/workspace/lafea-continuum-geometry-projection.js
src/workspace/lafea-continuum-revalidation.js
src/workspace/lafea-continuum-solver-mapping.js
src/workspace/lafea-continuum-solver-model.js
src/workspace/lafea-continuum-source-mesh.js
src/workspace/lafea-guided-workflow.js
src/workspace/lafea-lifecycle-producers.js
src/workspace/lafea-lifecycle-profiled.js
src/workspace/lafea-lifecycle-profiles.js
src/workspace/lafea-lifecycle-workbench-store-retained.js
src/workspace/lafea-stage-analysis-adapter.js
src/workspace/lafea-stage-input-descriptors.js
src/workspace/lafea-workbench-evidence-actions.js
src/workspace/lafea-workbench-orchestrator-api.js
src/workspace/lafea-workbench-orchestrator-store.js
src/workspace/lafea-workbench-source-state.js
```

No `.github/workflows/*` file is in the assignment diff.

## Stage 12B Non-Goals

- no shell compiler;
- no LAFEA.6 enablement;
- no numerical kernel rewrite;
- no UI-first work;
- no release promotion;
- no generalized multi-region mapping;
- no authoritative `run()` switch before parity.

## Exact Next Action

Implement the pure compiled-model execution adapter plus the non-authoritative workbench parity consumer and focused regression. Keep `calculateLocalContinuum`, lifecycle execution/recovery authority, release authority, and `run()` unchanged. Then perform exact diff/static validation and attempt any available executable checks; record NOT_RUN where the infrastructure still prevents execution.
