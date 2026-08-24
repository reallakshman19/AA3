# EMP.1 — CAUx 2017 WRC01f Pages 24–31 Benchmark

## Purpose

This record implements Issue #1389 PR-C. It freezes the CAUx pages 24–31 reference values and an independent arithmetic trace **before any EMP.1 production-output observation**.

CAUx is an independent benchmark/reference source. It is **not** WRC method authority and cannot define or correct WRC equations, signs, coefficients, curve domains, interpolation, tolerances, code compliance or production authorization.

## Controlled source

```text
Document: CAUx 2017 - WRC01f.pdf
Source repository: reallaksh19/XML_Compare_Utilities
Pinned commit: dc1371afcd44c12de86b2dad6eddf00f1f0b3c55
Path: docs/emp.1/CAUx 2017 - WRC01f.pdf
Git blob SHA-1: 76573b41462943b2987e28b23ebbbf7e51ac0a02
Bytes: 7,260,396
SHA-256: c1e92798a7bc172d649007ad88f6be548651f07a01cb2fbf83343e2283e0e83e
Pages: 24–31 inclusive
```

Source custody is verified. In the current connected execution the binary object resolves to the exact blob identity, but the connector does not expose inspectable PDF bytes. Therefore:

```text
direct PDF page re-observation = NOT_RUN_EXECUTION_ENVIRONMENT
```

The repository already retains a page-qualified transcription:

```text
docs/emp1/CAUx_2017_WRC01f_pages_24-31.md
Git blob SHA-1 = ce0ee91cd996feee162d4dd90ce1af4063e06775
```

PR-C freezes values from that retained transcription while explicitly preserving the distinction between retained-transcription inspection and a new direct-PDF observation.

## Frozen benchmark artifacts

```text
validation/emp1/caux2017-wrc01f/caux-pp24-31-benchmark-v1.json
  semanticHash = 741bfbc21496c2f126dbbeec18b2f88d4424e90a94b1d2cc7444776a16dfb7fe

validation/emp1/caux2017-wrc01f/caux-pp24-31-independent-handcalc-v1.json
  semanticHash = e7e4e7d21188e4b6c1f53c2d7b89a73036a52ccccc61a65fd69c24f6a13ae227

validation/emp1/caux2017-wrc01f/caux-pp24-31-benchmark-qualification-v1.json
  semanticHash = 27e5f468c409071270ceea3a388ee2f33b77f3ea71b02f4cc5b7646c8eca14ef
```

The expected-value file is frozen with:

```text
productionOutputObservedForExpectedValueSelection = false
productionOutputUsedToChooseDefinition = false
toleranceDerivedFromProduction = false
```

No future production mismatch may be repaired by changing these values or widening a tolerance. The discrepancy must instead be diagnosed.

## Source-reported benchmark configuration

The retained pages report:

```text
Host shell: cylindrical
Attachment: round
Vessel OD: 1844 mm
Nominal shell thickness: 22 mm
Shell corrosion allowance: 3 mm
Nozzle OD: 323.850 mm
Nozzle thickness: 14.270 mm
Internal pressure: 1.970 N/mm²
Pressure thrust: No
Vessel axis: (0,1,0)
Nozzle axis: (1,0,0)
Kn = 1
Kb = 1
beta = 0.155
gamma = 48.03
WRC107 version = March 1979 (B1 & B2)
```

The page-26 signed sustained local loads are:

```text
P  = -161 N
Vc = -53 N
Vl = -2109 N
Mc = +121 N·m
Ml = +33 N·m
Mt = -775 N·m
```

The independent benchmark-specific mapping from the page-25 global vectors is:

```text
P  = Fx
Vc = -Fz
Vl = Fy
Mc = -My
Ml = -Mz
Mt = -Mx
```

It reproduces the source-reported sustained, expansion and occasional local load vectors exactly. This is qualified **only for this CAUx geometry/axis example** and is not promoted to universal WRC sign authority.

## Gamma / mean-radius inconsistency

The retained page 26 transcription contains an important internal inconsistency:

```text
reported Rm = (1844 - 22)/2 = 911 mm
reported T  = 22 - 3 = 19 mm
reported gamma = 48.03
```

But:

```text
911 / 19 = 47.9473684211
```

A diagnostic calculation using a corrosion-adjusted mean radius gives:

```text
Rm,corr = (1844 - 19)/2 = 912.5 mm
912.5 / 19 = 48.0263157895 ≈ 48.03
```

This near-match is **diagnostic only**. It is not authority to decide which mean-radius basis WRC requires, and it does not close the separate WRC radius/thickness source gates. Until direct source arbitration is available, PR-C records:

