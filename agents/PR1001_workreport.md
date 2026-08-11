# PR1001 Engineering Work Report

## PR Mission Control

- Mission: qualify BM4_L CAESAR-II mechanics against literal `<10%` gates for L2/L3/L4/L5/L6/L14 without benchmark fitting.
- Source task / issue: M047 / BM4_L parity continuation. Issue #991 remains untouched.
- PR number: 1001
- Branch: `agent/m047-bm4l-clean-qualified`
- Base commit: `7a08f9db84f298990250793226b36d4a82dbe01e`
- Current HEAD before this report update: `b423b6b3f51ee2796c9b7043908841abb8042b86`
- Governed implementation head for numerical replay: `7488ba76126f8240bb61c80fad243cf096c5fe08`
- PR status: OPEN / DRAFT
- Current stage: Stage 8 — residual real-mechanics diagnostics after Stage-7 output-authority separation
- Last completed stage: Stage 7 — local-only native-unit rotation-gate candidate qualification
- Engineering status: Type 2.1 fictitious-rigid thermal free growth is qualified locally/offline. Stage 7 is a completed local profile candidate only; the live profile remains unchanged. Two exact-zero rotations above the Stage-7 candidate boundary remain real mechanics/recovery targets.
- Validation status: exact-head replay, tee sign/carrier/K/equilibrium/superposition, reducer source/provenance and pressure checks, ACCDB reference-import checks, cross-model native-unit evidence, and Stage-7 changed-row proof PASS. GitHub Actions have not been intentionally rerun.
- Current blocker: exact CAESAR T1 material strain and exact reducer cylinder property station remain unavailable; the two Stage-8 residual rotations require independently sourced mechanics rather than global tuning.
- Exact next action: trace L2 node 20440 RZ and L5 node 22110 RZ to documented CAESAR weight/rigid/free-state mechanics; predeclare any candidate before implementation.

## Handover in 60 Seconds

### What is now true

- Accepted production baseline: **435 failures** — L2 31, L3 121, L4 40, L5 100, L6 22, L14 121.
- Qualified tee mechanism: `g_thermal = epsilon * r_surface` on the existing Type 2.1 centerline-to-run-surface fictitious rigid.
- Correct carriers: tee 20160 -> `ACCDB.E12`; tee 20295 -> `ACCDB.E36.STRAIGHT`.
- Tee mechanism changes `f_initial` only; K, Kb, Surface Node geometry, gravity, pressure and bend mechanics remain unchanged.
- Exact-head replay independently reproduces **210 failures**: L2 31, L3 37, L4 40, L5 43, L6 22, L14 37.
- Equilibrium is about `4.1e-5 N / 7.5e-6 N.m`; `L14=L3` is exact; other superposition identities remain numerical roundoff.
- All 105 exact-zero failures in the 210 candidate are ROTATION rows.
- BM4_L reducer provenance proves all four reducers have `R1=R2=L1=L2=0.0`. Reducer sampling is still provisional; disabling reducer Bourdon pressure is strongly falsified (`L4 40 -> 281`).
- Exact T1 alpha remains externally blocked: pinned Common contains no Print-Alphas/material table; Misc prints only `0.0012 mm/mm` rounded.
- Raw BM4_L references show smallest nonzero displacement `0.00010186503 mm` and smallest nonzero rotation `0.000100629848 deg`. The importer performs no clipping; it only converts degrees to radians.
- Current displacement zero gate `1e-7 m` equals `0.0001 mm`, but rotation gate `1e-7 rad` equals `0.00000572958 deg`.
- Independent BM1/BM2/BM3 CAESAR v14 output and separate raw-ACCDB-derived BM4_NL evidence are consistent with a native small-rotation boundary around `0.0001 deg`. Hexagon documents degrees and Access `OUTPUT_DISPLACEMENTS`, but no explicit hard `0.0001 deg` Access-storage cutoff was found.
- Stage-7 local candidate is therefore **separable and not promoted**: `ROTATION.zeroReferenceAbsolute = 0.0001 deg = 1.7453292519943296e-6 rad`.
- Stage-7 local replay: **210 -> 107** with exactly **103 FAIL->PASS changes**; all 103 are `referenceValue=0` ROTATION rows. Every nonzero-reference failure identity/count is unchanged.
- Live branch profile is still `1e-7 rad`; 107 is **not** live PR parity.
- Two exact-zero rotations remain above the Stage-7 local boundary:
  - L2 node 20440 RZ: `-2.033276225626185e-6 rad = -0.000116498146 deg`.
  - L5 node 22110 RZ: `+1.7487675123311166e-6 rad = +0.000100196998 deg`.

