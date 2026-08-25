# PR1424 — Load Calc Validate Input progress visibility

## Recovery header

- Repository: `reallaksh19/Advanced_Analysis`
- Source issue: #1422
- PR: #1424 (draft)
- Branch: `agent/issue-1422-validate-input-progress`
- Base / merge base: `9887ec1c3eb6184c0d590841b23c04ed449f9414`
- Main last re-grounded: `9887ec1c3eb6184c0d590841b23c04ed449f9414`
- IMPLEMENTATION_HEAD before this workreport refresh: `445a022efd5b51dd3f2860ba01673fa1bb954bba`
- Work intent: IMPLEMENT
- Criticality: ENGINEERING_CRITICAL
- Merge authority: OWNER_ONLY
- Owner mutation instruction: `Start coding` on 2026-08-25
- Current disposition: IMPLEMENTATION_COMPLETE / REQUIRED_EXECUTION_VALIDATION_NOT_RUN

## Handover in 60 seconds

#1422 is implemented in draft PR #1424 without changing checker or execution authority. The checker already owned coverage evidence; this PR preserves that structured evidence through workspace status, renders truthful partial progress in the primary Validate Input blocker list, exposes every unresolved entity/reason there, labels shared causes / single-scope causes / gate rollups, and adds coherent Validate Input <-> Enrichment navigation and dependency disclosure.

The engineering invariant remains unchanged: any required missing evidence keeps the calculation blocked. The coding phase is complete. Do **not** merge or mark ready-for-review yet: the required repository commands are still `NOT_RUN` because this environment cannot clone/materialize the repository (`Could not resolve host: github.com`). A reconstructed local execution of the exact new coverage normalization/presentation functions passed, but that is not equivalent to the repository script or Playwright suite.

## Exact current repository state

- Live `main`: `9887ec1c3eb6184c0d590841b23c04ed449f9414`.
- PR implementation head before recovery refresh: `445a022efd5b51dd3f2860ba01673fa1bb954bba`.
- Compare: `ahead_by=22`, `behind_by=0`, merge base exactly current main.
- PR is open, draft, mergeable, not merged.
- Effective changed paths: exactly 9.
- No `.github/workflows/**`, solver/load-distribution, checker `index.js`, benchmark, tolerance, or master-authority implementation path is changed.
- #1421 remains superseded by #1422.
- Coordination remains SAFE; no overlapping production PR was found for the claimed projection/view paths during stage checks.

## Production trace and first wrong boundary

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

On base main, `coverageResult()` retained `total/covered/missing/ready`; `coverageRequirement()` retained this object as `details`. The first information-loss boundary was `commonInputStatus()` in `src/workspace/non-fea-analysis-plan-runtime.js`, which reduced each method to `methodId/state/blockerCodes`. The checker was not the defect.

## Implemented closure

### 1. Structured coverage custody

`src/workspace/non-fea-analysis-plan-runtime.js`

- Retains blocked `MASS_COVERAGE`, `FLEXURAL_COVERAGE`, and `SECTION_COVERAGE` requirement evidence.
- Projects exact checker-owned `requirementId`, `state`, `code`, `total`, `covered`, `missing`, `ready`.
- Does not reinterpret readiness.

`src/core/non-fea-common-checker/workspace-status-projection.js`

- Normalizes `coverageRequirements` on method rows.
- Fails closed on invalid counts, duplicate missing tokens, ready/missing contradiction, or state/readiness contradiction.
- Existing gate, lifecycle, seal, authorization, and execution semantics are unchanged.

### 2. Truthful partial progress and direct detail

`src/workspace/non-fea-input-check-view.js`

- Builds display-only progress from structured status evidence.
- MASS missing tokens are grouped by the final `:<reason>` suffix so one component with several missing obligations is one unresolved entity, not several entities.
- Displays both unique unresolved entity count **and** raw missing-evidence obligation count.
- Displays every unresolved entity/reason in a scrollable disclosure directly inside the primary cause row; there is no presentation cap pretending to be complete.
- If the same coverage cause presents inconsistent evidence across method scopes, progress is suppressed and a conflict warning is rendered while the calculation remains blocked.

