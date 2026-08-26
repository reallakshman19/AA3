# WRC 537 nearby-attachment / local-discontinuity interaction authority — EMP1-31

## Status

`BLOCKED_NEARBY_ATTACHMENT_INTERACTION_AUTHORITY_UNRESOLVED`

The bounded route is currently production-authorized through a separately retained owner override. It still does **not** have source-qualified authority to claim that nearby attachments or local shell discontinuities are non-interacting.

## Retained Table-5 evidence

Retained Table 5 pp.41–42 explicitly lists the standard cylindrical computation-sheet loads, shell/attachment geometry, nondimensional parameters and SCFs.

It does not expose an explicit:

```text
neighbor attachment geometry
local-discontinuity inventory
neighbor spacing
interaction correction
```

This is qualified only as **explicit input-content evidence**. It does not prove isolation or noninteraction.

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

## Current route capability

The source model does not retain a complete inventory of neighboring nozzles, lugs, pads, supports, stiffeners, common reinforcement regions, shell-to-head/cone transitions, local thickness steps or other local discontinuities. There is no source-qualified interaction correction or spacing evaluator.

The current route can therefore be authorized for its bounded calculation path while this physical applicability evidence remains unresolved. That owner-authorized route state must not be interpreted as source closure.

## Independent WRC results are not automatically superposable

If local stress fields overlap, independent single-attachment evaluations do not by themselves establish that:

```text
WRC(A) + WRC(B)
```

represents a valid combined physical shell stress field at one common location.

A source-qualified isolation rule, interaction correction, or alternative analysis method is required.

## Required closure

Direct source evidence must establish, where applicable:

1. isolated-attachment/undisturbed-shell assumptions;
2. whether multiple attachments may be evaluated independently;
3. any spacing criterion and dimensional basis;
4. endpoint inclusivity and load-family dependence;
5. restrictions for supports, stiffeners, pads, transitions and common reinforcement;
6. alternative method when separation cannot be proven;
7. canonical geometry evidence required for noninteraction.

## Prohibitions

- do not invent a spacing threshold;
- do not treat missing neighbor inputs as proof of isolation;
- do not infer noninteraction from Table-5 input silence;
- do not claim nearby-support/stiffener/discontinuity effects are included;
- do not superpose overlapping independent WRC attachment solutions without authority;
- do not weaken existing §4.5 rules.

## Source custody

```text
docs/emp1/WRC537_2013.pdf
Git blob: ce861233928154145a9257efbbf8dbef3f5a17d1
raw SHA-256: 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
retained Table 5: docs/emp1/WRC537_2013_Tables_and_Charts.md, pp.41–42
direct PDF re-observation: NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT
```

No production numerical/applicability/registry mutation is made by this source batch.
