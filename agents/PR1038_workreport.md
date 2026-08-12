# Integrated LAFEA Common/Stage Architecture — Living Work Report

## PR Mission Control

- **Mission:** evolve LAFEA into one governed analysis platform with common engineering infrastructure and explicit stage-specific physics/authority while preserving lifecycle, mesh custody, numerical verification, and fail-closed release semantics.
- **Source task / issue:** #1025.
- **PR:** #1038, DRAFT, open/mergeable.
- **Branch:** `agent/integrated-lafea-common-stage-roadmap`.
- **Original base:** `a587867963cc9199caca6e7adfa03af95a316aa2`.
- **Current reconciled base:** `main@4482dcc481939c3af1068aea2e2db47baec63984`.
- **Reconciliation commit:** `282cc478943dcc8b06fddd142a588087f85d780c`.
- **Current implementation HEAD before this report update:** `f3ba3bf1fc0df907e1c0b32d4c5b054abed75d03`.
- **PR diff:** 31 paths at `61dfaf7...` before the latest executor correction: the prior 29 governed LAFEA paths plus `src/workspace/lafea-continuum-compiled-execution.js` and `scripts/lafea-continuum-compiled-execution-check.mjs`; no workflow YAML.
- **Current stage:** Stage 12B — compiled-model parity execution bridge.
- **Last completed stage:** Stage 12A — deterministic non-executing LAFEA.3 solver-model compiler.
- **Engineering status:** IN_PROGRESS.
- **Validation status:** static/source audit in progress; exact-head runtime NOT_RUN because current head has no status checks or workflow runs and the local execution route remains unavailable.
- **Current blocker:** new Stage 12B executor exceeds the CodingRules normal 300-line module limit and must be split before this stage can be considered structurally complete.
- **Release status:** unchanged / fail-closed.
- **Exact next action:** split compiled-input lowering from execution validation/wrapping, keeping one production-consumed path; then re-audit exact diff and executable evidence availability.

## Handover in 60 Seconds

### What is now true

1. Stages 4–12A remain implemented as previously recorded: common/stage routing, common unit facts, dependency taxonomy, continuum geometry identity, mesh identity, explicit revalidation, and the LAFEA.3 domain-first solver-model compiler.
2. The branch has been reconciled to `main@4482dcc...`; it was verified behind-by-0 after reconciliation.
3. Stage 12B now has a production path named `workbench.executeContinuumCompiledForParity()` that compiles the current domain-first LAFEA.3 model and routes it to the existing `calculateLocalContinuum` kernel without changing authoritative `run()`.
4. The compiler now carries source model identity, source ancestry, and `elementTypePolicy` so parity execution does not invent T3 fallback/identity authority.
5. The Stage 12B bridge lowers current governed mesh IDs and compiled geometry-feature attachments into the existing continuum input contract.
6. Stage 12B execution returns parity-only evidence and does not publish lifecycle execution/recovery state or qualify release.
7. Temperature execution is explicitly fail-closed because the current domain example carries temperature delta while the current numerical kernel consumes thermal strain and the compiled material contract lacks coefficient of thermal expansion.

### What is being worked on

- Split the over-300-line execution bridge into a small execution/validation module and a production-consumed compiled-input lowering module.
- Preserve the exact same one-way authority path; do not introduce a second execution service or numerical kernel.

### What remains unfinished

- Exact-head runtime of the Stage 12B focused check.
- Actual numerical parity evidence from an executable environment.
- Broader attachment-kind parity beyond the bounded source-equivalent concentrated-load/restraint case.
- Any authoritative `workbench.run()` switch.
- Thermal material/temperature semantics needed to execute `TEMPERATURE` attachments.

### What must not be assumed

- Static source inspection is not a numerical PASS.
- The focused parity script has not executed on the current head.
- `workbench.run()` is not domain-first compiled-model authority yet.
- Temperature delta is not interchangeable with thermal strain.
- Calculation acceptance is not release qualification.

### Highest-risk remaining item

A semantically wrong attachment lowering can still yield plausible numerical values. Exact payload/target semantics and executable parity evidence remain mandatory before any authoritative route promotion.

### Exact next action

Split the Stage 12B module under CodingRules limits, keep the helper directly consumed by the parity executor, add/retain fail-closed temperature coverage, then inspect exact head/status/workflow evidence and refresh this report.

