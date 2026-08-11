# PR1001 Engineering Work Report

## PR Mission Control

- Mission: qualify BM4_L CAESAR-II mechanics against literal `<10%` comparison gates for L2/L3/L4/L5/L6/L14 without benchmark fitting.
- Source task / issue: M047 / BM4_L parity continuation. Issue #991 remains untouched.
- PR number: 1001
- Branch: `agent/m047-bm4l-clean-qualified`
- Base commit: `7a08f9db84f298990250793226b36d4a82dbe01e`
- Current HEAD before this report update: `894ce9b2b4e5622c6565ff5e64bded863b8fedb7`
- Governed implementation head for exact numerical replay: `7488ba76126f8240bb61c80fad243cf096c5fe08`
- PR status: OPEN / DRAFT
- Current stage: Stage 7 — local profile-only native-unit gate candidate qualification
- Last completed stage: Stage 5 — Type 2.1 tee free-growth accuracy qualification
- Stage 6 decision: PARTIAL — authority/residual investigation materially narrowed the remaining gap and independently reproduced the native-unit small-result boundary outside BM4_L, but CAESAR public documentation does not state an explicit `0.0001 deg` stored-output zero-suppression rule.
- Engineering status: tee fictitious-rigid thermal free growth is qualified locally/offline. No second production-mechanics mechanism is authorized. QST-004 is now accepted only as a controlled profile-authority candidate for local falsification; the live rotation gate remains unchanged.
- Validation status: exact-head replay, tee sign/carrier/K/equilibrium/superposition, reducer source/provenance, reducer pressure consistency, ACCDB reference-import checks, cross-model CAESAR output checks, and profile-only signature replay PASS. GitHub Actions have not been intentionally rerun.
- Current blocker: exact CAESAR material-library T1 strain and exact reducer cylinder property station remain unavailable; direct primary documentation for an exact stored-output `0.0001 deg` zeroing rule was not found.
- Exact next action: locally qualify a one-line rotation `zeroReferenceAbsolute` candidate derived from `0.0001 deg -> rad`, proving that it changes only exact-zero ROTATION statuses and leaves actual/reference rows, nonzero-relative results, K, recovery, equilibrium and superposition untouched. Do not push the profile candidate under the current no-Actions policy.

## Handover in 60 Seconds

### What is now true

- Accepted production baseline: **435 failures** — L2 31, L3 121, L4 40, L5 100, L6 22, L14 121.
- Qualified Type 2.1 tee correction: free thermal growth of the existing centerline-to-run-surface offset, `g_thermal = epsilon * r_surface`.
- Correct tee carriers are `ACCDB.E12` for tee 20160 and `ACCDB.E36.STRAIGHT` for tee 20295. The old 284 result is retired because it omitted the incoming-straight carrier for source 36.
- The tee correction changes `f_initial` only. K, Kb, Surface Node geometry, gravity, pressure and bend mechanics stay unchanged.
- Exact-head offline replay independently reproduces **210 failures**: L2 31, L3 37, L4 40, L5 43, L6 22, L14 37.
- Candidate equilibrium is about `4.1e-5 N / 7.5e-6 N.m`; `L14=L3` is exact and the other six-case superposition identities remain at numerical roundoff.
- All 105 tee-candidate failures with exact-zero CAESAR references are **ROTATION** rows: L2 26, L3 17, L4 33, L5 5, L6 7, L14 17. L3 and L14 have the same zero-reference set.
- Exact-head replay error is about `1e-11 m/rad`; failing zero-reference rotations are typically `1e-7` to `2e-6 rad`, so they are not solver numerical noise.
- BM4_L reducer provenance proves all four `INPUT_REDUCERS` rows have `R1=R2=L1=L2=0.0`.
- Reducer sampling sensitivity materially moves L4 nonzero-magnitude failures but leaves the exact-zero rotation floor near 32-33. Disabling reducer Bourdon pressure is strongly falsified (`L4: 40 -> 281`).
- Pinned Common evidence contains no Print-Alphas/material table, so exact T1 material strain remains externally blocked.
- BM4_L raw ACCDB references show a sharp native-unit lower nonzero boundary: smallest nonzero translation `0.00010186503 mm`; smallest nonzero rotation `0.000100629848 deg`.
- The ACCDB importer performs no clipping: it reads `OUTPUT_DISPLACEMENTS.RX/RY/RZ` and converts degrees to radians only.
- The current displacement zero gate `1e-7 m` equals `0.0001 mm`; the rotation zero gate `1e-7 rad` equals only `0.00000572958 deg`, a **17.4533x native-unit asymmetry**.
- Independent CAESAR v14 output evidence outside BM4_L is consistent with the same small-rotation boundary:
  - BM1 XML: exact zeros coexist with a smallest visible nonzero rotation of `0.000120 deg` in the inspected displacement report.
  - BM2 XML: exact zeros coexist with visible nonzero rotations such as `0.000141 deg` and `0.000217 deg`; searches found no displayed nonzero `0.00001-0.00009 deg` values.
  - BM3 XML: exact-zero small components coexist with larger nonzero rotations; no contrary sub-`0.0001 deg` visible value was found in the inspected report.
  - BM4_NL is a separate raw ACCDB benchmark (`SHA-256 85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21`, CAESAR 14.000). Its Access-derived report contains exact-zero rotation references alongside small nonzero references `1.819680e-6`, `1.919403e-6`, `2.201650e-6 rad`, i.e. just above `0.0001 deg`.
