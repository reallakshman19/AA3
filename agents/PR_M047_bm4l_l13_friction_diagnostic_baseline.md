# M047 BM4_L L13 friction diagnostic baseline

## Mission

Produce the first reproducible numerical L13-vs-CAESAR comparison without response fitting, while keeping the result below the production-authority boundary until CAESAR's remaining nonlinear state semantics are independently resolved.

## Stack

- Base PR: #1064 — independent friction evidence measurement replay (F1.9).
- Base head: `f3f079b77978ed7c532709cea91c2150a95f03d2`.
- Head branch: `agent/m047-bm4l-l13-friction-diagnostic-baseline`.

## Corrected static friction stiffness authority

The prior F1.6 diagnostic interpreted BM4's InputXML translational-stiffness display label (`N/cm`) as the source unit of the global CAESAR `FRICT_STIF=1,000,000` configuration value. Independent product evidence falsifies that interpretation.

Official CAESAR friction guidance defines the static friction stiffness default as `1,000,000 lb/in`, which normalizes to:

```text
175,126,835.24647635 N/m
```

Pinned BM1 on the same CAESAR `14.00.00.0910 Build 231113` independently reproduces that stiffness at two positive-friction/no-gap supports:

```text
node 70  175,118,536.918 N/m  (-0.00474%)
node 80  175,144,038.701 N/m  (+0.00982%)
```

Therefore `100,000,000 N/m` is retained only as a superseded model-display conversion and is no longer static-friction authority. No BM4_L response was used to select the corrected value.

## Exact L6 system reconstruction

The exact Windows/ACE production artifact from M047 run `31513907633`, artifact `9110308571`, retains every analysis element's 12x12 global stiffness and load/recovery vectors.

From those retained matrices and the 51 grounded support springs, the L6 `W+P1` system was reconstructed independently of the repository production solve:

```text
analysis nodes       323
DOFs                 1,938
analysis elements    322
grounded springs      51
```

Reconstruction checks:

```text
max |K*u - f|                 1.252221409e-6
max solved displacement delta 1.852485396e-12
```

This passes the required zero-friction identity gate and establishes a trustworthy system for offline L13 diagnostics.

## First L13 numerical diagnostic

L13 has the same nominal `W+P1` loading as L6 and a friction multiplier of 1. The diagnostic overlays only the independently resolved static stiffness-method law:

- model `mu=0.3`;
- corrected friction stiffness `175126835.24647635 N/m`;
- stick reaction from tangential displacement times friction stiffness;
- sliding magnitude `mu * current normal force`;
- deterministic fixed-point iteration with 0.2 sliding-force under-relaxation;
- the exact reconstructed L6 grounded-restraint state is retained; no gap/contact state is selected from CAESAR response data.

The iteration converges in 82 iterations to 7 stick and 19 sliding friction sites.

### Canonical governed result

Using the existing literal `<10%` governed comparison and exact-zero absolute boundaries:

```text
passed   1,719
failed     195
total    1,914
pass     89.8119122257%
```

Breakdown:

| Quantity | Pass | Fail | Total |
|---|---:|---:|---:|
| Displacement | 279 | 12 | 291 |
| Rotation | 264 | 27 | 291 |
| Restraint force | 77 | 13 | 90 |
| Restraint moment | 90 | 0 | 90 |
| Source force FROM | 256 | 32 | 288 |
| Source force TO | 255 | 33 | 288 |
| Source moment FROM | 249 | 39 | 288 |
| Source moment TO | 249 | 39 | 288 |

This is the first actual numerical L13 comparison, but it is **diagnostic accuracy only**, not a production-qualified CAESAR parity percentage.

## Gap-state falsification

A separate diagnostic removed all five positive-gap companion springs before solving the same Coulomb model. It converged to a substantially worse comparison:

```text
1,583 / 1,914 = 82.7063740857%
```

That result is retained only as a falsification. The contact state must not be selected by whichever choice gives the better BM4_L percentage.

## Why 89.8119% is not yet promotable

The source and static-law side is now much stronger, but exact CAESAR state evolution remains unresolved:

```text
FRICTION_SLIDE_MULTIPLIER_AUTHORITY_REQUIRED
FRICTION_STATE_HISTORY_SEMANTICS_AUTHORITY_REQUIRED
GAP_CONTACT_STATE_SEMANTICS_AUTHORITY_REQUIRED
```

Public CAESAR documentation establishes the `mu*N` physical cap, the following-iteration transition to constant sliding force, the 15-degree angle control and the 15% normal-force update control. It does not provide a complete reproducible state-update/contact algorithm or the numeric internal Slide Multiplier. A direct attempt to apply the documented 15% update trigger without the missing internal semantics chatters rather than producing a defensible CAESAR-equivalent solution, so it is not used as a result.

## Decision

**L13 now has a reproducible 89.8119% diagnostic governed pass rate and a verified zero-friction system reconstruction. Qualified L13 accuracy remains blocked on nonlinear state semantics; no parameter or contact-state fitting is permitted.**

## Non-scope

No PR #1001 modification, no Issue #991 change, no comparator/tolerance weakening, no gravity/reducer/bend tuning, no Slide Multiplier assumption, no response-fitted state selection, no L7/L15 promotion, no merge and no ready-for-review transition.
