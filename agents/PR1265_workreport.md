# PR1265 Work Report — artifact-derived EMP.1.C qualification evidence

## Current state

- PR: #1265 (stacked on draft PR #1264)
- Issue: #1261
- Parent/base branch: `agent/emp1-c-qualification-gate-issue1261@1e2a0823e99bacac115f95041a27d2e8adc43b0c`
- Implementation checkpoint: `dd3244985465c7f607e2c85d7c2438726361f15d`
- Branch: `agent/emp1-c-artifact-derived-evidence-issue1261`
- Intent: engineering-critical qualification provenance integration
- Handover readiness: `READY`
- Takeover authority: `QUALIFICATION_PENDING`
- Merge authority: `NOT_GRANTED`

## Mission

Remove the manually maintained current EMP.1.C blocker/evidence summary and derive it deterministically from retained WRC/CAUx qualification artifacts. Preserve fail-closed source, benchmark, method-authority and execution-route boundaries.

This PR does not implement WRC mathematics, coefficient values, sign corrections, CAUx expected values, local stresses, engineering-use authority, or a production C route.

## Implemented

### IMP-1265-001 — retained-artifact derivation

Added `scripts/emp1-c-qualification-evidence-lib.mjs`.

Required retained inputs:

1. `validation/emp1/wrc537-2013/existing-dataset-audit-v1.json`
2. `validation/emp1/wrc537-2013/existing-dataset-manifest.json`
3. `validation/emp1/wrc537-2013/source-ledger.json`
4. `validation/emp1/wrc537-2013/hexagon-sign-crosscheck-v1.json`
5. `validation/emp1/caux2017-wrc01f/source-ledger.json`
6. `validation/emp1/caux2017-wrc01f/hexagon-wrc107-independent-precheck-qualification-v1.json`

Optional future retained inputs, absent today and fail-closed:

7. `validation/emp1/caux2017-wrc01f/caux-pp24-31-benchmark-qualification-v1.json`
8. `validation/emp1/wrc537-2013/emp1-c-method-authorization-v1.json`

The derivation rejects malformed schemas, WRC audit/manifest blob-binding mismatch, coefficient-row accounting mismatch, CAUx page-range mismatch, supplemental-precheck authority escalation, benchmark qualification without source custody, production-contaminated CAUx expected values, and method-authorization hash mismatch.

### IMP-1265-002 — generated runtime evidence

Added:

- `scripts/emp1-c-qualification-evidence-build.mjs`
- `src/core/emp1/emp1-c-qualification-evidence.generated.js`

The generated evidence declares:

```text
derivation.mode = RETAINED_ARTIFACT_DERIVATION
manualSummaryPermitted = false
```

Current derived state remains:

```text
WRC unresolved JSON paths      21
WRC open issues                 7
WRC numericalData               0
WRC coefficient coverage        0/120
WRC unresolved coefficients   120
WRC unresolved parameter rows 120
WRC raw source custody          BLOCKED
WRC sign conflicts              2
CAUx raw source custody         BLOCKED
CAUx expected values frozen     false
CAUx independent hand calc      NOT_RUN
Hexagon precheck may satisfy A4 false
method engineering authority    false
```

### IMP-1265-003 — exact drift checker

Added `scripts/emp1-c-qualification-evidence-check.mjs`.

It re-derives evidence from retained artifacts and requires both:

1. exact generated module text equality with the deterministic renderer;
2. exact generated exported-object deep equality with the derived object.

A retained-source change therefore cannot silently leave a stale current UI/backend qualification summary.

### IMP-1265-004 — source-custody readiness gate

`src/core/emp1/emp1-c-qualification-state.js` now consumes generated retained-artifact evidence.

Additional readiness conditions:

- WRC dataset: source custody qualified + raw PDF SHA-256 present;
- WRC sign arbitration: source-qualified pinned-WRC custody;
- CAUx benchmark: source identity + source custody + raw PDF SHA-256 + frozen expected values + independent hand-calc PASS + benchmark hash.

The four current technical blocker IDs remain unchanged.

User-visible wording preserves the prior WRC/CAUx substrings while appending source-custody evidence, avoiding unnecessary UI-contract breakage.

### IMP-1265-005 — positive/negative software-contract qualification

Added `scripts/emp1-c-qualification-evidence-self-test.mjs`.

Synthetic contract-only positive path proves:

```text
qualified WRC source custody
+ READY dataset
+ 120/120 coefficients
+ pinned-WRC sign arbitration
+ qualified CAUx source custody
+ frozen independent CAUx benchmark
+ retained method authorization
= technical/method READY
```

Execution still remains blocked until an explicit route is registered. Adding a synthetic route only in the evaluator fixture reaches `READY_TO_RUN`.

Negative cases reject:

- production-derived CAUx expected values;
- method/benchmark hash mismatch;
- WRC audit/manifest binding mismatch;
- coefficient row-accounting mismatch;
- bounded Hexagon precheck promoted to CAUx A4;
- CAUx benchmark qualification before source custody.

Synthetic values are software-contract fixtures only and are not engineering expected values.

### IMP-1265-006 — existing runner integration

`scripts/lafea-stage17-browser-run.mjs` invokes:

```text
emp1-c-qualification-evidence-self-test
emp1-c-qualification-evidence-check
emp1-c-qualification-state-check
emp1-public-product-check
emp1-a-to-b-refresh-check
```