- Hexagon primary documentation confirms rotations use degrees, displacement reports export to Access `OUTPUT_DISPLACEMENTS`, and report precision is a separately configurable presentation setting. It does **not** explicitly document a hard `0.0001 deg` Access-storage zeroing rule.
- Diagnostic profile-only replay with `ROTATION.zeroReferenceAbsolute = 0.0001 deg = 1.7453292519943296e-6 rad` changes tee-candidate counts from `31/37/40/43/22/37` to **`6/20/7/39/15/20`**, total **210 -> 107**.
- That diagnostic changes **only exact-zero ROTATION statuses**. Every nonzero-reference failure count is identical before/after:
  - L2 nonzero 5 -> 5
  - L3 20 -> 20
  - L4 7 -> 7
  - L5 38 -> 38
  - L6 15 -> 15
  - L14 20 -> 20
- The two exact-zero rotation rows still failing at a `0.0001 deg` gate are:
  - L2 node 20440 RZ: `-2.033276225626185e-6 rad = -0.000116498146 deg`;
  - L5 node 22110 RZ: `+1.7487675123311166e-6 rad = +0.000100196998 deg`.
- Correction to prior note: the two remaining rows are **one L2 and one L5**, not two L5 rows.

### What is being worked on

- QST-001: exact CAESAR material-library T1 strain from 21 C to 120 C.
- QST-002: exact property station used inside each of CAESAR's ten structural reducer cylinders.
- QST-003: mechanics/recovery ownership of the remaining real zero-reference rotation discrepancies after any independently qualified output-authority correction.
- QST-004: native-unit zero-boundary / SI gate consistency. Cross-model evidence is now strong enough for a local profile-only candidate, but the live gate remains unchanged until the candidate is reviewed/authorized.

### What remains unfinished

- Core tee free-growth patch is staged locally, not committed to the PR branch.
- Exact CAESAR T1 material strain is unresolved.
- Exact reducer cylinder property sampling is unresolved.
- QST-004 has no explicit Hexagon sentence establishing a hard `0.0001 deg` Access-storage cutoff; therefore the profile candidate is local-only and not yet branch authority.
- The two residual exact-zero rotations above `0.0001 deg` remain genuine QST-003 targets.

### What must not be assumed

