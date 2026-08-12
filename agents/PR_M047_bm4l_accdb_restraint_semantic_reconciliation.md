# M047 BM4_L — ACCDB restraint semantic reconciliation (F2.6)

## Mission

Reconcile exact ACCDB `INPUT_RESTRAINTS` semantics against the correctly mutated InputXML restraint view before any production nonlinear gap/friction mechanics change.

## Fixed source-domain rule

```text
ACCDB    INPUT_RESTRAINTS.RES_TYPEID -> use directly; no InputXML mutation
InputXML RESTRAINT.TYPE              -> apply the BM4_L mutation exactly once before classification
```

No numeric-code equality is assumed across source domains. Reconciliation is by node, physical direction, gap and friction evidence.

## Exact Windows/ACE extraction

A dedicated read-only exact-head extraction ran on Windows with authenticated Microsoft ACE against the pinned BM4_L ACCDB.

```text
workflow run       31587484308
artifact           9137722839
exact head         5b72b4a48c9b82fb4a9783b017286e5e28202b42
ACCDB SHA-256      64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8
INPUT_RESTRAINTS   08460f1ef574ec6d6c95c46155d5ad4c1acee42e336a7b7e300ed08e0878866a
row projection     7af58e11640346880910a2bd0a54fcae6b7f8ee418be26fe0165fbc018732bc5
rows               46
source bytes       unchanged
```

The retained row projection contains `REST_PTR, NODE_NUM, RES_TYPEID, STIFFNESS, GAP, FRIC_COEF, CNODE, XCOSINE, YCOSINE, ZCOSINE, RES_TAG` and is sorted deterministically by `REST_PTR`.

## ACCDB type semantics closed for BM4_L

The ACCDB contains four `RES_TYPEID` values. Their complete node sets match the independently corrected InputXML class node sets exactly:

| ACCDB `RES_TYPEID` | BM4_L class | Rows | Node-set reconciliation |
|---:|---|---:|---|
| 1 | ANC | 1 | exact |
| 3 | +Y | 29 | exact |
| 8 | LIM | 6 | exact |
| 9 | GUI | 10 | exact |

This is **BM4_L-specific authority**, established by exact row-level reconciliation. It is not promoted as a generic CAESAR enum table.

No ACCDB ID is mutated. In particular, ACCDB `3` is not converted to the corrected InputXML code `14`; both source-domain values independently identify the same BM4_L `+Y` row set.

## Friction reconciliation

All 29 ACCDB `RES_TYPEID=3` rows point in global `+Y`.

Exactly 26 carry positive friction coefficient `0.30000001192092896`, which is the ACCDB floating representation of the source `0.3`. The friction-node set matches corrected InputXML exactly. The three non-friction `+Y` nodes remain:

```text
20300
20640
21640
```

Therefore F2.6 closes BM4_L restraint **type, direction and friction-site custody**.

## Gap magnitude source split discovered

The exact ACCDB extraction also resolves an important negative fact: `INPUT_RESTRAINTS.GAP` is the unset sentinel

```text
-1.01010000705719
```

on **all 46 ACCDB rows**.

That includes the six rows for which corrected InputXML carries positive gap magnitudes. The physical directions reconcile exactly for all six:

```text
20030 LIM  25  direction  0, 0,-1
20390 GUI   5  direction -1, 0, 0
21480 LIM  25  direction  0, 0, 1
21480 GUI  10  direction  1, 0, 0
21640 GUI  10  direction  1, 0, 0
22310 GUI  10  direction  0, 0,-1
```

Five remain friction-coupled companion rows on four friction nodes (`20030`, `20390`, `21480`, `22310`); `21640` remains the additional non-friction GUI gap.

**Conclusion:** ACCDB closes class/direction/friction identity, but the positive gap magnitudes are not present in ACCDB `GAP`. Their retained source custody remains the correctly normalized InputXML view. This source split must not be erased by forcing both sources into one numeric/data namespace.

## File-level directionality

The user-verified BM4_L file setting remains governing:

```text
RESTRAINT_DIRECTIONAL_BEHAVIOR = BIDIRECTIONAL
```

F2.6 does not reinterpret that setting from result accuracy.

## Implementation boundary

A benchmark-scoped decoder now encodes only the exact F2.6 BM4_L ACCDB mapping:

```text
1 -> ANC
3 -> +Y
8 -> LIM
9 -> GUI
```

Unknown IDs remain unsupported. The decoder never applies InputXML mutation.

A focused F2.6 checker locks:

- exact 46-row extraction custody;
- exact four node-set mappings;
- exact 26-row friction inventory;
- exact six positive-gap direction matches;
- ACCDB gap fields all unset;
- `BIDIRECTIONAL` custody;
- `productionNonlinearMechanicsAuthorized=false`;
- `l13RescoreAuthorized=false`.

## Accuracy status

Historical diagnostic remains unchanged:

```text
1719 / 1914 = 89.8119122257%
```

F2.6 does **not** publish a new L13 percentage because it is source/semantic reconciliation, not a qualified nonlinear solve.

## Remaining blocker — F2.7

F2.6 is now complete for type/direction/friction mapping, but it does not determine the nonlinear active-state sequence. Exact-build CAESAR evidence is still required for:

- LIM/GUI gap OPEN/CLOSED/REOPENED ordering;
- contact-state commit/convergence ordering;
- STICK -> SLIDING scheduling;
- first-slide 15-degree handling;
- subsequent friction-direction / zero-crossing behavior;
- held versus recomputed normal-force basis around the 0.15 variation threshold.

Only after F2.7 closes those rules may governed nonlinear mechanics be integrated and L13 rerun on the unchanged 1,914-row denominator.

## Decision

**F2.6 PASS — BM4_L ACCDB restraint IDs are exactly reconciled as `1=ANC`, `3=+Y`, `8=LIM`, `9=GUI`; all 26 friction rows and all six relevant directions reconcile exactly. ACCDB contains no positive gap magnitudes, so gap magnitude custody remains in corrected InputXML. NO PRODUCTION NONLINEAR MECHANICS OR NEW L13 ACCURACY IS AUTHORIZED UNTIL F2.7 CLOSES ACTIVE-BOUNDARY AND STATE-HISTORY SEMANTICS.**
