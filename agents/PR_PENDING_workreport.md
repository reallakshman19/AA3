# LFEA Standalone Engineering Work Report

## PR Mission Control

| Field | Current value |
|---|---|
| Mission | Separate LFEA into an independently bootable/testable/releasable application and connect governed native InputXML execution without weakening engineering authority. |
| Source task / issue | Advanced_Analysis #1024 — LFEA Standalone Application — separation, product hardening, and next-level roadmap |
| PR number | PENDING |
| Branch | `agent/lfea-standalone-s1-1024` |
| Base commit | `f8486ee75c39c33483742607b7d18ee42ebcde5d` (merge base with current `main`) |
| Current HEAD | `458176049e1f2ae482ccda7303e597225da47473` before this report commit |
| PR status | DRAFT PENDING CREATION |
| Current stage | Stage 2 — PR allocation + report synchronization |
| Last completed stage | Stage 1 — reconstructed technical findings and implementation roadmap from completed standalone/execution work |
| Engineering status | IMPLEMENTED for standalone bootstrap, governed Source→Review→Model authorization, native raw B-3.3 execution, and current/stale execution authority; downstream Results/History remain DEFERRED |
| Validation status | Exact-head runtime aggregate: NOT_RUN. Static architecture/source review and commit-diff review completed. |
| Current blocker | No executable checkout/CI result is available for the exact branch head; current `main` also contains 18 unrelated commits after the merge base. |
| Exact next action | Allocate draft PR number, rename this report, reconcile PR changed files, then run `node scripts/run-lfea-standalone-check.mjs` on the PR head in an executable checkout/CI environment. |

## Handover in 60 Seconds

**What is now true**

- LFEA has a standalone entrypoint/build path independent of the combined workspace bootstrap.
- Native InputXML Source → Review → Model preparation is projected from governed sealed records.
- `runNativeAnalysis()` reaches the production raw solver only through `solveInputXmlLinearAnalysis()` authorization checks.
- Native execution is retained as immutable raw `fea-linear-execution/v1` evidence and separately classified `CURRENT` or `STALE`.
- The LFEA linear solver no longer imports executable sparse primitives from `src/core/lafea-linear-solve/`; neutral numerical leaves live under `src/core/shared-linear-solve/`.

**What is being worked on**

- PR allocation, CodingRules synchronization, changed-file reconciliation, and exact-head validation evidence.

**What remains unfinished**

- Exact-head runtime qualification has not been executed in this environment.
- Governed result recovery / Results authority, support-action publication, code application, run history, semantic comparison, persistence, dossier/export hardening, and physical repository extraction remain future stages.

**What must not be assumed**

- Do not treat a draft PR, static review, or committed test script as proof that the exact head passes runtime qualification.
- Do not treat raw B-3.3 solver qualification as recovered/support-action/code-stress qualification.
- Do not treat a stale retained execution as current model authority.

**Highest-risk remaining item**

- Exact-head numerical/runtime validation after neutral sparse-solver extraction and native execution activation.

**Exact next action**

- Run the standalone aggregate at the PR head and record PASS/FAIL per command; if it passes, reconcile the full GitHub changed-file list before advancing to Results authority.

## Mission and Engineering Intent

### Mission

Deliver an LFEA-owned application/runtime boundary that can boot, review, authorize, solve, and invalidate native piping execution without relying on LAFEA runtime/state/controller ownership.

### User / engineering consequence

The separation must change product ownership, not engineering truth. Source provenance, reviewed execution authority, model/source lineage, solver profile identity, load-case identity, coordinate semantics, qualification scope, and stale-result behavior remain fail-closed.

### Scope

- standalone LFEA entrypoint, shell/layout, build identity, and architecture guards;
- native governed InputXML source/review/model preparation projection;
- explicit reviewed execution handoff;
- production raw B-3.3 execution behind the governed solve gate;
- immutable execution evidence plus application-level current/stale authority;
- neutral sparse numerical primitives required to remove an LAFEA runtime dependency;
- focused source/architecture, state-authority, production-solve, and build checks.

### Governing engineering principles

1. External source identity is verified, never silently reminted.
2. UI state does not grant execution authority.
3. Run identity is bound to exact source/model/load/profile/authorization lineage.
4. Stale evidence remains immutable evidence but cannot act as current authority.
5. Raw execution is not recovered/projected/code-applied authority.
6. No hidden engineering defaults are introduced for separation.
7. No new LAFEA runtime coupling is permitted.

