# WRC 537 host-shell versus attachment/nozzle stress authority

## Decision

The current EMP.1 WRC 537 cylindrical route is authorized only to represent the host cylindrical-shell stress quantities covered by the qualified WRC 537 source interpretation. It must not be represented as a nozzle-wall, attachment-wall, nozzle-neck, weld, reinforcement-pad, or other attachment-component stress calculation.

The retained WRC 537 §4.5.3 authority states that the calculated stresses are host cylindrical-shell stresses at the attachment-shell juncture. That result-domain statement remains unchanged by this increment.

## Separate-method boundary

A nozzle/attachment-stress method is a separate engineering method and requires separate source and numerical qualification. WRC 297 may be a candidate method family, but the present repository does not contain a source-qualified WRC 297 technical package sufficient to authorize implementation.

Accordingly:

- WRC 537 Table-5 shell stresses may not be relabeled as nozzle/attachment stresses;
- WRC 537 shell stresses may not be transformed into a WRC 297 result by an inferred conversion;
- Appendix-B stress-concentration factors do not by themselves create nozzle/attachment-stress authority;
- public descriptions of WRC 297 do not constitute technical implementation authority;
- code-compliance and release acceptance remain separate from calculation-method authority.

## Minimum future WRC 297 / attachment-method package

Before any separate nozzle/attachment calculation is implemented, retain and independently qualify at minimum:

1. exact publication identity, edition/revision and authorized technical-source digest;
2. complete geometry and symbol definitions;
3. host shell, nozzle/attachment and reinforcement applicability definitions;
4. complete external-load convention and load-reference point;
5. all governing nondimensional parameters and inclusive/exclusive limits;
6. governing equations, coefficient data and source precision;
7. interpolation/extrapolation rules;
8. stress quantities, signs, surfaces and physical recovery locations;
9. load superposition and pressure treatment;
10. exclusions and method-selection boundaries versus WRC 537;
11. published/reference numerical cases;
12. independent hand calculations and falsifiers frozen before production observation.

## Current authority state

`wrc537HostShellScopeBoundaryQualified = true`

`nozzleAttachmentStressAuthority = false`

`wrc297EngineeringAuthority = false`

`codeComplianceAuthorized = false`

`releaseQualified = false`

No production evaluator, route registry, UI, workflow, coefficient, tolerance, pressure, gamma/beta, SCF or off-axis/global-maximum behavior is changed by this source-governance increment.
