# WRC 537 2013 — Attachment Axis / Intersection Authority

## Status

**BLOCKED — PRIMARY PHYSICAL INTERSECTION/NORMALITY RULE NOT DIRECTLY VERIFIED**

This record now retains two separate facts that must not be conflated:

1. retained Table 5 pp.41–42 has an explicit cylindrical computation-sheet input inventory with loads, `T/r0/Rm`, `gamma/beta`, and `Kn/Kb`, but no explicit intersection-angle or obliquity input;
2. the current production frame rejects non-orthogonal supplied vessel/nozzle centerlines.

Neither fact proves the physical attachment axis is the shell normal at the actual attachment station, nor that WRC permits arbitrary obliquity.

## Retained Table-5 evidence

Source transcription:

```text
docs/emp1/WRC537_2013_Tables_and_Charts.md
Table 5, pp.41–42
```

The explicit computation-sheet inputs are:

```text
loads      P, Mc, Ml, Mt, Vc, Vl
geometry   T, r0, Rm
parameters gamma, beta
SCF        Kn, Kb
```

No explicit intersection-angle, skew-angle or obliquity input appears in that retained Table-5 sheet.

This is qualified only as **explicit input-content evidence**. Silence does not mean:

```text
no angle field
  => any angle is valid
```

and it also does not prove:

```text
no angle field
  => exact perpendicularity is required
```

The source applicability rule still requires direct primary closure.

## Current production guard

`src/core/emp1/emp1-wrc537-cylindrical-frame.js` rejects when:

```text
abs(dot(eLong,eP)) > 1e-10
```

with diagnostic `EMP1_WRC537_FRAME_NON_ORTHOGONAL`.

`1e-10` is floating-point equivalence to mathematical perpendicularity only. It is not an engineering angular allowance.

## Current bounded-route state

The bounded gamma=5 route is currently authorized in production following the separately retained owner workflow-skip authorization path. That current route state does **not** close this source gate.

Therefore both statements are true:

```text
bounded route authorized = true
physical attachment-normality source authority = false
```

This distinction must remain machine-visible.

## Authority distinction

Three questions remain separate:

1. Are two supplied vectors numerically orthogonal?
2. Is the physical attachment axis actually normal/radial to the host shell at the attachment station?
3. Does WRC 537 permit oblique/skewed geometry?

The current frame proves only item 1. Retained Table 5 proves only its explicit input inventory. Items 2 and 3 remain source/applicability questions.

## Prohibited behavior

Until direct primary-source closure:

- no oblique-to-radial projection;
- no equivalent-perpendicular surrogate;
- no engineering angular allowance inferred from `1e-10`;
- no physical-normality claim from centerline orthogonality alone;
- no oblique production route;
- no applicability inference from Table-5 angle-field absence.

## Required closure

Direct source review must establish the exact normal/radial/perpendicular requirement, local-normal construction, any angular domain/tolerance, eccentricity/offset rules, attachment-station evidence, load-reference compatibility, and oblique-geometry disposition.

Current disposition remains:

`BLOCKED_PRIMARY_INTERSECTION_RULE_NOT_DIRECTLY_VERIFIED`
