# PR1001 Engineering Work Report

## PR Mission Control

- Mission: qualify BM4_L CAESAR-II mechanics against literal `<10%` gates for L2/L3/L4/L5/L6/L14 without benchmark fitting.
- Source task / issue: M047 / BM4_L parity continuation. Issue #991 remains untouched.
- PR number: 1001.
- Branch: `agent/m047-bm4l-clean-qualified`.
- Base commit: `7a08f9db84f298990250793226b36d4a82dbe01e`.
- Governed implementation head for numerical replay: `7488ba76126f8240bb61c80fad243cf096c5fe08`.
- HEAD immediately before this canonical Stage-9 sync: `c25913f62158f39096a4dcb6f7921a8c690896fb`.
- PR status: OPEN / DRAFT.
- Current stage: Stage 10 — residual nonzero-error prioritization and remaining authority acquisition.
- Last completed stage: Stage 9 — direct CAESAR T1 strain reconstruction plus local tee+alpha six-case replay.
- Current qualified local mechanics/profile result under the **live** comparison gate: **150 failures** — L2 31, L3 22, L4 40, L5 13, L6 22, L14 22.
- Historical Stage-5 tee-only result at provisional alpha: **210 failures** — L2 31, L3 37, L4 40, L5 43, L6 22, L14 37.
- Stage-7 zero-rotation profile candidate remains **local-only and unpromoted**. With provisional alpha it gave 107; combined with resolved alpha it gives **46**.
- Current blocker: exact CAESAR reducer-cylinder representative property station remains unavailable. The generic A106 Grade B full temperature curve is also not claimed from the BM4_L interval reconstruction.
- Workflow policy: do not intentionally rerun GitHub Actions. Documentation handoff updates are allowed. Core/profile candidates remain local until Actions are explicitly authorized.

## Handover in 60 Seconds

### What is now true

- Accepted production baseline before the new tee state: **435 failures** — L2 31, L3 121, L4 40, L5 100, L6 22, L14 121.
- Qualified Type 2.1 tee mechanism: `g_thermal = epsilon * r_surface` on the existing CAESAR centerline-to-run-surface fictitious rigid.
- Correct carriers:
  - tee 20160 / Surface Node 20161 -> source 12 end J -> `ACCDB.E12`;
  - tee 20295 / Surface Node 20296 -> source 36 end I -> `ACCDB.E36.STRAIGHT`.
- Tee free growth changes `f_initial` only. K, Kb, Surface Node geometry, gravity, pressure, bend mechanics, references and tolerances remain unchanged.
- Fictitious-rigid thermal state inherits the common **run** material/temperature state and fails closed on inconsistent/missing run data.
- Tee v3 at provisional `epsilon=0.0011583` independently replays exactly **210** failures.
- Stage 9 reconstructs the CAESAR BM4_L T1 interval strain directly from ordinary-straight L3 kinematics and axial end forces:
  - `epsilon_T1 = 0.00121096700947` from 21 C to 120 C;
  - interval mean `alpha = 1.2231989994646464e-5 /K` over `DeltaT=99 K`.
- The reconstruction is overdetermined: 54 non-tee straight spans >=0.1 m collapse on the same strain, with median absolute deviation below `1e-9` in strain. This is constitutive reconstruction, not pass/fail optimization.
- The value independently rounds to the pinned CAESAR Misc report expansion `0.0012 mm/mm`.
- Resolved tee free translations are:
  - tee 20160: `0.1652969968 mm`;
  - tee 20295: `0.1018877368 mm`.
- Exact-equation local replay at the reconstructed strain gives **150** under the live gate:

| Case | baseline | tee + provisional alpha | tee + resolved alpha |
|---|---:|---:|---:|
| L2 | 31 | 31 | 31 |
| L3 | 121 | 37 | **22** |
| L4 | 40 | 40 | 40 |
| L5 | 100 | 43 | **13** |
| L6 | 22 | 22 | 22 |
| L14 | 121 | 37 | **22** |
| **Total** | **435** | **210** | **150** |