Example encoded browser fixture:

```text
initial:
  governed entities = 3
  checker covered = 0
  unique resolved entities = 1
  unique unresolved entities = 2
  missing evidence obligations = 3
  state = BLOCKED

after accepting only PIPE-B operating-fluid evidence:
  governed entities = 3
  checker covered = 1
  unique resolved entities = 2
  unique unresolved entities = 1
  missing evidence obligations = 2
  state = BLOCKED
```

The difference between `checker covered` and unique-entity progress is intentional: MASS coverage may contain multiple obligations for one component.

### 3. Cause classification and rollups

Primary `What needs attention` now distinguishes:

- `SHARED CAUSE` — same cause affects 2+ method/data scopes;
- `SINGLE CAUSE` — one scope only;
- `GATE ROLLUP` — derived gate state that clears when underlying causes clear.

Single-scope causes are no longer omitted merely because they are not shared.

### 4. Forward navigation

One cause-to-owner action map now routes:

- `MASS_COVERAGE_INCOMPLETE` -> Enrichment & Overrides;
- `SECTION_COVERAGE_INCOMPLETE` -> Enrichment & Overrides;
- `FLEXURAL_COVERAGE_INCOMPLETE` -> Enrichment & Overrides;
- actual emitted `MASTER_NOT_READY` -> Import Masters.

Issue #1422 names `MASTER_NOT_CURRENT`; live `workspace-status-projection.js` emits `MASTER_NOT_READY`. PR1424 follows the live emitted contract instead of preserving the stale issue token.

### 5. Reverse Enrichment feedback

`src/workspace/enrichment/non-fea-enrichment-view.js`

- Adds `Open Validate Input` using the existing delegated `data-load-calc-tab` contract.
- Staged proposals and accepted records disclose which coverage cause(s) their field can provide evidence for.
- Approved-master/fitting proposal messages name affected Validate Input causes where the dependency is statically known.
- Boundary text explicitly states these are dependency disclosures only; **only the common checker can clear a blocker**.
- No new engineering computation or readiness authority is added to Enrichment.

Source verification against `LoadCalcConsumerController.handleClick()` confirms `data-load-calc-tab` delegates to `selectTab()` and rerender, and `renderDeferredPane()` has real `preflight` and `enrichment` branches.

### 6. Regression coverage added

`scripts/non-fea-input-check-coverage-projection-check.mjs`

- Partial and nearly-resolved states keep the same blocker code and remain BLOCKED.
- Different missing evidence changes status semantic identity.
- Rejects readiness promotion while missing evidence exists.
- Rejects duplicate missing evidence.
- Pins source anti-drift for `coverageResult(): ready: normalized.length === 0`.
- Pins MASS/SECTION/FLEXURAL forward owner mapping, master mapping, cause labels, Enrichment dependency mapping, and the no-readiness-authority boundary.

`e2e/non-fea-input-check-coverage-progress.spec.js`

- Uses a genuine partial three-pipe fixture.
- Proves one pipe can have two mass obligations while counting as one unresolved entity.
- Asserts initial and updated progress values.
- Asserts the real Run button remains disabled before and after partial progress.
- Asserts `SHARED CAUSE` and `GATE ROLLUP` presentation.
- Navigates from MASS cause to Enrichment via the actual cause button.
- Asserts proposal and accepted-record reverse disclosure.
- Stages but rejects `PIPE_OUTER_DIAMETER` solely to verify SECTION + FLEXURAL + MASS dependency disclosure without changing engineering authority.
- Navigates back through Enrichment's `Open Validate Input` button.

## Protected invariants

These remain hard constraints and are not modified by this PR:

- `coverageResult().ready === (missing.length === 0)`.
- `coverageRequirement()` READY/BLOCKED semantics.
- Common method readiness.
- Qualification profile semantics.
- Common-input sealing semantics.
- Calculation authorization and execution eligibility.
- Solver/load-distribution mechanics.
- Engineering master-data authority.
- Benchmark values / tolerances / expected results.
- Workflow definitions.

## Engineering rationale

