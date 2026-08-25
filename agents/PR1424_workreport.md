# PR1424 — Load Calc Validate Input progress visibility

## Recovery header

- Repository: `reallaksh19/Advanced_Analysis`
- Source issue: #1422
- PR: #1424 (draft)
- Branch: `agent/issue-1422-validate-input-progress`
- Base/main at grounding: `9887ec1c3eb6184c0d590841b23c04ed449f9414`
- REPORT_BASIS_HEAD after projection implementation: `7498e32f4d490a89bc1708342e9846b730129c1f`
- Work intent: IMPLEMENT
- Criticality: ENGINEERING_CRITICAL
- Merge authority: OWNER_ONLY
- Owner instruction on 2026-08-25: `Start coding`

## Handover in 60 seconds

#1422 is a presentation/projection correctness repair for Load Calc -> Validate Input. Commit-1 work is implemented: checker-owned blocked coverage requirement details now survive `commonInputStatus()` and `workspace-status-projection.js` as validated `coverageRequirements`. Contradictory coverage evidence fails closed. `src/core/non-fea-common-checker/index.js` is unchanged. Next: consume those details in the primary Validate Input root-cause surface, deriving unique unresolved entities separately from missing evidence obligations.

## Live ground truth

- `main` exact SHA at PR creation: `9887ec1c3eb6184c0d590841b23c04ed449f9414`.
- #1421 is closed/superseded by #1422.
- Open LoadCalc PR #1243 is qualification-only and declares no production-source change.
- Searches found no open PR naming `src/workspace/non-fea-input-check-view.js` or `src/workspace/non-fea-analysis-plan-runtime.js`.
- `agents/MASTER_INDEX.md` is absent on main.
- Stale `WIP-lafea3-domain-fix` is not used.
- Coordination: SAFE; re-check before each stage.

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
-> **PR1424 now retains blocked coverage `details` as `coverageRequirements`**
-> `normalizeCommonInput()` in `workspace-status-projection.js`
-> **PR1424 now validates and retains that coverage evidence**
-> `collectBlockers()` still reconstructs generic code-only method blockers
-> `rootCauseMarkup()` still sees code/count/scopes only until the next phase.

First wrong boundary was workspace status projection; that boundary is now repaired. Primary rendering remains the current defect.

## Commit-1 implementation

Changed:

- `src/workspace/non-fea-analysis-plan-runtime.js`
  - projects only blocked `MASS_COVERAGE`, `FLEXURAL_COVERAGE`, and `SECTION_COVERAGE` requirement details;
  - retains exact checker `requirementId/state/code/total/covered/missing/ready`;
  - does not reinterpret readiness.
- `src/core/non-fea-common-checker/workspace-status-projection.js`
  - normalizes `coverageRequirements` on method rows;
  - rejects invalid counts, duplicate missing entries, `ready`/missing contradictions and state/readiness contradictions;
  - existing blocker and gate computation remains unchanged.
- `scripts/non-fea-input-check-coverage-projection-check.mjs`
  - encodes partial and nearly-resolved coverage states with the same blocker code;
  - requires their status semantic hashes to differ;
  - requires both method gates to remain BLOCKED;
  - negative cases reject readiness promotion and duplicate evidence;
  - source anti-drift assertion pins `coverageResult()` to `ready: normalized.length === 0`.

An intermediate full-file connector edit accidentally accepted an alternate `requestedLoadCases` property in `normalizeCommonInput()`. Diff review detected it immediately and it was removed. Final PR diff contains no such compatibility broadening.

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

`modelCoverage.mass.total` is component count while `mass.missing` may contain several obligations for one component (`PIPE_MASS`, `OPERATING_FLUID`, `HYDRO_FLUID`, `INSULATION`). Therefore the next presentation phase must aggregate missing tokens into unique entity IDs and separately show missing-obligation count; it must not blindly label `coverage.covered` as resolved entities.

## Current hypothesis / falsifier

