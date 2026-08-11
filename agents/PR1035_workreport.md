# PR1035 — LFEA Standalone Engineering Work Report

## Mission Control

| Field | Current value |
|---|---|
| Mission | Separate LFEA into an independently bootable/testable/releasable application without weakening governed engineering authority. |
| Source | Issue #1024 — LFEA Standalone Application |
| PR | #1035 — DRAFT |
| Branch | `agent/lfea-standalone-s1-1024` |
| Separation merge base | `f8486ee75c39c33483742607b7d18ee42ebcde5d` |
| Current stage | Stage 10 — governed support/code authority composition |
| Last stage | Stage 9 persistence — IMPLEMENTED / PARTIAL validation |
| Current blocker | Exact execution of `node scripts/run-lfea-standalone-check.mjs` remains NOT_RUN: local checkout cannot resolve github.com and CodingRules prohibit adding/modifying workflows without explicit Owner authorization. |
| Current file reconciliation | 56 changed PR paths after Stage 9; 56/56 explained. |
| Exact next action | Extract standalone composition wiring before adding support/code integrations, then compose only existing governed interface/support/B31 authorities. |

> The report cannot embed the SHA of the commit containing itself without becoming self-referential. GitHub branch/PR metadata is authoritative for the report-sync HEAD. Stage-specific code heads are recorded below.

## Handover in 60 Seconds

### Implemented standalone path

`Source → Review → Model → reviewed B-3.3 execution → CURRENT/STALE raw authority → governed B-3.4 recovery → Results → immutable History → semantic Compare → bounded non-authoritative persistence`

### Engineering truths preserved

- Source custody and reviewed execution remain domain authority.
- Raw B-3.3 and recovered B-3.4 quantities remain separate.
- CURRENT/STALE is a relationship to current governed parents, not a mutation of evidence.
- History retains immutable exact-lineage run evidence; selecting a run changes view context only.
- Compare subtracts only semantically compatible quantities and returns `NOT_DIRECTLY_COMPARABLE` otherwise.
- Browser persistence stores only active-view and recent-source metadata. It never stores source XML, authorization, solver execution, recovery, or History engineering evidence.
- Recent-source metadata explicitly says re-import is required before Review/Analysis.
- No new LAFEA runtime coupling has been introduced.

### Remaining roadmap

1. Stage 10 support/code authority composition.
2. Verification / dossier.
3. Full standalone browser golden journey.
4. Physical-LAFEA-absence rehearsal.
5. Physical extraction last.

### Highest-risk unresolved item

Exact standalone aggregate execution on one PR head remains unavailable. All focused standalone checks committed in this PR remain **NOT_RUN**, never PASS by inference.

## Governing Invariants

1. Imported source custody is fail-closed.
2. Reviewed execution is mandatory.
3. UI and persistence state never authorize solve/recovery/publication.
4. Run identity is tied to exact source/model/review/authorization/case/method lineage.
5. Raw, recovered, support-projected, and code-applied results remain distinct authority stages.
6. Historic evidence is immutable.
7. History/Compare selection is view context only.
8. Semantic comparison requires explicit compatibility.
9. Blocked/unavailable values remain null/blank, never false zero.
10. Support Fa/Fl/Fv may only come from governed global interface recovery + declared pipe tangent + explicit vertical/up authority; never frame-local e2/e3 relabelling.
11. B31/code quantities may only come from existing sealed code producers; presentation must not recalculate them.
12. No hidden engineering defaults.
13. Browser persistence is explicitly namespaced and non-authoritative.
14. No new runtime dependency on LAFEA.
15. No `.github/workflows/*` change without explicit Owner authorization.

## Mission Status

