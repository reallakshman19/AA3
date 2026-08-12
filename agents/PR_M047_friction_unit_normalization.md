# M047 BM4_L friction stiffness unit normalization — F1.6

## Mission

Resolve the force/length unit attached to the already-authorized CAESAR friction-stiffness value before any BM4_L nonlinear solve. This batch changes no BM4_L production solver, profile, comparator, reference, tolerance, contact state, friction state, or load-case result.

## Stack

- Base PR: #1052 — friction authority closure (F1.5).
- Exact base SHA: `2c8f61b503b2192324f17c4ffbd8ad1b0ef06552`.
- Head branch: `agent/m047-bm4l-friction-unit-normalization`.

Future qualified friction work should stack on this PR.

## Independent authority

The BM4_L validation profile captures:

```text
FRICT_STIF = 1,000,000
unit = DISPLAYED_CAESAR_UNITS
```

Official Hexagon CAESAR II documentation defines Friction Stiffness as a translational force/length stiffness and lists typical units by active unit system: `lb/in`, `N/mm`, `N/m`, and `N/cm`.

The exact pinned Common source:

```text
repository  reallaksh19/Common
commit      179c4831cf521cf797c13699cfbbd118315c9244
path        LFEA/BM4/InputXML_BM4.xml
git blob    3423d220374a17f67addd3c8c0c44300ffa46251
```

declares:

```xml
<TRANS_STIFF LABEL="N. / cm." FACTOR="1.751270"/>
```

Therefore the BM4_L displayed friction stiffness is:

```text
1,000,000 N/cm
= 100,000,000 N/m
= 1.0e8 N/m
```

The XML `FACTOR` field is retained as source custody evidence only. This batch does not invent an undocumented formula using that field; SI conversion is driven by the explicit unit label.

## Why this matters

Using the raw number `1,000,000` directly in an SI `N/m` solver would understate the intended stiffness by 100x. Treating BM4_L as `N/mm` would overstate it by 10x relative to the exact `N/cm` source unit. Both interpretations are now prohibited by an executable checker.

## Generic normalization seam

`caesar-friction-unit-normalization.js` supports the CAESAR translational stiffness unit families needed by the public product authority:

- `N/m`
- `N/cm`
- `N/mm`
- `lb/in` / `lbf/in`

It can parse the InputXML `TRANS_STIFF` unit declaration and convert an explicitly displayed CAESAR stiffness to `N/m`.

## Linear-path isolation

The F1.4 readiness contract remains unchanged. For a case friction multiplier exactly equal to zero, the readiness gate returns `QUALIFIED_LINEAR_SOLVER` before inspecting source mapping or nonlinear authority. The F1.6 checker deliberately supplies malformed nonlinear stiffness authority to the L6 zero-friction path and proves that it is not inspected.

Thus this unit correction cannot alter the production-confirmed frictionless BM4_L parity surface.

## Validation

Local Node qualification of the new normalization module and focused synthetic unit fixture:

```text
node --check caesar-friction-unit-normalization.js  PASS
node --check focused unit checker                  PASS
focused N/cm conversion                            PASS
1,000,000 N/cm -> 100,000,000 N/m                 PASS
```

The repository checker also accepts optional `--inputxml=<path>` execution. When the exact Common XML is mounted, it verifies the Git blob SHA before replaying the unit declaration and normalization. The exact source declaration itself was independently inspected through the connected GitHub source at the pinned commit.

## Decision

**F1.6 UNIT NORMALIZATION RESOLVED — NO L13/L7 EXECUTION AUTHORITY.**

Resolved additional fact:

```text
BM4_L CAESAR friction stiffness = 1.0e8 N/m
```

Remaining blockers are unchanged:

```text
FRICTION_SLIDE_MULTIPLIER_AUTHORITY_REQUIRED
FRICTION_STATE_HISTORY_SEMANTICS_AUTHORITY_REQUIRED
GAP_CONTACT_STATE_SEMANTICS_AUTHORITY_REQUIRED
```

## Non-scope

No PR #1001 modification, no Issue #991 change, no L13/L7 solve, no Slide Multiplier assumption, no response fitting, no gap/contact algorithm inference, no comparator/profile/tolerance change, no workflow modification, no merge, and no ready-for-review transition.
