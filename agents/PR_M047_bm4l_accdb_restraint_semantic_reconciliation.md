# M047 BM4_L — ACCDB restraint semantic reconciliation (F2.6)

## Mission

Reconcile exact ACCDB `INPUT_RESTRAINTS` semantics against the correctly mutated InputXML restraint view before any production nonlinear gap/friction mechanics change.

## Fixed source-domain rule

```text
ACCDB    INPUT_RESTRAINTS.RES_TYPEID -> use directly; no InputXML mutation
InputXML RESTRAINT.TYPE              -> apply the BM4_L mutation exactly once before classification
```

Numeric codes and class labels are source-domain-specific. Reconciliation is by direct source authority plus node/direction/gap/friction evidence; one source is never renamed from the other.

## Exact Windows/ACE row extraction

A read-only exact-head extraction authenticated the pinned BM4_L ACCDB and retained all 46 `INPUT_RESTRAINTS` rows.

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

The retained projection contains `REST_PTR, NODE_NUM, RES_TYPEID, STIFFNESS, GAP, FRIC_COEF, CNODE, XCOSINE, YCOSINE, ZCOSINE, RES_TAG`.

## Direct ACCDB type authority supersedes the first node-set inference

The first F2.6 pass assigned labels to the four ACCDB IDs from their node-set correspondence with corrected InputXML. F2.7 then exposed the database-published `RESTRAINT_TYPES` lookup and forced a correction.

A second read-only exact Windows/ACE audit authenticated both BM4_L and the independent BM4_NL database and read their `RESTRAINT_TYPES` tables directly:

```text
workflow run       31590171146
artifact           9138785351
exact head         76c2c0545d853b11a6c2dd79ffe7c87ce1faaaef
BM4_L ACCDB        64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8
BM4_NL ACCDB       85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21
```

Both databases publish the same active type identities:

| ACCDB `RES_TYPEID` | Direct ACCDB type | Active BM4_L rows |
|---:|---|---:|
| 1 | ANC | 1 |
| 3 | Y | 29 |
| 8 | GUI | 6 |
| 9 | LIM | 10 |

The earlier claim `1=ANC, 3=+Y, 8=LIM, 9=GUI` is therefore **withdrawn**. It was a node-set crosswalk mislabeled as product type authority.

## Correct cross-source reconciliation

The source domains still reconcile exactly by row sets, but their labels must remain separate:

| ACCDB ID | Direct ACCDB label | Corrected InputXML label with same node set | Rows |
|---:|---|---|---:|
| 1 | ANC | ANC | 1 |
| 3 | Y | +Y | 29 |
| 8 | GUI | LIM | 6 |
| 9 | LIM | GUI | 10 |

All four node sets match exactly. That proves row identity across the retained source views; it does **not** authorize replacing one source's class label with the other's.

The file-level `RESTRAINT_DIRECTIONAL_BEHAVIOR = BIDIRECTIONAL` remains independent governing custody and must be preserved in later nonlinear interpretation.

## Friction custody

All 29 ACCDB type-3 (`Y`) rows have global Y direction. Exactly 26 carry positive `FRIC_COEF=0.30000001192092896`, matching the 26 corrected-InputXML `+Y` friction rows by node exactly. The three non-friction nodes remain:

```text
20300
20640
21640
```

Thus friction-site custody is closed even though the two source domains use different class labels.

## Positive-gap source split

BM4_L ACCDB `INPUT_RESTRAINTS.GAP` is the unset sentinel

```text
-1.01010000705719
```

on all 46 rows. It therefore supplies **zero positive gap magnitudes**.

Corrected InputXML retains six positive-gap magnitudes. Their node and physical direction crosswalks against ACCDB are exact, but the direct ACCDB type labels differ from the corrected InputXML labels:

```text
20030  ACCDB GUI / InputXML LIM  gap 25  direction  0, 0,-1
20390  ACCDB LIM / InputXML GUI  gap  5  direction -1, 0, 0
21480  ACCDB GUI / InputXML LIM  gap 25  direction  0, 0, 1
21480  ACCDB LIM / InputXML GUI  gap 10  direction  1, 0, 0
21640  ACCDB LIM / InputXML GUI  gap 10  direction  1, 0, 0
22310  ACCDB LIM / InputXML GUI  gap 10  direction  0, 0,-1
```

Five remain friction-coupled companions on four friction nodes (`20030`, `20390`, `21480`, `22310`); node `21640` remains the additional non-friction positive-gap row.

**Conclusion:** ACCDB directly closes its own type labels, directions and friction rows. Corrected InputXML independently carries the positive gap magnitudes and its own corrected type labels. The two views must be reconciled without forcing either namespace onto the other.

## Implementation boundary

The benchmark-scoped ACCDB decoder now follows direct database authority only:

```text
1 -> ANC
3 -> Y
8 -> GUI
9 -> LIM
```

Unknown IDs remain unsupported; InputXML mutation is never applied to ACCDB.

The F2.6 checker locks the direct lookup, exact row-set crosswalk, 26 friction rows, six direction matches, all-unset ACCDB gaps, `BIDIRECTIONAL` custody, and the withdrawal of the earlier mislabeled mapping.

## Accuracy status

Historical diagnostic remains unchanged:

```text
1719 / 1914 = 89.8119122257%
```

F2.6 does not authorize a new percentage. Source reconciliation is not a nonlinear solve.

## Remaining blocker — F2.7

F2.6 now closes the source identities correctly but still does not establish the nonlinear state machine. Exact product-state evidence is required for OPEN/CLOSED/REOPENED sequencing, state commit/convergence, STICK→SLIDING scheduling, first-slide 15-degree handling, later direction/zero-crossing behavior, and normal-force update basis around the 0.15 threshold.

Only after those semantics are independently closed may governed nonlinear mechanics be integrated and L13 rerun on the unchanged 1,914-row denominator.

## Decision

**F2.6 PASS AFTER DIRECT-AUTHORITY CORRECTION — BM4_L ACCDB DIRECTLY PUBLISHES `1=ANC`, `3=Y`, `8=GUI`, `9=LIM`. THE CORRECTED INPUTXML VIEW HAS EXACT ROW-SET CROSSWALKS `ANC`, `+Y`, `LIM`, `GUI`, BUT THOSE LABELS ARE NOT SUBSTITUTED INTO ACCDB. FRICTION-SITE AND DIRECTION CUSTODY ARE CLOSED; POSITIVE GAP MAGNITUDES REMAIN INPUTXML-SOURCED. NO PRODUCTION NONLINEAR MECHANICS OR NEW L13 ACCURACY IS AUTHORIZED.**