| Work item | Status | Evidence |
|---|---|---|
| Independent entry/shell/build | IMPLEMENTED | `lfea.html`, `src/lfea/*`, standalone Vite target |
| Source → Review → Model | IMPLEMENTED | governed InputXML custody/pre-FEA chain |
| Reviewed B-3.3 execution | IMPLEMENTED | existing governed solve gate + production executor |
| CURRENT/STALE raw authority | IMPLEMENTED | `native-execution-authority.js` |
| Governed B-3.4 recovery/Results | IMPLEMENTED / PARTIAL validation | production recovery + Results view |
| Neutral sparse ownership | IMPLEMENTED | `shared-linear-solve/*` |
| LFEA History | IMPLEMENTED / PARTIAL validation | immutable deterministic run records |
| Semantic Compare | IMPLEMENTED / PARTIAL validation | compatibility engine + Compare product view |
| Persistence isolation | IMPLEMENTED / PARTIAL validation | exact LFEA keys; metadata/UI only |
| Support/code authority | IN_PROGRESS | Stage 10 registered below |
| Verification/dossier | DEFERRED | after support/code |
| Standalone E2E | DEFERRED | after dossier |
| Physical absence | DEFERRED | final qualification |
| Physical extraction | DEFERRED | last |
| Full standalone aggregate | BLOCKED / NOT_RUN | no authorized executable checkout path |

## Engineering Item Register

| ID | Type | Status | Summary |
|---|---|---|---|
| ISS-001 | defect | IMPLEMENTED | General B-3.3 solver no longer executable-imports LAFEA-owned sparse runtime; neutral primitives live under `shared-linear-solve`. |
| DEC-001 | decision | ACCEPTED | Native execution remains below `solveInputXmlLinearAnalysis()`. |
| DEC-002 | decision | ACCEPTED | B-3.3 raw and B-3.4 recovery are distinct authorities. |
| DEC-003 | decision | ACCEPTED | CURRENT/STALE is a projection against current governed parents. |
| DEC-004 | decision | ACCEPTED | Production recovery profile is explicit and retained. |
| DEC-005 | decision | ACCEPTED | History is LFEA-owned rather than generic Workspace AnalysisLedger authority. |
| DEC-006 | decision | ACCEPTED | History/Compare selection cannot mutate current engineering authority. |
| DEC-007 | decision | ACCEPTED | Identical History evidence deduplicates deterministically; ambient timestamps do not mint engineering identity. |
| DEC-008 | decision | ACCEPTED | Compare covers only governed B-3.3/B-3.4 quantities currently retained. |
| DEC-009 | decision | ACCEPTED | Local recovered-action comparability includes exact local-axis semantic identity. |
| DEC-010 | decision | ACCEPTED | Method compatibility includes analysis, frame-element, solver, and recovery profile identities. |
| DEC-011 | decision | ACCEPTED | Persistence stores only non-authoritative active-view/recent-source metadata. |
| DEC-012 | decision | ACCEPTED | Recent-source metadata never reconstructs source/pre-flight/run authority; operator must re-import. |
| DEC-013 | decision | ACCEPTED | Stage 10 support actions must reuse `compileLinearPipingInterfaceSet` → `recoverLinearPipingInterfaceLoads` → `createLinearPipingSupportActionsPublication`; direct B-3.4/local-force relabelling is prohibited. |
| DEC-014 | decision | ACCEPTED | Stage 10 B31/code publication must consume existing sealed code records/producers; no presentation-layer code calculation. |
| DEC-015 | decision | ACCEPTED | Because `src/lfea/bootstrap.js` reached 299 physical lines at Stage 9, Stage 10 must extract composition wiring before adding new runtime integrations. |
| RISK-001 | risk | BLOCKED | Standalone focused/aggregate checks remain NOT_RUN. |
| RISK-002 | risk | OPEN | Final synchronization with current `main` and exact requalification still required. |
| RISK-003 | risk | ACCEPTED | Narrow LFEA workflows reject this broad PR before intended payload due containment/candidate-chain assumptions. |
| RISK-004 | risk | ACCEPTED | BM3 workflow is incomplete because expected BM1 fixture is absent. |
| RISK-005 | risk | ACCEPTED | Owner instructed roadmap continuation while standalone executable validation is blocked; NOT_RUN must remain NOT_RUN. |
| DEBT-001 | debt | ACTIVE | `bootstrapLfeaStandalone` is an intentionally orchestration-heavy composition root and exceeds the normal function-length target; its module is now exactly 299 physical lines. Stage 10 must extract composition before any further growth. |

## Stage Log

### Stages 1–6 — standalone boundary through Results / validation-path reconciliation

