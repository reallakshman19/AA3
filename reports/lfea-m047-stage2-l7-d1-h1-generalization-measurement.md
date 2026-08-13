# M047 Stage 2 — real L7 D1/H1 generalization measurement

## Boundary

Real pinned `BM4_L.ACCDB` (`64c05a50...82f8`), L7 `OPE / W+T1+P1`.
D1 and H1 are the unchanged L13 mechanics, measured directly at full load with **no L7 load stepping**.
Both variants were executed twice. The production solver was restored byte-for-byte after each workspace-only transform; SHA-256 remained `9976cda4...dbfa`.

## Results

| metric | D1 L7 | H1 L7 |
|---|---:|---:|
| vectors within ±10% | **10/23** | **9/23** |
| normals within ±10% | **22/23** | **22/23** |
| utilization-regime proxy matches | 9/23 | 9/23 |
| mean vector error | 27.08% | **21.55%** |
| median vector error | 17.15% | **14.28%** |
| worst vector error | 110.33% | **90.15%** |
| worst absolute normal error | 24.90% | 24.31% |
| deterministic repeats | PASS | PASS |

H1 improves 14/23 rows and regresses 9/23. It gains one vector pass, node **22220** (`23.74% → 1.47%`), but loses two D1 passes: **20520** (`7.32% → 11.46%`) and **21930** (`0.82% → 12.08%`). Therefore the hard pass count falls from 10/23 to 9/23 even though the mean/median/worst errors improve.

Large H1 repairs include **20580** `110.33% → 47.73%`, **22020** `109.06% → 36.28%`, **21740** `51.03% → 22.31%`, and **22120** `35.08% → 23.18%`. The decisive large regression is **22370** `22.51% → 90.15%`.

## Shared normal failure

Both variants fail the existing ±10% normal gate only at node **20350**:

- CAESAR reference normal: `462.691 N`
- D1: `347.469 N` (**-24.90%**)
- H1: `350.208 N` (**-24.31%**)

H1 changes the solved proxy regime there from `LOCKED_AFTER_SLIP` to `SLIDING`, but the normal error remains about 24%, so the normal discrepancy is not resolved by the H1 re-lock transition mechanic.

## Custody

- PR #1101 source head: `70fb5e08b4c390ebc432cea06ab2c0be14496a6a`
- temporary measurement head: `0c29bfe7f4d9b906f442316cd76f6623e5a711de`
- Actions run: `31710577472`
- artifact: `9185468387`
- artifact digest: `sha256:33205bf9ca1836aa0da7fb8abbf02e442849a183b7594a421fcf8081cdad5e29`
- D1 repeat restraint SHA-256: `6ce2e346ea480551e5f0e94c8e3886db9097fdd56981e75394bdacadb9b31afe` both repeats
- H1 repeat restraint SHA-256: `1da0a49d95b10a66f478dd0ed976ca45b3856d552a1fb8b1bd5da71cd352a974` both repeats

`referenceRegimeProxy` in the JSON is the existing tuning-loop utilization proxy (within 2% of the Coulomb surface => `SLID`); it is not asserted as a raw CAESAR `SOL` field.

## Decision

**`L7_H1_DOES_NOT_GENERALIZE_CLEANLY_KEEP_D1_BASELINE`**

H1 is not promoted by L7. D1 itself is also not L7-qualified because it reaches only 10/23 vectors and 22/23 normals. Do not tune L7, select a load-step count, widen tolerances, change comparison rules, or add node exceptions from this result. The next high-information discriminator is the shared **20350 normal-reaction discrepancy**, ideally by measuring the unchanged production/B0 L7 result to determine whether the normal error precedes D1/H1 or is introduced by the direction mechanic.
