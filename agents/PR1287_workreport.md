# PR1287 work report — EMP.1.C primary-source, benchmark, and runtime qualification

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
- `CURRENT_STAGE: BLOCKED_WRC537_NON_TABULATED_GAMMA_SELECTION_AUTHORITY`
- `SOLE_METHOD_WIDE_BLOCKER: WRC537_NON_TABULATED_GAMMA_SELECTION_UNQUALIFIED`

## Owner instruction consumed

The owner instructed: refer PR #1286, merge PR #1273, and proceed.

PR #1273 was squash-merged with an expected-head guard. PR #1286 had already merged four source artifacts to main. Those four PR1286 blobs were imported onto this successor branch by exact Git blob identity, preserving the previously pinned WRC and CAUx PDF identities.

## Exact primary-source custody — PASS

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

The SHA-256 values were accepted only after byte count and Git blob identity matched, then independently re-observed and required to return `PASS_SOURCE_CUSTODY`.

## Primary WRC method authority — PASS

### Curve-fit functional form

The retained ninth-order polynomial model was wrong. Primary WRC Section 8 uses:

```text
Y = (a + cX + eX^2 + gX^3 + iX^4)
    / (1 + bX + dX^2 + fX^3 + hX^4 + jX^5)
```

`X=U` for spherical SP/SM curves and `X=beta` for cylindrical curves.

Legacy polynomial interpretation is rejected.

### Spherical membrane reconstruction

Primary WRC Table 3 resolves both thickness-factor contradictions:

```text
radial load:
curve ordinate = Nx*T/P or Ny*T/P
sigma_m = Kn * Y * P / T^2

moment load:
curve ordinate = Nx*T*sqrt(Rm*T)/M or Ny*T*sqrt(Rm*T)/M
sigma_m = Kn * Y * M / (T^2*sqrt(Rm*T))
```

The retained `Y*P/T` and `Y*M/(T*sqrt(Rm*T))` machine forms are rejected transcription defects.

### Stress intensity

Primary WRC Tables 3/5 define a stress-valued principal-difference / twice-maximum-shear quantity:

```text
d  = sqrt((sigma1-sigma2)^2 + 4*tau^2)
p1 = 0.5*(sigma1+sigma2+d)
p2 = 0.5*(sigma1+sigma2-d)
p3 = 0
S  = max(abs(p1-p2), abs(p2-p3), abs(p3-p1))
```

The retained outer square-root transcription is rejected.

### Signs

Primary WRC sign tables qualify plus as tension and minus as compression. When an applied load/moment direction reverses, all signs in that applicable source column reverse.

Primary method record:
`validation/emp1/wrc537-2013/primary-source-arbitration-v2.json`

## Complete WRC Section 8 inventory — PASS with one bounded row restriction

Source-derived inventory:

```text
coefficient tables           = 51
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

The spherical-hollow 1,150 values were parsed independently from Poppler text of the frozen PDF and matched 1,150/1,150 against the PR1286 structured extraction. A one-scalar mutation is rejected by self-test.

Inventory record:
`validation/emp1/wrc537-2013/section8-inventory-v1.json`

### Bounded source anomaly

`WRC537-FIG1B-ORIGINAL-GAMMA-BLANK`:

- Figure `1B – Original`
- PDF page 107 / printed page 95
- third numeric curve has all ten `a..j` values but the gamma label cell is blank
- assigning `gamma=10` from sequence is prohibited
- affected curve is unselectable
- unaffected curves retain authority

This is a row-level restriction, not a method-wide blocker.

Record:
`validation/emp1/wrc537-2013/source-anomalies-v1.json`

## Original vs Extrapolated policy — preserved

WRC says extrapolated curves are supplied for ease of programming when required and are thought conservative, while explicitly noting no rigorous theoretical basis supports the extrapolation.

Therefore:

```text
ORIGINAL != EXTRAPOLATED
NO silent fallback
NO silent merge
NO use of extrapolated data to repair the blank-gamma Original row
```

Any extrapolated-curve use requires explicit authority.

## CAUx pp24-31 benchmark — PASS / independently re-observed

Source benchmark semantic hash:

```text
8d97539f03f077321eef1e496e315a6a7700a9d83a6c8cd4ff1b83382ebe45fe
```

Independent hand-calculation semantic hash:

```text
679199df770a2018b2ff26b7d942bc6c42dc44c89668745b5f852eeccc314b4c
```

Independent handcalc artifact file SHA-256:

```text
100d8dfd5b74401ce4fc0277e5bdd088c8786a7194b6e12c26d98f5af487c74f
```

The checker imports Node built-ins only and no production EMP.1.C/local-stress evaluator. It reconstructs the CAUx global-to-WRC loads independently, applies WRC Table 5 equations/signs, and derives tolerances from the source's three-decimal curve ordinates plus whole-kPa final reporting.

CAUx expected sustained kPa at `[Au, Al, Bu, Bl, Cu, Cl, Du, Dl]`:

```text
Circ   = [0,-5,378,-102,-973,882,1493,-1204]
Long   = [71,-22,466,-317,-545,354,923,-461]
Shear  = [-253,-253,-242,-242,-29,-29,-465,-465]
S      = [511,506,668,529,975,883,1754,1428]
```

Independent calculated kPa:

```text
Circ   = [-0.1095,-5.4684,381.5922,-105.4145,-974.0831,881.8885,1496.2714,-1205.2847]
Long   = [69.2034,-20.0611,469.0403,-319.3905,-545.8885,352.6624,922.0194,-458.1936]
Shear  = [-252.8459,-252.8459,-241.8840,-241.8840,-29.2638,-29.2638,-465.4662,-465.4662]
S      = [510.4200,505.9024,671.1204,528.9775,976.0738,883.5017,1756.0459,1428.5599]
```

All source-resolution comparisons pass.

Current benchmark status:

```text
PASS_INDEPENDENT_BENCHMARK_QUALIFICATION
production comparison allowed by benchmark gate = true
EMP.1.C route registration allowed by benchmark gate = false
```

Records:
- `validation/emp1/caux2017-wrc01f/benchmark-source-pp24-31-v2.json`
- `validation/emp1/caux2017-wrc01f/benchmark-qualification-v2.json`

### Hash-freeze falsifier event

An incorrect handcalc semantic hash was initially copied into the qualification record. Re-observation failed. Run-47 and run-50 handcalc JSON were then proven byte-identical:

```text
length = 20,536 bytes
file SHA256 = 100d8dfd5b74401ce4fc0277e5bdd088c8786a7194b6e12c26d98f5af487c74f
semantic hash = 679199df770a2018b2ff26b7d942bc6c42dc44c89668745b5f852eeccc314b4c
calculationEvidence diff = 0
```

The qualification metadata was corrected without changing inputs, mechanics, signs, tolerances, or results. Workflow #52 then re-observed the correct hash and passed.

## Runtime components — PASS independently

Record:
`validation/emp1/wrc537-2013/runtime-components-v1.json`

Runtime qualification workflow #8:
`32330236984` — PASS.

### Source-custody semantics

Qualified source requires exactly:

```text
custodyState = VERIFIED
qualificationState = PASS_SOURCE_CUSTODY
rawPdfSha256 = 64-hex
```

Generic `PASS` is explicitly rejected.

### Cylindrical physical frame — PASS

Contract hash:

```text
sha256:23f3570f657362d007502964e4a9164f3e73ba742f14b8a3e409aa916ea6818f
```

Frame construction:

```text
eLong = normalize(vessel centerline)
eP    = normalize(nozzle centerline / radial direction)
eVc   = normalize(eLong x eP)

