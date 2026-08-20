# PR1293 Work Report — LAFEA.3 Governed Local-Refinement Construction Qualification

## Recovery header

- PR: #1293
- Title: `Diagnostic: PR1270 source-owned graded remesh`
- Branch: `diagnostic/pr1270-source-remesh-20260820`
- Parent product PR: #1270
- Parent product branch: `agent/lafea3-local-refinement-ui-20260819`
- Frozen product head under diagnosis: `42beedc20b20733e924c2d0e581785be80e356fa`
- Criticality: `ENGINEERING_CRITICAL`
- Mutation authority: DIAGNOSTIC BRANCH ONLY
- Product mutation: NONE
- Merge authority: OWNER ONLY
- PR disposition: DIAGNOSTIC ONLY — NEVER MERGE AS PRODUCT
- Governed product adjacency threshold: `adjacentSizeRatioMax = 1.5` — UNCHANGED

## 60-second handover

PR #1270 added governed LAFEA.3 local-refinement UX and an actual-mesh longest-corner-edge adjacency gate. The existing retained-parent/local-insertion construction cannot reliably produce meshes that satisfy the unchanged `1.5` gate across the declared `h_local/h_global >= 0.25` envelope.

This diagnostic PR has falsified multiple repair strategies without touching product source or weakening policy. The first construction to pass the full rectangular T3/T6 envelope is a **target-anchored balanced mapped metric grid**:

```text
H(D) = MIN(H_GLOBAL, H_LOCAL + beta*D)
beta = 1 - 1/G_MAX
M(D) = integral(0..D) ds/H(s)
```

For `G_MAX=1.5`, `beta=1/3`. Each mapped axis is stationed independently in metric space with the selected target as an exact grid station. The left/right interval counts start at `ceil(M_left)` / `ceil(M_right)` and the side with the larger target-adjacent physical interval is incremented until the cross-target interval ratio is also `<=1.5`.

Exact rectangular qualification receipt: **32/32 PASS** across T3/T6, four local ratios `0.75/0.50/0.375/0.25`, and center/edge/corner/elongated target layouts. Worst actual mesh adjacency `1.3397800661540866`; worst independent axis interval ratio `1.4997433400453577`; worst AR `4.386062176872018`; minimum SJ `0.2279949439096105`; max elements `198`; max T6 nodes `437`; minimum local corner gain `+3`.

Affine screen then proved rigid 30° rotation invariance and all 75° shear cases PASS. A 65° shear challenge also remained above the production SJ block (`minimum SJ = 0.21492610281797486`), so 65° is **observed PASS only**, not a valid negative control and not yet production authority. Next action is a 60°/55° boundary sweep, followed by T6 repetition of the accepted affine envelope.

## Mission

Determine a deterministic LAFEA.3 local-refinement construction that:

1. preserves the product profile threshold `adjacentSizeRatioMax=1.5`;
2. visibly delivers the requested refinement at the selected physical target;
3. preserves authoritative source boundary geometry/ownership;
4. passes existing LAFEA.3 AR/SJ/inversion/topology gates;
5. is deterministic on replay;
6. does not depend on post-hoc tolerance weakening, hidden fallback, or unbounded topology repair;
7. has an explicit qualified geometry envelope before any product binding/UI promotion.

## Protected authority / invariants

- No change to `adjacentSizeRatioMax=1.5`.
- No change to AR/SJ warning or block thresholds.
- No change to T3/T6 formulations.
- No solver/formulation/recovery changes.
- No evidence schema/hash-domain change in product PR #1270.
- No nearest-node transfer of geometry/BC ownership.
- No silent fallback from unsupported mapped geometry to an unqualified unstructured strategy.
- No workflow-file modifications.
- Diagnostic code is not product authority.

## Product gate definition under test

`src/core/lafea-meshing/refinement-fields.js` qualifies actual triangular adjacency as:

```text
characteristic length = longest corner edge
adjacency = shared corner edge
ratio = max(h_e_left, h_e_right) / min(h_e_left, h_e_right)
PASS iff every ratio <= bound mesh-profile adjacentSizeRatioMax
```

