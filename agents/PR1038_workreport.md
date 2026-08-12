# Integrated LAFEA Common/Stage Architecture — Living Work Report

## PR Mission Control

- **Mission:** evolve LAFEA into one governed analysis platform with common engineering infrastructure and explicit stage-specific physics/authority while preserving lifecycle, mesh custody, numerical verification, and fail-closed release semantics.
- **Source task:** #1025.
- **PR:** #1038, DRAFT.
- **Branch:** `agent/integrated-lafea-common-stage-roadmap`.
- **Original base:** `a587867963cc9199caca6e7adfa03af95a316aa2`.
- **Current reconciled `main`:** `271d04fa2674ab68367808d05f2429ec5e236a6e`.
- **Current implementation HEAD before Stage 12 planning sync:** `1af1d340d730f504793652c3e521400b69635a15`.
- **Last exact-head runtime-validated engineering increment:** Stage 9 at `1dab5bc4b6a73f0f4fac474d37130f6c47be37f6`.
- **Current stage:** Stage 12A — LAFEA.3 canonical solver-model contract + compiler, IN_PROGRESS.
- **Last completed stage:** Stage 11 — explicit LAFEA.3 non-geometric geometry/mesh revalidation, IMPLEMENTED / runtime gate unavailable.
- **Engineering status:** IN_PROGRESS.
- **Validation status:** Stage 10/11 exact-head runtime validation remains NOT_RUN because current `main` removed the old Actions fleet and the execution container cannot resolve `github.com`; no pass is claimed.
- **Current blocker:** executable exact-head gate unavailable; compiler work may proceed only as a bounded non-numerical authority slice with no solver/release promotion.
- **Exact next action:** implement the Stage 12A pure compiler and a real workbench compile action; add focused contract coverage; static diff-audit; do not route solver execution until executable validation is restored.

## Handover in 60 Seconds

### What is now true

- LAFEA common/stage routing is centralized in the production stage adapter.
- Shared unit factors are consumed by LAFEA.1 and LAFEA.3.
- FE thickness is classified as `SECTION_PROPERTY` rather than geometry.
- LAFEA.3 geometry identity excludes material/section/load/BC/provenance.
- LAFEA.3 mesh-content identity excludes physics evidence.
- LAFEA.3 can explicitly revalidate unchanged geometry/mesh after eligible non-geometric edits without running the solver; execution/recovery/release remain stale/unqualified.
- The branch is reconciled to pinned `main` and no `.github/workflows/*` file is changed.

### What is being worked on

Stage 12A defines the first deterministic **canonical solver-model compiler** for the governed domain-first LAFEA.3 route:

```text
current source authority
+ canonical LAFEA.3 engineering input
+ current analysis domain
+ current analysis geometry evidence
+ current governed mesh-v2 evidence
        ↓
canonical solver model
```

The compiler is translation/mapping only. It does not assemble stiffness, solve equations, recover stress, produce convergence, assess code, or qualify release.

### What remains unfinished

- Stage 10/11 runtime qualification.
- General generated-mesh feature mapping for all current domain attachment kinds.
- Execution of the compiled model through the existing local-continuum numerical kernel.
- Numerical parity between legacy and domain-first routes.
- LAFEA.4/.5 compiler migration.
- Standalone runtime extraction, run history/comparison, verification center, release dossier.

### What must not be assumed

- Stable mesh identity is not solver-execution authority.
- A current mesh-v2 artifact is not sufficient by itself to apply loads/restraints.
- Source node/element IDs must not be assumed to survive automatic remeshing.
- Stage 12A does not prove numerical parity.
- Stage 10/11 are not runtime-validated on the current branch.

### Highest-risk remaining item

The domain-first contract has mesh-independent geometry features and attachments, while mesh-v2 intentionally contains only topology/coordinates. Generic feature-to-mesh mapping is not yet a first-class common contract. The compiler must fail closed rather than infer engineering authority from coincidental source IDs.

### Exact next action

Implement a LAFEA.3-only compiler that validates all parents, maps geometry features to governed mesh entities geometrically, supports the current single-region/uniform-thickness scope, and exposes the compiled model through a real workbench API without executing it.

---

## Mission and Engineering Intent

The purpose of this PR is not directory cleanup. It is to establish an engineering architecture where editable source, physical domain, geometry, mesh, solver input, results, verification, and release evidence have explicit independent authority.

### Governing principles

