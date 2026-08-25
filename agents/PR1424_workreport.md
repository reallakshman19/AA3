# PR1424 — Load Calc Validate Input progress visibility

## Recovery header

- Repository: `reallaksh19/Advanced_Analysis`
- Source issue: #1422
- PR: #1424 (draft)
- Branch: `agent/issue-1422-validate-input-progress`
- Base / merge base: `9887ec1c3eb6184c0d590841b23c04ed449f9414`
- Main last re-grounded: `9887ec1c3eb6184c0d590841b23c04ed449f9414`
- Implementation head before this recovery refresh: `7699afc56478048a226cb9770c842ce851ffd1c9`
- Divergence before this recovery refresh: ahead 26 / behind 0
- Work intent: IMPLEMENT
- Criticality: ENGINEERING_CRITICAL
- Merge authority: OWNER_ONLY
- Owner mutation instruction: `Start coding` on 2026-08-25
- Current disposition: IMPLEMENTATION_COMPLETE / REQUIRED_EXECUTION_VALIDATION_NOT_RUN

## Handover in 60 seconds

Issue #1422 is implemented in draft PR #1424 without changing checker readiness, solver/load mechanics, master-data engineering authority, sealing, authorization, execution eligibility, benchmarks, tolerances, or workflows.

The PR now:

1. preserves checker-owned coverage details through workspace status;
2. shows truthful partial progress in the primary Validate Input root-cause list;
3. exposes every unresolved entity/reason directly from that primary list;
4. distinguishes shared causes, single-scope causes, and gate rollups;
5. routes MASS / SECTION / FLEXURAL coverage causes to Enrichment and `MASTER_NOT_READY` to Import Masters;
6. discloses from Enrichment which Validate Input causes staged **and accepted** records provide evidence for;
7. keeps the calculation BLOCKED until checker `missing.length === 0`;
8. adds a genuine partial-coverage Playwright regression and a deterministic anti-drift projection script.

A final source review found one real closure defect after the first implementation pass: `NonFeaEnrichmentStore.acceptProposal()` correctly replaced the staged message with `Accepted exact enrichment record ...`, which unintentionally removed the new cause-aware feedback after acceptance. This was fixed in the **view layer**, not the engineering-authority store: the view captures the proposal records before the authoritative accept, performs the existing store operation unchanged, then writes a user-facing message naming the affected Validate Input causes and stating that the checker must re-evaluate before any blocker is considered cleared. The focused E2E now asserts this acceptance-time message.

Coding scope is complete again. Do **not** merge or mark ready-for-review: required real-checkout validation is still `NOT_RUN` because the current execution environment cannot materialize the repository/dependency graph. No `NOT_RUN` is represented as PASS.

## Exact repository state at this recovery refresh

- Live `main`: `9887ec1c3eb6184c0d590841b23c04ed449f9414`.
- Implementation head before this recovery-record commit: `7699afc56478048a226cb9770c842ce851ffd1c9`.
- Merge base equals live main.
- Ahead 26 / behind 0 before this recovery-record commit.
- PR is open, draft, mergeable, not merged.
- Effective changed paths remain exactly 9.
- Protected `src/core/non-fea-common-checker/index.js` is absent from the PR diff.
- No `.github/workflows/**`, solver/load-distribution, benchmark/tolerance, or engineering master-authority implementation file is changed.
- #1421 remains superseded by #1422.
- Coordination remains SAFE based on the last overlap checks.

## Production trace / first wrong boundary

```text
renderEmpiricalPreflightView()
  -> evaluateCurrentNonFeaInputCheckStatus()
  -> evaluateCurrentNonFeaCommonInput()
  -> NonFeaCommonInputStore.evaluate()
  -> runPreFeaPipingCheck()
  -> createEvaluationContext()
  -> analyzeModelCoverage()
  -> coverageResult()
  -> coverageRequirement()
  -> report.methodRows[].requirements[].details
  -> commonInputStatus()
  -> createNonFeaWorkspaceStatusProjection()
  -> normalizeCommonInput()
  -> status.commonInput.methodRows[]
  -> rootCauseMarkup()
```