A partial percentage is progress information, not an engineering acceptance criterion. One unresolved component can be the dominant mass item — e.g. a heavy valve — or a missing fluid/insulation obligation can materially change distributed weight and support reactions. Therefore `2 of 3 resolved` must remain BLOCKED if the third component lacks required evidence.

Concrete falsifier: a three-component model with two complete components and one heavy valve lacking `COMPONENT_WEIGHT`. The UI may show `2 of 3 governed entities resolved`, but if Run becomes enabled or MASS coverage becomes READY, PR1424 is invalid.

## Failure isolation retained

If displayed progress disagrees with accepted Enrichment evidence, do not patch the UI blindly. Isolate in order:

1. `resolveNonFeaEnrichment` — did accepted evidence resolve into the ledger?
2. `analyzeModelCoverage` — did projected evidence satisfy the exact coverage requirement?
3. presentation — is structured correct evidence rendered incorrectly?

## Validation ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| live main exact head | PASS | `9887ec1c3eb6184c0d590841b23c04ed449f9414` | GitHub source inspection |
| branch divergence | PASS | ahead 22 / behind 0 before recovery refresh | GitHub compare |
| changed-path reconciliation | PASS | exactly 9 expected paths | GitHub compare |
| protected checker `index.js` unchanged | PASS | absent from PR file list | GitHub compare |
| protected solver/load/workflow paths unchanged | PASS | absent from PR file list | GitHub compare |
| cross-tab event integration | PASS | `handleClick()` delegates `data-load-calc-tab`; both panes exist | source inspection |
| #1422 acceptance reconciliation | PASS | all four DoD groups have implementation + encoded regression | source inspection |
| reconstructed coverage normalizer/presentation logic | PASS_RECONSTRUCTED_LOCAL | exact new functions produced `1/3 -> 2/3` unique progress and rejected readiness/state contradictions | Node 22.16.0 local execution |
| direct git clone of PR branch | FAIL_ENVIRONMENT | `Could not resolve host: github.com` | local command |
| `node scripts/non-fea-input-check-coverage-projection-check.mjs` in real checkout | NOT_RUN | no repository checkout available | NONE |
| `node scripts/advanced-shell-contract-check.mjs` | NOT_RUN | no repository checkout available | NONE |
| focused new Playwright E2E | NOT_RUN | no repository checkout/dependency graph available | NONE |
| existing `e2e/non-fea-input-check-load-calc.spec.js` | NOT_RUN | no repository checkout/dependency graph available | NONE |
| `npm run check:workspace-contracts` | NOT_RUN | no repository checkout/dependency graph available | NONE |

Chromium is present locally at `/usr/bin/chromium`; browser absence is **not** the blocker. Repository/dependency materialization is the blocker.

No `NOT_RUN` item is represented as PASS.

## Appendix A — takeover qualification status

### A1 Production trace

PASS by current source inspection. Trace and first wrong boundary are documented above.

### A2 Current failure isolation

Repository-retained #1419 evidence established progress sequences `148 -> 88 -> 45 -> 31 -> 5` while the primary MASS root-cause item remained structurally code/method-count based. PR1424 additionally encodes a genuine `3 entities / 3 obligations -> 3 entities / 2 obligations` browser fixture. Fresh real-browser execution in this environment remains NOT_RUN.

### A3 Authority / invariant

PASS. Partial progress cannot authorize calculation; heavy component/fluid/insulation omissions can materially change support load. The falsifier is documented above.

### A4 Independent validation

FAIL / NOT QUALIFIED in this environment. Required real-checkout commands are NOT_RUN. The local reconstructed function execution is supplementary evidence only and does not satisfy A4.

### A5 Minimal patch / falsifier

PASS by source inspection. The patch preserves structured coverage evidence through the status projection and renders it without touching checker readiness. Falsifier: two states with different missing sets render identical primary progress, or any missing state becomes runnable.

### Qualification verdict

`APPENDIX_A_QUALIFIED = false` because A4 does not meet the minimum threshold. The owner's explicit `Start coding` instruction was used only as mutation authority; it is not treated as validation authority.

