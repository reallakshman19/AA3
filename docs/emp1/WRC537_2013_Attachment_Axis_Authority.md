# WRC 537 2013 — Attachment Axis / Intersection Authority

## Status

`BLOCKED_PARTIAL_PRIMARY_SHELL_NORMAL_REFERENCE_AXIS_QUALIFIED_PHYSICAL_ATTACHMENT_AXIS_COINCIDENCE_AND_OBLIQUE_APPLICABILITY_UNRESOLVED`

This record now separates four facts that must not be conflated:

1. WRC 537 General Nomenclature defines its directional reference with respect to an **axis normal to the shell through the center of the attachment**;
2. for cylindrical shells, WRC then refers to longitudinal and circumferential directions with respect to the cylinder axis;
3. retained Table 5 pp.41–42 has an explicit cylindrical computation-sheet input inventory but no explicit intersection-angle or obliquity input;
4. current production code rejects supplied axis geometry that is not numerically orthogonal/radially collinear under its retained software custody.

Only items 1 and 2 advance the primary-source semantics in this leg. They qualify the **WRC shell-normal reference axis**. They do not prove that an arbitrary supplied nozzle/attachment centerline is physically coincident with that reference axis, and they do not authorize oblique/skewed attachments.

## Primary-source observation

Controlled source custody remains:

```text
document path  docs/emp1/WRC537_2013.pdf
Git blob       ce861233928154145a9257efbbf8dbef3f5a17d1
raw SHA-256    698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
```

Direct page observation of the pinned PDF remains:

`NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT`

A readable external primary rendering was independently inspected at:

`https://studylib.net/doc/27776645/wrc-537`

The observed WRC 537 General Nomenclature text states that, for the relevant directional notation, the reference is an axis normal to the shell through the center of the attachment. It then states that cylindrical-shell directions are longitudinal and circumferential with respect to the cylinder axis.

External-rendering byte identity to the controlled pinned PDF remains:

`UNPROVEN`

Therefore the qualified claim is deliberately narrow:

```text
WRC reference axis = shell-normal axis through attachment center
```

The following stronger claim is **not** established:

```text
arbitrary supplied nozzle/attachment centerline
  = WRC shell-normal reference axis
```

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

This remains **explicit input-content evidence only**. Silence does not mean either:

```text
no angle field => any angle is valid
```

or:

```text
no angle field => physical attachment centerline coincidence is proven
```

Table-5 field absence is not the source proof for the shell-normal reference axis; the General Nomenclature statement is.

## Current production geometry custody

`src/core/emp1/emp1-wrc537-cylindrical-frame.js` rejects when:

```text
abs(dot(eLong,eP)) > 1e-10
```

with diagnostic `EMP1_WRC537_FRAME_NON_ORTHOGONAL`.

`1e-10` is floating-point equivalence to mathematical perpendicularity only. It is not an engineering angular allowance.

The qualified production axis-authority path in:

`src/core/emp1/emp1-wrc537-cylindrical-axis-authority.js`

also derives `+P` from the selected load source-to-target vector and requires that vector to be orthogonal to the vessel longitudinal direction and collinear with retained radial evidence.

That is stronger software geometry custody than a bare vector check, but it is still not primary proof that the real physical attachment/nozzle axis is coincident with the WRC shell-normal reference axis.

## Current bounded-route state

The bounded gamma=5 route remains separately authorized in production. That current route state does **not** close this source gate.

Therefore all of these statements remain simultaneously true:

```text
bounded route authorized                         = true
WRC shell-normal reference-axis wording qualified = true
physical attachment-axis coincidence qualified    = false
oblique/skewed applicability authorized            = false
```

## Authority distinction

Four questions remain separate:

1. What reference axis does WRC use?  
   **Qualified here:** an axis normal to the shell through the attachment center.
2. Are supplied software vectors numerically orthogonal/radially collinear?  
   **Implemented fail-closed guard/custody.**
3. Is the real physical attachment/nozzle centerline proven to coincide with the WRC shell-normal reference axis at the attachment station?  
   **Unresolved.**
4. Does WRC permit a skewed/oblique attachment, and if so within what angular/eccentricity domain?  
   **Not authorized / unresolved.**

The reference-axis statement must not be promoted into answers 3 or 4.

## Prohibited behavior

Until the remaining source/applicability closure exists:

- no oblique-to-radial projection;
- no equivalent-perpendicular surrogate;
- no engineering angular allowance inferred from `1e-10`;
- no physical-normality claim from centerline orthogonality alone;
- no physical attachment-axis coincidence inferred solely from the WRC reference-axis wording;
- no oblique/skewed applicability inferred from the WRC reference-axis wording;
- no oblique production route;
- no applicability inference from Table-5 angle-field absence.

## Required remaining closure

Direct source/geometry review must still establish:

- physical attachment/nozzle axis coincidence with the WRC shell-normal reference axis;
- local-normal construction at the actual cylindrical/spherical attachment station;
- authoritative attachment-station geometry custody;
- any angular domain or exact-perpendicular rule applicable to the physical attachment;
- eccentricity/offset treatment;
- load-reference translation compatibility;
- explicit disposition of oblique/skewed geometry.

This source-governance increment changes no production evaluator, route registry, tolerance, benchmark/oracle, release profile, workflow, UI or deployment authority.
