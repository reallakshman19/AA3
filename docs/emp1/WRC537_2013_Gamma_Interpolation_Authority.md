# WRC 537 non-tabulated gamma interpolation authority — EMP1-25

## Decision

The only source-qualified cylindrical gamma-selection policy currently retained by EMP.1 is:

```text
EXACT_SOURCE_TABULATED_GAMMA_ONLY
```

Non-tabulated gamma interpolation remains **blocked**.

This is not a statement that interpolation is physically impossible. It is an authority statement: the controlled WRC 537 (2013) repository evidence does not presently retain a primary-source instruction that defines whether gamma interpolation is permitted, what quantity is interpolated, or in what interpolation coordinate it is performed.

## Pinned source and existing exact-gamma authority

- WRC Bulletin 537, 2013 edition
- raw PDF SHA-256: `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`
- exact-gamma capability: `validation/emp1/wrc537-2013/exact-gamma-capability-v1.json`

That capability already qualifies:

- exact source-tabulated gamma-row selection;
- machine-roundoff identity around an exact row (`1e-12` relative tolerance);
- explicit Original versus Extrapolated variant selection with no fallback;
- rational curve evaluation in `beta` for the selected row;
- fail-closed rejection of non-tabulated midpoint gamma;
- fail-closed rejection of cross-variant fallback.

It explicitly records:

```text
nonTabulatedGamma = BLOCKED_NO_INTERPOLATION_AUTHORITY
interpolationUsed = false
```

## Three different numerical operations

The following must remain separate:

### A — beta evaluation within one exact gamma row

The retained rational curve fit is evaluated in `beta` after an exact source gamma row is selected. This capability is source-qualified for its bounded scope.

### B — interpolation between gamma rows

This requires a separate source rule. The retained source representation does not establish whether interpolation should be performed on:

- final nondimensional ordinate `Y`;
- rational coefficients `a..j`;
- a transformed ordinate;
- a transformed gamma coordinate;
- a graphically interpolated source curve;
- another quantity defined by WRC.

No default is permitted.

### C — extrapolation outside source gamma rows

This is a separate operation again and remains unauthorized.

Authority for A does not imply B or C.

## Why apparently reasonable interpolation rules are not acceptable yet

A software implementation could easily produce smooth values by linearly blending two curve ordinates or two coefficient rows. That would only prove numerical continuity of the chosen algorithm. It would not prove WRC method fidelity.

Likewise, interpolation in `log(gamma)` or `1/gamma` may appear plausible because WRC charts span a wide gamma range. Plausibility is not source authority.

Production therefore must not select among linear gamma, logarithmic gamma, reciprocal gamma, coefficient interpolation or graphical interpolation based on convenience or match to another program.

## Domain intersection problem

Even if a future primary source explicitly authorizes gamma interpolation, the requested `beta` must also be valid for both bracketing source curves under the authorized variant.

The repository already establishes that Original-curve domains can differ by gamma and that some source curves contain deleted outer segments. Therefore coefficient availability alone cannot define the interpolation domain.

A future interpolation policy must state whether the valid beta range is:

```text
intersection(domain at lower gamma, domain at upper gamma)
```

or another exact source-defined rule.

Until the source answers this, no interpolated gamma route can be qualified.

## Blank-row and variant boundaries

The exact-gamma capability retains one unresolved Original curve row associated with `1B Original` and prohibits inferring the missing gamma identity.

A future interpolation implementation must not silently bridge such a blank/unavailable source row.

Similarly, Original and Extrapolated curve families are separate source variants. They cannot be mixed across an interpolation bracket unless WRC explicitly authorizes that operation.

## Current source observation

The retained WRC 2013 extraction and reconciliation establish exact gamma rows and rational beta evaluation, but do not retain a source-qualified gamma-interpolation instruction.

Direct primary PDF page re-observation for this question was not available in the current connected repository environment. No interpolation rule has therefore been reconstructed from chart appearance, coefficient smoothness, historical software output, or generic numerical practice.

## Authority effect

EMP1-25 source phase changes no production evaluator, gamma selector, route registry, coefficient data, beta domain, pressure policy, SCF policy, off-axis policy, UI, package, tolerance, oracle or workflow.

Current result:

`BLOCKED_PRIMARY_GAMMA_INTERPOLATION_RULE_UNQUALIFIED`

The authorized selection policy remains:

`EXACT_SOURCE_TABULATED_GAMMA_ONLY`.

Production/global/code/release authority remain false.

## Required next evidence

Before implementation, controlled primary WRC evidence must establish at minimum:

1. interpolation permission;
2. exact source locator;
3. interpolated quantity;
4. interpolation coordinate;
5. bracketing-row rule;
6. per-figure treatment;
7. beta-domain rule across the bracket;
8. blank-row behavior;
9. Original/Extrapolated variant rule;
10. outer-gamma extrapolation prohibition or policy;
11. any source-resolution rule if graphical interpolation is intended.

If any of these remain silent or ambiguous, exact-tabulated gamma selection remains the only engineering-authorized behavior.
