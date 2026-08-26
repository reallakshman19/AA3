# Provenance — `benchmarks/LFEA/BM4`

A real CAESAR II piping model (96 elements, 97 nodes) **and its real CAESAR II
solved output**, vendored so this repository has a committed model that is not
one this project authored for itself.

That distinction is the whole point of this directory. Phases 1-7 of the LFEA
pipeline work were verified against a 2-element fixture written by the same
process that was being verified, which passed *because* it was trivial. When the
Owner loaded a real model, it returned 72 BLOCK findings and "Available cases:
None". Nothing in this repository could have caught that, because no real
InputXML model was committed anywhere in it.

## Source

`reallaksh19/Common`, pinned at commit `3fe20c7db76feb6ea583fb658b67b3a55afd4fe3`,
path `LFEA/BM4/`. Both files fetched verbatim over HTTPS from
`raw.githubusercontent.com` at that pinned commit; neither was edited.

| File | SHA-256 | Bytes |
|---|---|---|
| `InputXML_BM4.xml` | `ef941f535aa7af3aee403dd0304e65a378d6b3c2189285d65aa7e3e6f2c34cbb` | 216,333 |
| `Output_BM4.xml` | `ab3d9d651860ad393726c3e0b5b5beba428653345ac313458f07716369b0312e` | 2,669,843 |

`InputXML_BM4.xml`'s hash was confirmed to match the exact file the Owner ran —
the finding codes and counts it reproduces are identical to the error output they
reported, so this is the real failing model, not a lookalike.

## `InputXML_BM4.repaired.xml` — derived, not vendored

| File | SHA-256 | Bytes |
|---|---|---|
| `InputXML_BM4.repaired.xml` | `74372c083b6d6107f8d66ac2aadd8a8f746ab8fade42dbe513662a67b0659ea2` | 216,336 |

**This file is generated, not a second source model.** It is produced from
`InputXML_BM4.xml` by `scripts/lfea-bm4-collinear-repair.mjs`, which is committed
alongside it and can re-verify the committed bytes at any time:

```
node scripts/lfea-bm4-collinear-repair.mjs --check
```

### What was changed, and why it is a model repair rather than a tool relaxation

The original model raises 7 `TOPOLOGY_COLLINEAR_SEGMENT_OVERLAP` findings on
segments `IX-S89`..`IX-S93`. **The detector is correct and was not touched.**
Direct inspection of the ingested geometry shows the cause:

```
IX-S89  22350->22360  L= 850.0 mm  delta = (-850, 0, 0)
IX-S90  22360->22370  L=   1.0 mm  delta = (  +1, 0, 0)   <- backtracks
IX-S91  22370->22380  L=   1.0 mm  delta = (  +1, 0, 0)   <- backtracks
IX-S92  22380->22390  L=   1.0 mm  delta = (  +1, 0, 0)   <- backtracks
IX-S93  22390->22400  L=2700.0 mm  delta = (-2700, 0, 0)
```

The run travels in −X throughout (−850 before, −2700 after, and every element
after that also −X). The three 1 mm elements declare `DELTA_X="1.000000"`, so
they walk *backwards* along centreline the run has already covered: their spans
lie on top of `IX-S89`, and `IX-S93` then re-covers the 3 mm they walked back
over. The spans genuinely coincide — `lineDistance` is exactly 0.0. This is a
sign error in the source model, so the correction belongs in the model.

An earlier claim made during this investigation — that downgrading the finding
"would silently double-count stiffness" — was checked directly against this
topology and **does not hold for it**: there are 0 duplicate node-pairs, every
node in the overlap region has degree 2, and the 6 "mid-span" hits are purely
geometric (node 22370 lies on `IX-S89`'s line but connects only to `IX-S90`/
`IX-S91`). That was reported as a correction before acting on it. It is recorded
here because it is the reason the repair takes this shape: the finding is a real
geometric coincidence to fix in the model, not a stiffness defect and not noise
to suppress.

### The rule, and the bound the Owner set on it

The script flips a short element's declared delta when, and only when, all three
hold:

1. the element's declared length is **≤ 25 mm** (the Owner's explicit bound), and
2. it is axis-parallel to both its nearest preceding and nearest following **long**
   element (> 25 mm), and
3. it opposes both of them (negative dot product with each).

Nearest-*long*-neighbour is required rather than immediately-previous-element: a
naive "opposes the previous element" test catches only `IX-S90`, because `IX-S91`
and `IX-S92` are parallel to the already-wrong `IX-S90`.

On this file the rule fires on exactly 3 elements (90, 91, 92) and makes exactly
3 attribute edits (`DELTA_X` `1.000000` → `-1.000000` on each). Every other byte
is preserved — only the numeric text inside the matched attribute is rewritten,
by byte range, at its declared precision.

## Pre-flight results (this repository, `DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_V1`)

| Model | Status | PASS | CONDITIONAL | BLOCK | Available cases |
|---|---|---|---|---|---|
| `InputXML_BM4.xml` as received | BLOCK | 1021 | 122 | **72** | none |
| after Stage A1/A2/A3 | BLOCK | 1021 | 161 | **11** | none |
| `InputXML_BM4.repaired.xml` | WARN | 1021 | 164 | **0** | `W`, `WP`, `WT`, `WPT`, `F1`..`F7` |

`solveAuthorized` is `false` on the repaired model, which is correct: a WARN
verdict requires explicit reviewer authorization before a solve, and that gate is
deliberately not bypassed.

The 11 findings that remained after Stage A were the 7 collinear-overlap findings
plus the 4 `REQUIRED_CAPABILITY_BLOCKED` findings derived from them — i.e. the
repair clears them and nothing else was hiding behind them.

The `F1`..`F7` cases are the model's own seven declared `FORCESMOMENTS` vector
sets, now compiled rather than reported as uncompiled. They are alternative
occasional-load directions and are deliberately **not** summed into one case.

## What this fixture is for

`Output_BM4.xml` is real CAESAR II output for this exact model. It is the gold
standard: passing pre-flight is not the same as being right. Agreement with these
displacements and restraint reactions — within a declared tolerance, with any
disagreement reported rather than tuned away — is what decides whether the
linearized friction/gap approximations are acceptable, and it is what settles the
GUIDE(9)/LIM(8) exact-vs-approximation classification.