On base main, `coverageResult()` already retained `total / covered / missing / ready`; `coverageRequirement()` retained this as structured `details`. The first information-loss boundary was `commonInputStatus()` in `src/workspace/non-fea-analysis-plan-runtime.js`, which reduced method results to `methodId / state / blockerCodes`. The checker was not the missing-data defect.

## Implemented closure

### 1. Structured coverage custody

`src/workspace/non-fea-analysis-plan-runtime.js`

- Retains blocked `MASS_COVERAGE`, `FLEXURAL_COVERAGE`, and `SECTION_COVERAGE` requirement evidence.
- Projects exact checker-owned `requirementId`, `state`, `code`, `total`, `covered`, `missing`, `ready`.
- Does not reinterpret readiness.

`src/core/non-fea-common-checker/workspace-status-projection.js`

- Normalizes `coverageRequirements` on method rows.
- Fails closed on invalid counts, duplicate missing tokens, `ready/missing` contradiction, or state/readiness contradiction.
- Existing gate/lifecycle/seal/authorization/execution semantics remain unchanged.

### 2. Truthful partial progress and direct entity detail

`src/workspace/non-fea-input-check-view.js`

- Builds display-only progress from structured status evidence.
- MASS coverage is treated specially for presentation because one component may contribute multiple missing obligations. The final `:<reason>` suffix is separated from the component ID, so one component remains one unresolved entity while all missing obligations are still shown.
- Displays:
  - governed entity count;
  - unique resolved entity count;
  - unique unresolved entity count;
  - raw missing-evidence obligation count;
  - checker `covered` value as retained evidence.
- Shows every unresolved entity/reason in a complete scrollable disclosure directly inside the primary cause row.
- Does not cap/truncate the list while presenting the result as complete.
- If the same coverage code has inconsistent structured evidence across method scopes, numeric progress is suppressed and a conflict warning is shown; the calculation remains blocked.

Encoded partial fixture:

```text
initial:
  governed entities = 3
  checker covered = 0
  unique resolved entities = 1
  unique unresolved entities = 2
  missing obligations = 3
  state = BLOCKED

after accepting only PIPE-B operating-fluid evidence:
  governed entities = 3
  checker covered = 1
  unique resolved entities = 2
  unique unresolved entities = 1
  missing obligations = 2
  state = BLOCKED
```

The difference between checker `covered` and displayed unique resolved entities is deliberate and disclosed; MASS `missing` is an obligation list, not always a unique-component list.

### 3. Cause classification

Primary `What needs attention` distinguishes:

- `SHARED CAUSE` — same cause affects 2+ method/data scopes;
- `SINGLE CAUSE` — one scope only;
- `GATE ROLLUP` — a derived gate state that clears when underlying causes clear.

Single-scope causes are not hidden merely because they are not shared.

### 4. Forward navigation

One presentation-owned action map routes:

- `MASS_COVERAGE_INCOMPLETE` -> Enrichment & Overrides;
- `SECTION_COVERAGE_INCOMPLETE` -> Enrichment & Overrides;
- `FLEXURAL_COVERAGE_INCOMPLETE` -> Enrichment & Overrides;
- live emitted `MASTER_NOT_READY` -> Import Masters.

Issue #1422 mentions `MASTER_NOT_CURRENT`; live status projection emits `MASTER_NOT_READY`. PR #1424 follows the live contract.

### 5. Reverse Enrichment feedback, including acceptance-time closure

`src/workspace/enrichment/non-fea-enrichment-view.js`

- Adds `Open Validate Input` using the existing delegated `data-load-calc-tab="preflight"` contract.
- Proposal and accepted-record tables disclose which coverage cause(s) each governed field can provide evidence for.
- Generated-master and fitting proposal messages name affected Validate Input causes where the field-to-cause dependency is statically known.
- Boundary text states these labels are dependency disclosures only and **only the common checker can clear a blocker**.
- No new checker/evaluation logic is introduced into Enrichment.

Acceptance-time defect found and closed during final review:

