# PR1287 work report — EMP.1.C primary-source and benchmark qualification

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `ISSUE: #1261`
- `PR: #1287`
- `BRANCH: agent/emp1-pr1286-source-authority-issue1261`
- `BASE_AFTER_PR1273_MERGE: 79c98c1318c40034b6a9657fd3b38056d6e80c78`
- `MERGE_AUTHORITY: NOT_GRANTED`
- `EMP1_C_ROUTE_REGISTERED: false`
- `RELEASE_QUALIFIED: false`
- `CURRENT_STAGE: CAUX_CURVE_SELECTION_POLICY_PROBE_RUNNING`

## Owner instruction consumed

The owner explicitly instructed: refer PR #1286, merge PR #1273, and proceed.

PR #1273 was squash-merged with an expected-head guard. PR #1286 had already merged four source artifacts to main. Those four PR1286 blobs were imported onto this successor branch by exact Git blob identity so source qualification could continue without re-encoding the PDFs.

## Exact primary-source custody

### WRC 537

```text
file       = docs/emp1/WRC537_2013.pdf
bytes      = 1,443,744
Git SHA-1  = ce861233928154145a9257efbbf8dbef3f5a17d1
raw SHA256 = 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
custody    = VERIFIED / PASS_SOURCE_CUSTODY
```

### CAUx 2017 WRC01f

```text
file       = docs/emp1/CAUx 2017 - WRC01f.pdf
bytes      = 7,260,396
Git SHA-1  = 76573b41462943b2987e28b23ebbbf7e51ac0a02
raw SHA256 = c1e92798a7bc172d649007ad88f6be548651f07a01cb2fbf83343e2283e0e83e
custody    = VERIFIED / PASS_SOURCE_CUSTODY
benchmark  = PDF pages 24-31
```

The first SHA-256 observation was performed only after byte count and Git blob identity matched. The frozen hashes were then independently re-observed and required to return `PASS_SOURCE_CUSTODY`.

## Critical WRC source corrections

### 1. Curve-fit functional form

The retained extraction had incorrectly represented each curve as a ninth-order polynomial. The primary WRC source uses:

```text
Y = (a + cX + eX^2 + gX^3 + iX^4)
    / (1 + bX + dX^2 + fX^3 + hX^4 + jX^5)
```

with `X=U` for the spherical SP/SM tables and `X=beta` for cylindrical tables.

The old polynomial interpretation is rejected and must not be reintroduced.

### 2. Spherical radial membrane reconstruction

Primary WRC Table 3 directly resolves the retained dimensional contradiction:

```text
curve ordinate = Nx*T/P or Ny*T/P
sigma_m = Kn * Y * P / T^2
```

The retained `Y*P/T` expression is a transcription error.

### 3. Spherical moment membrane reconstruction

Primary WRC Table 3 gives:

```text
curve ordinate = Nx*T*sqrt(Rm*T)/M or Ny*T*sqrt(Rm*T)/M
sigma_m = Kn * Y * M / (T^2*sqrt(Rm*T))
```

The retained missing-thickness form is rejected.

### 4. Stress intensity

Primary WRC Tables 3/5 define a stress-valued principal-difference / twice-maximum-shear quantity. The retained outer square-root transcription is dimensionally and source-textually wrong.

### 5. Signs

Primary WRC sign tables qualify tension/compression signs and require reversal of all applicable signs in a load/moment column when the applied load direction reverses.

## Complete WRC coefficient inventory

The source-derived inventory is not the old `120 curves / 1200 scalars` model.

```text
Section 8 coefficient tables = 51
response curves              = 451
numeric scalar coefficients  = 4,510
parameter-qualified curves   = 450
source-qualified scalars     = 4,500
parameter-unresolved curves  = 1
source-unresolved scalars    = 10
```

Breakdown:

```text
spherical rigid/solid       14 curves / 140 scalars
spherical hollow SP/SM     115 curves / 1,150 scalars
cylindrical original       178 curves / 1,780 scalars total
                           177 curves / 1,770 parameter-qualified
cylindrical extrapolated   144 curves / 1,440 scalars
```