1. UI/render state is never engineering authority.
2. Calculation success is not release qualification.
3. Geometry identity, mesh content, solver-model identity, execution, recovery, custody, verification, and release evidence remain distinct.
4. No old source/model/mesh hash is copied forward to manufacture currentness.
5. Producer-owned mesh hashes are not reinterpreted.
6. Loads/restraints bind to physical geometry features, not incidental FE numbering.
7. Compiler output must be deterministic and reconstructable from exact parents.
8. A compiler may not silently fill missing engineering data.
9. LAFEA.6 remains fail-closed unsupported.
10. No `.github/workflows/*` change without explicit Owner authorization.

### Explicit non-goals for Stage 12A

- no element-matrix changes;
- no sparse-solver changes;
- no stress-recovery changes;
- no execution/recovery lifecycle promotion;
- no release qualification;
- no shell compiler;
- no multi-region material mapping;
- no nonuniform thickness mapping;
- no compatibility shim that pretends source mesh IDs are generated-mesh authority.

---

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Common/stage route boundary | P0 | VALIDATED | 4–6 | exact-head focused/bounded checks on prior heads |
| Shared input unit factors | P0 | VALIDATED | 7 | `569dfaa864...` |
| Dependency taxonomy / `SECTION_PROPERTY` | P0 | VALIDATED | 8 | `5709110edb...`; closure repair retained |
| LAFEA.3 canonical geometry identity | P0 | VALIDATED | 9 | `1dab5bc4b6...` |
| LAFEA.3 canonical mesh-content identity | P0 | IMPLEMENTED | 10 | runtime gate unavailable |
| Explicit geometry/mesh revalidation | P0 | IMPLEMENTED | 11 | runtime gate unavailable |
| Canonical solver-model compiler | P0 | IN_PROGRESS | 12A | current stage |
| Compiled-model numerical execution/parity | P0 | NOT_STARTED | 12B/13 | requires 12A + executable gate |
| LAFEA.4/.5 family compilers | P1 | NOT_STARTED | later | continuum pattern first |
| Standalone LAFEA runtime/extraction | P1 | NOT_STARTED | later | engineering pipeline first |

---

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | One common LAFEA platform plus explicit stage/family physics adapters. | Yes |
| DEC-007 | Decision | P0 | VALIDATED | Mesh currentness is established only by explicit recomputation/revalidation. | Yes |
| DEC-009 | Decision | P0 | VALIDATED | LAFEA.3 geometry identity excludes non-geometric physics/provenance. | Yes |
| DEC-011 | Decision | P0 | IMPLEMENTED | LAFEA.3 mesh artifact identifies discretization content only. | Yes |
| DEC-013 | Decision | P0 | IMPLEMENTED | Revalidation derives new identities; no parent hash copying. | Yes |
| DEC-014 | Decision | P0 | IMPLEMENTED | Revalidation publishes one coherent final state. | Yes |
| DEC-015 | Decision | P0 | ACCEPTED | Stage 12A compiler is non-numerical and may expose a compiled model without authorizing execution. | Yes |
| DEC-016 | Decision | P0 | ACCEPTED | Domain-first solver compilation uses geometry-feature mapping; source FE IDs are not accepted as remesh authority. | Yes |
| RISK-005 | Risk | P0 | BLOCKED | Current branch lacks an executable exact-head Actions gate; local clone also unavailable due DNS. | Yes |
| RISK-006 | Risk | P0 | OPEN | Generic feature→mesh mapping is not yet a standalone common contract; compiler must own a bounded mapping implementation or fail closed. | Yes |
| IMP-001 | Improvement | P1 | DEFERRED | Extract reusable feature→mesh mapping contract after LAFEA.3 compiler pattern is proven. | Yes |
| DEBT-001 | Debt | P1 | ACCEPTED | Current domain contract is single-region and does not encode section-region identity; Stage 12A therefore supports one material region + uniform thickness only. | Yes |
| ISS-001 | Defect | P2 | BLOCKED | Unrelated LFEA piping repository-attribution contradiction; out of assignment scope. | No |

---

## Stage Roadmap

