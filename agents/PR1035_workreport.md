# PR1035 — LFEA Standalone Engineering Work Report

## PR Mission Control

| Field | Current value |
|---|---|
| Mission | Separate LFEA into an independently bootable/testable/releasable application while preserving governed engineering authority from source through raw execution and recovered Results. |
| Source task / issue | Advanced_Analysis #1024 — LFEA Standalone Application — separation, product hardening, and next-level roadmap |
| PR number | 1035 |
| Branch | `agent/lfea-standalone-s1-1024` |
| Base | PR targets `main`; recorded separation merge base `f8486ee75c39c33483742607b7d18ee42ebcde5d` |
| PR status | DRAFT |
| Current stage | Stage 5 — governed Results authority |
| Last completed stage | Stage 3 — changed-file / repository-state verification; Stage 4 is PARTIAL and remains an open release gate |
| Engineering status | Standalone Source→Review→Model→authorized raw B-3.3 execution is IMPLEMENTED. Stage 5 will add governed B-3.4 recovery/Results only; History/Compare remain DEFERRED. |
| Validation status | `main-gate`: PASS at `818c3df1c242a37be20159e6f5592cf1c41766a6`. Two narrow LFEA exact-head workflows: FAIL before product tests because their fixed scope/custody assumptions do not admit this broad PR. Standalone aggregate: NOT_RUN. |
| Current blocker | Exact standalone aggregate remains unexecuted; this keeps the PR draft but does not indicate a numerical failure. |
| Exact next action | Implement Stage 5 so only CURRENT qualified raw execution can create sealed B-3.4 recovery; expose raw and recovered authority separately; add focused checks; then inspect exact-head Actions. |

> The report cannot embed the SHA of the commit containing itself without becoming self-referential. The authoritative current HEAD is the GitHub PR/branch ref.

## Handover in 60 Seconds

**What is now true**

- LFEA boots from an independent entry/build path.
- Native InputXML Source → Review → Model state is projected from governed sealed records.
- `runNativeAnalysis()` reaches raw production solve only through `solveInputXmlLinearAnalysis()`.
- Raw executions are immutable sealed `fea-linear-execution/v1` evidence with separate CURRENT/STALE application authority.
- The general B-3.3 solver uses neutral `shared-linear-solve` primitives rather than LAFEA-owned runtime code.
- Exact-head GitHub checkout exists. `main-gate` passed at `818c3df1…`.
- `lfea-linear-core-exact-head` failed only at its changed-path allowlist (`.gitignore`) before numerical tests.
- `LFEA WP-PF1 exact-head qualification` failed only because it is hard-bound to a historic two-commit candidate chain before product tests.

**What is being worked on**

- Stage 5: CURRENT qualified raw execution → governed B-3.4 recovery → Results projection.

**What remains unfinished**

- Standalone aggregate execution on exact PR head.
- Support-action publication, B31/code application, History/Compare, persistence, dossier/export hardening, final standalone build identity/physical extraction.

**What must not be assumed**

- A narrow workflow failure before tests is a numerical/product failure.
- Raw B-3.3 qualification qualifies recovered/support/code quantities.
- STALE raw execution or recovery is current engineering authority.
- Recovery local actions are interchangeable with global reactions or support-action Fa/Fl/Fv.

**Highest-risk remaining item**

- Exact-head executable qualification of the full standalone path after recovery is connected.

**Exact next action**

- Implement the Stage 5 plan below without History/Compare or code-stress scope expansion.

## Mission and Engineering Intent

### Mission

Deliver an LFEA-owned product boundary in which each engineering stage has explicit identity and authority: source custody, reviewed model preparation, authorized raw execution, and governed recovery.

### Engineering consequence

The UI must never collapse different physical/result meanings into a generic “result”. Raw solver displacement/reaction, recovered local/global element actions, later support-action projections, and later code-applied quantities remain different authority stages with different comparison semantics.

### Current Stage 5 scope

