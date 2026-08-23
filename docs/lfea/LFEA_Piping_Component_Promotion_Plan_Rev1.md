# LFEA Piping Component Promotion — Implementation Plan Rev 1

Promote the BM4_L benchmark component mechanics (bend flexibility, tee/branch
flexibility, reducer condensation, Bourdon pressure) into the production
analysis path, and stop the Error Check panel from reporting limitations that
are no longer true.

**Status: PLAN ONLY. No production behaviour changes with this document.**

---

## 0. Input sources

Every artefact this plan reads, modifies or depends on. Repository:
`https://github.com/reallaksh19/Advanced_Analysis`, default branch `main`.
Remote form of any path below:
`https://github.com/reallaksh19/Advanced_Analysis/blob/main/<repo-relative-path>`

### 0.1 Production path — files this plan MODIFIES

| # | Repo-relative path | Role in this plan |
|---|---|---|
| P1 | `src/core/linear-piping-analysis-consumer/inputxml-linear-structural-preparation.js` | Holds **C1** (BEND→PIPE retype) and **C3** (`requireIdentityConditioning`); span→element binding |
| P2 | `src/core/linear-piping-analysis-consumer/inputxml-linear-structural-profile.js` | Holds **C2** (`INPUTXML_LINEAR_IDENTITY_CONDITIONING_PROFILE`) |
| P3 | `src/core/linear-piping-analysis-consumer/inputxml-feature-inventory.js` | Holds **C4** (`componentDispositions`, `currentAuthorizedEffects`) |
| P4 | `src/core/linear-piping-analysis-consumer/generic-inputxml-solve-case.js` | **C4** hardcoded `authorizedEffects` (2 of 3) |
| P5 | `src/core/linear-piping-analysis-consumer/inputxml-linear-preparation-load-authorities.js` | **C4** hardcoded `authorizedEffects` (3 of 3) |
| P6 | `src/core/geometry/adapters/accdb-to-canonical-geometry.js` | **B2** — computes then discards `tangentStart`/`tangentEnd` |
| P7 | `src/core/geometry/adapters/inputXmlToCanonicalGeometry.js` | **B3** — emits `BEND_INTERNAL_STATION_GEOMETRY_NOT_SUPPORTED` |

**New files created by this plan:**
`src/core/linear-piping-analysis-consumer/production-capability-profile.js` (S0),
`src/core/linear-piping-analysis-consumer/bend-retopology.js` (S2).

### 0.2 Production path — files READ but not modified

| # | Repo-relative path | Why it matters |
|---|---|---|
| R1 | `src/core/centerline-beam-fea/node-seeding.js` | `seedSegment` gate + `seedBendSegment`; the endpoint==tangent assumption behind **B1** |
| R2 | `src/core/centerline-beam-fea/bend-geometry.js` | `discretiseBend`; raises `BEND_CENTRE_INCONSISTENT` |
| R3 | `src/core/linear-fea-model-compiler/model-compiler-contract.js` | `EXACTLY_ONE_BINDING_PER_SPAN_V1` — forces unique chord element ids |
| R4 | `src/core/linear-piping-analysis-consumer/inputxml-linear-execution-elements.js` | Executor reconstitutes elements from the sealed model; does **not** author geometry |
| R5 | `src/core/linear-piping-analysis-consumer/inputxml-linear-governed-solve.js` | Authorization gateway; requires an injected executor |

### 0.3 Component library — the mechanics being promoted

| # | Repo-relative path | Provides |
|---|---|---|
| C-1 | `src/core/linear-fea-piping-components/index.js` | Public exports |
| C-2 | `src/core/linear-fea-piping-components/piping-component.js` | `compilePipingComponent`, `PIPING_COMPONENT_INPUT_KEYS` |
| C-3 | `src/core/linear-fea-piping-components/bend-component.js` | `buildBendComponent`, `bendFlexibilityDoubleCountGuard`, `evaluateBendSubdivisionConvergence` |
| C-4 | `src/core/linear-fea-piping-components/branch-component.js` | `classifyBranchLegs`, `branchFlexibilityGuard` (S6) |
| C-5 | `src/core/linear-fea-piping-components/bourdon-pressure-expansion.js` | `deriveMec21BendPressureFreeState` (S5) |
| C-6 | `src/core/linear-fea-reducer-condensation/index.js` | `compileTenCylinderReducerAuthority` (S4) |
| C-7 | `src/core/linear-fea-b31-factor-calculator/index.js` | `calculateB31Factors` (S3) |

### 0.4 Reference implementation — the pattern to follow

| # | Repo-relative path | Note |
|---|---|---|
| X1 | `src/core/fea-benchmarks/caesar-accdb-linear-solve.js` | **2,644 lines.** The only non-test caller of `compilePipingComponent`. Bend definitions ≈ L1200–1310, Bourdon segments ≈ L1317–1365, model compile ≈ L1367+. **Read this before implementing S2/S3.** |

### 0.5 Benchmark data — availability warning

> **A fresh clone does NOT contain the data needed to qualify this work.**

| Artefact | Repo-relative path | In git? |
|---|---|---|
| BM4 InputXML | `benchmarks/LFEA/BM4/InputXML_BM4.xml` | ✅ tracked |
| BM4 InputXML (repaired) | `benchmarks/LFEA/BM4/InputXML_BM4.repaired.xml` | ✅ tracked |
| BM4 CAESAR output | `benchmarks/LFEA/BM4/Output_BM4.xml` | ✅ tracked |
| BM4 provenance | `benchmarks/LFEA/BM4/PROVENANCE.md` | ✅ tracked |
| **BM4_L ACCDB model** | `benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB` | ❌ **untracked, local-only** |
| **BM1 fixtures** | `benchmarks/LFEA/BM1/` | ❌ **absent from repository** |