Current governed LAFEA.3 bound is `1.5`.

## Hand-calculation basis

### Existing discrete transition preview

For `H_GLOBAL=30 mm`, `H_LOCAL=7.5 mm`, `G=1.5`:

```text
7.5 -> 11.25 -> 16.875 -> 25.3125 -> 30 mm
```

Two-elements-per-band radial construction reaches approximately:

```text
7.5 + 2*11.25 + 2*16.875 + 2*25.3125 = 114.375 mm
```

This necessarily reaches boundaries on common 200 x 120 mm regions, while the old retained-parent refiner cannot generally alter the authoritative boundary discretization.

### Continuous mapped metric field

Use:

```text
H(D) = MIN(Hg, Hl + beta*D)
beta = 1 - 1/g
```

For `g=1.5`, `beta=1/3`.

Metric coordinate:

```text
M(D) = integral(0..D) ds/H(s)
     = ln((Hl + beta*D)/Hl)/beta      [linear branch]
```

Inverse:

```text
D(M) = Hl * (exp(beta*M) - 1) / beta
```

If every intra-side metric interval satisfies `DeltaM <= 1`:

```text
adjacent 1-D physical interval ratio <= exp(beta*DeltaM)
                                        <= exp(1/3)
                                        = 1.3956124250860895 < 1.5
```

The target is made an exact station. Left/right counts are independently balanced so the cross-target physical interval ratio also satisfies `<=1.5`.

For the deepest `30 -> 7.5 mm` request, continuous-field transition radius is:

```text
(30 - 7.5)/(1/3) = 67.5 mm
```

versus `114.375 mm` for the prior discrete two-elements-per-band preview.

## Rejected hypotheses / falsifiers

| Candidate | Exact observed outcome | Disposition |
|---|---|---|
| Longest-edge closure + repeated Lawson flips | `~1.635 -> ~1.39e11`; 661 violating adjacencies after 512 insertions | REJECTED |
| No-flip retained-parent propagation | 8/32 pass; up to 1,872 insertions; ratio up to 2.548 | REJECTED |
| Source remesh + boundary subdivision while retaining coarse global interior seed | 4/32 pass; worst 1.74660 | REJECTED |
| Source remesh + monotone governed edge flips | no pass-count improvement; introduced normal quality BLOCKs | REJECTED |
| Stricter internal discrete growth (`sqrt(1.5)`, `1.2`, `1.15`) with external 1.5 | 0/48; worst about 1.98573 / 1.84035 / 2.01339 | REJECTED |
| Boundary-only source remesh | 2/16; worst 2.142857 | REJECTED |
| Continuous Lipschitz field + centroid Delaunay insertion | 0/6; worst adjacency 36.4937; pathological local edge ~0.00823 mm | REJECTED |
| Continuous field + conforming longest-edge bisection | 0/6; some adjacency 1.497–1.500 but shape BLOCKs or 4,000-split cap | REJECTED |
| First target-anchored mapped metric grid without cross-target balancing | all actual mesh checks passed, but independent axis interval ratio reached 1.76293 | REJECTED as insufficient construction proof |
| Target-anchored balanced mapped metric grid | 32/32 rectangular T3/T6 PASS | ACTIVE CANDIDATE |

## Exact rectangular qualification receipt

Evidence-capture head:

```text
0be9ecba65b835f60989a8641b35bff2e7c56540
```

Workflow run:

```text
32347838093
```

Artifact JSON:

```text
test-results/pr1270-metric-mapped-control-matrix.json
```

Receipt:

```text
check = PR1270_TARGET_ANCHORED_BALANCED_MAPPED_METRIC_GRADING_CONTROL_V2
qualification = PASS
cases = 32
pass = 32
fail = 0
worst actual mesh adjacency = 1.3397800661540866
margin to 1.5 = 0.16021993384591338
worst construction axis interval ratio = 1.4997433400453577
worst AR = 4.386062176872018
minimum SJ = 0.2279949439096105
maximum child elements = 198
maximum child T6 nodes = 437
minimum local corner gain = 3
```

