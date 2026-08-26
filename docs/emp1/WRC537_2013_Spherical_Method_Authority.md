# WRC 537 2013 — Spherical Method Authority

## Status

**BLOCKED — PRIMARY SPHERICAL METHOD PAGES NOT DIRECTLY VERIFIED**

This record separates the WRC 537 spherical-shell method family from the currently bounded cylindrical EMP.1.C route. It does not authorize spherical calculations.

## Controlled source custody

- Primary file: `docs/emp1/WRC537_2013.pdf`
- Git blob: `ce861233928154145a9257efbbf8dbef3f5a17d1`
- Governed raw PDF SHA-256: `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`
- Current connector result: the file is resolved, but base64 content is empty.
- Direct spherical page inspection: `NOT_RUN_EXECUTION_ENVIRONMENT`.

The source file's presence and digest custody do not make unrendered equations or charts implementation authority.

## Retained secondary extraction

`docs/01_WRC537_METHOD_DEFINITION.md` is explicitly marked `NOT_READY_FOR_IMPLEMENTATION`. It was assembled from publicly accessible OCR/secondary material and says unresolved data must be verified against the licensed PDF.

That extraction identifies the following **candidate** spherical semantics only:

- spherical-shell mean radius `Rm` and shell thickness `T`;
- attachment outside radius `r0`;
- hollow-attachment mean radius `rm` and thickness `t`;
- candidate spherical shell parameter `U = r0/sqrt(Rm*T)`;
- candidate hollow-attachment parameter `gamma = rm/t`;
- candidate hollow-attachment parameter `rho = T/t`;
- candidate round hollow, round solid, square hollow and square solid attachment families;
- candidate spherical/hemispherical and approximate ellipsoidal-host applicability statements.

None of these candidate equations, ranges, configuration statements or approximation rules is promoted by this PR.

## Critical semantic separation

The same symbol can have a different meaning in another WRC family. Therefore spherical and cylindrical semantics must remain independent.

The spherical candidate `gamma = rm/t` must not be confused with the cylindrical shell parameter used by the bounded cylindrical route. Likewise, no cylindrical `beta`, Table-5 curve identity, gamma=5 oracle, qualification hash or cylindrical coefficient row may be reused for a spherical calculation merely because the source is WRC 537.

## Required primary-source closure

Before any spherical hand calculation or production implementation, another engineer must be able to reconstruct from direct primary-source evidence:

1. supported spherical/hemispherical/head geometries;
2. exact mean-radius and thickness definitions;
3. supported solid/hollow/round/square attachment configurations;
4. every dimensionless parameter equation and domain, including endpoint inclusivity;
5. load axes, positive directions and reference point;
6. governing equations for every force and moment component;
7. complete curve/table/coefficient inventory and source precision;
8. interpolation/extrapolation rules;
9. membrane, bending and shear stress definitions;
10. inside/outside surfaces and recovery locations;
11. sign reconstruction and load superposition;
12. pressure and pressure-thrust treatment;
13. host-shell versus attachment/nozzle stress boundary;
14. Appendix-B SCF applicability, if any;
15. at least one primary/reference numerical example suitable for independent reproduction.

Any unresolved item keeps spherical engineering and production authority false.

## Current authority

- spherical source-family identity: **candidate / research only**;
- direct primary spherical verification: **false**;
- independent spherical hand calculation: **not authorized**;
- spherical production evaluator: **not authorized**;
- spherical route registration: **not authorized**;
- global EMP.1.C / code / release authority: **unchanged and false**.

## Next valid increment

Render/read the exact spherical-method pages from the pinned PDF, retain page-level locators and independently review all consumed equations/data. Only then may a separate hand-calculation qualification be proposed. Production implementation must remain a later increment.