### What is being worked on

- QST-001: exact CAESAR material-library T1 strain from 21 C to 120 C.
- QST-002: exact CAESAR property station inside each ten-cylinder reducer segment.
- QST-003: real mechanics/recovery ownership of the two Stage-8 residual exact-zero rotations and remaining nonzero-reference failures.
- QST-004: native-unit zero-boundary candidate is complete locally; branch promotion requires Owner/reviewer disposition and must remain profile-only.

### What remains unfinished

- Core tee free-growth v3 patch is staged locally, not committed to the PR branch.
- Stage-7 one-line profile patch is staged locally, not committed.
- Exact alpha and reducer sampling remain blocked.
- Stage-8 has no authorized production candidate yet.

### What must not be assumed

- Do not promote benchmark-optimal alpha or reducer sampling.
- Do not treat the reducer 60%-Alpha/SIF fallback as structural taper authority.
- Do not infer Type 2.6 structural branches from Misc SIF rows alone.
- Do not present 107 as live parity; the live profile remains unchanged.
- Do not alter reference values, signs, source mappings, row identities or nonzero `<10%` gates.
- Do not reopen previously rejected broad bend-weight, gravity-scale, bend-subdivision or fitted-shape paths without new authority.

### Highest-risk remaining item

Using a global stiffness/load/tolerance change to force the two residual rotations to zero despite their different physical signatures.

### Exact next action

For L2:20440:RZ, investigate documented CAESAR gravity load placement for the local frame/bend chain. For L5:22110:RZ, investigate ordinary rigid-element thermal/pressure/weight interaction and local frame-rigid cancellation. Implement nothing until an independent rule predicts the case/signature.

## Mission and Engineering Intent

The target is physical/output parity with CAESAR II `14.00.00.0910 (Build 231113)`, not benchmark-score minimization. One independently justified mechanism or authority correction is allowed per controlled iteration.

Governed cases: `L2=W`, `L3=T1`, `L4=P1`, `L5=W+T1+P1`, `L6=W+P1`, `L14=L5-L6=T1`.

Pinned CAESAR authority at Common `179c4831cf521cf797c13699cfbbd118315c9244`:

- `LFEA/BM4/Miscdata_BM4_L.txt`
- `LFEA/BM4/Loadcasereport_BM4_L.txt`

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Type 2.1 tee topology / Kb | P0 | VALIDATED | prior | Misc report + production modifiers |
| Tee fictitious-rigid thermal free growth | P0 | VALIDATED | 5 | exact-head 435 -> 210 |
| E12 + E36.STRAIGHT carrier coverage | P0 | VALIDATED | 5 | source36 incoming-straight proof |
| Common run material/temp ownership | P0 | IMPLEMENTED | 5 local | fail-closed v3 patch |
| Exact CAESAR T1 strain | P0 | BLOCKED | 6 | no full-precision authority in pinned bundle |
| Exact reducer cylinder property station | P1 | BLOCKED | 6 | ten cylinders documented; station not published |
| Reducer `R1/R2/L1/L2` source state | P1 | VALIDATED | 6 | all four rows = `0.0` via provenance hash |
| Native-unit rotation gate candidate | P0 | VALIDATED_LOCAL | 7 | 103 zero-rotation status changes only; live profile unchanged |
| L2:20440:RZ real mechanics | P0 | INVESTIGATING | 8 | broad W frame/bend cancellation |
| L5:22110:RZ real mechanics | P0 | INVESTIGATING | 8 | mixed W/T/P frame-rigid cancellation |
| Type 2.6 structural modifiers | P2 | DEFERRED | future | no topology authority |

## Engineering Item Register

| ID | Type | Priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| ISS-001 | defect | P0 | ACCEPTED | Type 2.1 fictitious rigid omitted thermal free growth | YES |
| ISS-002 | defect | P0 | ACCEPTED | source-ID-only tee attachment misses `ACCDB.E36.STRAIGHT` | YES |
| DEC-001 | decision | P0 | ACCEPTED | tee free growth changes `f_initial`, not K | YES |
| DEC-002 | decision | P0 | ACCEPTED | fictitious rigid inherits fail-closed common run material/temp | YES |
| RISK-001 | risk | P0 | OPEN | provisional alpha must not be fitted | YES |
| QST-001 | question | P0 | BLOCKED | exact CAESAR T1 material strain | YES |
| QST-002 | question | P1 | BLOCKED | exact reducer cylinder property station | YES |
| QST-003 | question | P0 | INVESTIGATING | residual real mechanics after output-authority separation | YES |
| QST-004 | question | P0 | VALIDATED_LOCAL | native-unit rotation-gate candidate; branch authority pending | YES |
| RISK-002 | risk | P0 | OPEN | no explicit Hexagon hard `0.0001 deg` Access cutoff statement | YES |
| DEC-003 | decision | P0 | ACCEPTED | no Type 2.6 mechanics without topology authority | YES |
| DEC-004 | decision | P1 | ACCEPTED | reducer 60%-Alpha rule is not structural taper authority | YES |
| DEC-005 | decision | P0 | ACCEPTED | live zero gates remain unchanged until explicit promotion | YES |
| DEC-006 | decision | P0 | ACCEPTED | any Stage-7 promotion must be profile-only, separate from tee/alpha | YES |
| DEC-007 | decision | P0 | ACCEPTED | Stage-8 candidates must target one residual signature and not global tuning | YES |

