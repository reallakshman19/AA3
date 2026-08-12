# M047 BM4_L friction stiffness unit contract — F1.6

## Mission

Remove the remaining unit ambiguity between CAESAR's displayed friction stiffness and the SI-only LFEA friction kernel before any BM4_L friction case is allowed to execute.

This batch does **not** solve L13 or L7 and does not alter comparator tolerances, linear BM4_L mechanics, CAESAR reference data, or the three unresolved nonlinear-authority blockers.

## Stack

- Base PR: #1052 — friction authority closure (F1.5).
- Exact base SHA: `2c8f61b503b2192324f17c4ffbd8ad1b0ef06552`.
- Head branch: `agent/m047-bm4l-friction-unit-contract`.

Future qualified friction work should stack on this PR.

## Exact BM4_L unit authority

Pinned Common source:

- repository `reallaksh19/Common`;
- commit `179c4831cf521cf797c13699cfbbd118315c9244`;
- path `LFEA/BM4/InputXML_BM4.xml`;
- Git blob `3423d220374a17f67addd3c8c0c44300ffa46251`.

The exact InputXML `<UNITS>` block contains:

```text
<LENGTH LABEL="mm." FACTOR="25.400000"/>
<FORCE LABEL="N." FACTOR="4.448220"/>
```

The BM4_L profile stores:

```text
FRICT_STIF = 1,000,000 DISPLAYED_CAESAR_UNITS
```

Therefore the displayed translational stiffness is explicitly:

```text
1,000,000 N/mm
```

and the governed SI value passed toward the friction kernel is:

```text
1,000,000 N/mm × 1000 mm/m = 1,000,000,000 N/m
```

No friction response row is used in this derivation.

## Generic unit contract

`caesar-friction-unit-contract.js`:

- parses the CAESAR InputXML force and length labels from `<UNITS>`;
- derives the active force/length stiffness unit;
- converts explicit `N/m`, `N/cm`, `N/mm`, and `lb/in` stiffnesses to `N/m`;
- rejects ambiguous labels such as `DISPLAYED_CAESAR_UNITS` when the force/length source is absent;
- provides a single helper for normalizing a displayed CAESAR friction stiffness from the model InputXML.

## Readiness hardening

Positive-friction execution now requires `frictionStiffness` to be:

```text
status = RESOLVED
value  > 0
unit   = N/m
```

Otherwise the gate emits:

```text
FRICTION_STIFFNESS_UNIT_NORMALIZATION_REQUIRED
```

The zero-friction branch returns before inspecting nonlinear authority, so L2/L3/L4/L5/L6 remain on the already qualified linear bypass exactly as before.

The BM4_L readiness snapshot now records both representations:

```text
displayed: 1,000,000 N/mm
SI:        1,000,000,000 N/m
```

Thus L7/L13 remain blocked only by the same three genuine unresolved authorities:

```text
FRICTION_SLIDE_MULTIPLIER_AUTHORITY_REQUIRED
FRICTION_STATE_HISTORY_SEMANTICS_AUTHORITY_REQUIRED
GAP_CONTACT_STATE_SEMANTICS_AUTHORITY_REQUIRED
```

## Local qualification

Node `22.16.0`:

- unit-contract module syntax — **PASS**;
- readiness-gate syntax after SI hardening — **PASS**;
- focused unit conversion/gate qualification — **PASS**.

Focused checks include:

- `1,000,000 N/mm -> 1,000,000,000 N/m`;
- `N/m`, `N/cm`, `N/mm`, and `lb/in` conversions;
- exact InputXML unit-row parsing fixture;
- fail-closed rejection of ambiguous `DISPLAYED_CAESAR_UNITS`;
- readiness rejection of a resolved-but-unitless `1,000,000` friction stiffness;
- no authorization of L13/L7.

The checker also accepts optional `--inputxml <path>` for byte-local replay against the exact Common XML when that source is mounted. The connected GitHub source was used to pin the exact unit rows in this environment.

## Decision

**F1.6 UNIT CONTRACT COMPLETE — UNIT AMBIGUITY CLOSED, PRODUCTION FRICTION STILL BLOCKED.**

This removes a potential factor-of-1000 integration error without changing any physical friction assumption.

Next safe improvement is independent CAESAR micro-model authority for the three remaining nonlinear controls. No BM4_L response fitting is authorized.

## Non-scope

No PR #1001 modification, no Issue #991 change, no L13/L7 solve, no Slide Multiplier assumption, no contact-state fitting, no comparator/tolerance/profile-value change, no merge, and no ready-for-review transition.
