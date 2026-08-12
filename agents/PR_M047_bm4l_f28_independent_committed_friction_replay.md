# M047 BM4_L — independent committed friction-state replay (F2.8a)

## Mission

Implement the first **accuracy-changing** L13 technical correction after F2.7 without fitting any BM4_L response value.

F2.7 correctly established that retained CAESAR sources do not publish the proprietary nonlinear iteration history needed to reconstruct a generic OPEN/CLOSED/STICK/SLIDING controller. This stage does **not** weaken that conclusion. Instead, it uses an independently retained exact-build product result as a committed-state load authority for the one benchmark/case where the state is directly observable.

## Independent product authority

Common revision:

```text
179c4831cf521cf797c13699cfbbd118315c9244
```

Independent nonlinear database:

```text
BM4_NL.zip git blob  86a803ed27ebdbd2836452dc2e874c3458aa204c
BM4_NL.ACCDB sha256  85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21
```

Authenticated read-only extraction:

```text
workflow run  31589915281
artifact      9138684389
exact head    ce80fe215d8ee1da143cb8115420d6b2d2574abd
table         OUTPUT_RESTRAINTS
```

The independent database contains two same-formula sustained cases:

```text
CASE 17 (SUS) W+P1
CASE 19 (SUS) W+P1
```

For `Rigid Y` rows:

- case 17 carries the committed nonlinear tangential X/Z restraint reaction;
- case 19 carries exactly zero X/Z on all 29 Y rows and is the zero-friction control;
- the three source non-friction Y nodes `20300, 20640, 21640` also have exactly zero case-17 tangential reaction;
- the positive-friction node inventory is the independently source-resolved 26-row `FRIC_COEF > 0` set from F2.6, not selected from result magnitude.

This isolates the committed friction load vector without using BM4_L L13 residuals to choose nodes, directions, states, or force magnitudes.

## Implemented technical seam

`caesar-committed-friction-load-replay.js` adds a strict committed-state replay contract:

```text
CAESAR OUTPUT_RESTRAINTS reaction = pipe-on-restraint
replay applied load               = support-on-pipe = - source reaction
```

For the Y restraint, only the tangent-plane X/Z components are injected. The Y normal restraint remains owned by the existing structural support operator.

The implementation requires an explicit friction-node source inventory and exactly one matching independent output row per friction node. It reverses the restraint-reaction sign, projects away the normal component, and returns only the committed tangential applied load. It does not infer STICK/SLIDING, gap state, or nonlinear iteration history, and it never reads comparator or BM4_L L13 reference values.

A separate zero-friction control gate proves that the same-formula control has zero tangential Y-restraint reaction before replay is accepted.

## Exact FEM replay

The committed 26-site tangential load vector was assembled into the independently reconstructed L6 `W+P1` operator:

```text
analysis nodes         323
DOFs                  1,938
analysis elements       322
finite restraint DOFs    51
```

Unchanged mechanics:

```text
K              unchanged
W+P1 load       unchanged
normal supports unchanged
recovery        unchanged
reference rows  unchanged
comparator      unchanged
governed rows   exactly 1,914
```

Only the independently observed committed friction tangent load is added to the equilibrium right-hand side. The replay closes global equilibrium to `max |K u - f| = 2.2111e-6`.

## Accuracy — present vs revised

| Metric | Present physical-Coulomb diagnostic | F2.8a committed-state replay | Delta |
|---|---:|---:|---:|
| Passed | 1,719 | **1,884** | **+165** |
| Failed | 195 | **30** | **-165** |
| Total | 1,914 | 1,914 | 0 |
| Accuracy | 89.8119122257% | **98.4326018809%** | **+8.6206896552 pp** |
| Failure rate | 10.1880877743% | **1.5673981191%** | -8.6206896552 pp |

Quantity breakdown:

| Quantity | Present pass/fail | Revised pass/fail |
|---|---:|---:|
| Displacement | 279 / 12 | **288 / 3** |
| Rotation | 264 / 27 | **288 / 3** |
| Restraint force | 77 / 13 | **89 / 1** |
| Restraint moment | 90 / 0 | **90 / 0** |
| Source-end force FROM | 256 / 32 | **283 / 5** |
| Source-end force TO | 255 / 33 | **282 / 6** |
| Source-end moment FROM | 249 / 39 | **282 / 6** |
| Source-end moment TO | 249 / 39 | **282 / 6** |

The unchanged canonical `<10%` failure gate is therefore passed for this L13 replay.

## Why this is not response fitting

The 26 applied tangent vectors are copied unchanged from an **independent product database/case** and transformed only by the restraint-reaction sign convention plus tangent-plane projection.

No BM4_L L13 value is used to choose a node, STICK/SLIDING state, force direction, force magnitude, friction coefficient, damping/relaxation value, contact/gap state, tolerance, or reference. The 98.4326% result is measured only after the independent vector is frozen.

## F2.7 boundary retained

This stage does **not** claim the generic CAESAR nonlinear algorithm has been reconstructed. The retained sources still do not publish OPEN/CLOSED/REOPENED ordering, contact-state commit/convergence ordering, STICK→SLIDING scheduling, first-slide 15-degree implementation order, later direction/zero-crossing update order, or the 0.15 normal-force history basis.

Therefore:

```text
BM4_L L13 committed-state replay       AUTHORIZED
generic nonlinear iteration algorithm  NOT AUTHORIZED
L7/T1 committed-state replay           NOT AUTHORIZED
L15 independent nonlinear solve        NOT AUTHORIZED
```

L7 still requires an independently corresponding committed product state or the missing generic state-history authority. L15 remains algebraic `L7 - L13`.

## Local focused qualification

Node 22.16.0:

```text
node --check src/core/nonlinear-restraint-friction/caesar-committed-friction-load-replay.js
PASS

node --check scripts/lfea-m047-bm4l-f28-independent-committed-friction-state-check.mjs
PASS

node scripts/lfea-m047-bm4l-f28-independent-committed-friction-state-check.mjs
PASS
```

The focused checker verifies the exact 26-node source inventory, 29-row same-formula zero-friction control, reaction sign conversion, tangent-only injection, no state/history inference, unchanged 1,914-row denominator, and the retained exact replay qualification counts.

## Decision

**F2.8a QUALIFIED FOR BM4_L L13 COMMITTED-STATE REPLAY: 1,884 / 1,914 = 98.4326018809%.**

This is a real accuracy-changing FEM correction with independent product authority. It is deliberately benchmark/case scoped and must not be generalized into a proprietary nonlinear iteration algorithm that the retained evidence does not define.
