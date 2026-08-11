# PR1035 — LFEA Standalone Engineering Work Report

## PR Mission Control

| Field | Current value |
|---|---|
| Mission | Separate LFEA into an independently bootable/testable/releasable application and connect governed native InputXML execution without weakening engineering authority. |
| Source task / issue | Advanced_Analysis #1024 — LFEA Standalone Application — separation, product hardening, and next-level roadmap |
| PR number | 1035 |
| Branch | `agent/lfea-standalone-s1-1024` |
| Base commit | `f8486ee75c39c33483742607b7d18ee42ebcde5d` merge base; PR targets `main` |
| Current HEAD | Authoritative value is the GitHub PR head / branch ref; last observed immediately before this report-finalization commit: `6e86ee7cda1b5ed996ba4a6e0b4435e139476254` |
| PR status | DRAFT |
| Current stage | Stage 4 — exact-head standalone qualification |
| Last completed stage | Stage 3 — changed-file / repository-state verification |
| Engineering status | IMPLEMENTED for standalone bootstrap, governed Source→Review→Model authorization, native raw B-3.3 execution, CURRENT/STALE execution authority, and LAFEA sparse-runtime decoupling. Results/History remain DEFERRED. |
| Validation status | Static architecture/source review and commit-diff review: PASS. Exact-head executable aggregate: NOT_RUN. |
| Current blocker | No executable checkout/CI result is available for exact PR head; latest observed `main` has 18 unrelated commits after the merge base. |
| Exact next action | Run `node scripts/run-lfea-standalone-check.mjs` on the exact PR head and record every sub-check as PASS/FAIL/NOT_RUN. Do not mark ready-for-review before that evidence exists. |

> The report cannot embed the SHA of the commit containing itself without becoming self-referential. The authoritative current HEAD is therefore the PR/branch ref; the last pre-report-update SHA is retained above for traceability.

## Handover in 60 Seconds

**What is now true**

- LFEA has an independent entry/build path outside the combined workspace bootstrap.
- Native InputXML Source → Review → Model preparation is projected from governed sealed records.
- `runNativeAnalysis()` reaches production raw solve only through `solveInputXmlLinearAnalysis()` authorization checks.
- Native execution is immutable raw `fea-linear-execution/v1` evidence, separately classified as `CURRENT` or `STALE`.
- The general B-3.3 solver no longer imports executable sparse primitives from `src/core/lafea-linear-solve/`; neutral primitives live in `src/core/shared-linear-solve/`.
- Draft PR #1035 exists; `agents/PR1035_workreport.md` is the canonical handover/report file.
- GitHub's post-rename PR file list contains 39 paths and all 39 are accounted for below; there are no unexplained changed files.

**What is being worked on**

- Exact-head standalone/runtime qualification, then safe synchronization with latest `main` before ready-for-review.

**What remains unfinished**

- Exact-head runtime qualification is NOT_RUN.
- Governed recovery/Results authority, support actions, code application, History/Compare, persistence, dossier/export hardening, and physical repository extraction are deferred.

**What must not be assumed**

- Committed checks have not necessarily run.
- Raw B-3.3 solver qualification is not recovered/support-action/code-stress qualification.
- STALE retained execution is not current engineering authority.
- The branch is not yet synchronized with latest `main`.

**Highest-risk remaining item**

- Exact-head numerical/runtime validation after neutral sparse extraction and native execution activation.

**Exact next action**

- Execute `node scripts/run-lfea-standalone-check.mjs` at exact PR head, record every result, then resolve latest-main synchronization before ready-for-review.

## Mission and Engineering Intent

### Mission

Deliver an LFEA-owned application/runtime boundary that can boot, review, authorize, solve, and invalidate native piping execution without relying on LAFEA runtime/state/controller ownership.

### User / engineering consequence

Separation changes product ownership, not engineering truth. Source provenance, reviewed execution authority, exact model/source/load/profile lineage, coordinate semantics, qualification scope, and stale-result behavior remain fail-closed.

### Scope

- standalone LFEA entrypoint, shell/layout, build identity, and architecture guards;
- governed InputXML Source→Review→Model projection;
- reviewed execution handoff;
- production raw B-3.3 execution below the governed solve gate;
- immutable execution evidence plus CURRENT/STALE application authority;
- neutral sparse numerical primitives to remove an LAFEA runtime dependency;
- focused architecture, authority, production-solve, equivalence, and build checks.

### Governing engineering principles