- **Stages 4–6:** common/stage routing — COMPLETE.
- **Stage 7:** common unit factors — COMPLETE.
- **Stage 8:** dependency taxonomy — COMPLETE.
- **Stage 9:** canonical LAFEA.3 geometry identity — COMPLETE.
- **Stage 10:** canonical LAFEA.3 mesh-content identity — IMPLEMENTED / validation unavailable.
- **Stage 11:** explicit non-geometric geometry/mesh revalidation — IMPLEMENTED / validation unavailable.
- **Stage 12A:** canonical LAFEA.3 solver-model contract + compile action — IN_PROGRESS.
- **Stage 12B:** compiled-model execution bridge to existing numerical kernel — NOT_STARTED.
- **Stage 13:** legacy-vs-domain-first numerical parity — NOT_STARTED.
- **Stage 14:** generalized named-region/load/restraint mapping — NOT_STARTED.
- **Stage 15:** extend compiler architecture to LAFEA.4/.5 — NOT_STARTED.

---

## Stage 12A — Pre-Implementation Plan

### Current truth

The local-continuum numerical kernel currently consumes `local-continuum-model/v1`, whose canonical model includes materials, source mesh, constraints, loads, result requests, qualification profile, limitations, and source evidence. The current calculator validates that canonical model and then assembles/solves directly.

The domain-first path already has:

- a mesh-independent `lafea-continuum-analysis-domain/v1` with one region, material reference, physical cases, and attachments targeting `VERTEX`, `SEGMENT`, or `REGION`;
- retained analysis-geometry evidence with canonical vertices/line-or-arc segments/loops;
- governed `lafea-analysis-mesh-evidence/v2` containing canonical mesh topology/coordinates plus exact source/domain/geometry/profile/producer/qualification parents;
- a custody projection that classifies the mesh `CURRENT_PASS` before it is usable for run.

The orchestrator currently blocks domain-first execution with `LAFEA_DOMAIN_FIRST_SOLVER_MODEL_NOT_COMPILED`.

### Objective

Add the first production-consumed deterministic compiler boundary that converts the current LAFEA.3 domain-first authority chain into a canonical solver-model artifact **without executing numerical physics**.

### Expected scope/files

Planned production files:

```text
src/workspace/lafea-continuum-solver-model.js
src/workspace/lafea-continuum-solver-mapping.js
src/workspace/lafea-workbench-evidence-actions.js
src/workspace/lafea-workbench-orchestrator-api.js
```

Planned focused validation:

```text
scripts/lafea-continuum-solver-model-check.mjs
scripts/lafea-nonbucket-stack-check.mjs
```

Living report remains this file. No workflow YAML, solver kernel, release, shell-stage, or lifecycle schema file is planned.

### Engineering rationale

The compiler is the missing anti-corruption boundary between engineering intent and FE execution. The solver must never need editable UI/document state or derive physical meaning from coincidental mesh numbering.

### Planned compiler input

The real workbench action will derive:

```text
sourceAuthority
canonicalInput = normalizeDocument → canonicalize(current document)
analysisDomain = current retained domain
geometryEvidence = current retained analysis geometry
meshEvidence = current retained governed mesh-v2
stageAdapter = current LAFEA.3 adapter
```

### Planned compiler output

A deterministic immutable record containing at minimum:

```text
schema / stageId / compiler identity
sourceHash
canonicalInputHash
analysisDomainHash
analysisGeometryHash
meshArtifactHash / meshHash / meshProfileHash
formulation / units / coordinateSystemId
DOF policy
material table
uniform section/thickness assignment
mesh nodes
elements + materialRef + thickness
physical cases
compiled mesh targets for each domain attachment
solverModelHash
status = COMPILED
executionAuthorized = false
releaseQualified = false
```

### Mapping policy

- `REGION` → current single analysis region; maps to all governed mesh elements.
- `VERTEX` → exactly one governed mesh node by geometric coordinate match.
- `SEGMENT/LINE` → governed mesh nodes lying on the exact line segment, ordered from start to end.
- `SEGMENT/CIRCULAR_ARC` → governed mesh nodes lying on the exact radius/sweep, ordered by arc parameter.
- Missing/ambiguous feature mapping is a compiler error.
- Mesh `z` must remain zero for LAFEA.3.
- Source FE node/element IDs are not used to establish mapping authority.

### Current bounded material/section policy

The domain contract currently represents exactly one material region and no section-region identity. Stage 12A therefore requires:

- `domain.region.materialRef` resolves to exactly one canonical material;
- every canonical source element uses that same material;
- all canonical source elements have one identical positive thickness.

Anything else fails with an explicit mapping-required error. No averaging/defaulting is allowed.

### Expected behavior

