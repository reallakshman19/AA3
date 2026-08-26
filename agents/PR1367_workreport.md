# PR1367 Work Report — EMP1-28 Spherical Method Source Boundary

## Classification

- IMPLEMENT / WRITE_ALLOWED: yes, source-governance only
- ENGINEERING_CRITICAL: yes
- Production numerical change: no
- Workflow change: no
- Owner merge authorization: active from chat (`merge, proceed next`)

## Ground truth

Branch start: `8d3c5d0d906cfb19d84dc5313f9799ba7d7f20fd`.

During PR allocation, `main` advanced to `3c951bc2e07488a1ad3a9cadad716277c7224e00` through four commits affecting only:

- `agents/PR1366_workreport.md`
- `e2e/lafea6-mesh-not-applicable.spec.js`
- `scripts/lafea-viewport-applicability-check.mjs`
- `src/workspace/lafea-workbench-content.js`

Drift classification: `NO_EMP1_WRC_SPHERICAL_SOURCE_ROUTE_ORACLE_OVERLAP`.

Re-check live main immediately before merge.

## Source custody

Pinned primary file: `docs/emp1/WRC537_2013.pdf`.

- Git blob: `ce861233928154145a9257efbbf8dbef3f5a17d1`
- governed raw SHA-256: `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`
- connector base64 content: empty
- direct spherical primary-page inspection: `NOT_RUN_EXECUTION_ENVIRONMENT`

Retained research extraction: `docs/01_WRC537_METHOD_DEFINITION.md`, blob `69e6e83ab82a0287a2a8277b62e7e223f05befe1`, explicitly `NOT_READY_FOR_IMPLEMENTATION` and based on OCR/secondary material.

## Engineering conclusion

The retained research identifies candidate spherical semantics—`Rm`, `T`, `r0`, `rm`, `t`, candidate `U`, hollow-attachment `gamma`, `rho`, and candidate round/square solid/hollow families—but these are not primary-source implementation authority.

Spherical and cylindrical method semantics remain strictly separate. In particular:

- no cylindrical gamma/beta reuse;
- no cylindrical Table-5 curve reuse;
- no gamma5 cylindrical oracle/qualification-hash reuse;
- no secondary candidate equation/domain promotion;
- no spherical handcalc or production evaluator yet.

## Changed-file ledger

1. `validation/emp1/wrc537-2013/spherical-method-source-qualification-v1.json` — fail-closed source ledger.
2. `docs/emp1/WRC537_2013_Spherical_Method_Authority.md` — engineer-facing authority boundary.
3. `scripts/emp1-wrc537-spherical-method-source-check.mjs` — static/fail-closed contract checker.
4. `agents/PR1367_workreport.md` — this living handover.

No `src/core`, route registry, UI, package manifest, tolerance, dataset, oracle, or `.github/workflows/*` file is changed.

## Validation ledger

- Repository/source inspection: PASS for custody and fail-closed classification.
- Primary PDF spherical page rendering: NOT_RUN_EXECUTION_ENVIRONMENT.
- `node scripts/emp1-wrc537-spherical-method-source-check.mjs`: NOT_RUN_EXECUTION_ENVIRONMENT.
- Production spherical calculation: NOT_RUN / NOT AUTHORIZED.
- Independent spherical hand calculation: NOT_RUN / NOT AUTHORIZED.

No unexecuted check is represented as PASS.

## Risks / unresolved items

All source closures listed in `spherical-method-source-qualification-v1.json` remain unresolved, including exact geometry scope, parameter equations/domains, load convention, equations/curves, interpolation, recovery locations, pressure boundary and benchmark example.

## Appendix A — takeover qualification

1. Production trace / scope isolation — 19/20: current cylindrical route remains separate; no production path touched.
2. Source authority distinction — 20/20: primary PDF custody vs secondary extraction is explicit.
3. Method-family semantic separation — 20/20: spherical candidate gamma cannot be confused with cylindrical gamma; beta/Table-5/oracle reuse prohibited.
4. Independent validation design — 18/20: next gate requires primary extraction before handcalc; exact benchmark cannot yet be selected.
5. Minimal patch / handover — 19/20: four source-governance files only, with PASS/NOT_RUN distinction.

Total: 96/100; every item >=17/20.

## Exact next action

After merge, continue with the next independent WRC applicability boundary. For #1365 itself, closure requires direct rendering/inspection of the pinned spherical primary pages, then a separate independently reviewed source-closure increment before any hand calculation or production implementation.
