# PR1299 Work Report — EMP1-01 current-main baseline

## Current state

- PR: #1299
- branch: `agent/emp1-01-main-baseline-issue1261`
- base: `main@d24a5a1ecb5dc555cd11a29429b02106f5cbfe9b`
- purpose: freeze an independent WRC537 γ=15 hand-calculation baseline on current main before production/UI integration
- authority: `EVIDENCE_ONLY_NOT_PRODUCTION_ROUTE_AUTHORITY`
- merge authority: `OWNER_ONLY_NOT_GRANTED`

## Completed

- [x] created clean successor from current main
- [x] reconciled current main against qualified feature-stack head `014e8fa4085b7e4b68ec03d7bd0e56f3e8ef7b83`
- [x] confirmed WRC PDF/source-extraction blob identity across main and feature stack
- [x] froze γ=15 / β=0.155 independent Table-5 baseline
- [x] added Node-builtins-only independent checker with zero `src/core` imports
- [x] froze 14 source figures, 16 ordinates, 9 scale factors, 24 stress components, 8 stress intensities
- [x] froze governing result `Du = 19.492158999951467 MPa`
- [x] recorded current public-EMP.1 versus backing-stage UI/execution seam
- [x] added evidence-only CI scope guard
- [ ] PR workflow final conclusion — pending at this workreport revision

## Important correction found

A prior UI planning example labeled the governing γ=15 stress intensity `19.492158999951467 MPa` as occurring at `Bu`. The frozen independent vector proves the governing location is `Du`.

Location order is fixed as:

```text
Au Al Bu Bl Cu Cl Du Dl
```

Stress-intensity vector:

```text
18.877679104536185
15.68498380203486
14.461787671213997
12.815631228821726
15.258299294009637
14.333106139468912
19.492158999951467
16.955471067022373
```

Any future UI or production result that associates the maximum with `Bu` is a location-custody regression.

## WRC source basis

Controlled source:

```text
docs/emp1/WRC537_2013.pdf
SHA-256 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
```

Primary locators used:

- §4.2.1 Eq.25 — γ
- §4.2.2.1 Eq.26 — β for round attachment
- §4.3.1 Eqs.31–36 — P
- §4.3.2 Eqs.37–42 — Mc
- §4.3.3 Eqs.43–46 — Ml
- §4.3.4 Eq.47 — Mt shear
- §4.3.5 Eqs.48–49 — Vc/Vl shear
- Table 4 — signs/locations
- Table 5 — cylindrical computation sheet
- §4.4 — Original-curve domain rule

## Changed-file ledger

1. `.github/workflows/emp1-main-baseline.yml`
   - evidence-only path guard
   - independent baseline re-observation
2. `docs/emp1/EMP1_MAIN_RECONCILIATION_20260820.md`
   - main/feature-stack reconciliation
   - UI/execution seam and successor sequence
3. `scripts/emp1-main-gamma15-independent-baseline-check.mjs`
   - no production imports
   - hashes source, parses source coefficient rows, performs independent arithmetic
4. `validation/emp1/wrc537-2013/main-baseline-gamma15-handcalc-v1.json`
   - frozen engineering baseline, expected vectors, tolerances and blockers
5. `agents/PR1299_workreport.md`
   - this handover record

## Explicit NOT_RUN / BLOCKED

- production γ=5 port to current main: NOT_RUN / EMP1-02
- real product-owned `runEmp1()` wiring: NOT_RUN / EMP1-03
- unified EMP.1 UI redesign: NOT_RUN / EMP1-04
- browser/Chromium UI validation: NOT_RUN / no UI change in EMP1-01
- γ=15 route registration: BLOCKED / EMP1-07
- nonzero differential pressure / pressure thrust: BLOCKED
- non-unity `Kn/Kb`: BLOCKED
- non-tabulated γ interpolation: BLOCKED
- global/full-domain EMP.1.C: BLOCKED
- code acceptance: NOT_PERFORMED
- release qualification: false

## Next action if CI PASS

Start EMP1-02 from current main (or from the eventual merged EMP1-01 base if owner authorizes merge) and port only the already-qualified γ=5 zero-dp `Kn=Kb=1` route. Do not mix UI redesign, pressure thrust, γ=15 registration, or Appendix-B SCF work into EMP1-02.

## Appendix A — takeover questions

1. Prove from source and frozen baseline why the governing point is `Du`, not `Bu`, and identify the exact sign/location arrays involved.
2. Explain why `16/16 ordinates + 32 stress values PASS` does not itself authorize a production route.
3. Trace current-main `runEmp1()` and identify why the current workbench still behaves as a backing-stage editor.
4. State the exact γ=5 production boundary that may be ported in EMP1-02 and list all inputs that must fail before WRC evaluation.
5. Explain why pressure thrust and `Kn/Kb` must remain separate qualification producers rather than being folded into the Table-5 evaluator.