The spherical-hollow 1,150 values were independently parsed from Poppler text of the frozen PDF and matched 1,150/1,150 against the PR1286 structured extraction. One-scalar mutation is rejected by self-test.

## Open source anomaly

`WRC537-FIG1B-ORIGINAL-GAMMA-BLANK`:

- Figure: `1B – Original`
- PDF page: 107
- printed page: 95
- the third curve has ten numeric coefficients but the gamma label cell is blank.
- assigning gamma=10 by sequence is prohibited.
- the affected curve is not selectable.
- unaffected source-qualified curves retain their own authority.

See `validation/emp1/wrc537-2013/source-anomalies-v1.json`.

## Original vs Extrapolated policy

WRC states extrapolated curves are provided for ease of programming when required and are thought conservative, but explicitly says there is no rigorous theoretical basis supporting the extrapolation.

Therefore:

```text
ORIGINAL != EXTRAPOLATED
NO silent fallback
NO silent merge
NO use of extrapolated row to repair an original-row source defect
```

Any use of extrapolated curves requires an explicit authorized selection policy.

## CAUx pp24-31 benchmark qualification

Source benchmark semantic hash:

```text
8d97539f03f077321eef1e496e315a6a7700a9d83a6c8cd4ff1b83382ebe45fe
```

Independent hand-calculation semantic hash:

```text
679199df770a2018b2ff26b7d942bc6c42dc44c89668745b5f852eeccc314b4c
```

The independent checker:

- imports Node built-ins only;
- imports no production EMP.1.C/local-stress evaluator;
- uses source-reported CAUx geometry/load/ordinate values;
- reconstructs the CAUx global-to-WRC sustained load mapping independently;
- applies primary WRC Table 5 stress equations/signs;
- derives acceptance tolerance from the CAUx printed three-decimal curve ordinates and final whole-kPa reporting, not from production output.

Expected sustained locations are `Au, Al, Bu, Bl, Cu, Cl, Du, Dl`.

CAUx source expected kPa:

```text
Circ = [0,-5,378,-102,-973,882,1493,-1204]
Long = [71,-22,466,-317,-545,354,923,-461]
Shear = [-253,-253,-242,-242,-29,-29,-465,-465]
Stress intensity = [511,506,668,529,975,883,1754,1428]
```

Independent calculated kPa:

```text
Circ = [-0.1095,-5.4684,381.5922,-105.4145,-974.0831,881.8885,1496.2714,-1205.2847]
Long = [69.2034,-20.0611,469.0403,-319.3905,-545.8885,352.6624,922.0194,-458.1936]
Shear = [-252.8459,-252.8459,-241.8840,-241.8840,-29.2638,-29.2638,-465.4662,-465.4662]
Stress intensity = [510.4200,505.9024,671.1204,528.9775,976.0738,883.5017,1756.0459,1428.5599]
```

All source-resolution comparisons pass.

### Hash-freeze falsifier event

An incorrect handcalc semantic hash was initially copied into the qualification record. The re-observation gate failed. Run-47 and run-50 handcalc JSON were then compared byte-for-byte:

```text
both length = 20,536 bytes
both file SHA256 = 100d8dfd5b74401ce4fc0277e5bdd088c8786a7194b6e12c26d98f5af487c74f
both semantic hash = 679199df770a2018b2ff26b7d942bc6c42dc44c89668745b5f852eeccc314b4c
calculationEvidence diff = 0
```

The frozen record was corrected without changing benchmark input, mechanics, sign, tolerance, or calculated result. Workflow #52 subsequently re-observed the correct hash and passed.

Current benchmark state:

```text
PASS_INDEPENDENT_BENCHMARK_QUALIFICATION
production comparison allowed by benchmark gate = true
EMP.1.C route registration allowed = false
```

## CAUx frame evidence

For the benchmark only:

```text
eP    = nozzle centerline = +global X
eLong = vessel centerline = +global Y
eVc   = eLong x eP = -global Z

P  = F dot eP
Vc = F dot eVc
Vl = F dot eLong
Mc = -M dot eLong
Ml =  M dot eVc
Mt = -M dot eP
```

