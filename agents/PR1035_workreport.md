# PR1035 — LFEA Standalone Engineering Work Report

## PR Mission Control

| Field | Current value |
|---|---|
| Mission | Separate LFEA into an independently bootable/testable/releasable application while preserving governed engineering authority from source through raw execution and recovered Results. |
| Source task / issue | Advanced_Analysis #1024 — LFEA Standalone Application — separation, product hardening, and next-level roadmap |
| PR number | 1035 |
| Branch | `agent/lfea-standalone-s1-1024` |
| Base | PR targets `main` at `a587867963cc9199caca6e7adfa03af95a316aa2`; recorded separation merge base `f8486ee75c39c33483742607b7d18ee42ebcde5d` |
| PR status | DRAFT |
| Current stage | Stage 6 — exact-head standalone validation / base reconciliation |
| Last completed stage | Stage 3 — changed-file verification. Stage 4 and Stage 5 are PARTIAL because their required standalone executable evidence remains open. |
| Engineering status | Standalone Source→Review→Model→reviewed B-3.3 execution→CURRENT/STALE raw authority→governed B-3.4 recovered Results is IMPLEMENTED. Support/B31/History/Compare remain DEFERRED. |
| Validation status | `main-gate`: PASS at Stage-5 code head `3cdbbaf0f679f41b08a5439d7c32a077b114c46c`. Stage-5 focused Results check and full standalone aggregate: NOT_RUN. Narrow legacy LFEA workflows fail before relevant product tests. |
| Current blocker | No exact-head execution of `scripts/lfea-standalone-native-results-check.mjs` or `node scripts/run-lfea-standalone-check.mjs`; PR therefore remains draft. |
| Exact next action | Execute the standalone aggregate on an exact checkout, record Stage-5 focused results, then reconcile current `main` and rerun relevant qualification before ready-for-review. |

> The report cannot embed the SHA of the commit containing itself without becoming self-referential. The authoritative current HEAD is the GitHub PR/branch ref.

## Handover in 60 Seconds

**What is now true**

- LFEA has an independent entry/build path outside the combined workspace bootstrap.
- Native InputXML Source → Review → Model state is projected from governed sealed records.
- Analysis has an operator-visible **Run native analysis** action; its enabled state is only a UI projection and the domain gate revalidates authorization on click.
- `runNativeAnalysis()` reaches raw production solve only through `solveInputXmlLinearAnalysis()`.
- Raw execution is retained as immutable B-3.3 evidence with separate `CURRENT` / `STALE` application authority.
- A CURRENT qualified/conditional raw execution is automatically passed through governed B-3.4 recovery; successful execution opens Results.
- Results retains a named production recovery profile and shows the profile source, stations/span, consistency tolerance and profile hash.
- Results displays raw B-3.3 displacement/reactions separately from B-3.4 recovered local/global element actions, with canonical units and authority labels.
- When raw/source/model authority changes, recovered evidence is retained but marked STALE; stale engineering values are intentionally hidden from the current Results surface.
- The general B-3.3 solver uses neutral `shared-linear-solve` primitives rather than executable LAFEA-owned sparse runtime modules.
- GitHub changed-file reconciliation after Stage 5 is **45/45 accounted; no unexplained paths**.

**What is being worked on**

- Exact-head standalone execution evidence and then base reconciliation.

**What remains unfinished**

- `scripts/lfea-standalone-native-results-check.mjs`: NOT_RUN.
- `node scripts/run-lfea-standalone-check.mjs`: NOT_RUN.
- Support-action publication, B31/code application, History/Compare, persistence, dossier/export hardening, final extraction.

**What must not be assumed**

- A narrow workflow failure before relevant test steps is a solver/Results failure.
- Raw B-3.3 values, recovered B-3.4 local/global actions, support actions and code quantities are interchangeable.
- A retained STALE recovery is current model authority.
- Component code-point resultants exist in this stage: current native InputXML execution is recovered as governed bare frame elements with `pipingComponents: []`.

**Highest-risk remaining item**

- Exact-head executable proof of Source→Review→Run→B-3.4 Results on the standalone aggregate.

**Exact next action**

- Run the standalone aggregate at the PR head; stop and register a defect before production edits if the new Results check fails.

## Mission and Engineering Intent

### Mission

Deliver an LFEA-owned product boundary in which source custody, reviewed model preparation, raw execution and recovery each retain explicit identities and separate authority semantics.

### Engineering consequence