## Engineering Decisions and Invariants

### Tee free state

`g_thermal = epsilon * r_surface`; added initial load follows `-K_local g_local`, then existing `T^T` / `H^T`. K is unchanged. W/P-only cases stay unchanged.

### Permanent recovery identity

`q = K u - f_fixed - f_initial`

### Stage-7 profile candidate boundary

Candidate only: `ROTATION.zeroReferenceAbsolute = 1.7453292519943296e-6 rad`. This is an exact-zero comparison authority, not solver tolerance. It does not mutate actual/reference values or nonzero-reference comparisons.

## Stage Roadmap

- Stage 1 — report initialization + findings — COMPLETE
- Stage 2 — PR allocation/report synchronization — COMPLETE
- Stage 3 — repository/changed-file verification — COMPLETE
- Stage 4 — tee free-growth implementation preparation — COMPLETE; branch delivery pending
- Stage 5 — exact-head tee accuracy qualification — COMPLETE
- Stage 6 — authority/residual/output investigation — PARTIAL, sufficient to define Stage 7
- Stage 7 — local profile-only native-unit candidate — COMPLETE, NOT PROMOTED
- Stage 8 — residual real-mechanics diagnostics — IN_PROGRESS

## Stage Execution Log

### Stage 5 — tee free-growth qualification

Implementation: local v3 patch adds generic tee rigid thermal free growth on the actual carrier and fail-closed common run authority.

Validation:
- PASS — syntax and I/J transform/sign checks.
- PASS — exact-head reconstruction ~`1e-11 m/rad`.
- PASS — six-case replay `31/37/40/43/22/37 = 210`.
- PASS — thermal selectivity, common K, recovery, equilibrium and superposition.
- NOT_RUN — Actions rerun.

Decision: **COMPLETE**.

### Stage 6 — authority/residual investigation

Findings:
- exact alpha not present in pinned source/report/output bundle;
- reducer R1/R2/L1/L2 all zero; exact sampling station remains unknown;
- all 105 zero-reference candidate failures are rotations;
- reducer dominates many L4 zero rotations but sampling changes do not remove zero floor;
- raw BM4_L references and independent CAESAR models show a consistent native small-rotation boundary around `0.0001 deg`;
- importer has no clipping; comparator consumes SI profile gate.

Decision: **PARTIAL** — no mechanics/profile change promoted.

### Stage 7 — local profile-only native-unit candidate

Objective: test exactly `0.0001 deg -> 1.7453292519943296e-6 rad` as the exact-zero rotation gate without changing solver/reference data.

Implementation performed: local one-line profile patch only. Live branch profile unchanged.

Validation performed:
- PASS — exact radian conversion.
- PASS — six-case tee-candidate status replay: `31/37/40/43/22/37 -> 6/20/7/39/15/20`, total `210 -> 107`.
- PASS — exactly 103 changed statuses.
- PASS — every changed status is `referenceValue=0`, `quantity=ROTATION`, `FAIL -> PASS`.
- PASS — all nonzero-reference failure counts and identities unchanged.
- PASS — actual/reference numerical rows unchanged.
- NOT_APPLICABLE — K/equilibrium/superposition are not recomputed because no solve changes; underlying exact-head solution is identical.
- NOT_RUN — Actions rerun.

Remaining exact-zero rows:
- L2:20440:RZ = `-2.033276225626185e-6 rad`.
- L5:22110:RZ = `+1.7487675123311166e-6 rad`.

Artifacts:
- `/mnt/data/pr1001_stage7_rotation_zero_gate_candidate.patch`
- `/mnt/data/pr1001_stage7_rotation_zero_gate_validation.json`

Decision: **COMPLETE** — local candidate qualified and separable; **NOT PROMOTED** to branch authority.

### Stage 8 — pre-implementation diagnostics

#### Current truth