before Playwright tests and before the unrelated LAFEA.3 B01/B02 gate.

The existing workflow installs Chromium before invoking this runner; this PR deliberately does not modify workflow files.

## Current engineering truth

EMP.1.C remains `BLOCKED / NOT_AUTHORIZED / ROUTE_NOT_REGISTERED`.

The raw source ledgers remain:

```text
WRC  rawPdfSha256 = null
WRC  custodyState = UNRESOLVED_RAW_BYTES
WRC  qualificationState = BLOCKED
CAUx rawPdfSha256 = null
CAUx custodyState = UNRESOLVED_RAW_BYTES
CAUx qualificationState = BLOCKED
```

No source, coefficient, sign, benchmark, tolerance or engineering result was guessed or promoted by this PR.

## Validation

At the implementation checkpoint:

- connector diff/containment inspection: `PASS`
- source-artifact structural audit: `PASS_REVIEW`
- generated-evidence current values independently reconciled to retained JSON: `PASS_REVIEW`
- local repository execution: `NOT_RUN` — container cannot resolve `github.com`; no checkout available
- exact-head GitHub Actions execution of new self-test/drift/state checks: `PENDING` at this checkpoint
- WRC engineering qualification: `BLOCKED`
- CAUx pp.24–31 engineering qualification: `BLOCKED`
- release qualification: `false`

Do not convert pending execution to PASS without exact-head evidence.

## Changed-file ledger

Implementation files relative to parent PR #1264:

1. `scripts/emp1-c-qualification-evidence-lib.mjs`
2. `scripts/emp1-c-qualification-evidence-build.mjs`
3. `scripts/emp1-c-qualification-evidence-check.mjs`
4. `scripts/emp1-c-qualification-evidence-self-test.mjs`
5. `src/core/emp1/emp1-c-qualification-evidence.generated.js`
6. `src/core/emp1/emp1-c-qualification-state.js`
7. `scripts/emp1-c-qualification-state-check.mjs`
8. `scripts/emp1-public-product-check.mjs`
9. `scripts/lafea-stage17-browser-run.mjs`
10. `agents/PR1265_workreport.md`
11. `agents/status/PR1265.yaml`
12. `agents/claims/PR1265.yaml`

No FEM formulation/solver/meshing file; no workflow file; no WRC numerical source data; no CAUx expected-value artifact; no production route.

## Decisions / risks

- `DEC-1265-001`: Current qualification truth must be derived from retained artifacts; manual summary maintenance is prohibited.
- `DEC-1265-002`: Raw-PDF source custody is part of technical readiness, not an informational side field.
- `DEC-1265-003`: The bounded Hexagon pressure-thrust precheck remains supplemental and cannot satisfy CAUx A4.
- `DEC-1265-004`: Generated runtime evidence is reviewable code, but its authority comes only from retained artifacts plus the exact drift gate.
- `DEC-1265-005`: No workflow mutation in this increment.
- `RISK-1265-001`: The optional future CAUx benchmark/method authorization schemas are software contracts only until real independently qualified artifacts exist.
- `RISK-1265-002`: Exact-head execution remains required to prove no syntax/build/test defect in the new derivation seam.

# Appendix A — handover questionnaire

## A1 Production trace — 20/20

1. EMP.1 public product identity unchanged.
2. A engine unchanged.
3. B engine unchanged.
4. C route remains absent.
5. C current evidence enters through generated module.
6. Generated module is imported only by C qualification state.
7. Derivation inputs are explicit retained paths.
8. WRC audit metrics are not duplicated manually.
9. WRC manifest/audit blob binding is checked.
10. Source ledger metadata uses existing custody validator.
11. Raw SHA state is retained from source ledger.
12. Sign conflicts are derived from comparison rows.
13. CAUx page range is checked as exact pages 24–31.
14. Supplemental precheck is explicitly non-A4.
15. Optional CAUx qualification is fail-closed while absent.
16. Optional method authorization is fail-closed while absent.
17. Product route custody remains code-owned.
18. UI consumes backend blocker details from parent PR #1264.
19. Four current blocker identities remain stable.
20. Release-qualified remains false.

## A2 Current failure / UX isolation — 19/20

The prior failure mode was manual qualification-summary drift. The generated/drift-check seam removes that duplication while preserving existing visible blocker phrases. One point withheld until exact-head browser execution confirms the rendered surface.

## A3 Authority / invariant protection — 20/20

No Edition-4 data promotion; no Hexagon secondary reference becomes WRC sign authority; no supplemental precheck becomes CAUx A4; no production observation creates expected values; no raw SHA alone creates custody; no technical qualification creates method authority; no method authority self-registers a route.

## A4 Independent validation — 15/20

The software-contract self-test and negative cases are implemented, but exact-head execution is still pending at this checkpoint and the actual WRC/CAUx engineering qualification remains blocked.

## A5 Next commit / minimal patch — 20/20

After exact-head execution/reconciliation, the next technical dependency is not WRC production code. It is source-qualified retained evidence: raw-PDF custody and then exact WRC/CAUx qualification artifacts. No further manual blocker-summary patch should be needed.

**Appendix A: 94/100 total, but A4 <17/20; `TAKEOVER_AUTHORITY=QUALIFICATION_PENDING`.**
