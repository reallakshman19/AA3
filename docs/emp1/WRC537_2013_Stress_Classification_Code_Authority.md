# WRC 537 2013 — Stress Classification and Code-Acceptance Authority Boundary

## Status

`BLOCKED_CODE_CLASSIFICATION_AND_ACCEPTANCE_AUTHORITY_UNQUALIFIED`

This record freezes the boundary between the WRC 537 shell-stress calculation and any downstream code assessment. It does **not** create an ASME stress-classification or allowable-stress evaluator.

## Current qualified calculation meaning

The current cylindrical Table-5 implementation returns stresses for the **host cylindrical shell at the attachment-shell juncture** at the eight retained WRC recovery points:

`Au, Al, Bu, Bl, Cu, Cl, Du, Dl`.

It calculates circumferential, longitudinal and shear shell stresses and forms a plane-stress Tresca stress-intensity quantity at those evaluated points. The retained extrema contract states that only the eight-point envelope is evaluated and that an absolute shell maximum is not assured.

These quantities are calculation outputs. They are not, by themselves, a code acceptance result.

## Four separate authorities

The repository shall keep these authorities separate:

1. **WRC elastic shell-stress calculation** — a numerical method/result authority within its separately qualified scope.
2. **Code stress classification** — assignment to a governing-code category such as primary/secondary/peak or another code-defined class.
3. **Allowable/compliance assessment** — comparison under a pinned code edition, service condition, allowable basis and combination rule.
4. **Release/approval** — project or organizational approval after all required engineering checks.

The governing rule is:

`AUTHORITY_FOR_WRC_STRESS_CALCULATION_DOES_NOT_IMPLY_CODE_CLASSIFICATION_COMPLIANCE_OR_RELEASE`

## Why component labels are insufficient

WRC expressions distinguish membrane and bending portions of local shell response. Those mathematical labels do not automatically establish an ASME primary-membrane, primary-bending, secondary, peak or fatigue category. Code classification can depend on the load origin, structural discontinuity, self-limiting behavior, pressure contribution, service condition and the governing design code—not merely on whether a term is named `membrane` or `bending` inside the WRC equations.

Likewise, the WRC `stressIntensity` calculation is a stress quantity. The word *intensity* is not an automatic allowable or pass/fail rule.

## Current retained source state

The controlled WRC 2013 source package is pinned by raw PDF SHA-256:

`698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`

The legacy extraction `docs/01_WRC537_METHOD_DEFINITION.md` is explicitly `NOT_READY_FOR_IMPLEMENTATION` and records that stress acceptability remains the responsibility of the designer/governing code. That extraction is useful for identifying the boundary, but direct primary-page re-observation is not available in the connected GitHub environment. Therefore the exact source locator and any detailed stress-category semantics remain unresolved.

## Required primary-source closure

Before any downstream code assessment is authorized, source qualification must establish at minimum:

- the exact WRC statement delimiting calculation from acceptability;
- whether WRC assigns any shell result to a code stress category;
- whether pressure stress must be combined before classification and under what separate authority;
- whether Appendix-B `Kn/Kb` changes only magnitude or also affects downstream category treatment;
- the selected governing code and edition;
- the applicable service/load condition;
- the exact stress-classification and combination rule;
- the allowable/design-stress basis;
- the evidence/hash relationship tying the WRC result to the downstream code assessment.

If any of these are missing, code assessment remains fail-closed.

## Prohibited shortcuts

Do not:

- label successful WRC evaluation as `CODE PASS`;
- infer primary/secondary/peak category solely from WRC component names;
- compare the WRC eight-point envelope with a generic allowable and call the result code compliant;
- import B31.3 piping stress allowables into vessel-shell WRC acceptance by default;
- treat a stress-intensity value as a compliance ratio without a separate governing-code rule;
- infer release approval from a code calculation;
- use code acceptance logic to widen the WRC numerical domain, gamma/beta limits, pressure treatment, SCF authority, off-axis authority or global-maximum claim.

## Fail-closed product truth

Until a separate code-assessment method is source-qualified:

- WRC calculation authority may exist only within its separately qualified numerical/applicability scope;
- `codeStressClassificationAuthority = false`;
- `allowableComparisonAuthority = false`;
- `codeComplianceAuthority = false`;
- `releaseAuthority = false`.

This source-governance increment changes no production evaluator, route registry, UI, workflow, tolerance, oracle, gamma/beta, pressure, SCF, material or release mechanics.