- Do not promote benchmark-optimal alpha.
- Do not choose reducer endpoint/midpoint sampling from failure counts.
- Do not treat the reducer 60%-length Alpha/SIF fallback as structural taper stiffness authority.
- Do not infer structural Type 2.6 branches from Misc SIF rows alone.
- Do not change the live rotation gate merely because 107 is a better score. The Stage-7 candidate is justified by native-unit consistency plus independent CAESAR evidence, and must remain a separate profile-only change if eventually authorized.
- Do not alter reference values, actual solver rows, signs, source mappings, row identities or nonzero `<10%` relative gates.

### Highest-risk remaining item

Conflating an empirically consistent CAESAR output resolution with a formally documented storage rule. The Stage-7 candidate must be reviewable and separable so it can be rejected without affecting tee mechanics.

### Exact next action

Create and locally validate the one-line Stage-7 profile candidate only. No branch profile commit and no Actions trigger. Record its exact signature and retain the current live profile as authority until Owner/review authorization.

## Mission and Engineering Intent

The target is physical and output parity with CAESAR II `14.00.00.0910 (Build 231113)`, not benchmark-score minimization. One independently justified mechanism or authority correction is allowed per controlled iteration. Benchmark-derived coefficients, stiffnesses, sampling positions or tolerances are prohibited.

Governed cases:

- `L2=W`
- `L3=T1`
- `L4=P1`
- `L5=W+T1+P1`
- `L6=W+P1`
- `L14=L5-L6=T1`

Pinned CAESAR reports at Common `179c4831cf521cf797c13699cfbbd118315c9244`:

- `LFEA/BM4/Miscdata_BM4_L.txt`
- `LFEA/BM4/Loadcasereport_BM4_L.txt`

The Misc report establishes Type 2.1 Surface Nodes 20161 and 20296 plus branch FLEX/Kb. The Load Case Report establishes case formulae, EC and zero friction for L2-L6.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Type 2.1 tee topology / Kb | P0 | VALIDATED | prior | Misc report + production modifiers |
| Tee fictitious-rigid thermal free growth | P0 | VALIDATED | 5 | exact-head replay 435 -> 210 |
| Carrier coverage E12 + E36.STRAIGHT | P0 | VALIDATED | 5 | source36 incoming-straight coverage |
| Fail-closed common run temperature/material ownership | P0 | IMPLEMENTED | 5 local | v3 local patch |
| Exact CAESAR T1 strain | P0 | BLOCKED | 6 | no Print-Alphas/material table in pinned bundle |
| Exact reducer cylinder property station | P1 | BLOCKED | 6 | ten cylinders documented; station not published |
| Reducer R1/R2/L1/L2 source state | P1 | VALIDATED | 6 | all four rows hash to `0.0` values |
| Exact-zero residual mechanics ownership | P1 | INVESTIGATING | 6-7 | all 105 are rotations; two remain above Stage-7 candidate gate |
| Native-unit output zero boundary / rotation gate unit consistency | P0 | ACCEPTED | 7 local candidate | BM4_L raw ACCDB + independent BM4_NL raw benchmark + BM1/BM2/BM3 output + unit/history checks |
| Stage-7 profile-only candidate | P0 | IN_PROGRESS | 7 | predeclared one-line local patch; live profile unchanged |
| Type 2.6 structural modifiers | P2 | DEFERRED | future | no structural topology authority |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| ISS-001 | defect | P0 | ACCEPTED | Type 2.1 fictitious rigid omitted thermal free growth | YES |
| ISS-002 | defect | P0 | ACCEPTED | Source-ID-only tee carrier attachment misses `ACCDB.E36.STRAIGHT` | YES |
| DEC-001 | decision | P0 | ACCEPTED | Tee free growth modifies `f_initial`, not K | YES |
| DEC-002 | decision | P0 | ACCEPTED | Fictitious rigid inherits fail-closed common run temperature/material | YES |
| RISK-001 | risk | P0 | OPEN | Provisional alpha must not be fitted | YES |
| QST-001 | question | P0 | BLOCKED | Exact CAESAR T1 material strain from 21 C to 120 C | YES |
| QST-002 | question | P1 | BLOCKED | Exact structural property station in each ten-cylinder reducer segment | YES |
| QST-003 | question | P1 | INVESTIGATING | Mechanics/recovery ownership of genuine zero-reference rotation residuals | YES |
| QST-004 | question | P0 | ACCEPTED | Native-unit/SI gate inconsistency is a controlled profile-authority candidate; live gate unchanged pending authorization | YES |
| RISK-002 | risk | P0 | OPEN | Primary docs confirm unit/export semantics but not an explicit hard `0.0001 deg` Access-storage cutoff | YES |
| DEC-003 | decision | P0 | ACCEPTED | Do not create Type 2.6 mechanics without topology authority | YES |
| DEC-004 | decision | P1 | ACCEPTED | Do not use reducer 60%-Alpha rule as structural stiffness taper | YES |
| DEC-005 | decision | P0 | ACCEPTED | Keep live zero gates unchanged while qualifying Stage-7 candidate locally | YES |
| DEC-006 | decision | P0 | ACCEPTED | If authorized, Stage-7 is profile-only and must not be bundled with tee mechanics or alpha | YES |
| IMP-001 | improvement | P1 | DEFERRED | Productize explicit reducer auxiliary-source evidence | YES |

