# PR1264 Work Report — EMP.1.C qualification-state seam

## Current state

- PR: #1264
- Issue: #1261
- Base: `main@cf3aaeefb028ee387d3d530f5e0e5106bd489dce`
- Branch: `agent/emp1-c-qualification-gate-issue1261`
- Qualified implementation checkpoint: `b22312bcde48796b07b869f0c69a4f2959510332`
- Intent: engineering-critical qualification/product integration
- Takeover authority: `QUALIFICATION_PENDING`
- Handover readiness: `READY`
- Merge authority: `NOT_GRANTED`

## Scope

Create one fail-closed backend qualification-state contract for EMP.1.C and make the visible EMP.1 blocker presentation consume it. Do not add WRC formulas, coefficient values, sign resolutions, CAUx expected values, local-correlation stresses, FEM changes, workflow-file changes, or release authority.

## Current engineering truth

EMP.1.C remains `BLOCKED / NOT_AUTHORIZED`.

Current evidence frozen into the qualification projection:

- WRC dataset: `NOT_READY_FOR_IMPLEMENTATION`
- unresolved JSON paths: `21`
- open issues: `7`
- numericalData count: `0`
- retained coefficient inventory rows: `120`
- numeric coefficient rows: `0/120`
- unresolved coefficient rows: `120`
- unresolved parameter rows: `120`
- sign conflicts: `2` (spherical M1/M2 cross-check)
- sign resolution authority: `PINNED_WRC_PDF_ONLY`
- CAUx 2017 benchmark range: pp.24–31
- CAUx expected values frozen: `false`
- independent CAUx hand calculation: `NOT_RUN`
- method engineering-use authority: `false`
- EMP.1.C production route registered: `false`

## Implemented

### IMP-1264-001 — central C qualification evaluator

Added `src/core/emp1/emp1-c-qualification-state.js`.

Promotion sequence is explicit:

1. WRC dataset ready;
2. complete numerical coefficient coverage;
3. pinned-WRC sign arbitration pass;
4. CAUx pp.24–31 benchmark + independent hand calculation pass;
5. retained method qualification record grants engineering use;
6. production execution route registered.

No earlier gate can self-promote a later authority.

### IMP-1264-002 — complete coefficient coverage

Coefficient readiness is not `numericCoefficientRows > 0`. It requires:

```text
coefficientInventoryRows > 0
numericCoefficientRows == coefficientInventoryRows
unresolvedCoefficientRows == 0
unresolvedParameterRows == 0
```

The current retained inventory is `120` rows. A synthetic `119/120` case is explicitly rejected.

### IMP-1264-003 — product projection consumes qualification evidence

`buildEmp1ProductProjection(...)` derives EMP.1.C state, blocker codes, blocker details and method-authority projection from the evaluator. Current four blocker codes remain stable for regression compatibility.

### IMP-1264-004 — execution-route custody is code-owned

Qualification evidence cannot self-register a production route. `EMP1_C_PRODUCTION_ROUTE.registered` is code/registry custody and is currently `false`.

Even all-green synthetic WRC/CAUx/method evidence therefore leaves the public product:

```text
BLOCKED_LOCAL_CORRELATION
EMP1_C_EXECUTION_ROUTE_NOT_REGISTERED
runAuthorized = false
```

### IMP-1264-005 — UI consumes backend blocker messages

The guided EMP.1 workflow no longer owns a separate WRC/CAUx blocker-label dictionary. Visible C blocker messages are emitted by the backend qualification projection and carry quantitative current-state evidence.

### IMP-1264-006 — qualification regressions

Added `scripts/emp1-c-qualification-state-check.mjs`, extended `scripts/emp1-public-product-check.mjs`, and placed the new C-state checker in the existing Stage-17 analytical prerequisite sequence before browser tests and before the unrelated FEM B01/B02 gate.

Negative cases cover:

- zero coefficient payload;
- incomplete `119/120` coefficient coverage;
- non-primary sign-resolution authority;
- CAUx independent hand calculation not run;
- technical gates complete but method authority absent;
- method authority complete but execution route absent;
- evidence attempting to claim a production execution route.

Synthetic evaluator-only all-green evidence reaches `READY_TO_RUN`; this is a contract fixture only and is not WRC engineering evidence. The public product still refuses route activation because no production C route exists.

## Validation

Focused local, dependency-free:

- pure C-state module syntax: `PASS_LOCAL`
- pure current-state evaluation: `PASS_LOCAL`
- current blockers exactly four: `PASS_LOCAL`
- quantitative blocker evidence: `PASS_LOCAL`
- synthetic promotion sequence: `PASS_LOCAL`

Exact-head GitHub qualification at implementation checkpoint `b22312bcde48796b07b869f0c69a4f2959510332`:

- exact checkout / clean tree: `PASS`
- dependency installation: `PASS`
- generic static/projection checks: `PASS`
- inherited shell compiler/execution custody: `PASS`
- standalone boundary comparator: `PASS`
- standalone LAFEA build: `PASS`
- production Pages build / bundle gate: `PASS`
- pinned Chromium qualification: `SKIPPED_BY_OWNER`; never represented as PASS
- WRC engineering qualification: `BLOCKED`
- CAUx pp.24–31 independent qualification: `NOT_RUN/BLOCKED`

## Changed-file ledger

1. `src/core/emp1/emp1-c-qualification-state.js` — backend qualification truth and complete-coverage gate.
2. `src/core/emp1/emp1-public-product-contract.js` — derive C projection; code-own route registration.
3. `src/core/emp1/index.js` — export qualification contract.
4. `src/workspace/emp1-product-projection.js` — expose qualification/route state at existing workspace seam.
5. `src/workspace/lafea-guided-workflow-view.js` — render backend blocker details.
6. `scripts/emp1-c-qualification-state-check.mjs` — transition, complete-coverage and negative-case qualification.
7. `scripts/emp1-public-product-check.mjs` — product/UI projection and route-custody assertions.
8. `scripts/lafea-stage17-browser-run.mjs` — run C-state Node qualification before browser/FEM gates; no workflow-file change.
9. `agents/PR1264_workreport.md` — living report.
10. `agents/status/PR1264.yaml` — current status.
11. `agents/claims/PR1264.yaml` — claim/authority boundary.

## Risks / decisions

- `DEC-1264-001`: Do not reuse WRC537 Edition-4 technical values from draft PR #1211. Its architecture may be referenced, but cross-edition data promotion is prohibited.
- `DEC-1264-002`: Do not hide current blockers behind a generic `NOT_READY`; expose quantitative evidence to the user.
- `DEC-1264-003`: Require complete retained coefficient-row coverage; one or 119 numeric rows cannot qualify a 120-row inventory.
- `DEC-1264-004`: Production route registration is code/registry authority, not qualification-evidence authority.
- `RISK-1264-001`: The current qualification evidence is a frozen summary of source-audit artifacts, not a live parser of docs/CSV in the browser. A later source update must update/derive this evidence through a governed qualification pipeline.
- `RISK-1264-002`: `READY_TO_RUN` in evaluator synthetic tests proves transition logic only; it does not establish WRC method correctness or production route availability.

# Appendix A — takeover / qualification questionnaire

## A1 Production trace — 19/20

1. Public product remains `EMP.1`.
2. A retained engine remains LAFEA.1.
3. B retained engine remains LAFEA.2.
4. C has no backing production stage.
5. Public projection is `buildEmp1ProductProjection`.
6. C projection calls `evaluateEmp1CQualificationState`.
7. UI receives C `blockerDetails` from projection.
8. UI does not parse source docs.
9. No WRC evaluator is registered.
10. No coefficient table is consumed by production.
11. No CAUx expected result is consumed.
12. No FEM route is modified.
13. B currentness remains independently governed.
14. Release qualification remains false.
15. Current method engineering-use authority remains false.
16. Execution route remains unregistered.
17. Evidence cannot self-register the route.
18. Current blocker codes are stable.
19. Exact implementation-head production build passes.
20. Exact future C execution adapter remains intentionally absent.

## A2 Failure / UX isolation — 19/20

The defect addressed is duplicated engineering truth: backend/product projection had blocker IDs while the UI separately owned human blocker semantics. The new path makes backend evidence the single visible blocker authority. One point remains withheld because pinned-Chromium browser qualification was explicitly skipped, not passed.

## A3 Authority / invariants — 20/20

Primary-source arbitration remains pinned-WRC-only; CAUx remains benchmark-only; no Edition-4 data is promoted; no synthetic qualification value is production evidence; complete coefficient coverage is mandatory; technical readiness, engineering authorization and route registration are separate authorities.

## A4 Independent validation — 13/20

The state-transition checker is independently executable, negative cases include partial coefficient coverage and route spoofing, and implementation-head build gates pass. WRC/CAUx engineering validation itself remains blocked/not run, so this section cannot pass engineering-critical release threshold.

## A5 Next commit / minimal patch — 19/20

This increment is complete. The next engineering dependency is source-qualified WRC/CAUx evidence acquisition or a governed evidence-builder/checker that derives this projection state from retained qualification artifacts. WRC mechanics must not be implemented from unresolved data.

**Appendix A total: 90/100 — still below the 92/100 production engineering-authority threshold and A4 is below 17/20. `QUALIFICATION_PENDING`.**