## Mission and Engineering Intent

The mission is a standalone-capable LAFEA architecture where platform commonality does not erase stage-specific physics or authority. For LAFEA.3, the current vertical slice establishes a governed route:

```text
current source authority
  -> analysis domain
  -> analysis geometry
  -> governed mesh custody
  -> compiled solver model
  -> parity-only lowering
  -> existing local-continuum numerical kernel
```

The current Stage 12B objective is deliberately narrower than production run promotion. It proves that compiled domain-first authority can feed the existing numerical implementation without creating a second kernel, without reverting to source FE numbering, and without publishing execution/release authority prematurely.

Explicit non-goals remain: no shell compiler, no LAFEA.6 enablement, no solver rewrite, no UI-first work, no release promotion, no generalized multi-region mapping, and no authoritative `run()` switch before parity.

## Governing Engineering Invariants

1. UI/render state is never solver authority.
2. Calculation success is not release qualification.
3. Geometry identity, mesh content, solver-model identity, execution, recovery, verification, custody, and release evidence remain distinct.
4. No prior hash is copied forward to manufacture currentness.
5. Producer-owned mesh hashes are not reinterpreted.
6. Loads/restraints bind to physical geometry features, not incidental source FE numbering.
7. Compiler output is deterministic and reconstructable from exact current parents.
8. Missing/ambiguous engineering mapping fails closed.
9. Compilation is not solver execution.
10. Solver execution is not release qualification.
11. Stage 12B reuses `calculateLocalContinuum`; no second element/assembly/solve/recovery implementation is permitted.
12. Authoritative `workbench.run()` remains unchanged until executable parity evidence passes.
13. Temperature delta must not be converted to thermal strain without explicit qualified material/thermal semantics.
14. LAFEA.6 remains unsupported/fail-closed.
15. No `.github/workflows/*` change without explicit Owner authorization.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Common/stage routing | P0 | IMPLEMENTED | 4–6 | production stage adapter + guided workflow consumer |
| Common unit facts | P0 | IMPLEMENTED | 7 | LAFEA.1 + LAFEA.3 production consumers |
| Dependency taxonomy | P0 | IMPLEMENTED | 8 | section-property invalidation path |
| LAFEA.3 geometry identity | P0 | VALIDATED | 9 | last exact-head runtime-qualified increment `1dab5bc4...` |
| LAFEA.3 mesh identity | P0 | IMPLEMENTED | 10 | static/focused check present; final runtime NOT_RUN |
| Explicit geometry/mesh revalidation | P0 | IMPLEMENTED | 11 | static/focused check present; final runtime NOT_RUN |
| Domain-first solver-model compiler | P0 | IMPLEMENTED | 12A | workbench production consumer; runtime NOT_RUN |
| Compiled-model parity execution bridge | P0 | IN_PROGRESS | 12B | production consumer + focused check present; module split required |
| Authoritative compiled `run()` route | P0 | NOT_STARTED | 13 | blocked on executable parity |
| Shell family compiler/execution | P1 | DEFERRED | future | after continuum parity |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | One common LAFEA platform with explicit stage/family physics adapters. | Yes |
| DEC-007 | Decision | P0 | VALIDATED | Mesh currentness requires explicit recomputation/revalidation. | Yes |
| DEC-009 | Decision | P0 | VALIDATED | LAFEA.3 geometry identity excludes non-geometric physics/provenance. | Yes |
| DEC-011 | Decision | P0 | IMPLEMENTED | LAFEA.3 mesh artifact identifies discretization content only. | Yes |
| DEC-013 | Decision | P0 | IMPLEMENTED | Revalidation derives current identities; no old-parent copying. | Yes |
| DEC-014 | Decision | P0 | IMPLEMENTED | Revalidation publishes one coherent final state. | Yes |
| DEC-015 | Decision | P0 | IMPLEMENTED | Solver-model compilation is non-numerical and does not authorize execution. | Yes |
| DEC-016 | Decision | P0 | IMPLEMENTED | Feature→mesh mapping uses current geometry/mesh evidence, not source FE IDs. | Yes |
| DEC-017 | Decision | P0 | IMPLEMENTED | Stage 12A requires exact domain/canonical physical-case ID set. | Yes |
| DEC-018 | Decision | P0 | IMPLEMENTED | Stage 12B lowers compiled solver-model data into the existing local-continuum contract and calls the existing kernel. | Yes |
| DEC-019 | Decision | P0 | IMPLEMENTED | Stage 12B execution is parity/diagnostic only; no lifecycle/release publication. | Yes |
| DEC-020 | Decision | P0 | ACCEPTED | `TEMPERATURE` remains non-executable until temperature-delta → thermal-strain material semantics are explicit and qualified. | Yes |
| RISK-005 | Risk | P0 | BLOCKED | Exact-head executable workflow/local clone unavailable; static evidence cannot be promoted to runtime PASS. | Yes |
| RISK-006 | Risk | P1 | ACCEPTED | Generic feature→mesh mapping stays continuum-owned until execution/parity proves the interface. | Yes |
| RISK-007 | Risk | P0 | VALIDATED | Reconciliation to `main@4482dcc...` verified behind-by-0. | Yes |
| RISK-008 | Risk | P0 | IN_PROGRESS | Incorrect attachment lowering could produce plausible but semantically wrong results. | Yes |
| ISS-001 | Defect | P2 | BLOCKED | Unrelated LFEA piping attribution contradiction remains outside assignment scope. | No |
| ISS-002 | Defect | P1 | IN_PROGRESS | New compiled execution module exceeds normal 300-line CodingRules limit; split required before Stage 12B completion. | Yes |
| ISS-003 | Defect | P0 | ACCEPTED | Existing domain temperature payload is temperature delta while local continuum consumes thermal strain; direct conversion lacks alpha and is unsafe. | Yes |
| DEBT-001 | Debt | P1 | ACCEPTED | Current continuum domain is single-region and lacks section-region identity. | Yes |
| DEBT-002 | Debt | P1 | ACCEPTED | Compiled material contract currently carries E/nu only; thermal expansion properties are not yet authoritative. | Yes |
| IMP-001 | Improvement | P2 | DEFERRED | Extract reusable family-level feature→mesh mapping only after continuum execution/parity proves interface. | Yes |

