# M047 generic CAESAR-style friction kernel — F1

## Mission

Add a small, isolated 3-D static-friction state kernel following the publicly documented CAESAR stiffness method. This PR deliberately does **not** integrate friction into the BM4_L production solve. The remaining undocumented Friction Slide Multiplier is therefore a required explicit input, never a hidden or fitted default.

## Stack

- Base PR: #1044 — BM4_L friction load-case authority (F0).
- Base branch: `agent/m047-bm4l-friction-authority`.
- Base SHA: `9e6c621a4be6387fce2c8e630d59515ba1bfd73d`.
- Head branch: `agent/m047-bm4l-friction-kernel`.

The qualified linear BM4_L stack remains untouched. This kernel is a reusable nonlinear building block only.

## State law

For active contact with unit normal `n`, relative translation `u`, friction stiffness `k_f`, source coefficient `mu`, load-case friction multiplier `m`, and compressive normal-force magnitude `N`:

```text
P_t = I - n n^T
u_t = P_t u
mu_eff = mu * m
F_limit = mu_eff * N
```

### Non-sliding iteration

```text
F_trial = -k_f u_t
K_t = k_f P_t
```

If `|F_trial| < F_limit`, the site remains `STICK`.

If `|F_trial| >= F_limit`, the current iteration remains the stiffness trial and the kernel returns `nextState=SLIDING`, matching Hexagon's description that the constant sliding effort replaces stiffness on the following iteration.

### Sliding iteration

With explicit positive `slideMultiplier=s`:

```text
F_slide = -s * F_limit * direction(u_t)
K_t = 0
```

If a committed sliding state has zero current tangential displacement, the caller must supply the retained tangent-plane sliding direction. The kernel refuses to invent one.

## Fail-closed boundaries

- Positive friction requires an explicit finite positive `slideMultiplier`; there is no default.
- Negative normal force is rejected; contact/open-state ownership belongs to the outer nonlinear controller.
- `contactActive=false`, `mu=0`, friction multiplier `0`, or `N=0` returns exactly zero friction and zero tangential stiffness.
- Gap opening/closing, global matrix assembly, angle/normal-force convergence tests, iteration limits, load sequencing, and BM4_L comparison are outside this F1 kernel.

## Why this is safe to stack before BM4_L F2

F0 established that public CAESAR documentation resolves the stiffness method itself, friction stiffness, angle variation, and normal-force variation, but does not publish the numeric Friction Slide Multiplier. This implementation therefore captures only the independently supported local law and exposes the unknown scalar as mandatory authority.

It cannot silently enable BM4_L friction and it cannot change the existing frictionless solver path.

## Files

```text
src/core/nonlinear-restraint-friction/caesar-stiffness-friction.js
src/core/nonlinear-restraint-friction/index.js
scripts/lfea-m047-friction-kernel-check.mjs
agents/PR_M047_friction_kernel.md
```

## Local qualification

The focused Node checker covers:

- non-sliding stiffness response;
- friction-limit transition on the next iteration;
- constant-force sliding response;
- explicit slide-multiplier scaling;
- tangent-plane projection and zero normal force component;
- resistance opposite tangential movement;
- exact zero-friction identity for `mu=0` and load-case multiplier `0`;
- open-contact and zero-normal-force identities;
- retained sliding direction at zero incremental displacement;
- rotational invariance;
- fail-closed missing slide multiplier and invalid normal force.

No BM4_L production solve is claimed in F1.

## Decision

**F1 GENERIC KERNEL QUALIFIED LOCALLY; BM4_L PRODUCTION FRICTION REMAINS BLOCKED.**

F2 must not integrate L13 until the BM4_L numeric Friction Slide Multiplier is independently pinned or reconstructed without residual fitting.

## Non-scope

No PR #1001 change, no Issue #991 change, no BM4_L profile/tolerance/reference edit, no global nonlinear solver integration, no gap-state controller, no workflow edit, and no merge/readiness transition.