```text
BEFORE:
  stage proposal -> cause-aware message
  accept proposal -> store message overwrites it with plain
                     "Accepted exact enrichment record ..."

AFTER:
  view captures proposal record
  -> existing store accept executes unchanged
  -> view-only message states accepted record + affected cause(s)
  -> explicitly requires Validate Input checker re-evaluation
```

Single accept and `Accept all unblocked` both preserve this feedback. `non-fea-enrichment-store.js` is unchanged and remains engineering-authority infrastructure with no UI blocker taxonomy added.

Source verification against `LoadCalcConsumerController.handleClick()` confirms descendant `data-load-calc-tab` actions delegate through `selectTab()` and rerender, and `renderDeferredPane()` has real `preflight` and `enrichment` branches.

### 6. Regression coverage

`scripts/non-fea-input-check-coverage-projection-check.mjs`

- Partial and nearly-resolved states retain the same blocker code and remain BLOCKED.
- Different missing sets produce different status semantic identity.
- Rejects `ready=true` while missing evidence exists.
- Rejects `state=READY` while coverage `ready=false`.
- Rejects duplicate missing evidence.
- Pins source anti-drift for `coverageResult(): ready: normalized.length === 0`.
- Pins MASS / SECTION / FLEXURAL forward action mapping and Enrichment dependency mapping.

`e2e/non-fea-input-check-coverage-progress.spec.js`

- Uses a genuine partial three-pipe model.
- Proves one pipe may have two MASS obligations while counting as one unresolved entity.
- Asserts the initial and updated progress numbers.
- Asserts the actual Load Calc Run button remains disabled throughout partial progress.
- Asserts `SHARED CAUSE`, `SINGLE CAUSE` legend, and `GATE ROLLUP` presentation.
- Navigates MASS -> Enrichment via the real root-cause button.
- Asserts staged proposal and accepted-record cause disclosure.
- **Now also asserts the post-acceptance message names `MASS_COVERAGE_INCOMPLETE` and says Validate Input must re-evaluate before a blocker can be considered cleared.**
- Stages and rejects a `PIPE_OUTER_DIAMETER` proposal solely to verify SECTION + FLEXURAL + MASS reverse dependency disclosure without changing engineering authority.
- Navigates Enrichment -> Validate Input through the real button.

## Protected invariants

Hard constraints unchanged by PR #1424:

- `coverageResult().ready === (missing.length === 0)`.
- `coverageRequirement()` READY/BLOCKED semantics.
- Common method readiness.
- Qualification profile semantics.
- Common-input seal semantics.
- Calculation authorization/execution eligibility.
- Solver and load-distribution mechanics.
- Engineering master-data authority.
- Benchmark values, tolerances, and expected results.
- Workflow definitions.

## Engineering rationale

Partial progress is workflow information, not an acceptance criterion. One unresolved entity can dominate self-weight or support reaction — e.g. a heavy valve — and a missing fluid or insulation obligation can materially alter distributed weight. Therefore `2 of 3 resolved` must remain BLOCKED if the third governed entity still lacks required evidence.

Concrete falsifier: three governed components, two complete, one heavy valve without `COMPONENT_WEIGHT`. The UI may show `2 of 3 governed entities resolved`; if MASS becomes READY or Run becomes enabled, this PR is invalid.

## Failure-isolation order

If displayed progress disagrees with accepted enrichment evidence, isolate before patching:

1. `resolveNonFeaEnrichment` — did accepted evidence resolve into the ledger?
2. `analyzeModelCoverage` — did projected evidence satisfy the exact checker requirement?
3. presentation — is correct structured evidence displayed incorrectly?

Do not change counts or readiness from the UI to conceal an upstream mismatch.

