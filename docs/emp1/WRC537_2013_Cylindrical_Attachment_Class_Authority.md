# WRC 537 cylindrical attachment-class authority — EMP1-30

## Decision

The current cylindrical round-attachment route must **not** be interpreted as proof that every round object, nozzle, plug, lug, pad or branch connection is automatically within WRC 537 applicability.

The present bounded implementation uses cylindrical host geometry plus a round attachment outside radius and does not consume attachment wall thickness, a solid/hollow flag, or a rigidity/flexibility classification. That software fact is not engineering authority that those properties are irrelevant.

Direct primary-page verification of the pinned WRC 537 source is not available in the current connected repository environment. Therefore this increment retains the existing mechanics unchanged and keeps attachment-class semantics source-gated.

## Current standard eight-point route

The bounded cylindrical path remains based on:

```text
shellFamily = CYLINDRICAL
attachmentShape = ROUND
longitudinal-moment axis-of-symmetry curves = 1B / 2B
recovery = Au, Al, Bu, Bl, Cu, Cl, Du, Dl
```

The current adapter derives cylindrical `gamma` and `beta` from shell mean radius, shell thickness and attachment outside radius. It does **not** require:

```text
attachment wall thickness
SOLID / HOLLOW
RIGID / FLEXIBLE
nozzle flexibility parameter
```

This absence is a description of the current software interface only.

## Retained research versus authority

`docs/01_WRC537_METHOD_DEFINITION.md` is explicitly `NOT_READY_FOR_IMPLEMENTATION`. Its secondary/OCR research states that the solid/hollow distinction is dropped for cylindrical-shell attachments. That statement is useful as a primary-source extraction target, but it is not sufficient to authorize production semantics.

Accordingly the repository must not infer:

```text
field not used by current equations
        =>
field irrelevant to WRC applicability
```

or:

```text
attachmentShape = ROUND
        =>
all round attachments are source-qualified
```

## Separate off-axis boundary

The retained off-axis authority document records that `1B-1 / 2B-1` represent longitudinal-moment bending maxima away from the axes of symmetry and that their stated applicability is limited to a **round flexible-nozzle connection**.

That makes attachment class materially relevant to at least one WRC claim.

The off-axis comparison selector currently accepts:

```text
attachmentShape = ROUND
connectionFlexibility = FLEXIBLE_NOZZLE
applicabilitySourceRef = non-empty
```

but this remains a comparison-software gate, not a qualified engineering classifier. A caller-provided `FLEXIBLE_NOZZLE` string cannot establish actual nozzle flexibility.

## What remains unresolved for the standard Table-5 route

Primary-source verification must establish:

1. which round cylindrical attachment classes are covered by the standard shell-stress method;
2. whether solid and hollow attachments use identical standard cylindrical shell-stress equations/curves;
3. whether attachment wall thickness is genuinely absent from the standard method by source definition;
4. whether rigidity/flexibility changes any standard Table-5 curve/equation selection;
5. whether `ROUND` alone is sufficient physical applicability identity for the standard eight-point route;
6. exact meanings of `rigid attachment` and `flexible nozzle` wherever WRC uses those terms;
7. whether WRC gives a numerical classification rule or delegates classification to another source or engineering judgment;
8. reinforcement-pad, integrally reinforced, locally thickened, structural-attachment or other topology restrictions;
9. whether a lug or pad may ever be represented as the current round family;
10. what canonical source evidence must be retained so software can prove the applicable attachment class.

## Authority boundary

Until those items are directly source-qualified:

- do not widen the current bounded route to arbitrary round objects;
- do not claim primary-qualified solid/hollow equivalence;
- do not claim primary-qualified rigidity independence;
- do not invent attachment-flexibility criteria;
- do not apply the off-axis flexible-nozzle claim to rigid or unclassified attachments;
- do not use spherical-shell nozzle parameters such as spherical `gamma/rho` to classify cylindrical attachments;
- do not approximate structural lugs or pads as equivalent round nozzles.

The current standard eight-point comparison/qualification mechanics are not changed by this source-governance increment. Production/global/code/release authority remains false.

## Source custody

Pinned WRC source:

```text
docs/emp1/WRC537_2013.pdf
Git blob: ce861233928154145a9257efbbf8dbef3f5a17d1
raw SHA-256: 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
```

Direct binary-page re-observation is `NOT_RUN_EXECUTION_ENVIRONMENT` through the present connected repository interface.

## Current disposition

`BLOCKED_PRIMARY_SOURCE_ATTACHMENT_CLASS_UNRESOLVED`

A future production applicability increment is admissible only when repository evidence can answer:

> For this cylindrical round attachment, which source-defined attachment class applies, whether solid/hollow and rigidity/flexibility affect the selected WRC equations/curves, what geometry proves that class, and which WRC claims are invalid when that classification is absent?
