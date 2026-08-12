# M047 BM4_L static friction stiffness unit contract — F1.6

## Mission

Remove the friction-stiffness unit ambiguity before any BM4_L positive-friction case can execute, and validate the resolved stiffness against an independent CAESAR II example on the same product build.

This batch does **not** solve L13 or L7 and does not alter comparator tolerances, linear BM4_L mechanics, CAESAR reference data, the friction coefficient, or any contact/state-history rule.

## Stack

- Base PR: #1052 — friction authority closure (F1.5).
- Exact base SHA: `2c8f61b503b2192324f17c4ffbd8ad1b0ef06552`.
- Head branch: `agent/m047-bm4l-friction-unit-contract`.

Future qualified friction work should stack on this PR.

## Correct static configuration authority

Official Hexagon CAESAR II friction guidance documents the static **Friction Stiffness** default as:

```text
1,000,000 lb/in
```

It is therefore normalized explicitly to the LFEA SI kernel as:

```text
1,000,000 lb/in
× 4.4482216152605 N/lb
÷ 0.0254 m/in
= 175,126,835.24647635 N/m
```

The model InputXML display-unit block for BM4_L is N/mm, but those model display units do **not** override the documented source unit of this CAESAR static configuration value.

The pre-existing BM4_L profile stores `FRICT_STIF=1,000,000` with the label `DISPLAYED_CAESAR_UNITS`. That label is too ambiguous for nonlinear integration and is not interpreted as `1,000,000 N/mm` by this work.

### Correction made during this batch

An initial F1.6 draft interpreted the profile value through the BM4_L N/mm display system, which would have produced `1.0e9 N/m`. Independent product screening immediately contradicted that interpretation. The branch was corrected **before any L13/L7 production mechanics consumed it**.

The governed value on this branch is now only:

```text
175,126,835.24647635 N/m
```

## Independent product validation — BM1

Pinned Common source:

```text
repository: reallaksh19/Common
commit:     179c4831cf521cf797c13699cfbbd118315c9244
input:      LFEA/BM1/BM1_InputXML.xml
input blob: ee88921c4ad80f0265fbed61336b1c896c15f9fa
output:     LFEA/BM1/BM1_CIIOutput.xml
output blob:caa9645ba59e5106ee4243f41a2edf2d81b6e17e
CAESAR:     14.00.00.0910 Build 231113
```

BM1 contains two positive-friction +Y supports, nodes 70 and 80, both with `mu=0.3` and no positive-gap companions at those sites.

For CASE 4 `(SUS) W+P1+H`, the CAESAR output gives tangential reaction/displacement pairs whose secant stiffnesses are:

```text
node 70: 175,118,536.918 N/m  (-0.00474% vs documented default)
node 80: 175,144,038.701 N/m  (+0.00982% vs documented default)
```

Both independently reproduce `1,000,000 lb/in = 175,126,835.246 N/m` within 0.01%. BM4_L response rows are not used in this validation.

This product observation also demonstrates why the profile's ambiguous unit label must not be interpreted from the model's N/mm display units.

## Generic unit contract

`caesar-friction-unit-contract.js` now:

- parses model InputXML force/length display units for custody and diagnostics;
- converts explicit force/length stiffness units to `N/m`;
- normalizes CAESAR static friction stiffness only when its **source unit is explicitly supplied**;
- rejects ambiguous labels such as `DISPLAYED_CAESAR_UNITS`;
- never infers the static friction configuration unit from the model InputXML display units.

## Readiness hardening

Positive-friction execution requires `frictionStiffness` to be:

```text
status = RESOLVED
value  > 0
unit   = N/m
```

Otherwise the gate emits:

```text
FRICTION_STIFFNESS_UNIT_NORMALIZATION_REQUIRED
```

The zero-friction route still returns before nonlinear authority inspection, preserving L2/L3/L4/L5/L6 on the qualified linear path.

The BM4_L readiness snapshot now pins:

```text
source: 1,000,000 lb/in
SI:     175,126,835.24647635 N/m
```

L7/L13 remain blocked only by the same three unresolved authorities:

```text
FRICTION_SLIDE_MULTIPLIER_AUTHORITY_REQUIRED
FRICTION_STATE_HISTORY_SEMANTICS_AUTHORITY_REQUIRED
GAP_CONTACT_STATE_SEMANTICS_AUTHORITY_REQUIRED
```

## Qualification

Focused Node qualification covers:

- `1,000,000 lb/in -> 175,126,835.24647635 N/m`;
- generic `N/m`, `N/cm`, `N/mm`, and `lb/in` conversions;
- model InputXML display-unit parsing without configuration-unit inference;
- fail-closed rejection of `DISPLAYED_CAESAR_UNITS`;
- both independent BM1 stiffness observations within 0.02% of the documented value;
- readiness rejection of resolved-but-unitless friction stiffness;
- exact zero-friction linear bypass;
- unchanged L7/L13 three-blocker state.

An optional `--inputxml <path>` replay verifies only the exact BM4_L model display units when the Common source is locally mounted; it does not use those units to determine static friction stiffness.

## Decision

**F1.6 COMPLETE — STATIC FRICTION STIFFNESS SOURCE UNIT RESOLVED AND PRODUCT-VALIDATED; PRODUCTION FRICTION STILL BLOCKED.**

The correct governed static stiffness is `175,126,835.24647635 N/m`. The earlier `1.0e9 N/m` draft interpretation was removed before nonlinear integration.

Next safe improvement is independent product/micro-model authority for Slide Multiplier, state-history update ordering, and gap/contact semantics. No BM4_L response fitting is authorized.

## Non-scope

No PR #1001 modification, no Issue #991 change, no L13/L7 solve, no Slide Multiplier assumption, no contact-state fitting, no comparator/tolerance change, no merge, and no ready-for-review transition.
