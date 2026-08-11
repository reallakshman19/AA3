# Integrated LAFEA Common/Stage Architecture — Living Work Report

## PR Mission Control

- **Mission:** Evolve LAFEA into one governed analysis platform with common engineering infrastructure and explicit stage-specific physics/authority, while preserving lifecycle, mesh custody, numerical verification, and fail-closed release semantics.
- **Source task / issue:** #1025 — LAFEA Standalone Application — separation, governed local-FEA workflow, and next-level roadmap
- **PR number:** #1038
- **Branch:** `agent/integrated-lafea-common-stage-roadmap`
- **Original base commit:** `a587867963cc9199caca6e7adfa03af95a316aa2`
- **Current branch HEAD before Stage 7 implementation:** `bfbd16221736bc109b779fec395169875e4433ee`
- **Current `main` observed before Stage 7:** `084e0587ce1d3d17c87670456226bd6534891ed9`
- **PR status:** DRAFT
- **Current stage:** Stage 7 — Batch 1A common unit-conversion primitive
- **Last completed stage:** Stage 6 — bounded first-slice reconciliation / handover
- **Engineering status:** IN_PROGRESS
- **Validation status:** prior bounded implementation PASS at `d01de620ff4b4fcd5a5e077dbcf3b24d062846c3`; Stage 7 not yet validated
- **Current blocker:** None for Stage 7 implementation. PR branch is 22 commits behind current `main`; comparison shows no direct overlap with the six existing PR files. This divergence must be reconciled before final PR closure.
- **Exact next action:** Implement the shared unit-factor registry, make existing LAFEA.1 and LAFEA.3 unit adapters consume it, add focused regression, wire the regression into the existing non-bucket aggregate, then run exact-head validation.

## Handover in 60 Seconds

### What is now true

- `docs/IntegratedLAFEAroadmap.md` is the governing implementation roadmap.
- The first production slice already centralized stage route family and semantic input requirements in `lafea-stage-analysis-adapter.js`.
- `lafea-guided-workflow.js` consumes that adapter and no longer maintains a duplicate per-stage input table.
- LAFEA.1/.2 remain analytical routes, LAFEA.3/.4/.5 remain FEA routes, LAFEA.6 remains explicit unsupported.
- Stage 7 is intentionally narrower than a generic material model: current LAFEA.1 material records are identity/role/source evidence, while LAFEA.3 material records carry constitutive properties. Their physics must not be collapsed.
- Existing LAFEA.1 and LAFEA.3 unit modules duplicate compatible conversion factors for common dimensions; this is the first common-input primitive being extracted.

### What is being worked on

Batch 1A:

```text
shared unit-factor registry
        ↓
LAFEA.1 local-stress units adapter
        ↓
LAFEA.3 local-continuum units adapter
        ↓
existing canonical model/execution paths
```

The shared module will own only unit-to-canonical scaling facts. Stage-specific required unit keys, canonical unit sets, validation errors, derived dimensions, and physics remain in each engine package.

### What remains unfinished

- further common input identity primitives;
- dependency-aware invalidation;
- geometry authority / named physical regions;
- deeper meshing integration;
- canonical solver-model compiler;
- physical probes / semantic comparison;
- verification center;
- LAFEA runtime extraction/history/release/dossier;
- physical repository extraction;
- future LAFEA.7+ physics.

### What must not be assumed

- Stage 7 does not alter numerical formulations or canonical units.
- Shared conversion factors do not create engineering authority.
- LAFEA.1 material role/source evidence is not equivalent to LAFEA.3 elastic constitutive data.
- The PR is not synchronized with current `main` yet.
- No release qualification is created by this work.

### Highest-risk remaining item

Commonization must not silently broaden accepted units, change canonical values, or replace stage-specific validation/error semantics.

### Exact next action

Implement Stage 7 exactly as scoped below, then validate both direct unit behavior and existing LAFEA numerical/product paths.

---

## Mission and Engineering Intent

### Mission

Create one LAFEA platform that shares infrastructure only where engineering meaning is actually identical. Stage-specific formulations, result semantics, verification applicability, and authority remain explicit.

### Governing principles

