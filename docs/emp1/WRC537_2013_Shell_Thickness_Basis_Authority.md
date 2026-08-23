# WRC 537 shell-thickness basis authority — EMP1-32

## Decision

The repository has a deterministic upstream **assessment-thickness policy**, but that policy is not yet source-qualified as the WRC 537 definition of shell thickness `T`.

A positive `shellThickness` value, even with a source locator, is not by itself sufficient to establish WRC thickness-basis authority.

## Current software custody

The local-attachment foundation model has two explicit thickness policies:

```text
NOMINAL_MINUS_CORROSION
EXPLICIT_ASSESSMENT
```

For `NOMINAL_MINUS_CORROSION`, canonical foundation mechanics calculate:

```text
assessmentPipeThickness = nominalPipeThickness - corrosionAllowance
```

For `EXPLICIT_ASSESSMENT`, a positive caller-supplied assessment thickness is retained.

LAFEA.2 section properties then consume exactly:

```text
foundationModel.thicknessBasis.assessmentPipeThickness
```

and retain its source reference as `sectionProperties.assessmentPipeThickness`.

EMP.1 WRC source custody consumes that value through correlation geometry evidence and labels the derivation:

```text
shellThickness = LAFEA2_ASSESSMENT_PIPE_THICKNESS
meanRadius = PIPE_OD_OVER_2_MINUS_ASSESSMENT_THICKNESS_OVER_2
gamma = Rm/T
```

This is an internally consistent and deterministic software chain.

## What that chain does not prove

The upstream LAFEA thickness policy was developed for load-transfer / pressure-baseline / nominal-section mechanics. It cannot automatically become WRC 537 engineering authority.

In particular, current software does not prove from the WRC primary source that:

- `T` means nominal minus corrosion allowance;
- `T` may instead be any explicit assessment thickness;
- corrosion allowance must always be removed;
- measured local minimum thickness is automatically the correct WRC `T`;
- mill tolerance or forming thinning must be removed;
- nominal outside diameter and a net/corroded thickness may always be combined to derive WRC mean radius;
- reinforcement-pad, insert-plate or locally thickened-shell thickness may substitute for the base-shell `T`.

## Legacy source state

`docs/01_WRC537_METHOD_DEFINITION.md` is explicitly `NOT_READY_FOR_IMPLEMENTATION`. Its retained research marked the exact WRC thickness basis unresolved and recorded only secondary guidance that dimensions after corrosion allowance, forming allowance and undertolerance removal may be conservative.

That secondary guidance is an extraction target, not implementation authority.

## Radius/thickness coherence

Current EMP.1 custody is internally coherent because it derives:

```text
Rm = OD/2 - T/2
```

from the same inherited assessment thickness used for `T`.

That coherence prevents an internal nominal-radius/net-thickness mismatch in the current path, but it still does not prove the physical WRC source basis of either `Rm` or `T` for every assessment condition.

Any later alternative thickness policy must explicitly re-qualify its radius construction. A future implementation must not change `T` while silently retaining an `Rm` derived from a different thickness basis.

## Required primary-source closure

Direct source work must establish:

1. the exact WRC definition of cylindrical-shell thickness `T`;
2. whether the spherical-shell `T` definition is identical or separate;
3. nominal / actual / minimum / corroded / assessment basis;
4. corrosion-allowance treatment;
5. mill-tolerance and forming-thinning treatment;
6. measured local-thinning treatment;
7. whether thickness at the shell-attachment juncture governs;
8. required consistency among OD/ID/mean-radius and `T`;
9. treatment of locally thickened shell, insert plate and reinforcement pad;
10. exact evidence needed to prove the selected physical thickness.

## Fail-closed boundary

Until direct primary-source closure:

- do not promote `NOMINAL_MINUS_CORROSION` to a WRC source rule;
- do not promote `EXPLICIT_ASSESSMENT` to a WRC source rule;
- do not silently subtract corrosion allowance specifically for WRC;
- do not assume measured minimum thickness is automatically WRC `T`;
- do not mix radius and thickness bases without qualified geometry custody;
- do not use reinforcement-pad thickness as shell `T`;
- do not alter current production numerical mechanics in this source phase.

Current disposition:

`BLOCKED_WRC_SHELL_THICKNESS_BASIS_PRIMARY_SOURCE_UNRESOLVED`