## Engineering Decisions and Invariants

### DEC-001 — Type 2.1 tee thermal free state

- `g_thermal = epsilon * r_surface` applies only on the actual tee-modified analysis carrier with non-null rigid offset.
- Production convention: added local initial load `-K_local g_local`, then existing `T^T` and `H^T` transformations.
- K stays unchanged.
- W/P-only cases stay unchanged.

### DEC-002 — Run-side authority

The fictitious rigid inherits common run temperature/material state. If the two run legs disagree or the required authority is missing, fail closed rather than using branch data or silently selecting one run leg.

### DEC-004 — Reducer 60% rule boundary

CAESAR documents ten successive structural pipe cylinders over reducer element length. A separate 60%-entered-length fallback is used to derive reducer Alpha/slope when Alpha is blank. BM4_L has `R1=R2=L1=L2=0.0`; the 60% rule is not structural-stiffness authority.

### DEC-005 / DEC-006 — Rotation zero-gate candidate boundary

Observed BM4_L raw reference minima:

- translation: `1.0186503e-7 m = 0.00010186503 mm`;
- rotation: `1.7563201286787792e-6 rad = 0.000100629848 deg`.

Current profile:

- displacement zero gate `1e-7 m = 0.0001 mm`;
- rotation zero gate `1e-7 rad = 0.00000572958 deg`.

Stage-7 candidate:

`ROTATION.zeroReferenceAbsolute = radians(0.0001 deg) = 1.7453292519943296e-6 rad`

This candidate is not a solver tolerance and does not modify CAESAR reference values. It is only the absolute acceptance rule used when the stored reference is literally zero. If ever authorized, it must be committed independently from tee mechanics and exact-alpha work.

### Permanent recovery identity

`q = K u - f_fixed - f_initial`

Do not alter recovery sign, reference values, row identities or source mapping to reduce failures.

## Stage Roadmap

- Stage 1 — report initialization + findings — COMPLETE
- Stage 2 — PR allocation/report synchronization — COMPLETE
- Stage 3 — changed-file/repository-state verification — COMPLETE
- Stage 4 — tee thermal free-growth implementation preparation — COMPLETE / branch delivery pending
- Stage 5 — exact-head accuracy replay and tee qualification — COMPLETE
- Stage 6 — authority-first continuation, residual and output-authority diagnostics — PARTIAL / investigation complete enough to define Stage 7
- Stage 7 — local profile-only native-unit gate candidate qualification — IN_PROGRESS
- Stage 8 — remaining mechanics only after Stage-7 disposition and independent authority — NOT_STARTED