- W/P-only cases L2/L4/L6 remain unchanged by the tee thermal free state and alpha correction.
- `L14=L3` is exact in the replay. `L5=L6+L3` is exact in the replay.
- Resolved full L3 equilibrium is about `1.78e-5 N / 7.86e-8 N.m`, far inside governed `5 N / 0.5 N.m` gates.
- The 150 live-gate failures divide cleanly into **105 exact-zero-reference + 45 nonzero-reference** failures.
- Stage-7 candidate boundary remains local only: `ROTATION.zeroReferenceAbsolute = 0.0001 deg = 1.7453292519943296e-6 rad`.
- With tee + resolved alpha + that local boundary, result is **46**: L2 6, L3 5, L4 7, L5 8, L6 15, L14 5.
- That 46 consists of the same **45 nonzero-reference** failures plus only one remaining exact-zero failure, `L2:20440:RZ`.
- The formerly alpha-contingent `L5:22110:RZ` moves from `1.7487675e-6` to `1.7283668e-6 rad`, below the local `0.0001 deg` boundary exactly as predicted before replay.
- `L2:20440:RZ` is unchanged by alpha because L2 has no thermal term. Adjacent source23/source24 actions already match CAESAR closely; no gravity/stiffness tuning is authorized from that cancellation-sensitive row.
- Reducer pressure formulation remains internally consistent. Exact CAESAR representative station inside each of the ten reducer cylinders remains unresolved; midpoint sampling stays provisional and must not be benchmark-fit.
- Type-7 rotational-remap and type-10 snubber-off hypotheses remain rejected by severe exact-head regression.
- Type 2.6 structural modifiers remain deferred without structural topology authority.

### What is being worked on

- QST-002: exact CAESAR property station inside each ten-cylinder reducer segment.
- QST-004: Owner/reviewer disposition for the local-only `0.0001 deg` exact-zero rotation boundary.
- QST-005: classify the remaining **45 nonzero-reference** failures by shared source/topology/mechanics and promote only a source-backed correction.

### What remains unfinished

- Core tee free-growth v3 patch is local and unpushed.
- BM4_L resolved-alpha profile patch is local and unpushed.
- Stage-7 zero-rotation profile patch is local and unpromoted.
- Full Node module execution from a complete exact-head checkout is NOT_RUN because the connected GitHub interface cannot transfer the repository source archive into the local shell. The artifact-backed exact-equation replay is calibrated to the already-qualified 210 result before applying resolved alpha.
- GitHub Actions are NOT_RUN by policy.
- Exact reducer sampling authority remains blocked.

### What must not be assumed

- Do not present 46 as live PR parity; live profile still uses `1e-7 rad` and the live-gate local candidate is 150.
- Do not generalize the reconstructed BM4_L 21 C -> 120 C interval mean alpha into a complete A106 Grade B material curve.
- Do not fit reducer stations, gravity, stiffness, signs, source mappings, zero gates or reference values from score minimization.
- Do not infer Type 2.6 structural branches from Misc SIF/FLEX rows alone.
- Do not reopen rejected type-7/type-10 restraint reinterpretations without new model-specific CAESAR evidence.

## Mission and Engineering Intent

The target is physical/output parity with CAESAR II `14.00.00.0910 (Build 231113)`, not benchmark-score minimization. One independently justified mechanism or authority correction is allowed per controlled iteration.

Governed cases:

- `L2 = W`
- `L3 = T1`
- `L4 = P1`
- `L5 = W + T1 + P1`
- `L6 = W + P1`
- `L14 = L5 - L6 = T1`

Pinned CAESAR authority at Common `179c4831cf521cf797c13699cfbbd118315c9244`:

- `LFEA/BM4/Miscdata_BM4_L.txt`
- `LFEA/BM4/Loadcasereport_BM4_L.txt`

