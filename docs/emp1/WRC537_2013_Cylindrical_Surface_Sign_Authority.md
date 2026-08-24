# WRC 537 (2013) cylindrical surface/sign authority

Status: `BLOCKED_PARTIAL_TABLE5_SIGN_AUTHORITY_PHYSICAL_SURFACE_SEMANTICS_UNQUALIFIED`

## Current bounded implementation

The existing cylindrical Table-5 implementation evaluates `Au, Al, Bu, Bl, Cu, Cl, Du, Dl` with fixed sign arrays and algebraic load-polarity reversal. This reconciliation does **not** change those arrays or any numerical mechanics.

## Retained Table-5 authority now reconciled

The repository already contains a retained WRC 537 transcription at:

`docs/emp1/WRC537_2013_Tables_and_Charts.md`

PR #1312 records **Table 5, pp. 41–42** as primary validation authority for:

- allowed Table-5 figure/reference cells;
- algebraic sign placement;
- the instruction that if the applied load is opposite that shown, the applicable signs reverse.

The reviewed interpretation is retained separately at:

`validation/emp1/wrc537-2013/table5-reviewed-interpretation-v1.json`

with semantic hash:

`654e33f7fa7124c78e827bffeae06570d7feb401624291c823a6218b6bd012d2`

That artifact binds the retained Table-5 source cells to reviewed sign arrays for radial load `P`, circumferential moment `Mc`, longitudinal moment `Ml`, circumferential/longitudinal shear `Vc/Vl`, and torsion `Mt`, while explicitly keeping `productionMethodAuthority=false`.

Accordingly, this reconciliation qualifies the **retained Table-5 sign placement and load-direction reversal claims only**. It does not constitute a new direct PDF observation and does not authorize production mechanics.

## What remains unqualified

The source gate remains blocked because the retained Table-5 sign authority does not by itself establish every physical recovery semantic needed by Issue #1385. The following remain false:

- physical surface meaning of `u` and `l`;
- exact physical meaning/location mapping of A/B/C/D;
- membrane/bending reconstruction at the physical inner/outer shell surfaces;
- proof that all six load-family stress components are superposed at one common physical point before stress-intensity reconstruction.

The retained transcription also contains a summarized Table-4 note describing `u` as upper/outer, `L` as lower/inner and A/B/C/D axis positions. This PR **does not promote that summary** because the current provenance chain used here is the already-reviewed PR #1312 Table-5 authority, not a fresh direct verification of WRC pp. 39–40.

## Current direct-PDF observation state

Controlled source identity remains:

- WRC 537 (2013)
- raw SHA-256 `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`
- Git blob `ce861233928154145a9257efbbf8dbef3f5a17d1`

Authenticated GitHub access reaches the exact binary blob, but the connected interface cannot expose the PDF bytes for page inspection: blob fetch fails at UTF-8 decoding and the file endpoint returns an empty base64 payload. Therefore:

`currentTurnDirectPdfObservationState = NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT`

This transport failure must not be reported as a primary-source PASS or engineering FAIL.

## Authority boundary

The reconciliation grants no broader authority:

```text
engineering authority = false
production authority  = false
global EMP.1.C        = false
code compliance       = false
release authority     = false
```

No route/registry flag, Table-5 evaluator, oracle, tolerance, benchmark, release profile or workflow is changed.

## Closure evidence still required

Issue #1385 can be fully closed only when the remaining physical semantics are proven from a primary-source/provenance chain that another engineer can independently audit:

1. exact `u/l` physical surface meaning;
2. exact A/B/C/D physical positions;
3. membrane/bending physical-surface reconstruction;
4. common-point algebraic superposition semantics before stress intensity.

Until those are proven, the aggregate P0 source-semantics gate remains blocked even though the retained Table-5 sign matrix/reversal subset is now explicitly recognized rather than incorrectly treated as wholly absent.