## Stage 12A — Implemented Boundary

`workbench.compileContinuumSolverModel()` requires LAFEA.3, domain-first profile, CURRENT source binding, CURRENT_PASS domain/geometry, and CURRENT_PASS usable mesh-v2 custody. It returns deterministic `lafea-continuum-solver-model/v1` with exact parents, current governed nodes/elements, mapped attachments, material/section assignment, result requests, qualification profile, and `solverModelHash`.

Stage 12B extended the compiled artifact only with execution-required source facts that must not be invented downstream:

```text
sourceModel.modelIdentity
sourceModel.modelVersion
sourceModel.sourceAncestry
sourceModel.elementTypePolicy
```

The artifact still carries:

```text
executionAuthorized = false
releaseQualified = false
```

## Stage 12B — Current Implementation Record

### Production path implemented

```text
workbench.executeContinuumCompiledForParity()
  -> compileContinuumSolverModel(...)
  -> executeLafeaContinuumCompiledForParity(...)
  -> existing createCanonicalLocalContinuumModel(...)
  -> existing calculateLocalContinuum(...)
  -> immutable parity evidence
```

The workbench method performs no `publish()` and no lifecycle execution/recovery/release registration. Existing `run: c.run` is unchanged.

### Current attachment lowering

Qualified/bounded shapes currently implemented:

- `RESTRAINT`: `{ux:boolean, uy:boolean}` to zero UX/UY constraints on compiled current nodes; because legacy constraints are global, a restraint must apply to all physical cases or execution fails closed.
- `IMPOSED_DISPLACEMENT`: `{ux?, uy?, unit}` to current mapped node DOFs.
- `CONCENTRATED_LOAD`: `{fx, fy, unit}` to exactly one mapped current vertex node.
- `TRACTION`: `{tx, ty, unit}` to each mapped current boundary edge with exact owning current element.
- `PRESSURE`: `{pressure, unit}` to each mapped current boundary edge with exact owning current element.
- `BODY_FORCE`: `{bx, by, unit}` to each mapped current region element.
- `TEMPERATURE`: explicit fail-closed `LAFEA_CONTINUUM_COMPILED_TEMPERATURE_SEMANTICS_NOT_QUALIFIED`.