A current domain-first LAFEA.3 stage with current PASS geometry and mesh custody can call a production workbench method and receive a deterministic compiled model. The action does not mutate numerical lifecycle evidence and does not authorize release.

### Edge cases

- stale source/domain/geometry/mesh parent → reject;
- mesh quality block → reject;
- non-planar mesh node → reject;
- missing domain material → reject;
- multiple material regions implied by source → reject;
- nonuniform thickness → reject;
- vertex mapping none/multiple → reject;
- segment mapping lacks endpoints / is ambiguous → reject;
- unsupported stage/domain-first inactive → reject;
- repeated compile on same parents → byte-identical canonical model/hash expected.

### Planned validation

Focused script will construct current governed domain/geometry/mesh evidence using existing MP2 fixtures and assert:

1. deterministic compilation under input ordering permutations;
2. exact parent hashes in compiled output;
3. material/section assignment is explicit and complete;
4. vertex/segment/region attachments map only through geometry coordinates/features;
5. source mesh IDs are not needed for target mapping;
6. stale parent/tampered mesh/nonuniform thickness/missing material fail closed;
7. output states `executionAuthorized:false` and `releaseQualified:false`;
8. workbench production action requires current `CURRENT_PASS` mesh custody.

The script will be wired into the existing non-bucket aggregate. Runtime result remains `NOT_RUN` until an executable gate is available.

### Known risks

- RISK-005 exact-head execution unavailable.
- RISK-006 mapping is new authority-sensitive behavior and must stay bounded to current domain contract.
- DEBT-001 multi-region/nonuniform-section generalization is deferred, not silently approximated.

---

## Engineering Invariants

| Invariant | Enforced in | Stage 12A change? | Validation intent |
|---|---|---|---|
| Preview/UI is not solver authority | workbench/domain/mesh contracts | No | compiler accepts governed retained evidence only |
| Mesh hash and solver-model hash are distinct | mesh evidence + compiler | Yes, new explicit solver-model hash | focused parent/hash assertions |
| Loads/restraints target geometry features, not FE IDs | domain + compiler mapping | Yes, production consumption | geometry-based mapping assertions |
| Mesh quality BLOCK cannot compile | custody/action | Yes | focused rejection |
| Compilation is not execution | compiler output/action | Yes | `executionAuthorized:false`; no calculator call |
| Compilation is not release | compiler output/action | Yes | `releaseQualified:false` |
| Solver numerics unchanged | local-continuum core | No production edits planned | diff audit + later parity stage |

---

## Validation / Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Stage 9 exact-head LAFEA qualification | PASS | `1dab5bc4b6...` | focused + bounded + numerical + browser/build gates |
| Stage 10 focused/aggregate | NOT_RUN | current branch | executable gate unavailable |
| Stage 11 focused/aggregate | NOT_RUN | current branch | executable gate unavailable |
| Stage 12A focused compiler check | NOT_RUN | not implemented yet | planned |
| Stage 12A bounded aggregate | NOT_RUN | not implemented yet | planned |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Canonical geometry identity semantics | PASS | Stage 9 |
| Canonical mesh-content identity semantics | NOT_RUN on current final path | Stage 10 code + static audit only |
| Explicit non-geometric revalidation | NOT_RUN | Stage 11 code + static audit only |
| Domain-first solver-model mapping | NOT_RUN | Stage 12A not implemented yet |
| Numerical equivalence of compiled route | NOT_RUN | Stage 13 future |

### Explicitly Not Validated

- Stage 10/11 exact-head runtime behavior.
- Stage 12A compiled model runtime behavior.
- Generated-mesh numerical execution.
- Multi-region material assignment.
- Nonuniform thickness assignment after remeshing.
- Shell compiler behavior.
- Release qualification from compiled models.

---

## Changed-File Ledger

Current PR-owned paths before Stage 12 implementation include the roadmap/report; common-input units; geometry/mesh identity and revalidation scripts; non-bucket aggregate; stage adapter/guided workflow; lifecycle producer/profile/source/orchestrator files; and LAFEA.3 geometry/source-mesh/revalidation modules.

Stage 12 planned additions/changes are listed in the Stage 12A plan. No `.github/workflows/*` file is authorized.

Before PR closure the ledger must be reconciled against GitHub's actual changed-file list; any unexplained file blocks closure.

---

## Known / Deferred Work