The Stage-7 candidate explains 103 exact-zero statuses without changing mechanics. The two remaining zero rotations sit above the candidate native boundary and must be treated as real mechanics/recovery discrepancies.

#### Objective

Find independently documented CAESAR mechanics that predict one of the two residual signatures without degrading previously qualified cases.

#### L2 node 20440 RZ — weight-only residual

Candidate: `-2.033276225626185e-6 rad = -0.000116498146 deg`; CAESAR reference is zero.

Kind decomposition:
- FRAME `-5.054097094451543e-5`
- BEND_INCOMING_STRAIGHT `+3.271480843205415e-5`
- BEND_ARC `+1.5208244558405905e-5`
- RIGID `+4.856081438817381e-7`
- REDUCER `+9.903358471217747e-8`

Largest source terms include source23 `-2.369729498596535e-4`, source22 `+1.45181739707197e-4`, source24 `+1.0696021430844011e-4`, source28 `-1.0113649150338446e-4`.

Interpretation: broad frame/bend gravity cancellation; not a single reducer or rigid defect. Previous broad gravity scaling, bend midpoint/chord weight, and bend subdivision changes are rejected and must not be reopened without new authority.

#### L5 node 22110 RZ — mixed-load residual

Candidate: `+1.7487675123311166e-6 rad = +0.000100196998 deg`; CAESAR reference is zero.

Kind decomposition:
- FRAME `-1.3777142561106031e-5`
- RIGID `+1.329630544206022e-5`
- BEND_INCOMING_STRAIGHT `+1.8992740887878215e-6`
- BEND_ARC `+3.7204115194013625e-7`
- REDUCER `-4.1712775954351944e-8`

Primitive/case values at the same row:
- L2 reference `2.2806532205831866e-6`, candidate `2.276618746547739e-6` — already close.
- L3 reference 0, candidate `-4.486706485997593e-7`.
- L4 reference 0, candidate `-7.918058567799565e-8`.
- L5 reference 0, candidate `+1.7487675123311166e-6`.
- L6 reference `2.2016500567684297e-6`, candidate `2.1974381608699103e-6` — already close.
- L14 reference 0, candidate same as L3.

Interpretation: W and W+P behavior is already close to CAESAR; the residual is a small thermal/pressure correction on a frame-rigid cancellation. Any Stage-8 candidate must preserve the good L2/L6 values and therefore cannot be a broad rigid stiffness or gravity change.

#### Planned validation for any Stage-8 candidate

1. cite independent CAESAR/Hexagon or pinned source authority;
2. predeclare case/signature before code;
3. one mechanism only;
4. preserve reference rows/tolerances and Stage-7 live/non-live separation;
5. replay all six cases offline;
6. verify common K if candidate is load/free-state-only;
7. verify recovery identity, equilibrium and superposition;
8. reject any candidate that improves only through benchmark coefficient tuning.

Known risks: global changes can easily destroy already-close L2/L6 behavior around node22110 or resurrect previously rejected bend/gravity hypotheses.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Sensitive? | Validation |
|---|---|---|---|---|---|
| `src/core/fea-benchmarks/caesar-accdb-linear-solve.js` | prior | 5 | governed mechanics; tee v3 local patch | YES | exact-head replay PASS; not branch-committed |
| `agents/PR1001_workreport.md` | 1 | 8 | canonical mission control/handover | YES | current update |
| `PE_1001workreport.md` | 6 | 6 | pointer to canonical report | NO | pointer-only |
| `benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json` | prior | 7 local | Stage-7 one-line local candidate | YES | live file unchanged; 103-row proof PASS |
| `src/core/fea-benchmarks/caesar-accdb-reference.js` | prior | 6 read-only | reference ingestion | YES | no clipping found |
| `src/core/fea-benchmarks/caesar-accdb-units.js` | prior | 6 read-only | degree/radian conversion | YES | exact conversion only |
| `src/core/fea-benchmarks/qualification-comparison.js` | prior | 6 read-only | zero-gate semantics | YES | SI-unit interpretation confirmed |
| `src/core/linear-fea-reducer-condensation/reducer-condensation.js` | prior | 6 read-only | reducer investigation | YES | unchanged |
| `src/core/linear-fea-rigid-element/rigid-element.js` | prior | 8 read-only | Stage-8 rigid/free-state investigation | YES | unchanged |
| `scripts/lfea-m047-bm4l-accdb-provenance.ps1` | prior | 6 read-only | source-value hash authority | YES | unchanged |

Any unexplained changed file blocks closure.

## Software Validation

