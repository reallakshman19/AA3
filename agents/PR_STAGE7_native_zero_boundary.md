# M047 BM4_L native zero-boundary qualification

## Scope

This delivery is profile-only and stacked after the qualified Type 2.1 tee thermal free-growth and resolved BM4_L T1 interval-authority changes. It does not change mechanics, reference values, nonzero relative tolerances, recovery, signs, topology, stiffness, loads, or equilibrium gates.

## Source authority

The exact pinned `BM4_L.ACCDB` has SHA-256 `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`. The retained qualification artifact exposes its normalized CAESAR `OUTPUT_DISPLACEMENTS` reference rows and pins that table as SHA-256 `f23b9ddd34a076eb09e9759824cae48e0b0da628abc0b790d3491b33a7b88d05`.

Across all ten selected CAESAR cases, not only the six scored cases:

- displacement: 591 exact-zero references, 2319 nonzero references, smallest nonzero `1.0186471627093852e-7 m = 0.00010186471627093852 mm`, and no nonzero value below `0.0001 mm`;
- rotation: 267 exact-zero references, 2643 nonzero references, smallest nonzero `1.7563221737412638e-6 rad = 0.00010062984802061692 deg`, and no nonzero value below `0.0001 deg`.

Nonzero rows above these floors retain high-precision values; they are not quantized onto `0.0001` increments. The evidence therefore supports a source zero-support floor rather than ordinary value rounding.

The live displacement comparator already declares `zeroReferenceAbsolute = 1e-7 m = 0.0001 mm`. This change applies the corresponding rotation source boundary:

```text
ROTATION.zeroReferenceAbsolute = 0.0001 deg
                               = 1.7453292519943296e-6 rad
```

This is BM4_L benchmark-source authority only. It does not claim a universal hard Hexagon/CAESAR cutoff for other files or unit systems.

## Comparator semantics

`qualification-comparison.js` applies `zeroReferenceAbsolute` only when the reference magnitude is exactly zero. Every nonzero rotation reference remains governed by the unchanged literal `relative = 0.1` rule. Therefore this profile change cannot make any nonzero-reference row pass by relaxing its relative tolerance.

## Expected resolved signature

With the prerequisite tee free-growth and resolved interval alpha candidates:

```text
before zero-boundary: L2/L3/L4/L5/L6/L14 = 31/22/40/13/22/22 = 150
with native boundary: L2/L3/L4/L5/L6/L14 =  6/ 5/ 7/ 8/15/ 5 = 46
```

Exactly 104 of the 105 exact-zero failures are removed. The same 45 nonzero-reference failures remain, plus exact-zero `L2:20440:RZ`.

## Independent suppressed-zero cross-check at 20440:RZ

The surviving exact-zero row is deliberately **not** absorbed by the new boundary. Its current LFEA value is:

```text
L2:20440:RZ = -2.0332762129334813e-6 rad
             = -0.00011649814558543177 deg
```

which is genuinely above `0.0001 deg`.

The two ordinary source frames directly incident on node `20440` provide an independent constitutive cross-check. Using the governed CAESAR source-element end actions, retained exact-head production `K`/load vectors and the identity

```text
q = K*u - f_equivalent - f_initial
```

while treating only ACCDB-stored zero DOFs in the decoupled global `UY/RZ` bending plane as unknowns gives:

```text
source 23 / 20390->20440: RZ(20440) = -0.00009194742713346596 deg
source 24 / 20440->20480: RZ(20440) = -0.00009140591012507234 deg
mean                                      -0.00009167666862926915 deg
relative disagreement                      0.5907 percent
```

Both independent reconstructions are below `0.0001 deg`. The rigid-translation null freedom in the source-23 solve has no projection onto the target RZ, so the target rotation is identifiable even though the suppressed UY values are not individually identifiable.

This corroborates that CAESAR's stored zero at `20440:RZ` represents a sub-floor value rather than a literal mechanical zero. It **does not** replace the CAESAR reference and it **does not** widen the comparison gate: the LFEA value remains above the source boundary and stays failed by design.

Durable evidence:

- `benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-zero-suppression-crosscheck.json`
- `scripts/lfea-m047-bm4l-zero-suppression-crosscheck.mjs`

## Reducer sampling remains blocked and separate

Official Hexagon CAESAR II documentation confirms that a concentric reducer is represented by ten successively changing pipe cylinders over the element length. It also separately defines the 60-percent rule for the reducer transition `Alpha` used by SIF/code calculations. Public documentation reviewed for this stage does **not** specify the representative OD/wall-thickness station used for each structural cylinder.

Therefore:

- the existing ten-cylinder production representation remains physically supported;
- the current midpoint section rule remains explicitly provisional;
- the 60-percent Alpha rule must not be repurposed as a structural stiffness station;
- start/mid/end residual comparisons are diagnostics only and cannot select a production rule without independent product authority.

No reducer code is changed by this PR.

## Validation

`node scripts/lfea-m047-bm4l-native-zero-boundary-check.mjs <bm4l-report.json>` was executed locally against the downloaded exact-head qualification artifact and passed. It verifies the all-ten-case zero/nonzero counts, minimum nonzero support, absence of nonzero values below each native boundary, the profile scalar, and the expected residual classification.

`node scripts/lfea-m047-bm4l-zero-suppression-crosscheck.mjs <bm4l-report.json> <bm4l-actual.json>` was also executed locally and passed. It reproduces both independent `20440:RZ` latent-rotation reconstructions, requires their disagreement to remain below 1 percent, requires both inferred values to remain below the native boundary, and explicitly requires the current LFEA value to remain above the boundary.

## Non-scope

- no nonzero `<10%` tolerance change;
- no displacement, force, or moment zero-boundary change;
- no CAESAR reference mutation;
- no tee/bend/reducer/restraint/pressure/gravity change;
- no Type 2.6 change;
- no Issue #991 change.