By family:

```text
T3: 16/16 PASS
T6: 16/16 PASS
```

By local target:

```text
22.5 mm: worst adjacency 1.2486218678; min SJ 0.4505350582
15.0 mm: worst adjacency 1.2245803114; min SJ 0.4451194808
11.25 mm: worst adjacency 1.3307121958; min SJ 0.2334419111
7.5 mm: worst adjacency 1.3397800662; min SJ 0.2279949439
```

The limiting engineering margin is shape quality, not adjacency: `SJ_min - SJ_block = 0.0279949439`.

## Affine qualification status

Exact T3 screen head:

```text
dfc4cbe83080fd5c88e771e783542936b45e545c
```

Workflow run:

```text
32348308603
```

Cases:

```text
30-degree rigid rotation
75-degree included-angle parallelogram
65-degree included-angle challenge
h_local = 15 and 7.5 mm
targets = center / near-edge / near-corner
T3 only
```

Observed:

```text
30-degree rotation: invariant to 1e-11 metric tolerance
75-degree positive cases: 6/6 PASS
75-degree worst: AR 4.0707489191; SJ 0.2372845502
65-degree challenge: 6/6 remain non-BLOCK
65-degree worst: AR 4.2168344150; SJ 0.2149261028
positive worst adjacency: 1.3282147318
positive worst axis interval ratio: 1.3855048321
maximum boundary-line residual: 5.6843418861e-14 mm
```

The screen itself is reported `BLOCK` only because its expected-negative assertion assumed 65 degrees would block. The engineering observation is that 65 degrees did not block. Do not alter production thresholds to manufacture the expected result.

## Inherited UI/browser defect — separate from meshing diagnostic

Exact product head #1270 already fails visible-workbench Chromium run `32289461519` after exact-head/static/build/shell checks pass.

Failure signature:

```text
e2e/lafea-visible-workbench.spec.js:140
missing result highlight: Max |transferred force|
locator under [data-role="lafea-result-highlights"]
```

Diagnostic heads show the same failure when they reach Chromium. This is therefore inherited/pre-existing and is not evidence against or in favor of the meshing candidate. It must be tracked separately and must prevent claiming the full visible-workbench workflow is green.

## Changed-file ledger

Diagnostic branch only:

- `scripts/lafea-pr1270-source-remesh-case.mjs`
- `scripts/lafea-pr1270-source-remesh-matrix.mjs`
- `scripts/lafea-pr1270-boundary-only-seed-matrix.mjs`
- `scripts/lafea-pr1270-lipschitz-delaunay-matrix.mjs`
- `scripts/lafea-pr1270-lipschitz-bisection-matrix.mjs`
- `scripts/lafea-pr1270-metric-mapped-control-matrix.mjs`
- `scripts/lafea-pr1270-target-anchored-metric-control.mjs`
- `scripts/lafea-pr1270-affine-metric-screen.mjs`
- `scripts/lafea-ui-analysis-settings-check.mjs` (diagnostic trigger only)
- `agents/PR1293_workreport.md`

No product source file is modified by this diagnostic programme.

## Validation ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| Frozen product head | PASS | #1270 head `42beedc20...` | GitHub PR metadata |
| Product threshold unchanged | PASS | actual gate remains bound-profile `1.5` | repository source |
| Rejected-algorithm falsifiers | PASS as falsifiers | numerical outcomes recorded above | exact-head diagnostic execution |
| Balanced rectangular T3/T6 matrix | PASS | 32/32 | production quality + actual adjacency + independent axis audit + replay |
| Rigid rotation invariance | PASS | no metric drift above `1e-11` | independent affine control |
| 75-degree affine positive envelope | PASS | 6/6 T3, min SJ `0.23728455` | production quality + independent geometry audit |
| 65-degree challenge | OBSERVED PASS / NOT AUTHORIZED | min SJ `0.21492610`; insufficient release margin | production quality + independent geometry audit |
| 60/55-degree boundary sweep | NOT_RUN | next qualification slice | independent affine control |
| T6 affine positive-envelope replay | NOT_RUN | run after angular boundary is established | production quality + straight-midside geometry audit |
| Product binding | NOT_RUN / NOT AUTHORIZED | diagnostic candidate only | owner/qualification gate |
| Product mapped-strategy UI | NOT_RUN | cannot expose before product authority | browser/user workflow |
| Full visible-workbench workflow | FAIL / INHERITED | pre-existing result-highlight failure at line 140 | exact product-head Chromium run |

