# PR1387 workreport — EMP1-37 cylindrical surface/sign source boundary

## Classification
ENGINEERING_CRITICAL / SOURCE_GOVERNANCE_ONLY

## Base and head
- Base at PR creation: `main@9e4f89db30899e24b3c76b4fb5cb9b423d4631c4`
- Issue: #1385
- PR: #1387
- Branch: `agent/emp1-37-cylindrical-surface-sign-source-boundary`

## Engineering conclusion
Current Table-5 sign arrays and algebraic load-polarity behavior remain unchanged. The controlled repository does not yet contain direct primary-source proof for the physical `u/l` surface meaning, A/B/C/D point meaning, complete load-family sign matrix, or membrane±bending surface reconstruction. The legacy extraction is `NOT_READY_FOR_IMPLEMENTATION` and explicitly leaves exact sign reconstruction unresolved.

Status: `BLOCKED_PRIMARY_SURFACE_SIGN_SEMANTICS_UNQUALIFIED`.

## Authority protection
- production sign arrays: unchanged
- source authority from secondary/OCR extraction: false
- engineering authority for newly claimed surface/sign semantics: false
- production authority: false
- global EMP.1.C authority: false
- code-compliance authority: false
- release authority: false

## Changed-file ledger
1. `validation/emp1/wrc537-2013/cylindrical-surface-sign-source-qualification-v1.json`
2. `docs/emp1/WRC537_2013_Cylindrical_Surface_Sign_Authority.md`
3. `scripts/emp1-wrc537-cylindrical-surface-sign-source-check.mjs`
4. `agents/PR1387_workreport.md`

No production evaluator, route registry, coefficient dataset, oracle, tolerance, UI or workflow file changed.

## Validation ledger
- static/source review: PASS for fail-closed intent
- local Node checker execution: NOT_RUN_EXECUTION_ENVIRONMENT
- numerical WRC comparison: NOT_RUN / not applicable to this source-only increment
- production-route qualification: NOT_RUN / explicitly outside scope

## Open source questions
Direct WRC 537 primary-source verification is still required for physical recovery locations/surfaces, sign tables, load-polarity semantics, and common-point algebraic superposition.

## Appendix A — takeover questions
1. What exact source table/equation defines A/B/C/D and `u/l`?
2. Does `u/l` mean outside/inside shell surface or another convention?
3. Are curve ordinates unsigned magnitudes paired with source sign tables?
4. For each of P, Mc, Ml, Vc, Vl and Mt, what are the exact signs at all eight locations?
5. Are all component stresses algebraically superposed at one common physical point before stress intensity?

A successor must not answer these from current code behavior, CAUx output, generic shell theory or OCR alone.

## Next action
Obtain direct primary WRC source-page evidence. Until then retain current mechanics unchanged and keep new surface/sign authority false.
