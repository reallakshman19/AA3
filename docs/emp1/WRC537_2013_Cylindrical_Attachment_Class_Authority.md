# WRC 537 cylindrical attachment-class authority — EMP1-30

## Status

`BLOCKED_PARTIAL_PRIMARY_STANDARD_CYLINDRICAL_ROUND_CLASS_QUALIFIED_NONSTANDARD_CLASS_BOUNDARIES_UNQUALIFIED`

## Decision

The source question has advanced beyond Table-5 input silence.

A directly readable WRC 537 (2013) primary-document text rendering now establishes that the cylindrical-shell method itself is organized by attachment geometry. Section 4.2.2 states that cylindrical shells may be treated with round or rectangular attachments; §4.2.2.1 defines the round attachment parameter using only `r0` and `Rm`. The cylindrical nomenclature defines `r0` as the outside radius of the cylindrical attachment.

The bounded source-qualified identity established here is therefore:

`standard cylindrical round host-shell attachment`

This is deliberately narrower than “any object that looks round.”

## Primary-document text observations

Observed external rendering:

`https://studylib.net/doc/25312294/wrc-537-`

Relevant WRC locators:

```text
§1.3       r0 = outside radius of cylindrical attachment
§4.2.2     cylindrical attachment geometry families = round or rectangular
§4.2.2.1   round attachment: beta = 0.875*r0/Rm, Eq. (26)
§4.3.4     cylindrical round attachment is illustrated by a pipe for torsional shell stress
§4.5.3     the foregoing method evaluates shell stress, not attachment stress; a nozzle is explicitly discussed as an attachment case
Appendix A off-axis discussion
            1B-1 / 2B-1 maximum-stress-off-axis treatment applies only to a round flexible-nozzle connection
```

The contrast with the spherical-shell section is material. Section 3.2.2 explicitly branches spherical attachments into rigid attachments and hollow nozzles with additional attachment parameters. Section 4.2.2 does not import those spherical class parameters into the cylindrical method; it defines cylindrical families by round/rectangular geometry and gives the round `r0/Rm` parameterization directly.

Accordingly, for the standard cylindrical round host-shell equations and standard axes-of-symmetry/eight-point route, the source does not define a SOLID/HOLLOW selector, a RIGID/FLEXIBLE selector, or attachment wall thickness as a §4 curve-selection/parameterization input.

This is stronger than the prior Table-5 observation because the conclusion now comes from the governing cylindrical method section, not from computation-sheet silence alone.

## What is qualified

For the bounded standard host-shell route:

```text
shell family                     CYLINDRICAL
attachment geometry family       ROUND
attachment geometry parameter    r0 outside radius at shell juncture
standard parameter               beta = 0.875*r0/Rm
standard longitudinal figures    1B / 2B
standard recovery                Au Al Bu Bl Cu Cl Du Dl
host-shell stress only            true
```

Within this standard §4 route, no separate solid/hollow or rigidity/flexibility selector is source-defined for curve selection. Attachment wall thickness is likewise not a standard §4 round-attachment parameter.

This does **not** assert universal physical solid/hollow equivalence. It states the narrower source fact that the standard cylindrical host-shell method does not branch its round curve selection on those classifications.

## Pipe/nozzle evidence

The cylindrical section itself describes a round attachment “such as a pipe” for torsional shell stress. Section 4.5.3 then discusses the nozzle case while warning that the procedure calculates shell stress rather than nozzle/attachment stress.

Therefore a hollow pipe/nozzle is not excluded merely because it is hollow. However, this does not authorize nozzle-wall stress, reinforcement design, code acceptance, or a modified-juncture model.

## Off-axis boundary remains separate

The source separately says that the off-axis maximum-stress figures `1B-1 / 2B-1` apply only to a **round flexible-nozzle connection**.

That restriction is preserved exactly. The current bounded route uses standard `1B / 2B` and does not authorize `1B-1 / 2B-1`.

No numerical definition or qualification threshold for “flexible nozzle” has been established here. Therefore:

```text
off-axis flexible-nozzle restriction = source observed
off-axis flexible-nozzle classifier  = not qualified
off-axis route authority             = false
```

## What remains blocked

This source increment does not turn shape into universal class authority. The following remain outside the qualified bounded class until separately evidenced:

1. an arbitrary round object whose physical attachment function is not established;
2. a structural lug, pad, clip or support represented by a circular surrogate;
3. reinforcement pads, integrally reinforced nozzles or locally thickened/modified junctions where the idealized standard attachment assumptions may change;
4. unusually large or substantially non-idealized attachments requiring the §4.5 / Appendix-A limitation review;
5. any off-axis `1B-1 / 2B-1` claim without a source-qualified flexible-nozzle classification;
6. attachment/nozzle wall stress;
7. Appendix-B non-unity SCF authority;
8. code acceptance or professional release authority.

In short: **round geometry is necessary for this bounded class, but an arbitrary round object is not thereby authorized.**

## Source-custody boundary

Controlled repository source remains:

```text
docs/emp1/WRC537_2013.pdf
Git blob SHA-1 = ce861233928154145a9257efbbf8dbef3f5a17d1
raw SHA-256    = 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
```

The connected repository interface still cannot directly render the pinned PDF pages. Therefore:

```text
external primary-document text observed           = yes
external rendering byte-identical to pinned PDF   = UNPROVEN
pinned repository PDF direct-page observation     = NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT
```

The external rendering is not byte custody for the pinned source and is not represented as such.

## Authority effect

No production numerical or route-registry mutation is made by this source batch. It changes no WRC coefficients, gamma/beta numerical rules, pressure authority, SCF authority, off-axis authority, code-compliance authority or release authority.

Current bounded runtime authorization remains a separate owner-authorized state. Source progress here does not back-propagate into broader attachment families or professional release readiness.

## Remaining closure question

Issue #1370 can be fully closed for professional bounded use only when the canonical source/evidence contract can prove that the physical item belongs to the standard cylindrical round attachment family rather than merely supplying a round diameter, and when any reinforcement/modified-juncture or other nonstandard attachment condition is either source-qualified or deterministically excluded.