Authorized ACCDB member SHA-256: `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Type 2.1 tee topology / Kb | P0 | VALIDATED | prior | Misc report + production modifiers |
| Tee fictitious-rigid thermal free growth | P0 | VALIDATED_LOCAL | 5/9 | calibrated 210 replay; resolved-alpha 150 replay |
| E12 + E36.STRAIGHT carrier coverage | P0 | VALIDATED | 5 | source36 incoming-straight proof |
| Common run material/temp ownership | P0 | IMPLEMENTED_LOCAL | 5 | fail-closed v3 patch |
| BM4_L T1 interval strain | P0 | RESOLVED_LOCAL_AUTHORITY | 9 | 54-span constitutive reconstruction + rounded Misc consistency |
| Generic material-106 full alpha curve | P1 | NOT_CLAIMED | 9 | interval reconstruction only |
| Exact reducer cylinder property station | P1 | BLOCKED | 9/10 | ten cylinders documented; representative station not published |
| Reducer R1/R2/L1/L2 source state | P1 | VALIDATED | 6 | all four rows = 0.0 via provenance |
| Native-unit rotation gate candidate | P0 | VALIDATED_LOCAL_NOT_PROMOTED | 7/9 | 107 historical; 46 with resolved alpha |
| L2:20440:RZ real mechanics | P0 | CLOSED_NO_CHANGE | 8/9 | cancellation-sensitive; local actions already close |
| L5:22110:RZ alpha contingency | P0 | RESOLVED | 9 | resolved alpha predicts movement below local native gate |
| restraint type-7 reinterpretation | P0 | REJECTED | 8 | 435 -> 6088 |
| restraint type-10 snubber-off | P0 | REJECTED | 8 | 435 -> 7115 |
| Type 2.6 structural modifiers | P2 | DEFERRED | future | no topology authority |
| Remaining 45 nonzero failures | P0 | IN_PROGRESS | 10 | classify before any new mechanic |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| ISS-001 | defect | P0 | ACCEPTED_LOCAL | Type 2.1 fictitious rigid omitted thermal free growth |
| ISS-002 | defect | P0 | ACCEPTED_LOCAL | source-ID-only tee attachment misses `ACCDB.E36.STRAIGHT` |
| DEC-001 | decision | P0 | ACCEPTED | tee free growth changes `f_initial`, not K |
| DEC-002 | decision | P0 | ACCEPTED | fictitious rigid inherits fail-closed common run material/temp |
| DEC-003 | decision | P0 | ACCEPTED | no Type 2.6 mechanics without topology authority |
| DEC-004 | decision | P1 | ACCEPTED | reducer 60%-Alpha/SIF rule is not structural taper authority |
| DEC-005 | decision | P0 | ACCEPTED | live zero gates remain unchanged until explicit promotion |
| DEC-006 | decision | P0 | ACCEPTED | Stage-7 promotion, if ever authorized, is profile-only and separate |
| DEC-008 | decision | P0 | ACCEPTED | type-7 rotational reinterpretation is falsified for BM4_L |
| DEC-009 | decision | P0 | ACCEPTED | type-10 snubber-off reinterpretation is falsified for governed cases |
| DEC-010 | decision | P0 | ACCEPTED | L2:20440:RZ does not authorize gravity/stiffness tuning |
| DEC-011 | decision | P0 | SUPERSEDED_BY_RESULT | L5:22110:RZ was alpha-contingent; Stage 9 resolved the alpha dependency |
| DEC-012 | decision | P0 | ACCEPTED | BM4_L interval strain may be resolved from overdetermined CAESAR constitutive output without score fitting |
| DEC-013 | decision | P0 | ACCEPTED | do not promote interval mean alpha as a generic full material curve |
| QST-001 | question | P0 | RESOLVED_LOCAL_AUTHORITY | BM4_L exact T1 interval strain |
| QST-002 | question | P1 | BLOCKED | exact reducer cylinder property station |
| QST-003 | question | P0 | COMPLETE | Stage-8 residual diagnostics found no new promotable mechanic |
| QST-004 | question | P0 | VALIDATED_LOCAL | native-unit zero boundary; branch promotion pending Owner/reviewer |
| QST-005 | question | P0 | IN_PROGRESS | remaining 45 nonzero-reference failure classification |
| RISK-001 | risk | P0 | CLOSED_FOR_BM4L_INTERVAL | provisional alpha no longer needed for BM4_L T1 interval |
| RISK-002 | risk | P0 | OPEN | no explicit hard Hexagon `0.0001 deg` cutoff statement |
| RISK-003 | risk | P0 | OPEN | artifact replay is exact-equation calibrated but not full Node module execution |

## Engineering Decisions and Invariants

### Tee free state

`g_thermal = epsilon * r_surface`.

The added initial-load term follows production order:

`f_extra_local = -K_local g_local`

then the existing global/offset transforms. K is unchanged.

### Permanent recovery identity

`q = K u - f_fixed - f_initial`

### BM4_L interval thermal authority

For ordinary straight elements under L3:

`Delta u_axial = epsilon_T L + N L/(EA)`

so

`epsilon_T = (Delta u_axial - N L/(EA)) / L`

with the implemented sign convention applied consistently to exported end force. Independent spans collapse on `epsilon_T1 = 0.00121096700947`.

This resolves the BM4_L interval value only. It does not create a generic temperature-dependent material curve.

### Stage-7 profile candidate boundary

Candidate only:

`ROTATION.zeroReferenceAbsolute = 1.7453292519943296e-6 rad` (`0.0001 deg`).

This affects exact-zero comparison status only; it does not mutate solver values, references or nonzero `<10%` comparisons.

### Residual no-fitting boundary

A residual row does not authorize a mechanic when:

- neighboring source actions already agree closely;
- the proposed change is selected by score rather than authority;
- the relevant upstream CAESAR rule remains unknown;
- the candidate alters unrelated cases or previously-qualified invariants.

## Stage Roadmap

- Stage 1 — report initialization + findings — COMPLETE
- Stage 2 — PR allocation/report synchronization — COMPLETE
- Stage 3 — repository/changed-file verification — COMPLETE
- Stage 4 — tee free-growth implementation preparation — COMPLETE; core delivery pending
- Stage 5 — exact-head tee accuracy qualification — COMPLETE
- Stage 6 — authority/residual/output investigation — COMPLETE ENOUGH FOR STAGE 7
- Stage 7 — local profile-only native-unit candidate — COMPLETE, NOT PROMOTED
- Stage 8 — residual real-mechanics diagnostics — COMPLETE, NO NEW MECHANICS PROMOTED
- Stage 9 — exact thermal interval authority + local combined replay — COMPLETE / LOCAL_VALIDATION_PASS
- Stage 10 — remaining nonzero residual classification / reducer authority — IN_PROGRESS

## Stage Execution Log

### Stage 5 — tee free-growth qualification

Implementation: local v3 patch adds generic tee rigid thermal free growth on the actual carrier and fail-closed common run authority.

Validation:

- PASS — syntax and I/J transform/sign checks.
- PASS — exact-head physical-system reconstruction.
- PASS — six-case provisional replay `31/37/40/43/22/37 = 210`.
- PASS — thermal selectivity, common K, recovery, equilibrium and superposition.
- NOT_RUN — Actions rerun.

Decision: **COMPLETE**.

### Stage 6 — authority/residual/output investigation

Findings:

- pinned sources did not contain Print-Alphas/current-material table;
- reducer R1/R2/L1/L2 all zero;
- exact reducer representative station remains unknown;
- tee candidate contained 105 exact-zero rotation failures;
- raw BM4_L and independent CAESAR evidence motivated a local `0.0001 deg` exact-zero boundary investigation;
- importer performs unit conversion, not clipping.

Decision: **COMPLETE ENOUGH TO DEFINE STAGE 7**; no production change promoted.

### Stage 7 — local profile-only native-unit candidate

At provisional alpha, local one-line gate change:

`1e-7 rad -> 1.7453292519943296e-6 rad`.

Validation:

- PASS — exact native-unit conversion.
- PASS — `210 -> 107` at provisional alpha.
- PASS — exactly 103 status changes, all exact-zero ROTATION `FAIL -> PASS`.
- PASS — nonzero-reference statuses unchanged.
- NOT_RUN — branch promotion / Actions.

Decision: **COMPLETE / NOT PROMOTED**.

### Stage 8 — residual mechanics diagnostics

Key results:

- `L2:20440:RZ = -2.0332762e-6 rad` is a cancellation-sensitive weight response; adjacent source23/source24 FY/MZ actions already agree approximately `0.01-0.29%` with CAESAR. No gravity/stiffness tuning.
- `L5:22110:RZ = +1.7487675e-6 rad` was shown to be linearly alpha-contingent.
- type-7 -> rotational reinterpretation: FAIL, `435 -> 6088`.
- type-10 snubber-off reinterpretation: FAIL, `435 -> 7115`.
- both: FAIL, `7945`.
- reducer public authority confirms ten cylinders but not the representative internal station.

Decision: **COMPLETE / NO NEW MECHANICS PROMOTED**.

### Stage 9 — pre-implementation truth

At stage entry:

- tee-only result 210 was the best promotable mechanics result;
- exact thermal interval strain remained unresolved;
- reducer station remained unresolved;
- alpha fitting from benchmark counts was prohibited.

Objective: obtain direct upstream authority without benchmark minimization.

### Stage 9 — CAESAR interval-strain reconstruction

Method:

- use CAESAR L3 ordinary straight-element endpoint displacements;
- project onto each element axis;
- use exported axial end force and known EA/L relation;
- recover total free thermal strain independently for each eligible span;
- exclude tee-special carriers and very short spans from the robust authority statistic.

Result:

- 54 non-tee spans >=0.1 m give median `epsilon = 0.001210967009`;
- median interval mean `alpha = 1.223199e-5/K`;
- long-span subset gives the same value;
- scatter is below `1e-9` strain at the median-absolute-deviation level;
- value independently agrees with the pinned Misc report when rounded to four decimal places (`0.0012`).

Decision: **QST-001 RESOLVED FOR THE BM4_L 21 C -> 120 C INTERVAL**.

### Stage 9 — local tee + resolved-alpha replay

Replay method:

1. Reassemble global K from all 322 exact-head analysis-element stiffness matrices in the cached completed artifact.
2. Recover 30 finite-restraint nodes / 51 restrained DOFs from exact nodal equilibrium.
3. Verify source-element endpoint recovery mapping exactly; baseline maximum mapping error is `0`.
4. Apply tee free-growth initial-load perturbation only on E12 and E36.STRAIGHT.
5. Solve with unchanged K.
6. Scale the existing T1 state to `epsilon=0.00121096700947`.
7. Recompute restraint reactions and source-element actions.
8. Compare governed quantities only; derived `INCIDENT_GLOBAL_*` diagnostics are excluded from the governed 435 count.

Calibration:

- PASS — at provisional `epsilon=0.0011583`, local replay reproduces Stage-5 exactly: **210**.

Resolved-alpha result:

- PASS — L2 31.
- PASS — L3 22.
- PASS — L4 40.
- PASS — L5 13.
- PASS — L6 22.
- PASS — L14 22.
- PASS — total **150**.
- PASS — 105 exact-zero-reference + 45 nonzero-reference failures.
- PASS — Stage-7 sensitivity becomes **46**, i.e. the 45 nonzero failures plus only `L2:20440:RZ` as the remaining exact-zero failure.
- PASS — `L5:22110:RZ` becomes `1.7283668e-6 rad`, below local `0.0001 deg` boundary as predicted.
- PASS — tee perturbation equilibrium about `2.75e-7 N / 2.84e-9 N.m`.
- PASS — full resolved L3 equilibrium about `1.78e-5 N / 7.86e-8 N.m`.
- PASS — `L14=L3` exactly.
- PASS — `L5=L6+L3` exactly.
- PASS — W/P-only cases unchanged.
- NOT_RUN — full Node module execution from a complete local checkout.
- NOT_RUN — Actions rerun.

Decision: **COMPLETE / LOCAL_VALIDATION_PASS**.

## Stage 10 — pre-implementation gate

### Current truth

The live-gate local combined candidate is 150. Exactly 105 failures are exact-zero-reference rows and 45 are nonzero-reference rows. The separate Stage-7 local gate would remove 104 of the 105 zero-reference failures without changing nonzero comparisons, leaving 46 total.

### Objective

Classify the 45 nonzero-reference failures and find only a source-backed, single-mechanism correction. Continue reducer-station authority acquisition in parallel. Do not use the local zero boundary as a substitute for mechanics.

### Planned validation

- PASS required — identity-level residual clustering by case/source/topology.
- PASS required — candidate predicts a specific residual family before replay.
- PASS required — independent CAESAR/engineering authority.
- PASS required — single-factor replay with unchanged references/tolerances.
- PASS required — K/recovery/equilibrium/superposition as applicable.
- ABORT — any candidate selected from global score optimization.

Stage decision: **IN_PROGRESS**.

## Changed-File Ledger

| File | Stage | Purpose | Branch state |
|---|---|---|---|
| `src/core/fea-benchmarks/caesar-accdb-linear-solve.js` | 4/5/9 | tee v3 mechanics | LOCAL ONLY |
| `benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json` | 7/9 | resolved interval alpha + separate zero-gate candidate | LOCAL ONLY |
| `agents/PR1001_workreport.md` | all | canonical mission control | BRANCH DOC |
| `PE_1001workreport.md` | 6 | pointer to canonical report | BRANCH DOC |
| `agents/PR1001_stage9_local_replay.md` | 9 | durable detailed Stage-9 local replay evidence | BRANCH DOC |
| `src/core/fea-benchmarks/caesar-accdb-reference.js` | 6 | reference ingestion | READ ONLY |
| `src/core/fea-benchmarks/caesar-accdb-units.js` | 6 | degree/radian conversion | READ ONLY |
| `src/core/fea-benchmarks/qualification-comparison.js` | 6/7 | comparator semantics | READ ONLY |
| `src/core/linear-fea-reducer-condensation/reducer-condensation.js` | 6/9/10 | reducer station authority | READ ONLY |
| `src/core/linear-piping-analysis-consumer/inputxml-thermal-authority.js` | 9 | generic internal fixture review | READ ONLY / UNCHANGED |

Any unexplained changed file blocks closure.

## Software Validation

| Validation | Status | Evidence |
|---|---|---|
| exact-head artifact reconstruction | PASS | governed implementation `7488ba...` |
| source endpoint recovery mapping | PASS | max absolute mapping error 0 |
| tee v3 algebra/syntax | PASS | carrier/sign checks |
| tee provisional six-case replay | PASS | exact calibration = 210 |
| BM4_L interval strain reconstruction | PASS | 54-span overdetermined CAESAR constitutive recovery |
| tee + resolved-alpha live-gate replay | PASS_LOCAL | 150 |
| tee + resolved-alpha + Stage-7 local gate | PASS_LOCAL_ONLY | 46; not promoted |
| resolved L3 equilibrium | PASS | ~`1.78e-5 N / 7.86e-8 N.m` |
| superposition | PASS | exact L14=L3 and L5=L6+L3 in replay |
| Stage-8 type-7 remap | FAIL / REJECTED | 6088 |
| Stage-8 type-10 snubber-off | FAIL / REJECTED | 7115 |
| Stage-8 combined reinterpretation | FAIL / REJECTED | 7945 |
| full local Node module run | NOT_RUN | no transferable complete source checkout |
| Actions rerun | NOT_RUN | intentionally prohibited |

## Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| tee carrier coverage | PASS | E12 + E36.STRAIGHT |
| K unchanged by tee/alpha | PASS | common stiffness state |
| thermal selectivity | PASS | L2/L4/L6 unchanged |
| common run thermal ownership | PASS_LOCAL | v3 fail-closed helper |
| BM4_L exact T1 interval strain | PASS_LOCAL_AUTHORITY | constitutive reconstruction |
| generic full A106 alpha curve | NOT_APPLICABLE / NOT_CLAIMED | interval-only authority |
| exact reducer station | BLOCKED | no direct rule found |
| Stage-7 local gate candidate | PASS_LOCAL_ONLY | zero-reference-only effect |
| explicit hard Hexagon `0.0001 deg` rule | NOT_VALIDATED | no direct statement |
| L2:20440 additional mechanic | NOT_APPLICABLE | cancellation with close local actions |
| L5:22110 alpha dependency | RESOLVED | moved below local boundary at exact interval strain |
| remaining nonzero failures | IN_PROGRESS | 45 rows |

## Explicitly Not Validated

- Exact reducer cylinder representative section/property station.
- A directly documented hard `0.0001 deg` CAESAR/Access zero cutoff.
- Branch/profile promotion of Stage 7.
- A generic A106 Grade B full thermal-expansion curve derived from the BM4_L interval.
- Structural Type 2.6 interpretation.
- Full Node production-module execution of tee + resolved-alpha from a complete exact-head checkout.

## Known / Deferred Work and Forward Sequence

1. Stage 10: classify the 45 nonzero-reference failures by repeated identity/source/topology signature.
2. Promote only a correction with independent CAESAR/engineering authority and a predicted case signature.
3. Continue reducer representative-station authority search; never select station from BM4_L score.
4. Keep Stage-7 zero gate local until Owner/reviewer disposition. If authorized, commit profile-only and qualify independently.
5. Keep type-7/type-10 restraint reinterpretations rejected unless direct model-specific evidence overturns them.
6. Keep Type 2.6 deferred without topology authority.
7. When Actions are explicitly authorized for production delivery, push and qualify tee mechanics separately from resolved-alpha profile authority, then any zero-gate profile decision separately.

## Process Notes / Lessons Learned

- A source element that also owns a bend may require an incoming-straight analysis carrier for tee modifiers.
- Exact-head completed artifacts can support high-fidelity local linear-system replay without rerunning Actions.
- A replay must use the governed comparison scope; derived incident-force/moment diagnostics are not part of the 435 target count.
- Restraint reaction perturbations must be recomputed from finite support stiffness, not treated as displacement rows.
- Calibration against a previously qualified single-factor result is a strong guard before trusting a combined replay.
- Diagnostic optima inside rounded authority ranges are not authority; overdetermined constitutive reconstruction can be.
- Interval thermal authority must not be generalized into an unsupported full material curve.
- Access storage, CAESAR output cleanup, report formatting and comparator gates are separate layers.
- Near-zero rotations can be cancellation-sensitive even when controlling element actions are already accurate.
- Falsified candidates belong in the durable report so future work does not repeat them.

## Next-Agent Handover

- PR: #1001, draft.
- Branch: `agent/m047-bm4l-clean-qualified`.
- Governed implementation head: `7488ba76126f8240bb61c80fad243cf096c5fe08`.
- Last completed stage: Stage 9.
- Current active stage: Stage 10 residual classification / remaining authority.
- Best live-gate local combined result: **150**.
- Local-only Stage-7 combined sensitivity: **46**, not live parity.
- Start here: classify the 45 nonzero-reference rows; continue reducer station authority search.
- Do not redo: generic bend softness, MEC-21 tested shear, fitted axial shape, gravity scaling, bend-weight variants, bend subdivision tuning, source-ID-only tee replay, reducer pressure disable/sign tests, reducer station fitting, type-7 rotational remap, type-10 snubber-off.
- Do not assume: 46 is live; `0.0001 deg` is explicitly documented as a hard cutoff; the BM4_L interval mean is a generic material curve; midpoint reducer sampling is CAESAR-exact.
