# Provenance — `benchmarks/LFEA/SPRING_DRAFT`

**Every model in this directory is self-authored. None is an independent
reference, and nothing here clears spring-support capability for production.**

That warning is intentionally first. `benchmarks/LFEA/BM4/PROVENANCE.md`
records why a fixture written by the same process being verified cannot be used
as an accuracy oracle. The models here exist to keep representability,
constitutive invariants and refusal boundaries visible while external CAESAR
reference cases are still absent.

## Why these models exist

The real BM4_L benchmark contains none of the issue #1551 target features:
finite skew springs, finite CNODE springs, or predefined HANGER rate/preload.
BM4_L therefore remains a **non-regression** benchmark only for this work. It
cannot prove that any of these support features works.

A path no external benchmark can see is still vulnerable to silent regression.
These fixtures provide bounded source-owned exercises and negative controls, but
must remain disclosed with `DRAFT_SPRING_SUPPORT_NO_REFERENCE` until an
independent CAESAR-solved feature model is retained.

## Fixture ledger

| File | Custody | Required behavior |
|---|---|---|
| `SpringSupports.xml` | positive, self-authored | ordinary finite axis springs compile and solve; constitutive `|R/u| = k`; material support load share; DRAFT disclosure |
| `SkewSpringSupports.xml` | positive, self-authored | finite bidirectional skew spring compiles exactly as `k(n⊗n)` and solves with DRAFT disclosure |
| `CnodeSpringSupports.xml` | positive, self-authored | finite bidirectional CNODE spring compiles as an internal two-node relative spring, not ground support; DRAFT disclosure |
| `PredefinedHanger.xml` | positive, self-authored | predefined Y-vertical HANGER rate enters `K`, cold load enters explicit `+H` load cases, and DRAFT disclosure survives to results |
| `MixedFixedSkewSpring.xml` | positive, self-authored | a valid rigid + directional-spring mixed node exercises raw reaction decomposition and presentation custody |
| `UnsupportedSkewSupport.xml` | negative, self-authored | rigid skew remains refused by `MODEL_RESTRAINT_SKEW_DIRECTION_UNSUPPORTED` because exact MPC authority is absent |
| `UnsupportedCnodeSupport.xml` | negative, self-authored | rigid CNODE remains refused by `MODEL_RESTRAINT_CONNECTING_NODE_UNSUPPORTED` because exact MPC authority is absent |
| `UnsupportedHanger.xml` | negative, self-authored | incomplete predefined HANGER remains refused by `MODEL_HANGER_PREDEFINED_DATA_INCOMPLETE` |
| `UnsupportedSupports.xml` | combined legacy negative | retains rigid-CNODE + incomplete-HANGER together as a cross-feature regression; it is no longer the sole refusal fixture for either feature |

The dedicated negative fixtures matter because issue #1551 requires the refusal
case for each feature to remain its own retained model. A combined model alone
can hide which source feature actually caused the block.

## What the positive models can honestly assert

They can assert **mechanical identities and exact representation invariants**,
not parity accuracy.

### Ordinary and HANGER axis springs

For a scalar linear spring:

`R = -k u`

so `|R/u| = k` whenever the spring actually carries load. The checks also guard
against the trivial "spring in the anchor's shadow" failure by requiring a
material share of support load rather than accepting an identity at essentially
zero reaction.

For predefined HANGER, the as-designed CAESAR inputs are kept separate by
physical role:

- spring rate × number of hangers -> structural spring stiffness in `K`;
- theoretical cold load × number of hangers -> upward physical preload in the
  explicit `WH/WPH/WTH/WPTH` cases in `F`.

The tool does not size or select hangers.

### Finite skew spring

For exact unit direction `n`, the grounded spring contribution is:

`K_s = k(n⊗n)`

and support action is:

`R_s = -k(n·u)n`.

This is position-independent. When `n` is exactly X, Y or Z, the 3×3 block must
reduce exactly to the existing scalar spring on that axis. The focused check
asserts those reductions. Rigid skew is not approximated by a penalty spring;
it remains refused until exact constraint-equation/MPC machinery exists.

### Finite CNODE spring

For primary and connected-node translations `u_i` and `u_j`:

`q = n·(u_i-u_j)`

`F_i = k q n`

`F_j = -F_i`.

The assembled translational block is:

`k [[nnT, -nnT], [-nnT, nnT]]`.

The invariant is relative-displacement based and therefore unchanged by common
rigid-body translation. The two nodal forces must remain equal and opposite.
Rigid CNODE remains refused until exact MPC authority exists.

## Refusal-model custody

The negative fixtures are not merely parser samples. They are retained to prove
that unsupported boundaries remain fail-closed by **named reason** under both
STRICT and APPROXIMATE profiles.

`scripts/lfea-support-refusal-fixture-check.mjs` guards the dedicated rigid-CNODE
and incomplete-HANGER models independently and rejects contamination by the
other feature's refusal code. `UnsupportedSkewSupport.xml` remains the dedicated
rigid-skew control. The combined `UnsupportedSupports.xml` is retained only as
an additional cross-feature regression.

All new guards include an authored deliberate-break path, but no deliberate
break is considered verified until it has actually executed red on the exact
repository head.

## Units are part of the authority boundary

Spring rate is force per length. It is not legal to pass the declared numeric
value through unchanged or to fall back to factor 1 when source units cannot be
resolved. The source force and length declarations are converted separately and
the quotient is used for rate conversion. An unresolved finite rate must remain
withheld/fail closed.

A rate of `1750 N/mm`, for example, is `1.75e6 N/m`; treating the same numeric
value as N/m would be 1000× too soft while still satisfying a self-consistent
`R/u = k` check against the wrong compiled value. That is why unit conversion
has its own gate.

## What would actually clear DRAFT

Only independent CAESAR-solved feature evidence can clear
`DRAFT_SPRING_SUPPORT_NO_REFERENCE`:

- `REF-SKEW-01` — CAESAR-solved finite skew support model;
- `REF-CNODE-01` — CAESAR-solved finite CNODE support model;
- `REF-HGR-01` — CAESAR-solved predefined hanger model.

The retained package must include the raw job/input/output custody, CAESAR
version/settings, hashes, selected displacement/reaction evidence and
independent review. No expected-value fitting, tolerance fitting, sign tuning or
row-selection tuning is permitted.

More self-authored fixtures, tighter numerical identities, or unchanged BM4_L
parity do **not** clear feature DRAFT status.
