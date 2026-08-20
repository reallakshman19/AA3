# PR1264 Work Report — EMP.1 current-main reconciliation

## Recovery header

- PR: #1264
- Issue: #1261
- Branch: `agent/emp1-c-qualification-gate-issue1261`
- Current-main reconciliation base: `main@ddfad5cd12cdbf271509031817ad9590704620c3`
- Reconciliation merge commit: `46bc2e0e6b5542d63427df0b6c60aa08184ead6e`
- Last exact-head validation checkpoint before this report: `45a19f26d8ae602daa386c04adb9a173b7660961`
- Merge authority: `GRANTED_BY_OWNER`
- Handover readiness: `READY`
- Global EMP.1.C engineering authority: `BLOCKED`
- Bounded gamma=5 production-route authority: retained from current-main PR #1300 only

## Scope actually being merged

This reconciliation intentionally preserves current `main` as tree authority and ports only the residual qualified EMP.1 work from the stacked #1264/#1266 history:

1. EMP.1.A result presentation is null-safe and does not manufacture missing engineering results.
2. A→B refresh uses A's canonical input/result custody rather than the raw editable source document.
3. EMP.1.C has one backend fail-closed qualification-state projection consumed by product/UI presentation.
4. Current source custody is represented accurately as `VERIFIED / PASS_SOURCE_CUSTODY` for the pinned WRC and CAUx PDFs.
5. The already-merged current-main bounded gamma=5 route remains a separate capability and does not self-promote global EMP.1.C authority.
6. The EMP1-02 historical narrow-delivery workflow guard is scoped to its original delivery branch; all substantive gamma=5 numerical/registry checks remain mandatory on later PRs.

Explicitly excluded from this merge:

- gamma=15 route expansion;
- differential-pressure / pressure-thrust production implementation;
- Kn/Kb expansion;
- interpolation or cross-variant fallback;
- general WRC537 release authority;
- unrelated LAFEA bundle or B02D repairs.

## Source custody

### WRC 537 source

- custody state: `VERIFIED`
- qualification state: `PASS_SOURCE_CUSTODY`
- raw PDF SHA-256: `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`

### CAUx 2017 benchmark source

- custody state: `VERIFIED`
- qualification state: `PASS_SOURCE_CUSTODY`
- raw PDF SHA-256: `c1e92798a7bc172d649007ad88f6be548651f07a01cb2fbf83343e2283e0e83e`

Source custody PASS is not equivalent to WRC method release.

## Current global EMP.1.C qualification state

Global EMP.1.C remains fail-closed on six independent gates:

1. `WRC_DATASET_NOT_READY`
2. `WRC_DIMENSIONAL_CONTRACT_UNRESOLVED`
3. `WRC_RUNTIME_CONTRACTS_UNRESOLVED`
4. `WRC_NUMERICAL_COEFFICIENTS_MISSING`
5. `WRC_SIGN_ARBITRATION_OPEN`
6. `CAUX_PP24_31_NOT_FROZEN`

Current retained evidence includes:

- WRC unresolved JSON paths: `21`
- WRC open issues: `7`
- dimensional contradictions: `3`
- required scalar a–j coefficients: `1200`
- qualified numeric scalar coefficients in the global dataset seam: `0/1200`
- sign conflicts: `2` (spherical M1/M2 retained cross-check)
- CAUx pp.24–31 expected-values freeze: `false`
- CAUx independent hand calculation in the global C gate: `NOT_RUN`
- global method engineering-use authorization: `false`
- global C production route registered: `false`

The bounded route from PR #1300 is intentionally separate:

```text
shellFamily = CYLINDRICAL
attachmentShape = ROUND
variant = ORIGINAL
gamma = 5
beta = 0.05 ... 0.50
differentialPressure = 0
Kn = 1
Kb = 1
interpolationAllowed = false
crossVariantFallbackAllowed = false
globalEmp1CRouteAuthority = false
releaseQualified = false
```

## Implemented / retained fixes

### IMP-1264-001 — canonical A→B custody

`src/core/emp1/emp1-a-to-b-refresh.js` now requires the A execution result to carry its canonical input and rejects a mismatch with `EMP1_A_CANONICAL_INPUT_MISMATCH`. B refresh evidence is tied to the canonical A model/result rather than a mutable source document snapshot.

### IMP-1264-002 — null-safe A result presentation

`src/workspace/lafea-result-presenters/local-stress.js` and the dedicated regression checker preserve missing-result truth instead of formatting absent numerical fields as if calculated.

