# PR1264 Work Report — EMP.1.C qualification-state seam

## Current state

- PR: #1264
- Issue: #1261
- Base: `main@cf3aaeefb028ee387d3d530f5e0e5106bd489dce`
- Branch: `agent/emp1-c-qualification-gate-issue1261`
- Intent: engineering-critical qualification/product integration
- Takeover authority: `QUALIFICATION_PENDING`
- Handover readiness: `READY`
- Merge authority: `NOT_GRANTED`

## Scope

Create one fail-closed backend qualification-state contract for EMP.1.C and make the visible EMP.1 blocker presentation consume it. Do not add WRC formulas, coefficient values, sign resolutions, CAUx expected values, local-correlation stresses, FEM changes, workflow changes, or release authority.

## Current engineering truth

EMP.1.C remains `BLOCKED / NOT_AUTHORIZED`.

Current evidence frozen into the qualification projection:

- WRC dataset: `NOT_READY_FOR_IMPLEMENTATION`
- unresolved JSON paths: `21`
- open issues: `7`
- numericalData count: `0`
- numeric coefficient rows: `0`
- unresolved coefficient rows: `120`
- unresolved parameter rows: `120`
- sign conflicts: `2` (spherical M1/M2 cross-check)
- sign resolution authority: `PINNED_WRC_PDF_ONLY`
- CAUx 2017 benchmark range: pp.24–31
- CAUx expected values frozen: `false`
- independent CAUx hand calculation: `NOT_RUN`
- method engineering-use authority: `false`
- EMP.1.C execution route registered: `false`

## Implemented

### IMP-1264-001 — central C qualification evaluator

Added `src/core/emp1/emp1-c-qualification-state.js`.

Promotion sequence is explicit:

1. WRC dataset ready;
2. numerical coefficients ready;
3. pinned-WRC sign arbitration pass;
4. CAUx pp.24–31 benchmark + independent hand calculation pass;
5. retained method qualification record grants engineering use;
6. production execution route registered.

No earlier gate can self-promote a later authority.

### IMP-1264-002 — product projection consumes qualification evidence

`buildEmp1ProductProjection(...)` now derives EMP.1.C state, blocker codes, blocker details and production-authority projection from the evaluator. Current four blocker codes remain stable for regression compatibility.

### IMP-1264-003 — UI consumes backend blocker messages

The guided EMP.1 workflow no longer owns a separate WRC/CAUx blocker-label dictionary. Visible C blocker messages are emitted by the backend qualification projection and carry quantitative current-state evidence.

### IMP-1264-004 — qualification regressions

Added `scripts/emp1-c-qualification-state-check.mjs` and extended `scripts/emp1-public-product-check.mjs`.

Negative cases cover:

- numeric coefficient payload removed;
- non-primary sign-resolution authority;
- CAUx independent hand calculation not run;
- technical gates complete but method authority absent;
- method authority complete but execution route absent.

Synthetic all-green evidence reaches `READY_TO_RUN`; this is a contract fixture only and is not WRC engineering evidence.

## Validation

- pure C-state module syntax: `PASS_LOCAL`
- pure current-state evaluation: `PASS_LOCAL`
- current blockers exactly four: `PASS_LOCAL`
- quantitative message evidence 21 / 7 / 0 / 120 / 120: `PASS_LOCAL`
- synthetic promotion sequence: `PASS_LOCAL`
- full repository static suite: `NOT_RUN` at this checkpoint
- production build/bundle gate: `NOT_RUN` at this checkpoint
- Chromium UI execution: `NOT_RUN` at this checkpoint
- WRC engineering qualification: `BLOCKED`
- CAUx pp.24–31 independent qualification: `NOT_RUN/BLOCKED`

## Changed-file ledger

1. `src/core/emp1/emp1-c-qualification-state.js` — new backend qualification truth.
2. `src/core/emp1/emp1-public-product-contract.js` — derive C projection from backend qualification state.
3. `src/core/emp1/index.js` — export qualification contract.
4. `src/workspace/emp1-product-projection.js` — expose qualification contract at existing workspace seam.
5. `src/workspace/lafea-guided-workflow-view.js` — render backend blocker details.
6. `scripts/emp1-c-qualification-state-check.mjs` — transition/negative-case qualification.
7. `scripts/emp1-public-product-check.mjs` — product/UI projection assertions.
8. `agents/PR1264_workreport.md` — living report.

## Risks / decisions

- `DEC-1264-001`: Do not reuse WRC537 Edition-4 technical values from draft PR #1211. Its architecture may be referenced, but cross-edition data promotion is prohibited.
- `DEC-1264-002`: Do not hide current blockers behind a generic `NOT_READY`; expose quantitative evidence to the user.
- `RISK-1264-001`: The current qualification evidence is a frozen summary of the source-audit artifacts, not a live parser of docs/CSV in the browser. Any later source update must update/derive this evidence through a governed qualification pipeline.
- `RISK-1264-002`: `READY_TO_RUN` in synthetic tests proves state-transition logic only; it does not establish WRC method correctness.

# Appendix A — takeover / qualification questionnaire

## A1 Production trace — 18/20

1. Public product remains `EMP.1`.
2. A retained engine remains LAFEA.1.
3. B retained engine remains LAFEA.2.
4. C has no backing production stage.
5. Public projection is `buildEmp1ProductProjection`.
6. C projection now calls `evaluateEmp1CQualificationState`.
7. UI receives C `blockerDetails` from projection.
8. UI does not parse source docs.
9. No WRC evaluator is registered.
10. No coefficient table is consumed.
11. No CAUx expected result is consumed.
12. No FEM route is modified.
13. B currentness remains independently governed.
14. Release qualification remains false.
15. Engineering-use authority remains false.
16. Execution route remains unregistered.
17. Current blocker codes are stable.
18. Current quantitative evidence is visible in messages.
19. Full exact-head production UI execution: NOT_RUN.
20. Exact future C execution adapter: intentionally absent.

## A2 Failure / UX isolation — 19/20

The prior defect was duplicated engineering truth: backend/product projection had blocker IDs while the UI separately owned human blocker semantics. The new path makes backend evidence the single visible blocker authority. Remaining point withheld until exact-head browser execution proves the rendered DOM.

## A3 Authority / invariants — 20/20

Primary-source arbitration remains pinned-WRC-only; CAUx remains benchmark-only; no Edition-4 data is promoted; no synthetic qualification value is production evidence; technical readiness, engineering authorization and route registration are separate gates.

## A4 Independent validation — 12/20

State-transition checker is independently executable and negative cases are present. WRC/CAUx engineering validation itself remains blocked/not run, so this section cannot pass engineering-critical release threshold.

## A5 Next commit / minimal patch — 18/20

The minimal next step is validation/reconciliation of this qualification seam, not WRC mechanics. After this PR is accepted, the next engineering dependency is source-qualified WRC/CAUx evidence acquisition or a governed adapter that consumes such evidence without hard-coding it.

**Appendix A total: 87/100 — below production engineering-authority threshold. `QUALIFICATION_PENDING`.**
