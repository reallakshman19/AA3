# M047 BM4_L friction authority — F0

## Mission

Establish the source and load-case authority needed for a later nonlinear BM4_L friction implementation without changing the already qualified linear mechanics. This F0 delivery is evidence/tooling only. It does not add a friction solver, alter any restraint equation, change the BM4_L profile, modify comparator tolerances, or change CAESAR references.

## Stack

- Base PR: #1042 — exact-head BM4_L local production harness.
- Base branch: `agent/m047-bm4l-local-production-harness`.
- Base SHA: `b25500333399bcc74e93ab8ed843900bb2a2aa51`.
- The base was independently Windows/ACE-qualified by M047 workflow run `31513907633`, artifact `9110308571`, digest `sha256:57684331169984e7770382a3d292fcb7c24bd30c2404fd487c2a5f66e8a907eb`.
- Canonical six-case acceptance parity at that head remains `46 / 11,484` failures = `99.5994427029%` pass.

Future friction work is intentionally stacked on this F0 branch. The next planned branch is `agent/m047-bm4l-friction-kernel`.

## Pinned BM4_L report authority

Common commit: `179c4831cf521cf797c13699cfbbd118315c9244`.

- `LFEA/BM4/Loadcasereport_BM4_L.txt`, blob `be62eeb08af26dddcd59146e21188c108c4600dd`.
- `LFEA/BM4/InputXML_BM4.xml`, blob `3423d220374a17f67addd3c8c0c44300ffa46251`.
- CAESAR II `14.00.00.0910 (Build 231113)`.

The load-case report defines twenty cases. The friction-bearing primary solution cases are:

```text
L1   HYD      WW+HP        friction multiplier 1.0
L7   OPE      W+T1+P1      friction multiplier 1.0
L9   OPE      W+T2+P1      friction multiplier 1.0
L11  OPE      W+T3+P1      friction multiplier 1.0
L13  SUS      W+P1         friction multiplier 1.0
```

The alternate sustained L8/L10/L12 also use friction multiplier 1.0 but are Stress-only output cases. The derived friction expansion cases are algebraic combinations L15-L20.

The cleanest differential qualification pairs are:

```text
L13 = W+P1, friction 1.0
L6  = W+P1, friction 0.0

L7  = W+T1+P1, friction 1.0
L5  = W+T1+P1, friction 0.0
```

Thus L13 versus L6 isolates friction without thermal strain, while L7 versus L5 isolates friction after the already-qualified T1 mechanics are retained.

`L15=L7-L13` is explicitly `ALG`. It must be formed from the converged primary solutions rather than solved as an independent nonlinear equilibrium case.

## Model friction authority

The existing qualified BM4_L profile records model input `COEFFICIENT_OF_FRICTION_MU = 0.3` and `FRICT_STIF = 1000000` in displayed CAESAR units. The pinned InputXML also contains explicit restraint `FRIC_COEF` fields; source examples include `0.300000` on translational support restraints.

The F0 checker intentionally does **not** hard-code an exhaustive friction-support count. When a pinned InputXML path is supplied, it derives:

- all active restraint rows;
- all positive-friction restraint rows;
- the unique positive friction coefficients;
- friction support nodes;
- friction nodes that also own a companion positive-gap restraint.

That design prevents a partial hand-transcription of the XML from becoming authority.

## Current production boundary

The current linear InputXML consumer deliberately classifies positive friction as nonlinear and fails closed with `MODEL_RESTRAINT_FRICTION_UNSUPPORTED`. This F0 PR preserves that boundary.

No attempt is made to emulate friction by adding a post-solve force, changing linear restraint stiffness, scaling gravity, or modifying the qualified 99.5994% mechanics.

## Official CAESAR documentation boundary

Public Hexagon CAESAR II documentation independently establishes that:

- the Load Case Report records the per-case Friction Multiplier;
- static load cases support load-case-level friction-factor scaling;
- friction and gaps are nonlinear effects that complicate load-case combinations;
- the Version 14 configuration surface exposes Friction Angle Variation, Friction Normal Force Variation, Friction Slide Multiplier and Friction Stiffness controls.

F0 does not infer undocumented defaults for the remaining static nonlinear controls. Before F1 production mechanics, their BM4_L values and the exact static iteration semantics must be pinned or independently reconstructed.

## Qualification sequence

1. `F0_SOURCE_INVENTORY` — this PR.
2. `F1_GENERIC_3D_CONTACT_FRICTION_KERNEL` — generic state/equilibrium implementation; no BM4_L residual fitting.
3. `F2_L13_VS_L6` — first production friction qualification because thermal expansion is absent.
4. `F3_L7_VS_L5_AND_L15_ALGEBRA` — operating friction and first derived expansion range.
5. `F4_HYDRO_L1` — only after ordinary friction is qualified.
6. `F5_T2_T3_FAMILY_AFTER_THERMAL_AUTHORITY` — L9/L11 and L16-L20 only after independent T2/T3 thermal authority exists.

For every nonlinear target the acceptance boundary will require force/moment equilibrium, contact admissibility, friction-bound admissibility, deterministic state history, fail-closed nonconvergence, and an exact friction-zero identity back to the qualified linear path.

## Added evidence/tooling

```text
agents/PR_M047_friction_authority.md
benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-friction-authority.json
scripts/lfea-m047-bm4l-friction-authority-check.mjs
```

The checker verifies the complete 20-case authority map, the L13/L6 and L7/L5 differential identities, L15 algebra, the preserved linear friction blocker, and `newMechanicsAuthorized=false`. With `--report` and `--inputxml` it also validates the pinned source files and derives the friction/gap inventory.

## Local validation

Executed in the available Node environment:

```text
node --check scripts/lfea-m047-bm4l-friction-authority-check.mjs
PASS

node scripts/lfea-m047-bm4l-friction-authority-check.mjs \
  --authority benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-friction-authority.json
PASS m047 BM4_L friction authority
```

The connected GitHub source was inspected directly for the load-case report and InputXML examples. Full local `--report` / `--inputxml` execution remains `NOT_RUN` because the connector does not materialize those Common files into this Linux filesystem.

## Decision

**F0 COMPLETE — NO NEW MECHANICS.**

The next authorized work is the generic nonlinear friction/contact kernel, stacked on this branch. It must retain the exact zero-friction identity and may not be fitted to BM4_L residuals.

## Non-scope

No change to PR #1001, no Issue #991 modification, no reducer station tuning, no gravity/stiffness tuning, no comparator weakening, no T2/T3 thermal assumption, no workflow edit, and no merge/readiness transition.
