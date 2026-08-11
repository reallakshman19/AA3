# PR1001 Engineering Work Report

## PR Mission Control

- Mission: qualify BM4_L CAESAR-II mechanics against literal `<10%` comparison gates for L2/L3/L4/L5/L6/L14 without benchmark fitting.
- Source task / issue: M047 / BM4_L parity continuation. Issue #991 remains untouched.
- PR number: 1001
- Branch: `agent/m047-bm4l-clean-qualified`
- Base commit: `7a08f9db84f298990250793226b36d4a82dbe01e`
- Current HEAD before this report update: `2c2b88a18d7d1b01f282d0b7adaa04966d4aca24`
- Governed implementation head for exact numerical replay: `7488ba76126f8240bb61c80fad243cf096c5fe08`
- PR status: OPEN / DRAFT
- Current stage: Stage 6 — authority-first continuation and residual/output-authority diagnostics
- Last completed stage: Stage 5 — Type 2.1 tee free-growth accuracy qualification
- Engineering status: tee fictitious-rigid thermal free growth is qualified locally/offline; no second production mechanism is yet authorized. Stage 6 has narrowed the remaining error to unresolved alpha, unresolved reducer cylinder property sampling, and a newly discovered CAESAR native-output zero-boundary / rotation-gate unit-consistency question.
- Validation status: exact-head replay, tee sign/carrier/K/equilibrium/superposition, reducer source/provenance, reducer pressure consistency and ACCDB reference-import checks PASS. GitHub Actions have not been intentionally rerun.
- Current blocker: independent authority is still missing for exact CAESAR material-library T1 strain, reducer cylinder property station, and whether the benchmark's exact-zero rotation gate should represent CAESAR's apparent `0.0001 deg` stored-output floor.
- Exact next action: validate the native-unit zero boundary on independent CAESAR ACCDB evidence before any tolerance change; continue primary-authority searches for exact alpha and reducer sampling.

## Handover in 60 Seconds

### What is now true

- Accepted production baseline: **435 failures** — L2 31, L3 121, L4 40, L5 100, L6 22, L14 121.
- Qualified Type 2.1 tee correction: free thermal growth of the existing centerline-to-run-surface offset, `g_thermal = epsilon * r_surface`.
- Correct tee carriers are `ACCDB.E12` for tee 20160 and `ACCDB.E36.STRAIGHT` for tee 20295. The old 284 result is retired because it omitted the incoming-straight carrier for source 36.
- The tee correction changes `f_initial` only. K, Kb, Surface Node geometry, gravity, pressure and bend mechanics stay unchanged.
- Exact-head offline replay independently reproduces **210 failures**: L2 31, L3 37, L4 40, L5 43, L6 22, L14 37.
- Candidate equilibrium is about `4.1e-5 N / 7.5e-6 N.m`; `L14=L3` is exact and the other six-case superposition identities remain at numerical roundoff.
- All 105 candidate failures with exact-zero CAESAR references are **ROTATION** rows.
- Exact-zero candidate counts: L2 26, L3 17, L4 33, L5 5, L6 7, L14 17. L3 and L14 have the same zero-reference set.
- Exact-head system replay error is about `1e-11 m/rad`; the failing zero-reference rotations are typically `1e-7` to `2e-6 rad`, so they are not solver numerical noise.
- BM4_L reducer provenance proves all four `INPUT_REDUCERS` rows have `R1=R2=L1=L2=0.0`.
- Reducer sampling sensitivity can move L4 nonzero-magnitude failures but does not materially remove the exact-zero rotation floor. Disabling reducer Bourdon pressure is strongly falsified (`L4: 40 -> 281`).
- Pinned Common evidence contains no Print-Alphas/material-table output, so exact T1 material strain remains externally blocked.
- **New Stage-6 finding:** across the governed CAESAR reference data, the smallest nonzero translation is `0.00010186503 mm` and the smallest nonzero rotation is `0.000100629848 deg`. This shows a sharp ~`0.0001` boundary in both native CAESAR output units.
- The ACCDB importer does not zero or round rotations; it reads `OUTPUT_DISPLACEMENTS.RX/RY/RZ` and only converts degrees to radians. Therefore the apparent boundary exists upstream in CAESAR's stored results, not in our reference importer.
- Current zero gates are `1e-7 m` for displacement and `1e-7 rad` for rotation. The displacement gate equals `0.0001 mm`, but the rotation gate equals only `0.00000572958 deg`, approximately **17.4533x tighter in native units**.
- Diagnostic only: using `0.0001 deg = 1.7453292519943296e-6 rad` for exact-zero rotation comparisons clears **103 of 105** current zero-reference failures and would reduce the tee-corrected total from about 210 to about **107** without changing K, loads, reference values, signs or any nonzero-relative comparison. This is **not promoted** pending independent authority.

