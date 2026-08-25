# WRC 537 shell-thickness basis authority — EMP1-32

## Decision

Retained WRC 537 Table 5 pp.41–42 provides a bounded source fact that was previously hidden by the broader blocked disposition:

```text
Vessel Thickness  T
```

Table 5 also uses that same `T` in the cylindrical geometry parameter:

```text
gamma = R_m / T
```

and in the cylindrical membrane/bending stress scale factors, which contain `T` and `T^2` denominators.

Those facts qualify the **Table-5 symbol and mathematical role of `T`**. They do **not** define which physical vessel thickness value must be selected for a professional assessment.

Current disposition:

`BLOCKED_WRC_SHELL_THICKNESS_PHYSICAL_BASIS_UNRESOLVED_TABLE5_ROLE_RECONCILED`

## Source custody

Controlled source:

- WRC 537 (2013)
- raw SHA-256 `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`
- Git blob `ce861233928154145a9257efbbf8dbef3f5a17d1`

Retained primary-source transcription:

- `docs/emp1/WRC537_2013_Tables_and_Charts.md`
- Table 5 — Computation Sheet for Local Stresses in Cylindrical Shells
- PDF pages 41–42

Direct current-turn PDF page re-observation remains:

`NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT`

## What retained Table 5 qualifies

Table 5 identifies the cylindrical geometry quantity as `Vessel Thickness T`.

The retained Table-5 computation sheet also establishes that:

- `T` participates in `gamma = R_m/T`;
- cylindrical local-stress scale factors use `T` and `T^2`;
- `T` is therefore a source-defined input to the Table-5 cylindrical calculations, not merely a software field name.

This increment does not alter any coefficient, curve, sign, stress or numerical implementation.

## What Table 5 does not establish

The retained computation sheet does not define which physical thickness basis must be selected from an engineering source package. It does not, by itself, prove whether WRC `T` must be:

- nominal wall thickness;
- actual measured wall thickness;
- minimum ordered thickness;
- corrosion-adjusted/net thickness;
- local minimum remaining thickness;
- design thickness;
- another assessment thickness.

It also does not establish from this retained table alone:

- whether corrosion allowance must be subtracted;
- whether mill tolerance or forming thinning must be removed;
- whether the local attachment-juncture thickness or remote shell-course thickness governs;
- whether insert plate, reinforcement pad or local thickening changes effective `T`;
- whether the same physical thickness basis must be used to construct `R_m`;
- how a thickness discontinuity affects WRC applicability.

Therefore symbol/role authority is **not physical thickness-basis authority**.

## Current software custody

The local-attachment foundation model has two explicit upstream thickness policies:

```text
NOMINAL_MINUS_CORROSION
EXPLICIT_ASSESSMENT
```

For `NOMINAL_MINUS_CORROSION`:

```text
assessmentPipeThickness = nominalPipeThickness - corrosionAllowance
```

For `EXPLICIT_ASSESSMENT`, a positive caller-supplied assessment thickness is retained.

LAFEA.2 then consumes:

```text
foundationModel.thicknessBasis.assessmentPipeThickness
```

EMP.1 WRC source custody presently receives that same value as:

```text
shellThickness = LAFEA2_ASSESSMENT_PIPE_THICKNESS
meanRadius = PIPE_OD_OVER_2_MINUS_ASSESSMENT_THICKNESS_OVER_2
gamma = R_m/T
```

This is an internally consistent and deterministic software chain. The new Table-5 reconciliation proves that the WRC cylindrical computation sheet consumes a vessel thickness `T`; it still does **not** prove that either upstream assessment policy is the WRC-required physical basis.

## Protected inference boundary

Do not promote `NOMINAL_MINUS_CORROSION` to a WRC source rule.

Do not promote `EXPLICIT_ASSESSMENT` to a WRC source rule.

Do not infer:

```text
Table 5 says Vessel Thickness T
    => T means nominal-minus-corrosion thickness
```

or:

```text
Table 5 uses T in gamma and stress scales
    => any positive caller-supplied assessment thickness is WRC-authorized
```

or:

```text
current software uses the same assessment thickness in R_m and T
    => the physical WRC radius/thickness basis is source-qualified
```

## Radius/thickness relationship

Current software derives:

```text
R_m = OD/2 - T/2
```

using the same inherited assessment thickness that is passed as `T`. That preserves internal consistency but does not establish the primary-source physical construction rule for either quantity.

Issue #1377 separately reconciles retained Table-5 `R_m` symbol/parameter authority while keeping its OD/ID/T physical construction blocked. The two issues therefore remain mutually fail-closed at the physical geometry-basis boundary.

## Required primary-source closure

Professional thickness-basis authority still requires exact source evidence for:

1. physical meaning of cylindrical shell thickness `T`;
2. nominal / actual / minimum / corroded / assessment basis;
3. corrosion-allowance treatment;
4. mill-tolerance and forming-thinning treatment;
5. measured local-thinning treatment;
6. local juncture thickness versus remote course thickness;
7. consistency between selected physical `T` and radius construction;
8. locally thickened shell, insert plate and reinforcement-pad treatment;
9. source evidence required for the selected physical thickness.

## Authority effect

This source-governance increment does not:

- change production thickness conversion or defaulting;
- change `R_m`, `gamma`, `beta` or Table-5 numerical mechanics;
- change source-custody runtime code;
- change route or registry authority;
- change the aggregate P0 source gate;
- widen pressure, SCF, off-axis, spherical, attachment-class, interaction, code or release authority.

The current production thickness basis remains historical bounded-route custody, not newly qualified WRC physical-thickness authority.