- consume only CURRENT `QUALIFIED`/`CONDITIONAL` native raw execution;
- reconstruct the exact sealed B-3.1 frame-element evidence used for that case and cross-check its ledger against raw execution custody;
- apply one explicit production B-3.4 recovery profile;
- call existing `compileResultRecovery()`;
- retain a sealed per-case recovery batch bound to exact raw execution/source/model/load/profile identities;
- expose raw execution and recovered local/global actions separately in Results;
- invalidate current Results when the raw execution ceases to be CURRENT;
- add focused authority, stale, lineage, recovery and source-guard checks.

### Explicit non-goals for Stage 5

- support-action Fa/Fl/Fv publication;
- B31/code stress, allowable, utilization, envelope or combination evaluation;
- History or semantic comparison;
- persistence/dossier/export;
- workflow-file changes;
- solver, stiffness, recovery equations or tolerance-policy tuning for test convenience.

### Governing principles

1. External source identity is verified, never silently reminted.
2. UI state does not grant execution or recovery authority.
3. Parent lineage changes invalidate current downstream authority.
4. Historical/stale evidence is not rewritten into current evidence.
5. Raw and recovered quantities remain visibly distinct.
6. No hidden engineering defaults or silent fallback profiles.
7. No new runtime coupling to LAFEA.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Standalone entrypoint/shell/build | P0 | IMPLEMENTED | prior | `lfea.html`, `src/lfea/*`, `vite.lfea.config.js` |
| Governed Source→Review→Model | P0 | IMPLEMENTED | prior | native InputXML custody/pre-FEA chain |
| Reviewed raw B-3.3 execution | P0 | IMPLEMENTED | prior | governed solve + production executor |
| CURRENT/STALE raw execution | P0 | IMPLEMENTED | prior | `native-execution-authority.js` |
| Neutral sparse runtime ownership | P0 | IMPLEMENTED | prior | `shared-linear-solve/*` |
| Changed-file reconciliation | P0 | VALIDATED | Stage 3 | 39/39 at prior reconciliation |
| Exact standalone aggregate | P0 | BLOCKED | Stage 4 | NOT_RUN; legacy narrow workflows fail before tests |
| Governed B-3.4 recovery/Results | P0 | IN_PROGRESS | Stage 5 | planned below |
| Support actions / B31 / code results | P1 | DEFERRED | later | intentionally excluded |
| History / Compare | P1 | DEFERRED | later | intentionally excluded |
| Persistence / dossier / extraction | P1 | DEFERRED | later | intentionally excluded |

## Engineering Item Register

| ID | Type | Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| ISS-001 | defect | P0 | IMPLEMENTED | General B-3.3 solver depended on LAFEA-owned sparse runtime primitives. | Yes |
| DEC-001 | decision | P0 | ACCEPTED | Native runtime is reachable only below `solveInputXmlLinearAnalysis()`. | Yes |
| DEC-002 | decision | P0 | ACCEPTED | Raw execution is a distinct authority stage, not recovered/code authority. | Yes |
| DEC-003 | decision | P0 | ACCEPTED | CURRENT/STALE state is application authority separate from immutable evidence. | Yes |
| DEC-004 | decision | P0 | ACCEPTED | Shared sparse primitives are neutral production dependencies; LAFEA package remains intact for LAFEA consumers. | Yes |
| DEC-005 | decision | P0 | ACCEPTED | Stage 5 promotes the already B-3.4-qualified baseline recovery policy explicitly: 5 force-field stations/span, `1e-6` code-point consistency tolerance, local+global actions retained. The production profile will have its own named source/identity and will be shown in Results; no hidden fallback/override. | Yes |
| DEC-006 | decision | P0 | ACCEPTED | Recovery may be created only from CURRENT qualified native raw execution. Recovery currentness is bound to the exact raw execution batch; stale raw authority makes current recovery unavailable without mutating retained recovery evidence. | Yes |
| DEC-007 | decision | P0 | ACCEPTED | Stage 5 Results expose raw displacement/reaction and B-3.4 recovered local/global element actions as separate authorities; support-action and code quantities are not derived here. | Yes |
| RISK-001 | risk | P0 | BLOCKED | Full standalone aggregate remains NOT_RUN on exact PR head. | Yes |
| RISK-002 | risk | P1 | INVESTIGATING | PR must still be reconciled with latest `main` before ready-for-review. | Yes |
| RISK-003 | risk | P1 | ACCEPTED | Existing narrow exact-head LFEA workflows are not valid broad-PR qualification oracles: one has a fixed path allowlist, another a fixed historic commit chain. They are retained unchanged per no-workflow-change rule. | Yes |
| IMP-001 | improvement | P0 | IN_PROGRESS | Governed Results/recovery authority consuming only CURRENT qualified raw execution. | Yes |
| IMP-002 | improvement | P1 | DEFERRED | Semantic History/Compare after result authority contracts exist. | No |
| QST-001 | question | P1 | INVESTIGATING | Safest synchronization with latest `main` before ready-for-review. | Yes |