Unknown payload keys, missing required fields, unsupported units, stale/tampered solver-model hash, invalid target references, incompatible authority flags, case-specific global restraints, or missing edge ownership fail closed.

### Temperature finding / deviation from original Stage 12B plan

The pre-stage plan said temperature would lower per region element. Static audit of existing domain fixtures showed the actual domain semantic example uses `{value: 50, unit: 'C'}`. The local continuum kernel accepts `thermalStrain` instead. Because the compiled material model has no authoritative coefficient of thermal expansion, converting delta-T to strain would require invented data. The plan is therefore deliberately narrowed: temperature execution is blocked until a later explicit thermal material contract exists.

### Focused regression prepared

`scripts/lafea-continuum-compiled-execution-check.mjs` is designed to prove:

1. a source-equivalent T3 domain/mesh produces the same displacement, reaction, residual/equilibrium, strain energy, element strain/stress/principal/von-Mises projection as the legacy source-authored route;
2. repeated compiled execution is deterministic;
3. the compiler retains source identity/ancestry/element-type policy;
4. extra payload keys fail closed;
5. case-specific restraint fails closed;
6. authority-state tampering fails closed;
7. live workbench parity execution leaves retained stage execution null and release state `RELEASE_NOT_QUALIFIED`;
8. the authoritative `run()` path remains unchanged.

The check is wired into the existing non-bucket aggregate as `COMPILED_EXECUTION`; aggregate schema is v21 and records that the compiled parity path uses the existing kernel, does not publish lifecycle execution, does not alter release authority, and does not change authoritative continuum `run()`.

## Current Stage 12B Structural Correction Plan

ISS-002 must be closed before Stage 12B is structurally complete.

Planned split:

```text
lafea-continuum-compiled-execution.js
  -> compiled-model validation
  -> calls production lowering helper
  -> calls existing kernel
  -> parity evidence wrapper

lafea-continuum-compiled-input.js
  -> pure compiled-model -> existing local-continuum source contract lowering
  -> attachment target/reference validation
  -> unit-aware attachment translation
  -> temperature fail-closed
```

Both modules must remain below the normal 300 physical-line target. The helper is not speculative: it is directly consumed by the production parity executor in the same stage/PR.

## Validation / Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Stage 9 exact-head LAFEA qualification | PASS | `1dab5bc4...` | focused + bounded + numerical + browser/build gates |
| Stage 10 final runtime | NOT_RUN | stage final | retired workflow fleet / local clone unavailable |
| Stage 11 final runtime | NOT_RUN | stage final | retired workflow fleet / local clone unavailable |
| Stage 12A focused runtime | NOT_RUN | stage final | no exact-head execution route attached |
| Current-main reconciliation | PASS | `282cc478...` | base `4482dcc...`, behind-by-0, intended diff |
| Stage 12B source-contract audit | PASS | `f3ba3bf1...` | existing core exports and release readiness projection inspected; temperature semantic mismatch found and fail-closed |
| Stage 12B focused runtime | NOT_RUN | current branch | no status checks / workflow runs on `61dfaf7...`; no runtime PASS claimed |
| Stage 12B aggregate runtime | NOT_RUN | current branch | no exact-head executable route attached |
| Stage 12B parity | NOT_RUN | current branch | focused script prepared but not executed |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Existing numerical kernel reused | PASS (static) | executor imports/calls `calculateLocalContinuum`; no numerical core file changed in Stage 12B |
| New execution bridge has real production consumer | PASS (static) | workbench API calls parity executor |
| `run()` authority unchanged | PASS (static) | existing `run: c.run` retained |
| Lifecycle execution/recovery publication unchanged | PASS (static) | parity API contains no publish/register action |
| Release authority unchanged | PASS (static) | parity evidence hard-false; workbench release path untouched |
| Temperature semantic guessing avoided | PASS (static) | explicit fail-closed code until alpha/thermal contract exists |
| Legacy vs compiled numerical parity | NOT_RUN | requires executable focused check |

### Explicitly Not Validated

- exact-head numerical parity;
- exact-head syntax/import/build behavior of the new Stage 12B files;
- T6/Q8 numerical equivalence through the compiled path;
- traction/pressure/body-force/imposed-displacement parity;
- thermal execution semantics;
- authoritative domain-first `run()` integration.

No runtime PASS is inferred from source review.

## Changed-File Ledger — Current Stage Delta