- **RISK-005:** executable exact-head validation unavailable — BLOCKED pending infrastructure/Owner direction.
- **RISK-006:** feature→mesh mapping authority — current Stage 12A scope.
- **DEBT-001:** multi-region and nonuniform section mapping — DEFERRED until the single-region compiler is proven.
- **IMP-001:** extract a reusable family-level feature→mesh mapping service after production use proves the interface.
- **ISS-001:** unrelated LFEA piping attribution contradiction — out of scope.
- LAFEA.4/.5 geometry/mesh identity cleanup and compiler migration — deferred.
- Numerical verification center, history/comparison, standalone runtime, release dossier — roadmap work.

---

## Recommended Forward Sequence

1. Complete Stage 12A compiler contract + production compile action.
2. Restore/obtain an executable exact-head validation route and run Stage 10–12 focused/bounded checks.
3. Stage 12B: bridge the compiled model into the existing local-continuum assembly/solve/recovery implementation without changing element mathematics.
4. Stage 13: legacy vs domain-first numerical parity for T3/T6/Q8.
5. Generalize feature→mesh mapping only after parity is proven.
6. Extend the family compiler pattern to LAFEA.4, then reuse for LAFEA.5 footprint specialization.
7. Complete standalone bootstrap/history/verification/release/extraction last.

---

## Stage Execution Log

- **Stages 4–6:** stage route/input semantics moved to production adapter; validated on prior exact heads.
- **Stage 7:** common unit factors; validated at `569dfaa864...`.
- **Stage 8:** `SECTION_PROPERTY` taxonomy; validated at `5709110edb...`; later orchestration omission repaired.
- **Stage 9:** canonical LAFEA.3 geometry identity; validated at `1dab5bc4b6...`.
- **Stage 10:** canonical source-mesh content identity; implemented; exact final runtime gate unavailable.
- **Current-main reconciliation:** two-parent merge `59ad4a9fc0...`, preserving upstream workflow removals.
- **Stage 11:** explicit geometry/mesh revalidation; implemented; publication made atomic at `b02c7a172c...`; runtime gate unavailable.
- **Stage 12A planning:** current entry; field mapping and authority audit performed before production implementation.

---

## Process Notes / Lessons Learned

- Planning documentation can lag production contracts; source and retained evidence are the authority for implementation planning.
- Geometry and mesh identity can be stable while exact source/model parents change; identity equality is not currentness.
- A safe revalidation transaction must dry-run all parent/prerequisite checks before mutable registration and publish once.
- A mesh contract that intentionally excludes physics requires an explicit compiler/mapping boundary before execution.
- Source FE IDs are not a valid remeshing contract; physical geometry features must be resolved to current mesh entities.

---

## Next-Agent Handover

- **Current stopping point:** Stage 12A pre-implementation gate complete.
- **PR / branch / HEAD before report sync:** #1038 / `agent/integrated-lafea-common-stage-roadmap` / `1af1d340d730f504793652c3e521400b69635a15`.
- **Last completed stage:** Stage 11 implementation; runtime gate unavailable.
- **Current active stage:** Stage 12A canonical LAFEA.3 solver-model compiler.
- **Start here:** `src/workspace/lafea-continuum-analysis-domain.js`, `lafea-analysis-geometry-evidence.js`, `lafea-analysis-mesh-evidence-v2.js`, and `src/core/local-continuum/canonical-model.js`.
- **Do not redo:** Stage 9 geometry projection, Stage 10 mesh identity, Stage 11 revalidation.
- **Do not assume:** generated mesh IDs match source FE IDs; Stage 10/11 are runtime validated; compiler execution is authorized.
- **Files currently involved:** planned Stage 12A files listed above.
- **Known failing checks:** none executed on current exact head; absence of executable gate is not a PASS.
- **Validation still required:** Stage 10/11/12 focused and aggregate runtime checks plus retained numerical suites once executable environment exists.
- **Open QST-*:** none currently; unsupported mapping cases are intentionally fail-closed decisions/debt, not unresolved guesses.
- **Important deferred IMP-*:** IMP-001 reusable mapping service extraction.
- **Highest-risk remaining item:** authority-correct feature→mesh mapping without source-ID leakage.
- **Exact next recommended action:** implement bounded mapping + compiler, production compile action, focused regression, then diff-audit before any solver bridge.
- **Required reading:** issue #1025, `docs/IntegratedLAFEAroadmap.md`, pinned Common `CodingRules.md`, this report.