1. UI state is not solver authority.
2. Calculation success is not release qualification.
3. Current/stale custody must remain explicit.
4. Shared infrastructure may remove duplication but may not broaden engineering claims.
5. Every new abstraction must have a real production consumer in this PR.
6. No hidden defaults or fallback engineering data.
7. No `.github/workflows/*` modification without explicit Owner authorization.

### Explicit non-goals for Stage 7

- no material-schema unification;
- no load/BC schema redesign;
- no solver, element, mesher, recovery, or release changes;
- no canonical-unit changes;
- no new accepted unit aliases beyond existing engine behavior;
- no LAFEA.6 activation;
- no broad directory move.

---

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Living work report | P0 | IN_PROGRESS | All | This file |
| Integrated roadmap | P0 | DONE | 1 | `docs/IntegratedLAFEAroadmap.md` |
| Common/stage route/input boundary | P0 | VALIDATED | 4–5 | Adapter + workflow, exact-head PASS |
| Batch 1A shared unit factors | P0 | IN_PROGRESS | 7 | Planned below |
| Batch 1A focused regression | P0 | NOT_STARTED | 7 | Planned script |
| Dependency-aware invalidation | P0 | NOT_STARTED | Future | Roadmap Stage D |
| Geometry authority / named regions | P0 | NOT_STARTED | Future | Roadmap Stage E |
| Meshing integration | P0 | NOT_STARTED | Future | Roadmap Stage F |
| Canonical solver-model compiler | P0 | NOT_STARTED | Future | Roadmap Stage G |
| Results/probes/comparison | P1 | NOT_STARTED | Future | Roadmap Stage H |
| Verification center | P1 | NOT_STARTED | Future | Roadmap Stage I |
| Standalone LAFEA runtime extraction | P1 | NOT_STARTED | Future | Roadmap Stage J/L |
| Cross-product repository integration attribution | P1 | BLOCKED | Existing | ISS-001 |
| Upstream branch synchronization | P0 | IN_PROGRESS | 7/closure | RISK-004 |

---

## Engineering Item Register

| ID | Type | Priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | One common LAFEA platform plus explicit stage physics/capability adapters. | Yes |
| DEC-002 | Decision | P0 | ACCEPTED | Extend production-consumed boundaries; no speculative parallel capability service. | Yes |
| DEC-003 | Decision | P0 | ACCEPTED | LAFEA.4/.5 share shell infrastructure only where engineering meaning is identical. | Roadmap |
| DEC-004 | Decision | P0 | ACCEPTED | New common fields/modules require immediate production consumption. | Yes |
| DEC-005 | Decision | P0 | ACCEPTED | Common adapter uses semantic capabilities; UI step IDs remain UI-local. | Yes |
| DEC-006 | Decision | P0 | ACCEPTED | Batch 1A shares only unit-factor facts; stage-specific required keys, canonical unit maps, errors, and derived dimensions remain local. | Yes |
| RISK-001 | Risk | High | MITIGATED | Over-generalization controlled by semantic boundaries. | Yes |
| RISK-002 | Risk | High | MITIGATED | Release/custody authority leakage avoided. | Yes |
| RISK-003 | Risk | Medium | CLOSED | First adapter/workflow slice passed bounded exact-head checks. | Yes |
| RISK-004 | Risk | High | OPEN | PR branch is 22 commits behind current `main`; must be reconciled before closure. No direct overlap with existing six PR files was found in pre-Stage-7 compare. | Yes |
| ISS-001 | Defect | P1 | BLOCKED / OUT OF SCOPE | Pre-existing LFEA repository-attribution contradiction in pinned-base anti-drift vs governance-recording path. | No |
| IMP-001 | Improvement | P0 | DONE | Guided input requirements centralized at stage adapter. | Yes |
| IMP-002 | Improvement | P1 | DEFERRED | Future LAFEA.7+ plugin registration/deeper common kernel. | Roadmap |
| IMP-003 | Improvement | P0 | IN_PROGRESS | Remove duplicated common unit conversion factors across analytical and FE engines without changing accepted behavior. | Yes |

### RISK-004 detail — upstream divergence

Observed before Stage 7:

```text
current main: 084e0587ce1d3d17c87670456226bd6534891ed9
PR head:      bfbd16221736bc109b779fec395169875e4433ee
comparison:   PR ahead 14, behind 22, diverged
merge base:   a587867963cc9199caca6e7adfa03af95a316aa2
```

The 22 upstream commits are dominated by standalone LFEA runtime/shared-solver work. GitHub compare showed no changes to the existing six PR files:

```text
agents/PR1038_workreport.md
docs/IntegratedLAFEAroadmap.md
scripts/lafea-nonbucket-stack-check.mjs
scripts/lafea-ui-workflow-truthfulness-check.mjs
src/workspace/lafea-guided-workflow.js
src/workspace/lafea-stage-analysis-adapter.js
```

Decision: Stage 7 may proceed on the current assignment branch because there is no direct file overlap, but final closure is blocked until current-main integration is explicitly reconciled and revalidated.

---

## Stage Roadmap / Execution Log

### Stage 1 — Report initialization + technical findings

**Decision:** COMPLETE.

Established current LAFEA.1–.6 registry/lifecycle/meshing truth and retained the integrated roadmap before production changes.

### Stage 2 — PR allocation + report synchronization

**Decision:** COMPLETE.

Opened draft PR #1038 and synchronized the work-report filename.

### Stage 3 — Initial changed-file / repository-state verification

**Decision:** COMPLETE.

Before initial production changes, only roadmap/report files were present.

### Stage 4 — First production common/stage capability increment

**Decision:** COMPLETE.

Implemented route classification and semantic input requirements in the existing stage adapter; guided workflow consumes them. No numerical/custody/release authority changed.

### Stage 5 — Focused exact-head validation

**Decision:** COMPLETE.

Validated implementation head `d01de620ff4b4fcd5a5e077dbcf3b24d062846c3` through focused workflow truthfulness, bounded non-bucket, numerical core, foundation, meshing, solver, workbench, canvas, browser, syntax/import/build/hygiene, main-gate, bundle diagnostic, hybrid browser, and meshing exact-head qualification.

### Stage 6 — Reconciliation / handover

**Decision:** COMPLETE for the first bounded slice.

PR remained draft and unmerged.

### Stage 7 — Batch 1A common unit-conversion primitive

**Current truth**

- LAFEA.1 `src/core/local-stress/units.js` owns factors for `length`, `force`, `moment`, `pressure`, `stress`.
- LAFEA.3 `src/core/local-continuum/units.js` independently owns overlapping factors for `length`, `force`, `stress` plus `modulus`.
- Both canonicalize to the same scale for shared dimensions (`mm`, `N`, `MPa`).
- LAFEA.3 derives body-force-intensity scaling from `stress / length`; this remains local.
- LAFEA.1 canonical unit contract includes moment/pressure; LAFEA.3 canonical unit contract includes modulus/strain/body-force intensity. These contracts remain local.

**Objective**

Create one bounded shared registry of unit-to-canonical scale factors and have both production engines consume it without changing their schemas, canonical outputs, validation errors, or accepted unit sets.

**Expected scope/files**

```text
agents/PR1038_workreport.md
src/core/lafea-common-input/units.js                 new
src/core/local-stress/units.js                       modify
src/core/local-continuum/units.js                    modify
scripts/lafea-common-input-units-check.mjs           new
scripts/lafea-nonbucket-stack-check.mjs              modify
```

**Engineering rationale**

Unit scale facts such as `m -> 1000 mm`, `kN -> 1000 N`, and `Pa -> 1e-6 MPa` have identical engineering meaning across these stages. Required unit keys and stage-specific physics do not. Sharing only the scale registry removes duplicated engineering constants while retaining each engine's authority boundary.

**Planned implementation**

1. Add a small pure common module containing frozen scale-factor tables and a lookup function.
2. Replace local duplicated factor tables in LAFEA.1 and LAFEA.3 unit modules with the shared lookup.
3. Keep stage-specific explicit-key validation and `modelError` creation in the existing modules.
4. Keep LAFEA.3 derived `bodyForceIntensity` factor local.
5. Add focused regression proving exact scale factors, aliases, unsupported-unit failure, missing-unit failure, and both analytical/FE consumers.
6. Add that script to the existing non-bucket aggregate; do not modify workflow YAML.

