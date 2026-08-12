# M047 BM4_L L13 friction support/state localization — F2.1

## Mission

Localize the first L13 friction diagnostic residuals support-by-support before changing nonlinear mechanics.

This layer is **diagnostic evidence only**. It does not select CAESAR stick/slide/contact state from the reference response, fit a Slide Multiplier, change tolerances, or authorize L13/L7 production execution.

## Baseline retained

PR #1067 established the first numerical L13 diagnostic on the exact reconstructed L6 operator:

- governed rows: `1,914`
- passed: `1,719`
- failed: `195`
- pass rate: `89.8119122257%`
- diagnostic states: `7 STICK / 19 SLIDING`
- `mu = 0.3`
- independently validated friction stiffness: `175126835.24647635 N/m`

The comparison denominator and comparator are unchanged.

## Restraint-force localization

The 13 failed restraint-force components occur at 12 of the 26 friction sites.

Largest force-vector residual norms:

| Node | Diagnostic state | Gap companions | Force residual norm N | Tangential residual N | Normal residual N |
|---|---|---:|---:|---:|---:|
| 20170 | SLIDING | 0 | 336.593 | 319.947 | 104.539 |
| 20250 | STICK | 0 | 291.713 | 290.680 | 24.533 |
| 20090 | SLIDING | 0 | 207.387 | 168.401 | 121.040 |
| 20030 | STICK | 1 | 204.517 | 203.757 | 17.610 |
| 21740 | SLIDING | 0 | 113.660 | 113.356 | 8.308 |
| 22140 | SLIDING | 0 | 73.611 | 73.609 | 0.486 |
| 20710 | SLIDING | 0 | 67.053 | 65.050 | 16.267 |
| 21800 | SLIDING | 0 | 62.925 | 62.922 | 0.639 |
| 20390 | STICK | 1 | 59.461 | 59.461 | 0.047 |
| 20440 | SLIDING | 0 | 59.122 | 59.117 | 0.735 |

The full 26-site ledger is in `m047-bm4l-l13-friction-support-localization-sites.csv`; the summary/provenance contract is in `m047-bm4l-l13-friction-support-localization.json`.

## Gap versus ordinary friction boundary

Four friction nodes own positive-gap companions: `20030`, `20390`, `21480`, `22310`.

At the current retained-contact diagnostic state:

- gap sites account for only **4 / 13** failed restraint-force components;
- non-gap friction sites account for **9 / 13**;
- a topology-only nearest-site allocation places **12 / 195** weighted failed governed components nearest the gap sites;
- the remaining **183 / 195** are nearest ordinary friction sites.

This does **not** prove gap/contact mechanics are correct or unimportant. It only establishes that gap sites are not the dominant first localization target in the current residual surface.

## Sliding versus stick localization

The topology-only burden allocation gives:

- nearest SLIDING sites: **154 / 195**
- nearest STICK sites: **41 / 195**

Highest topology-proximity burdens are:

`20710 26`, `21930 25`, `21860 16`, `22020 14.5`, `20170 14`, `22140 14`, `21740 13`, `22070 12.5`, `21800 11`, `20440 9`.

The metric assigns each failed governed component to the nearest friction site by analysis-graph edge distance and splits ties equally. It is **not a physical sensitivity coefficient** and may not be used to select a CAESAR state or parameter.

## Direct failed restraint-force components

The largest four absolute failures are:

- `20170 UZ`: diagnostic `3076.24 N`, CAESAR `2767.19 N`, `11.1683%`
- `20250 UZ`: diagnostic `-3098.49 N`, CAESAR `-2809.86 N`, `10.2720%`
- `22140 UZ`: diagnostic `701.479 N`, CAESAR `628.062 N`, `11.6895%`
- `20710 UZ`: diagnostic `-559.811 N`, CAESAR `-624.738 N`, `10.3927%`

The much larger relative misses at very small tangential reactions remain visible in the ledger and are not suppressed.

## Decision

**F2.1 localization complete: ordinary friction state/update behavior is the next qualified diagnostic target before gap/contact mechanics.**

Next batch should test only independently documented CAESAR friction state-history controls on L13, while preserving:

- the exact L6 reconstructed operator;
- `mu=0.3`;
- `175126835.24647635 N/m` friction stiffness;
- the literal 1,914-row comparator;
- the current gap/contact state unless independently changed by contact admissibility mechanics.

Do not use the CAESAR L13 residual surface to choose Slide Multiplier, stick/slide state, update thresholds, gap state, or comparison tolerance.

## Non-scope

No PR #1001 modification, no Issue #991 change, no L7/L15 execution, no comparator/tolerance change, no gravity/bend/reducer mechanics change, no workflow change, no merge, and no ready-for-review transition.