## Active ledger

- ISS-1422-01 — IMPLEMENTED / execution validation pending: projection retained structured coverage.
- ISS-1422-02 — IMPLEMENTED / execution validation pending: primary entity/reason detail.
- ISS-1422-03 — IMPLEMENTED / execution validation pending: shared/single/rollup distinction.
- ISS-1422-04 — IMPLEMENTED / execution validation pending: every coverage-style cause has owner navigation.
- ISS-1422-05 — IMPLEMENTED / execution validation pending: Enrichment reverse cause disclosure.
- RISK-1422-01 — MITIGATED: unique unresolved entities are derived separately from raw obligations.
- RISK-1422-02 — MITIGATED BY CONTRACT: structured coverage affects deterministic status identity.
- RISK-1422-03 — OPEN: browser integration is encoded but not executed in a real checkout.
- DEC-1422-01 — checker readiness semantics immutable for this PR.
- DEC-1422-02 — unique-entity progress is presentation-only.
- DEC-1422-03 — use live `MASTER_NOT_READY`, not stale issue token `MASTER_NOT_CURRENT`.
- DEC-1422-04 — Enrichment cause mapping is dependency disclosure, never readiness authority.

## Changed-file ledger

1. `agents/PR1424_workreport.md` — living recovery / evidence record.
2. `agents/claims/PR1424.yaml` — active mutation claim.
3. `agents/status/PR1424.yaml` — machine-readable delivery state.
4. `src/workspace/non-fea-analysis-plan-runtime.js` — checker coverage evidence projection.
5. `src/core/non-fea-common-checker/workspace-status-projection.js` — fail-closed coverage normalization.
6. `src/workspace/non-fea-input-check-view.js` — progress/detail/grouping/forward navigation.
7. `src/workspace/enrichment/non-fea-enrichment-view.js` — reverse dependency feedback/navigation.
8. `scripts/non-fea-input-check-coverage-projection-check.mjs` — focused anti-drift contract.
9. `e2e/non-fea-input-check-coverage-progress.spec.js` — genuine partial-coverage browser regression.

## Next-agent expert questionnaire

Before taking authority, next agent must answer from the live repository:

1. What is current `main`, PR head, merge base, and ahead/behind count? Has any overlapping PR appeared since `445a022e`?
2. Is `src/core/non-fea-common-checker/index.js` still absent from the PR diff, and does `coverageResult()` still set `ready: normalized.length === 0`?
3. Why can MASS `coverage.covered` differ from the displayed unique resolved entity count? Demonstrate with PIPE-C missing both `OPERATING_FLUID` and `PIPE_MASS`.
4. Which exact status-projection field now carries coverage evidence from the checker to the view, and what contradictions does its normalizer reject?
5. Which Validate Input codes navigate to Enrichment, and which master code navigates to Import Masters? Why is `MASTER_NOT_READY` used instead of the issue's `MASTER_NOT_CURRENT` wording?
6. Why must the Enrichment cause mapping not be used to mark a blocker cleared before common-checker reevaluation?
7. Run and paste the actual outputs of the required commands below. Do not inherit this report's `NOT_RUN` as PASS.
8. In the focused E2E, prove both the progress change and that `[data-load-calc-run]` stays disabled.
9. If the new E2E fails because the initial MASS totals differ, isolate adapter/enrichment/checker/rendering before changing expected counts.
10. If any required test fails, update this workreport with exact output and root cause before touching production logic.

## Required next commands in a real checkout

```bash
node scripts/non-fea-input-check-coverage-projection-check.mjs
node scripts/advanced-shell-contract-check.mjs
npm run check:e2e -- e2e/non-fea-input-check-coverage-progress.spec.js
npm run check:e2e -- e2e/non-fea-input-check-load-calc.spec.js
npm run check:workspace-contracts
```

## EXACT_NEXT_ACTION

Obtain a real checkout of PR #1424, re-ground `main` and overlap, run the five commands above verbatim, record exact outputs in this workreport, fix only evidenced failures, then — and only if all required validation is genuinely green — update status to review-ready. Do not merge without owner authority.
