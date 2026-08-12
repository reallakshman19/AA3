# M047 BM4_L — exact-build nonlinear state observability (F2.7)

## Mission

Determine whether the retained exact-build BM4 package contains sufficient product-state evidence to define L13 gap/contact and friction state-history semantics without response fitting.

## Required evidence

F2.7 requires explicit evidence for the nonlinear state machine, including enough information to establish:

- gap/contact OPEN/CLOSED/REOPENED ordering;
- contact-state commit/convergence ordering;
- STICK -> SLIDING scheduling;
- first-slide 15-degree handling;
- subsequent friction-direction / zero-crossing behavior;
- held versus recomputed normal-force basis around the 0.15 variation threshold.

Final forces/displacements are not accepted as hidden state-history authority.

## Authenticated retained package

The successful audit authenticates the exact Common revision `179c4831cf521cf797c13699cfbbd118315c9244` objects:

```text
Output_BM4.xml
  git blob  d36be50bc8e272c2ab29e279f25bba55b2ccc392
  sha256    ab3d9d651860ad393726c3e0b5b5beba428653345ac313458f07716369b0312e

InputXML_BM4.xml
  git blob  3423d220374a17f67addd3c8c0c44300ffa46251
  sha256    ef941f535aa7af3aee403dd0304e65a378d6b3c2189285d65aa7e3e6f2c34cbb

BM4_NL.zip
  git blob  86a803ed27ebdbd2836452dc2e874c3458aa204c
  sha256    60dd16b2a4f556d82b16f79149e866c72e4baf9c4d333148bd34b509f9084fbf
  member    BM4_NL.ACCDB
  member sha256 85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21
```

A prior incorrect `Output_BM4.xml` blob expectation was rejected by the strict custody check before analysis; no evidence from that failed attempt was accepted.

## Output XML observability audit

Successful run/artifact:

```text
workflow run   31589715874
artifact       9138596059
exact head     0b62da7ed030b1f76723a2d562533010a7b91cf2
artifact digest sha256:9e250b7d4a83ad51a33462639521a9c70155b5a0e2b0e81c915c8f4a2f5dbda4
```

`Output_BM4.xml` contains final report structures, including 14 each of displacement, restraint, global-force, local-force and component-stress reports. It contains 644 `RESTRAINT` elements.

However the exact text contains zero occurrences of the state-history terms required to reconstruct the nonlinear controller:

```text
ACTIVE    0
BOUNDARY  0
STATUS    0
STICK     0
SLID      0
FRICT     0
CONTACT   0
ITER      0
CONVERG   0
STATE     0
OPEN      0
CLOSED    0
REOPEN    0
```

`GAP` appears only in final report/type-label text; it does not provide active-set history.

## Exact BM4_NL ACCDB schema audit

Because binary-string scanning of `BM4_NL.ACCDB` produced terms such as `STATUS`, `FRICT`, `ITER`, `GAP`, `OPEN` and `CLOSED`, F2.7 did not treat those strings as proof. A second authenticated Windows/ACE audit opened the database read-only and inspected all tables and columns.

```text
workflow run   31589915281
artifact       9138684389
exact head     ce80fe215d8ee1da143cb8115420d6b2d2574abd
artifact digest sha256:f8ea5da1719cdef07094753c478831d04a0071cdcbd6d9de77535b1dd07b9822
```

The database contains 40 tables. The apparent state-like strings resolve to unrelated/source/final-result fields:

```text
STATUS -> OUTPUT_* CHECK_STATUS       code-stress result status
ITER   -> INPUT_BENDS.NUM_MITER       miter-bend input
FRICT  -> INPUT_RESTRAINTS.FRIC_COEF  source coefficient
GAP    -> INPUT_RESTRAINTS.GAP        source gap field
```

There are no table/column identities for `ACTIVE`, `BOUNDARY`, `STICK`, `SLID`, `CONTACT`, `CONVERG`, `STATE`, `OPEN`, `CLOSED` or `REOPEN`.

`INPUT_RESTRAINTS` has 46 rows, 26 positive-friction rows and zero positive gap magnitudes. `OUTPUT_RESTRAINTS` has 184 final-result rows: 46 rows each for cases 2, 17, 19 and 20. Those rows retain final reactions and type labels, not iteration history or active-state flags.

## Direct restraint-type authority correction discovered during F2.7

The schema audit exposed a direct `RESTRAINT_TYPES` lookup, so a third authenticated audit compared that table in BM4_L and BM4_NL:

```text
workflow run   31590171146
artifact       9138785351
exact head     76c2c0545d853b11a6c2dd79ffe7c87ce1faaaef
artifact digest sha256:5fddedddcc076f498ce3c1e2dd6ef7a5a035e8bc8739d2be3fdbe2166fc77eee
```

Both databases publish the same active IDs:

```text
1 -> ANC
3 -> Y
8 -> GUI
9 -> LIM
```

This direct authority corrects the earlier F2.6 node-set-label inference. F2.6 has been revised accordingly: corrected InputXML labels remain a separate row-set crosswalk and are not substituted into ACCDB.

The lookup correction improves source authority but supplies no nonlinear state history.

## State-observability result

The retained package was exhausted through:

1. authenticated output/input XML tag, attribute and keyword inventory;
2. authenticated `BM4_NL.zip` member inventory;
3. read-only ACE schema/row audit of all 40 `BM4_NL.ACCDB` tables;
4. direct `RESTRAINT_TYPES` comparison across authenticated BM4_L and BM4_NL databases.

None of those sources retains enough evidence to determine:

```text
OPEN/CLOSED/REOPENED ordering                    NOT OBSERVED
contact state commit/convergence ordering        NOT OBSERVED
STICK -> SLIDING scheduling                      NOT OBSERVED
first-slide 15-degree handling                   NOT OBSERVED
later direction/zero-crossing handling           NOT OBSERVED
0.15 normal-force update basis                   NOT OBSERVED
```

Final reaction magnitudes are expressly prohibited from selecting those states or rules.

## Accuracy status

Historical diagnostic remains:

```text
passed 1719
failed  195
total  1914
accuracy 89.8119122257%
```

There is no legitimate new L13 percentage. F2.7 has not supplied the state machine required for F2.8 integration.

## Required external evidence

The next engineering input must be an exact-build CAESAR II `14.00.00.0910 (Build 231113)` L13 **Active Boundary Conditions and nonlinear iteration/state trace** (or an equivalent exact-build export that explicitly exposes the same state transitions and update ordering).

The trace must be source authority, not generated by choosing the state sequence that minimizes the BM4_L comparison error.

## Decision

**F2.7 RETAINED-SOURCE AUDIT COMPLETE — BLOCKED. THE PINNED OUTPUT XML AND BM4_NL ACCDB RETAIN SOURCE DATA, TYPE LOOKUPS AND FINAL RESULTS BUT NOT THE REQUIRED ACTIVE-BOUNDARY / CONTACT / FRICTION ITERATION STATE HISTORY. NO PRODUCTION NONLINEAR MECHANICS OR L13 RESCORE IS AUTHORIZED. HISTORICAL L13 REMAINS 1719/1914 = 89.8119122257%.**