The UI must not collapse different physical meanings into a generic “result”. Raw joint displacement/reaction, recovered element-end actions, future support-action projections and future code-applied values remain distinct stages with different bases, units and comparison rules.

### Stage 5 delivered scope

- CURRENT qualified/conditional raw execution is required before recovery.
- Raw batch preparation/model/stiffness/load/hash custody is revalidated.
- Exact retained physical load cases are located by governed case identity.
- B-3.1 frame-element evidence is reconstructed through the existing governed execution-element adapter and its ledger is cross-checked against the raw solve ledger.
- Existing `compileResultRecovery()` is the only engineering recovery implementation used.
- One explicit production recovery profile is retained in the recovery batch:
  - 5 force-field stations/span;
  - `1e-6` code-point consistency tolerance;
  - local and global actions retained;
  - source `LFEA-B3.4-QUALIFIED-RECOVERY-BASELINE-V1`.
- Results currentness is bound to exact raw execution/preparation/model/load identity.
- Current Results show canonical units from `LINEAR_FEA_UNITS` and explicit authority labels.
- Stale Results retain identity evidence but hide current engineering values.

### Explicit non-goals

- support-action Fa/Fl/Fv publication;
- B31/code stress, allowable, utilization, code combinations or code envelopes;
- History or semantic comparison;
- persistence/dossier/export;
- `.github/workflows/*` edits;
- solver/recovery equation or tolerance tuning for separation convenience.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Standalone entrypoint/shell/build | P0 | IMPLEMENTED | prior | standalone entry/Vite/build guards |
| Governed Source→Review→Model | P0 | IMPLEMENTED | prior | native InputXML custody/pre-FEA chain |
| Reviewed raw B-3.3 execution | P0 | IMPLEMENTED | prior | governed solve + production executor |
| CURRENT/STALE raw execution | P0 | IMPLEMENTED | prior | `native-execution-authority.js` |
| Neutral sparse runtime ownership | P0 | IMPLEMENTED | prior | `shared-linear-solve/*` |
| Governed B-3.4 recovery/Results | P0 | IMPLEMENTED | Stage 5 | recovery profile/service + Results authority/view |
| Operator Run→Results path | P0 | IMPLEMENTED | Stage 5 | Analysis run control → domain gate → recovery → Results |
| Stage-5 changed-file reconciliation | P0 | VALIDATED | Stage 5 | GitHub list 45/45 accounted |
| Exact standalone aggregate | P0 | BLOCKED | Stage 4/6 | NOT_RUN |
| Stage-5 focused production Results check | P0 | BLOCKED | Stage 5/6 | committed but NOT_RUN |
| Support actions / B31 / code results | P1 | DEFERRED | later | intentionally excluded |
| History / Compare | P1 | DEFERRED | later | intentionally excluded |
| Persistence / dossier / extraction | P1 | DEFERRED | later | intentionally excluded |

## Engineering Item Register

| ID | Type | Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| ISS-001 | defect | P0 | IMPLEMENTED | General B-3.3 solver depended on LAFEA-owned sparse runtime primitives. | Yes |
| DEC-001 | decision | P0 | ACCEPTED | Native runtime is reachable only below `solveInputXmlLinearAnalysis()`. | Yes |
| DEC-002 | decision | P0 | ACCEPTED | Raw execution is a distinct authority stage, not recovered/code authority. | Yes |
| DEC-003 | decision | P0 | ACCEPTED | CURRENT/STALE application state is separate from immutable engineering evidence. | Yes |
| DEC-004 | decision | P0 | ACCEPTED | Reusable sparse primitives are neutral production dependencies; existing LAFEA package remains for LAFEA consumers. | Yes |
| DEC-005 | decision | P0 | ACCEPTED | Production recovery explicitly promotes the B-3.4-qualified baseline: 5 stations/span, `1e-6` consistency tolerance, local+global actions retained, named traceable source, no hidden fallback. | Yes |
| DEC-006 | decision | P0 | ACCEPTED | Recovery can be current only when its exact raw execution is CURRENT and qualified/conditional. | Yes |
| DEC-007 | decision | P0 | ACCEPTED | Results expose raw B-3.3 and recovered B-3.4 values separately, with basis/units/authority labels; no support/B31 derivation. | Yes |
| DEC-008 | decision | P1 | ACCEPTED | Current native recovery passes `pipingComponents: []` because current native execution compiles governed frame elements rather than B-3.2 component objects; Stage 5 therefore claims element actions/force fields only, not component code-point resultants. | Yes |
| RISK-001 | risk | P0 | BLOCKED | Full standalone aggregate remains NOT_RUN on exact PR head. | Yes |
| RISK-002 | risk | P1 | INVESTIGATING | PR must be reconciled with `main` before ready-for-review. | Yes |
| RISK-003 | risk | P1 | ACCEPTED | Existing narrow exact-head LFEA workflows are not broad-PR qualification oracles: one has a fixed path allowlist, another a fixed historical two-commit chain. Workflows remain unchanged. | Yes |
| RISK-004 | risk | P1 | ACCEPTED | M028/M029 BM3 workflow at `3cdbbaf…` checked out and syntax-checked successfully, then failed because `benchmarks/LFEA/BM1/BM1_InputXML.xml` was absent; later solver/full-core steps were skipped. This is incomplete CI evidence, not a Stage-5 numerical verdict. | Yes |
| IMP-001 | improvement | P0 | IMPLEMENTED | Governed Results/recovery authority consuming only CURRENT qualified raw execution. | Yes |
| IMP-002 | improvement | P1 | DEFERRED | Semantic History/Compare after quantity/result authority contracts are established. | No |
| IMP-003 | improvement | P1 | DEFERRED | Introduce governed B-3.2 component recovery/code-point publication only when native model compilation retains real component authority; do not synthesize components for UI completeness. | No |
| QST-001 | question | P1 | INVESTIGATING | Safest synchronization with `main` before ready-for-review. | Yes |

