# M047 BM4_L — F2.8c authenticated committed-friction replay

## Mission

Use independently authenticated BM4_NL product endpoints to test how much of BM4_L L13 can be reproduced when the product's **committed tangential friction vector** is replayed on the exact regenerated L6 stiffness state, without selecting a state or parameter from the BM4_L comparison score.

This is a committed-state diagnostic, not a predictive nonlinear solver qualification.

## Stack

```text
base PR  #1081
base head 048e4ea55373e0398272e3bafc1795086afb8310
head branch agent/m047-bm4l-f28c-authenticated-committed-friction-replay
```

## Exact source custody

BM4_L source is re-downloaded and authenticated on Windows/ACE before each replay:

```text
Common commit 45d51ea18624f5775805f399110c1738301c0d90
BM4_L.zip SHA-256 978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9
BM4_L.ACCDB SHA-256 64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8
```

Independent BM4_NL source:

```text
Common commit 179c4831cf521cf797c13699cfbbd118315c9244
BM4_NL.zip Git blob 86a803ed27ebdbd2836452dc2e874c3458aa204c
BM4_NL.ACCDB SHA-256 85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21
```

The replay reads BM4_NL with ACE in `Mode=Read` only.

## Exact endpoint identity

The workflow independently proves before scoring that BM4_NL is the same physical endpoint pair:

```text
BM4_NL case 17 displacement/rotation == BM4_L L13
BM4_NL case 19 displacement/rotation == BM4_L L6
```

For each pair, 582 governed displacement/rotation components are compared and the maximum absolute difference is approximately `1e-19` SI, i.e. floating-point serialization noise.

BM4_NL case 19 also has exactly zero X/Z tangential force on every positive-friction `Rigid Y` row, providing an independent friction-off control.

## Replay mechanics

At the exact 26 friction nodes:

```text
pipe tangential load = -(BM4_NL case17 Rigid-Y FX/FZ)
```

The exact L6 operator is freshly regenerated from BM4_L rather than copied from a stored diagnostic:

```text
323 analysis nodes
1,938 DOFs
322 analysis elements
51 grounded finite restraint springs
```

No normal-force basis, stick/slide history, gap state, damping, friction parameter, comparator, tolerance, or CAESAR reference row is selected from the L13 score.

Restraint-force reporting includes both the finite grounded-spring reaction and the equal/opposite committed tangential friction contribution. This is reaction bookkeeping, not a mechanics fit.

## Fresh authenticated result

Automatic Windows/ACE run:

```text
run      31614066288
head     b51399a0cc43c27aa48f20de543a3f0af5c2fedb
artifact 9148489326
artifact digest sha256:d6684b258d7420da723b7324a71eb85360ead014ce2ce41b432a92934cf3dd32
```

Result on the unchanged 1,914-row denominator:

```text
historical fixed-contact Coulomb diagnostic  1719 / 1914 = 89.8119122257%
authenticated committed-vector diagnostic    1884 / 1914 = 98.4326018809%
change                                         +165 rows = +8.6206896552 pp
```

Breakdown:

| Quantity | Pass | Fail | Total |
|---|---:|---:|---:|
| Displacement | 288 | 3 | 291 |
| Rotation | 288 | 3 | 291 |
| Restraint force | 89 | 1 | 90 |
| Restraint moment | 90 | 0 | 90 |
| Source force FROM | 283 | 5 | 288 |
| Source force TO | 282 | 6 | 288 |
| Source moment FROM | 282 | 6 | 288 |
| Source moment TO | 282 | 6 | 288 |

## PR #1078 correction

Closed PR #1078 happened to report the same percentage, but its checked-in case-17 vector fixture is **not** the authenticated BM4_NL vector and must not be reused.

Witness at node 20350:

```text
authenticated case17 Rigid Y [FX,FY,FZ]
[+827.2864379882812, -3094.531982421875, +392.7410583496094] N

withdrawn #1078 fixture
[-1696.5887451171875, -9537.6845703125, +2287.588134765625] N
```

F2.8c therefore treats #1078 as a custody-mismatched fixture. The `98.4326%` percentage is accepted here only because it was independently regenerated from authenticated source bytes in run 31614066288.

## Remaining 30 rows

The remaining failures are highly localized. A long torsion chain around 20330→20500 is dominated by a pre-existing L6 baseline/recovery difference: the authenticated friction increment is already nearly identical to the product increment, while the small final result amplifies the baseline cancellation error. Other residuals concentrate near 20250/20280/20550, 21610, 21900, and the 22020→22070 axial/rigid chain.

These residuals are now treated as linear structural/result-recovery or product-state observability targets, not as permission to alter the authenticated friction vector.

## Authority boundary

```text
independent committed product state accepted = true
predictive nonlinear state algorithm          = false
production nonlinear mechanics authorized     = false
qualified L13 accuracy authorized              = false
F2.9 qualification authorized                  = false
```

A committed product vector can prove the achievable endpoint and isolate residual mechanics, but it cannot by itself predict another nonlinear load case such as L7.

## Decision

**F2.8c establishes a fresh, authenticated, artifact-recomputed L13 committed-state diagnostic of 1884/1914 = 98.4326%, up 8.6207 percentage points from the historical 89.8119% diagnostic. The result is not yet production-qualified because the predictive CAESAR nonlinear state algorithm remains unresolved. Further work should preserve this vector and attack the remaining 30 structural/recovery rows independently.**