### Explicit non-goals for this PR stage

- result recovery / Results presentation authority;
- support-action publication;
- piping-code stress application;
- run history / semantic comparison;
- persistence namespace finalization;
- final qualified evidence export/dossier;
- physical repository extraction.

### Important constraints

- Keep all assignment work on this PR unless Owner changes scope.
- No workflow-file changes without explicit authorization.
- No numerical policy change merely to make separation work.
- Any authority-boundary change must be explicit and validated.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Standalone entrypoint/shell/build | P0 | IMPLEMENTED | Prior standalone stages | `lfea.html`, `src/lfea/*`, `vite.lfea.config.js` |
| LAFEA runtime boundary guard | P0 | IMPLEMENTED | Prior standalone stages | boundary self-test/check + build artifact check |
| Governed Source→Review→Model projection | P0 | IMPLEMENTED | Prior standalone stages | `governed-journey-*` + source workflow check |
| Reviewed native execution gate | P0 | IMPLEMENTED | Execution authority stage | `solveInputXmlLinearAnalysis()` + `native-execution-authority.js` |
| Raw production B-3.3 execution | P0 | IMPLEMENTED | Execution authority stage | production executor + real production solve check |
| CURRENT/STALE execution authority | P0 | IMPLEMENTED | Execution authority stage | native execution check |
| Remove LAFEA sparse runtime dependency | P0 | IMPLEMENTED | Execution authority stage | `shared-linear-solve/*` + neutral dependency guard |
| Numerical equivalence of sparse extraction | P0 | IMPLEMENTED | Execution authority stage | migration-only equivalence check committed; runtime result NOT_RUN |
| Exact-head standalone aggregate | P0 | BLOCKED | Validation stage | no executable checkout/CI result currently available |
| Results/recovery authority | P1 | DEFERRED | Future stage | intentionally out of scope |
| History/compare/persistence/dossier | P1 | DEFERRED | Future stage | intentionally out of scope |
| Physical repository extraction | P1 | DEFERRED | Future stage | only after preceding qualification |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| ISS-001 | confirmed defect | P0 | IMPLEMENTED | B-3.3 solver executable path imported sparse primitives from LAFEA-owned package, violating standalone runtime separation. | Yes |
| DEC-001 | deliberate decision | P0 | ACCEPTED | Native execution is activated only behind `solveInputXmlLinearAnalysis()`; the low-level executor is not public authorization authority. | Yes |
| DEC-002 | deliberate decision | P0 | ACCEPTED | This stage retains only raw sealed B-3.3 execution; recovery/code/result presentation remain downstream. | Yes |
| DEC-003 | deliberate decision | P0 | ACCEPTED | Currentness is application authority separate from immutable execution evidence; source/model/auth changes mark retained runs STALE. | Yes |
| DEC-004 | deliberate decision | P0 | ACCEPTED | Neutral sparse primitives are extracted without changing LAFEA package behavior; LFEA imports the neutral leaf. | Yes |
| RISK-001 | engineering/release risk | P0 | BLOCKED | Exact-head runtime/numerical qualification has not been executed. | Yes |
| RISK-002 | engineering/release risk | P1 | INVESTIGATING | Feature branch and `main` diverged after merge base; `main` has 18 unrelated topology-edit commits. | Yes |
| IMP-001 | improvement opportunity | P1 | DEFERRED | Governed recovered Results authority should consume only CURRENT qualified raw execution. | No — next stage |
| IMP-002 | improvement opportunity | P1 | DEFERRED | Run history/comparison must use quantity identity, basis, units, case semantics, entity mapping, and result authority before subtraction. | No — future stage |
| QST-001 | unresolved question | P1 | INVESTIGATING | Reconcile/rebase strategy against latest `main` before ready-for-review, after exact-head standalone qualification is available. | Yes |

### ISS-001 — LAFEA sparse runtime dependency

**Affected components:** `linear-fea-solver/{assembly,factorization,qualification,solve}.js`.

**Engineering consequence:** activating native LFEA execution would have reintroduced a transitive runtime dependency on an LAFEA-owned package, defeating the standalone invariant even though the UI/bootstrap split looked clean.

**Root cause:** reusable sparse numerical primitives were historically housed under an application-owned `lafea-linear-solve` package and consumed by the general B-3.3 solver.

