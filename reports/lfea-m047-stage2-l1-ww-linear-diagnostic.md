# M047 Stage 2 — L1 hydrotest WW insulation linear discriminator

Status: **REAL PINNED-ACCDB COUNTERFACTUAL DIAGNOSTIC — not a qualification result and not a production mechanics promotion.**

## Custody and authority

- Source model/reference: pinned `BM4_L.ACCDB` only.
- ACCDB SHA-256: `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`.
- PR #1090 source head at the start of this batch: `101b3973fb24bba71d2f82f6e9e2c58a0fe6b538`.
- `caesar-accdb-linear-solve.js` Git blob at that head: `d28e3c5e893cea3ae44e116daf18fcdca0d22107`.
- The ACCDB contains 40 tables. `INPUT_CONTROL` has model inventory/orientation data only; no configuration field records `Include Insulation in Hydrotest`. `INPUT_BASIC_ELEMENT_DATA` carries the element insulation and hydro-pressure fields.
- All 96 basic-element rows have nonzero `INSUL_THICK` and `INSUL_DENSITY`; refractory and cladding thicknesses are zero in this file.

CAESAR II v14 documents `Include Insulation in Hydrotest=False` as the default and states that, for a HYD load case, `WW` excludes insulation/cladding when this setting is False:

- https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-14/1403380
- https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-14/1452260

No higher-authority override was found in the declared BM4_L source set. The current BM4_L solver does not model this setting: `physicalLineWeight()` always adds the `INSUL_THICK × INSUL_DENSITY` contribution even when `contentsDensityKgPerM3` selects the hydrotest `WW` basis.

## Diagnostic design

This batch isolates only the hydrotest weight basis before changing nonlinear friction:

1. Load the custody-verified real ACCDB through the portable JS reader.
2. Keep L1 formula `WW+HP`, water density 1000 kg/m³, `HP=HYDRO_PRESSURE`, ambient/EC/Bourdon/pressure mechanics and all tolerances unchanged.
3. Temporarily set the L1 friction multiplier to zero **only for this counterfactual linear isolation**. This is not a CAESAR benchmark twin and is not benchmark authority.
4. Solve once with the current WW implementation (includes insulation), then once with the same real ACCDB rows but the hydrotest insulation/cladding weight contribution suppressed. No geometry, pressure, stiffness, restraint or recovery mechanic changes.
5. Compare the 23 friction-site normal reactions against the stored CAESAR L1 normal reactions. The comparison is a discriminator for the linear load basis only; it must not be reported as nonlinear L1 accuracy.

The current implementation carries `111411.953099 N` of total L1 gravity load. Excluding hydrotest insulation reduces that to `95515.624630 N`, a governed-weight difference of **15896.328470 N**.

## Result

| Metric | Current WW | WW excluding hydrotest insulation |
|---|---:|---:|
| Friction-site normals within ±10% | 5 / 23 | **18 / 23** |
| Mean absolute normal error | 73.784% | 51.667% |
| Sites with smaller absolute normal error | — | **20 / 23** |
| Sites with larger absolute normal error | — | 3 / 23 |

The mean remains dominated by the deliberately retained outliers, especially node 21610. The useful signal is the field topology: most supports that were systematically high by roughly the insulation contribution collapse close to the stored CAESAR normal when the documented HYD rule is applied.

| Node | CAESAR normal N | Current linear N | Current error | No-insulation linear N | No-insulation error |
|---:|---:|---:|---:|---:|---:|
| 20090 | -12821.865 | -2439.771 | +80.97% | -2660.265 | +79.25% |
| 20170 | 17215.664 | 10251.151 | -40.45% | 8798.834 | -48.89% |
| 20250 | 16296.492 | 10588.157 | -35.03% | 9332.087 | -42.74% |
| 20350 | 3021.846 | 3582.896 | +18.57% | 2772.893 | -8.24% |
| 20440 | 2124.471 | 2614.959 | +23.09% | 2150.710 | +1.24% |
| 20520 | 2403.971 | 2926.043 | +21.72% | 2381.642 | -0.93% |
| 20550 | 2921.403 | 3575.459 | +22.39% | 2941.424 | +0.69% |
| 20580 | 2275.054 | 2815.556 | +23.76% | 2288.068 | +0.57% |
| 20710 | 2001.050 | 2287.558 | +14.32% | 1828.350 | -8.63% |
| 21470 | -4549.699 | -1444.232 | +68.26% | -1722.547 | +62.14% |
| 21610 | 247.702 | 3201.933 | +1192.65% | 2517.531 | +916.35% |
| 21740 | 4469.925 | 4888.882 | +9.37% | 4463.952 | -0.13% |
| 21800 | 3472.828 | 3629.196 | +4.50% | 3392.003 | -2.33% |
| 21860 | 7744.936 | 8101.882 | +4.61% | 7658.845 | -1.11% |
| 21930 | 4564.649 | 4893.861 | +7.21% | 4516.816 | -1.05% |
| 22020 | 1179.490 | 1350.403 | +14.49% | 1101.593 | -6.60% |
| 22070 | 1591.661 | 1754.324 | +10.22% | 1503.141 | -5.56% |
| 22120 | 5441.589 | 5437.333 | -0.08% | 5373.033 | -1.26% |
| 22140 | 2400.616 | 2809.737 | +17.04% | 2398.817 | -0.07% |
| 22220 | 1493.736 | 1819.357 | +21.80% | 1488.829 | -0.33% |
| 22260 | 1870.024 | 2282.781 | +22.07% | 1871.088 | +0.06% |
| 22310 | 2429.333 | 2974.186 | +22.43% | 2433.016 | +0.15% |
| 22370 | 1898.224 | 2315.781 | +22.00% | 1897.644 | -0.03% |

## Nonlinear diagnostic boundary

A matched 10-iteration R2 diagnostic was also run on the same real ACCDB with unchanged convergence gates. Neither run is converged and neither is an accuracy result. At iteration 10:

- current WW: displacement update `7.5787e-5 m`, reaction update `13272.34 N`;
- no-hydro-insulation WW: displacement update `3.0397e-5 m`, reaction update `5136.62 N`.

The corrected weight basis therefore changes the nonlinear branch and reduces the early update norms, but a full governed R2 L1 convergence run is still required before reporting nonlinear L1 accuracy. The available execution environment did not complete that full solve within its fixed tool runtime; the iteration ceiling and tolerances were **not** changed to force completion.

## Decision

`Include Insulation in Hydrotest=False` is now a **source-backed missing L1 linear mechanic**, not a friction-fit hypothesis. It should be represented as a governed hydrotest setting in the configuration authority and implemented in `WW` construction before any further L1 friction tuning.

This diagnostic does **not** authorize changing R2 friction, does not resolve the five remaining linear-counterfactual outliers, does not qualify L1, and does not change the frozen L2/L3/L4/L5/L6/L14 controls. A production promotion requires the normal source-custody run, frozen-control regression, full nonlinear L1 convergence/equilibrium/determinism evidence, and committed production artifacts.