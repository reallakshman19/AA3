# Bend thermal authority — investigated, plus two defects it uncovered

## The question

`scripts/lfea-s3-bend-production-authority-check.mjs` had been failing on:

```text
Every generated bend chord must receive thermal authority through its
source span.   0 !== 6
```

Read literally that says thermal expansion is not applied across bends, which
would corrupt every W+T1 and W+P1+T1 result the module produces. It was worth
settling before anything else.

## Answer: the physics is correct. The assertion was stale.

The check looked for chord segment IDs starting `ACCDB.E1/B` — the old
slash-delimited naming. Chord IDs are now dot-delimited (`ACCDB.E1.B1`),
changed earlier to satisfy the canonical identity grammar, which forbids `/` in
bound identifiers. The filter matched nothing, so it counted zero.

Verified directly against BM4_L rather than inferred from the naming:

```text
BEND_ARC_CHORD segments in structural model:  72
UNIFORM_TEMPERATURE   on bend chords: 72 | chords missing: 0
PHYSICAL_LINE_WEIGHT  on bend chords: 72 | chords missing: 0
chord rows carrying sourceAuthoritySegmentId: 72/72
sample: ACCDB.E19.B1 -> ACCDB.E19
```

Every chord receives both thermal and gravity authority, each correctly
attributed to its source span. **Thermal results are not corrupted.** The
earlier suggestion that this corroborated a ~10.36 N thermal offset measured
against CAESAR was wrong: that offset is real but has a different cause, still
open.

The stale pattern is fixed in both places it appeared (thermal and gravity).

---

## Defect 1 — bend arcs under-apply thermal and gravity by 0.286%

A chord chain is shorter than the arc it replaces, so loads computed on chord
length under-represent the real pipe. `caesar-accdb-linear-solve.js` corrects
for this explicitly:

```js
const arcToChord = bend.component.geometry.arcLength
                 / bend.component.geometry.chordChainLength;
thermalLengthScale: arcToChord,
gravityLengthScale: arcToChord,
```

Production applies no such scaling. `arcToChord` does not appear anywhere in
`src/core/linear-piping-analysis-consumer/`. Both quantities are computed and
retained during retopology and then never used for load scaling.

Measured on all twelve BM4_L bends:

| Bend | Chords | Chord chain | Arc | Under-applied |
|---|---:|---:|---:|---:|
| E19, E20, E25, E32, E33, E36, E48, E85, E88 | 6 | 0.358059 | 0.359084 | 0.286% |
| E42, E43 | 6 | 0.477413 | 0.478779 | 0.286% |
| E5 | 6 | 0.596766 | 0.598473 | 0.286% |

Uniform at 0.286%, consistent with six-chord discretization of a 90° bend. It
is systematic and always in the same direction — bends expand and weigh
slightly less than they should — so it accumulates rather than averaging out.

**Not fixed here, deliberately.** The correction would have to be threaded
through load compilation (arc length is not retained on the segment binding
where the primitives are built), and it changes every thermal and gravity
number in the module. There is currently no way to measure whether that change
improves agreement with CAESAR, because the production-to-CAESAR parity harness
does not exist yet. Making an unverifiable numerical change first would be the
wrong order: build the harness, then land this and measure it.

---

## Defect 2 — bend code points cannot be recovered

With the stale assertion fixed, the check advances and fails somewhere real:

```text
ResultRecoveryError: Code station IXP.E1.BEND.CP0 names node
IXP.E1.BEND.N0, which is not the I or J end of any element this
component compiled  [RECOVERY_CODE_STATION_NOT_LOCATABLE]
```

`buildBendComponent` names its code stations with component-internal node IDs
(`${componentId}.N${index}`, bend-component.js:407). The structural model binds
those same chords to real geometry nodes (`ACCDB.E1.T0`, `ACCDB.E1.A1`, …).
`recoverComponentCodePoint` matches stations to elements *by node ID*, so it can
never locate them. Nothing maps between the two naming systems.

The benchmark sidesteps this by keeping its own `definition.nodeIds[]` of real
model nodes and never consulting the component's internal names.

Consequence: B31 code stress cannot be evaluated at the three points that matter
on a bend — tangent start, mid-arc, tangent end. This is almost certainly
pre-existing and simply unreachable until the bend path started working; it is
the next thing in line behind the defects already fixed this week.

The correspondence itself is already computed in
`requireBendComponentMatchesTopology` (inputxml-production-bend-topology.js),
which matches stations to structural nodes by *position* precisely because the
IDs do not correspond. A fix would supply that mapping to the recovery step
rather than rederive it.

## Status of the check

`lfea-s3-bend-production-authority-check` remains red, but for a different and
better reason: it now fails on Defect 2 rather than on a filter that could never
match. It should stay red until Defect 2 is fixed.