### What is being worked on

- QST-001: exact CAESAR material-library T1 strain from 21 C to 120 C.
- QST-002: exact property station used inside each of CAESAR's ten structural reducer cylinders.
- QST-003: mechanics/recovery ownership of the residual exact-zero rotation bands.
- QST-004: whether CAESAR's stored-output native zero boundary is generically `0.0001 mm / 0.0001 deg`, and whether the BM4_L rotation zero gate has an SI-unit conversion defect.

### What remains unfinished

- Core tee free-growth patch is staged locally, not committed to the PR branch.
- Exact CAESAR T1 material strain is unresolved.
- Exact reducer cylinder property sampling is unresolved.
- QST-004 requires independent cross-benchmark or direct CAESAR authority before changing `zeroReferenceAbsolute` for rotations.

### What must not be assumed

- Do not promote benchmark-optimal alpha.
- Do not choose reducer endpoint/midpoint sampling from failure counts.
- Do not treat the reducer 60%-length Alpha/SIF fallback as structural taper stiffness authority.
- Do not infer structural Type 2.6 branches from Misc SIF rows alone.
- Do not change the rotation zero gate solely because it improves BM4_L. The `0.0001 deg` observation is evidence for investigation, not yet authority.
- Do not alter reference values, signs, source mappings, row identities or nonzero `<10%` relative gates.

### Highest-risk remaining item

Turning a diagnostic pattern into authority. This applies equally to alpha, reducer sampling and the newly observed native-unit output boundary.

### Exact next action

Test QST-004 against independent CAESAR ACCDB datasets / primary CAESAR output semantics. If the same native-unit boundary is independently reproduced, classify the existing `1e-7 rad` gate as a unit-consistency defect and validate a separate profile-only correction before any production-mechanics change.

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
| Exact-zero residual mechanics ownership | P1 | INVESTIGATING | 6 | all 105 are rotations; coherent load-family cancellation |
| Native-unit output zero boundary / rotation gate unit consistency | P0 | INVESTIGATING | 6 | ~0.0001 native-unit boundary; importer performs no clipping |
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
| QST-003 | question | P1 | INVESTIGATING | Mechanics/recovery ownership of exact-zero rotation bands | YES |
| QST-004 | question | P0 | INVESTIGATING | Is the rotation zero gate a native-unit-to-SI conversion defect relative to CAESAR stored-output semantics? | YES |
| RISK-002 | risk | P0 | OPEN | `1e-7 rad` may be 17.45x stricter than the corresponding CAESAR native `0.0001 deg` output boundary, but changing it without independent authority would be benchmark fitting | YES |
| DEC-003 | decision | P0 | ACCEPTED | Do not create Type 2.6 mechanics without topology authority | YES |
| DEC-004 | decision | P1 | ACCEPTED | Do not use reducer 60%-Alpha rule as structural stiffness taper | YES |
| DEC-005 | decision | P0 | ACCEPTED | Keep current zero gates unchanged until QST-004 is independently qualified | YES |
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

### DEC-005 — Native-output gate finding remains diagnostic

Observed reference minima:

- translation: `1.0186503e-7 m = 0.00010186503 mm`;
- rotation: `1.7563201286787792e-6 rad = 0.000100629848 deg`.

The benchmark profile's displacement exact-zero gate `1e-7 m` corresponds to `0.0001 mm`. The rotation exact-zero gate `1e-7 rad` corresponds to `0.00000572958 deg`. The mismatch is technically significant, but no profile change is authorized until the CAESAR native-output boundary is independently established.

### Permanent recovery identity

`q = K u - f_fixed - f_initial`

Do not alter recovery sign, reference values, row identities or source mapping to reduce failures.

## Stage Roadmap

- Stage 1 — report initialization + findings — COMPLETE
- Stage 2 — PR allocation/report synchronization — COMPLETE
- Stage 3 — changed-file/repository-state verification — COMPLETE
- Stage 4 — tee thermal free-growth implementation preparation — COMPLETE / branch delivery pending
- Stage 5 — exact-head accuracy replay and qualification — COMPLETE
- Stage 6 — authority-first continuation, residual and output-authority diagnostics — IN_PROGRESS / PARTIAL
- Stage 7 — next single-factor implementation or authority correction — NOT_STARTED

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

