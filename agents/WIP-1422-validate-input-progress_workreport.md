# WIP-1422 Validate Input progress visibility

## Recovery header

- Repository: `reallaksh19/Advanced_Analysis`
- Source issue: #1422
- Branch: `agent/issue-1422-validate-input-progress`
- Base/main at grounding: `9887ec1c3eb6184c0d590841b23c04ed449f9414`
- REPORT_BASIS_HEAD: `9887ec1c3eb6184c0d590841b23c04ed449f9414`
- Work intent: IMPLEMENT
- Criticality: ENGINEERING_CRITICAL
- Merge authority: OWNER_ONLY
- Owner instruction on 2026-08-25: `Start coding`

## Handover in 60 seconds

Issue #1422 is a presentation/projection correctness repair for Load Calc -> Validate Input. The engineering checker already computes coverage details and must remain fail-closed. Current workspace projection reduces method blockers to codes only, so `rootCauseMarkup()` cannot distinguish 148 unresolved coverage obligations from 5 unresolved obligations. Preserve checker requirement coverage details through workspace status, then render progress/entity detail and cross-links without changing `coverageResult().ready` or method authorization semantics.

## Live ground truth

- `main` exact SHA: `9887ec1c3eb6184c0d590841b23c04ed449f9414`.
- #1421 is closed/superseded by #1422.
- Open LoadCalc PR #1243 is qualification-only and declares no production-source change.
- No open PR was found naming `src/workspace/non-fea-input-check-view.js`.
- No open PR was found naming `src/workspace/non-fea-analysis-plan-runtime.js`.
- `agents/MASTER_INDEX.md` does not exist on current main.
- Existing stale `WIP-lafea3-domain-fix` is not used.
- Coordination classification for this WIP: SAFE, subject to re-check before each new stage.

## Mission / acceptance

1. Show partial coverage progress in the primary Validate Input blocker surface.
2. Make exact unresolved entities/reasons reachable from the primary surface.
3. Distinguish shared causes, single causes and gate rollups.
4. Extend Validate Input -> owning tool links beyond MASS coverage.
5. Add Enrichment -> Validate Input impact/return feedback without making Enrichment a readiness authority.
6. Preserve all-or-nothing checker readiness exactly.
7. Add genuine partial-coverage E2E coverage.

## Current technical diagnosis

Production trace on current main:

`renderEmpiricalPreflightView()`
-> `evaluateCurrentNonFeaInputCheckStatus()`
-> `evaluateCurrentNonFeaCommonInput()`
-> common-input store `evaluate()`
-> `runPreFeaPipingCheck()`
-> `createEvaluationContext()`
-> `analyzeModelCoverage()`
-> `coverageRequirement()`
-> `methodRows[].requirements[]` with structured `details`
-> `commonInputStatus()` in `src/workspace/non-fea-analysis-plan-runtime.js`
-> current projection keeps only `methodId/state/blockerCodes`
-> `normalizeCommonInput()` in `workspace-status-projection.js` keeps only those fields
-> projected blockers are reconstructed from codes
-> `rootCauseMarkup()` sees code/count/scopes but no coverage totals/missing set.

The first information-loss boundary is the workspace projection, not the checker.

## Protected invariants

- `coverageResult().ready` remains exactly equivalent to `missing.length === 0`.
- `coverageRequirement()` READY/BLOCKED semantics do not change.
- Method readiness does not use progress percentage.
- Seal/authorization/execution eligibility do not use presentation progress.
- No tolerance/benchmark/expected-value changes.
- No solver/load-distribution mechanics changes.
- No engineering master-data authority widening.
- No `.github/workflows/**` changes.

## Important semantic risk

`modelCoverage.mass.total` is component count while `mass.missing` can contain multiple evidence obligations for one component (`PIPE_MASS`, `OPERATING_FLUID`, `HYDRO_FLUID`, `INSULATION`). Therefore `coverage.covered` is not always a unique-entity progress count. Presentation must distinguish unique unresolved entity count from missing evidence-obligation count rather than mislabel `coverage.covered` as resolved entities.

## Current hypothesis and falsifier

Hypothesis: preserving structured coverage requirement details through the status projection, then aggregating missing tokens by entity for display, is sufficient to make partial progress visible without changing engineering gates.

Falsifier: two otherwise-equivalent states with the same `MASS_COVERAGE_INCOMPLETE` blocker but different missing sets still render the same primary progress/detail after the patch, or either state becomes READY while any missing entry remains.

## Appendix A status

A1 Production Trace: repository-inspected and complete.
A2 Current Failure Isolation: retained merged #1419 execution evidence proves mass missing sequence 148 -> 88 -> 45 -> 31 -> 5 while the primary cause remained the same code/method-count rollup; fresh replay in this execution environment remains NOT_RUN.
A3 Authority / Invariant: complete; one missing heavy component or fluid/mass obligation can materially alter support loads, so partial progress cannot authorize calculation.
A4 Independent Validation: `node scripts/advanced-shell-contract-check.mjs`, focused E2E and workspace contracts are NOT_RUN in this connector-only environment at WIP initialization. No PASS is claimed.
A5 Next Commit / Minimal Patch: preserve structured coverage details in `non-fea-analysis-plan-runtime.js` and `workspace-status-projection.js`; do not edit checker readiness semantics.

Issue #1422 normally requires Appendix-A qualification before mutation. Current owner instruction explicitly says `Start coding`; this is recorded as current mutation/start authority, not as fabricated A4 evidence. Validation debt remains blocking for completion/review promotion.

## Active items

- ISS-1422-01: coverage progress is lost at workspace projection.
- ISS-1422-02: primary root cause lacks entity detail.
- ISS-1422-03: shared/single/rollup causes are visually conflated.
- ISS-1422-04: only mass coverage has a direct Enrichment action.
- ISS-1422-05: Enrichment messages do not identify affected Validate Input causes.
- RISK-1422-01: mass missing count is evidence-obligation count, not necessarily unique entity count.
- RISK-1422-02: extending status projection changes status semantic evidence and must be deterministic.
- DEC-1422-01: checker mechanics/readiness remain unchanged.
- DEC-1422-02: derive display-only unique entity progress from checker missing tokens; do not invent a second engineering checker.

## Planned commit sequence

1. Preserve structured coverage evidence in workspace status projection + focused contract check.
2. Render partial progress and direct unresolved-entity detail in Validate Input + partial E2E.
3. Add explicit cause kinds and bidirectional cross-tab guidance + E2E.
4. Exact-head validation and handover reconciliation.

## Validation ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| live main grounding | PASS | GitHub connector | SOURCE_INSPECTION |
| issue #1421 closure | PASS | GitHub connector | SOURCE_INSPECTION |
| open LoadCalc PR overlap | PASS / no production overlap found | GitHub connector | SOURCE_INSPECTION |
| `advanced-shell-contract-check.mjs` current main | NOT_RUN | execution unavailable at initialization | NONE |
| focused E2E current main | NOT_RUN | execution unavailable at initialization | NONE |
| workspace contracts current main | NOT_RUN | execution unavailable at initialization | NONE |

## Changed-file ledger

Current durable WIP artifacts only. No production file changed yet.

## EXACT_NEXT_ACTION

Create WIP claim/status records, allocate a draft PR, migrate WIP recovery artifacts to PR-number records, then implement commit 1 by projecting existing checker coverage requirement details through `commonInputStatus()` and `normalizeCommonInput()` without modifying `src/core/non-fea-common-checker/index.js`.