P  = F dot eP
Vc = F dot eVc
Vl = F dot eLong
Mc = M dot (-eLong)
Ml = M dot eVc
Mt = M dot (-eP)
```

The contract reproduces CAUx exactly and passes an oblique-orientation round trip with numerical residual near machine precision. It does not depend on global `FX/FY/FZ` field names. Universal field renaming is prohibited.

### Stress intensity runtime definition — PASS

Contract hash:

```text
sha256:e3dfebceb731e2c0e0b41aaf6cc0b27c1ac33004da6538564a97058296d510d8
```

Independent biaxial, pure-shear, mixed-sign, compressive, and stress-scaling metamorphic tests pass.

### Pressure thrust / double-count policy — PASS capability

Policy hash:

```text
sha256:af950cf160ad3cf1c9035014dd055ce1f91264e8a8d1af593cdbb619a4ef8f1b
```

Modes:

```text
SOURCE_LOAD_ALREADY_INCLUDES_THRUST
ADD_PRESSURE_THRUST_FROM_NOZZLE_ID
NOT_APPLICABLE_BY_QUALIFIED_METHOD
```

Rules:

- ADD computes `A = pi*d_i^2/4` and `F = pressure*A`.
- ADD requires source-load thrust custody `VERIFIED_EXCLUDED`.
- ADD requires an explicit `directionAlongEP = +1 or -1` plus direction authority; sign is never inferred from the existing load.
- INCLUDED adds zero and requires `VERIFIED_INCLUDED` source-load custody.
- NOT_APPLICABLE adds zero and requires a qualified method reason/record.
- ADD inputs are rejected in non-ADD modes.

Bounded numerical sanity:

```text
pressure = 275 psi
ID       = 12 in
area     = 113.0973355 in^2
thrust   = 31,101.7672705 lbf
existing P = -26 lbf
explicit -eP total = -31,127.7672705 lbf
```

CAUx benchmark mode remains `Include Pressure Thrust = No`.

## Sole method-wide blocker — WRC537 non-tabulated gamma selection

### Full primary-source scan

The complete frozen WRC PDF was searched, not only Section 8.

WRC states that the precision equations were produced to:

- eliminate implementation errors;
- facilitate proper interpolation/extrapolation;
- permit efficient computation.

However, the bulletin does **not** identify the programmable rule between discrete cylindrical gamma coefficient curves: linear gamma, log gamma, inverse gamma, coefficient interpolation, nearest curve, etc.

Record:
`validation/emp1/wrc537-2013/interpolation-authority-v1.json`

Status:

```text
BLOCKED_SOURCE_RULE_UNRESOLVED
```

### Qualified CAUx probe does not identify the WRC537 rule

CAUx explicitly uses:

```text
WRC107 Version: March 1979 (B1 & B2)
Curves read for 1979 B1/B2
gamma = 48.03
beta  = 0.155
```

Therefore CAUx is a qualified chart-read end-result benchmark; it is not a declared WRC537 coefficient-evaluator specification.

A separate probe evaluated the source-qualified WRC537 coefficient tables against all 16 CAUx-reported ordinates under:

- Original and Extrapolated data;
- linear Y in gamma;
- linear Y in log(gamma);
- linear Y in inverse gamma;
- coefficient-wise interpolation then Y;
- lower/upper bracket values.

No tested policy reproduces all 16 ordinates within the source's published 0.001 precision.

Best full Original candidates:

```text
inverse-gamma Y interpolation: 8/16 within 0.001; max |error| = 0.27054
log-gamma Y interpolation:     7/16 within 0.001; max |error| = 0.24190
linear-gamma Y interpolation:  6/16 within 0.001; max |error| = 0.21050
coefficient interpolation:     5/16 within 0.001; max |error| = 0.38001
```

Representative falsifiers:

```text
Figure 4C: CAUx = 7.273
Original linear-Y/gamma = 7.39930
Original coefficient interpolation = 7.17520
Extrapolated coefficient interpolation = 7.28699