## Engineering Decisions / Invariants

| Invariant | Enforcement | Validation status |
|---|---|---|
| Reviewed execution mandatory | governed solve gate | PASS static; targeted runtime check committed |
| STALE raw run cannot act current | native execution authority | PASS static; targeted runtime check committed |
| Recovery requires exact current raw execution | Stage 5 results authority | IN_PROGRESS |
| Recovery cites exact model/stiffness/load/execution | existing B-3.4 validator + Stage 5 custody | IN_PROGRESS |
| Raw vs recovered remain distinct | Results projection/view | IN_PROGRESS |
| No local e2/e3 → support Fa/Fl/Fv derivation | no support-action code in Stage 5 | design guard planned |
| No hidden recovery defaults | explicit named production recovery profile + UI profile evidence | IN_PROGRESS |
| No LAFEA runtime dependency | standalone boundary + neutral solver guard | IMPLEMENTED; aggregate NOT_RUN |

## Stage Roadmap and Protocol

### Stage 1 — report reconstruction

Production work predated adoption of the referenced CodingRules. The deviation was recorded rather than backdated. **Decision: COMPLETE.**

### Stage 2 — PR allocation/report synchronization

Draft PR #1035 allocated; canonical numbered report established. **Decision: COMPLETE.**

### Stage 3 — changed-file verification

GitHub file list reconciled 39/39 after report rename. **Decision: COMPLETE.**

### Stage 4 — exact-head qualification

**Current truth:** PARTIAL, not complete.

**Evidence at `818c3df1c242a37be20159e6f5592cf1c41766a6`:**

- `main-gate`: PASS.
- `lfea-linear-core-exact-head`: FAIL in “Enforce changed-path containment” because `.gitignore` is outside that workflow's narrow linear-core allowlist; numerical test steps were skipped.
- `LFEA WP-PF1 exact-head qualification`: FAIL in “Verify exact head and custody chain” because it requires a fixed historic two-commit chain (`1d7dee…` → `dce5b32…`); product/pre-FEA checks were skipped.
- full `node scripts/run-lfea-standalone-check.mjs`: NOT_RUN.

**Decision:** PARTIAL. Keep RISK-001 open. Do not modify `.github/workflows/*` without Owner authorization.

### Stage 5 — governed Results authority

**Current truth:** IN_PROGRESS by Owner direction.

**Objective:** connect CURRENT qualified raw native execution to existing B-3.4 recovery and make raw vs recovered authority visible.

**Expected files:**

- `src/core/linear-piping-analysis-consumer/inputxml-linear-recovery-profile.js`
- `src/core/linear-piping-analysis-consumer/inputxml-linear-production-recovery.js`
- `src/lfea/native-results-authority.js`
- `src/lfea/native-results-view.js`
- `src/lfea/bootstrap.js`
- `src/lfea/standalone-layout.js`
- `src/lfea/standalone.css` if needed
- focused Stage 5 scripts and aggregate update
- this report