## Stage 5 Completion Record

### Implementation

Local v3 patch adds generic tee rigid thermal free growth on the actual carrier, carries common run temperature/material state, fails closed on missing/inconsistent run authority and exposes evidence without altering K.

### Validation

- PASS — syntax and focused helper checks.
- PASS — I/J transform/sign identity.
- PASS — exact-head reconstruction to ~`1e-11 m/rad` versus stored displacement field.
- PASS — six-case replay 31/37/40/43/22/37 = 210.
- PASS — thermal selectivity.
- PASS — common K, recovery identity, equilibrium and superposition.
- PASS — reducer pressure boundary free elongation equivalent to segment-wise axial pressure free strain.
- NOT_RUN — no intentional Actions rerun.

### Fine-tuning disposition

Diagnostic alpha within the printed `0.0012 mm/mm` rounding interval can reach ~150 failures around strain `0.001208-0.001210`; rejected for promotion because it is benchmark-selected.

Stage decision: **COMPLETE**.

## Stage 6 Investigation Record

### Authority search

- Pinned Common tree and `Output_BM4.xml` contain no Print-Alphas/material table.
- Public CAESAR authority confirms thermal strain comes from material data / mean expansion coefficients; exact BM4_L value is not in the pinned bundle.
- Public reducer authority confirms ten successive cylinders and endpoint section definitions but does not publish the internal property station.
- Provenance proves all BM4_L reducer `R1/R2/L1/L2` fields are zero.
- Reducer pressure free-strain sign/magnitude path is internally consistent; disabling it catastrophically regresses L4.

### Exact-zero load-family decomposition

All 105 tee-candidate exact-zero failures are rotations.

| Case | Dominant analysis kinds among zero failures |
|---|---|
| L2 | FRAME 19, RIGID 5, BEND_ARC 1, BEND_INCOMING_STRAIGHT 1 |
| L3 | FRAME 12, RIGID 3, BEND_INCOMING_STRAIGHT 2 |
| L4 | REDUCER 26, BEND_ARC 4, BEND_INCOMING_STRAIGHT 2, FRAME 1 |
| L5 | FRAME 4, RIGID 1 |
| L6 | FRAME 5, BEND_INCOMING_STRAIGHT 1, BEND_ARC 1 |
| L14 | same as L3 |

Representative L4 node 22130 RX is a cancellation: reducer about `-1.67e-6 rad` against bend/straight/frame about `+1.08e-6 rad`, leaving about `-5.95e-7 rad` versus CAESAR zero. Reducer station sensitivity changes nonzero pressure magnitudes materially but leaves the zero-rotation count approximately 32-33, so station uncertainty alone does not explain the zero floor.

### Native-unit zero-boundary evidence

BM4_L raw ACCDB governed reference rows:

- smallest nonzero displacement = `1.0186503000000001e-7 m = 0.00010186503 mm`;
- smallest nonzero rotation = `1.7563201286787792e-6 rad = 0.000100629848 deg`.

The ACCDB reference adapter reads Access `OUTPUT_DISPLACEMENTS` and only applies unit conversion; degrees-to-radians conversion contains no clipping.

Independent evidence:

- BM4_NL PR #957 uses separate ACCDB SHA-256 `85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21`, CAESAR 14.000. Its Access-derived comparison report contains exact-zero rotation references and small nonzero rotation references at/above approximately `0.000104 deg`.
- BM1/BM2/BM3 CAESAR v14 XML displacement output independently shows the same pattern of exact-zero small components with first visible nonzero values around or above `0.0001 deg`; BM2 was explicitly searched for visible `0.00001-0.00009` values and none were found.
- Hexagon primary documentation states rotation output units are degrees, displacement-report data is exported to Access table `OUTPUT_DISPLACEMENTS`, and report precision is configurable separately. No explicit hard Access zero-suppression threshold was located.