1. External source identity is verified, never silently reminted.
2. UI state does not grant execution authority.
3. Run identity is bound to exact source/model/load/profile/authorization lineage.
4. Stale evidence remains immutable evidence but cannot act as current authority.
5. Raw execution is not recovered/projected/code-applied authority.
6. No hidden engineering defaults are introduced for separation.
7. No LAFEA runtime coupling is permitted in the standalone execution closure.

### Explicit non-goals for this PR stage

- result recovery / Results authority;
- support-action publication;
- piping-code stress application;
- run history / semantic comparison;
- persistence namespace finalization;
- qualified dossier/export hardening;
- physical repository extraction.

### Important constraints

- Keep assignment work on this PR unless Owner changes scope.
- Do not modify `.github/workflows/*` without explicit authorization.
- Do not change numerical policy merely to make separation pass.
- Any intentional authority-boundary change must be explicit, registered as DEC-*, and validated.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Standalone entrypoint/shell/build | P0 | IMPLEMENTED | prior standalone stages | `lfea.html`, `src/lfea/*`, `vite.lfea.config.js` |
| LAFEA runtime boundary guard | P0 | IMPLEMENTED | boundary | boundary self-test/check + artifact check |
| Governed Source→Review→Model | P0 | IMPLEMENTED | journey | source workflow + journey projection/check |
| Reviewed native execution gate | P0 | IMPLEMENTED | execution | governed solve gate + app authority wrapper |
| Raw production B-3.3 execution | P0 | IMPLEMENTED | execution | production executor + production-solve check |
| CURRENT/STALE execution authority | P0 | IMPLEMENTED | execution | native execution authority/check |
| Remove LAFEA sparse runtime dependency | P0 | IMPLEMENTED | execution | neutral sparse leaf + dependency guard |
| Numerical equivalence check | P0 | IMPLEMENTED | execution | equivalence check committed; runtime result NOT_RUN |
| PR allocation/report sync | P0 | DONE | Stage 2 | draft PR #1035 + numbered report |
| Changed-file reconciliation | P0 | VALIDATED | Stage 3 | post-rename GitHub list: 39/39 accounted |
| Exact-head standalone aggregate | P0 | BLOCKED | Stage 4 | executable evidence unavailable here |
| Results/recovery authority | P1 | DEFERRED | future | intentionally out of scope |
| History/compare/persistence/dossier | P1 | DEFERRED | future | intentionally out of scope |
| Physical repository extraction | P1 | DEFERRED | future | only after preceding qualification |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| ISS-001 | confirmed defect | P0 | IMPLEMENTED | General B-3.3 solver imported sparse primitives from LAFEA-owned package, violating standalone runtime separation. | Yes |
| DEC-001 | deliberate decision | P0 | ACCEPTED | Native runtime is reachable only below `solveInputXmlLinearAnalysis()`; the low-level executor is not authorization authority. | Yes |
| DEC-002 | deliberate decision | P0 | ACCEPTED | This stage retains raw sealed B-3.3 execution only; recovery/code/result presentation remain downstream. | Yes |
| DEC-003 | deliberate decision | P0 | ACCEPTED | Currentness is separate application authority; parent changes mark retained execution STALE without rewriting evidence. | Yes |
| DEC-004 | deliberate decision | P0 | ACCEPTED | Neutral sparse primitives are extracted without removing the LAFEA package; LFEA/general solver consumes the neutral leaf. | Yes |
| RISK-001 | engineering/release risk | P0 | BLOCKED | Exact-head runtime/numerical qualification has not been executed. | Yes |
| RISK-002 | engineering/release risk | P1 | INVESTIGATING | PR branch diverges from latest observed `main`, which has 18 unrelated topology-edit commits after merge base. | Yes |
| IMP-001 | improvement opportunity | P1 | DEFERRED | Governed Results/recovery authority should consume only CURRENT qualified raw execution. | No — next stage |
| IMP-002 | improvement opportunity | P1 | DEFERRED | Run comparison must check quantity identity, units, basis, entity mapping, case semantics, and result authority before subtraction. | No — future |
| QST-001 | unresolved question | P1 | INVESTIGATING | Choose safest synchronization strategy with latest `main` after exact-head standalone qualification. | Yes |

### ISS-001 detail

**Affected components:** `linear-fea-solver/{assembly,factorization,qualification,solve}.js`.

**Engineering consequence:** native LFEA execution would otherwise restore a transitive LAFEA runtime dependency and invalidate the standalone invariant.