No NOT_RUN or observed diagnostic PASS is represented as release qualification.

## Risks / active issues

- `RISK-1293-01`: minimum rectangular SJ margin above block is only ~0.028; affine distortion can consume it.
- `RISK-1293-02`: independent axis grading margin can be tight (`1.499743` vs `1.5`), so construction receipt must remain visible and fail closed.
- `RISK-1293-03`: current control is mapped four-sided affine geometry only; holes, curved boundaries, arbitrary polygons and multipatch regions remain unsupported.
- `RISK-1293-04`: product PR #1270 has an inherited visible-workbench result-highlight failure unrelated to this meshing diagnostic.
- `RISK-1293-05`: production integration must preserve source boundary IDs/curve ownership and must not infer authoritative geometry from retained mesh chords.

## Current engineering decision

`TARGET_ANCHORED_BALANCED_MAPPED_METRIC_GRADING` is the only surviving construction candidate.

It is **NOT production-authorized**. Current evidence supports:

```text
rectangular mapped regions: qualified diagnostic envelope
30-degree rigid rotation: invariant
75-degree included-angle affine region: positive T3 diagnostic envelope
65-degree included-angle affine region: observed PASS but margin too small for authority
```

No claim is made for holes, arcs, arbitrary polygons, non-affine quads, multiple refinement seeds, periodic domains, or T6 affine qualification beyond the rectangular 32-case matrix.

## EXACT_NEXT_ACTION

```text
1. Run T3 affine angular boundary sweep at 60 and 55 degrees for h_local=15/7.5 and center/edge/corner targets.
2. Establish the first actual production quality BLOCK without changing SJ=0.2.
3. Select a conservative positive angular envelope from measured margin; do not use the exact failure angle as the release limit.
4. Repeat accepted positive affine envelope with T6 straight-midpoint mapping and replay checks.
5. Only then design a narrow product mapped-region binding with explicit unsupported-geometry fail-closed UI.
```

## Appendix A — next-agent qualification questions

### A1 — Production trace

Where is the actual `1.5` local-refinement adjacency authority consumed, and what characteristic length / adjacency definition does it use?

Expected answer: bound LAFEA.3 mesh profile -> `qualifyRefinedMeshAdjacentSizeRatio`; longest corner edge per T3/T6 element; shared corner edge; product evidence creation blocks before custody for local-refinement meshes when violated.

### A2 — Current failure isolation

Why are the previous Delaunay/closure strategies rejected even though some could eventually reduce the ratio?

Expected answer: they either diverged, required unbounded/excessive insertions, retained incompatible coarse point fields, or satisfied adjacency only by creating AR/SJ BLOCKs. No threshold change is permitted to hide those failures.

### A3 — Authority / invariant

What is the authority status of the target-anchored balanced mapped metric algorithm?

Expected answer: diagnostic candidate only. It has 32/32 rectangular T3/T6 evidence and partial affine T3 evidence but is not product-bound or release-qualified.

### A4 — Independent validation

What independent evidence exists beyond the production adjacency gate?

Expected answer: metric-space interval bound, explicit cross-target interval balancing, target exact-station check, independent axis interval ratio, independent triangle AR/SJ/angle audit, boundary-line residual, rotation invariance and deterministic replay.

### A5 — Next minimal patch

What is the next engineering action before product code can change?

Expected answer: 60/55-degree T3 affine boundary sweep, then T6 repetition of the conservative accepted affine envelope; only afterward create a narrow mapped-region product binding and UI fail-closed contract.