## Validation ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| live main exact head | PASS | `9887ec1c3eb6184c0d590841b23c04ed449f9414` | GitHub source inspection |
| branch divergence | PASS | ahead 26 / behind 0 before this recovery refresh | GitHub compare |
| changed-path reconciliation | PASS | exactly 9 expected paths | GitHub compare |
| protected checker `index.js` unchanged | PASS | absent from PR file list | GitHub compare |
| protected solver/load/workflow paths unchanged | PASS | absent from PR file list | GitHub compare |
| cross-tab event integration | PASS_SOURCE_INSPECTION | delegated `data-load-calc-tab`; both panes exist | source inspection |
| acceptance-time feedback diagnosis | PASS_SOURCE_INSPECTION | store plain accept message was overwriting staged cause feedback | source inspection |
| acceptance-time feedback correction | PASS_SOURCE_INSPECTION | view preserves cause-aware message after existing authoritative store accept; store unchanged | PR diff inspection |
| #1422 DoD reconciliation | PASS_SOURCE_INSPECTION | all four DoD groups have implementation + encoded regression | source inspection |
| reconstructed coverage normalization/presentation | PASS_RECONSTRUCTED_LOCAL | exact new logic produced `1/3 -> 2/3` unique progress and rejected readiness/state contradictions | Node 22.16.0 local reconstruction |
| direct git clone | FAIL_ENVIRONMENT | `Could not resolve host: github.com`; direct outbound HTTPS also unavailable | local environment |
| exact-head automatic GitHub workflows | NOT_APPLICABLE_TO_1422 | only unrelated EMP.1/LFEA workflows ran; all failed and do not execute #1422 required checks | GitHub Actions inspection |
| `node scripts/non-fea-input-check-coverage-projection-check.mjs` in real checkout | NOT_RUN | no real checkout available | NONE |
| `node scripts/advanced-shell-contract-check.mjs` | NOT_RUN | no real checkout available | NONE |
| focused new Playwright E2E | NOT_RUN | no checkout/dependency graph available | NONE |
| existing `e2e/non-fea-input-check-load-calc.spec.js` | NOT_RUN | no checkout/dependency graph available | NONE |
| `npm run check:workspace-contracts` | NOT_RUN | no checkout/dependency graph available | NONE |

Chromium exists locally at `/usr/bin/chromium`; browser absence is not the blocker. The blocker is faithful repository/dependency materialization.

Existing workflows do not provide a substitute:

- repository workflow search found no workflow explicitly invoking `advanced-shell-contract-check.mjs` for this path and no workflow invoking `check:workspace-contracts`;
- the Engineering Table workflows demonstrate an exact-head checkout/npm-ci/Playwright pattern but are path-filtered to unrelated topology-table work;
- a `workflow_dispatch` entry exists for Engineering Table, but the connected GitHub interface provides no workflow-dispatch action;
- modifying `.github/workflows/**` merely to manufacture validation is outside the protected scope and is not authorized.

No partial reconstruction is treated as an actual advanced-shell PASS because that script also asserts filesystem absences; a partial tree could falsely satisfy those checks.

## Appendix A status

### A1 — Production trace

PASS by current source inspection. Exact trace and first information-loss boundary are documented above.

### A2 — Current failure isolation

Repository-retained #1419 evidence records mass-gap progress `148 -> 88 -> 45 -> 31 -> 5` while the old primary root cause remained structurally code/method-count based. PR #1424 adds a genuine partial three-pipe browser case, but fresh real-browser execution in this environment remains NOT_RUN.

### A3 — Authority / invariant

PASS. Partial completion cannot authorize downstream load calculation. Heavy-component/fluid/insulation omissions can materially alter reactions. Falsifier documented above.

### A4 — Independent validation

FAIL / NOT QUALIFIED in this environment. Required real-checkout commands remain NOT_RUN. Reconstructed local execution and source inspection are supplementary only.

### A5 — Minimal patch / falsifier

PASS by source inspection. Structured evidence is preserved and presented without touching checker readiness. Falsifier: different missing sets still render identical progress, or any missing state becomes runnable.

### Qualification verdict

`APPENDIX_A_QUALIFIED = false` because A4 does not meet the required minimum. Owner `Start coding` authority authorized mutation only; it is not validation authority.

## Active ledger

