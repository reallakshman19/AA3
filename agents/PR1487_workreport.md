# PR1487 Work Report — Issue #1321 Calculation Defaults Basic UX

## Recovery header
- Repository: `reallaksh19/Advanced_Analysis`
- PR: #1487 — `Load Calc: add Basic Calculation Defaults UX`
- Branch: `agent/issue-1321-calculation-defaults-basic-ux`
- Reconciled base: `main@d6101bcac7ccbdab9e42d7e0afbdd7b06d897462`
- Criticality: ENGINEERING_CRITICAL
- Execution mode: AUTO
- Merge authority: OWNER_ONLY_NOT_GRANTED_FOR_NEW_SUCCESSOR
- State: TAKEOVER_QUALIFIED_WRITE_ALLOWED

## Handover in 60 seconds
Issue #1321 requires normal Load Calc workflow Step 3 to become **Calculation Defaults**, with Basic and Advanced groups and visible `Value | Unit | Scope | Effective authority | Basis | Reset` semantics. Current Load Calc routes Step 3 to `non-fea-project-data-view-v2.js`, which exposes the full Project Data matrix and raw JSON `qualificationPolicy.configuredDefaults`; backend Product/default authority and scope precedence already exist.

PR1487 is D1 only. It adds a normal Calculation Defaults wrapper while preserving the existing Project Data editor under an Advanced authority drawer.

## Production trace
```text
Load Calc project-data tab
→ renderProjectDataView()
→ [D1] renderNonFeaCalculationDefaultsView()
→ projectDataStore.applyProductDefaults()
→ visible Basic defaults model
→ projectDataStore.update(path, project value/evidence/approved)
→ semantic hash + runtime revision move
→ existing Common Input/runtime staleness path

Advanced authority drawer
→ unchanged renderNonFeaProjectDataViewV2()
```

## Authority design
Basic global settings edit their **owning Project Data path**. The edit evidence is `PROJECT_POLICY`, not source/master authority. Reset clears only that complete Project Data path; the existing Product-default provider then re-materializes the governed built-in value on the next render.

Authority is path-level. Composite fields that share one Project Data path are not split into fake per-property authority. `materialElasticProperties.DEFAULT.elasticModulusPa` and `thermalExpansionPerK` therefore edit/reset together.

## D1 Basic rows
1. canonical length unit (`mm`, currently qualified choice)
2. source up axis (`Z`, currently qualified choice)
3. gravity acceleration
4. load factor
5. gravity method (`AUTO`, V2, V3-CoG request)
6. active canonical cases (`EMPTY`, `OPE`, `HYD`)
7. default corrosion allowance
8. default elastic modulus + thermal expansion coefficient (one authority path)
9. default restraint preload
10. default friction coefficient

## Advanced D1 behavior
- show Product-default profile identity/version/hash and built-in rows;
- show configured-default policy count/state;
- retain the full existing Non-FEA Project Data editor in an Advanced authority drawer;
- D2 remains responsible for the dedicated engineer-friendly scoped-default form.

## Locked invariants
- no Product-default catalog change;
- no configured-default scope precedence or provider change;
- no Common Input checker, Run routing, authorization, statics, solver or tolerance change;
- no fake source/master evidence;
- invalid numeric/case/method input fails before Project Data write;
- existing advanced editor remains available unchanged;
- no file overlap with open PR #1486.

## Planned net files
1. `src/workspace/project-data/project-data-view.js`
2. `src/workspace/project-data/non-fea-calculation-defaults-model.js`
3. `src/workspace/project-data/non-fea-calculation-defaults-view.js`
4. `scripts/non-fea-calculation-defaults-basic-ux-check.mjs`
5. `agents/PR1487_workreport.md`
6. `agents/claims/PR1487.yaml`
7. `agents/status/PR1487.yaml`

Temporary WIP marker must be absent from final net tree. Aggregate registration is intentionally deferred to avoid sharing `scripts/run-non-fea-checks.mjs` with open #1486.

## Validation truth
- live main grounding: PASS_SOURCE_INSPECTION
- concurrent-main overlap: PASS_NONE (EMP.1-only)
- Issue #1321 D1 UX requirement trace: PASS_SOURCE_INSPECTION
- current raw-JSON/default-ledger UX gap: PASS_SOURCE_INSPECTION
- existing Product-default write/staleness seam: PASS_SOURCE_INSPECTION
- configured-default scope/provider preserved: PASS_SOURCE_INSPECTION
- focused Node check: NOT_RUN
- Non-FEA aggregate: NOT_RUN
- imports/build: NOT_RUN
- `git diff --check`: NOT_RUN

No NOT_RUN is represented as PASS.

## Appendix A — takeover qualification
A1 Production trace 20/20 · A2 Failure isolation 20/20 · A3 Authority invariant 20/20 · A4 Independent validation 18/20 · A5 Minimal patch 20/20

**Score: 98/100; minimum 18/20. WRITE_ALLOWED.**

## EXACT_NEXT_ACTION
Implement the pure Basic defaults model, the Calculation Defaults wrapper, route Load Calc project-data to it, add standalone falsifiers, remove WIP marker, reconcile exact scope, and leave PR1487 ready for owner review without merging.