Implemented independent bootstrap/build, governed Source→Review→Model, reviewed native B-3.3 execution, current/stale authority, governed B-3.4 recovery, Results, neutral sparse ownership, dependency guards, and aggregate qualification scripts. Exact standalone execution remains NOT_RUN. **Decision: implemented with partial validation.**

### Stage 7 — LFEA-owned History

Implemented `lfea-native-run-history/v1` / `lfea-native-run-record/v1`, exact lineage binding, deterministic run identity/deduplication, CURRENT/HISTORIC/STALE projection, read-only History UI, and view-only selection. Focused History check is aggregated but NOT_RUN. **Decision: PARTIAL.**

### Stage 8 — semantic Compare

Implemented semantic quantity extraction for governed B-3.3 displacement/reaction and B-3.4 local/global element-end actions. Compatibility checks quantity, dimension, unit, basis, sign convention, entity/end, physical-case hash, result authority, and method/profile identity. Incompatible/missing/unavailable values produce explicit reasons and null delta. Compare is a production navigation surface and cannot mutate current authority. Focused Compare check is aggregated but NOT_RUN. **Decision: PARTIAL.**

### Stage 9 — standalone persistence isolation

**Implementation**

- Added `src/lfea/persistence.js`.
- Exact keys:
  - `lfea.ui.activeView.v1`
  - `lfea.source.recentMetadata.v1`
- Strict versioned JSON envelope `lfea-persistence-record/v1`.
- Persisted active-view value is syntactically bounded and is restored only if it names an actually available standalone view.
- Recent-source metadata has an exact three-field shape: `fileName`, `contentSha256`, `sourceUnit`.
- Source XML, pre-flight/authorization, execution, recovery, History evidence, solver/recovery profiles, and code/support data are not persisted.
- Corrupt/unrecognized stored records fail closed to no preference and diagnostics.
- Storage unavailable/read/write denied does not block standalone operation.
- Direct browser `localStorage` access is encapsulated in `persistence.js`; other standalone modules do not access local/session storage directly.
- Bootstrap restores only the active-view preference. Engineering authorities initialize independently from empty/current domain state.
- Recent source metadata is shown only as convenience context with explicit **re-import required** wording.
- Metadata persistence is best-effort at the composition boundary so invalid/unavailable UI persistence cannot block governed Source rendering.
- Added `scripts/lfea-standalone-persistence-check.mjs` and aggregated it.

**Focused persistence check covers**

1. empty storage creates no authority;
2. exact-key UI/recent metadata round-trip;
3. serialized values contain no source/pre-flight/execution/recovery evidence;
4. unrelated and `lafea.*` keys do not affect LFEA projection;
5. malformed JSON fails closed;
6. extra engineering-looking metadata fields are rejected;
7. invalid caller values fail before write;
8. unavailable/denied storage is non-blocking;
9. source guard keeps direct browser-storage access inside the adapter.

**CodingRules / size audit**

- `src/lfea/persistence.js`: 129 physical lines.
- `scripts/lfea-standalone-persistence-check.mjs`: 120 physical lines.
- `src/lfea/bootstrap.js`: exactly 299 physical lines after the non-blocking metadata correction.
- No `.github/workflows/*` change.
- Production persistence abstraction is consumed by standalone bootstrap in the same PR.

**Changed-file reconciliation**

New Stage-9 paths:

- `src/lfea/persistence.js`
- `scripts/lfea-standalone-persistence-check.mjs`

Existing intentional updates: `src/lfea/bootstrap.js`, `src/lfea/standalone-layout.js`, aggregate checker, and this report. GitHub reports **56 changed PR paths; 56/56 explained; no unexplained path.**

**Exact-head validation — Stage-9 code head `7c02c0789401469236477fb6619cd77df72ad27a`**

| Check | Status | Attribution |
|---|---|---|
| `main-gate` | PASS | exact-head repository gate |
| `LAFEA hybrid browser validation` | PASS | separate LAFEA regression |
| `non-fea-input-check-load-calc` | PASS | exact-head advisory |
| `3D Edit SJSON Interaction Authority` | PASS | broad regression |
| `3D Edit Sjson Render Authority` | PASS | broad browser/render regression |
| `lfea-linear-core-exact-head` | FAIL | broad PR rejected by narrow changed-path containment before intended numerical payload |
| `LFEA WP-PF1 exact-head qualification` | FAIL | historical candidate-chain guard before intended product payload |
| `M028 M029 BM3 Consolidated Qualification` | FAIL | documented missing BM1 fixture; later relevant payload skipped |
| `scripts/lfea-standalone-persistence-check.mjs` | NOT_RUN | no executable checkout path |
| standalone Results/History/Compare focused checks | NOT_RUN | no executable checkout path |
| `node scripts/run-lfea-standalone-check.mjs` | NOT_RUN | local DNS checkout failure; no authorized generic CI runner |