**Resolution:** extract the required numerical leaves to `shared-linear-solve`, redirect LFEA/general solver imports, preserve failure evidence semantics, and add architecture/equivalence checks.

**Required validation:** standalone dependency guard plus numerical equivalence and real raw production solve on exact head.

## Stage Roadmap

### Stage 1 — Report initialization + technical findings

**Current truth:** Implementation predated adoption of this CodingRules report; this report reconstructs the engineering record from repository commits and inspected evidence.

**Objective:** establish durable mission/findings/decisions/risks without rewriting history.

**Stage decision:** COMPLETE for reconstruction; process deviation recorded below.

### Stage 2 — PR allocation + report synchronization

**Current truth:** branch exists remotely; no open PR from this head was found; report is currently `PR_PENDING`.

**Objective:** create draft PR, rename report to the allocated PR number, update PR/head/status fields, and add a handover appendix.

**Expected files:** this report only.

**Planned validation:** fetch created PR metadata and confirm draft/head/base/body/report path.

### Stage 3 — Changed-file / repository-state verification

**Objective:** compare GitHub changed-file list to the ledger and investigate every discrepancy.

**Known risk:** branch is behind latest `main` by unrelated commits, so final reconciliation must distinguish branch-owned changes from base drift.

### Stage 4 — Exact-head standalone qualification

**Objective:** execute all committed standalone checks on the exact PR head.

**Planned validation:** `node scripts/run-lfea-standalone-check.mjs`; record every sub-check and exact HEAD as PASS/FAIL.

### Stage 5 — Results authority (future, only after Stage 4)

**Objective:** consume only CURRENT qualified raw execution for governed recovery and Results authority. Do not add History/Compare in the same step unless separately staged and evidenced.

## Changed-File Ledger

The current branch-side change set known from repository comparison is listed below. Stage 3 must reconcile this ledger with GitHub's actual PR changed-file list after PR allocation.