## Engineering Decisions and Invariants

| Invariant | Enforcement | Validation |
|---|---|---|
| Reviewed execution mandatory | governed solve gate | static PASS; targeted execution check committed |
| UI Run enablement is not authority | button projects `readyToRun`; callback enters same governed domain gate | source guard committed, NOT_RUN |
| STALE raw execution cannot act current | native execution authority | static PASS; targeted check committed |
| Recovery requires exact current raw execution | native Results authority | source review PASS; Stage-5 check NOT_RUN |
| Recovery cites exact model/stiffness/load/execution | production recovery + B-3.4 validator | source review PASS; Stage-5 check NOT_RUN |
| Raw vs recovered remain distinct | Results tables include authority/basis/unit identity | source review PASS; Stage-5 check NOT_RUN |
| No support/B31 derivation in Results | recovery/view source guards | committed, NOT_RUN |
| No hidden recovery defaults | named production profile retained and visible | source review PASS; Stage-5 check NOT_RUN |
| Stale recovery values are not current UI values | Results view hides stale engineering tables | source review PASS; Stage-5 check NOT_RUN |
| No LAFEA runtime dependency in standalone solver | neutral sparse leaf + dependency guard | implemented; aggregate NOT_RUN |

## Stage Roadmap and Execution Log

### Stage 1 — report reconstruction

Production work predated receipt of the referenced CodingRules; the deviation was recorded rather than backdated. **Decision: COMPLETE.**

### Stage 2 — PR allocation / report synchronization

Draft PR #1035 and numbered living report established. **Decision: COMPLETE.**

### Stage 3 — changed-file verification

Initial PR set reconciled 39/39. **Decision: COMPLETE.**

### Stage 4 — exact-head qualification

**Decision: PARTIAL.** At `818c3df…`, `main-gate` passed. The narrow LFEA core workflow rejected `.gitignore` at changed-path containment before numerical tests, and WP-PF1 rejected the broad PR because it requires a fixed historic candidate chain before product checks. Full standalone aggregate remains NOT_RUN. No workflow edits were made.

### Stage 5 — governed Results authority

**Implementation performed**

- Added explicit production recovery profile.
- Added production InputXML recovery service below exact raw/preparation/element-ledger custody checks.
- Added CURRENT/STALE native Results authority.
- Activated Results navigation and authority-honest Results surface.
- Added canonical FEA units and separate raw/recovered authority labels.
- Added operator-visible Analysis Run action; domain authority remains in the existing execution gate.
- Successful run automatically performs governed B-3.4 recovery and opens Results.
- Added focused production Results qualification and included it in standalone aggregate.
- Added stale/tamper/source guards and no-support/no-B31 assertions.

**Actual behavior / edge cases**