**Root cause:** reusable sparse numerical primitives were historically housed under `lafea-linear-solve` and consumed by the general B-3.3 solver.

**Resolution:** extract required numerical leaves to `shared-linear-solve`, redirect general solver imports, preserve failure-code/pivot-evidence behavior, and add dependency/equivalence checks.

**Required closure evidence:** exact-head dependency guard, numerical equivalence, and real raw production solve.

## Stage Roadmap and Stage Protocol

### Stage 1 — Report initialization + technical findings

**Current truth:** production work predated adoption of this CodingRules report. The report reconstructs truth from repository history/evidence rather than backdating compliance.

**Stage decision:** COMPLETE for reconstruction.

### Stage 2 — PR allocation + report synchronization

**Implementation performed:** created `PR_PENDING`, opened draft PR #1035, created `agents/PR1035_workreport.md`, removed `PR_PENDING`, and updated handover/mission data.

**Validation performed:** GitHub confirms draft=true, head=`agent/lfea-standalone-s1-1024`, base=`main`.

**Stage decision:** COMPLETE.

### Stage 3 — Changed-file / repository-state verification

**Implementation performed:** fetched GitHub's PR changed-file list before and after report rename.

**Actual behavior:** both lists contain 39 paths; the sole expected delta is `agents/PR_PENDING_workreport.md` → `agents/PR1035_workreport.md`. Post-rename all 39 paths are explicitly represented below. No unexplained file remains.

**Validation performed:** filename-by-filename reconciliation against GitHub post-rename result.

**Stage decision:** COMPLETE.

### Stage 4 — Exact-head standalone qualification

**Current truth:** NOT_RUN.

**Objective:** run all committed standalone checks at exact PR head.

**Expected scope/files:** no production changes unless a check exposes a registered finding.

**Planned validation:** `node scripts/run-lfea-standalone-check.mjs`; record every sub-check and tested HEAD.

**Known risks:** RISK-001 numerical/runtime evidence; RISK-002 latest-main compatibility follows afterward.

### Stage 5 — Results authority (future only after Stage 4)

Consume only CURRENT qualified raw execution for governed result recovery. Keep History/Compare in a later separately planned stage.

## Changed-File Ledger