History check: commit `eda9e1388b361185bc3c6ef219f35038bbb83a9e` introduced literal-zero gates and assigned the same numeric `1e-7` to displacement and rotation after normalization, without a documented quantity-specific native-unit derivation. PR #988 documents a separate exact-zero gate but no Owner mandate/source for specifically `1e-7 rad`.

### Stage-6 validation

- PASS — exact-head Access oracle/import path checked; importer has no rotation clipping.
- PASS — BM4_L native-unit reference minima measured across all six governed cases.
- PASS — independent BM4_NL Access-derived report checked.
- PASS — independent BM1/BM2/BM3 CAESAR v14 output checked for contradictory sub-`0.0001 deg` visible rotations; none found in inspected data.
- PASS — Hexagon unit/export/report-precision semantics checked.
- PASS — profile/comparator SI-unit interpretation checked.
- PASS — reducer source auxiliary zero proof.
- PASS — reducer pressure disable falsification.
- PASS — reducer station sensitivity bounded as non-authoritative.
- NOT_RUN — no Actions rerun.

### Stage decision

**PARTIAL** — enough independent evidence exists for a controlled local profile-only candidate, but no explicit primary hard-zero storage rule was found. Live profile stays unchanged.

## Stage 7 Pre-Implementation / Local Qualification Record

### Current truth

- Live tee candidate under current profile: 210 failures.
- QST-004 is not a mechanics change.
- The proposed value is derived exactly from the native rotation unit, not selected by a failure-count sweep: `0.0001 deg * pi/180`.
- The branch profile remains unchanged until explicit authorization.

### Objective

Falsify or qualify a one-line profile-only native-unit consistency candidate without changing production mechanics or CAESAR references.

### Expected scope/files

Local only:

- `benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json`

No solver, reducer, tee, recovery, reference-import, comparison-code or source-data changes.

### Engineering rationale

The current displacement exact-zero gate corresponds to `0.0001` in CAESAR's native length unit (mm), while the current rotation gate does not correspond to `0.0001` in CAESAR's native rotation unit (deg). Independent CAESAR models show a consistent small-rotation output boundary near `0.0001 deg`. The candidate tests unit consistency without altering actual/reference values.

### Planned implementation

Change only:

```text
ROTATION.zeroReferenceAbsolute
1e-7 rad
->
1.7453292519943296e-6 rad
```

### Predeclared expected behavior

- Actual solver results: byte/number identical.
- Reference rows: identical.
- Stiffness K: identical.
- Equivalent/initial loads: identical.
- Nonzero-reference relative statuses: identical.
- Only rows with `quantity=ROTATION` and `referenceValue=0` may change PASS/FAIL status.
- Expected tee-candidate external counts under diagnostic replay:
  - L2 31 -> 6
  - L3 37 -> 20
  - L4 40 -> 7
  - L5 43 -> 39
  - L6 22 -> 15
  - L14 37 -> 20
  - total 210 -> 107
- Expected remaining exact-zero failures: exactly two, L2:20440:RZ and L5:22110:RZ.

### Edge cases

- A nonzero CAESAR reference near the boundary must still use the literal `<10%` relative rule; the candidate must never turn a nonzero reference into a zero-reference comparison.
- Values exactly equal to the zero gate use the existing comparator's `<=` semantics.
- No unit conversion is added to comparator code; the profile stores the SI value explicitly.

### Planned validation

- Verify exact radian conversion of `0.0001 deg`.
- Replay all six tee-candidate cases from exact-head artifact.
- Compare before/after failed-row identities.
- Assert every changed row is exact-zero ROTATION.
- Assert nonzero-reference failure identities/counts unchanged.
- Assert actual and reference values are unchanged.
- K/equilibrium/superposition checks are NOT_APPLICABLE to the profile comparison itself but must remain byte-identical because no solve is rerun/changed.
- Do not run or rerun GitHub Actions.

### Known risks

