# PR1364 Work Report — EMP1-27 non-round attachment source boundary

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `WORK_INTENT: IMPLEMENT`
- `MUTATION_AUTHORITY: WRITE_ALLOWED`
- `PR: #1364`
- `ISSUE: #1363`
- `BRANCH: agent/emp1-27-non-round-source-boundary`
- `START_BASE_MAIN: 727fd7c02ec8bdad594205f69dbef16e21ec8332`
- `CURRENT_PR_BASE_AT_ALLOCATION: f37605dea0c94a404593d161374ff0aa8005fe0c`
- `BASE_DRIFT_CLASSIFICATION: CLEAN_UNRELATED_LAFEA6_PRESENTATION_WORKFLOW_DRIFT`
- `PRODUCTION_NON_ROUND_AUTHORITY: false`
- `EQUIVALENT_ROUND_APPROXIMATION_AUTHORITY: false`
- `GLOBAL_EMP1_C_ROUTE_AUTHORIZED: false`
- `CODE_COMPLIANCE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`

## Handover in 60 seconds

This PR does not implement rectangular/square WRC 537 calculations. It records the current authority boundary: the live bounded EMP.1.C route remains `CYLINDRICAL + ROUND` only. The retained legacy method extraction contains secondary/unqualified evidence of rectangular-loading symbols `C1`/`C2` and a candidate square-attachment parameter note, but that extraction is explicitly `NOT_READY_FOR_IMPLEMENTATION` and is not primary-source implementation authority.

No equal-area, equal-perimeter, hydraulic-diameter or other equivalent-round substitution is permitted.

## Main drift audit

During PR allocation, main advanced from `727fd7c02ec8bdad594205f69dbef16e21ec8332` to `f37605dea0c94a404593d161374ff0aa8005fe0c` by two commits. The compare changed only:

- `agents/PR1359_workreport.md`
- `e2e/lafea6-mesh-not-applicable.spec.js`
- `scripts/lafea-workflow-area-applicability-check.mjs`
- `src/workspace/lafea-guided-workflow-presentation.js`
- `src/workspace/lafea-guided-workflow.js`

No EMP.1/WRC/non-round source, route, dataset, oracle, production evaluator or authority file overlapped this PR. Drift is classified clean and unrelated.

## Engineering result

- Current bounded attachment shape: `ROUND`.
- Non-round family: candidate source family only.
- Primary non-round WRC 537 method qualification: false.
- Rectangular/square production calculation: false.
- Equivalent-round approximation: false.
- Round beta equation/coefficient reuse for non-round geometry: prohibited.

## Changed-file ledger

1. `validation/emp1/wrc537-2013/non-round-attachment-source-qualification-v1.json`
2. `docs/emp1/WRC537_2013_Non_Round_Attachment_Authority.md`
3. `scripts/emp1-wrc537-non-round-attachment-source-check.mjs`
4. `agents/PR1364_workreport.md`

No `.github/workflows/*`, production evaluator, route registry, UI, gamma/beta, pressure, SCF, off-axis/global, nozzle/attachment-component, tolerance/oracle, code or release files are intentionally changed.

## Validation truth

- Repository/source inspection: `PASS_SOURCE_GOVERNANCE_BOUNDARY`.
- Exact-head Node execution: `NOT_RUN_EXECUTION_ENVIRONMENT`; no runtime PASS claimed.
- Production numerical comparison: `NOT_RUN_NOT_APPLICABLE`; no numerical production method changed.

## Primary-source continuation gate

Before non-round implementation, verify directly from controlled WRC 537 source: supported geometry families, C1/C2 definitions/orientation, nondimensional parameter equations/domains, complete curve/table/coefficient inventory, load/reference/sign convention, stress/recovery locations, aspect-ratio/configuration limits, interpolation/extrapolation policy, and at least one reproducible source/reference numerical benchmark.

## Appendix A — takeover qualification

1. Why does candidate `C1/C2` evidence not authorize non-round production calculation?
2. Why is an equal-area or equal-perimeter equivalent circle a new model rather than a WRC 537 source rule?
3. Which current code gate proves the bounded route is round-only?
4. What primary-source data are required before non-round equations can be implemented?
5. Why must round beta and round coefficient rows not be reused for rectangular/square geometry?
6. Which authority states remain false even after this source-governance PR is merged?
