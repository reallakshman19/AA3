# WRC 537 nearby-attachment / local-discontinuity interaction authority — EMP1-31

## Status

`BLOCKED_PARTIAL_PRIMARY_STRESS_ATTENUATION_AND_IDEALIZED_CASE_LIMITATION_QUALIFIED_NEIGHBOR_SPACING_AND_INTERACTION_AUTHORITY_UNRESOLVED`

The bounded route remains production-authorized through a separately retained owner override. This source increment does **not** authorize claims that nearby attachments or local shell discontinuities are non-interacting.

## Newly qualified primary-source boundary

Readable WRC 537 (2013) primary-document text directly supports two bounded observations for cylindrical shells.

### 1. Qualitative attenuation away from the juncture

In the Section 4.1 discussion immediately before Section 4.2, WRC reports PVRC test work showing that shell stresses attenuate rapidly at points removed from the attachment-to-shell juncture and that the maximum is usually at the juncture.

Qualified conclusion:

`QUALITATIVE_LOCAL_STRESS_ATTENUATION_AWAY_FROM_ATTACHMENT_JUNCTURE_OBSERVED`

This is **qualitative only**. It supplies no numerical decay law, characteristic distance, center-to-center limit, edge-to-edge limit, `Rm`/`T`/`r0` normalization, beta threshold, or endpoint inclusivity.

Therefore the following inference remains forbidden:

```text
rapid attenuation
  => nearby attachment is non-interacting
  => independent WRC evaluation is automatically valid
```

### 2. Idealized-case applicability warning

Section 4.5 states that relatively large attachments, or situations that depart considerably from the idealized cases presented, require review of Appendix A.3 and the original references to establish the limitations of applicability.

Qualified conclusion:

`SUBSTANTIALLY_NONIDEAL_CASES_REQUIRE_DEEPER_SOURCE_APPLICABILITY_REVIEW`

This is an applicability warning and source-review direction. It is **not** an automatic FEA mandate, interaction correction, or neighbor-spacing rule.

## Retained Table-5 evidence

Retained Table 5 pp.41–42 explicitly lists the standard cylindrical computation-sheet loads, shell/attachment geometry, nondimensional parameters and SCFs.

It does not expose an explicit:

```text
neighbor attachment geometry
local-discontinuity inventory
neighbor spacing
interaction correction
```

This remains qualified only as **explicit input-content evidence**. It does not prove isolation or noninteraction.

Forbidden inference:

```text
no neighbor field in Table 5
  => neighboring stress fields are negligible
```

## Existing WRC §4.5 authority remains intact

Current retained/implemented rules remain:

```text
P active         -> cylinder length l >= Rm
Mc or Ml active  -> nearest cylinder end distance >= 0.5*Rm
```

This batch does not alter those checks.

Critically:

```text
§4.5 end-distance checks pass
  != proof of attachment-to-attachment noninteraction
  != proof of distance from all local discontinuities
```

## What remains unresolved

WRC text observed in this increment does not establish:

1. a quantitative neighbor center-to-center or edge-to-edge separation criterion;
2. the dimensional basis or inclusivity of any such criterion;
3. load-family dependence for `P`, `Vc`, `Vl`, `Mc`, `Ml`, or `Mt`;
4. whether circumferential versus longitudinal neighbor alignment changes interaction authority;
5. rules for common reinforcement, pads, supports, lugs, stiffeners or local thickness transitions;
6. a rule proving two independently evaluated WRC attachment stress fields are non-interacting;
7. authority to linearly superpose overlapping independent WRC solutions at one physical location;
8. an interaction correction;
9. an automatic requirement to switch to FEA or another method when proximity cannot be qualified;
10. canonical production geometry evidence sufficient to prove isolation.

## Current route capability

The production source model still does not retain a complete inventory of neighboring nozzles, lugs, pads, supports, stiffeners, common reinforcement regions, shell-to-head/cone transitions, local thickness steps or other local discontinuities. There is no source-qualified interaction correction or spacing evaluator.

The current route can therefore remain authorized for its bounded historical calculation path while this professional source gate remains blocked-partial. Route authorization must not be interpreted as source closure.

## Independent WRC results are not automatically superposable

If local stress fields overlap, independent single-attachment evaluations do not by themselves establish that combining those independently calculated shell stresses represents a valid common physical stress field.

Qualitative attenuation does not close that gap. A source-qualified isolation rule, interaction correction, or separately justified alternative analysis method is still required before such a claim can be made.

## Source custody

```text
docs/emp1/WRC537_2013.pdf
Git blob: ce861233928154145a9257efbbf8dbef3f5a17d1
raw SHA-256: 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
retained Table 5: docs/emp1/WRC537_2013_Tables_and_Charts.md, pp.41–42
external readable rendering text observation: PASS_TEXT_OBSERVED
external-rendering byte identity to pinned PDF: UNPROVEN
direct pinned-PDF page re-observation: NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT
```

## Authority effect

No production numerical, applicability, geometry-evidence, interaction-model, route/registry, gamma/beta, pressure, SCF, off-axis, code-compliance, release or deployment authority is changed by this source increment.