Hypothesis: the retained structured coverage details are now sufficient for a truthful primary progress display by deriving `uniqueUnresolvedEntities` from `missing` while preserving raw missing-obligation count.

Falsifier: states with different missing sets still render the same primary progress/detail after the next phase, or any state with `missing.length > 0` becomes READY/runnable because of the patch.

## Appendix A / mutation authority

- A1 Production Trace: repository-inspected and complete.
- A2 Failure Isolation: merged #1419 retained execution evidence records mass missing sequence 148 -> 88 -> 45 -> 31 -> 5 while the primary blocker remained the same code/method-count rollup; fresh local replay remains NOT_RUN.
- A3 Authority/Invariant: complete; one omitted heavy valve/fluid/mass obligation can materially alter support load, so partial completion cannot authorize calculation.
- A4 Independent Validation: required local commands remain NOT_RUN in this connector-only authoring environment. No PASS claimed.
- A5 Minimal Patch: commit-1 projection repair implemented without checker readiness changes.

The owner's explicit `Start coding` instruction remains the current mutation/start authority, not a substitute for missing execution evidence. Final completion/review promotion remains gated on actual required validation evidence.

## Active ledger

- ISS-1422-01: **IMPLEMENTED, execution validation pending** — coverage details retained through workspace status.
- ISS-1422-02: OPEN — primary root cause lacks entity-level detail.
- ISS-1422-03: OPEN — shared/single/rollup presentation is conflated.
- ISS-1422-04: OPEN — only MASS coverage owns a direct resolution link.
- ISS-1422-05: OPEN — Enrichment actions do not identify affected Validate Input causes.
- RISK-1422-01: ACTIVE — mass missing count can exceed unique unresolved entity count.
- RISK-1422-02: MITIGATED BY CONTRACT — coverage changes alter deterministic status evidence; focused check pins this behavior.
- DEC-1422-01: checker gate semantics immutable for this PR.
- DEC-1422-02: unique-entity progress is display-only derivation from checker missing tokens.

## Validation ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| live main grounding | PASS | GitHub connector | SOURCE_INSPECTION |
| #1421 superseded | PASS | GitHub connector | SOURCE_INSPECTION |
| open LoadCalc overlap | PASS / no production overlap found | GitHub connector | SOURCE_INSPECTION |
| PR diff scope after commit 1 | PASS | GitHub diff inspection; accidental load-case alias removed | SOURCE_INSPECTION |
| checker readiness source unchanged | PASS | PR diff does not modify `src/core/non-fea-common-checker/index.js` | SOURCE_INSPECTION |
| new focused projection checker execution | NOT_RUN | connector-only authoring environment | NONE |
| `advanced-shell-contract-check.mjs` | NOT_RUN | connector-only authoring environment | NONE |
| focused E2E | NOT_RUN | connector-only authoring environment | NONE |
| workspace contracts | NOT_RUN | connector-only authoring environment | NONE |

## Changed-file ledger

Current effective PR paths:

- `agents/PR1424_workreport.md` — recovery authority.
- `agents/claims/PR1424.yaml` — active file/authority claim.
- `agents/status/PR1424.yaml` — current delivery state.
- `src/workspace/non-fea-analysis-plan-runtime.js` — blocked coverage evidence projection.
- `src/core/non-fea-common-checker/workspace-status-projection.js` — fail-closed coverage evidence normalization.
- `scripts/non-fea-input-check-coverage-projection-check.mjs` — focused anti-drift contract.

No protected checker/solver/master-data/workflow path changed.

## EXACT_NEXT_ACTION

Re-check overlap, then modify `src/workspace/non-fea-input-check-view.js` so shared coverage causes use `status.commonInput.methodRows[].coverageRequirements` to show governed entity total, unique resolved/unresolved entity count, raw missing-obligation count, and a complete scrollable unresolved entity/reason list directly in `What needs attention`; keep current gate and run eligibility unchanged.