Post-rename GitHub changed-file count: **39**. Reconciliation result: **39/39 accounted; no unexplained files**.

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---|---|---|---|---|
| `.gitignore` | standalone | standalone | build artifact handling | No | static review |
| `agents/PR1035_workreport.md` | Stage 1 | Stage 3 | living mission/validation/handover | No | post-rename reconciliation PASS |
| `lfea.html` | standalone | standalone | independent LFEA entry document | No | build check committed |
| `scripts/fixtures/lfea-standalone-forbidden-import.js` | boundary | boundary | negative architecture fixture | No | NOT_RUN |
| `scripts/lfea-linear-solver-neutral-dependency-check.mjs` | execution | execution | forbid LAFEA sparse dependency | Yes | NOT_RUN |
| `scripts/lfea-sparse-extraction-equivalence-check.mjs` | execution | execution | old/new sparse equivalence | Yes | NOT_RUN |
| `scripts/lfea-standalone-boundary-check.mjs` | boundary | boundary | dependency/ownership guard | Yes | NOT_RUN |
| `scripts/lfea-standalone-boundary-self-test.mjs` | boundary | boundary | prove guard fails on violation | Yes | NOT_RUN |
| `scripts/lfea-standalone-build-artifact-check.mjs` | build | build | artifact forbidden-coupling check | Yes | NOT_RUN |
| `scripts/lfea-standalone-governed-journey-check.mjs` | journey | execution | authority projection/gating | Yes | NOT_RUN |
| `scripts/lfea-standalone-native-execution-check.mjs` | execution | execution | authorization bypass + stale semantics | Yes | NOT_RUN |
| `scripts/lfea-standalone-native-production-solve-check.mjs` | execution | execution | real authorized raw solve | Yes | NOT_RUN |
| `scripts/run-lfea-standalone-check.mjs` | build | execution | aggregate standalone qualification | Yes | NOT_RUN |
| `src/core/linear-fea-solver/assembly.js` | execution | execution | neutral sparse assembly import | Yes | checks committed |
| `src/core/linear-fea-solver/factorization.js` | execution | execution | neutral sparse factorization imports | Yes | checks committed |
| `src/core/linear-fea-solver/qualification.js` | execution | execution | neutral sparse multiply import | Yes | checks committed |
| `src/core/linear-fea-solver/solve.js` | execution | execution | neutral sparse solve imports | Yes | checks committed |
| `src/core/linear-piping-analysis-consumer/inputxml-linear-execution-elements.js` | execution | execution | load-aware element authority + axis custody | Yes | production solve check committed |
| `src/core/linear-piping-analysis-consumer/inputxml-linear-production-executor.js` | execution | execution | authorized raw B-3.3 executor | Yes | production solve check committed |
| `src/core/shared-linear-solve/bc-elimination.js` | execution | execution | neutral partition primitive | Yes | equivalence check committed |
| `src/core/shared-linear-solve/condition-estimate.js` | execution | execution | neutral condition estimate | Yes | equivalence check committed |
| `src/core/shared-linear-solve/diagonal-scaling.js` | execution | execution | neutral sparse scaling | Yes | equivalence check committed |
| `src/core/shared-linear-solve/errors.js` | execution | execution | failure code/evidence contract | Yes | equivalence check committed |
| `src/core/shared-linear-solve/sparse-cholesky.js` | execution | execution | neutral sparse Cholesky | Yes | equivalence check committed |
| `src/core/shared-linear-solve/sparse-ldlt.js` | execution | execution | neutral pivoted LDLT | Yes | equivalence check committed |
| `src/core/shared-linear-solve/sparse-matrix.js` | execution | execution | neutral sparse assembly/multiply | Yes | equivalence check committed |
| `src/lfea/bootstrap.js` | standalone | execution | standalone composition + native run API | Yes | source/state checks committed |
| `src/lfea/governed-journey-projection.js` | journey | execution | governed authority projection | Yes | journey/execution checks committed |
| `src/lfea/governed-journey-view.js` | journey | execution | authority-honest UI | Yes | journey/execution checks committed |
| `src/lfea/inputxml-source-controller.js` | journey | journey | native source/review workflow ownership | Yes | source workflow check committed |
| `src/lfea/main.js` | standalone | standalone | standalone app entry | Yes | aggregate committed |
| `src/lfea/native-execution-authority.js` | execution | execution | CURRENT/STALE authority | Yes | execution check committed |
| `src/lfea/standalone-layout.js` | shell | shell | LFEA-owned navigation/layout | No | browser/build checks committed |
| `src/lfea/standalone.css` | shell | shell | standalone presentation | No | build check committed |
| `src/workspace/lfea-mock-data.js` | boundary | boundary | isolate mock data | No | workbench check committed |
| `src/workspace/lfea-workbench-controller.js` | boundary | boundary | isolated mock-data consumer | Yes | workbench check committed |
| `src/workspace/linear-piping-inputxml-intake.js` | journey | journey | narrow source custody imports | Yes | source check committed |
| `src/workspace/linear-piping-inputxml-prefea.js` | journey | journey | narrow pre-FEA custody imports | Yes | journey/pre-FEA checks committed |
| `vite.lfea.config.js` | standalone | standalone | independent LFEA Vite build | No | build check committed |

## Engineering Decisions and Invariants

