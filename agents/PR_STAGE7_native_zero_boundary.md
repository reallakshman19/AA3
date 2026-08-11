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

## Validation

`node scripts/lfea-m047-bm4l-native-zero-boundary-check.mjs <bm4l-report.json>` was executed locally against the downloaded exact-head qualification artifact and passed. It verifies the all-ten-case zero/nonzero counts, minimum nonzero support, absence of nonzero values below each native boundary, the profile scalar, and the expected residual classification.

## Non-scope

- no nonzero `<10%` tolerance change;
- no displacement, force, or moment zero-boundary change;
- no CAESAR reference mutation;
- no tee/bend/reducer/restraint/pressure/gravity change;
- no Type 2.6 change;
- no Issue #991 change.
