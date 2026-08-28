# Provenance — `benchmarks/LFEA/SPRING_DRAFT`

**These models are self-authored. They are not a reference, and nothing here
clears spring support for production.**

That warning is the first line rather than a footnote because the sibling
directory exists to make exactly this point. `benchmarks/LFEA/BM4/PROVENANCE.md`
records that phases 1–7 of the LFEA pipeline were verified against a fixture
written by the same process being verified, which passed *because* it was
trivial — and that when a real model was finally loaded it returned 72 BLOCK
findings and "Available cases: None".

These two files were written by that same process. They carry the same risk.

## Why they exist anyway

Production parity runs against BM4_L, and **BM4_L declares no spring rates**.
Not a single one. So the entire compliant-support path — the one that used to be
refused outright with `MODEL_RESTRAINT_FINITE_STIFFNESS_UNSUPPORTED` — is
invisible to every measurement this repository currently makes against a real
CAESAR-solved model.

A path no measurement can see is a path that rots silently. These models make it
visible. That is all they do.

| File | What it must do |
|---|---|
| `SpringSupports.xml` | Solve, with both declared rates compiling to distinct springs, and disclose `DRAFT_SPRING_SUPPORT_NO_REFERENCE` |
| `UnsupportedSupports.xml` | Be **refused**, naming `MODEL_RESTRAINT_CONNECTING_NODE_UNSUPPORTED` and `MODEL_HANGER_UNSUPPORTED` |

The second file is the more valuable of the two. A feature that quietly
half-works on input it cannot represent is worse than one that refuses, and a
refusal is the thing most likely to erode unnoticed as surrounding code changes.

## What the first model can honestly assert

Not accuracy — there is no reference to be accurate against. What it asserts is
an **identity**: for a linear spring, the reaction is exactly the rate times the
displacement of the node it restrains. That holds regardless of where the spring
sits, so it needs no external answer to check against.

    node 40   rate 900000   displacement -4.147e-4   reaction 373.25
    node 70   rate 300000   displacement -1.150e-3   reaction 344.97
    identity relative error: 1.3e-16 and 0

Two things were deliberately designed out of the model, both of which would have
let it pass while proving nothing:

- **Springs in the shadow of a rigid support.** The first draft placed a spring
  between an anchor and a rigid vertical restraint. It satisfied the identity
  perfectly while carrying 0.0017 N — the identity is trivially true for a
  support that does nothing. The rigid restraint now guides Z instead, so the
  `FIXED` path is still exercised without competing with the springs in Y, and
  the check asserts the springs carry >10% of the model's vertical load. They
  carry 14.4%.
- **A "softer spring deflects more" assertion.** This is not the invariant and
  is false in general: node 70 sits at the free end of the run and deflects more
  than the mid-run support despite carrying the *stiffer* rate. Position
  dominates. That assertion was removed rather than tuned around.

## What would actually clear this

A CAESAR II model that contains spring supports, **solved by CAESAR**, with its
output retained the way `BM4/Output_BM4.xml` is. Then the same parity harness
that measures everything else can measure this, and
`DRAFT_SPRING_SUPPORT_NO_REFERENCE` can be removed.

More self-authored coverage does not clear it. Neither does the identity above
holding to more decimal places.

## Model description

Both are hand-written in the CAESAR II InputXML dialect, matching the
conventions observed in the vendored `InputXML_BM4.xml` — `-1.010100` sentinels
for undeclared attributes, `NODE`/`TYPE`/`STIFFNESS`/`CNODE` on `RESTRAINT`.

`SpringSupports.xml` — six 3 m elements of 168.3 × 7.11 A106 Grade B, anchored
at node 10, a 900 kN/m spring at node 40, a rigid Z guide at node 60, and a
300 kN/m spring at node 70. The pipe size was reduced from 273 × 18.26 during
authoring: the heavier section was stiff enough that the anchor reacted the run
almost entirely as a moment and the springs took 1.8% of the load.

`UnsupportedSupports.xml` — three elements carrying the two things still outside
the supported region: a restraint declaring both a spring rate and a `CNODE`,
and a `HANGER` record with a spring rate and a cold load.
