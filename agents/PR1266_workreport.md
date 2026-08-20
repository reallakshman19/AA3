# PR1266 Work Report — EMP.1.A/B production analytical repair

## Current state

- Issue: #1261
- Parent PR: #1264
- Parent head at branch cut: `2e26413b0950a80ecb78423f3972fac9c8dc8e6d`
- Branch: `agent/emp1-a-run-state-retention-issue1261`
- Intent: engineering-critical production-browser RCA and minimal analytical repair
- Merge authority: `NOT_GRANTED`
- Handover readiness: `READY`
- EMP.1 analytical scope: `PASS`
- Full Stage-17 workflow: `FAIL_EXTERNAL_B02D`
- Release qualification: `false`

## Closed defect 1 — EMP.1.A qualified result not rendered

### Observed failure

The production EMP.1.A Run transaction completed in state, but `[data-role="lafea-result-highlights"]` remained absent.

### Root cause

The workbench subscription path intentionally isolates subscriber exceptions. The LAFEA.1 result presenter threw while processing a legitimate pressure-result record with:

```text
axialPressureStress = null
```

That null is valid when axial treatment is represented by an explicit axial resultant or when an axial pressure stress is not requested. The calculation/result state therefore advanced to `QUALIFIED`, while the failed subscriber left the DOM at the previous render.

### Repair

`src/workspace/lafea-result-presenters/local-stress.js` now preserves the result contract:

- numeric axial pressure stress renders as a stress row;
- explicit axial resultant renders separately in force units;
- a null axial pressure stress is omitted;
- null is never converted to zero or fabricated as engineering evidence.

### Qualification

`PASS` on exact-head Stage-17 prerequisites and isolated Chromium production journey:

- `scripts/emp1-a-result-presentation-check.mjs`
- `e2e/lafea-emp1-a-run-state.spec.js`

The browser probe establishes after Run:

```text
active stage = LAFEA.1
lifecycle binding = CURRENT
execution.status = QUALIFIED
result.schema = local-attachment-foundation-result/v1
visible transferred-force result highlights = PRESENT
```

## Closed defect 2 — EMP.1.B refresh rejected current A evidence

### Observed failure

After rerunning A, B reported:

```text
STALE A EVIDENCE REFRESH BLOCKED
INVALID_FOUNDATION_EVIDENCE
Canonical JSON does not support undefined at $.
```

### Root cause

The production workbench intentionally retains two different A representations:

1. `A.document` — editable source-form foundation document;
2. `A.execution.canonicalInput` — canonical foundation model used by the qualified kernel.

B's `sourceEvidence.foundationModel` contract requires the canonical foundation model. The old refresh path incorrectly inserted editable `A.document` as canonical foundation evidence and compared B's canonical foundation hash against the editable source-form document hash.

### Repair

`src/core/emp1/emp1-a-to-b-refresh.js` now:

1. proves `semanticHash(A.execution.source) == semanticHash(A.document)`;
2. reconstructs/validates the canonical A model from the retained A document;
3. requires and validates `A.execution.canonicalInput`;
4. proves the reconstructed canonical A model matches `A.execution.canonicalInput`;
5. writes only that canonical model into `B.sourceEvidence.foundationModel`;
6. compares B currentness against the canonical A model and A result;
7. rejects a forged/mismatched canonical input with `EMP1_A_CANONICAL_INPUT_MISMATCH`.

No B-owned screening factor, evaluation request, qualification profile, or result request is invented or silently rewritten.

### Qualification

`PASS` on exact-head deterministic and Chromium checks:

- `scripts/emp1-a-to-b-refresh-check.mjs`
- `scripts/emp1-simulated-a-b-custody-check.mjs`
- `e2e/lafea-emp1-a-to-b-refresh.spec.js`

Observed deterministic custody facts include:

```text
staleState = STALE_A_EVIDENCE_REFRESH_AVAILABLE
refreshedState = CURRENT_A_EVIDENCE
editableWorkbenchState = CURRENT_A_EVIDENCE
editableFoundationCanonicalized = true
forgedCanonicalInput = EMP1_A_CANONICAL_INPUT_MISMATCH
preserved CASE-B / LC-A factor = -0.5
incompatible refresh = LOAD_CASE_REFERENCE_MISSING
inventedBInputs = false
```

The simulated source check also proves:

```text
semanticHash(A.execution.canonicalInput)
  == semanticHash(B.document.sourceEvidence.foundationModel)
semanticHash(A.execution.result)
  == semanticHash(B.document.sourceEvidence.foundationResult)
```

The editable A document hash is intentionally different from the canonical A model hash.

## Exact-head Stage-17 result

Exact checked head before this metadata refresh:

`1d8ac90f165d9596918fac6fb852451c5e155cfc`

GitHub Actions run `32259399547`, job `96088759114`:

### EMP.1 analytical gates — PASS

Before entering the inherited LAFEA.3/B02 gate, the run passed:

- EMP.1.C qualification evidence self-test;
- EMP.1.C retained qualification evidence check;
- EMP.1.C state check, correctly remaining BLOCKED;
- public EMP.1 product contract;
- A-to-B deterministic refresh check;
- A result presentation check;
- simulated A/B custody check;
- unified EMP.1 browser journey;
- isolated A production Run-state browser probe;
- A→B currentness-refresh browser journey;
- empirical grouped-edit browser check.

### Full workflow — FAIL at external B02D boundary

The run then failed at:

```text
scripts/lafea-b02d-probe-stable-polar-mesh-check.mjs:60
T3/L1: expected PASS, observed BLOCK
LAFEA_B02_PRODUCTION_SEQUENCE_BLOCKED_AT_B02D_POLAR_MESH
```

The immediately preceding B02 diagnostic/freeze/oracle gates passed.

## B02D causality classification

### Exact parent execution

Parent/base commit:

`2e26413b0950a80ecb78423f3972fac9c8dc8e6d`

Its Stage-17 run was already red, but stopped at the then-unrepaired EMP.1.A presentation defect. Therefore:

```text
B02D direct execution on exact base = NOT_RUN
```

Do not claim an observed base B02D failure.

### Unchanged-boundary differential

`PASS` for non-intersection between PR1266 and the failing B02D boundary:

- exact `base..head` comparison changes only PR1266 analytical/evidence files;
- `scripts/lafea-b02d-probe-stable-polar-mesh-check.mjs` is byte-identical at base and head, blob SHA `0e55933c763043e1eab807a5d1d9255ca78510ec`;
- none of its direct production dependencies or frozen validation inputs are in the PR changed-file set;
- Stage-17 invokes each prerequisite Node check through a separate `spawnSync(process.execPath, ...)` process, so EMP.1 prerequisite scripts cannot leak in-process mutable JS state into B02D.

Classification:

```text
EMP.1 scope regression = PASS
full workflow = FAIL
B02D exact-base direct execution = NOT_RUN_BASE_STOPPED_EARLIER
B02D unchanged-boundary differential = PASS
B02D blocker = EXTERNAL_UNCHANGED_BOUNDARY
```

A separate B02D RCA is required if that gate is to be repaired. It must not be mixed into this analytical PR without a new scope decision.

## Authority boundary

Preserved:

- no WRC equations, coefficients, sign convention, interpolation rule, or tolerance changes;
- no CAUx expected values or benchmark extraction changes;
- no EMP.1.C execution-route registration;
- no FEM formulation, mesh producer, B02D policy, B02D frozen definition, or B02D qualification implementation changes;
- no `.github/workflows/**` changes;
- Stage-17 runner changes only register the new analytical deterministic/browser checks before the existing B02 sequence.

WRC engineering qualification: `BLOCKED`.
CAUx pp24–31 engineering qualification: `BLOCKED/NOT_RUN`.
EMP.1.C execution route registered: `false`.
Release qualification: `false`.

## Changed-file ledger relative to parent

Production analytical changes:

- `src/workspace/lafea-result-presenters/local-stress.js`
- `src/core/emp1/emp1-a-to-b-refresh.js`

Qualification/regression changes:

- `e2e/lafea-emp1-a-run-state.spec.js`
- `e2e/lafea-emp1-a-to-b-refresh.spec.js`
- `scripts/emp1-a-result-presentation-check.mjs`
- `scripts/emp1-a-to-b-refresh-check.mjs`
- `scripts/emp1-simulated-a-b-custody-check.mjs`
- `scripts/lafea-stage17-browser-run.mjs`

Handover records:

- `agents/PR1266_workreport.md`
- `agents/status/PR1266.yaml`
- `agents/claims/PR1266.yaml`

## Appendix A — takeover questionnaire status

### A1 Production trace — PASS

A Run and A→B refresh have exact source → canonical input → result → presenter/currentness → visible browser trace.

### A2 Current failure / UX isolation — PASS for PR scope

The original A stale-render defect and B currentness-refresh defect are independently isolated and repaired. The remaining B02D failure is downstream and outside the changed dependency boundary.

### A3 Authority / invariant — PASS for PR scope

Editable A source, canonical A input, A result, and B source-evidence custody are explicitly separated and hash-checked. No WRC/CAUx/FEM authority is inferred.

### A4 Independent validation — PASS for software custody scope; engineering WRC/CAUx remains BLOCKED

Deterministic negative cases include null axial-stress non-invention, forged canonical-input rejection, missing current A evidence rejection, incompatible-load-reference rejection, and preservation of B-owned screening factors.

### A5 Minimal patch — PASS

Production changes are limited to the failing presenter contract and A→B canonical evidence boundary. B02D is not patched in this PR.

## Next action

Keep PR1266 scoped to the now-qualified EMP.1.A/B repair. Treat the current B02D T3/L1 failure as a separate engineering-critical RCA increment. Do not merge PR1266 unless explicitly authorized by the owner.