| File / group | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---|---|---|---|---|
| `.gitignore` | standalone setup | standalone setup | standalone build artifact handling | No | static review |
| `lfea.html` | standalone setup | standalone setup | independent LFEA entry document | No | build check committed |
| `vite.lfea.config.js` | standalone setup | standalone setup | independent LFEA Vite build | No | build check committed |
| `src/lfea/main.js` | standalone setup | standalone setup | standalone application entry | Yes | aggregate committed |
| `src/lfea/bootstrap.js` | standalone setup | execution authority | LFEA composition and public native run API | Yes | source/state checks committed |
| `src/lfea/standalone-layout.js` | standalone shell | standalone shell | LFEA-owned navigation/layout | No | browser/build checks committed |
| `src/lfea/standalone.css` | standalone shell | standalone shell | standalone presentation | No | build check committed |
| `src/lfea/inputxml-source-controller.js` | governed journey | governed journey | native source/review workflow ownership | Yes | source workflow check committed |
| `src/lfea/governed-journey-projection.js` | governed journey | execution authority | read-only authority projection | Yes | journey/native execution checks committed |
| `src/lfea/governed-journey-view.js` | governed journey | execution authority | authority-honest standalone UI | Yes | journey/native execution checks committed |
| `src/lfea/native-execution-authority.js` | execution authority | execution authority | current/stale run authority | Yes | native execution check committed |
| `src/workspace/lfea-mock-data.js` | standalone boundary | standalone boundary | remove mock-data dependency on combined bootstrap path | No | workbench check committed |
| `src/workspace/lfea-workbench-controller.js` | standalone boundary | standalone boundary | consume isolated mock-data module | Yes | workbench check committed |
| `src/workspace/linear-piping-inputxml-intake.js` | governed journey | governed journey | narrow InputXML custody imports | Yes | source workflow check committed |
| `src/workspace/linear-piping-inputxml-prefea.js` | governed journey | governed journey | narrow pre-FEA custody imports | Yes | pre-FEA/journey checks committed |
| `src/core/linear-piping-analysis-consumer/inputxml-linear-execution-elements.js` | execution authority | execution authority | load-aware element authority with axis custody cross-check | Yes | production solve check committed |
| `src/core/linear-piping-analysis-consumer/inputxml-linear-production-executor.js` | execution authority | execution authority | authorized raw B-3.3 production executor | Yes | production solve check committed |
| `src/core/shared-linear-solve/*` | execution authority | execution authority | neutral sparse numerical primitives | Yes | dependency/equivalence checks committed |
| `src/core/linear-fea-solver/assembly.js` | execution authority | execution authority | redirect sparse assembly primitive ownership | Yes | equivalence/production checks committed |
| `src/core/linear-fea-solver/factorization.js` | execution authority | execution authority | redirect sparse factorization primitive ownership | Yes | equivalence/production checks committed |
| `src/core/linear-fea-solver/qualification.js` | execution authority | execution authority | redirect sparse multiplication primitive ownership | Yes | equivalence/production checks committed |
| `src/core/linear-fea-solver/solve.js` | execution authority | execution authority | redirect sparse solve primitives ownership | Yes | equivalence/production checks committed |
| `scripts/lfea-standalone-boundary-self-test.mjs` | standalone boundary | standalone boundary | prove boundary guard fails on deliberate violation | Yes | NOT_RUN exact head |
| `scripts/lfea-standalone-boundary-check.mjs` | standalone boundary | standalone boundary | standalone dependency guard | Yes | NOT_RUN exact head |
| `scripts/linear-piping-inputxml-source-workflow-check.mjs` | governed journey | governed journey | source custody/review workflow | Yes | NOT_RUN exact head |
| `scripts/lfea-standalone-governed-journey-check.mjs` | governed journey | execution authority | authority projection/gating | Yes | NOT_RUN exact head |
| `scripts/lfea-standalone-native-execution-check.mjs` | execution authority | execution authority | unauthorized bypass and CURRENT→STALE behavior | Yes | NOT_RUN exact head |
| `scripts/lfea-standalone-native-production-solve-check.mjs` | execution authority | execution authority | real authorized raw solve | Yes | NOT_RUN exact head |
| `scripts/lfea-linear-solver-neutral-dependency-check.mjs` | execution authority | execution authority | forbid solver closure import of LAFEA sparse package | Yes | NOT_RUN exact head |
| `scripts/lfea-sparse-extraction-equivalence-check.mjs` | execution authority | execution authority | old/new numerical primitive equivalence | Yes | NOT_RUN exact head |
| `scripts/lfea-standalone-build-artifact-check.mjs` | standalone build | standalone build | inspect standalone bundle/artifacts for forbidden coupling | Yes | NOT_RUN exact head |
| `scripts/run-lfea-standalone-check.mjs` | standalone build | execution authority | aggregate standalone qualification | Yes | NOT_RUN exact head |
| `scripts/fixtures/lfea-standalone-forbidden-import.js` | standalone boundary | standalone boundary | negative architecture fixture | No | NOT_RUN exact head |
| `agents/PR_PENDING_workreport.md` | Stage 1 | Stage 2 | living engineering report and handover | No | PR synchronization pending |

## Engineering Decisions and Invariants

