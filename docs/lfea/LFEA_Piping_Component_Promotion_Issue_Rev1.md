# GitHub issue body — copy into a new issue

**Suggested title:** Promote BM4_L piping component mechanics into the production analysis path (remove 4 constraints)

**Suggested labels:** `engineering`, `lfea`, `epic`, `needs-human-decision`

---

## Summary

Bend flexibility, tee/branch flexibility, reducer condensation and Bourdon
pressure are implemented and benchmarked in this repository, but are reachable
**only from the benchmark harness**. The production pipeline that the LFEA UI
drives never calls them, so every model reports them as unavailable.

Those reports are currently **accurate**. This issue tracks making them
unnecessary — and keeping them accurate while it happens.

Full plan: [`docs/lfea/LFEA_Piping_Component_Promotion_Plan_Rev1.md`](docs/lfea/LFEA_Piping_Component_Promotion_Plan_Rev1.md)

## Current state

| Capability | Built | Benchmarked | Reached by production |
|---|---|---|---|
| Bend flexibility | `linear-fea-piping-components/bend-component.js` | `lfea-b3.18`, `lfea-b3.19` | ❌ |
| Tee / branch | `linear-fea-piping-components/branch-component.js` | `lfea-b3.21` | ❌ |
| Reducer condensation | `linear-fea-reducer-condensation/` | `lfea-b3.23` | ❌ |
| Bourdon pressure | `linear-fea-piping-components/bourdon-pressure-expansion.js` | `lfea-m047-*` | ❌ |

`compilePipingComponent` is imported by exactly one non-test file:
`src/core/fea-benchmarks/caesar-accdb-linear-solve.js`.

## The four constraints to remove

1. **C1** — `projectInputXmlAnalyticalGeometry` retypes every bend `BEND → PIPE`
   before conditioning. `seedSegment` only discretises bend-typed segments, so
   the straight-chord limitation is **self-fulfilling**.
   `src/core/linear-piping-analysis-consumer/inputxml-linear-structural-preparation.js`
2. **C2** — `INPUTXML_LINEAR_IDENTITY_CONDITIONING_PROFILE` sets
   `bendLengthErrorLimit: 1` (100%, never enforced) and `spanSeedingLimit: 1e9`,
   so nothing is ever seeded.
   `src/core/linear-piping-analysis-consumer/inputxml-linear-structural-profile.js`
3. **C3** — `requireIdentityConditioning` asserts the conditioned span list
   equals the source list, rejecting any 1→N expansion.
4. **C4** — Component limitations and pressure effects are hardcoded in four
   places and never consult what the compiler actually did:
   `{ codeStress: true, pressureStiffening: false, axialThrust: false, bourdon: false }`

## Blockers found during investigation

Removing C1–C3 is **not sufficient** — verified against `benchmarks/LFEA/BM4/`:

- **B1** — ACCDB bend elements run `FROM_NODE → TO_NODE` where `TO_NODE` is the
  **corner intersection**; the arc straddles the corner across two elements.
  `seedBendSegment` assumes endpoints *are* tangent points. Measured on BM4_L
  bend #1: endpoint-to-centre `0.867` and `0.539`, neither equal to the radius.
  `discretiseBend` throws `BEND_CENTRE_INCONSISTENT`, relative residual **0.3786**.
- **B2** — The ACCDB adapter computes `tangentStart`/`tangentEnd` and then
  **discards them**, persisting only `bendArcCentre` and `bendComputedRadius`.
- **B3** — All 11 InputXML BM4 bends emit
  `BEND_INTERNAL_STATION_GEOMETRY_NOT_SUPPORTED` and resolve **no** arc.

```
InputXML_BM4.xml          : BEND=11  withArc=0
InputXML_BM4.repaired.xml : BEND=11  withArc=0
BM4_L.ACCDB               : BEND=10  withArc=10   (but topology per B1)
```

**Net effect:** on the only real benchmark model in the repo, in both formats,
geometric bend discretisation via the seeding path cannot fire. This is why
`caesar-accdb-linear-solve.js` is 2,644 lines — it does not seed, it
**re-topologises**.

I confirmed this empirically: removing C1–C3 on a scratch branch left BM4's
chord count at **0**. All 8 baseline checks still passed, which is exactly what
makes it dangerous — the change looks green and does nothing.

## Proposed staging

One PR per stage. Do not batch.

| Stage | Delivers | Moves numbers? |
|---|---|---|
| S0 | Capability profile (removes C4) | No |
| S1 | Persist bend tangent points (fixes B2) | No |
| S2 | Bend re-topologisation (fixes B1, removes C1–C3) | **Yes** |
| S3 | Bend flexibility factors + double-count guard | **Yes** |
| S4 | Reducer condensation | **Yes** |
| S5 | Bourdon pressure | **Yes** |
| S6 | Tee / branch flexibility | **Yes** |
| S7 | UI verification | No |

S0, S1 and S7 must be **numerically inert**. If they move a number, the change
is wrong.

## Blocking questions for a human

These must be answered before implementation; **no agent should guess them**:

1. **InputXML internal-station bends (B3).** Derive the arc from station nodes,
   require the ACCDB source for such models, or keep degrading and disclose?
2. **Restraint re-targeting (S2.3).** When the corner node is retired, is
   nearest-node re-target acceptable, or must the corner be retained as a
   massless station?
3. **`bendSeedingSegments = 4`** — confirm against `evaluateBendSubdivisionConvergence`.
4. **BM1 fixtures are absent** from this repository, so `lfea-b3.15`/`b3.16`/`b3.18`
   cannot run locally. S3 cannot be qualified until they are restored.

## Non-negotiables

- Never re-baseline a benchmark to make it pass — re-qualify against CAESAR
  output, or revert.
- Never disable `bendFlexibilityDoubleCountGuard`. After S2 the arc is
  represented geometrically, so the guard becomes live: applying a flexibility
  factor on top would count bend compliance twice.
- Fail closed. If a restraint cannot be unambiguously re-targeted, raise BLOCK.
- An omitted or misread support changes every reaction downstream of it.