All 105 candidate exact-zero failures are rotations.

| Case | Dominant analysis kinds among zero failures |
|---|---|
| L2 | FRAME 19, RIGID 5, BEND_ARC 1, BEND_INCOMING_STRAIGHT 1 |
| L3 | FRAME 12, RIGID 3, BEND_INCOMING_STRAIGHT 2 |
| L4 | REDUCER 26, BEND_ARC 4, BEND_INCOMING_STRAIGHT 2, FRAME 1 |
| L5 | FRAME 4, RIGID 1 |
| L6 | FRAME 5, BEND_INCOMING_STRAIGHT 1, BEND_ARC 1 |
| L14 | same as L3 |

Representative L4 node 22130 RX is a cancellation: reducer about `-1.67e-6 rad` against bend/straight/frame about `+1.08e-6 rad`, leaving about `-5.95e-7 rad` versus CAESAR zero. Reducer station sensitivity changes nonzero pressure magnitudes materially but leaves the zero-rotation count approximately 32-33, so station uncertainty alone does not explain the zero floor.

### Native-unit zero-boundary finding

From all governed CAESAR reference rows:

- smallest nonzero displacement = `1.0186503000000001e-7 m = 0.00010186503 mm`;
- smallest nonzero rotation = `1.7563201286787792e-6 rad = 0.000100629848 deg`.

The ACCDB reference adapter reads Access `OUTPUT_DISPLACEMENTS` and only applies unit conversion. Rotation conversion is exactly degrees × `pi/180`; no clipping/rounding is performed in our importer. The observed boundary therefore predates our comparison layer.

Current comparison contract interprets `zeroReferenceAbsolute` in normalized row SI units. Existing profile:

- displacement zero gate `1e-7 m` = `0.0001 mm`;
- rotation zero gate `1e-7 rad` = `0.00000572958 deg`.

This is a 17.4533x native-unit asymmetry. Diagnostic application of a `0.0001 deg` rotation zero gate (`1.7453292519943296e-6 rad`) clears 103/105 candidate zero-reference failures; two L5 rotation rows remain above that value. No gate change has been made.

History check: commit `eda9e1388b361185bc3c6ef219f35038bbb83a9e` introduced literal zero gates and assigned the same numeric `1e-7` to displacement and rotation after normalization, without a documented unit-specific derivation. PR #988 describes a separately declared exact-zero gate but does not record an Owner mandate or CAESAR source for specifically `1e-7 rad`.

### Stage-6 validation

- PASS — exact-head Access oracle/import path checked; importer has no rotation clipping.
- PASS — native-unit reference minima measured across all six governed cases.
- PASS — profile/comparator unit interpretation checked.
- PASS — diagnostic `0.0001 deg` gate impact quantified without mutating production/profile/reference data.
- PASS — reducer source auxiliary zero proof.
- PASS — reducer pressure disable falsification.
- PASS — reducer station sensitivity bounded as non-authoritative.
- NOT_RUN — no Actions rerun.

### New findings / decisions

- QST-001 remains externally blocked.
- QST-002 remains externally blocked and is more relevant to nonzero L4 magnitude than the zero floor.
- QST-003 is not solver precision or our reference-import rounding.
- QST-004 is now the highest-value authority question because it could explain 103/105 exact-zero failures as a unit-consistency issue while leaving mechanics and nonzero comparisons untouched.
- DEC-005: do not change the gate until QST-004 is independently qualified.

### Stage decision

**PARTIAL** — materially narrowed; no new production/profile change authorized yet.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---|---|---|---|---|
| `src/core/fea-benchmarks/caesar-accdb-linear-solve.js` | prior | 5 | governed mechanics; tee v3 patch staged locally | YES | exact-head offline replay PASS; not branch-committed |
| `agents/PR1001_workreport.md` | 1 | 6 | canonical mission control / handover | YES | updated with QST-004 |
| `PE_1001workreport.md` | 6 | 6 | Owner-requested pointer to canonical report | NO | pointer-only |
| `benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json` | prior | 6 read-only | governed profile / gate investigation | YES | unchanged |
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
| Native-unit minima analysis | PASS | exact-head CAESAR references | ~0.0001 mm / deg boundary |
| Reducer auxiliary source hash | PASS | exact-head provenance | R1/R2/L1/L2 all zero |
| Actions rerun | NOT_RUN | current | intentionally not rerun |

## Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Tee carrier coverage | PASS | E12 + E36.STRAIGHT |
| K unchanged | PASS | common stiffness state |
| thermal selectivity | PASS | only T1-containing cases move |
| `L14=L3` | PASS | exact |
| superposition | PASS | numerical roundoff |
| equilibrium | PASS | ~4.1e-5 N / 7.5e-6 N.m |
| exact alpha authority | BLOCKED | no pinned full-precision material strain |
| exact reducer station authority | BLOCKED | public source omits station |
| rotation zero-gate native-unit authority | INVESTIGATING | strong internal evidence; independent confirmation required |

## Explicitly Not Validated

- Exact CAESAR material-library T1 strain from 21 C to 120 C.
- Exact reducer cylinder property station.
- Generic CAESAR stored-output zero boundary of exactly `0.0001 deg` outside BM4_L.
- Any profile change to rotation zeroReferenceAbsolute.
- Structural Type 2.6 interpretation.

## Known / Deferred Work and Forward Sequence

1. **QST-004 first:** validate the observed native-unit zero boundary against an independent CAESAR ACCDB dataset or explicit primary CAESAR output authority.
2. If QST-004 is independently validated, prepare a **separate profile-only** unit-consistency correction; do not combine it with tee mechanics or alpha. Predeclare expected signature: only exact-zero rotation rows may change status; references, actual results and nonzero-relative rows remain identical.
3. Obtain exact Print Alphas/material-library strain and replay tee free growth with that exact value as a separate authority change.
4. Continue QST-002 authority search for reducer cylinder station; never select station from BM4_L failure minimization.
5. Continue QST-003 only for the two zero-reference rotation rows above the apparent `0.0001 deg` boundary and any remaining nonzero mechanics families after authoritative changes.
6. Keep Type 2.6 deferred without structural topology authority.
7. When Actions are explicitly authorized for production delivery, push/qualify the single-factor tee patch separately from any profile/alpha change.

## Process Notes / Lessons Learned

- Source-ID-only tee ownership can miss an incoming-straight carrier when the source also owns a bend.
- Exact-head completed artifacts are useful read-only evidence without rerunning Actions.
- Diagnostic optima inside rounded authority ranges are not authority.
- Access storage precision, CAESAR output cleanup and report formatting are separate layers; do not conflate them.
- A tolerance written in normalized SI units must be derived consistently from the intended source/native-unit rule for each quantity; copying the same numeric SI value across metres and radians can change the native tolerance materially.
- Reducer pressure boundary free elongation is consistent with segment-wise pressure free strain; disabling it is strongly falsified.
- Reducer 60%-Alpha fallback is an SIF/slope rule, not structural taper authority.

## Next-Agent Handover

- Current stopping point: Stage 6, after discovery of QST-004 native-unit zero-boundary / rotation-gate asymmetry.
- PR / branch / HEAD before this report commit: PR1001 / `agent/m047-bm4l-clean-qualified` / `2c2b88a18d7d1b01f282d0b7adaa04966d4aca24`.
- Governed implementation head for replay: `7488ba76126f8240bb61c80fad243cf096c5fe08`.
- Last completed stage: Stage 5.
- Current active stage: Stage 6 — PARTIAL.
- Start here: independently validate QST-004 on another CAESAR ACCDB source or explicit CAESAR output semantics.
- Do not redo: bend/MEC-21 rejected paths, gravity scaling, fitted alpha, source-ID tee replay, reducer pressure disable/sign tests, hidden reducer L2 hypothesis, XML-format-rounding hypothesis.
- Do not assume: `0.0001 deg` is yet an authorized benchmark gate; alpha 1.17e-5/K is exact; midpoint reducer sampling is CAESAR-exact; Type 2.6 rows are structural branches.
- Files currently involved: governed solver, validation profile, reference importer/units/comparison, reducer/rigid authorities, provenance script and this report.
- Known failing checks: tee candidate 210 under current profile/provisional alpha; 105 failures are exact-zero rotations.
- Validation still required: independent QST-004 confirmation; branch-level tee patch validation when authorized; exact-alpha replay if authority arrives.
- Open questions: QST-001, QST-002, QST-003, QST-004.
- Highest-risk item: weakening a benchmark gate from BM4_L-specific evidence rather than correcting an independently proven unit/authority defect.
- Exact next recommended action: cross-benchmark CAESAR reference-minimum analysis; if unavailable, seek explicit CAESAR output precision/cleanup documentation before touching the profile.
- Required reading: this report; pinned CodingRules; Common Misc/Loadcase reports; governed BM4_L profile; reference importer/units/comparison source; reducer/rigid source; provenance script.