- Strong empirical cross-model evidence is not the same as an explicit Hexagon storage-threshold statement.
- The correction could be rejected by Owner/reviewer even if its signature is clean; keep it local and separable.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---|---|---|---|---|
| `src/core/fea-benchmarks/caesar-accdb-linear-solve.js` | prior | 5 | governed mechanics; tee v3 patch staged locally | YES | exact-head offline replay PASS; not branch-committed |
| `agents/PR1001_workreport.md` | 1 | 7 | canonical mission control / handover | YES | updated before Stage-7 local candidate |
| `PE_1001workreport.md` | 6 | 6 | Owner-requested pointer to canonical report | NO | pointer-only |
| `benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json` | prior | 7 local candidate | governed profile / native-unit gate candidate | YES | live file unchanged; local one-line patch planned |
| `src/core/fea-benchmarks/caesar-accdb-reference.js` | prior | 6 read-only | ACCDB reference import path | YES | no clipping found |
| `src/core/fea-benchmarks/caesar-accdb-units.js` | prior | 6 read-only | degrees-to-radians conversion | YES | exact conversion only |
| `src/core/fea-benchmarks/qualification-comparison.js` | prior | 6 read-only | zero gate semantics | YES | SI-row-unit interpretation confirmed |
| `src/core/linear-fea-reducer-condensation/reducer-condensation.js` | prior | 6 read-only | reducer authority diagnostics | YES | unchanged |
| `src/core/linear-fea-rigid-element/rigid-element.js` | prior | 6 read-only | rigid authority diagnostics | YES | unchanged |
| `scripts/lfea-m047-bm4l-accdb-provenance.ps1` | prior | 6 read-only | ACCDB source hash proof | YES | unchanged |

Before closure, compare this ledger with GitHub's actual changed-file list. Any unexplained file blocks closure.

## Software Validation

| Validation | Status | Head / basis | Evidence |
|---|---|---|---|
| Exact-head artifact reconstruction | PASS | `7488ba...` | displacement reproduction ~1e-11 |
| Tee v3 focused syntax/algebra | PASS | local | sign/carrier/free-growth checks |
| Six-case tee candidate replay | PASS | exact-head artifact | 210 total |
| Reference importer clipping check | PASS | `7488ba...` | no clipping/rounding |
| BM4_L native-unit minima analysis | PASS | exact-head CAESAR references | ~0.0001 mm / deg boundary |
| Cross-model output evidence | PASS | BM1/BM2/BM3/BM4_NL | no contradictory inspected sub-0.0001deg nonzero evidence |
| Reducer auxiliary source hash | PASS | exact-head provenance | R1/R2/L1/L2 all zero |
| Stage-7 local signature replay | PASS_PREIMPLEMENTATION | exact-head reconstructed tee candidate | expected 210 -> 107; nonzero failure counts unchanged |
| Actions rerun | NOT_RUN | current | intentionally not rerun |

## Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Tee carrier coverage | PASS | E12 + E36.STRAIGHT |
| K unchanged | PASS | common stiffness state |
| thermal selectivity | PASS | only T1-containing cases move under tee mechanics |
| `L14=L3` | PASS | exact |
| superposition | PASS | numerical roundoff |
| equilibrium | PASS | ~4.1e-5 N / 7.5e-6 N.m |
| exact alpha authority | BLOCKED | no pinned full-precision material strain |
| exact reducer station authority | BLOCKED | public source omits station |
| rotation native-unit candidate evidence | ACCEPTED_LOCAL_CANDIDATE | BM4_L raw + BM4_NL raw-derived + BM1/BM2/BM3 + Hexagon unit/export semantics |
| explicit hard `0.0001 deg` Access storage rule | NOT_VALIDATED | no direct primary statement found |

## Explicitly Not Validated

- Exact CAESAR material-library T1 strain from 21 C to 120 C.
- Exact reducer cylinder property station.
- A directly documented Hexagon hard zero-suppression threshold of exactly `0.0001 deg` in Access storage.
- Any branch/profile change for Stage 7.
- Structural Type 2.6 interpretation.