**Engineering rationale:** use the existing B-3.4 authority exactly as designed instead of deriving actions in the presentation layer. The recovery package already refuses blocked execution and mismatched model/load lineage.

**Planned implementation:**

1. Define one explicit production recovery profile from the existing B-3.4-qualified baseline; no runtime fallback and no hidden override.
2. For each current raw case, locate the exact retained physical load case and rebuild its sealed frame-element evidence through `compileInputXmlExecutionElementAuthorities()`.
3. Cross-check rebuilt frame-element ledger against the raw execution case ledger/profile identity.
4. Call `compileResultRecovery()` with exact compilation, execution, load case and frame elements.
5. Seal a recovery batch with raw execution batch identity and per-case recovery hashes.
6. Add application Results authority; fail if raw state is not CURRENT or not qualified/conditional.
7. Reconcile Results currentness whenever source/pre-flight/raw execution changes.
8. Render raw execution facts separately from recovered local/global action rows; show recovery profile/hash lineage.

**Edge cases:** stale raw state, current source cleared, unauthorized/unexecuted state, mismatched case/load hash, tampered element ledger, blocked raw execution, multiple cases, empty recovery, destroyed app.

**Planned validation:** focused recovery authority test, real native production solve→recovery test, stale invalidation, profile/ledger custody negative cases, source guard against presentation derivation/support/code scope, standalone aggregate inclusion, GitHub Actions inspection at new head.

**Known risks:** RISK-001 exact aggregate; production policy promotion must remain explicit and reviewable (DEC-005).

## Changed-File Ledger

The prior reconciled PR set had 39 files. Stage 5 will reconcile GitHub's changed-file list again after implementation. Existing engineering-sensitive groups remain:

| File / group | Purpose | Validation state |
|---|---|---|
| `src/lfea/*` | standalone composition, journey, raw execution authority | targeted checks committed; aggregate NOT_RUN |
| `src/core/linear-piping-analysis-consumer/inputxml-linear-*` | source/pre-FEA/raw execution custody | targeted checks committed |
| `src/core/linear-fea-solver/{assembly,factorization,qualification,solve}.js` | neutral sparse ownership | static diff PASS; equivalence NOT_RUN |
| `src/core/shared-linear-solve/*` | neutral numerical primitives | equivalence NOT_RUN |
| standalone scripts / fixture / Vite config / HTML / `.gitignore` | build/boundary/negative/qualification route | aggregate NOT_RUN |
| `agents/PR1035_workreport.md` | living mission, validation, handover | current |

Stage 5 additions will be listed individually at stage close. Any unexplained path blocks Stage 5 closure.

## Validation and Evidence Ledger

### Software validation

| Validation | Status | Head/evidence |
|---|---|---|
| `main-gate` | PASS | `818c3df1c242a37be20159e6f5592cf1c41766a6` |
| `lfea-linear-core-exact-head` | FAIL | same head; fails path containment on `.gitignore` before numerical tests |
| `LFEA WP-PF1 exact-head qualification` | FAIL | same head; fails fixed historic commit-chain assertion before product checks |
| LAFEA hybrid browser validation | PASS | same head; separate LAFEA workflow, not standalone LFEA qualification |
| standalone aggregate | NOT_RUN | no exact-head result yet |
| Stage 5 focused recovery checks | NOT_RUN | implementation pending |

### Engineering validation

| Property | Status | Evidence |
|---|---|---|
| source/review/run lineage is explicit | PASS static | existing governed records |
| raw current/stale boundary | PASS static | `native-execution-authority.js` |
| exact raw production profile custody | PASS static | production executor checks pre-flight profile hashes |
| B-3.4 recovery identity/model/load checks | PASS existing contract | `linear-fea-result-recovery/recovery.js` |
| production recovery profile identity | NOT_RUN | Stage 5 pending |
| current-only recovery | NOT_RUN | Stage 5 pending |
| raw vs recovered presentation honesty | NOT_RUN | Stage 5 pending |

### Explicitly not validated

