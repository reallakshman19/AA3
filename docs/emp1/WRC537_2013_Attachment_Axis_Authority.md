# WRC 537 2013 — Attachment Axis / Intersection Authority

## Status

**BLOCKED — PRIMARY INTERSECTION-ANGLE RULE NOT DIRECTLY VERIFIED**

The current cylindrical WRC frame rejects non-orthogonal supplied vessel/nozzle centerlines. That is useful fail-closed behavior, but it is not by itself proof that the physical attachment axis is the shell normal at the actual attachment station.

## Current production guard

`src/core/emp1/emp1-wrc537-cylindrical-frame.js` normalizes the vessel and nozzle centerlines and rejects the input when:

`abs(dot(eLong,eP)) > 1e-10`

with diagnostic `EMP1_WRC537_FRAME_NON_ORTHOGONAL`.

The `1e-10` value is treated here only as floating-point equivalence to mathematical perpendicularity. It is **not** an engineering angular allowance and must not be widened on engineering judgment without primary-source authority.

## Source custody

- Primary file: `docs/emp1/WRC537_2013.pdf`
- Git blob: `ce861233928154145a9257efbbf8dbef3f5a17d1`
- governed raw SHA-256: `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`
- direct page inspection in current connector: `NOT_RUN_EXECUTION_ENVIRONMENT`

The retained research extraction `docs/01_WRC537_METHOD_DEFINITION.md` is explicitly `NOT_READY_FOR_IMPLEMENTATION` and records only a secondary/OCR candidate statement that the attachment/nozzle axis is radial/perpendicular to the vessel.

## Authority distinction

Three different questions must remain separate:

1. Are two supplied vectors numerically orthogonal?
2. Is the physical attachment axis actually normal to the host-shell surface at the source-qualified attachment station?
3. Does WRC 537 permit any oblique/skewed intersection?

The current frame proves only item 1. Items 2 and 3 remain source/applicability questions.

For a cylindrical shell, perpendicularity to the vessel centerline does not by itself prove the nozzle axis passes through the local radial direction at the attachment station. For a spherical shell, the local normal construction must likewise be tied to the shell center/station geometry. Those physical geometry semantics must be source-qualified before being used as WRC applicability evidence.

## Prohibited behavior

Until primary-source closure:

- do not project an oblique attachment onto a radial equivalent;
- do not rotate geometry into a perpendicular surrogate and continue silently;
- do not interpret `1e-10` as a source-permitted angular deviation;
- do not claim shell-normal physical geometry from centerline orthogonality alone;
- do not authorize an oblique/skewed WRC route.

## Required closure

Direct primary-source review must establish the exact radial/normal/perpendicular requirement, shell-family-specific normal construction, any angular domain/tolerance, eccentricity/offset rules, attachment-station geometry evidence, load-reference compatibility and the required disposition for oblique geometry.

Until that is complete, the current non-orthogonal vector rejection remains in force and oblique production authority remains false.
