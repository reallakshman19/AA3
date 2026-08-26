# WRC 537 cylindrical physical-applicability authority — combined #1368/#1370/#1373 reconciliation

## Decision

The repository now has one combined physical-applicability truth for the bounded cylindrical WRC route.

The route is currently executable/authorized under the separately retained owner workflow-skip authorization, but professional physical applicability remains source-gated in three independent dimensions:

```text
attachment axis / physical normality     BLOCKED
attachment class / rigidity              BLOCKED
nearby attachment / discontinuity isolation BLOCKED
```

Route authorization must not be back-propagated into those missing source semantics.

## What retained Table 5 explicitly contains

`docs/emp1/WRC537_2013_Tables_and_Charts.md`, Table 5 pp.41–42, explicitly exposes:

```text
loads      P, Mc, Ml, Mt, Vc, Vl
geometry   T, r0, Rm
parameters gamma, beta
SCF        Kn, Kb
```

Within that retained computation sheet there is no explicit:

```text
intersection/skew angle
attachment wall thickness
SOLID/HOLLOW selector
RIGID/FLEXIBLE selector
neighbor attachment geometry
neighbor spacing
interaction correction
```

These absences are source-content facts only. They do not prove physical irrelevance.

The governing anti-inference rule is:

```text
field absent from Table 5
  != source authorization to ignore the physical property
```

## #1368 — attachment axis / physical normality

Current software rejects non-orthogonal supplied vessel/nozzle centerlines using a `1e-10` numerical tolerance. This remains a mathematical frame guard, not a source-qualified proof that the physical attachment axis coincides with the shell normal at the attachment station.

Table-5 angle-field absence neither proves exact perpendicularity nor authorizes arbitrary angle.

Still required: direct source normal/radial/perpendicular wording, local-normal construction, angular/eccentricity rules and oblique disposition.

## #1370 — attachment class / rigidity

Table 5 explicitly uses attachment radius `r0` and has no explicit wall-thickness or solid/hollow/rigid/flexible selector.

That does not establish standard-route solid/hollow equivalence or rigidity independence.

A separate retained source boundary states that off-axis `1B-1/2B-1` applicability is limited to a **round flexible-nozzle connection**, demonstrating that attachment class is material to at least one WRC claim while leaving the physical classifier unresolved.

## #1373 — interaction / isolation

Table 5 has no explicit neighbor geometry, spacing or interaction-correction input.

Existing qualified WRC §4.5 rules remain unchanged:

```text
P active         -> l >= Rm
Mc or Ml active  -> nearest cylinder-end distance >= 0.5*Rm
```

Those rules are not a general isolation proof for other nozzles, lugs, supports, pads, stiffeners, transitions or local thickness discontinuities.

Missing neighbor input cannot be interpreted as noninteraction, and independently calculated overlapping WRC local fields may not be superposed without separate authority.

## Current route state versus professional source state

Current main intentionally contains this split:

```text
bounded gamma5/zero-dp route authorized  = true
bounded engineering/production use       = true
global EMP.1.C authority                  = false
code compliance                           = false
professional release ready                = false

physical normality source gate            = false
attachment-class source gate              = false
interaction/isolation source gate         = false
```

This is not a contradiction. It records the owner-authorized bounded calculation state while preserving the outstanding professional source debts.

## No collateral mutation

This batch changes no:

- production WRC calculation;
- route or registry boolean;
- load mapping;
- Table-5 coefficients/sign arrays;
- gamma/beta domain;
- pressure/SCF authority;
- exact-head oracle/tolerance evidence;
- aggregate P0 release gate;
- code/global/release authority;
- workflow.

## Source custody

```text
WRC PDF: docs/emp1/WRC537_2013.pdf
Git blob: ce861233928154145a9257efbbf8dbef3f5a17d1
raw SHA-256: 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
retained Table 5: docs/emp1/WRC537_2013_Tables_and_Charts.md pp.41–42
direct PDF page re-observation: NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT
```

## Professional disposition

The combined batch may be considered source-governance reconciled when its checker proves the three issue ledgers agree with this aggregate state. It must **not** be called physical-applicability PASS.

Current aggregate status:

`BLOCKED_PHYSICAL_APPLICABILITY_SOURCE_GATES_REMAIN_OPEN`