**Expected behavior**

- All current valid unit sets produce byte-equivalent numeric factors/canonical values.
- Existing invalid unit sets still fail closed with the same engine error code.
- No unit is accepted merely because it exists in the shared registry unless that stage's required dimension explicitly consumes it.

**Edge cases**

- LAFEA.1 moment aliases `N·mm`/`N*mm`, `N·m`/`N*m`, `kN·m`/`kN*m` remain accepted.
- LAFEA.3 `GPa -> MPa` modulus conversion remains 1000.
- LAFEA.3 body-force intensity remains derived from declared stress and length factors.
- Missing required dimensions remain rejected; no hidden defaults.
- Unknown dimension/unit lookup returns no factor and cannot silently fall back.

**Planned validation**

- focused `scripts/lafea-common-input-units-check.mjs`;
- existing LAFEA.1 contract/foundation checks;
- existing LAFEA.3 numerical core checks;
- bounded non-bucket aggregate;
- syntax/import/build/hygiene through exact-head CI when available.

**Known risks**

- accepted-unit broadening from a careless common lookup;
- error-shape drift;
- accidental canonical-unit drift;
- stale-base interaction (RISK-004).

**Stage decision:** IN_PROGRESS.

---

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR1038_workreport.md` | 1 | 7 | Living engineering report | No | Current-state protocol |
| `docs/IntegratedLAFEAroadmap.md` | 1 | 1 | Integrated common/stage roadmap | Architecture | Source reconciliation |
| `src/workspace/lafea-stage-analysis-adapter.js` | 4 | 4 | Route + semantic input capability boundary | Yes | Prior exact-head PASS |
| `src/workspace/lafea-guided-workflow.js` | 4 | 4 | Production workflow consumer | Yes | Prior exact-head PASS |
| `scripts/lafea-ui-workflow-truthfulness-check.mjs` | 4 | 4 | Focused stage/workflow regression | Test | Prior exact-head PASS |
| `scripts/lafea-nonbucket-stack-check.mjs` | 4 | 7 planned | Established aggregate; Stage 7 focused check wiring | Test/certification | Stage 7 NOT_RUN |
| `src/core/lafea-common-input/units.js` | 7 planned | 7 planned | Shared unit-to-canonical scale facts | Yes | Stage 7 NOT_RUN |
| `src/core/local-stress/units.js` | 7 planned | 7 planned | LAFEA.1 production consumer | Yes | Stage 7 NOT_RUN |
| `src/core/local-continuum/units.js` | 7 planned | 7 planned | LAFEA.3 production consumer | Yes | Stage 7 NOT_RUN |
| `scripts/lafea-common-input-units-check.mjs` | 7 planned | 7 planned | Focused shared-unit regression | Test | Stage 7 NOT_RUN |

No `.github/workflows/*` change is authorized or planned.

---

## Engineering Invariants

### INV-001 — UI is not solver authority

Must remain true. Stage 7 does not touch UI/solver authorization.

### INV-002 — Calculation success is not release

Must remain true. Release machinery is untouched.

### INV-003 — Mesh custody semantics remain exact

Must remain true. Mesh/custody code is untouched.

### INV-004 — LAFEA.6 stays fail-closed

Must remain true. Stage registry/execution support is untouched.

### INV-005 — Common adapter remains UI-independent

Must remain true. Stage 7 does not change the adapter.

### INV-006 — Common unit registry is not a stage unit contract

The shared registry may contain factors used by multiple stages, but a stage accepts only units requested through its own explicit dimension/key contract. Enforced in the stage-local `canonicalizeUnits` functions. Stage 7 must validate no hidden fallback/default.

---

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| First-slice focused workflow truthfulness | PASS | `d01de620...` | Non-bucket exact-head artifact |
| First-slice bounded non-bucket aggregate | PASS | `d01de620...` | Failure matrix PASS |
| First-slice numerical/solver/meshing/workbench/browser | PASS | `d01de620...` | GitHub Actions |
| Batch 1A focused common-unit regression | NOT_RUN | — | Pending Stage 7 |
| Batch 1A LAFEA.1 foundation regression | NOT_RUN | — | Pending Stage 7 |
| Batch 1A LAFEA.3 numerical regression | NOT_RUN | — | Pending Stage 7 |
| Current-main integration validation | NOT_RUN | — | Blocked until branch reconciliation |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Route family truthfulness | PASS | Prior exact-head checks |
| LAFEA.6 remains unsupported | PASS | Prior exact-head checks |
| Shared unit factors preserve analytical canonicalization | NOT_RUN | Stage 7 pending |
| Shared unit factors preserve FE canonicalization | NOT_RUN | Stage 7 pending |
| No accepted-unit broadening | NOT_RUN | Stage 7 pending |
| No numerical authority change | NOT_RUN | Stage 7 pending existing numerical suites |

### Explicitly Not Validated

- current-main integrated PR head;
- future common material/load/BC identity primitives;
- dependency-aware invalidation;
- geometry-first mapping;
- new 3D physics;
- physical LAFEA repository extraction.

---

## Known / Deferred Work

### Open defects

- **ISS-001:** unrelated LFEA repository-attribution contradiction. Do not fix in this PR without Owner scope change.

### Open risks

- **RISK-004:** branch behind current `main`; closure requires reconciliation and revalidation.

### Deferred improvements

- common material identity/source primitives after unit facts are proven;
- load-case/BC/coordinate identity where same semantics are demonstrated;
- invalidation graph;
- geometry authority;
- meshing/compiler/results/verification/runtime phases from roadmap.

---

## Recommended Forward Sequence

1. Complete and validate Stage 7 Batch 1A.
2. If green, evaluate Batch 1B material/source identity using actual LAFEA.1 and LAFEA.3 contracts; do not force constitutive-property commonality.
3. Implement dependency-aware invalidation before deeper meshing refactoring.
4. Establish LAFEA.3 geometry authority and stable physical regions/probes.
5. Integrate LAFEA.3 meshing/custody lineage.
6. Add deterministic LAFEA.3 solver-model compiler.
7. Extend to LAFEA.4 shell, then LAFEA.5 shell reuse + footprint semantics.
8. Add result comparison / verification center.
9. Reconcile standalone runtime/history/release/dossier and perform final repository extraction only after engineering boundaries stabilize.

---

## Next-Agent Handover

- **Current stopping point:** Stage 7 plan recorded; production code not yet changed for Batch 1A.
- **PR / branch / HEAD:** #1038 / `agent/integrated-lafea-common-stage-roadmap` / `bfbd16221736bc109b779fec395169875e4433ee` before this report update.
- **Last completed stage:** Stage 6.
- **Current active stage:** Stage 7 — Batch 1A common unit-conversion primitive.
- **Start here:** `src/core/local-stress/units.js` and `src/core/local-continuum/units.js`; implement only the shared factor lookup described above.
- **Do not redo:** stage route/input capability work already validated.
- **Do not assume:** branch is current with `main`; RISK-004 is open.
- **Files currently involved:** ledger above.
- **Known failing checks:** ISS-001 cross-product attribution only; Stage 7 tests not yet run.
- **Validation still required:** focused common-unit test, LAFEA.1/.3 existing suites, non-bucket aggregate, exact-head CI, current-main integration before closure.
- **Open QST items:** none currently.
- **Important deferred IMP items:** IMP-002 future plugin/deeper kernel; material/load/BC common primitives after Batch 1A.
- **Highest-risk remaining item:** unit commonization broadening accepted inputs or changing canonical numeric behavior.
- **Exact next recommended action:** create `src/core/lafea-common-input/units.js`, then convert LAFEA.1 and LAFEA.3 unit adapters to explicit shared lookup with unchanged error handling.
- **Required reading:** issue #1025; `docs/IntegratedLAFEAroadmap.md`; `CodingRules.md`; current stage adapter; both existing unit modules.

---

## Process Notes / Lessons Learned

- Current source outranks stale planning text when describing qualified capability.
- A regression script is only useful delivery evidence when an established aggregate executes it.
- Common/stage abstractions should use semantic engineering concepts, not UI labels.
- Commonizing a value table is safer than commonizing stage physics when contracts differ.
- Upstream branch divergence must be recorded before further implementation even when there is no direct file overlap.