| Decision / invariant | What must remain true | Enforcement | Validation | PR changes it? |
|---|---|---|---|---|
| DEC-001 Reviewed execution gate | No runtime creation without current sealed preparation + authorization + authorized case subset. | governed solve gate + app authority | native execution check | Connects executor below gate only |
| DEC-002 Raw vs downstream authority | Raw solver qualification cannot masquerade as recovered/support/code authority. | executor stops at B-3.3 | source guard + production check | Preserved/strengthened |
| DEC-003 Currentness | Parent changes invalidate current authority without rewriting evidence. | `native-execution-authority.js` | execution check | Adds explicit boundary |
| DEC-004 Neutral numerical ownership | General LFEA solver must not import executable primitives from LAFEA-owned package. | neutral leaf + dependency guard | dependency/equivalence checks | Strengthened |
| Source custody | External identity is verified, not silently resealed. | existing InputXML/workbench contracts | source/workbench checks | No weakening intended |
| No hidden defaults | Runtime profile selection equals pre-flight-qualified identities. | profile-hash custody | production check | Strengthened |

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Static architecture/source inspection | PASS | `458176049e1f2ae482ccda7303e597225da47473` pre-report | authorization/currentness/dependency source reviewed |
| Solver import-redirection diff review | PASS | same pre-report head | executable changes reviewed for dependency direction |
| PR draft/head/base metadata | PASS | PR #1035 | GitHub metadata |
| Changed-file reconciliation | PASS | PR #1035 post-rename | 39/39 paths accounted; no unexplained file |
| `scripts/lfea-standalone-boundary-self-test.mjs` | NOT_RUN | — | executable environment unavailable |
| `scripts/lfea-standalone-boundary-check.mjs` | NOT_RUN | — | executable environment unavailable |
| `scripts/lfea-linear-solver-neutral-dependency-check.mjs` | NOT_RUN | — | executable environment unavailable |
| `scripts/lfea-sparse-extraction-equivalence-check.mjs` | NOT_RUN | — | executable environment unavailable |
| `scripts/lfea-standalone-native-execution-check.mjs` | NOT_RUN | — | executable environment unavailable |
| `scripts/lfea-standalone-native-production-solve-check.mjs` | NOT_RUN | — | executable environment unavailable |
| `node scripts/run-lfea-standalone-check.mjs` | NOT_RUN | — | no exact-head checkout/CI result |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Reviewed authorization mandatory before runtime construction | PASS (static/contract) | governed solve gate + authority source |
| STALE execution cannot be returned as current | PASS (static/contract) | currentness authority source |
| Runtime solver/frame profile equals pre-flight-qualified hashes | PASS (static/contract) | production executor source |
| Retained execution excludes active factorization handle/transient diagnostics | PASS (static/contract) | exact sealed-record revalidation |
| Neutral sparse primitives numerically equivalent | NOT_RUN | equivalence check committed |
| Exact-head real native raw solve qualifies | NOT_RUN | production solve check committed |

### Explicitly Not Validated

- Exact-head standalone aggregate runtime result.
- Browser golden journey on PR head.
- Standalone build artifact inspection on PR head.
- Neutral sparse numerical equivalence on PR head.
- Real native production solve on PR head.
- Compatibility after incorporating newer unrelated `main` commits.
- Results/recovery/support-action/code-stress semantics, intentionally deferred.

## Known / Deferred Work and Forward Sequence

### Open defects

No additional confirmed defect beyond ISS-001; implementation awaits runtime closure evidence.

### Deferred improvements

- IMP-001 — governed Results/recovery authority.
- IMP-002 — semantic History/Compare.
- persistence namespace and product dossier/export hardening.
- physical extraction after behavioral/architecture proof.

### Open risks

- RISK-001 — exact-head runtime qualification NOT_RUN.
- RISK-002 — branch/main divergence before ready-for-review.

### Open engineering questions

- QST-001 — safest latest-main synchronization strategy after standalone qualification.

### Accepted technical debt

None newly accepted. Deferred roadmap work is not silently classified as acceptable debt.

### Recommended Forward Sequence

1. Run exact-head standalone aggregate.
2. Record exact PR head and every PASS/FAIL in this report.
3. Synchronize latest `main` without unrelated cleanup; rerun relevant qualification.
4. Implement governed Results authority consuming only CURRENT qualified raw execution.
5. Implement History/semantic comparison after quantity/result authority contracts are established.
6. Harden persistence/dossier/export with stale/export fail-closed rules.
7. Perform physical extraction last and prove LFEA with LAFEA physically unavailable.

## Next-Agent Handover

**Current stopping point**  
Draft PR #1035 exists. Standalone bootstrap, governed Source→Review→Model, reviewed raw B-3.3 execution, CURRENT/STALE authority, and neutral sparse ownership are implemented. Runtime qualification is the active gap.

**PR / branch / HEAD**  
PR #1035 / `agent/lfea-standalone-s1-1024` / authoritative SHA is the PR head from GitHub; last pre-report-finalization observation: `6e86ee7cda1b5ed996ba4a6e0b4435e139476254`.

**Last completed stage**  
Stage 3 — changed-file/repository-state verification.

**Current active stage**  
Stage 4 — exact-head standalone qualification.

**Start here**  
Run `node scripts/run-lfea-standalone-check.mjs` on exact PR head. If any sub-check fails, register/update an ISS/RISK item before production changes.

**Do not redo**

- Do not bypass or recreate the native execution gate.
- Do not reintroduce `lafea-linear-solve` into the LFEA/general solver closure.
- Do not add result recovery until exact-head raw execution qualifies.
- Do not promote STALE retained evidence as current.

**Do not assume**

- committed checks have run;
- branch is current with `main`;
- raw solver status qualifies recovered/support/code values;
- static review is release proof.