### IMP-1264-003 — single backend C qualification authority

`src/core/emp1/emp1-c-qualification-state.js` owns current global-C gate state and blocker details. `emp1-public-product-contract.js`, workspace projection, and guided UI consume that state rather than keeping a separate UI engineering-truth dictionary.

### IMP-1264-004 — bounded route remains distinct from global C authority

Current-main PR #1300's gamma=5 bounded registry is retained. Product projection can expose the bounded capability without setting the global route registered or authorizing general EMP.1.C execution.

### IMP-1264-005 — CI scope semantics corrected

`.github/workflows/emp1-gamma5-main-route.yml` still executes the independent Table-5 oracle, zero-dp load producer, bounded route/falsifiers, and registry/global-route separation on later integration PRs. Only the original EMP1-02 delivery-specific changed-file restriction is limited to its original delivery branch.

## Exact-head validation ledger

Checkpoint `45a19f26d8ae602daa386c04adb9a173b7660961`:

- `EMP.1 current-main independent baseline` — **PASS**, run `32387286468`.
- `EMP.1 gamma5 bounded route on current main` — **PASS**, run `32387286452`.
  - delivery-scope semantics — PASS
  - independent gamma=5 full Table-5 oracle — PASS
  - zero-dp upstream load producer — PASS
  - bounded route and negative falsifiers — PASS
  - registry bounded / global route absent — PASS
- `LAFEA visible workbench qualification` — **FAIL, INHERITED CURRENT-MAIN BUNDLE GATE**, run `32387286460`.
  - exact checkout / clean tree — PASS
  - static/projection checks — PASS
  - governed shell compiler/execution custody — PASS
  - standalone boundary — PASS
  - standalone LAFEA bundle — PASS
  - production Pages bundle ceiling — FAIL before browser execution
  - pinned Chromium — NOT_RUN because prior build gate failed
  - Stage-17 browser — NOT_RUN because prior build gate failed

### Inherited broad-suite evidence

Diagnostic PR #1298 was created specifically from exact `main@d24a5a1ecb5dc555cd11a29429b02106f5cbfe9b` with only a workflow-comment trigger. Run `32365166074` independently reproduced:

```text
main-DFyFxjN1.js = 1,499,299 bytes
production ceiling = 1,179,648 bytes
```

The reconciled #1264 exact-head build reports the same 1,499,299-byte main chunk. This bundle failure therefore predates this EMP.1 integration and is not repaired or waived here.

## Changed-file / authority ledger

Relative to `main@ddfad5cd12cdbf271509031817ad9590704620c3`, the intended final delta is bounded to EMP.1 qualification/presentation/custody plus this work report and the gamma=5 workflow-scope correction. No gamma15/pressure/Kn-Kb production implementation is admitted.

Authority rules preserved:

- Source custody may be PASS while method readiness remains BLOCKED.
- Synthetic fixtures are software-contract tests only, never WRC engineering evidence.
- Qualification evidence cannot self-register a global production route.
- The bounded gamma=5 route cannot authorize another gamma, beta range, pressure state, Kn/Kb state, interpolation policy, or WRC variant.
- No broad-suite mainline defect is reclassified as EMP.1 PASS; inherited failures remain explicitly recorded.

## Merge disposition

Owner merge authority is granted. Merge is permitted when the exact final head preserves the passing EMP.1 baseline and gamma=5 functional qualification. The inherited production-bundle ceiling failure is recorded as existing current-main debt with independent exact-main evidence and is not an EMP.1 release-qualification claim.

# Appendix A — next-agent qualification questions

1. Can you distinguish source custody (`VERIFIED/PASS_SOURCE_CUSTODY`) from WRC method readiness? Expected: yes; custody alone grants no method authority.
2. What globally blocks EMP.1.C? Expected: the six blocker IDs listed above.
3. Is gamma=5 generally authorized? Expected: no; only the exact bounded route from #1300 is registered.
4. May gamma15, nonzero differential pressure, Kn/Kb ≠ 1, interpolation, or another variant silently fall through? Expected: no; fail closed.
5. What proves the current bundle gate is inherited? Expected: diagnostic PR #1298/run 32365166074 reproducing 1,499,299 bytes on exact main.
6. May the inherited bundle failure be marked PASS? Expected: no; record FAIL/NOT_RUN consequences explicitly.
7. What must be re-run after any final-head change? Expected: current-main independent baseline and gamma=5 bounded-route workflow; inspect any newly triggered EMP.1 source/qualification workflows before merge.