**Stage decision: IMPLEMENTED / PARTIAL.** Persistence behavior is source/diff reviewed and broad exact-head repository gates are green. Focused standalone execution remains NOT_RUN.

### Stage 10 — governed support/code authority composition

**Pre-stage truth**

Existing repository contracts already own the critical engineering transformations:

1. `compileLinearPipingInterfaceSet(...)` validates exact B-2.5 compilation, support attachment/restraint authority, interface basis, node/source ancestry, DOF ownership, support binding, sign convention, and interface profile.
2. `recoverLinearPipingInterfaceLoads(...)` consumes the governed interface set + validated linear-piping analysis result + exact physical load case and derives global/local interface loads from solver reactions with retained sign/formula/evidence identity.
3. `createLinearPipingSupportActionsPublication(...)` consumes governed interface recovery plus explicit `upGlobal` and `parallelTolerance`; it derives Fa/Fl/Fv only via the existing engineering support-action triad. It never assumes +Z and never relabels frame-local e2/e3.
4. Existing B31 presentation/export code retains sealed `codeProfileId`, code-profile hash, edition-dataset hash, and ordered physical source-case provenance. Stage 10 must locate and consume the actual upstream B31/code producer rather than treating presentation as calculation authority.

**Critical architectural gap to resolve before support publication**

The standalone path currently retains the lower-level B-3.3 raw execution batch and B-3.4 result recovery. `recoverLinearPipingInterfaceLoads()` expects a governed `linear-piping-analysis-result` plus a compiled interface set. Stage 10 must determine whether those exact parents and interface definitions/profiles already exist in retained pre-FEA/model authority. It must not fabricate them from UI state, B-3.4 local forces, or guessed support directions.

**Stage 10 is deliberately split into sub-stages**

#### Stage 10A — composition-root extraction and authority inventory

Expected work:

- move standalone lifecycle/view-controller orchestration out of `bootstrap.js` into bounded LFEA-owned composition/runtime helpers;
- keep public bootstrap API stable;
- re-audit module closure and CodingRules sizes;
- map exact retained parents needed for interface support and B31 execution;
- no engineering calculation change.

Acceptance:

- `bootstrap.js` comfortably below 300 lines;
- no new authority, solver, recovery or result calculation introduced merely by refactor;
- standalone dependency guard remains strict.

#### Stage 10B — support interface authority composition

Proceed only if exact governed parents exist.

Required chain:

`retained mechanical compilation + governed support attachment/restraint + explicit interface definitions/profile → compileLinearPipingInterfaceSet → governed analysis result + physical load case → recoverLinearPipingInterfaceLoads`

Acceptance:

- no UI-generated interface authority;
- exact model/stiffness/case identities agree;
- unsupported/nonlinear/ambiguous support states remain blocked;
- global recovered force/sign convention retained.

If exact interface definitions/profile or support authorities are absent, Stage 10B must stop BLOCKED and register the missing upstream authority. Do not infer it.

#### Stage 10C — support-action publication

Required chain:

`governed interface recovery → createLinearPipingSupportActionsPublication({ explicit upGlobal, explicit parallelTolerance })`

Acceptance:

- Fa/Fl/Fv trace to interface `forceGlobal`, pipe tangent and explicit vertical/up authority;
- vertical-axis degeneracy retains Fa but Fl/Fv remain null with explicit blocked status/reason;
- no local e2/e3 relabelling;
- support publication currentness tied to exact source/model/result/execution/case/recovery/triad identities.

Stage 10 must not invent default `upGlobal` or `parallelTolerance`; those values require an existing governed product/profile authority or explicit operator/project input.

#### Stage 10D — B31/code authority composition