Current PR was 29 files after reconciliation. Stage 12B adds two new paths and modifies three already-governed paths before the structural split:

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---|---|---|---|---|
| `src/workspace/lafea-continuum-compiled-execution.js` | 12B | 12B | parity execution + lowering; pending split | Yes | static audit; runtime NOT_RUN |
| `scripts/lafea-continuum-compiled-execution-check.mjs` | 12B | 12B | focused parity/fail-closed regression | Yes | runtime NOT_RUN |
| `src/workspace/lafea-continuum-solver-model.js` | 12A | 12B | retain execution-required source model policy | Yes | static audit; runtime NOT_RUN |
| `src/workspace/lafea-workbench-orchestrator-api.js` | earlier | 12B | real non-authoritative parity production consumer | Yes | static audit; runtime NOT_RUN |
| `scripts/lafea-continuum-solver-model-check.mjs` | 12A | 12B | assert retained source execution policy | Yes | runtime NOT_RUN |
| `scripts/lafea-nonbucket-stack-check.mjs` | earlier | 12B | aggregate Stage 12B focused check / schema v21 | Yes | runtime NOT_RUN |

After the split, `src/workspace/lafea-continuum-compiled-input.js` will become the 32nd PR path. No `.github/workflows/*` file is authorized or planned.

## Recommended Forward Sequence

1. Close ISS-002 by splitting the Stage 12B module without changing behavior.
2. Add explicit focused fail-closed coverage for the existing temperature-delta domain shape.
3. Re-read PR diff and current `main`; reconcile only if main advanced and overlap is understood.
4. Inspect exact-head statuses/workflow runs; run any existing executable route if one becomes available.
5. If runtime remains unavailable, keep Stage 12B decision PARTIAL with numerical parity NOT_RUN; do not switch `run()`.
6. Once executable parity passes, Stage 13 may consider authoritative compiled-model `run()` consumption with separate lifecycle/release evidence design.
7. Only then expand continuum attachment parity and later shell family work.

## Process Notes / Lessons Learned

- Domain attachment payloads are intentionally opaque at the generic domain-contract layer; execution adapters must therefore validate stage/family semantics explicitly rather than assuming field meaning.
- A `TEMPERATURE` label is insufficient to infer thermal strain. Delta-T requires a qualified coefficient-of-thermal-expansion/material contract.
- Preserving `elementTypePolicy` in the compiled solver model is required to avoid manufacturing T3 fallback authority during lowering.
- Runtime infrastructure absence is a project dependency and must remain visible as NOT_RUN rather than being replaced by static claims.
- CodingRules module-size limits are part of the delivery contract; Stage 12B must be split before completion.

## Next-Agent Handover

- **Current stopping point:** Stage 12B production seam exists; structural split required.
- **PR / branch:** #1038 / `agent/integrated-lafea-common-stage-roadmap`.
- **Implementation HEAD before this report:** `f3ba3bf1fc0df907e1c0b32d4c5b054abed75d03`.
- **Last completed stage:** 12A.
- **Current active stage:** 12B.
- **Start here:** `src/workspace/lafea-continuum-compiled-execution.js`; split pure input lowering into `lafea-continuum-compiled-input.js` and keep direct production consumption.
- **Do not redo:** Stages 9–12A, current-main reconciliation, source execution-policy carriage.
- **Do not assume:** runtime parity PASS, temperature semantics, release qualification, or authoritative compiled `run()`.
- **Files currently involved:** solver model, compiled execution, workbench API, focused compiled-execution check, solver-model check, nonbucket aggregate.
- **Known failing checks:** none executed/failing on current head; exact-head runtime is NOT_RUN.
- **Validation still required:** syntax/import/focused/aggregate/numerical parity on exact head.
- **Open QST items:** none requiring Owner decision at this point.
- **Important deferred item:** thermal expansion/material semantics for `TEMPERATURE` execution.
- **Highest-risk remaining item:** semantically incorrect attachment translation with plausible numeric output.
- **Exact next recommended action:** perform the module split, add temperature fail-closed regression, verify current PR diff/base/head, then attempt executable validation without changing workflow YAML.
- **Required reading:** this report, `docs/IntegratedLAFEAroadmap.md`, Stage 12A compiler/mapping, current local-continuum source/load contracts, and CodingRules exact ref `43eccc...`.