| Validation | Status | Basis | Evidence |
|---|---|---|---|
| exact-head reconstruction | PASS | `7488ba...` | ~`1e-11 m/rad` |
| tee v3 algebra/syntax | PASS | local | carrier/sign checks |
| tee six-case replay | PASS | exact-head artifact | 210 |
| reference importer clipping check | PASS | `7488ba...` | none |
| cross-model native-boundary evidence | PASS | BM1/BM2/BM3/BM4_NL | no inspected contradiction |
| Stage-7 changed-row proof | PASS | local | 103 exact-zero ROTATION only |
| Stage-8 code change | NOT_RUN | current | no candidate authorized |
| Actions rerun | NOT_RUN | current | intentionally not rerun |

## Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| tee carrier coverage | PASS | E12 + E36.STRAIGHT |
| K unchanged by tee free growth | PASS | common stiffness state |
| thermal selectivity | PASS | L2/L4/L6 unchanged by tee mechanism |
| superposition / equilibrium | PASS | roundoff / ~`4.1e-5 N`, `7.5e-6 N.m` |
| exact alpha authority | BLOCKED | no pinned full-precision value |
| exact reducer station | BLOCKED | no primary station rule |
| Stage-7 local gate candidate | PASS_LOCAL_ONLY | 103 zero-rotation statuses only |
| explicit hard Access `0.0001 deg` rule | NOT_VALIDATED | no direct Hexagon statement |
| Stage-8 mechanics | INVESTIGATING | two residual signatures isolated |

## Explicitly Not Validated

- Exact CAESAR T1 material strain.
- Exact reducer cylinder station.
- A directly documented hard `0.0001 deg` Access zero cutoff.
- Any branch/profile promotion of Stage 7.
- Any Stage-8 mechanics correction.
- Structural Type 2.6 interpretation.

## Known / Deferred Work and Forward Sequence

1. Continue Stage-8 source-backed diagnostics on L2:20440:RZ and L5:22110:RZ.
2. Keep Stage-7 candidate local until Owner/reviewer disposition; if ever authorized, commit profile-only and qualify independently.
3. Obtain exact Print Alphas/material-library T1 strain and replay as a separate authority change.
4. Continue reducer property-station authority search; never select station from BM4_L minimization.
5. Keep Type 2.6 deferred without topology authority.
6. When Actions are explicitly authorized for production delivery, push/qualify the tee patch separately from profile/alpha work.

## Process Notes / Lessons Learned

- A source element that also owns a bend may require an incoming-straight analysis carrier for tee modifiers.
- Exact-head completed artifacts provide high-fidelity read-only evidence without rerunning Actions.
- Diagnostic optima inside rounded authority ranges are not authority.
- Access storage, CAESAR output cleanup, report formatting and our comparator are separate layers.
- SI-stored tolerances require quantity-specific conversion from any native-unit authority.
- Output-authority/profile changes must be separated from mechanics changes.
- The two Stage-8 residuals have different signatures; a single global tuning knob is not justified.

## Next-Agent Handover

- Current stopping point: Stage 8 real-mechanics diagnostics after Stage-7 local completion.
- PR/branch/HEAD before this report commit: PR1001 / `agent/m047-bm4l-clean-qualified` / `b423b6b3f51ee2796c9b7043908841abb8042b86`.
- Governed implementation head: `7488ba76126f8240bb61c80fad243cf096c5fe08`.
- Last completed stage: Stage 7 local-only candidate.
- Current active stage: Stage 8.
- Start here: Hexagon/source authority for bend/frame gravity load placement around node20440 and ordinary rigid thermal/pressure/weight mechanics around node22110.
- Do not redo: generic bend softness, MEC-21 tested shear, fitted axial shape, gravity scaling, bend weight point/chord variants, bend subdivision tuning, source-ID-only tee replay, reducer pressure disable/sign tests, hidden reducer L2 hypothesis, reducer station fitting.
- Do not assume: 107 is live; `0.0001 deg` is an explicitly documented Access cutoff; alpha is exact; midpoint reducer sampling is CAESAR-exact.
- Known failing state: live profile + tee candidate = 210; local Stage-7 profile candidate = 107; two zero rotations remain above the local boundary.
- Open questions: QST-001, QST-002, QST-003. QST-004 is locally qualified but not branch-promoted.
- Highest-risk item: changing broad mechanics that damage already-close L2/L6 behavior.
- Exact next recommended action: source-backed Stage-8 falsification only; no code until a mechanism predicts one residual signature.
- Required reading: this report, CodingRules, pinned Misc/Loadcase reports, BM4_L profile, reference importer/units/comparison, rigid/reducer sources, provenance script, BM4_NL PR #957 evidence.