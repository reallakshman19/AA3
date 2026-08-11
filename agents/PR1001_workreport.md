# PR1001 Engineering Work Report

## PR Mission Control

- Mission: qualify BM4_L CAESAR-II mechanics against literal `<10%` gates for L2/L3/L4/L5/L6/L14 without benchmark fitting.
- Source task / issue: M047 / BM4_L parity continuation. Issue #991 remains untouched.
- PR number: 1001
- Branch: `agent/m047-bm4l-clean-qualified`
- Base commit: `7a08f9db84f298990250793226b36d4a82dbe01e`
- Current HEAD before this report update: `f84b9b0003ef7f2ee0b44ea4cf687cf5dfa42431`
- Governed implementation head for numerical replay: `7488ba76126f8240bb61c80fad243cf096c5fe08`
- PR status: OPEN / DRAFT
- Current stage: Stage 9 — authority acquisition only; no new mechanics candidate is authorized.
- Last completed stage: Stage 8 — residual real-mechanics diagnostics and restraint-hypothesis falsification.
- Engineering status: Type 2.1 fictitious-rigid thermal free growth remains the best promotable mechanics candidate at 210 failures. The Stage-7 native-unit zero-rotation profile candidate remains local-only at 107. Stage 8 found no additional promotable mechanics: L2:20440:RZ is a cancellation-sensitive near-zero with already-close local actions; L5:22110:RZ is contingent on the still-unresolved exact thermal strain.
- Validation status: exact-head replay, tee sign/carrier/K/equilibrium/superposition, reducer source/provenance and pressure checks, ACCDB reference-import checks, Stage-7 changed-row proof, Stage-8 local-action parity and restraint falsification all PASS. GitHub Actions have not been intentionally rerun.
- Current blocker: exact CAESAR T1 material strain from the v14 material database and exact reducer-cylinder property station remain unavailable. No benchmark-derived substitution is permitted.
- Exact next action: obtain direct CAESAR Print Alphas/current-material output for material 106 at 21 C -> 120 C, or direct reducer internal-station authority. Until then, keep Stage-8 mechanics closed and make no new core change.

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
- Stage-7 local candidate is **separable and not promoted**: `ROTATION.zeroReferenceAbsolute = 0.0001 deg = 1.7453292519943296e-6 rad`.
- Stage-7 local replay: **210 -> 107** with exactly **103 FAIL->PASS changes**; all 103 are `referenceValue=0` ROTATION rows. Every nonzero-reference failure identity/count is unchanged.
- Live branch profile is still `1e-7 rad`; 107 is **not** live PR parity.
- Two exact-zero rotations remain above the Stage-7 local boundary:
  - L2 node 20440 RZ: `-2.033276225626185e-6 rad = -0.000116498146 deg`.
  - L5 node 22110 RZ: `+1.7487675123311166e-6 rad = +0.000100196998 deg`.
- Stage 8 closed both rows without inventing a new mechanism:
  - L2:20440:RZ is a zero-crossing gravity cancellation while adjacent source-23/source-24 FY/MZ actions already match CAESAR to about `0.01%` to `0.29%`; broad gravity/stiffness tuning is therefore rejected.
  - L5:22110:RZ is only `3.438260336787e-9 rad` above the local Stage-7 boundary and crosses that boundary at total thermal strain about `0.0011671763`, which still rounds to CAESAR's printed `0.0012`; it is alpha-contingent, not independent rigid-mechanics evidence.
- Two restraint reinterpretation hypotheses were explicitly falsified offline against the exact-head system:
  - remapping the six `TYPE=7` rows from current translational-cosine treatment to rotational springs: **6088 failures**;
  - disabling the ten `TYPE=10` rows as non-OCC snubbers: **7115 failures**;
  - combining both: **7945 failures**.
  Direct CAESAR rotations at the six type-7 locations are substantial and already closely matched by the current solver, so no restraint remap is promoted.
- Hexagon v14 public documentation confirms reducers are represented by ten successively changing cylinders, but does not publish the representative property station used inside each cylinder. Midpoint sampling therefore remains blocked, not tunable.
- Repository search finds only the existing internal material-106 fixture `1.17e-5/K` (`PROJECT_BENCHMARK_MATERIAL_AUTHORITY_106`); it contains no underlying CAESAR material-table provenance and remains provisional for this parity task.

