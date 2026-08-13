# M047 Stage 2 — R3 per-axis box cap + 20710 forensic

Status: **REAL PINNED-ACCDB MEASUREMENT — R3 rejected; D1 remains baseline.**

Pinned `BM4_L.ACCDB`: `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`. Exact #1102 source parent used for the local runtime: `fadcee224328ab1a9e3c27e741442654e6b5206c`. Temporary Actions transport carried bytes/runtime only; the nonlinear solve ran locally.

## R3 mechanic

One mechanic changes from accepted D1: the resultant Coulomb circle becomes an independent per-free-tangential-axis box `|F_i| <= mu|N|`. The sliding force remains on the accepted D1 ray opposite current total tangential displacement; its magnitude is the intersection of that ray with the box. For a one-axis support the local cap law is mathematically identical to D1. No stiffness, normal basis, boundary tolerance, hysteresis, accelerator, iteration limit, convergence gate tolerance, or ±10% comparison goal changes.

## Measured result

| metric | D1 | D1+R3 |
|---|---:|---:|
| converged | yes | yes |
| tangential vectors within ±10% | **13/23** | **6/23** |
| normal reactions within ±10% | 23/23 | 23/23 |
| mean vector error | 60.42% | 38.03% |
| above provisional R1 floor: passes | 13/22 | **6/22** |
| above provisional R1 floor: mean error | 30.35% | 27.17% |
| above provisional R1 floor: worst error | 176.22% | 102.69% |

R3 reduces some large outliers but damages the broad fit. Examples: 22220 `111.57% -> 40.12%`; 22370 `69.23% -> 59.05%`; 21470 remains acceptable at `7.86%`. Conversely 22260 degrades `11.26% -> 36.57%`, and many previously passing rows leave the ±10% band.

**Decision: reject per-axis box capping as the governed L13 capacity law.** Do not select it because it lowers mean/worst error; the governed row pass count collapses and its error redistribution is not physically justified by the source.

Full local R3 artifact SHA-256: `6af0b949a5b46630ccf0042a2411367cb2297843831bed09585e33ef68e0cefe`. Compact committed evidence retains all 23 comparisons.

## 20710 raw-source forensic

Node 20710 contains exactly two input restraint rows under `REST_PTR=13`:

- `Rigid Y`: `FRIC_COEF=0.30000001192092896`, cosine `[0,1,0]`;
- `Rigid LIM`: friction blank, cosine `[-1,0,0]`.

Therefore X is restrained separately and **Z is the only free friction tangent**. Per-axis versus resultant partition is locally identical here.

CAESAR's individual L13 `Rigid Y` output row—not merely the node summary—contains `FY=-1882.3050537109375 N` and `FZ=624.7383422851562 N`. With the exact model µ, the final-own-normal cap is `564.691539 N`, giving utilization **1.106336**. Matching 624.738 N exactly would require an own-normal of **2082.461 N**, about **10.63%** above the published final normal.

The co-located LIM carries only X, and the node summary is the exact sum of the two individual restraint rows. The two L13 incident element-end force vectors close against the node reaction with relative raw-output roundoff `1.621e-08`. Thus the Z force is a real equilibrium reaction, not an aggregation/reporting artifact.

Cross-case evidence also rejects a fixed µ/multiplier error: the same Y restraint has final-own-normal utilization about `1.1090` in L1, `1.0037` in L7, and `1.1063` in L13.

### Remaining hypothesis

The source audit leaves **case-dependent capacity timing/history** as the leading unresolved direction: CAESAR's force is consistent with a larger normal than the published final own-normal, but no ACCDB field declares a larger coefficient or alternate normal. This is an inference, not yet a qualified mechanic.

Next discriminator: one D1-sequential **lagged-own-normal capacity** experiment using the previous nonlinear iterate's own-restraint normal for `mu|N|`, while leaving final equilibrium and every convergence/accuracy gate unchanged.