- No current raw execution → recovery fails closed.
- Raw semantic/element custody tamper → recovery fails closed.
- Source/model change → raw and Results become STALE while retained evidence remains immutable.
- Stale Results do not display engineering values as current.
- Recovery error does not fabricate Results; error propagates and the application refreshes authority state.
- Current native Stage 5 has no B-3.2 `pipingComponents`; therefore no component code-point resultants are claimed.

**Validation performed**

- Static/source authority review: PASS.
- GitHub changed-file reconciliation: PASS, 45/45 paths accounted.
- `main-gate` at code head `3cdbbaf0f679f41b08a5439d7c32a077b114c46c`: PASS.
- LAFEA hybrid browser validation at same head: PASS (separate LAFEA regression, not LFEA standalone proof).
- `non-fea-input-check-load-calc` at same head: PASS.
- M028/M029 BM3 workflow: FAIL because required BM1 benchmark file was absent after exact checkout; relevant later test steps skipped.
- narrow LFEA exact-head workflows: FAIL before relevant product tests for the previously recorded scope/custody reasons.
- `scripts/lfea-standalone-native-results-check.mjs`: NOT_RUN.
- `node scripts/run-lfea-standalone-check.mjs`: NOT_RUN.

**New findings**

- RISK-004 — benchmark-dependent workflow cannot currently provide full-core evidence because expected BM1 benchmark input is absent.
- DEC-008 / IMP-003 — do not invent B-3.2 component authority merely to populate code-point Results.

**Stage decision: PARTIAL.** Production capability is IMPLEMENTED and operator-visible; required focused/aggregate executable validation remains NOT_RUN.

### Stage 6 — exact-head standalone validation / base reconciliation

**Objective:** execute focused Results and full standalone qualification at one exact head; register any failure before code changes; then reconcile `main` and rerun relevant checks.

## Changed-File Ledger

Current GitHub PR changed-file count: **45**. Reconciliation: **45/45 accounted; no unexplained path**.