| Decision / invariant | What must remain true | Enforcement | Validation | PR changes it? |
|---|---|---|---|---|
| DEC-001 Reviewed execution gate | Runtime construction cannot occur without current sealed preparation + authorization + authorized case subset. | `solveInputXmlLinearAnalysis()` and app authority wrapper | native execution check | Connects executor below existing gate; does not weaken gate |
| DEC-002 Raw vs downstream authority | Raw solver qualification cannot masquerade as recovered/support/code authority. | production executor stops at sealed B-3.3 execution | source guard + production solve check | Explicitly preserves distinction |
| DEC-003 Currentness | Model/source/review/authorization changes invalidate current execution authority without rewriting history. | `native-execution-authority.js` reconciliation | native execution check | Adds app-level current/stale authority |
| Source custody | Imported source identity is validated; external tamper is not silently resealed. | existing InputXML/workbench contracts | source/workbench checks | No weakening intended |
| No LAFEA runtime coupling | Standalone execution closure must not depend on LAFEA runtime/state/controller/numerical ownership. | architecture guards + neutral numerical leaf | boundary/dependency/build checks | Strengthened |
| No hidden engineering defaults | Solver/recovery/profile selection cannot be silently invented for activation. | exact profile hash custody | production executor checks | Strengthened |

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Static architecture/source inspection | PASS | `458176049e1f2ae482ccda7303e597225da47473` pre-report | reviewed dependency/gate/authority source |
| Import-only solver redirection diff review | PASS | `458176049e1f2ae482ccda7303e597225da47473` pre-report | commit diffs reviewed for `assembly/factorization/qualification/solve` |
| `scripts/lfea-standalone-boundary-self-test.mjs` | NOT_RUN | — | executable environment unavailable here |
| `scripts/lfea-standalone-boundary-check.mjs` | NOT_RUN | — | executable environment unavailable here |
| `scripts/lfea-linear-solver-neutral-dependency-check.mjs` | NOT_RUN | — | executable environment unavailable here |
| `scripts/lfea-sparse-extraction-equivalence-check.mjs` | NOT_RUN | — | executable environment unavailable here |
| `scripts/lfea-standalone-native-execution-check.mjs` | NOT_RUN | — | executable environment unavailable here |
| `scripts/lfea-standalone-native-production-solve-check.mjs` | NOT_RUN | — | executable environment unavailable here |
| `node scripts/run-lfea-standalone-check.mjs` | NOT_RUN | — | no CI/workflow status on exact head |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Reviewed authorization is mandatory before native runtime construction | PASS (static/contract) | governed solve gate + authority source inspection |
| Stale execution cannot be returned as current | PASS (static/contract) | currentness authority source inspection |
| Runtime solver/frame profile matches pre-flight-qualified hashes | PASS (static/contract) | production executor source inspection |
| Retained execution excludes active factorization handle/transient diagnostics | PASS (static/contract) | executor revalidates exact sealed execution record |
| Neutral sparse primitives are numerically equivalent | NOT_RUN | equivalence test committed but not executed |
| Exact-head native raw solve produces QUALIFIED/CONDITIONAL sealed execution | NOT_RUN | production solve test committed but not executed |

### Explicitly Not Validated

- Exact-head standalone aggregate runtime result.
- Browser golden journey on the PR head.
- Build artifact inspection on the PR head.
- Numerical equivalence of neutral sparse primitives on the PR head.
- Real native production solve result on the PR head.
- Compatibility after incorporating the 18 newer unrelated `main` commits.
- Results/recovery/support-action/code-stress semantics because those are intentionally deferred.

## Known / Deferred Work and Forward Sequence

### Open defects

- None confirmed beyond ISS-001, which is implemented but awaits exact-head validation.

### Deferred improvements

- IMP-001 — governed Results/recovery authority.
- IMP-002 — semantic run comparison and history.
- persistence namespace and product dossier/export hardening.
- physical repository extraction only after behavioral/architecture proof.

### Open risks

- RISK-001 — exact-head runtime qualification not executed.
- RISK-002 — branch/main divergence must be reconciled before ready-for-review.

### Open engineering questions

- QST-001 — safest synchronization strategy with current `main` after standalone validation.

### Accepted technical debt

- None newly accepted in this stage. Deferred roadmap items are not treated as silently accepted debt.

### Recommended Forward Sequence

1. **Allocate PR + synchronize report.** Required so repository + PR + report are sufficient handover artifacts.
2. **Run exact-head standalone aggregate.** Highest-priority evidence because native execution and numerical ownership changed.
3. **Reconcile changed-file ledger and latest `main`.** Do this before ready-for-review so unrelated base drift cannot hide scope changes.
4. **Governed Results authority.** Consume only CURRENT qualified raw execution; establish recovery provenance/quantity identities before UI expansion.
5. **History and semantic comparison.** Only after quantity/result authority contracts exist; otherwise field-name comparison is unsafe.
6. **Persistence/dossier/export hardening.** Build on current/stale and quantity authority, keeping export fail-closed.
7. **Physical extraction.** Last, after LFEA builds/tests with LAFEA physically unavailable.

## Next-Agent Handover

**Current stopping point**  
Native raw execution and current/stale authority are implemented; PR/report synchronization and exact-head executable qualification are the active work.

**PR / branch / HEAD**  
PR pending; `agent/lfea-standalone-s1-1024`; pre-report HEAD `458176049e1f2ae482ccda7303e597225da47473`.

**Last completed stage**  
Stage 1 — report reconstruction + technical findings.

**Current active stage**  
Stage 2 — PR allocation + report synchronization.

**Start here**  
Create draft PR into `main`, rename this file to `agents/PR<NUMBER>_workreport.md`, update Mission Control/current HEAD, then fetch the actual PR changed-file list.

**Do not redo**