### What is being worked on

- QST-001: exact CAESAR material-library T1 strain from 21 C to 120 C.
- QST-002: exact CAESAR property station inside each ten-cylinder reducer segment.
- QST-004: native-unit zero-boundary candidate is complete locally; branch promotion requires Owner/reviewer disposition and must remain profile-only.

### What remains unfinished

- Core tee free-growth v3 patch is staged locally, not committed to the PR branch.
- Stage-7 one-line profile patch is staged locally, not committed.
- Exact alpha and reducer sampling remain blocked by missing direct authority.
- Stage 9 is authority acquisition only; no additional production code candidate is currently justified.

### What must not be assumed

- Do not promote benchmark-optimal alpha or reducer sampling.
- Do not treat the reducer 60%-Alpha/SIF fallback as structural taper authority.
- Do not infer Type 2.6 structural branches from Misc SIF rows alone.
- Do not present 107 as live parity; the live profile remains unchanged.
- Do not alter reference values, signs, source mappings, row identities or nonzero `<10%` gates.
- Do not reopen broad gravity/stiffness, type-7 remap, type-10 snubber-off, bend-weight, bend-subdivision or fitted-shape paths without new source authority.

### Highest-risk remaining item

Using a benchmark-sensitive global mechanic or tolerance to remove already-small cancellation residuals before obtaining the missing CAESAR material/reducer authority.

### Exact next action

Acquire one of these primary sources: CAESAR v14 `Print Alphas and Pipe Properties` / current-material print for material 106 at the BM4_L temperatures, or direct CAESAR documentation/export proving the internal reducer cylinder property station. Otherwise stop production tuning.

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
| Exact CAESAR T1 strain | P0 | BLOCKED | 9 | no full-precision material-db authority in pinned/online evidence |
| Exact reducer cylinder property station | P1 | BLOCKED | 9 | ten cylinders documented; station not published |
| Reducer `R1/R2/L1/L2` source state | P1 | VALIDATED | 6 | all four rows = `0.0` via provenance hash |
| Native-unit rotation gate candidate | P0 | VALIDATED_LOCAL | 7 | 103 zero-rotation status changes only; live profile unchanged |
| L2:20440:RZ real mechanics | P0 | CLOSED_NO_CHANGE | 8 | cancellation-sensitive; local actions already ~0.01-0.29% |
| L5:22110:RZ real mechanics | P0 | BLOCKED_ALPHA | 8 | residual crosses local boundary inside printed alpha rounding band |
| restraint type-7 reinterpretation | P0 | REJECTED | 8 | 435 -> 6088; direct CAESAR rotations contradict remap |
| restraint type-10 snubber-off | P0 | REJECTED | 8 | 435 -> 7115 |
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
| QST-003 | question | P0 | COMPLETE | Stage-8 residual diagnostics found no new promotable mechanic | YES |
| QST-004 | question | P0 | VALIDATED_LOCAL | native-unit rotation-gate candidate; branch authority pending | YES |
| RISK-002 | risk | P0 | OPEN | no explicit Hexagon hard `0.0001 deg` Access cutoff statement | YES |
| DEC-003 | decision | P0 | ACCEPTED | no Type 2.6 mechanics without topology authority | YES |
| DEC-004 | decision | P1 | ACCEPTED | reducer 60%-Alpha rule is not structural taper authority | YES |
| DEC-005 | decision | P0 | ACCEPTED | live zero gates remain unchanged until explicit promotion | YES |
| DEC-006 | decision | P0 | ACCEPTED | any Stage-7 promotion must be profile-only, separate from tee/alpha | YES |
| DEC-007 | decision | P0 | ACCEPTED | Stage-8 candidates must target one residual signature and not global tuning | YES |
| DEC-008 | decision | P0 | ACCEPTED | type-7 rotational reinterpretation is falsified for BM4_L and must not be coded | YES |
| DEC-009 | decision | P0 | ACCEPTED | type-10 snubber-off reinterpretation is falsified for governed BM4_L cases | YES |
| DEC-010 | decision | P0 | ACCEPTED | L2:20440:RZ is not authority for gravity/stiffness tuning; adjacent actions already agree closely | YES |
| DEC-011 | decision | P0 | ACCEPTED | L5:22110:RZ remains alpha-contingent until exact material strain is obtained | YES |

