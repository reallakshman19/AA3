# M047 independent BM1 friction product observation — F1.7

## Mission

Use a pinned, independent CAESAR II example to constrain static-friction behavior without fitting BM4_L, and define the minimum product experiments needed to resolve the remaining hidden nonlinear controls.

This batch is **evidence only**. It changes no production solver, profile, tolerance, reference result, friction coefficient, Slide Multiplier, contact rule, or load case.

## Stack

- Base PR: #1055 — static friction stiffness unit/product validation (F1.6).
- Exact base SHA: `c85700f3e927c29c87735eca512df9e0637e7b38`.
- Head branch: `agent/m047-friction-bm1-product-observation`.

Future qualified friction work should stack on this PR.

## Independent product source

Pinned Common source:

```text
repository: reallaksh19/Common
commit:     179c4831cf521cf797c13699cfbbd118315c9244
input:      LFEA/BM1/BM1_InputXML.xml
input blob: ee88921c4ad80f0265fbed61336b1c896c15f9fa
output:     LFEA/BM1/BM1_CIIOutput.xml
output blob:caa9645ba59e5106ee4243f41a2edf2d81b6e17e
CAESAR:     14.00.00.0910 Build 231113
```

BM1 contains exactly two positive-friction supports, nodes 70 and 80, both +Y with `mu=0.3`. Neither friction site has a positive-gap companion. This makes BM1 useful for friction stiffness/state observations without the gap/contact coupling present in BM4_L.

BM2 and BM3 were screened from the same pinned Common corpus; neither contains positive `FRIC_COEF`, so they are not friction discriminators and are excluded from this authority lane.

## CASE 4 — direct stick observation

CAESAR CASE 4 is `(SUS) W+P1+H`.

At the two friction sites:

```text
node 70
  |u_t| = 0.0097530808 mm
  |F_t| = 1707.945239 N
  |F_t| / |u_t| = 175,118,536.918 N/m
  mu*N(final) = 5169.220313 N

node 80
  |u_t| = 0.00484828145 mm
  |F_t| = 849.147594 N
  |F_t| / |u_t| = 175,144,038.701 N/m
  mu*N(final) = 4611.186914 N
```

Both secant stiffnesses reproduce the independently documented static CAESAR default `1,000,000 lb/in = 175,126,835.246 N/m` within 0.01%, while remaining well below the final Coulomb cap.

Disposition:

```text
CASE 4 = STICK_STIFFNESS_DIRECTLY_OBSERVED
```

This independently closes the friction-stiffness magnitude/unit question without using BM4_L response data.

## CASE 3 — capped/sliding-compatible observation

CAESAR CASE 3 is `(OPE) W+T1+P1+H`.

Using the same documented stick stiffness, the observed final tangential displacements would imply impossible stick-trial forces:

```text
node 70
  stick trial / final mu*N = 38,229.1x
  observed |F_t| / final mu*N = 0.993474

node 80
  stick trial / final mu*N = 1,393.997x
  observed |F_t| / final mu*N = 0.986090
```

Therefore the final CASE 3 behavior cannot be the ordinary stick-stiffness branch. The reactions are instead near the final `mu*N` cap and are consistent with capped/sliding behavior.

However, these two rows do **not** uniquely identify CAESAR's hidden Friction Slide Multiplier. If the internal multiplier were 1.0, the normal forces implied by the observed tangential reactions differ from the final normal reactions by only about 0.65% and 1.39%, both inside the documented 15% normal-force update band. Thus multiplier 1.0 is **compatible** with the observations, not identified by them.

Disposition:

```text
FRICTION_SLIDE_MULTIPLIER = NOT_IDENTIFIED
FRICTION_STATE_HISTORY    = PARTIALLY_CONSTRAINED_NOT_RESOLVED
```

No multiplier value is promoted.

## Gap/contact disposition

BM1's two friction sites have no positive-gap companions. It therefore provides no authority for the BM4_L gap/contact state machine.

Disposition:

```text
GAP_CONTACT_STATE_SEMANTICS = NOT_EXERCISED
```

## Independent micro-model plan

`m047-friction-independent-micro-model-plan.json` defines four minimal CAESAR product experiments:

```text
FM1_SLIDE_PLATEAU
  constant known normal force + strong tangential sliding
  -> directly identify |F_t|/(mu*N) without normal-force-history ambiguity

FM2_ANGLE_UPDATE
  establish sliding, then rotate tangential direction below/above 15 deg
  -> identify the documented angle-update behavior

FM3_NORMAL_FORCE_UPDATE
  establish sliding, then change normal force about 14% and 16%
  -> identify held-force vs recomputed-force behavior across the 15% control

FM4_GAP_CONTACT
  one friction support plus one finite gap companion
  -> identify activation/recontact/reopening and friction coupling order
```

These experiments must be executed on CAESAR II `14.00.00.0910 Build 231113` with exact input/output custody before their results may authorize mechanics.

## Qualification

The checker recomputes:

- CASE 4 secant stiffness from reaction/displacement;
- CASE 4 Coulomb margins;
- CASE 3 documented stick-trial forces;
- CASE 3 reaction-to-`mu*N` ratios;
- multiplier-one compatibility with the 15% normal-force band;
- blocker/non-authorization status;
- the four-experiment promotion gate.

Optional `--input` and `--output` arguments replay the two-site source count and CAESAR build/case custody when the pinned Common files are mounted locally.

## Decision

**F1.7 COMPLETE — FRICTION STIFFNESS PRODUCT-VALIDATED; STATE HISTORY PARTIALLY CONSTRAINED; NO NEW MECHANICS.**

Remaining production blockers are unchanged:

```text
FRICTION_SLIDE_MULTIPLIER_AUTHORITY_REQUIRED
FRICTION_STATE_HISTORY_SEMANTICS_AUTHORITY_REQUIRED
GAP_CONTACT_STATE_SEMANTICS_AUTHORITY_REQUIRED
```

The next qualified step is execution of the independent FM1–FM4 CAESAR micro-models, not an L13/L7 fit.

## Non-scope

No PR #1001 modification, no Issue #991 change, no L13/L7 solve, no hidden-default assumption, no response fitting, no tolerance/comparator change, no merge, and no ready-for-review transition.