Consequences the implementing agent must plan around:

- `BM4_L.ACCDB` is the **only** input in this repository that resolves bend arcs
  (10/10). It is untracked, so §3's measurements cannot be reproduced from a
  clean clone. **Obtain it from the model owner before starting S1 or S2.**
- `benchmarks/LFEA/BM1/BM1_InputXML.xml` does not exist anywhere in the tree, so
  `lfea-b3.15`, `lfea-b3.16` and `lfea-b3.18` fail with `ENOENT` on a clean
  checkout — **on `main`, before any change**. S3 cannot be qualified until these
  are restored. Do not mistake this pre-existing failure for a regression you
  caused.

### 0.6 Benchmark and check scripts

| Script | Gates |
|---|---|
| `scripts/lfea-b3.18-bm1-bend-check.mjs` | Bend mechanics (S3) — *needs BM1* |
| `scripts/lfea-b3.19-b31-factor-calculator-check.mjs` | B31 factor calculator |
| `scripts/lfea-b3.21-b31j-phase2-factor-benchmark-check.mjs` | B31J branch factors (S6) |
| `scripts/lfea-b3.23-reducer-condensation-check.mjs` | Reducer condensation (S4) |
| `scripts/lfea-b1-conditioning-check.mjs` | Geometry conditioning (S2) |
| `scripts/lfea-b2.5-model-compiler-check.mjs` | Model compiler (S2) |
| `scripts/linear-piping-analysis-consumer-check.mjs` | Consumer contract |
| `scripts/lfea-ui-error-check-check.mjs` | Error Check presentation (S7) |
| `scripts/doc-drift-check.mjs` | Documentation drift |

Aggregate entry points in `package.json`: `check:lfea-linear-core`, `gate`.

Baseline verified green on `main` before this plan was written:
`lfea-b1-conditioning-check`, `lfea-b2.5-model-compiler-check`,
`lfea-b3.2-piping-component-check`, `lfea-b3.19-b31-factor-calculator-check`,
`lfea-b3.23-reducer-condensation-check`, `lfea-b3.22-rigid-element-authority-check`,
`linear-piping-analysis-consumer-check`, `lfea-inputxml-ingest-check`.

### 0.7 UI consumers — verify after any capability flip (S7)

| Repo-relative path | Role |
|---|---|
| `src/workspace/lfea-diagnostics/lfea-error-check-presentation.js` | Groups findings; `triage`, `groups` |
| `src/workspace/lfea-diagnostics/lfea-error-check-panel.js` | Renders grouped findings |
| `src/workspace/lfea-finding-plain-language.js` | Finding → sentence |
| `src/workspace/lfea-finding-suggested-action.js` | Finding → what to do |
| `src/workspace/lfea-model-review/lfea-geometry-review.js` | SOURCE vs ANALYSIS geometry projection |

### 0.8 Related documents and evidence

| Path | Note |
|---|---|
| `docs/lfea/LFEA_Piping_Component_Promotion_Issue_Rev1.md` | Issue body for this work |
| `src/core/geometry/adapters/accdb-restraint-type-correspondence.js` | Precedent for evidence-based, fail-closed source mapping |
| `benchmarks/LFEA/B31_APPENDIX_D/M026_Appendix_D_Factor_Benchmarks.json` | B31 Appendix D factor benchmark data |
| `reports/` | Where per-stage benchmark movement justifications must be written |

### 0.9 External standards referenced by the code

ASME B31.3 (flexibility / SIF), ASME B31J (branch flexibility, via
`deriveB31JDirectionalBranchEndModifiers`), and CAESAR II restraint-type and
bend-station conventions. These are **not** vendored in this repository — the
code encodes them through factor profiles and correspondence tables, each
carrying its own evidence reference.

---

## 1. Why this exists

The mechanics are already built and benchmarked. They are not reachable from
the pipeline the LFEA UI drives.

| Capability | Implementation | Benchmark | Reached by production? |
|---|---|---|---|
| Bend flexibility | `src/core/linear-fea-piping-components/bend-component.js` | `scripts/lfea-b3.18-bm1-bend-check.mjs`, `lfea-b3.19` | **No** |
| Tee / branch | `src/core/linear-fea-piping-components/branch-component.js` | `scripts/lfea-b3.21-b31j-phase2-factor-benchmark-check.mjs` | **No** |
| Reducer condensation | `src/core/linear-fea-reducer-condensation/` | `scripts/lfea-b3.23-reducer-condensation-check.mjs` | **No** |
| Bourdon pressure | `src/core/linear-fea-piping-components/bourdon-pressure-expansion.js` | `scripts/lfea-m047-*` | **No** |

Evidence that production never reaches them:

```bash
# Returns ONLY caesar-accdb-linear-solve.js (the benchmark harness) and scripts/.
grep -rn "compilePipingComponent\|buildBendComponent\|buildBranchComponent" src/

# Returns nothing: the production consumer never builds a component.
grep -rn "compilePipingComponent" src/core/linear-piping-analysis-consumer/
```

The production consumer *does* import from `linear-fea-piping-components`, but
only `requirePipingComponent` and `computePipingComponentSemanticHash` — contract
validation and hashing, never the builders. This is why the gap is not obvious.

Consequence in the UI: every model reports `MODEL_BEND_EXACT_MECHANICS_UNAVAILABLE`,
`MODEL_TEE_EXACT_MECHANICS_UNAVAILABLE`, `MODEL_REDUCER_EXACT_MECHANICS_UNAVAILABLE`
and `MODEL_PRESSURE_STRUCTURAL_EFFECTS_UNREPRESENTED`. Those reports are currently
**accurate**. They must stay accurate after this work — see §6.