## Engineering Decisions and Invariants

### Tee free state

`g_thermal = epsilon * r_surface`; added initial load follows `-K_local g_local`, then existing `T^T` / `H^T`. K is unchanged. W/P-only cases stay unchanged.

### Permanent recovery identity

`q = K u - f_fixed - f_initial`

### Stage-7 profile candidate boundary

Candidate only: `ROTATION.zeroReferenceAbsolute = 1.7453292519943296e-6 rad`. This is an exact-zero comparison authority, not solver tolerance. It does not mutate actual/reference values or nonzero-reference comparisons.

### Stage-8 no-change boundary

A residual row does not authorize a mechanics change when neighboring CAESAR source actions are already closely reproduced or when the row is contingent on an unresolved upstream authority. Rejected reinterpretations remain rejected unless new direct CAESAR evidence supersedes the falsification.

## Stage Roadmap

- Stage 1 — report initialization + findings — COMPLETE
- Stage 2 — PR allocation/report synchronization — COMPLETE
- Stage 3 — repository/changed-file verification — COMPLETE
- Stage 4 — tee free-growth implementation preparation — COMPLETE; branch delivery pending
- Stage 5 — exact-head tee accuracy qualification — COMPLETE
- Stage 6 — authority/residual/output investigation — PARTIAL, sufficient to define Stage 7
- Stage 7 — local profile-only native-unit candidate — COMPLETE, NOT PROMOTED
- Stage 8 — residual real-mechanics diagnostics — COMPLETE, NO NEW MECHANICS PROMOTED
- Stage 9 — exact material/reducer authority acquisition — IN_PROGRESS, BLOCKED ON EXTERNAL/DIRECT CAESAR DATA

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

The Stage-7 candidate explains 103 exact-zero statuses without changing mechanics. The two remaining zero rotations sit above the candidate native boundary and were treated as real mechanics/recovery discrepancies until falsified or tied to unresolved upstream authority.

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

### Stage 8 — post-diagnostic result

Implementation performed: **none**. This stage intentionally ended with no new production patch.

Validation performed:
- PASS — exact-head physical-system reconstruction reproduces source-node displacement state and the governed 435 baseline target count.
- PASS — source23/source24 actions controlling L2:20440:RZ agree closely with CAESAR. Representative errors are about `0.009-0.287%` across FY/MZ end actions, while the node rotation is a cancellation-sensitive zero crossing.
- PASS — L5:22110:RZ alpha sensitivity is linear in the thermal term and crosses the local Stage-7 boundary at total strain approximately `0.0011671763`; this remains inside the CAESAR Misc value that prints as `0.0012`.
- FAIL — reinterpret six current `TYPE=7` cosine constraints as rotational springs. Governed target count regresses `435 -> 6088`. Direct CAESAR rotations at all six locations are substantial and already closely matched by the current solver.
- FAIL — disable ten current `TYPE=10` constraints as non-OCC snubbers. Governed target count regresses `435 -> 7115`.
- FAIL — combine the two restraint reinterpretations. Governed target count becomes `7945`.
- PASS — Hexagon reducer documentation confirms ten successively changing cylinders, but no representative internal property station was found in the v14 public help/applications/neutral/export documentation.
- PASS — repository search finds only the internal material-106 `1.17e-5/K` fixture; it lacks direct CAESAR material-table provenance and does not resolve exact T1 strain.
- NOT_RUN — core source modification; no Stage-8 mechanics patch is authorized.
- NOT_RUN — Actions rerun.

Actual behavior / interpretation:
- `L2:20440:RZ` is not a justified new mechanics target. The residual is far more sensitive than the already-good local end actions; tuning gravity/stiffness to zero it would weaken higher-value parity evidence.
- `L5:22110:RZ` is not an independent rigid-mechanics target until exact T1 material strain is known.
- Generic restraint-code documentation is insufficient to override direct BM4_L CAESAR response when the proposed reinterpretation is strongly falsified.

Decision: **COMPLETE** — Stage 8 produced no new promotable production mechanism. Restraint remap/snubber-off are rejected; L2 cancellation is closed no-change; L5 is handed to exact-alpha authority.

