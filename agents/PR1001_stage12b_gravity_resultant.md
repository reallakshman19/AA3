# PR1001 Stage 12B — Gravity Resultant Closure / First-Moment Gate

## Scope

This stage continues the local-first residual investigation after Stage 12A. It uses only the existing governed BM4_L artifact and does **not** change solver mechanics, stiffness, load vectors, benchmark references, comparator tolerances, or the Stage-7 zero-boundary candidate.

The immediate question is whether the remaining L2 gravity-related source-action residuals can be explained by an incorrect **total applied gravity resultant** before considering centroid/first-moment placement or stiffness.

## Authority and inputs

No workflow was rerun.

Read-only evidence:

- governed implementation head: `7488ba76126f8240bb61c80fad243cf096c5fe08`;
- completed M047 BM4_L qualification run: `31457644192`;
- artifact ID: `9088676941`;
- artifact digest: `sha256:8819dbbbf21aff8e314fe6cae85db0c3407afc12ca71dde3b459442242d3e934`;
- `bm4l-actual.json` mechanics/recovery ledger;
- `bm4l-root-cause.json` source-level gravity ledger;
- pinned ACCDB member SHA-256: `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`.

The root-cause artifact classifies all 96 source elements and records each source's modeled gravity weight. Per gravity-enabled case the topology inventory is:

- 60 straight sources;
- 20 rigid sources;
- 12 bend sources;
- 4 reducer sources.

## Source-level resultant identity

For every analysis descendant of one source element, take the stored `equivalentLoadGlobal` and sum the translational end-load components:

```text
R_source = sum_descendants [
  pIx + pJx,
  pIy + pJy,
  pIz + pJz
]
```

Under the governed Y-down gravity convention the independent physical target from the source gravity ledger is:

```text
R_expected = [0, -gravityWeightN, 0]
```

This check is independent of support reactions and structural response. It asks only whether the assembled equivalent nodal gravity vector carries the correct total source force.

## Real-artifact result

The identity was evaluated for every source in all three gravity-enabled cases:

- `L2 = W`;
- `L5 = W + T1 + P1`;
- `L6 = W + P1`.

Total checks: **288 source/case resultants**.

**Result: PASS — 288 / 288.**

Worst source resultant residual norm over the complete set:

```text
~9.095e-13 N
```

Topology maxima are:

| Topology | Sources per gravity case | Maximum source resultant residual |
|---|---:|---:|
| STRAIGHT | 60 | `~9.095e-13 N` |
| RIGID | 20 | `~2.274e-13 N` |
| BEND | 12 | `~2.299e-13 N` |
| REDUCER | 4 | `~1.821e-13 N` |

Representative bend source 5:

```text
gravityWeightN = 2008.3594148245948 N
assembled resultant ~= [3.38e-14, -2008.359414824595, 0] N
residual norm ~= 2.30e-13 N
```

The complete per-analysis-element gravity equivalent vectors are also **bitwise/numerically unchanged** between L2, L5 and L6 in the stored artifact; maximum component difference is zero.

As expected for the current formulation, the external equivalent-load vectors in non-gravity primitive/derived cases L3, L4 and L14 are identically zero. Thermal and pressure free states are carried through initial-strain/Bourdon mechanisms rather than an external gravity-equivalent vector.

## FEA interpretation

This closes one important branch of the Stage-10 gravity hypothesis:

**the remaining L2 source-action misses are not caused by missing or globally mis-scaled total gravity force.**

That conclusion applies to straight, rigid, bend and reducer source families. In particular, the previously noted source-5 and source-19 bend FY differences cannot be justified by changing total bend weight: the assembled bend source resultants already equal their independently recorded physical weights to numerical roundoff.

Therefore do **not** reopen:

- global gravity scaling;
- bend total-weight scaling;
- reducer total-weight scaling;
- straight/rigid line-weight scaling.

The remaining load-vector discriminator is narrower: **first moment / centroid placement** and, only after that passes or fails, the distribution of recovered end action through component stiffness/recovery conventions.

## First-moment gate — not yet provable from the existing `actual` package alone

A source first moment about source end I requires a common spatial reference:

```text
M_I = integral (r(s) - r_I) x w(s) ds
```

or the equivalent sum of assembled nodal forces and couples shifted to the same source-I point.

The governed `bm4l-actual.json` recovery package retains:

- source and analysis element IDs;
- end node IDs;
- local axes;
- equivalent load vectors;
- recovery vectors;
- source gravity weights;

but it does **not** retain the analysis/source node coordinates or an explicit per-source physical gravity first moment/centroid. The provenance artifact protects ACCDB table custody with hashes and schemas but does not contain raw row values. Therefore deriving a spatial first moment from this artifact alone would require reconstructing missing geometry indirectly and would not meet the local-authority standard.

The reducer implementation does already have internal gravity authority including `totalWeight`, `centroidFromEnd`, and `firstMomentFromEnd`; however those values are not emitted into the governed actual artifact today.

## Required Stage 12B implementation evidence

The next evidence-only production addition should expose, without changing the assembled load:

```text
sourceElementId
analysisKind
sourceReferencePointGlobal
expectedPhysicalResultantGlobal
assembledEquivalentResultantGlobal
expectedPhysicalFirstMomentAboutSourceIGlobal
assembledEquivalentFirstMomentAboutSourceIGlobal
resultantResidualGlobal
firstMomentResidualGlobal
```

For each source topology:

1. **Straight / rigid:** physical target is uniform line weight, resultant `wL`, centroid at `L/2`.
2. **Bend:** physical target must integrate the actual continuous straight-plus-arc source geometry, not infer a centroid from final end actions.
3. **Reducer:** emit and compare the existing ten-cylinder `totalWeight`, `centroidFromEnd`, and `firstMomentFromEnd` authority against the condensed equivalent load.
4. Keep thermal/pressure/Bourdon free-state checks separate; they are not external gravity resultants.

The evidence should be generated before the structural solve or from immutable element-build evidence so it cannot be contaminated by restraint/global-response cancellation.

## Stage decision

**STAGE_12B_RESULTANT_COMPLETE / PASS.**

- Total gravity force/resultant hypothesis: **CLOSED — VALIDATED**.
- First-moment/centroid placement: **OPEN — EVIDENCE FIELD NOT YET EMITTED**.
- New mechanics authorized: **NONE**.

Next engineering action: add evidence-only physical/assembled first-moment fields to the local solver evidence path, then replay the same governed artifact locally before considering any gravity or bend mechanics change.