---

## 2. The four constraints to remove

All four are in the production preparation path. Each is a deliberate decision
that must be replaced, not simply deleted.

### C1 — Bend curvature is discarded before conditioning

`src/core/linear-piping-analysis-consumer/inputxml-linear-structural-preparation.js`
(`projectInputXmlAnalyticalGeometry`)

```js
if (binding?.limitationCode !== 'GENERIC_APPROX_BEND_STRAIGHT_CHORD') return segment;
return Object.freeze({
  ...segment,
  type: 'PIPE',            // <-- C1: bend retyped to straight pipe
  meta: Object.freeze({ ...(segment.meta ?? {}), inputXmlSourceType: segment.type, ... }),
});
```

`seedSegment` in `src/core/centerline-beam-fea/node-seeding.js` only discretises
when `BEND_SEGMENT_TYPES.includes(segment.type) && arc`. Retyping to `PIPE`
guarantees no bend is ever discretised. **The straight-chord limitation is
self-fulfilling.**

### C2 — Conditioning profile never seeds

`src/core/linear-piping-analysis-consumer/inputxml-linear-structural-profile.js`

```js
export const INPUTXML_LINEAR_IDENTITY_CONDITIONING_PROFILE = Object.freeze({
  spanSeedingLimit:   { value: 1e9 },  // effectively no span splitting
  bendSeedingSegments:{ value: 2   },
  bendLengthErrorLimit:{ value: 1  },  // 100% error tolerated => never enforced
});
```

### C3 — Identity conditioning is asserted

Same file as C1:

```js
requireIdentityConditioning(prepared.normalizedGeometry, conditionedTopology.geometry);
```

which fails unless the conditioned segment id list **equals** the source list.
Any 1→N expansion is rejected. This is a real custody guarantee (analysis
geometry == source geometry) and needs an equivalent replacement, not deletion.

### C4 — Capability limitations are hardcoded

`src/core/linear-piping-analysis-consumer/inputxml-feature-inventory.js`
(`componentDispositions`) returns limitations by component kind unconditionally,
and pressure effects are hardcoded in **three** places:

```js
{ codeStress: true, pressureStiffening: false, axialThrust: false, bourdon: false }
```

- `inputxml-feature-inventory.js` (`currentAuthorizedEffects`)
- `generic-inputxml-solve-case.js`
- `inputxml-linear-preparation-load-authorities.js`

Nothing consults what the compiler actually did. If C1–C3 are removed without
C4, the UI will keep claiming "bends are straight chords" after it stops being
true — the same bug inverted, and harder to notice.

---

## 3. Blockers found during investigation — read before coding

Removing C1–C3 is **not sufficient**. Verified against `benchmarks/LFEA/BM4/`
in both source formats:

### B1 — ACCDB bend topology does not match the seeding assumption

`seedBendSegment` calls `discretiseBend(startNode, endNode, arc.centre, n)`,
i.e. it assumes **the segment endpoints are the arc tangent points**.

For ACCDB that is false. A bend element runs `FROM_NODE → TO_NODE` where
`TO_NODE` is the **corner intersection**; the arc spans `tangentStart → tangentEnd`
and *straddles the corner across two elements*.

Measured on BM4_L bend #1:

```
start -> centre : 0.867180
end   -> centre : 0.538815     (unequal, and neither is the radius)
discretiseBend  : throws BEND_CENTRE_INCONSISTENT, relative residual 0.3786
```

### B2 — ACCDB tangent points are computed then discarded

`src/core/geometry/adapters/accdb-to-canonical-geometry.js` computes them:

```js
const tangentStart = subtract(intersection, scale(incomingDirection, tangentLength));
const tangentEnd   = add(intersection, scale(outgoingDirection, tangentLength));
```

but persists only:

```js
segment.meta.bendArcCentre     = resolved.centre;
segment.meta.bendComputedRadius = resolved.computedRadius;
```

The tangent points — the one thing needed to place the arc — are dropped.

### B3 — InputXML BM4 bends refuse to resolve an arc at all