Figure 3B: CAUx = 5.217
Original linear-Y/gamma = 5.42750
Original coefficient interpolation = 5.59701
```

Record:
`validation/emp1/wrc537-2013/cylindrical-curve-selection-probe-v1.json`

Decision:

```text
linear Y interpolation       NOT AUTHORIZED
log-Y interpolation          NOT AUTHORIZED BY PRIMARY SOURCE
inverse-gamma interpolation  NOT AUTHORIZED
coefficient interpolation    NOT AUTHORIZED
automatic extrapolated use   NOT AUTHORIZED
production curve selection   BLOCKED for non-tabulated gamma
```

A secondary 2025 demo engineering report uses logarithmic interpolation in gamma, but it is retained only as corroboration and is not elevated above the frozen primary-source gap.

### What is still allowed

- exact source-qualified gamma rows may be evaluated directly;
- the qualified CAUx benchmark may continue using its own source-reported chart ordinates;
- the single blank-gamma `1B Original` row remains prohibited independently.

### Required authority to close

One of:

1. direct authoritative WRC537 interpolation/selection instruction; or
2. a source-qualified WRC537 numerical example that uniquely identifies and independently reproduces the required non-tabulated-gamma selection algorithm.

## Primary qualification v2 state

Current v2 state checker:
`scripts/emp1-c-primary-qualification-state-check.mjs`

Expected current output:

```text
status = BLOCKED
method-wide blockers = 1
  WRC537_NON_TABULATED_GAMMA_SELECTION_UNQUALIFIED
bounded restrictions = 1
  WRC537-FIG1B-ORIGINAL-GAMMA-BLANK
routeRegistrationAllowed = false
productionComparisonAllowed = false
```

CI intentionally treats this exact BLOCKED state as PASS evidence; any extra blocker, missing resolved gate, or premature authorization fails the workflow.

## Superseded legacy assumptions

Do not reintroduce:

- ninth-order polynomial WRC curve fit;
- spherical-hollow `120 curves / 1200 scalars`;
- calling `1150` the complete WRC Section 8 dataset;
- generic source ledger `qualificationState=PASS`;
- CAUx pp24-31 `NOT_RUN` status;
- tentative hard-coded `FX/FY/FZ -> WRC` field renaming;
- silent extrapolated-curve fallback.

## Current production/merge disposition

```text
WRC primary source custody            PASS
CAUx primary source custody           PASS
WRC equations/signs/stress intensity  PASS
WRC rational curve model              PASS
Section 8 inventory                   PASS_WITH_BOUNDED_ROW_RESTRICTION
CAUx benchmark                        PASS_INDEPENDENT_REOBSERVED
physical frame runtime contract       PASS
stress-intensity runtime contract     PASS
pressure-thrust runtime policy        PASS_COMPONENT_CAPABILITY
non-tabulated cylindrical gamma rule  BLOCKED_SOURCE_RULE_UNRESOLVED
production EMP.1.C comparison         BLOCKED
EMP.1.C route registration            false
engineering authority                 PARTIAL; method-wide interpolation blocker remains
release qualified                     false
merge authority for PR1287            NOT_GRANTED
```

No production EMP.1.C route has been registered in this PR.

## Appendix A — next-agent expert questions

1. Do both PDFs still reproduce frozen byte count, Git blob SHA-1, and raw SHA-256 custody?
2. Is the rational WRC equation preserved exactly, with `a/c/e/g/i` numerator roles and `b/d/f/h/j` denominator roles?
3. Does any code still assume `120/1200` for spherical hollow or `1150` for the complete Section 8 dataset?
4. Is the blank-gamma `1B Original` row still unselectable rather than silently assigned gamma=10?
5. Are Original and Extrapolated data still separate authority classes with no silent fallback?
6. Has any new authoritative source been found that actually specifies non-tabulated cylindrical gamma selection/interpolation?
7. If a secondary interpolation rule is proposed, is it clearly classified below primary WRC authority and independently numerically qualified before use?
8. Does the physical frame contract continue to require vessel/nozzle directions rather than global field renaming?
9. Does ADD pressure thrust require both VERIFIED_EXCLUDED source-load custody and explicit signed `+eP/-eP` authority?
10. Does stress intensity remain bound to WRC Tables 3/5 and output stress units?
11. Does the primary v2 state contain exactly one method-wide blocker and one bounded row restriction?
12. Is production comparison still prohibited until non-tabulated-gamma method authority is closed?
13. Is route registration still false until method authority and subsequent production comparison pass?
14. Has PR1287 remained unmerged without fresh owner authorization?
