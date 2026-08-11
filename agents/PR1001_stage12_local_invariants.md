# PR1001 Stage 12A — Local Recovery Invariants and Conditioning Ledger

## Scope

This stage implements the first local-first diagnostic requested by the PR1001 handover without changing solver mechanics, benchmark references, comparison tolerances, or the Stage-7 zero-boundary candidate.

The purpose is to convert recovery evidence into deterministic source/element-local diagnostics that remain useful when final resultants are small or cancellation-sensitive.

## Implementation

Added:

- `src/core/fea-benchmarks/caesar-accdb-local-invariants.js`
- `scripts/lfea-caesar-accdb-local-invariants.mjs`
- `scripts/lfea-caesar-accdb-local-invariants-check.mjs`

The diagnostic consumes an existing `lfea-accdb-benchmark-actual/v1` package and emits JSON plus optional CSV. It is explicitly marked `diagnosticOnly` and `governedComparatorStatusUnaffected`.

Primary per-component recovery identity:

```text
q_global = globalElasticAction - equivalentLoadGlobal - initialStrainLoadGlobal
```

For each case / source element / analysis element / end / DOF the ledger records:

- elastic action;
- equivalent external load;
- initial-strain load;
- recovered global action;
- exact Q-identity residual and relative residual;
- transformed-local recovered action and its global disagreement as a separate diagnostic;
- local recovery conditioning:

```text
conditioning =
  (abs(elastic) + abs(equivalent) + abs(initial))
  / max(abs(recovered), physicalFloor)
```

`conditioning >= 20` is labelled `CANCELLATION_SENSITIVE`. This classification is diagnostic only and never changes benchmark pass/fail.

## Important recovery-path correction

The first synthetic implementation also attempted to reconstruct `K_global * d_global` directly from `recoveryLedger.globalStiffness` and `jointDisplacement12` and use that as a primary closure gate.

The governed BM4_L artifact falsified that assumption: the authoritative recovery proof is the **assembly-consistent global report path**, while transformed local recovery is retained as an alternate diagnostic. Directly re-multiplying the stored matrix/displacement pair does not preserve every recovery-frame/offset transformation used by the report path and therefore produced false closure failures.

The implementation was corrected before Stage-12 acceptance. The primary invariant is now exactly the governed Q identity above; local-to-global disagreement is reported but is not promoted into a false mechanics failure.

## Deterministic synthetic check

Command:

```text
node scripts/lfea-caesar-accdb-local-invariants-check.mjs
```

The check constructs one high-cancellation component where the Q identity is exact and verifies:

- closure PASS;
- cancellation-sensitive classification;
- an independent stable component remains STABLE;
- deliberate corruption of `qGlobal` causes exactly one closure failure.

Local execution result: **PASS**.

## Read-only governed artifact validation

No workflow was rerun.

Existing completed workflow evidence used:

- workflow: `M047 BM4_L qualification`;
- run ID: `31457644192`;
- governed head: `7488ba76126f8240bb61c80fad243cf096c5fe08`;
- conclusion: SUCCESS;
- artifact ID: `9088676941`;
- artifact name: `m047-bm4l-qualification-7488ba76126f8240bb61c80fad243cf096c5fe08`;
- artifact digest: `sha256:8819dbbbf21aff8e314fe6cae85db0c3407afc12ca71dde3b459442242d3e934`;
- embedded `bm4l-actual.json`: about 25.5 MB;
- pinned ACCDB member SHA-256 in the recovery proof: `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`.

Replay command against the extracted existing artifact:

```text
node scripts/lfea-caesar-accdb-local-invariants.mjs \
  --actual bm4l-actual.json \
  --out bm4l-local-invariants.json \
  --csv bm4l-local-invariants.csv
```

### Real-artifact result

Across six governed cases and 322 analysis elements per case:

- total component rows: **23,184**;
- primary Q-identity closure: **PASS**;
- Q-identity closure failures: **0**;
- maximum Q-identity residual: **0 N / 0 N.m** in the stored evidence;
- cancellation-sensitive recovery components at the diagnostic threshold 20: **2,053**;
- maximum alternate local-to-global force disagreement: about **2.8125808456e-5 N**;
- maximum alternate local-to-global moment disagreement: about **3.2791876947e-7 N.m**.

Per case:

| Case | Rows | Q closure | Cancellation-sensitive | Max alternate force disagreement (N) | Max alternate moment disagreement (N.m) |
|---|---:|---|---:|---:|---:|
| L2 | 3864 | PASS | 17 | 1.8063121132e-7 | 1.6862919949e-9 |
| L3 | 3864 | PASS | 314 | 2.3335900522e-5 | 2.8634274685e-7 |
| L4 | 3864 | PASS | 479 | 5.6466593028e-7 | 7.1373744517e-9 |
| L5 | 3864 | PASS | 507 | 2.8125808456e-5 | 3.2791876947e-7 |
| L6 | 3864 | PASS | 422 | 6.1266746245e-7 | 7.8612825490e-9 |
| L14 | 3864 | PASS | 314 | 2.3335900522e-5 | 2.8634274685e-7 |

These alternate local/global values are consistent with the existing `bm4l-recovery-proof.json` scale and are not new benchmark failures.

## Engineering interpretation

Stage 12A proves that the stored source/element recovery ledger is algebraically closed on the governed global report path. The large conditioning population confirms that near-zero recovered actions can arise from subtraction of much larger elastic/equivalent/initial terms, so raw relative error on those resultants is a poor mechanic-discovery signal.

This does **not** prove a new CAESAR mechanic and does not justify changing gravity, pressure, bend, reducer, tee, restraint, comparison, or zero-reference behavior.

The extremely large maximum conditioning values are expected when a recovered component is effectively zero while nonzero algebraic terms cancel. They are triage metadata, not an error magnitude and not a tolerance proposal.

## Stage 12B — next local-first increment

The next valid diagnostic is the physical load-resultant / first-moment ledger from the handover answer. Stage 12A cannot derive that physical invariant from recovery vectors alone because the `actual` package does not carry all continuous source geometry and expected physical load-centroid authority needed for curved/reducer source integration.

Stage 12B should add evidence-only inputs/outputs sufficient to evaluate, before structural solution:

```text
sourceElementId
analysisKind
expectedPhysicalResultant
assembledEquivalentResultant
expectedPhysicalFirstMomentAboutSourceI
assembledEquivalentFirstMomentAboutSourceI
resultantError
firstMomentError
freeStateResidualNorm
localToGlobalRoundTripError
```

Priority components:

1. bend continuous-arc gravity: `R = integral w(s) ds`, `M_I = integral (r(s)-r_I) x w(s) ds`;
2. reducer gravity: compare condensed equivalent load against existing `totalWeight`, `centroidFromEnd`, and `firstMomentFromEnd` authority;
3. straight/rigid uniform gravity: verify `wL` and centroid `L/2` directly;
4. thermal/pressure/Bourdon: use free-state zero-action identities rather than external-force resultants.

Stage 12B total-force closure is now recorded separately in [`PR1001_stage12b_gravity_resultant.md`](PR1001_stage12b_gravity_resultant.md): all 288 gravity-enabled source/case resultants pass to machine precision. The remaining discriminator is therefore first-moment/centroid placement.

Any Stage-12B additions must be evidence-only. They must not change K, equivalent/initial load vectors, recovered results, references, or comparator semantics.

## Stage decision

**STAGE_12A_COMPLETE / LOCAL_REAL_ARTIFACT_PASS.**

Next: **STAGE_12B_FIRST_MOMENT_AND_CENTROID_EVIDENCE**.
