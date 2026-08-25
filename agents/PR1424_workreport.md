# PR1424 — Load Calc Validate Input progress visibility

## Recovery header

- Repository: `reallaksh19/Advanced_Analysis`
- Source issue: #1422
- PR: #1424 (draft)
- Branch: `agent/issue-1422-validate-input-progress`
- Base/main at grounding: `9887ec1c3eb6184c0d590841b23c04ed449f9414`
- REPORT_BASIS_HEAD before production changes: `5e3c50860505c2108a39330923bf43da8a0896ed`
- Work intent: IMPLEMENT
- Criticality: ENGINEERING_CRITICAL
- Merge authority: OWNER_ONLY
- Owner instruction on 2026-08-25: `Start coding`

## Handover in 60 seconds

#1422 is a presentation/projection correctness repair for Load Calc -> Validate Input. The common checker already computes coverage `details` in `methodRows[].requirements[]`; the workspace projection drops those details and keeps only blocker codes. Preserve bounded coverage evidence through workspace status, then render partial progress, exact unresolved entities/reasons and navigation without changing `coverageResult().ready`, method readiness, sealing, authorization or execution semantics.

## Live ground truth

- `main` exact SHA at PR creation: `9887ec1c3eb6184c0d590841b23c04ed449f9414`.
- PR head at creation: `5e3c50860505c2108a39330923bf43da8a0896ed`.
- #1421 is closed/superseded by #1422.
- Open LoadCalc PR #1243 is qualification-only and declares no production-source change.
- Searches found no open PR naming `src/workspace/non-fea-input-check-view.js` or `src/workspace/non-fea-analysis-plan-runtime.js`.
- `agents/MASTER_INDEX.md` is absent on main.
- Stale `WIP-lafea3-domain-fix` is not used.
- Coordination: SAFE, re-check before each stage.

## Mission / acceptance

1. Primary Validate Input surface shows meaningful partial coverage progress.
2. Exact unresolved entities and reason codes are reachable there directly.
3. Shared causes, single causes and gate rollups are visibly distinct.
4. Non-mass coverage causes link to the owning resolution surface.
5. Enrichment feedback names affected Validate Input causes without becoming a readiness authority.
6. `coverageResult().ready` and all downstream engineering authorization semantics remain unchanged.
7. Add genuine partial-coverage browser regression coverage.

## Production trace / diagnosis

`renderEmpiricalPreflightView()`
-> `evaluateCurrentNonFeaInputCheckStatus()`
-> `evaluateCurrentNonFeaCommonInput()`
-> common-input store `evaluate()`
-> `runPreFeaPipingCheck()`
-> `createEvaluationContext()`
-> `analyzeModelCoverage()`
-> `coverageRequirement()`
-> checker `methodRows[].requirements[]` retaining structured `details`
-> `commonInputStatus()` in `src/workspace/non-fea-analysis-plan-runtime.js`
-> current projection retains only `methodId/state/blockerCodes`
-> `normalizeCommonInput()` in `workspace-status-projection.js` retains only those fields
-> `collectBlockers()` reconstructs generic code-only method blockers
-> `rootCauseMarkup()` can group code/count/scopes but has no coverage totals/missing set.

First wrong boundary: workspace status projection. Checker mechanics are not the defect.

## Protected invariants

- `coverageResult().ready` remains `missing.length === 0`.
- `coverageRequirement()` READY/BLOCKED semantics unchanged.
- Method readiness/qualification unchanged.
- Common-input seal/authorization unchanged.
- Calculation execution eligibility unchanged.
- No solver/load-distribution mechanics changes.
- No engineering master-data authority widening.
- No benchmark/tolerance/expected-value changes.
- No `.github/workflows/**` changes.

## Semantic risk: mass coverage is not a simple entity count

`modelCoverage.mass.total` is component count while `mass.missing` may contain several obligations for one component (`PIPE_MASS`, `OPERATING_FLUID`, `HYDRO_FLUID`, `INSULATION`). Therefore presentation must aggregate missing tokens into unique entity IDs and separately show missing-obligation count; it must not blindly label `coverage.covered` as resolved entities.

## Current hypothesis / falsifier

Hypothesis: retaining structured coverage requirement details in the status projection and aggregating checker-owned missing tokens by entity in the presentation layer is sufficient to expose progress without changing gates.

Falsifier: states with different missing sets still render the same primary progress/detail, or any state with `missing.length > 0` becomes READY/runnable because of the patch.

## Appendix A / mutation authority

- A1 Production Trace: repository-inspected and complete.
- A2 Failure Isolation: merged #1419 retained execution evidence records mass missing sequence 148 -> 88 -> 45 -> 31 -> 5 while the primary blocker remained the same code/method-count rollup; fresh local replay remains NOT_RUN.
- A3 Authority/Invariant: complete; one omitted heavy valve/fluid/mass obligation can materially alter support load, so partial completion cannot authorize calculation.
- A4 Independent Validation: required local commands are NOT_RUN in this connector-only authoring environment at PR creation. No PASS claimed.
- A5 Minimal Patch: preserve requirement coverage details through `non-fea-analysis-plan-runtime.js` and `workspace-status-projection.js`; do not edit checker readiness semantics.

Issue #1422 normally places mutation behind Appendix A. The owner's current explicit instruction is `Start coding`; PR1424 records that as current mutation/start authority, not as fabricated A4 evidence. Missing execution evidence remains blocking for completion/review promotion.

## Active ledger

- ISS-1422-01: coverage details are dropped at workspace status projection.
- ISS-1422-02: primary root cause lacks entity-level detail.
- ISS-1422-03: shared/single/rollup presentation is conflated.
- ISS-1422-04: only MASS coverage owns a direct resolution link.
- ISS-1422-05: Enrichment actions do not identify affected Validate Input causes.
- RISK-1422-01: mass missing count can exceed unique unresolved entity count.
- RISK-1422-02: adding evidence changes deterministic status semantic hash.
- DEC-1422-01: checker gate semantics are immutable for this PR.
- DEC-1422-02: unique-entity progress is display-only derivation from checker missing tokens.

## Commit plan

1. Preserve structured coverage evidence in workspace status + focused deterministic regression.
2. Surface partial progress and exact unresolved entities in primary Validate Input + browser partial fixture.
3. Add cause-kind distinction and bidirectional cross-tab guidance + browser checks.
4. Exact-head validation, changed-file reconciliation and handover.

## Validation ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| live main grounding | PASS | GitHub connector | SOURCE_INSPECTION |
| #1421 superseded | PASS | GitHub connector | SOURCE_INSPECTION |
| open LoadCalc overlap | PASS / no production overlap found | GitHub connector | SOURCE_INSPECTION |
| `advanced-shell-contract-check.mjs` current main | NOT_RUN | connector-only authoring environment | NONE |
| focused E2E current main | NOT_RUN | connector-only authoring environment | NONE |
| workspace contracts current main | NOT_RUN | connector-only authoring environment | NONE |

## Changed-file ledger

At PR allocation only recovery artifacts are changed. Production changes begin after WIP->PR recovery migration.

## EXACT_NEXT_ACTION

Migrate status/claim to `PR1424`, remove WIP recovery records, then implement commit 1 by projecting checker coverage requirement `details` through `commonInputStatus()` and `normalizeCommonInput()` while leaving `src/core/non-fea-common-checker/index.js` unchanged.