This is one qualified transform benchmark. It is not authorization to universally rename global FX/FY/FZ fields. A general EMP.1 source/runtime frame contract must identify vessel and nozzle directions explicitly.

## Pressure thrust

CAUx benchmark source states `Include Pressure Thrust = No`. This qualifies the benchmark mode only.

General production still requires an explicit runtime mode and a double-count guard. Current allowed runtime modes remain:

```text
SOURCE_LOAD_ALREADY_INCLUDES_THRUST
ADD_PRESSURE_THRUST_FROM_NOZZLE_ID
NOT_APPLICABLE_BY_QUALIFIED_METHOD
```

## Runtime custody bug fixed

The inherited runtime gate incorrectly required source ledger `qualificationState == PASS`, while the qualified source ledgers use the more specific `PASS_SOURCE_CUSTODY`.

It now requires exactly:

```text
custodyState = VERIFIED
qualificationState = PASS_SOURCE_CUSTODY
rawPdfSha256 = 64-hex
```

Generic `PASS` is explicitly rejected in the runtime self-test.

## Current active numerical-policy probe

The remaining cylindrical curve-selection/interpolation policy is being probed against the independently qualified CAUx ordinates at:

```text
gamma = 48.03
beta  = 0.155
```

The probe compares Original versus Extrapolated and:

```text
exact gamma Y
linear interpolation of evaluated Y in gamma
linear interpolation of Y in log(gamma)
linear interpolation of Y in inverse gamma
coefficient-wise interpolation followed by evaluation
lower/upper bracket without interpolation
```

The coefficient-interpolation path is included only as a falsifier/comparator; it is not authorized.

## Current blockers before production comparison

1. Freeze source/benchmark-qualified cylindrical curve selection/interpolation semantics.
2. Define a general canonical vessel/nozzle frame contract for EMP.1 source input and qualify LAFEA-to-WRC transformation independently.
3. Freeze general pressure-thrust mode/double-count policy.
4. Freeze source-qualified stress-intensity runtime record against already-qualified primary WRC definition.
5. Update the generated EMP.1.C qualification state only after method/runtime/benchmark gates all pass.
6. Only then run production EMP.1.C comparison.
7. Route registration remains false until the production comparison and method authorization pass.

## Changed-file families

Primary source / benchmark:
- `docs/emp1/WRC537_2013.pdf`
- `docs/emp1/WRC537_2013_Tables_and_Charts.md`
- `docs/emp1/CAUx 2017 - WRC01f.pdf`
- `docs/emp1/CAUx_2017_WRC01f_pages_24-31.md`
- source ledgers and arbitration/benchmark qualification JSON under `validation/emp1/**`

Qualification code:
- source custody workflow
- primary WRC source parsers/evaluators/audits
- complete Section 8 inventory audit
- CAUx independent hand calculation
- CAUx curve-selection probe
- runtime-contract custody semantic correction

No production EMP.1.C route has been registered in this PR.

## Appendix A — next-agent expert questions

1. Do the WRC and CAUx PDF bytes still reproduce their frozen byte counts, Git blob SHA-1 and raw SHA-256 values?
2. Is the WRC rational curve equation preserved exactly, with a/c/e/g/i numerator and b/d/f/h/j denominator roles?
3. Does any code still assume 120 curves or 1200 scalars as the full spherical-hollow source inventory?
4. Does any code still call 1150 scalars the complete WRC dataset rather than the SP/SM subset?
5. Is the blank-gamma 1B Original curve still blocked rather than inferred as gamma=10?
6. Can extrapolated curves be selected only through an explicit policy, never silent fallback?
7. What interpolation/selection policy does the qualified CAUx benchmark support at gamma=48.03 and beta=0.155?
8. Does the general source contract explicitly own vessel and nozzle direction vectors before mapping to WRC P/Vc/Vl/Mc/Ml/Mt?
9. Is pressure thrust explicit and double-count-safe for every production case?
10. Does stress-intensity runtime evidence bind exactly to the primary WRC Table 3/5 definition?
11. Was the CAUx independent handcalc hash re-observed before any production EMP.1.C result was inspected?
12. Does EMP.1.C remain unregistered until method, runtime, benchmark, and production-comparison authority all pass?