### Stage 9 — authority acquisition pre-implementation

#### Current truth

The best promotable mechanics result remains 210. The Stage-7 local profile candidate remains 107 and unpromoted. Stage 8 has no additional valid code change.

#### Objective

Resolve only upstream authority that can legitimately change the model:
1. exact CAESAR v14 material-106 thermal strain for BM4_L T1 from installation 21 C to operating 120 C;
2. exact CAESAR representative property station/section rule inside each of the ten reducer cylinders.

#### Planned implementation

None until one authority is obtained. Any accepted authority will be introduced as a single-factor change, replayed independently, and kept separate from tee/profile work.

#### Expected behavior

- Exact T1 strain, if different from the provisional fixture, may move only thermal-containing cases and can resolve the alpha-contingent L5 row without changing W/P-only physics.
- Reducer sampling authority, if obtained, must predict section stations independent of BM4_L error minimization and must be qualified separately.

#### Validation plan

- PASS required — primary CAESAR/Hexagon or pinned direct-output provenance.
- PASS required — one-factor replay and case signature.
- PASS required — unchanged references/tolerances/source identities.
- PASS required — K/recovery/equilibrium/superposition as applicable.
- FAIL/ABORT if value/station is chosen from benchmark score.

Stage decision: **IN_PROGRESS / BLOCKED_ON_AUTHORITY**.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Sensitive? | Validation |
|---|---|---|---|---|---|
| `src/core/fea-benchmarks/caesar-accdb-linear-solve.js` | prior | 8 read-only | governed mechanics; tee v3 local patch; restraint diagnostics | YES | exact-head replay PASS; no Stage-8 branch code |
| `agents/PR1001_workreport.md` | 1 | 9 | canonical mission control/handover | YES | Stage-8 close + Stage-9 gate |
| `PE_1001workreport.md` | 6 | 6 | pointer to canonical report | NO | pointer-only |
| `benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json` | prior | 7 local | Stage-7 one-line local candidate | YES | live file unchanged; 103-row proof PASS |
| `src/core/fea-benchmarks/caesar-accdb-reference.js` | prior | 6 read-only | reference ingestion | YES | no clipping found |
| `src/core/fea-benchmarks/caesar-accdb-units.js` | prior | 6 read-only | degree/radian conversion | YES | exact conversion only |
| `src/core/fea-benchmarks/qualification-comparison.js` | prior | 6 read-only | zero-gate semantics | YES | SI-unit interpretation confirmed |
| `src/core/linear-fea-reducer-condensation/reducer-condensation.js` | prior | 9 read-only | reducer authority investigation | YES | unchanged; station blocked |
| `src/core/linear-fea-rigid-element/rigid-element.js` | prior | 8 read-only | rigid/free-state investigation | YES | unchanged |
| `src/core/linear-piping-analysis-consumer/inputxml-thermal-authority.js` | prior | 9 read-only | current internal material-106 fixture | YES | 1.17e-5/K provenance insufficient for exact CAESAR parity |
| `scripts/lfea-m047-bm4l-accdb-provenance.ps1` | prior | 6 read-only | source-value hash authority | YES | unchanged |

Any unexplained changed file blocks closure.

## Software Validation

| Validation | Status | Basis | Evidence |
|---|---|---|---|
| exact-head reconstruction | PASS | `7488ba...` | ~`1e-11 m/rad`; physical replay consistent |
| tee v3 algebra/syntax | PASS | local | carrier/sign checks |
| tee six-case replay | PASS | exact-head artifact | 210 |
| reference importer clipping check | PASS | `7488ba...` | none |
| cross-model native-boundary evidence | PASS | BM1/BM2/BM3/BM4_NL | no inspected contradiction |
| Stage-7 changed-row proof | PASS | local | 103 exact-zero ROTATION only |
| Stage-8 type-7 remap | FAIL | local exact-head replay | 6088 failures |
| Stage-8 type-10 snubber-off | FAIL | local exact-head replay | 7115 failures |
| Stage-8 combined restraint reinterpretation | FAIL | local exact-head replay | 7945 failures |
| Stage-8 source23/24 local action parity | PASS | CAESAR source actions | ~0.01-0.29% representative errors |
| Stage-8 code change | NOT_APPLICABLE | stage decision | no valid candidate |
| Actions rerun | NOT_RUN | current | intentionally not rerun |

## Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| tee carrier coverage | PASS | E12 + E36.STRAIGHT |
| K unchanged by tee free growth | PASS | common stiffness state |
| thermal selectivity | PASS | L2/L4/L6 unchanged by tee mechanism |
| superposition / equilibrium | PASS | roundoff / ~`4.1e-5 N`, `7.5e-6 N.m` |
| exact alpha authority | BLOCKED | no pinned/direct full-precision material value |
| exact reducer station | BLOCKED | no primary station rule found |
| Stage-7 local gate candidate | PASS_LOCAL_ONLY | 103 zero-rotation statuses only |
| explicit hard Access `0.0001 deg` rule | NOT_VALIDATED | no direct Hexagon statement |
| L2:20440:RZ additional mechanics | NOT_APPLICABLE | close local actions; no source-backed defect |
| L5:22110:RZ additional mechanics | BLOCKED | exact alpha can determine boundary crossing |
| restraint reinterpretations | REJECTED | severe exact-head regression |

## Explicitly Not Validated

- Exact CAESAR T1 material strain for material 106.
- Exact reducer cylinder representative section/property station.
- A directly documented hard `0.0001 deg` Access zero cutoff.
- Any branch/profile promotion of Stage 7.
- Structural Type 2.6 interpretation.

## Known / Deferred Work and Forward Sequence

1. Obtain exact CAESAR v14 Print Alphas/current-material data for material 106 at 21 C -> 120 C; change only authority/value and replay.
2. Continue direct reducer property-station authority search only if new source material becomes available; never select station from BM4_L minimization.
3. Keep Stage-7 candidate local until Owner/reviewer disposition; if ever authorized, commit profile-only and qualify independently.
4. Keep type-7 remap/type-10 snubber-off rejected unless direct model-specific evidence overturns the exact-head falsification.
5. Keep Type 2.6 deferred without topology authority.
6. When Actions are explicitly authorized for production delivery, push/qualify the tee patch separately from profile/alpha work.

## Process Notes / Lessons Learned

- A source element that also owns a bend may require an incoming-straight analysis carrier for tee modifiers.
- Exact-head completed artifacts provide high-fidelity read-only evidence without rerunning Actions.
- Diagnostic optima inside rounded authority ranges are not authority.
- Access storage, CAESAR output cleanup, report formatting and our comparator are separate layers.
- SI-stored tolerances require quantity-specific conversion from any native-unit authority.
- Output-authority/profile changes must be separated from mechanics changes.
- A near-zero displacement/rotation can be cancellation-sensitive even when the controlling element actions are already accurate; do not tune the system to the zero alone.
- Generic export-code documentation must be cross-checked against direct benchmark response before changing field semantics.
- Falsified candidates belong in the report so future agents do not rediscover and retest them.

## Next-Agent Handover

- Current stopping point: Stage 9 authority acquisition after Stage-8 no-change closure.
- PR/branch/HEAD before this report commit: PR1001 / `agent/m047-bm4l-clean-qualified` / `f84b9b0003ef7f2ee0b44ea4cf687cf5dfa42431`.
- Governed implementation head: `7488ba76126f8240bb61c80fad243cf096c5fe08`.
- Last completed stage: Stage 8 diagnostics.
- Current active stage: Stage 9 authority acquisition only.
- Start here: direct CAESAR v14 material-106 Print Alphas/current-material output, then reducer internal station authority if available.
- Do not redo: generic bend softness, MEC-21 tested shear, fitted axial shape, gravity scaling, bend weight point/chord variants, bend subdivision tuning, source-ID-only tee replay, reducer pressure disable/sign tests, hidden reducer L2 hypothesis, reducer station fitting, type-7 rotational remap, type-10 snubber-off.
- Do not assume: 107 is live; `0.0001 deg` is an explicitly documented Access cutoff; 1.17e-5/K is exact CAESAR material authority; midpoint reducer sampling is CAESAR-exact.
- Known failing state: live profile + tee candidate = 210; local Stage-7 profile candidate = 107. Stage 8 produced no further promotable mechanic.