| File | Purpose | Engineering-sensitive? |
|---|---|---|
| `.gitignore` | standalone build output hygiene | No |
| `agents/PR1035_workreport.md` | living mission/validation/handover | No |
| `lfea.html` | standalone application entry document | No |
| `vite.lfea.config.js` | standalone Vite build | No |
| `scripts/fixtures/lfea-standalone-forbidden-import.js` | deliberate architecture-negative fixture | Yes |
| `scripts/lfea-linear-solver-neutral-dependency-check.mjs` | forbid LAFEA sparse runtime dependency | Yes |
| `scripts/lfea-sparse-extraction-equivalence-check.mjs` | old/neutral sparse numerical equivalence | Yes |
| `scripts/lfea-standalone-boundary-check.mjs` | standalone dependency closure guard | Yes |
| `scripts/lfea-standalone-boundary-self-test.mjs` | prove boundary guard catches violation | Yes |
| `scripts/lfea-standalone-build-artifact-check.mjs` | built-artifact coupling guard | Yes |
| `scripts/lfea-standalone-governed-journey-check.mjs` | Source/Review/Model/Analysis authority projection | Yes |
| `scripts/lfea-standalone-native-execution-check.mjs` | raw authorization/current-stale authority | Yes |
| `scripts/lfea-standalone-native-production-solve-check.mjs` | real governed raw solve | Yes |
| `scripts/lfea-standalone-native-results-check.mjs` | real raw→B-3.4 Results, stale/tamper/authority guards | Yes |
| `scripts/run-lfea-standalone-check.mjs` | aggregate standalone qualification | Yes |
| `src/core/linear-fea-solver/assembly.js` | neutral sparse assembly dependency | Yes |
| `src/core/linear-fea-solver/factorization.js` | neutral sparse factorization dependencies | Yes |
| `src/core/linear-fea-solver/qualification.js` | neutral sparse multiply dependency | Yes |
| `src/core/linear-fea-solver/solve.js` | neutral sparse solve dependencies | Yes |
| `src/core/linear-piping-analysis-consumer/inputxml-linear-execution-elements.js` | load-aware governed frame-element evidence | Yes |
| `src/core/linear-piping-analysis-consumer/inputxml-linear-production-executor.js` | governed raw B-3.3 executor | Yes |
| `src/core/linear-piping-analysis-consumer/inputxml-linear-production-recovery.js` | governed B-3.4 recovery batch | Yes |
| `src/core/linear-piping-analysis-consumer/inputxml-linear-recovery-profile.js` | explicit production recovery policy | Yes |
| `src/core/shared-linear-solve/bc-elimination.js` | neutral sparse primitive | Yes |
| `src/core/shared-linear-solve/condition-estimate.js` | neutral sparse primitive | Yes |
| `src/core/shared-linear-solve/diagonal-scaling.js` | neutral sparse primitive | Yes |
| `src/core/shared-linear-solve/errors.js` | neutral sparse failure/evidence contract | Yes |
| `src/core/shared-linear-solve/sparse-cholesky.js` | neutral sparse primitive | Yes |
| `src/core/shared-linear-solve/sparse-ldlt.js` | neutral sparse primitive | Yes |
| `src/core/shared-linear-solve/sparse-matrix.js` | neutral sparse primitive | Yes |
| `src/lfea/bootstrap.js` | standalone composition, Run→recovery→Results | Yes |
| `src/lfea/governed-journey-projection.js` | governed application projection | Yes |
| `src/lfea/governed-journey-view.js` | Analysis authority + Run UI projection | Yes |
| `src/lfea/inputxml-source-controller.js` | source/review workflow ownership | Yes |
| `src/lfea/main.js` | standalone entry + Results styles | No |
| `src/lfea/native-execution-authority.js` | CURRENT/STALE raw authority | Yes |
| `src/lfea/native-results-authority.js` | CURRENT/STALE recovery authority | Yes |
| `src/lfea/native-results-view.js` | raw/recovered basis/unit/authority presentation | Yes |
| `src/lfea/native-results.css` | Results presentation | No |
| `src/lfea/standalone-layout.js` | LFEA navigation; Results activated | No |
| `src/lfea/standalone.css` | standalone presentation | No |
| `src/workspace/lfea-mock-data.js` | isolated LFEA mock-data leaf | No |
| `src/workspace/lfea-workbench-controller.js` | verification workbench mock dependency | Yes |
| `src/workspace/linear-piping-inputxml-intake.js` | narrow source custody imports | Yes |
| `src/workspace/linear-piping-inputxml-prefea.js` | narrow pre-FEA custody imports | Yes |

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last evidence |
|---|---|---|
| PR changed-file reconciliation | PASS | 45/45 paths after Stage 5 |
| `main-gate` | PASS | `3cdbbaf0f679f41b08a5439d7c32a077b114c46c` |
| LAFEA hybrid browser validation | PASS | same head; separate LAFEA regression |
| `non-fea-input-check-load-calc` | PASS | same head |
| `M028 M029 BM3 Consolidated Qualification` | FAIL | same head; missing `benchmarks/LFEA/BM1/BM1_InputXML.xml`; later checks skipped |
| `lfea-linear-core-exact-head` | FAIL | broad PR rejected by narrow changed-path containment before numerical tests |
| `LFEA WP-PF1 exact-head qualification` | FAIL | broad PR rejected by fixed historical candidate-chain assertion before product checks |
| `scripts/lfea-standalone-native-results-check.mjs` | NOT_RUN | committed, no workflow execution |
| `node scripts/run-lfea-standalone-check.mjs` | NOT_RUN | no exact-head aggregate result |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| reviewed authorization mandatory | PASS (static/contract) | governed solve gate |
| raw current/stale boundary | PASS (static/contract) | execution authority |
| recovery uses existing B-3.4 implementation | PASS (static) | production recovery calls `compileResultRecovery()` |
| recovery exact lineage/custody checks | PASS (static) | raw hash, preparation/model/load/profile/ledger checks |
| explicit production recovery profile | PASS (static) | profile object retained and surfaced |
| raw/recovered basis + canonical units visible | PASS (static) | Results view + `LINEAR_FEA_UNITS` |
| stale Results values hidden from current surface | PASS (static) | Results view currentness branch |
| current-only production recovery | NOT_RUN | focused check committed |
| raw tamper refusal | NOT_RUN | focused check committed |
| real native raw→B-3.4 Results | NOT_RUN | focused check committed |
| standalone build/dependency aggregate | NOT_RUN | aggregate committed |

### Explicitly Not Validated

- exact-head full standalone aggregate;
- focused Stage-5 production Results script;
- latest-main integration after Stage 5;
- B-3.2 component code-point recovery in native standalone flow;
- support-action/B31/code result authority;
- History/Compare/persistence/dossier/extraction.

## Known / Deferred Work and Forward Sequence