- ISS-1422-01 — IMPLEMENTED / execution validation pending: structured coverage survives workspace projection.
- ISS-1422-02 — IMPLEMENTED / execution validation pending: primary entity/reason detail.
- ISS-1422-03 — IMPLEMENTED / execution validation pending: shared/single/rollup distinction.
- ISS-1422-04 — IMPLEMENTED / execution validation pending: all coverage-style causes have owning-tool navigation.
- ISS-1422-05 — IMPLEMENTED / execution validation pending: Enrichment reverse field-to-cause disclosure.
- ISS-1422-06 — **CLOSED / execution validation pending**: acceptance overwrote cause-aware feedback; corrected in view after authoritative accept, with store unchanged and E2E assertion added.
- RISK-1422-01 — MITIGATED: unique unresolved entities derived separately from raw obligations.
- RISK-1422-02 — MITIGATED_BY_CONTRACT: coverage changes alter deterministic status evidence without changing readiness.
- RISK-1422-03 — OPEN: browser/workspace integration is encoded but not executed in a real checkout.
- RISK-1422-04 — OPEN: automatic workflows on this head are unrelated and failing; they are not #1422 evidence.
- DEC-1422-01 — checker readiness semantics immutable.
- DEC-1422-02 — unique-entity progress is presentation-only.
- DEC-1422-03 — use live `MASTER_NOT_READY`, not stale issue token `MASTER_NOT_CURRENT`.
- DEC-1422-04 — Enrichment cause mapping is dependency disclosure, never readiness authority.
- DEC-1422-05 — acceptance feedback belongs in the view; do not couple `NonFeaEnrichmentStore` to Validate Input UI taxonomy.

## Changed-file ledger

1. `agents/PR1424_workreport.md` — living recovery/evidence record.
2. `agents/claims/PR1424.yaml` — active mutation claim.
3. `agents/status/PR1424.yaml` — machine-readable delivery state.
4. `src/workspace/non-fea-analysis-plan-runtime.js` — checker coverage evidence projection.
5. `src/core/non-fea-common-checker/workspace-status-projection.js` — fail-closed coverage normalization.
6. `src/workspace/non-fea-input-check-view.js` — progress/detail/grouping/forward navigation.
7. `src/workspace/enrichment/non-fea-enrichment-view.js` — reverse dependency and acceptance feedback/navigation.
8. `scripts/non-fea-input-check-coverage-projection-check.mjs` — focused anti-drift contract.
9. `e2e/non-fea-input-check-coverage-progress.spec.js` — genuine partial-coverage browser regression.

No protected source path is in this ledger.

## Next-agent expert questionnaire

Before taking authority, answer from live repository state:

1. What are current main, PR head, merge base, and ahead/behind counts? Has an overlapping claim/PR appeared?
2. Is `src/core/non-fea-common-checker/index.js` still absent from the PR diff, and does `coverageResult()` still use `ready: normalized.length === 0`?
3. Why can MASS checker `covered` differ from displayed unique resolved entity count? Demonstrate with one pipe missing both `PIPE_MASS` and `OPERATING_FLUID`.
4. Which exact status field carries structured coverage evidence, and which contradictions does its normalizer reject?
5. Which blocker codes navigate to Enrichment / Import Masters, and why is `MASTER_NOT_READY` used?
6. Why can Enrichment state that an accepted record **provides evidence for** a cause but not state the cause is cleared?
7. Trace the acceptance click: which store method remains authoritative, and where is the cause-aware message added after acceptance?
8. Run and paste the actual outputs of the required commands below. Do not inherit this report's `NOT_RUN` as PASS.
9. In the focused E2E, prove both the progress change and that `[data-load-calc-run]` remains disabled.
10. If any required command fails, record exact output/root cause here before modifying production logic.

## Required next commands in a faithful real checkout

```bash
node scripts/non-fea-input-check-coverage-projection-check.mjs
node scripts/advanced-shell-contract-check.mjs
npm run check:e2e -- e2e/non-fea-input-check-coverage-progress.spec.js
npm run check:e2e -- e2e/non-fea-input-check-load-calc.spec.js
npm run check:workspace-contracts
```

## EXACT_NEXT_ACTION

Obtain a faithful checkout of PR #1424, re-ground main/overlap, run the five commands above verbatim, record their exact outputs in this workreport, and fix only evidenced failures. Mark review-ready only if all required validation is genuinely green. Do not merge without owner authority.
