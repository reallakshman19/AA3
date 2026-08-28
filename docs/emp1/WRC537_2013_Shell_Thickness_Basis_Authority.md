# WRC 537 shell-thickness basis authority — EMP1-32

## Decision

Direct WRC 537 primary text now qualifies the **physical member represented by `T`**, but not the engineering assessment state of that wall.

Current disposition:

`BLOCKED_PARTIAL_PRIMARY_HOST_SHELL_T_IDENTITY_AND_EQUATION_ROLE_QUALIFIED_ASSESSMENT_THICKNESS_BASIS_UNRESOLVED`

Directly supported:

- §1.2 identifies spherical `T` as the thickness of the spherical shell;
- §1.3 identifies cylindrical `T` as the wall thickness of the cylindrical shell;
- §2 uses shell `T` in the general membrane/bending stress relation;
- §4.2.1 defines the cylindrical shell parameter with the host-shell thickness, `gamma = R_m/T`;
- retained Table 5 independently labels cylindrical `T` as `Vessel Thickness` and uses it in gamma and stress scaling.

Not directly supported by those statements:

- nominal, design, minimum ordered, actual measured, corroded/remaining, or other assessment-wall selection;
- corrosion allowance subtraction;
- mill tolerance or forming thinning treatment;
- automatic use of local measured minimum wall;
- local juncture versus remote shell-course thickness;
- locally thickened shell, insert plate or reinforcement-pad treatment;
- an engineering rule for choosing a new `R_m` when the assessment wall state differs from the nominal geometry package.

The source therefore identifies **which member `T` belongs to**, not **which engineering wall state must be selected**.

## Primary-source observations

Controlled source identity remains:

```text
path       = docs/emp1/WRC537_2013.pdf
Git blob   = ce861233928154145a9257efbbf8dbef3f5a17d1
raw SHA256 = 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
```

Readable primary-document text was inspected at these locators:

1. §1.2, *Nomenclature Applicable to Spherical Shells*, printed page 2 — `T` belongs to the spherical shell thickness.
2. §1.3, *Nomenclature Applicable to Cylindrical Shells*, printed page 2 — `T` belongs to the cylindrical shell wall thickness.
3. §2, *General Equation*, printed page 3, Eq. (1) — membrane and bending stress terms use shell `T` and `T^2`.
4. §4.2.1, *Shell Parameter*, printed page 12, Eq. (25) — cylindrical gamma is the shell mid-radius divided by shell thickness.

The readable rendering is textual observation only. Its byte identity to the pinned repository PDF is `UNPROVEN`, and direct-page observation of the pinned PDF remains:

`NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT`

## Retained Table-5 authority

`docs/emp1/WRC537_2013_Tables_and_Charts.md`, Table 5, retained PDF pages 41–42, remains useful corroborating primary transcription:

```text
Vessel Thickness  T
gamma = R_m / T
```

The cylindrical stress computation also contains `T` and `T^2` scaling. Table 5 does not supply the missing nominal/corroded/measured assessment-basis rule.

## Assessment-basis boundary remains blocked

A source-qualified host-shell member identity does not answer which physical state of that member must be used for a professional assessment.

The following remain explicitly unqualified:

```text
nominal thickness basis              = false
actual measured thickness basis      = false
minimum thickness basis              = false
corroded/remaining assessment basis  = false
corrosion allowance treatment        = false
mill/forming tolerance treatment     = false
local measured thinning treatment    = false
juncture-vs-course thickness rule    = false
local thickening/insert/pad rule     = false
radius/thickness assessment rule     = false
```

Therefore:

`host-shell T identity != assessment thickness-basis authority`

## Attachment/nozzle thickness is separate

WRC nomenclature separately uses lowercase `t` for the thickness of a hollow cylindrical attachment in the spherical-shell family. The new `T` authority must not be used to substitute nozzle/attachment wall or reinforcement-pad thickness for host-shell `T`.

## Current software custody

The local-attachment foundation model retains two explicit upstream policies:

```text
NOMINAL_MINUS_CORROSION
EXPLICIT_ASSESSMENT
```

Current software passes its inherited assessment thickness into WRC custody and constructs:

```text
shellThickness = LAFEA2_ASSESSMENT_PIPE_THICKNESS
R_m = pipeOutsideDiameter/2 - assessmentPipeThickness/2
gamma = R_m/T
```

That chain is deterministic and internally coherent. It remains a **software/engineering custody policy**, not a newly proven WRC rule selecting the assessment wall state.

Do not promote `NOMINAL_MINUS_CORROSION` to a WRC source rule.

Do not promote `EXPLICIT_ASSESSMENT` to a WRC source rule.

## Current authorized-route reconciliation

The bounded gamma=5 / zero-differential-pressure route remains independently authorized:

```text
bounded route authorized                    = true
bounded engineering use                     = true
bounded production use                      = true
host-shell member identity source authority = true
assessment thickness-basis source authority = false
global EMP.1.C authority                    = false
code compliance authority                   = false
release qualification                       = false
professional release ready                  = false
```

Governing invariant:

`BOUNDED_WRC_ROUTE_AUTHORIZATION_DOES_NOT_BACK_PROPAGATE_TO_SHELL_THICKNESS_PHYSICAL_BASIS_SOURCE_AUTHORITY`

The route's ability to calculate does not prove that its inherited assessment thickness is the WRC-required nominal/corroded/measured basis.

## Radius/thickness relationship

Issue #1377 separately qualifies `R_m` as cylindrical mean/mid-radius while retaining assessment-geometry state as unresolved. This #1375 increment now establishes that cylindrical `T` is the host-shell wall thickness used with that `R_m` in gamma.

It still does not source-authorize mixing a radius based on one physical wall state with a thickness from another, nor does it define the required transformation when corrosion, thinning or local geometry changes the assessment state.

## Required primary-source closure

Professional thickness-basis authority still requires exact evidence for:

1. nominal / actual / minimum / corroded / remaining / assessment basis of host-shell `T`;
2. whether spherical and cylindrical `T` use the same engineering assessment-basis rule;
3. corrosion-allowance treatment;
4. mill-tolerance and forming-thinning treatment;
5. measured local-thinning treatment;
6. local juncture thickness versus remote course thickness;
7. consistency between selected assessment `T` and radius construction;
8. locally thickened shell, insert plate and reinforcement-pad treatment;
9. source evidence required for the selected physical thickness.

## Authority effect

This source-governance increment does not:

- change production thickness conversion/defaulting;
- change `R_m`, gamma, beta, coefficients or stress numerics;
- change route/registry mechanics;
- change the P0 aggregate/current professional state in this source PR;
- change controlled source bytes;
- change benchmark/oracle/tolerance or evidence 01–12;
- widen pressure, SCF, off-axis, attachment-class, interaction, code or release authority.

It grants only the bounded source statement that WRC `T` is the host-shell thickness/wall thickness used by the cited formulation. The professional assessment basis remains blocked.
