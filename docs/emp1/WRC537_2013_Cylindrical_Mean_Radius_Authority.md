# WRC 537 cylindrical mean-radius / diameter-basis authority — EMP1-33

## Decision

The current EMP.1 cylindrical WRC route has a deterministic internal geometry derivation, but the exact **primary-source cylindrical shell mean-radius definition is not yet qualified**.

Current software derives:

```text
outerRadius = pipeOutsideDiameter / 2
meanRadius  = outerRadius - assessmentPipeThickness / 2
gamma       = meanRadius / shellThickness
beta        = 0.875 * attachmentOutsideRadius / meanRadius
```

That chain is coherent with the retained LAFEA.1/LAFEA.2 assessment geometry. It must not be promoted into a universal WRC source rule until the primary cylindrical nomenclature and geometry relation are directly verified.

## Retained source distinction

`docs/01_WRC537_METHOD_DEFINITION.md` is explicitly `NOT_READY_FOR_IMPLEMENTATION`.

Its retained spherical-shell extraction states:

```text
R_m = mean radius of spherical shell
R_m = R_i + T/2 = (R_o + R_i)/2
```

but its cylindrical-shell extraction separately records:

```text
R_c = mean radius of cylindrical shell
exact geometric definition = UNRESOLVED — exact definition not OCR-readable
```

Therefore the confirmed spherical `R_m` mid-surface definition cannot be silently transferred to cylindrical `R_c`, and the software field name `meanRadius` cannot itself establish source nomenclature.

## Current software observation

`src/core/emp1/emp1-wrc537-source-custody.js` obtains:

- pipe outside diameter from retained LAFEA.2 geometry evidence;
- assessment pipe thickness from retained LAFEA.2 geometry evidence;
- `meanRadius = OD/2 - assessmentThickness/2`;
- then sends that value to the bounded cylindrical WRC geometry evaluator.

This is a **software derivation observation**. It proves reproducibility and internal consistency. It does not prove that WRC 537 defines cylindrical `R_c` from that exact pair of physical quantities for every nominal/corroded/measured assessment state.

## Production-critical unresolved items

Primary-source custody must resolve:

1. exact cylindrical source symbol (`R_c`, `R_m`, or other notation);
2. exact physical definition of the cylindrical radius;
3. whether it is midsurface/mean, inside, outside, nominal, or another radius;
4. exact relation among shell OD, ID, `T`, and the WRC radius;
5. whether the same thickness basis used as WRC `T` must construct the radius;
6. whether nominal OD remains fixed for an internally corroded assessment or another corrosion geometry is assumed;
7. treatment of external/two-sided corrosion and measured geometry;
8. treatment of local ovality/out-of-roundness;
9. whether local station diameter or shell-course nominal diameter governs;
10. treatment of locally thickened shell, insert plate, taper or transition;
11. exact radius consumed by cylindrical dimensionless parameters and WRC §4.5 applicability ratios;
12. source locators and inclusivity/definitions for every retained rule.

## Protected inference boundary

Until primary closure, these inferences are prohibited:

```text
current software uses OD/2 - T/2
    => WRC universally defines cylindrical radius that way
```

```text
spherical R_m is confirmed as midsurface radius
    => cylindrical R_c has the same qualified definition
```

```text
positive OD and T produce a valid meanRadius
    => physical WRC geometry basis is qualified
```

The current mathematical derivation may remain unchanged as historical bounded-route custody, but it does not create new engineering authority.

## Relationship to adjacent source gates

EMP1-32 separately keeps the physical basis of WRC shell thickness `T` source-gated. EMP1-33 therefore cannot close by algebra alone: the radius construction and thickness basis must be physically compatible and source-traceable.

EMP1-13 already qualified attachment `r0` as the **outside radius of the attachment at the shell juncture**. That `r0` authority does not qualify the host-shell cylindrical radius.

## Authority effect

This source phase does not:

- change `meanRadius` calculation;
- change `gamma` or `beta` equations;
- change WRC §4.5 cylinder-length/end-distance rules;
- change source-custody runtime code;
- change coefficients, curves, stresses or tolerances;
- widen pressure, SCF, off-axis, spherical, non-round, oblique, attachment-class, nearby-interaction, thickness, code or release authority.

Current disposition:

`BLOCKED_PRIMARY_CYLINDRICAL_RADIUS_DEFINITION_UNRESOLVED`

## Reopen gate

A production/source-custody change is admissible only after the pinned primary source can answer:

> What exact physical cylindrical shell radius does WRC 537 use; what is its source symbol; how is it constructed from controlled vessel dimensions and thickness basis; and what happens for nominal, corroded, measured, oval or locally modified shell geometry?