- full exact-head standalone aggregate;
- Stage 5 production recovery path;
- latest-main integration;
- support-action/B31/code-result authority;
- History/Compare/persistence/dossier/extraction.

## Known / Deferred Work and Forward Sequence

1. Complete Stage 5 governed recovery/Results.
2. Run/obtain exact-head Stage 5 focused and standalone aggregate evidence; keep draft on failure/NOT_RUN.
3. Reconcile latest `main`; rerun relevant checks.
4. Implement support-action/code-result publication as later explicit authority stages, not presentation derivations.
5. Implement LFEA-owned immutable History and semantic Compare.
6. Isolate persistence, dossier/export and build identity.
7. Prove LFEA with LAFEA physically unavailable; extract repository last.

## Next-Agent Handover

**Current stopping point:** Stage 5 is prepared but production recovery code has not yet been written after this report update.

**PR / branch:** #1035 / `agent/lfea-standalone-s1-1024`.

**Last completed stage:** Stage 3. Stage 4 is PARTIAL and remains an open release gate.

**Current active stage:** Stage 5 — governed Results authority.

**Start here:** existing `compileResultRecovery()` in `src/core/linear-fea-result-recovery/recovery.js`; `compileInputXmlExecutionElementAuthorities()` already produces the exact sealed frame elements needed by recovery.

**Do not redo:** source/pre-FEA/run gate; raw executor; current/stale execution; neutral sparse extraction.

**Do not assume:** narrow workflow FAIL means numerical failure; Stage 5 has run; raw/recovered/support/code quantities are interchangeable.

**Validation still required:** Stage 5 focused checks and full standalone aggregate on exact head.

**Open QST:** QST-001 latest-main synchronization.

**Highest-risk remaining item:** exact-head executable standalone qualification after recovery integration.

**Exact next recommended action:** implement the explicit production recovery profile and governed recovery service, then wire app Results authority and focused checks.

**Required reading:** issue #1024; Common CodingRules at `43eccc…`; this report; `linear-fea-result-recovery/README.md`; `inputxml-linear-production-executor.js`; `native-execution-authority.js`.

## Stage Execution Log

### Stages 1–3

Report reconstruction, PR allocation and changed-file reconciliation completed. Initial CodingRules timing deviation was explicitly recorded because implementation began before the rules were supplied.

### Stage 4 — exact-head evidence discovery

GitHub Actions became visible after PR creation. `main-gate` passed at `818c3df1…`. The two failing LFEA exact-head workflows stopped at their narrow scope/custody assumptions before numerical/product checks. RISK-003 was registered; workflows remain unchanged because the Owner did not authorize workflow edits.

## Process Notes / Lessons Learned

- A UI/bootstrap split does not prove product separation; execution activation exposed a transitive numerical dependency that required neutral ownership.
- Currentness must be separate from immutable engineering evidence.
- A workflow labelled “exact-head” can still be an invalid oracle for a broader PR when it hard-codes changed-path or historic-parent custody assumptions; inspect the failing step before classifying engineering status.
- Recovery belongs behind the sealed B-3.4 contract; presentation code must not recompute engineering actions.

## Handover Appendix

- **PR:** #1035 draft.
- **Implemented:** standalone LFEA, governed Source→Review→Model, reviewed raw B-3.3 execution, CURRENT/STALE raw authority, neutral sparse ownership.
- **Active:** Stage 5 CURRENT qualified raw execution → governed B-3.4 recovery → Results.
- **CI truth:** `main-gate` PASS at `818c3df1…`; two narrow LFEA workflows FAIL before tests due scope/custody assumptions; standalone aggregate NOT_RUN.
- **Stage 5 authority rule:** no recovery from STALE raw evidence; no support/B31/code derivation in Results.
- **Profile rule:** production recovery profile is explicit, named and visible; no fixture-labelled hidden default.
- **Highest risk:** exact-head standalone executable qualification.
- **Next action:** implement Stage 5 and add focused evidence without History/Compare.