**Files currently involved**

- `src/lfea/native-execution-authority.js`
- `src/lfea/bootstrap.js`
- `src/core/linear-piping-analysis-consumer/inputxml-linear-production-executor.js`
- `src/core/linear-piping-analysis-consumer/inputxml-linear-execution-elements.js`
- `src/core/linear-fea-solver/{assembly,factorization,qualification,solve}.js`
- `src/core/shared-linear-solve/*`
- standalone aggregate and targeted execution/dependency/equivalence checks

**Known failing checks**  
None known. Checks are NOT_RUN, not PASS.

**Validation still required**  
Complete standalone aggregate at exact PR head; repeat relevant exact-head qualification after latest-main synchronization.

**Open QST-* items**  
QST-001 — latest-main synchronization strategy.

**Important deferred IMP-* items**  
IMP-001 Results authority; IMP-002 semantic History/Compare.

**Highest-risk remaining item**  
Exact-head runtime/numerical validation after neutral sparse extraction and production execution activation.

**Exact next recommended action**  
Execute the standalone aggregate at PR head and record every result; stop on failure rather than weakening a guard.

**Required reading**

- Issue #1024.
- Common `CodingRules.md` at `43eccc27967ecec7d67513c08255398b496be5ce`.
- `agents/PR1035_workreport.md`.
- `src/core/linear-piping-analysis-consumer/inputxml-linear-governed-solve.js`.
- `src/lfea/native-execution-authority.js`.
- `src/core/linear-piping-analysis-consumer/inputxml-linear-production-executor.js`.
- `scripts/run-lfea-standalone-check.mjs`.

## Stage Execution Log

### Stage 1 — reconstructed report initialization

**Implementation performed:** created the living report after implementation had already started; reconstructed current engineering truth from repository history/source evidence.

**Deviation from plan:** CodingRules requires `PR_PENDING` before production changes. The rule was introduced to this work after those changes were already made. The deviation is recorded explicitly rather than hidden or backdated.

**Validation performed:** static source/architecture and commit-diff review only.

**New findings:** RISK-001, RISK-002, QST-001.

**Stage decision:** COMPLETE for reconstruction.

### Stage 2 — PR allocation + report synchronization

**Implementation performed:** created `agents/PR_PENDING_workreport.md`, opened draft PR #1035, created `agents/PR1035_workreport.md`, and removed the pending report path.

**Validation performed:** GitHub metadata confirms draft PR with expected head/base.

**Stage decision:** COMPLETE.

### Stage 3 — changed-file verification

**Implementation performed:** fetched GitHub's PR changed-file list before and after report rename.

**Actual behavior:** 39 paths before and 39 after. The only path substitution was the required pending→numbered report rename. All post-rename paths are represented in the ledger.

**Validation performed:** filename-by-filename reconciliation.

**Remaining risks:** RISK-001 and RISK-002.

**Stage decision:** COMPLETE.

## Process Notes / Lessons Learned

- A bootstrap/UI split is insufficient proof of product separation: native execution activation exposed a transitive numerical dependency on an LAFEA-owned package.
- Application currentness must be separate from immutable engineering evidence; otherwise historical evidence can accidentally become current authority.
- Numerical primitive extraction must preserve failure metadata as well as successful outputs because pivot-location evidence participates in fail-closed diagnostics.
- A committed test is evidence of intended validation, not evidence that validation ran.

## Handover Appendix

- **PR:** #1035 (draft)
- **Branch:** `agent/lfea-standalone-s1-1024`
- **Source issue:** #1024
- **Implemented boundary:** standalone LFEA + governed Source→Review→Model + reviewed native raw B-3.3 solve + CURRENT/STALE authority.
- **Key architectural fix:** general LFEA solver no longer imports executable sparse primitives from the LAFEA-owned package; neutral primitives are under `shared-linear-solve`.
- **Engineering boundary:** raw execution only. Recovery, support actions, code stress, Results, History/Compare, persistence, dossier/export, and physical extraction remain deferred.
- **Changed-file truth:** post-rename PR list is 39 files; 39/39 are reconciled in this report.
- **Validation truth:** static/diff review PASS; exact-head executable checks NOT_RUN.
- **Main drift:** latest observed `main` has 18 unrelated commits after merge base.
- **Highest risk:** exact-head numerical/runtime qualification.
- **Next action:** run `node scripts/run-lfea-standalone-check.mjs` on exact PR head, record results, then reconcile base drift before ready-for-review.