```text
UNRESOLVED_SOURCE_INTERNAL_BASIS_OR_TRANSCRIPTION_DISCREPANCY
```

## Independent hand calculation

The hand calculation imports no production `src/core/emp1/**` evaluator. It uses only retained CAUx source-reported geometry, axes, loads, displayed curve values, explicit source substitutions and independent arithmetic.

Selected reproductions are:

| Quantity | Independent | Source-displayed |
|---|---:|---:|
| Circ. membrane from P at A/B | 67.6499509 kPa | 67.65 kPa |
| Circ. bending from P at A/B | 123.0914127 kPa | 123.09 kPa |
| Circ. membrane from Mc | 95.7953187 kPa | 95.79 kPa |
| Circ. bending from Mc | 1139.3819383 kPa | 1139 kPa |
| Long. membrane from P at A/B | 49.6980184 kPa | 49.70 kPa |
| Long. bending from P at A/B | 219.4238227 kPa | 219.42 kPa |
| Shear from Vc | 5.48096945 kPa | 5.480 kPa |
| Shear from Vl | 218.1012183 kPa | 218.10 kPa |
| Shear from Mt | 247.3649734 kPa | 247.36 kPa |

The retained source publishes curve coefficients to limited decimal precision and total stress rows as integer kPa. Reconstructing totals from the displayed curve coefficients therefore does not reproduce every integer total exactly; the maximum observed differences for the sustained reconstruction are approximately 3.59 kPa circumferential, 3.04 kPa longitudinal and 0.47 kPa shear. These are recorded as source-display-precision observations. **No engineering tolerance is inferred from them.**

## Stress-intensity arithmetic

Using the source-reported total circumferential, longitudinal and shear stress rows, the hand calculation independently reconstructs plane-stress principal-difference/Tresca stress intensity.

The explicit page-29 Au example gives:

```text
sqrt((0 - 71)^2 + 4*(253)^2)
= 510.956945 kPa
→ source display 511 kPa
```

Across the eight displayed points, the maximum absolute differences between independently recomputed stress intensity from the **rounded source total-stress rows** and the source-displayed integer stress intensities are:

```text
SUS = 0.610231 kPa
EXP = 0.549139 kPa
OCC = 0.783121 kPa
```

Those differences are observations of display precision, not acceptance tolerances and not grounds to tune expected values.

## Release-profile disposition

This CAUx example is **outside** the first professional bounded route for three independent reasons:

1. source-reported `gamma = 48.03`, while the release route requires exactly `gamma = 5`;
2. source-reported internal pressure is `1.970 N/mm²`, while the first release is the zero-differential-pressure / upstream-resolved-pressure-thrust route;
3. the report identifies the WRC107 March 1979 B1/B2 reference context, not the exact gamma5 route identity.

Therefore:

```text
releaseProfileDisposition = OUTSIDE_BOUNDED_GAMMA5_ZERO_DP_RELEASE_PROFILE_REFERENCE_ONLY
gamma5 production comparison required = false
production authorization = false
```

The correct engineering action is **not** to run the gamma5 route at gamma 48.03 or to interpolate/fallback. Unsupported-domain behavior remains fail-closed.

## Page 30 code-check boundary

Page 30 contains source-reported ASME stress classification and allowable checks. PR-C retains the existence of that material only to preserve source context. It does not import those conclusions into EMP.1.

For the bounded professional release:

```text
CODE COMPLIANT = false / NOT ASSESSED
```

unless a separate code-acceptance method is independently selected and qualified.

## Checker

```text
node scripts/emp1-caux-pp24-31-benchmark-check.mjs
```

Normal mode checks source/transcription custody, semantic hashes, anti-circularity, benchmark-specific load mapping, independent arithmetic, stress-intensity reconstruction and all false authority flags.

Its intended successful state is:

```text
PASS_CAUX_REFERENCE_FREEZE_OUTSIDE_GAMMA5_PROFILE_DIRECT_PDF_REOBSERVATION_PENDING
```

That is a **reference-freeze/arithmetic PASS**, not final direct-source qualification and not production qualification.

Authorization-facing source mode is:

```text
node scripts/emp1-caux-pp24-31-benchmark-check.mjs --require-direct-pdf
```

It must exit nonzero while direct PDF page re-observation remains `NOT_RUN_EXECUTION_ENVIRONMENT`.

## Remaining boundary

PR-C has completed the non-circular retained-reference freeze and independent arithmetic. Final direct-CAUx-source qualification remains blocked until the exact controlled PDF pages can be rendered/re-observed in an execution path that exposes binary page content. That remaining source-observation block does not justify changing the gamma5 route, production authority, WRC source semantics, code-compliance state or release profile.
