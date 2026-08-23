# WRC 537 nearby-attachment / local-discontinuity interaction authority — EMP1-31

## Decision

The current cylindrical WRC 537 route does **not** have source-qualified authority to claim that nearby attachments or local shell discontinuities are non-interacting merely because the existing WRC §4.5 cylinder-length/end-distance checks pass.

This increment changes no mechanics. It preserves the existing §4.5 applicability rules and adds only a claim boundary around geometry that those rules do not presently describe.

## Existing qualified applicability rules remain intact

Current production applicability logic already retains:

```text
P active      -> cylinder length l >= Rm
Mc or Ml active -> nearest cylinder end distance >= 0.5*Rm
```

These rules are load-conditional and are already implemented in `src/core/emp1/emp1-wrc537-cylindrical-applicability.js`.

They must not be reinterpreted as a general proof that all other local discontinuities are sufficiently remote.

## What the current route does not retain

The bounded WRC source model does not presently retain a complete inventory of:

- neighboring nozzles or attachments;
- lugs, clips, pads or local supports;
- reinforcing pads or common reinforcement regions;
- ring stiffeners;
- saddles, skirts or flanges;
- shell-to-head or shell-to-cone junctions other than the existing cylinder-end evidence;
- local thickness steps or other shell discontinuities.

It also has no source-qualified interaction correction or spacing evaluator for those features.

Therefore this inference is prohibited:

```text
§4.5 end-distance checks pass
        =>
all nearby local stress-field interaction is negligible
```

## Independent WRC evaluations are not automatically superposable

If two attachments are sufficiently close that their local shell stress fields overlap, independently evaluating each attachment with a single-attachment WRC solution does not by itself prove that:

```text
WRC(A) + WRC(B)
```

is a valid physical combined local stress field at one common shell location.

A source-qualified spacing/noninteraction rule, interaction correction, or alternative analysis method is required before such a claim may be made.

## Unresolved source questions

Direct primary-source custody must establish, where applicable:

1. whether the WRC cylindrical solution assumes an isolated attachment or undisturbed shell region;
2. whether multiple attachments may be evaluated independently;
3. any minimum attachment-to-attachment or attachment-to-discontinuity separation;
4. whether separation is center-to-center, edge-to-edge, or based on another geometric reference;
5. the normalization variable and endpoint inclusivity;
6. load-family dependence of any interaction rule;
7. whether nearby supports, stiffeners, pads or transitions invalidate the local solution;
8. whether common reinforcement regions require a different treatment;
9. what method is required when noninteraction cannot be demonstrated;
10. what canonical geometry evidence software must retain to prove the condition.

## Source custody

Pinned source:

```text
docs/emp1/WRC537_2013.pdf
raw SHA-256: 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
```

Direct binary-page re-observation remains `NOT_RUN_EXECUTION_ENVIRONMENT` through the current connected repository interface.

## Authority boundary

Until primary-source closure:

- do not invent a spacing rule from attachment diameter, beta, shell thickness, FEA mesh size, `sqrt(Rm*T)` or general practice;
- do not treat missing neighbor inputs as proof of isolation;
- do not claim the current WRC result includes nearby-support/stiffener/discontinuity effects;
- do not superpose overlapping independent WRC attachment solutions without authority;
- do not weaken or replace the existing §4.5 cylinder-length/end-distance rules;
- do not widen gamma/beta, pressure, SCF, off-axis, spherical, non-round, oblique, attachment-class, nozzle-wall, code or release authority.

Current disposition:

`BLOCKED_NEARBY_ATTACHMENT_INTERACTION_AUTHORITY_UNRESOLVED`
