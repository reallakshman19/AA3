# WRC 537 cylindrical attachment-class authority — EMP1-30

## Status

`BLOCKED_PRIMARY_SOURCE_ATTACHMENT_CLASS_UNRESOLVED`

The current bounded cylindrical route is production-authorized under the separately retained owner workflow-skip path, but that does **not** mean WRC attachment-class applicability has been source-qualified.

## Retained Table-5 evidence

Retained WRC Table 5 pp.41–42 explicitly lists the standard cylindrical computation-sheet inputs.

For attachment geometry, the sheet exposes:

```text
Attachment Radius r0
```

It does not expose an explicit:

```text
attachment wall thickness
SOLID / HOLLOW selector
RIGID / FLEXIBLE selector
nozzle flexibility parameter
```

This is qualified only as **explicit input-content evidence**. It proves what the retained computation sheet explicitly asks for; it does not prove why those fields are absent or that every physical attachment class is equivalent.

Forbidden inference:

```text
field absent from Table 5
  => field physically irrelevant to WRC applicability
```

## Current standard eight-point route

The bounded path remains:

```text
shellFamily = CYLINDRICAL
attachmentShape = ROUND
longitudinal moment = 1B / 2B
recovery = Au, Al, Bu, Bl, Cu, Cl, Du, Dl
```

The current adapter similarly does not request attachment wall thickness or a solid/hollow/rigid/flexible class. That software-interface fact is consistent with the Table-5 explicit input inventory, but it is not an independent applicability proof.

## Distinct off-axis class restriction

Retained off-axis source authority separately states that `1B-1 / 2B-1` applicability is limited to a **round flexible-nozzle connection**.

That is material evidence that attachment class matters to at least some WRC claims. It does not provide a general source-qualified definition or threshold for `FLEXIBLE_NOZZLE`, and it must not be imported into the standard 1B/2B eight-point route as a generic classifier.

## What remains blocked

Direct source closure must still establish:

1. the exact attachment classes covered by the standard cylindrical Table-5 route;
2. whether solid and hollow round attachments are equivalent for standard host-shell stress calculation;
3. whether rigidity/flexibility affects standard curves;
4. whether attachment wall thickness is absent by source design or merely not an explicit computation-sheet input;
5. exact definitions/criteria for rigid attachment and flexible nozzle;
6. reinforcement/integral/local-thickening restrictions;
7. whether structural lugs/pads can belong to this family;
8. source evidence the canonical model must retain to prove class.

## Current route versus source-gate truth

Both statements are intentionally retained:

```text
bounded route production authorization = true
attachment-class primary-source authority = false
```

Route authorization cannot be back-propagated into missing source semantics.

## Prohibitions

- do not widen the route to arbitrary round objects;
- do not claim solid/hollow equivalence from Table-5 silence;
- do not claim rigidity independence from Table-5 silence;
- do not invent a flexibility threshold;
- do not apply off-axis flexible-nozzle semantics to rigid/unclassified attachments;
- do not import spherical attachment parameters;
- do not represent lugs/pads as equivalent round attachments.

## Source custody

```text
docs/emp1/WRC537_2013.pdf
Git blob: ce861233928154145a9257efbbf8dbef3f5a17d1
raw SHA-256: 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
retained Table 5: docs/emp1/WRC537_2013_Tables_and_Charts.md, pp.41–42
direct PDF re-observation: NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT
```

No production numerical or route-registry mutation is made by this source batch.