All 11 bends emit `BEND_INTERNAL_STATION_GEOMETRY_NOT_SUPPORTED`: they declare
internal CAESAR station nodes, so the adapter deliberately does not treat
FROM/TO as tangent-to-tangent and resolves **no** centre ("so no incorrect
centre" is derived).

```
InputXML_BM4.xml          : BEND=11  withArc=0
InputXML_BM4.repaired.xml : BEND=11  withArc=0
BM4_L.ACCDB               : BEND=10  withArc=10
```

**Net effect:** on the only real benchmark model in the repo, in both formats,
geometric bend discretisation via the seeding path cannot fire. This is why
`caesar-accdb-linear-solve.js` is 2,644 lines: it does not seed, it
**re-topologises** — building its own bend node chains and stitching them into
the neighbouring elements at the tangent points.

> **Do not attempt to "just enable seeding". It is inert on ACCDB and unavailable
> on InputXML. Stage 1 below exists to fix that first.**

---

## 4. Staged plan

Each stage is independently shippable, independently verifiable, and ordered so
that any benchmark movement is attributable to exactly one cause.

| Stage | Delivers | Changes numbers? |
|---|---|---|
| S0 | Capability profile (removes C4) | No |
| S1 | Persist bend tangent points (fixes B2) | No |
| S2 | Bend re-topologisation (fixes B1, removes C1–C3) | **Yes** |
| S3 | Bend flexibility factors | **Yes** |
| S4 | Reducer condensation | **Yes** |
| S5 | Bourdon pressure | **Yes** |
| S6 | Tee / branch flexibility | **Yes** |
| S7 | UI wiring + disposition truthfulness | No |

Stages S2–S6 each require re-qualifying benchmarks. Do **not** batch them.

---

## 5. Stage S0 — Capability profile (do this first)

**Goal:** one declared source of truth for what the production compiler
supports; delete the four hardcoded sites in C4. Zero numeric change.

### S0.1 New file

`src/core/linear-piping-analysis-consumer/production-capability-profile.js`

```js
/**
 * What the production analysis path can actually represent.
 *
 * This is the single place that answers "does the compiled model carry bend
 * flexibility?". Before it existed, the answer was hardcoded in four places
 * and could not be wrong in a way anyone would notice: the inventory claimed
 * bends were straight chords whether or not they were.
 *
 * Every flag here is false until the stage that implements it flips it, and
 * flipping one without its benchmark is what the anti-drift check prevents.
 */
export const PRODUCTION_CAPABILITY_PROFILE_SCHEMA = 'lfea-production-capability-profile/v1';

export const PRODUCTION_CAPABILITY_PROFILE = Object.freeze({
  schema: PRODUCTION_CAPABILITY_PROFILE_SCHEMA,
  profileId: 'LFEA_PRODUCTION_CAPABILITY_R1',
  bendExactMechanics: false,      // S3 flips
  teeExactMechanics: false,       // S6 flips
  reducerExactMechanics: false,   // S4 flips
  pressureStiffening: false,      // S5 flips
  pressureAxialThrust: false,     // S5 flips
  pressureBourdon: false,         // S5 flips
  pressureCodeStress: true,       // already true today
});

/** Pressure effects in the shape the load authorities already expect. */
export function productionAuthorizedPressureEffects(profile = PRODUCTION_CAPABILITY_PROFILE) {
  return Object.freeze({
    codeStress: profile.pressureCodeStress,
    pressureStiffening: profile.pressureStiffening,
    axialThrust: profile.pressureAxialThrust,
    bourdon: profile.pressureBourdon,
  });
}

/** Limitation code for a component kind, or null when it is represented exactly. */
export function productionComponentLimitation(componentKind, profile = PRODUCTION_CAPABILITY_PROFILE) {
  if (componentKind === 'BEND') {
    return profile.bendExactMechanics ? null : 'GENERIC_APPROX_BEND_STRAIGHT_CHORD';
  }
  if (componentKind === 'REDUCER') {
    return profile.reducerExactMechanics ? null : 'GENERIC_APPROX_REDUCER_UNIFORM_SECTION';
  }
  if (componentKind === 'TEE') {
    return profile.teeExactMechanics ? null : 'GENERIC_APPROX_TEE_FRAME_BRANCH_NO_FLEXIBILITY';
  }
  return null;
}
```

### S0.2 Rewire `componentDispositions`

`inputxml-feature-inventory.js` — replace the hardcoded ladder:

```js
// BEFORE
const limitation = componentKind === 'BEND' ? 'GENERIC_APPROX_BEND_STRAIGHT_CHORD'
  : componentKind === 'REDUCER' ? 'GENERIC_APPROX_REDUCER_UNIFORM_SECTION'
  : componentKind === 'TEE' ? 'GENERIC_APPROX_TEE_FRAME_BRANCH_NO_FLEXIBILITY' : null;
if (limitation === null) return both(unsupportedDisposition('MODEL_COMPONENT_TYPE_UNSUPPORTED'));

// AFTER
const limitation = productionComponentLimitation(componentKind);
if (limitation === null) {
  // Represented exactly, OR genuinely unsupported. Distinguish on the kind,
  // not on the limitation being null, or an exactly-represented bend would be
  // reported as an unsupported component type.
  if (!REPRESENTABLE_COMPONENT_KINDS.has(componentKind)) {
    return both(unsupportedDisposition('MODEL_COMPONENT_TYPE_UNSUPPORTED'));
  }
  return both(exactDisposition());
}
```

> **Novice-agent trap:** the existing code uses `limitation === null` to mean
> "unsupported component type". After S0 it also means "represented exactly".
> You **must** add `REPRESENTABLE_COMPONENT_KINDS` or every bend becomes
> `MODEL_COMPONENT_TYPE_UNSUPPORTED` the moment S3 lands.

### S0.3 Replace the three `authorizedEffects` literals

In all three files, replace the object literal with
`productionAuthorizedPressureEffects()`.

### S0.4 Pass test — `scripts/lfea-production-capability-profile-check.mjs`

```js
#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  PRODUCTION_CAPABILITY_PROFILE,
  productionAuthorizedPressureEffects,
  productionComponentLimitation,
} from '../src/core/linear-piping-analysis-consumer/production-capability-profile.js';

// 1. Defaults match today's behaviour exactly (S0 must not change numbers).
assert.deepEqual(productionAuthorizedPressureEffects(), {
  codeStress: true, pressureStiffening: false, axialThrust: false, bourdon: false,
});
assert.equal(productionComponentLimitation('BEND'), 'GENERIC_APPROX_BEND_STRAIGHT_CHORD');
assert.equal(productionComponentLimitation('REDUCER'), 'GENERIC_APPROX_REDUCER_UNIFORM_SECTION');
assert.equal(productionComponentLimitation('TEE'), 'GENERIC_APPROX_TEE_FRAME_BRANCH_NO_FLEXIBILITY');
assert.equal(productionComponentLimitation('STRAIGHT_PIPE'), null);

// 2. Flipping a flag clears exactly one limitation and nothing else.
const bendOn = { ...PRODUCTION_CAPABILITY_PROFILE, bendExactMechanics: true };
assert.equal(productionComponentLimitation('BEND', bendOn), null);
assert.equal(productionComponentLimitation('TEE', bendOn), 'GENERIC_APPROX_TEE_FRAME_BRANCH_NO_FLEXIBILITY');

console.log(JSON.stringify({ check: 'lfea-production-capability-profile', status: 'PASS' }));
```

### S0.5 Anti-drift — same file, appended

Prevents the literals reappearing and prevents a flag being flipped without a
benchmark:

```js
const HARDCODED_EFFECTS = /codeStress:\s*true,\s*pressureStiffening:\s*false/u;
for (const rel of [
  'src/core/linear-piping-analysis-consumer/inputxml-feature-inventory.js',
  'src/core/linear-piping-analysis-consumer/generic-inputxml-solve-case.js',
  'src/core/linear-piping-analysis-consumer/inputxml-linear-preparation-load-authorities.js',
]) {
  const text = fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
  assert.doesNotMatch(text, HARDCODED_EFFECTS,
    `${rel} must read pressure effects from the capability profile, not a literal.`);
}

// A capability may only be true if its benchmark script exists and is wired
// into package.json. Flipping a flag with no benchmark fails here.
const BENCHMARK_FOR = Object.freeze({
  bendExactMechanics: 'scripts/lfea-b3.18-bm1-bend-check.mjs',
  teeExactMechanics: 'scripts/lfea-b3.21-b31j-phase2-factor-benchmark-check.mjs',
  reducerExactMechanics: 'scripts/lfea-b3.23-reducer-condensation-check.mjs',
  pressureBourdon: 'scripts/lfea-m047-tee-rigid-thermal-check.mjs',
});
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const gate = pkg.scripts.gate ?? '';
for (const [flag, script] of Object.entries(BENCHMARK_FOR)) {
  if (PRODUCTION_CAPABILITY_PROFILE[flag] !== true) continue;
  assert.ok(fs.existsSync(new URL(`../${script}`, import.meta.url)),
    `Capability ${flag} is enabled but its benchmark ${script} is missing.`);
  assert.ok(gate.includes(script.replace('scripts/', '').replace('.mjs', ''))
    || Object.values(pkg.scripts).some((s) => s.includes(script)),
    `Capability ${flag} is enabled but ${script} is not wired into an npm script.`);
}
```

### S0.6 Wire into `package.json`

```json
"check:lfea-production-capability": "node scripts/lfea-production-capability-profile-check.mjs",
```

and append `&& npm run check:lfea-production-capability` to the `gate` script.

### S0.7 Definition of done

- [ ] `npm run check:lfea-production-capability` passes
- [ ] `npm run check:lfea-linear-core` unchanged
- [ ] `node scripts/lfea-ui-error-check-check.mjs` passes
- [ ] Error Check panel output is **byte-identical** to before (S0 changes nothing visible)

---

## 6. Stage S1 — Persist bend tangent points

**Goal:** stop discarding `tangentStart`/`tangentEnd` (B2). No behaviour change;
purely additive metadata.

### S1.1 ACCDB adapter

`src/core/geometry/adapters/accdb-to-canonical-geometry.js`, at the end of the
arc-resolution function:

```js
segment.meta.bendArcCentre      = resolved.centre;
segment.meta.bendComputedRadius = resolved.computedRadius;
// S1: the tangent points are where the arc actually starts and ends. Without
// them a consumer can only guess that the segment endpoints are the tangents,
// which is true for InputXML and false for ACCDB (the TO_NODE is the corner).
segment.meta.bendTangentStart   = { x: tangentStart[0], y: tangentStart[1], z: tangentStart[2] };
segment.meta.bendTangentEnd     = { x: tangentEnd[0],   y: tangentEnd[1],   z: tangentEnd[2] };
segment.meta.bendTangentBasis   = 'ACCDB_CORNER_INTERSECTION_V1';
```

> **Novice-agent trap:** `tangentStart`/`tangentEnd` here are **arrays**
> (`vector3` helpers), while `resolved.centre` is an `{x,y,z}` object. Convert,
> or the geometry validator will reject the segment.

### S1.2 InputXML adapter

Where FROM/TO already are the tangents, record that explicitly:

```js
segment.meta.bendTangentStart = { ...startPoint };
segment.meta.bendTangentEnd   = { ...endPoint };
segment.meta.bendTangentBasis = 'INPUTXML_TANGENT_TO_TANGENT_V1';
```

### S1.3 Pass test — `scripts/lfea-bend-tangent-custody-check.mjs`

```js
// ACCDB: tangent points must be equidistant from the resolved centre, and that
// distance must equal the computed radius. This is the exact invariant that
// discretiseBend enforces and that the raw segment endpoints violate by 37.9%.
for (const segment of accdbGeometry.segments.filter((s) => s.meta?.bendTangentStart)) {
  const c = segment.meta.bendArcCentre;
  const r = segment.meta.bendComputedRadius;
  const d = (p) => Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z);
  const ds = d(segment.meta.bendTangentStart);
  const de = d(segment.meta.bendTangentEnd);
  assert.ok(Math.abs(ds - de) / r < 1e-9, `${segment.id}: tangents not equidistant from centre`);
  assert.ok(Math.abs(ds - r)  / r < 1e-9, `${segment.id}: tangent radius != computed radius`);
}
assert.equal(accdbGeometry.segments.filter((s) => s.type === 'BEND' && s.meta?.bendTangentStart).length, 10,
  'BM4_L must retain tangent points for all 10 resolved bends.');
```

### S1.4 Definition of done

- [ ] All 10 BM4_L bends carry tangent points passing the equidistance invariant
- [ ] `npm run check:accdb-to-canonical-geometry` passes
- [ ] No conditioning/solve behaviour changes (tangents are recorded, unused)

---

## 7. Stage S2 — Bend re-topologisation

**This is the hard stage.** It removes C1, C2 and C3 and fixes B1.

### S2.1 What must happen geometrically

For an ACCDB bend at corner node `T` between incoming element `A→T` and
outgoing element `T→B`, with tangents `t0` (on `A→T`) and `t1` (on `T→B`):

```
BEFORE:   A ------------------- T ------------------- B
AFTER:    A --------- t0 ) arc chords ( t1 --------- B
                      \___ n chords ___/
```

Three edits, not one:
1. Shorten `A→T` to `A→t0`
2. Insert the arc chain `t0 → … → t1` (n chords, n even, mid-arc node retained)
3. Shorten `T→B` to `t1→B`

The corner node `T` **leaves the structural model**. Anything bound to `T`
(restraints, loads, code stations) must be re-targeted — see S2.3.

For InputXML tangent-to-tangent bends only step 2 applies and neighbours are
untouched.

### S2.2 Implementation shape

Do **not** put this in `node-seeding.js`. That module's contract is
"subdivide a span in place" and re-topologising neighbours violates it.
Add a dedicated pass that runs **before** conditioning:

`src/core/linear-piping-analysis-consumer/bend-retopology.js`

```js
/**
 * Rewrite declared bends into tangent-to-tangent arcs before conditioning.
 *
 * Returns a new geometry plus a binding map so every produced span can be
 * traced to the source segment it came from. Callers must not assume the
 * segment count is preserved.
 *
 * @returns {{ geometry, spanOrigin: Map<string, string>, retiredNodeIds: string[] }}
 */
export function retopologiseDeclaredBends(geometry, profile) { /* ... */ }
```

Contract requirements:
- Pure. Must not mutate `geometry`.
- Deterministic ordering (sort by segment id) so semantic hashes are stable.
- Every produced span id must be `${parentId}/B${index}` and carry
  `meta.parentSegmentId` and `meta.bendChordOf`.
- Fail closed with `BEND_RETOPOLOGY_TANGENT_OVERRUN` if a tangent length exceeds
  a neighbouring span (already detected by the adapter; re-check here).

### S2.3 Re-targeting bound entities — the highest-risk part

| Bound to corner node `T` | Action |
|---|---|
| Restraint | Re-target to nearest retained node; **fail closed** if ambiguous |
| Applied force / moment | Re-target to nearest retained node; fail closed if ambiguous |
| Code station | Re-target to the mid-arc node |
| Load primitive on `A→T` | Re-target to `A→t0` (element id changes) |

> **Novice-agent trap:** do **not** silently drop a restraint whose node is
> retired. An omitted support changes every reaction downstream of it. If the
> re-target is not unambiguous, raise a BLOCK finding and stop.

### S2.4 Remove C1/C2/C3

- C1: delete the `type: 'PIPE'` retype **only when a tangent basis is present**;
  a bend with no resolvable arc must still degrade and still say so.
- C2: introduce `INPUTXML_LINEAR_COMPONENT_CONDITIONING_PROFILE`
  (`bendSeedingSegments: 4` — must be even for a mid-arc station;
  `bendLengthErrorLimit: 0.02` — 4 chords across 90° understate arc by ~0.6%).
- C3: replace `requireIdentityConditioning` with a custody check that every
  conditioned span traces to exactly one source segment, and every source
  segment is represented by at least one span:

```js
function requireExplainedConditioning(sourceGeometry, conditionedGeometry) {
  const sourceIds = new Set(sourceGeometry.segments.map((r) => String(r.id)));
  const covered = new Set();
  const unexplained = [];
  for (const segment of conditionedGeometry.segments) {
    const id = String(segment.id);
    const parent = segment?.meta?.parentSegmentId == null ? null : String(segment.meta.parentSegmentId);
    const origin = sourceIds.has(id) ? id : parent;
    if (origin === null || !sourceIds.has(origin)) { unexplained.push(id); continue; }
    covered.add(origin);
  }
  const uncovered = [...sourceIds].filter((id) => !covered.has(id));
  if (unexplained.length > 0 || uncovered.length > 0) {
    fail('INPUTXML_STRUCTURAL_CONDITIONING_CHANGED_SPAN_CUSTODY',
      'Every conditioned span must trace to exactly one retained source segment.',
      { unexplained, uncovered });
  }
}
```

### S2.5 Element and node identity

Chords of one bend share a source index. Element ids **must** disambiguate or
the model compiler rejects the model under `EXACTLY_ONE_BINDING_PER_SPAN_V1`:

```js
const elementId = isChord
  ? `${modelId}.E${authority.sourceIndex + 1}.B${chordIndex}`
  : `${modelId}.E${authority.sourceIndex + 1}`;
```

> **Novice-agent trap:** in `inputxml-linear-structural-preparation.js` the
> binding currently reads `startNodeId: String(sourceSegment.startNodeId)`.
> That is only correct under identity conditioning. It **must** become
> `String(segment.startNodeId)` (the conditioned span's own endpoints), or every
> chord will be given the parent bend's endpoints and the local axes,
> element lengths and stiffness will all be wrong — while still compiling.

### S2.6 Pass test — `scripts/lfea-bend-retopology-check.mjs`

```js
// Geometric closure: chord polyline length must approach the true arc length.
const arcLength = radius * sweepAngle;
const chordLength = sum(adjacent chord distances);
assert.ok((arcLength - chordLength) / arcLength < 0.02, 'chord shortfall within profile limit');

// Every chord endpoint lies on the arc.
for (const p of chordPoints) {
  assert.ok(Math.abs(dist(p, centre) - radius) / radius < 1e-9, 'chord node off arc');
}

// Mid-arc station exists (even chord count).
assert.equal(chordCount % 2, 0, 'chord count must be even for a mid-arc code station');

// Custody: no node is silently retired while still bound.
assert.equal(retiredNodeIds.filter((id) => boundNodeIds.has(id)).length, 0,
  'a bound node was retired without re-targeting');

// BM4_L expectation: 10 bends x 4 chords = 40 chord spans replacing 10 spans.
assert.equal(conditioned.segments.filter((s) => s.meta?.bendChordOf).length, 40);
```

### S2.7 Definition of done

- [ ] BM4_L conditions to 40 chord spans from 10 bends
- [ ] Every chord node lies on its arc to 1e-9 relative
- [ ] No bound node retired without re-target
- [ ] `npm run check:lfea-linear-core` passes **with re-qualified expected values**
- [ ] Benchmark deltas recorded in `reports/` with a written justification per moved number

> Numbers **will** move at this stage. That is expected: the model now carries
> curvature it did not carry before. Every moved benchmark value must be
> re-qualified against CAESAR output, not simply re-baselined.

---

## 8. Stage S3 — Bend flexibility factors

### S3.1 The double-count hazard

`bend-component.js` ships `bendFlexibilityDoubleCountGuard` precisely for this:

> *"The declared factor basis already contains the curved geometry, but the arc
> is also represented geometrically and contributes a further N of compliance;
> applying the factor here would count bend flexibility twice."*

After S2 the arc **is** represented geometrically. Therefore
`flexibilityGeometryBasis` must be declared to match, and the guard must be
called and its result asserted — not ignored.

### S3.2 Wiring

```js
const factorResult = calculateB31Factors({ /* geometry, edition profile */ });
if (factorResult.status !== 'QUALIFIED' || !factorResult.componentFactorSet) {
  fail('BEND_FACTOR_SET_NOT_QUALIFIED', `Bend ${id} produced no qualified B31 factor set.`);
}
const component = compilePipingComponent({
  componentId: `${modelId}.BEND.${sourceIndex}`,
  componentType: 'BEND',
  profile: componentProfile(),
  arc: { tangentStart, tangentEnd, incomingDirection, declaredRadius },
  material, section,
  frameElementProfile: frameProfile(),
  localAxisProfile: FRAME_LOCAL_AXIS_PROFILE,
  referenceVector: null,
  factorSet: factorResult.componentFactorSet,
});
```

### S3.3 Pass test

```js
// The guard must actively pass, not be skipped.
assert.equal(component.flexibility.doubleCountGuard.status, 'PASS');
// Flexibility must be owned exactly once.
assert.equal(component.flexibilityOwnership.owner, 'COMPONENT_FACTOR_SET');
// Engineering direction: a flexible bend must be MORE flexible than a rigid chord.
assert.ok(displacementWithFlexibility > displacementStraightChord,
  'bend flexibility must increase displacement, not decrease it');
```

### S3.4 Flip the capability flag

Set `bendExactMechanics: true` in the capability profile. The S0 anti-drift
check now requires `lfea-b3.18-bm1-bend-check.mjs` to exist and be wired.

---

## 9. Stages S4–S6

Same shape as S3. For each: wire the builder, assert the guard, flip exactly one
capability flag, re-qualify one benchmark.

- **S4 Reducer** — `compileTenCylinderReducerAuthority`, `REDUCER_SEGMENT_COUNT`.
  Flag `reducerExactMechanics`. Benchmark `lfea-b3.23`.
- **S5 Bourdon** — `deriveMec21BendPressureFreeState`. Requires per-chord MEC-21
  coordinate fields; the reference axes must be sampled from the **same physical
  bend initial point** for every chord, or refining the mesh moves the pressure
  endpoint. Flags `pressureStiffening`, `pressureAxialThrust`, `pressureBourdon`.
- **S6 Tee/branch** — `classifyBranchLegs`,
  `deriveB31JDirectionalBranchEndModifiers`. Flag `teeExactMechanics`.
  Benchmark `lfea-b3.21`.

---

## 10. Stage S7 — UI wiring

No UI code change is required if S0 is done correctly: dispositions already flow
from `componentDispositions` into
`preFlight.preparation.structuralPreparation.segmentBindings[].limitationCode`,
then into the Error Check panel via
`src/workspace/lfea-diagnostics/lfea-error-check-presentation.js`.

What to verify once a flag flips:

1. The corresponding finding **disappears** from Error Check. With grouping in
   place a whole group vanishes rather than N rows.
2. `src/workspace/lfea-finding-plain-language.js` and
   `src/workspace/lfea-finding-suggested-action.js` keep the entry — a model
   with an unresolvable arc still degrades and still needs the sentence.
3. Model Review geometry (`lfea-geometry-review.js`) now shows **more analysis
   nodes than source nodes** for the ANALYSIS representation. That is correct
   and is exactly what the SOURCE/ANALYSIS toggle exists to show. Confirm the
   toggle still distinguishes them.
4. `preFlight.diagnostics.summary.sourceNodeCount` vs analysis node count will
   differ; anything asserting equality must be updated.

### S7.1 UI pass test

```js
const bendGroup = presentation.sections
  .flatMap((s) => s.groups)
  .find((g) => g.code === 'MODEL_BEND_EXACT_MECHANICS_UNAVAILABLE');
assert.equal(bendGroup, undefined,
  'bend limitation must not be reported once bendExactMechanics is enabled');
```

---

## 11. Global anti-drift

`scripts/lfea-piping-component-promotion-anti-drift-check.mjs`

```js
// 1. The retype that made the limitation self-fulfilling must not return.
const prep = read('src/core/linear-piping-analysis-consumer/inputxml-linear-structural-preparation.js');
assert.doesNotMatch(prep, /type:\s*'PIPE'[\s\S]{0,200}GENERIC_APPROX_BEND_STRAIGHT_CHORD/u,
  'Bends must not be retyped to PIPE when a tangent basis is available.');

// 2. Chord endpoints must come from the conditioned span, never the source segment.
assert.doesNotMatch(prep, /startNodeId:\s*String\(sourceSegment\.startNodeId\)/u,
  'Span endpoints must come from the conditioned segment, not the source segment.');

// 3. A capability flag may not be enabled while its builder is unreachable.
const consumerDir = 'src/core/linear-piping-analysis-consumer';
if (PRODUCTION_CAPABILITY_PROFILE.bendExactMechanics) {
  assert.ok(grepDir(consumerDir, /compilePipingComponent/u),
    'bendExactMechanics is true but production never calls compilePipingComponent.');
}

// 4. The double-count guard may not be bypassed.
assert.doesNotMatch(grepAll(consumerDir), /doubleCountGuard[\s\S]{0,40}(?:\/\/|skip|ignore)/u,
  'The bend flexibility double-count guard must not be bypassed.');
```

---

## 12. Workflow for the implementing agent

```
for each stage S0 .. S7:
  1. git worktree add ../wt-<stage> -b agent/<stage> origin/main
  2. record baseline:  npm run check:lfea-linear-core  > baseline.txt
  3. implement ONLY that stage
  4. npm run check:lfea-linear-core > after.txt ; diff baseline.txt after.txt
  5. if any number moved and the stage is S0, S1 or S7 -> STOP, you broke something
     (those three stages must be numerically inert)
  6. if any number moved and the stage is S2..S6 -> re-qualify against CAESAR
     output and write the justification into reports/
  7. run the stage pass test + the global anti-drift check
  8. commit, push, open one PR per stage
```

### Rules

1. **One stage per PR.** Batching makes a moved benchmark unattributable.
2. **Never re-baseline a benchmark to make it pass.** Re-qualify against CAESAR
   output, or revert.
3. **Never disable a guard to make a test pass.** Guards encode the engineering.
4. **Fail closed.** If a restraint cannot be unambiguously re-targeted, BLOCK.
5. **S0, S1 and S7 must not move a single number.** If they do, the change is wrong.

---

## 13. Open engineering questions — must be answered by a human

1. **InputXML internal-station bends (B3).** BM4's InputXML declares internal
   CAESAR station nodes on all 11 bends, so no arc is resolved. Is the correct
   treatment to (a) derive the arc from the station nodes, (b) require the ACCDB
   source for such models, or (c) keep degrading to a straight chord and say so?
   *No implementation should guess this.*
2. **Restraint re-targeting at retired corner nodes (S2.3).** Is nearest-node
   re-target acceptable, or must the corner node be retained as a massless
   station so nothing moves?
3. **`bendSeedingSegments = 4`** is proposed for an exact mid-arc station.
   Confirm against the convergence study in
   `evaluateBendSubdivisionConvergence` before adopting.
4. **Benchmark coverage.** BM1 fixtures (`benchmarks/LFEA/BM1/`) are absent from
   this repository, so `lfea-b3.15`/`b3.16`/`b3.18` cannot run locally. S3 cannot
   be qualified until those fixtures are restored.

---

## 14. Verification status of this document

| Claim | Input used | How verified |
|---|---|---|
| Production never builds components | `src/**` | `grep -rn "compilePipingComponent"` → benchmark harness + `scripts/` only |
| C1 retype disables seeding | P1, R1 | Read `projectInputXmlAnalyticalGeometry` and the `seedSegment` type gate |
| C2 never enforces a bend limit | P2 | Read `bendLengthErrorLimit: { value: 1 }` (100%) |
| C3 rejects 1→N expansion | P1 | Read `requireIdentityConditioning` id-list equality |
| C4 hardcoded in 4 places | P3, P4, P5 | `grep` for the `authorizedEffects` literal + read `componentDispositions` |
| ACCDB resolves 10/10 arcs | `BM4_L.ACCDB` (untracked) | Executed `accdbTablesToCanonicalGeometry` |
| ACCDB endpoints are not tangents | `BM4_L.ACCDB` (untracked) | Measured bend #1: start→centre `0.867180`, end→centre `0.538815` |
| `discretiseBend` rejects ACCDB bends | `BM4_L.ACCDB` (untracked), R2 | Executed `conditionGeometry` → `BEND_CENTRE_INCONSISTENT`, residual `0.3786583366683667` |
| Tangent points are discarded | P6 | Enumerated `segment.meta` keys at runtime; only `bendArcCentre`, `bendComputedRadius` present |
| InputXML resolves 0/11 arcs | `InputXML_BM4.xml`, `InputXML_BM4.repaired.xml` (tracked) | Executed; `BEND_INTERNAL_STATION_GEOMETRY_NOT_SUPPORTED` ×11 in both |
| Removing C1–C3 alone is inert | `BM4_L.ACCDB` + scratch branch | Implemented C1–C3 removal; BM4 chord count stayed **0**, all 8 baseline checks still passed |
| BM1 cannot run locally | `benchmarks/LFEA/BM1/` | `git ls-files` empty; `lfea-b3.15` fails `ENOENT` on unmodified `main` |

Everything in §3 was executed against `benchmarks/LFEA/BM4/`. The stage designs
in §5–§11 are **proposals and have not been implemented or benchmarked.**