1. Execute Stage-5 focused check and full standalone aggregate at one exact head.
2. If any test fails, register ISS/RISK and fix without weakening authority guards.
3. Reconcile current `main` and rerun relevant exact-head checks.
4. Add support-action publication only from governed global-force/recovery/triad authority; preserve blocked degeneracy as null.
5. Add code-applied/B31 authority separately from raw/recovered presentation.
6. Implement immutable LFEA History and semantic Compare only after quantity/basis/unit/case/authority contracts are explicit.
7. Isolate persistence, dossier/export and build identity.
8. Prove standalone build with LAFEA physically unavailable; extract repository last.

## Next-Agent Handover

**Current stopping point**  
Stage 5 production code is implemented. The PR is intentionally still draft because Stage-5 focused and aggregate standalone execution are NOT_RUN.

**PR / branch**  
PR #1035 / `agent/lfea-standalone-s1-1024`.

**Last completed stage**  
Stage 3. Stage 4 and Stage 5 are PARTIAL because executable closure evidence remains open.

**Current active stage**  
Stage 6 — exact-head standalone validation / base reconciliation.

**Start here**  
Run `node scripts/run-lfea-standalone-check.mjs`; it now includes `scripts/lfea-standalone-native-results-check.mjs`.

**Do not redo**

- governed source/pre-FEA/run gate;
- raw current/stale authority;
- neutral sparse extraction;
- production B-3.4 recovery service;
- native Results current/stale authority.

**Do not assume**

- existing narrow workflow failures are product failures;
- Stage-5 focused check has run;
- raw/recovered/support/code quantities are interchangeable;
- native B-3.2 component authority exists where current flow only has frame-element evidence.

**Known failing checks**

- narrow LFEA core/WP-PF1 workflows fail before relevant tests for recorded scope/custody reasons;
- BM3 consolidated workflow currently fails because the BM1 benchmark InputXML file is missing in checkout.

**Validation still required**

- Stage-5 focused Results check;
- full standalone aggregate;
- base reconciliation and repeat qualification.

**Open QST**  
QST-001 — safest base synchronization before ready-for-review.

**Important deferred items**  
IMP-002 History/Compare; IMP-003 component code-point authority; support/B31/persistence/dossier/extraction.

**Highest-risk remaining item**  
Exact-head standalone Source→Review→Run→Recovery/Results qualification.

**Exact next recommended action**  
Execute the standalone aggregate at exact PR head. Do not add History/Compare before this stage has closure evidence.

**Required reading**

- Issue #1024.
- Common CodingRules at `43eccc27967ecec7d67513c08255398b496be5ce`.
- this report.
- `src/core/linear-fea-result-recovery/README.md`.
- `src/core/linear-piping-analysis-consumer/inputxml-linear-production-recovery.js`.
- `src/lfea/native-results-authority.js`.
- `src/lfea/native-results-view.js`.
- `scripts/lfea-standalone-native-results-check.mjs`.
- `scripts/run-lfea-standalone-check.mjs`.

## Process Notes / Lessons Learned

- Product separation has to be proven through execution dependency closure, not only bootstrap/UI structure.
- Currentness is application authority and must remain separate from immutable evidence.
- Recovery belongs behind the B-3.4 contract; presentation must not recompute actions.
- Result tables need quantity basis and units, not just values and labels.
- A workflow can fail before engineering tests because its own scope/custody assumptions are narrower than the PR; inspect the failing step before interpreting it.
- Missing benchmark artifacts produce incomplete qualification evidence and must not be translated into an engineering PASS or FAIL.

## Handover Appendix

- **PR:** #1035 draft.
- **Implemented path:** standalone Source → Review → Model → reviewed raw B-3.3 solve → CURRENT/STALE raw authority → governed B-3.4 recovery → Results.
- **Results honesty:** raw displacement/reaction and recovered local/global element actions have explicit basis, canonical units and authority labels; stale values are hidden from current Results.
- **Profile:** explicit `LFEA-B3.4-QUALIFIED-RECOVERY-BASELINE-V1`, 5 stations/span, `1e-6` consistency tolerance, local+global retained.
- **Not claimed:** support actions, B31/code results, component code-point resultants, History/Compare, persistence/dossier/extraction.
- **Changed-file truth:** 45/45 accounted.
- **CI truth:** `main-gate` PASS at `3cdbbaf…`; focused Results and full standalone aggregate NOT_RUN; other recorded LFEA/BM3 failures stop before relevant product evidence.
- **Highest risk:** exact-head standalone executable qualification.
- **Next action:** run the standalone aggregate, then reconcile `main`; do not advance to History/Compare before validation closure.