Before coding, identify the actual existing upstream code-stress producer and its complete required input authorities. Compose that producer; do not reimplement equations in LFEA UI/application code.

Acceptance:

- code stress remains separate from raw/recovered actions;
- exact code profile/edition/section/material/factor inputs retained;
- ordered physical source-case IDs/hashes retained;
- presentation/UI consumes sealed code records only;
- no continuum/raw stress substitution;
- unavailable code authority remains blocked/null.

**Expected files — Stage 10A only initially**

- bounded standalone runtime/composition helper(s) under `src/lfea/`;
- reduced `src/lfea/bootstrap.js`;
- focused source/architecture check if needed;
- aggregate checker only if a new focused check is added;
- this report.

Support/B31 files will be registered after the authority inventory identifies the exact existing producers/parents. No speculative module list is authorized.

**Stage 10 validation plan**

- composition refactor behavior/source invariants;
- exact parent/authority trace for support and code chains;
- existing support-action triad/publication qualification aggregated rather than copied where possible;
- new standalone integration checks only for the new composition seams;
- no workflow changes;
- exact standalone aggregate remains NOT_RUN unless execution access becomes available.

**Stage 10 status: IN_PROGRESS — Stage 10A/authority inventory only.**

## Current Changed-File Ledger

GitHub reports **56 changed paths after Stage 9; 56/56 accounted**. Any Stage-10 path must be registered before stage closure. Unexplained files block closure.

## Validation Ledger

### PASS on Stage-9 exact head `7c02c0789401469236477fb6619cd77df72ad27a`

- `main-gate`
- `LAFEA hybrid browser validation`
- `non-fea-input-check-load-calc`
- `3D Edit SJSON Interaction Authority`
- `3D Edit Sjson Render Authority`

### Known non-product reds

- narrow linear-core changed-path containment;
- WP-PF1 historic candidate-chain guard;
- BM3 missing BM1 fixture.

### Still NOT_RUN

- standalone Results focused check;
- standalone History focused check;
- standalone Compare focused check;
- standalone Persistence focused check;
- full standalone aggregate;
- complete standalone browser journey;
- physical LAFEA-absence qualification.

## Forward Sequence

1. Stage 10A composition extraction + exact support/B31 authority inventory.
2. Stage 10B/C support interface recovery and support-action publication only if exact parents/inputs exist.
3. Stage 10D B31/code producer composition only after actual producer/input inventory.
4. Verification / dossier with scope-specific qualification and fail-closed stale issue/export.
5. Full standalone browser E2E including mutation → stale history → rerun → Compare and negative journeys.
6. Physical-LAFEA-absence rehearsal: clean standalone build/check/E2E with LAFEA unavailable.
7. Physical extraction last, followed by clean install and exact qualification.

## Handover Appendix

### Current stopping point

Persistence is implemented; Stage 10A is the active boundary. Do not add support/code calculations directly to the 299-line bootstrap.

### Start here

- `src/lfea/bootstrap.js`
- `src/lfea/native-execution-authority.js`
- `src/lfea/native-results-authority.js`
- `src/lfea/native-run-history.js`
- `src/lfea/native-run-comparison.js`
- `src/core/linear-piping-interface/interface-set.js`
- `src/core/linear-piping-interface/recovery.js`
- `src/workspace/linear-piping-support-actions-publication.js`
- actual upstream B31/code producer modules once identified

### Do not redo

- source/pre-FEA authority;
- governed B-3.3 solve gate;
- B-3.4 recovery;
- neutral sparse extraction;
- History lineage/currentness;
- semantic Compare;
- persistence isolation.

### Do not weaken

- exact source/review authorization;
- CURRENT-only result authority;
- support triad global-force/explicit-up chain;
- null-on-degenerate support projection;
- B31 provenance separation;
- LAFEA dependency guards.

### Do not assume

- B-3.4 element-end actions are interface support actions;
- support direction can be inferred from local e2/e3;
- `upGlobal=+Z` unless a governed project/profile authority says so;
- a default parallel tolerance is acceptable;
- presentation rows are a code-calculation authority;
- standalone focused checks have executed.

### Exact next action

Extract the standalone runtime/composition wiring below the CodingRules module ceiling, then inventory the exact retained support/interface/B31 parent records before implementing Stage 10B/C/D.
