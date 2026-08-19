# PR1265 Work Report — artifact-derived EMP.1.C qualification evidence

## Current state

- PR: #1265 (stacked on draft PR #1264)
- Issue: #1261
- Parent/base branch: `agent/emp1-c-qualification-gate-issue1261@1e2a0823e99bacac115f95041a27d2e8adc43b0c`
- Implementation checkpoint: `dd3244985465c7f607e2c85d7c2438726361f15d`
- Exact code head exercised by CI: `7cc4fd5e5f27a670d55fae64b8e361093b9730fe`
- Branch: `agent/emp1-c-artifact-derived-evidence-issue1261`
- Intent: engineering-critical qualification provenance integration
- Handover readiness: `READY`
- Provenance/software seam: `QUALIFIED_EXACT_HEAD`
- EMP.1.C engineering-method authority: `BLOCKED`
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

User-visible wording preserves the established WRC/CAUx phrases while appending source-custody evidence. The parent PR #1264 browser artifact exposed an earlier `pp.24-31` vs required `pp.24–31` mismatch; this PR corrects that compatibility defect.

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

## Exact-head validation

GitHub Actions run on exact code head `7cc4fd5e5f27a670d55fae64b8e361093b9730fe`:

```text
checkout / clean tree                         PASS
npm ci                                        PASS
generic static / projection                   PASS
shell compiler / execution custody            PASS
standalone boundary comparison                PASS
standalone LAFEA build                        PASS
production Pages build                        PASS
pinned Chromium installation                  PASS
EMP.1 artifact derivation self-test           PASS_EXACT_HEAD
EMP.1 generated-artifact drift check          PASS_EXACT_HEAD
EMP.1 C qualification-state check             PASS_EXACT_HEAD
EMP.1 public-product check                     PASS_EXACT_HEAD
EMP.1 A→B Node check                           PASS_EXACT_HEAD
first EMP.1 Playwright proof                   PASS_EXACT_HEAD
second production EMP.1 journey                FAIL_DOWNSTREAM_BROWSER
```

The runner is fail-fast. Because the first Playwright proof executed and passed, every new Node prerequisite listed before it necessarily returned zero on the exact code head.

Exact child browser artifact:

```text
artifact id 9362053688
digest sha256:ffc9451a1a0ca1d462940f6bb57f0c3dca376e14e294ebc59a8fae81413366cf
```

### ISS-1265-001 — downstream production A-run browser failure

The second existing test:

```text
production exposes one EMP.1 product with A/B retained engines and C visibly blocked
```

passes the C blocker/UI assertions, loads the simulated EMP.1.A source, enables the A Run button and clicks it, but then fails because:

```text
[data-role="lafea-result-highlights"]
Expected: Max |transferred force|
Observed: result-highlights element absent
```

The captured page still shows EMP.1.A as READY_TO_RUN rather than calculated.

This is downstream of all #1265 derivation/state checks. It is not being patched in this provenance PR without a separate RCA because doing so would mix A execution/UI mechanics with qualification-artifact derivation.

### Parent comparison

Parent PR #1264 exact head `1e2a0823...` also failed the same Stage-17 workflow step, but its first EMP.1 Playwright proof stopped earlier at:

```text
expected CAUx 2017 pp.24–31
received CAUx 2017 pp.24-31
```

PR #1265 fixes that parent assertion and advances farther. Therefore the workflow-step failure itself is inherited; the later A-result-panel assertion is newly exposed by progressing farther and is **not yet proven inherited at the exact assertion level**.

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
- `DEC-1265-006`: Keep the downstream A-run browser defect outside this provenance increment until separately RCA-grounded.
- `RISK-1265-001`: The optional future CAUx benchmark/method authorization schemas are software contracts only until real independently qualified artifacts exist.
- `RISK-1265-002`: WRC/CAUx engineering method qualification remains blocked by source custody and missing numerical/source evidence even though the provenance software seam passes.

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

## A2 Current failure / UX isolation — 20/20

Manual qualification-summary drift is removed. Exact-head browser evidence proves the artifact-derived C blockers render correctly, including the en-dash CAUx range and new source-custody state. A later A-run result-panel defect is isolated after those assertions and recorded separately.

## A3 Authority / invariant protection — 20/20

No Edition-4 data promotion; no Hexagon secondary reference becomes WRC sign authority; no supplemental precheck becomes CAUx A4; no production observation creates expected values; no raw SHA alone creates custody; no technical qualification creates method authority; no method authority self-registers a route.

## A4 Independent validation — 17/20

The derivation self-test, exact generated-artifact drift check, state check and public-product check all executed on exact head, and the first browser proof passed. Three points remain withheld because actual WRC/CAUx engineering qualification is still blocked and the downstream A-run browser journey is red.

## A5 Next commit / minimal patch — 20/20

The provenance derivation seam requires no further engineering-summary patch. The next source-method dependency is source-qualified retained evidence: raw-PDF custody, then exact WRC/CAUx qualification artifacts. The separately exposed A-run browser failure should be handled as its own RCA/fix increment rather than folded into source qualification.

**Appendix A: 97/100. Provenance/software seam qualified; `EMP.1.C` engineering method authority remains BLOCKED. No merge authorization.**
