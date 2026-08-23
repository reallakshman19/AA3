# WRC 537 gamma=5 lower-beta authority — EMP1-24

## Decision

The exact-tabulated `gamma=5` Original-curve route remains bounded to:

```text
0.05 <= beta <= 0.5
```

This source phase does **not** authorize `beta < 0.05`.

The reason is not that WRC 537 has been proven to prohibit every lower beta. The existing repository evidence classifies `beta=0.05` as a conservative product boundary that lies inside all previously reviewed gamma=5 curves and explicitly says it is **not claimed as a general WRC lower limit**. By contrast, `beta=0.5` is retained as a primary gamma=5 chart limit.

The missing item is exact source custody for the lower endpoint of every Original curve actually consumed by the current eight-point route.

## Pinned source

- WRC Bulletin 537, 2013 edition
- raw PDF SHA-256: `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`
- beta definition: §4.2.2.1, Eq. 26, `beta = 0.875*r0/Rm`
- curve-limit rule: §4.4, Original curves must not be used beyond their indicated limits

The source-bound product-domain record is:

`validation/emp1/wrc537-2013/cylindrical-original-bounded-domain-v1.json`.

## Actual eight-point route figure set

The route-domain intersection must use the figures consumed by the current Table-5 eight-point semantics, not the historical off-axis comparison set.

Unique required Original figures are:

```text
1A  2A  3A  4A
1B  2B  3B  4B
1C  1C-1  2C  2C-1  3C  4C
```

The basis is the reviewed Table-5 interpretation plus the later longitudinal-moment authority:

- circumferential moment: `1A/2A/3A/4A` as applicable;
- longitudinal moment membrane: `3B/4B`;
- longitudinal moment bending for the production eight-point route: `1B/2B`;
- radial load families: `1C`, `1C-1`, `2C`, `2C-1`, `3C`, `4C`.

`1B-1/2B-1` are excluded from this production-domain intersection because EMP1-23 retains them as comparison-only off-axis maxima pending separate flexible-nozzle/recovery authority.

## Why beta=0.05 cannot yet be lowered

The existing source review established that all required gamma=5 curves cover the present product band through `0.05 <= beta <= 0.5`.

It did **not** retain, for all 14 current route figures:

- an exact numeric lower beta endpoint;
- endpoint inclusivity;
- evidence that no lower plotted segment was deleted or omitted;
- a source statement that the rational-fit coefficients are authorized below the plotted lower limit;
- a general WRC cylindrical lower-beta limit that can replace the per-curve intersection.

In the current connected environment the pinned PDF binary identity is available, but direct page-level primary-source re-observation is not. No graphical endpoint is therefore reconstructed or digitized.

## Prohibited shortcuts

The following are not engineering authority:

1. the rational equation returning a finite value at `beta < 0.05`;
2. coefficient rows existing for gamma=5;
3. visually estimating where a plotted curve appears to begin;
4. assuming all 14 figures share the same lower endpoint;
5. using an Extrapolated curve family as a fallback;
6. substituting the off-axis `1B-1/2B-1` figures for `1B/2B`.

A coefficient fit can be mathematically evaluable outside the source-authorized chart interval. Numerical evaluability is not domain authority.

## Upper boundary retained

This issue does not reopen `beta=0.5`.

The existing bounded-domain record classifies it as:

`PRIMARY_CHART_LIMIT_FOR_GAMMA5_REQUIRED_ORIGINAL_CURVES`.

Therefore `beta > 0.5` remains blocked independently of the unresolved lower-endpoint question.

## Authority effect

EMP1-24 changes no production adapter, route registry, Table-5 equation, coefficient, oracle, tolerance, pressure policy, SCF policy, off-axis policy, UI, package, or workflow.

Current result:

`BLOCKED_BETA_BELOW_0P05_PRIMARY_LOWER_ENDPOINT_UNQUALIFIED`

Production/global/code/release authority remain false.

## Required next evidence

To widen the lower beta boundary, obtain source-qualified numeric lower endpoints and inclusivity for every one of the 14 required Original figures, then take the strict intersection of those domains.

If any required endpoint is only graphical, ambiguous, or unreadable, `beta < 0.05` remains blocked unless a separate owner-authorized digitization methodology is qualified first.