## Known / Deferred Work and Forward Sequence

1. Complete Stage-7 **local-only** profile candidate validation and retain artifact/changed-row evidence.
2. Present Stage-7 candidate for Owner/reviewer disposition; do not push while no-Actions policy is active.
3. If authorized later, commit Stage-7 profile change alone and qualify it independently; no tee or alpha change in same commit.
4. Continue QST-003 on the two residual exact-zero rotations and all nonzero-reference failures; do not globally tune stiffness.
5. Obtain exact Print Alphas/material-library strain and replay tee free growth with that exact value as a separate authority change.
6. Continue QST-002 authority search for reducer cylinder station; never select station from BM4_L minimization.
7. Keep Type 2.6 deferred without structural topology authority.
8. When Actions are explicitly authorized for production delivery, push/qualify the single-factor tee patch separately from profile/alpha work.

## Process Notes / Lessons Learned

- Source-ID-only tee ownership can miss an incoming-straight carrier when the source also owns a bend.
- Exact-head completed artifacts provide high-fidelity read-only evidence without rerunning Actions.
- Diagnostic optima inside rounded authority ranges are not authority.
- Access storage precision, CAESAR solver/output cleanup and report formatting are separate layers; do not conflate them.
- A tolerance stored in normalized SI units must be derived consistently from the intended source/native-unit rule for each quantity; copying the same numeric SI value across metres and radians creates a large native-unit asymmetry.
- A profile-authority correction must be treated separately from mechanics. A lower failure count alone is not validation.
- Reducer pressure boundary free elongation is consistent with segment-wise pressure free strain; disabling it is strongly falsified.
- Reducer 60%-Alpha fallback is an SIF/slope rule, not structural taper authority.

## Next-Agent Handover

- Current stopping point: Stage 7 pre-implementation, after independent QST-004 evidence and corrected diagnostic signature.
- PR / branch / HEAD before this report commit: PR1001 / `agent/m047-bm4l-clean-qualified` / `894ce9b2b4e5622c6565ff5e64bded863b8fedb7`.
- Governed implementation head for replay: `7488ba76126f8240bb61c80fad243cf096c5fe08`.
- Last completed stage: Stage 5.
- Current active stage: Stage 7 — local-only candidate.
- Start here: generate one-line local profile diff and machine-readable changed-row proof; do not push it.
- Do not redo: bend/MEC-21 rejected paths, gravity scaling, fitted alpha, source-ID tee replay, reducer pressure disable/sign tests, hidden reducer L2 hypothesis, reducer station fitting, XML-only rounding hypothesis.
- Do not assume: `0.0001 deg` is a directly documented Access-storage rule; alpha 1.17e-5/K is exact; midpoint reducer sampling is CAESAR-exact; Type 2.6 rows are structural branches.
- Files currently involved: governed solver, BM4_L profile, reference importer/units/comparison, reducer/rigid authorities, provenance script and this report.
- Known failing checks: tee candidate 210 under current live profile/provisional alpha; Stage-7 local candidate predicts 107, with two exact-zero rotations remaining.
- Validation still required: Stage-7 local artifact proof; Owner/reviewer disposition; branch-level tee/profile qualification only when Actions are authorized; exact-alpha replay if authority arrives.
- Open questions: QST-001, QST-002, QST-003. QST-004 is accepted only as a local candidate pending branch authority.
- Highest-risk item: presenting the 107 diagnostic as achieved production parity when the live profile remains unchanged.
- Exact next recommended action: finish the local Stage-7 candidate artifact and then return to the two residual exact-zero rotations / nonzero mechanics without changing live tolerances.
- Required reading: this report; pinned CodingRules; Common Misc/Loadcase reports; governed BM4_L profile; reference importer/units/comparison source; reducer/rigid source; provenance script; BM4_NL benchmark report from PR #957.