- Do not re-create the native execution gate.
- Do not move solver execution above `solveInputXmlLinearAnalysis()`.
- Do not reintroduce `lafea-linear-solve` imports into the LFEA solver closure.
- Do not add result recovery yet unless exact-head raw execution is qualified first.

**Do not assume**

- committed checks have run;
- branch is current with `main`;
- raw solver status qualifies recovered/code values;
- stale evidence can be exported or promoted as current.

**Files currently involved**

- `src/lfea/native-execution-authority.js`
- `src/lfea/bootstrap.js`
- `src/core/linear-piping-analysis-consumer/inputxml-linear-production-executor.js`
- `src/core/linear-piping-analysis-consumer/inputxml-linear-execution-elements.js`
- `src/core/linear-fea-solver/{assembly,factorization,qualification,solve}.js`
- `src/core/shared-linear-solve/*`
- `scripts/run-lfea-standalone-check.mjs` and targeted execution/dependency/equivalence checks

**Known failing checks**  
None known; checks are NOT_RUN, not PASS.

**Validation still required**  
Run the complete standalone aggregate on exact PR head and record sub-check results.

**Open QST-* items**  
QST-001 — latest-main synchronization strategy before ready-for-review.

**Important deferred IMP-* items**  
IMP-001 Results authority; IMP-002 semantic history/comparison.

**Highest-risk remaining item**  
Exact-head runtime/numerical validation after neutral sparse extraction and production execution activation.

**Exact next recommended action**  
After PR/report synchronization, execute `node scripts/run-lfea-standalone-check.mjs` on the PR head; stop on any failure and record it rather than weakening a guard.

**Required reading**

- Issue #1024.
- Common `CodingRules.md` at commit `43eccc27967ecec7d67513c08255398b496be5ce`.
- `src/core/linear-piping-analysis-consumer/inputxml-linear-governed-solve.js`.
- `src/lfea/native-execution-authority.js`.
- `src/core/linear-piping-analysis-consumer/inputxml-linear-production-executor.js`.
- `scripts/run-lfea-standalone-check.mjs`.

## Stage Execution Log

### Stage 1 — reconstructed initialization

**Implementation performed:** created this living report after implementation had already begun, reconstructing current engineering truth from repository state and inspected commit/source evidence.

**Deviation from plan:** CodingRules requires `PR_PENDING` before production changes. That protocol was adopted after the production work in this branch had already been performed. This is recorded rather than backdated or hidden.

**Validation performed:** static source/architecture inspection and commit-diff inspection only.

**New findings:** RISK-001 exact-head validation unavailable; RISK-002 branch/main divergence; QST-001 synchronization strategy.

**Remaining risks:** exact-head runtime/numerical behavior remains unproven.

**Stage decision:** COMPLETE for report reconstruction.

**Handover delta:** repository now contains a single durable work-report entrypoint for the PR.

## Process Notes / Lessons Learned

- A UI/bootstrap split is insufficient proof of product separation: activating native execution exposed a transitive numerical dependency on an LAFEA-owned package.
- Application currentness must be separate from immutable engineering evidence; otherwise selecting or retaining historical evidence can accidentally promote stale authority.
- Numerical primitive extraction must preserve failure metadata as well as successful numerical outputs because pivot-location evidence participates in fail-closed diagnostics.

## Handover Appendix

This appendix is intentionally concise enough to copy into the draft PR description.

- **Branch:** `agent/lfea-standalone-s1-1024`
- **Source issue:** #1024
- **Implemented boundary:** standalone LFEA + governed Source→Review→Model + reviewed native raw B-3.3 solve + CURRENT/STALE authority.
- **Key architectural fix:** general LFEA solver no longer imports executable sparse primitives from the LAFEA-owned package; neutral primitives are under `shared-linear-solve`.
- **Engineering boundary:** raw execution only. Recovery, support actions, code stress, Results, History/Compare, persistence, dossier/export, and physical extraction remain deferred.
- **Validation truth:** static/diff review completed; exact-head executable checks are NOT_RUN.
- **Main drift:** current branch diverges from latest `main`; latest observed `main` contains 18 unrelated topology-edit commits after the merge base.
- **Highest risk:** exact-head numerical/runtime qualification.
- **Next action:** run `node scripts/run-lfea-standalone-check.mjs` on PR head, record every result, then reconcile changed files and base drift before ready-for-review.
