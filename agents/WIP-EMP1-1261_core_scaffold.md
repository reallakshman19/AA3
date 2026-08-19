# WIP-EMP1-1261 — Core scaffold handover

## Recovery header

- Issue: #1261
- Repository: `reallaksh19/Advanced_Analysis`
- Base/main at grounding: `b841975b20e547c721447e95527a995805d9761a`
- Branch: `agent/emp1-core-scaffold-issue1261`
- Criticality: `ENGINEERING_CRITICAL`
- Intent: bounded architecture scaffold only
- Product authority: unchanged / no WRC activation
- Merge authority: NOT GRANTED

## Handover in 60 seconds

Owner requested core EMP.1 modules with code snippets linked to Issue #1261. This WIP adds dormant, unregistered modules under `src/core/emp1/` that freeze product identity, source-envelope structure, dependency invalidation, a fail-closed local-correlation gate, assessment composition and adapter-based orchestration. It does not rename current production LAFEA.1/.2 routes, does not change UI, does not implement WRC, and does not touch LAFEA.3+.

## Ground truth / coordination

- `main` rechecked at `b841975b20e547c721447e95527a995805d9761a`.
- `agents/MASTER_INDEX.md` does not exist on this base.
- Issue #1261 is the controlling task.
- Known open LAFEA numerical PRs #1258/#1259 target B01/B02D FEM qualification and are not intended to own `src/core/emp1/**`; next agent must recheck live overlap before production integration.

## Scope added

- `src/core/emp1/emp1-identity.js`
- `src/core/emp1/emp1-source-contract.js`
- `src/core/emp1/emp1-dependency-graph.js`
- `src/core/emp1/emp1-local-correlation-gate.js`
- `src/core/emp1/emp1-assessment.js`
- `src/core/emp1/emp1-orchestrator.js`
- `src/core/emp1/index.js`
- `scripts/emp1-core-scaffold-check.mjs`
- `docs/emp1/CORE_MODULES.md`
- this WIP report

## Authority / invariants

Must remain true:

- no WRC coefficient/equation/chart/interpolation value in this scaffold;
- no CAUx benchmark value in production code;
- local correlation remains BLOCKED without explicit qualified source/dataset/record/benchmark authority;
- `PASS` is not code compliance;
- release remains false;
- current LAFEA.1/.2 production mechanics remain untouched;
- LAFEA.3+ behavior remains untouched;
- SVG/UI geometry is not mechanics authority.

## Validation ledger

| Check | Status | Observation | Oracle | Notes |
|---|---|---|---|---|
| Fresh main grounding | PASS | GitHub remote | repository state | main = `b841975...` |
| Issue #1261 presence/content | PASS | GitHub remote | controlling issue | fetched live |
| Core scaffold source review | PASS | authored source inspection | implementation-coupled | no production imports/registration added |
| `scripts/emp1-core-scaffold-check.mjs` | NOT_RUN | not observed | focused software check | authored only; execute on exact branch checkout |
| Production build | NOT_RUN | not observed | repository build | no checkout execution in this step |
| Chromium EMP.1 UI | NOT_RUN | not observed | browser | UI not implemented by scaffold |
| WRC source qualification | BLOCKED | source not extracted here | authoritative reference required | Issue #1261 Phase 1 |
| CAUx pp.24–31 benchmark | BLOCKED | source not extracted here | authoritative reference + independent reproduction | freeze before evaluator work |

## Risks / decisions

- DEC-001: visible product is EMP.1; A/B/C remain separable evidence boundaries.
- DEC-002: orchestration uses injected adapters to prevent accidental duplication of current numerical mechanics.
- DEC-003: WRC gate requires explicit method/source/dataset/qualification/benchmark authority and remains dormant.
- RISK-001: exact legacy LAFEA.1/.2 source-to-adapter mapping is not yet proven; do not wire scaffold until Appendix A A1/A2 is completed.
- RISK-002: final WRC geometry contract cannot be frozen until the supplied source is extracted; current `geometry` aggregate is only a source envelope, not a WRC variable definition.

## Exact next action for implementation agent

1. Start READ_ONLY and re-ground current main/open PR overlap.
2. Complete Issue #1261 Appendix A with >=92/100 and >=17/20 each.
3. Compute raw SHA-256 and extract the exact two pinned PDFs; freeze CAUx pp.24–31 benchmark evidence before observing new WRC production output.
4. Trace current LAFEA.1/.2 functions and create thin EMP.1.A/B adapters with numerical-identity regressions.
5. Only after that, begin public route/UI migration to EMP.1.

## Appendix A

Use the five-question Appendix A in Issue #1261 unchanged. This scaffold does not waive or pre-answer the takeover gate.
