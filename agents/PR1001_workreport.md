# PR1001 Engineering Work Report

## PR Mission Control

- Mission: qualify BM4_L CAESAR-II mechanics against literal `<10%` comparison gates for L2/L3/L4/L5/L6/L14 without benchmark fitting.
- Source task / issue: M047 / BM4_L parity continuation; Issue #991 remains untouched.
- PR number: 1001
- Branch: `agent/m047-bm4l-clean-qualified`
- Base commit: `7a08f9db84f298990250793226b36d4a82dbe01e`
- Current HEAD before this report update: `d58c665b374bf0813067e7657e52e045baab6859`
- PR status: OPEN / DRAFT
- Current stage: Stage 6 — authority-first continuation and residual-ownership diagnostics
- Last completed stage: Stage 5 — tee free-growth accuracy qualification
- Engineering status: Type 2.1 fictitious-rigid thermal free growth is qualified locally/offline; Stage 6 found no promotable alpha or reducer-sampling value, but localized the 105 exact-zero failures and proved all BM4_L reducer R1/R2/L1/L2 fields are zero.
- Validation status: PASS for exact-head replay, tee sign/carrier/equilibrium/superposition, Access-oracle provenance, reducer pressure consistency, and reducer auxiliary-field hash proof; branch CI not intentionally rerun.
- Current blocker: exact CAESAR material-library T1 strain and exact internal property station used by CAESAR's ten reducer cylinders are not independently available.
- Exact next action: continue QST-003 load-family/recovery diagnostics and primary-authority search; do not change alpha, reducer sampling, gravity, stiffness, references, signs or tolerances from benchmark behavior.

## Handover in 60 Seconds

### What is now true

- The governed production baseline at exact implementation head `7488ba76126f8240bb61c80fad243cf096c5fe08` is 435 failures across L2/L3/L4/L5/L6/L14.
- The qualified Type 2.1 tee correction is free thermal growth of the existing centerline-to-run-surface rigid offset: `g_thermal = epsilon * r_surface`.
- Correct carriers are `ACCDB.E12` for tee 20160 and `ACCDB.E36.STRAIGHT` for tee 20295.
- The candidate changes `f_initial` only; K, Kb, Surface Node geometry, weight, pressure and bend mechanics are unchanged.
- Offline reconstruction from the already-completed exact-head qualification artifact reproduces the stored displacement field to about `1e-11 m/rad` and reproduces the candidate total of 210 failures.
- Candidate counts: L2 31, L3 37, L4 40, L5 43, L6 22, L14 37.
- Candidate equilibrium is about `4.1e-5 N / 7.5e-6 N.m`; `L14=L3` is exact and the other superposition identities remain at numerical roundoff.
- All 105 candidate failures whose CAESAR reference is exactly zero are ROTATION rows, not forces, moments or translations.
- Exact-zero counts are L2 26, L3 17, L4 33, L5 5, L6 7, L14 17; the L3 and L14 zero-reference sets are identical.
- The L4 zero-rotation family is strongly reducer-coupled: reducer contributions dominate 26 of 33 rows in a load-family decomposition.
- BM4_L `INPUT_REDUCERS` has four rows. Provenance hashes prove every R1, R2, L1 and L2 value is exactly `0.0` in all four rows.
- The CAESAR output XML does not contain a material/alpha table. The benchmark oracle is the Access `OUTPUT_DISPLACEMENTS` table with ADO double precision, so exact-zero reference rows must not be reinterpreted as six-decimal XML display rounding.

### What is being worked on

- QST-001: external primary authority for the exact CAESAR material-library T1 strain from 21 C to 120 C.
- QST-002: exact property station used inside each of CAESAR's ten reducer cylinders.
- QST-003: physical/recovery ownership of the remaining exact-zero rotation families.

### What remains unfinished

- Core tee free-growth patch is staged locally and not committed to the PR branch.
- Exact CAESAR material-library total strain from 21 C to 120 C is unresolved.
- Reducer midpoint section sampling remains explicitly provisional.
- No independently authoritative second mechanism has reduced the promotable 210 result.

### What must not be assumed

- Do not promote alpha from benchmark minimization. The Misc report prints only `0.0012 mm/mm` to four decimals.
- Do not choose endpoint, midpoint or another reducer property station from BM4_L failure counts.
- Do not reinterpret the CAESAR reducer 60%-length Alpha/SIF rule as a 60%-length structural stiffness taper. Public CAESAR documentation separately states that the structural reducer is ten successive cylinders over the element length.
- Do not infer structural Type 2.6 branches solely from Misc-report SIF rows.
- Do not weaken literal comparison gates, zero-reference gates, signs, row mappings, source mappings or reference data.

### Highest-risk remaining item

Accidentally promoting a diagnostic value—especially alpha or reducer sampling—as engineering authority because it reduces BM4_L failures.

### Exact next action

Continue signed load-family decomposition of QST-003 and search primary CAESAR/Hexagon material/reducer authority. Implement nothing further unless an independent rule predicts the affected cases/signatures before replay.

## Mission and Engineering Intent

The goal is physical parity with CAESAR II 14.00.00.0910 (Build 231113), not minimization of a benchmark score. Every production change must represent one independently justified physical mechanism, preserve existing authority boundaries unless explicitly documented, and remain falsifiable through a predeclared case signature.

The governed six cases are:

- `L2=W`
- `L3=T1`
- `L4=P1`
- `L5=W+T1+P1`
- `L6=W+P1`
- `L14=L5-L6=T1`

Pinned CAESAR authority at Common commit `179c4831cf521cf797c13699cfbbd118315c9244`:

- `LFEA/BM4/Miscdata_BM4_L.txt`
- `LFEA/BM4/Loadcasereport_BM4_L.txt`

The Misc report establishes structural Type 2.1 tee Surface Nodes 20161 and 20296 and their branch flexibilities/Kb values. The Load Case Report confirms EC and zero friction on L2-L6 plus algebraic `L14=L5-L6`.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Type 2.1 tee topology / Kb authority | P0 | VALIDATED | prior | Misc report + production modifier authority |
| Tee fictitious-rigid thermal free growth | P0 | VALIDATED | 5 | exact-head offline replay: 435 -> 210 |
| Correct carrier coverage including source 36 incoming straight | P0 | VALIDATED | 5 | `ACCDB.E12`, `ACCDB.E36.STRAIGHT`; 284 retired |
| Common run temperature/material ownership | P0 | IMPLEMENTED | 5 local | fail-closed v3 patch, not branch-committed |
| Exact CAESAR T1 thermal strain | P0 | BLOCKED | 6 | pinned Common has no Print-Alphas/material table; Misc only prints 0.0012 rounded |
| Reducer exact cylinder section sampling | P1 | BLOCKED | 6 | public CAESAR authority confirms ten cylinders but does not publish per-cylinder property station |
| Reducer R1/R2/L1/L2 source state | P1 | VALIDATED | 6 | provenance multiset hashes resolve to four `0.0` values for every field |
| Zero-reference residual ownership | P1 | INVESTIGATING | 6 | all 105 are rotations; load-family decomposition identifies coherent owners/cancellations |
| Type 2.6 structural modifiers | P2 | DEFERRED | future | report SIF rows lack matching three-leg structural topology authority |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| ISS-001 | defect | P0 | ACCEPTED | Type 2.1 fictitious rigid omitted thermal free growth | YES |
| ISS-002 | defect | P0 | ACCEPTED | Source-ID-only tee carrier attachment misses `ACCDB.E36.STRAIGHT` | YES |
| DEC-001 | decision | P0 | ACCEPTED | Tee free growth changes `f_initial` only; preserve K and existing offset geometry | YES |
| DEC-002 | decision | P0 | ACCEPTED | Fictitious rigid inherits fail-closed common run temperature/material authority | YES |
| RISK-001 | risk | P0 | OPEN | Thermal alpha is provisional; benchmark-optimal alpha would be fitting | YES |
| QST-001 | question | P0 | BLOCKED | What exact CAESAR material-library total strain applies from 21 C to 120 C? | YES |
| QST-002 | question | P1 | BLOCKED | What exact section/property station does CAESAR use inside each ten-cylinder reducer segment? | YES |
| QST-003 | question | P1 | INVESTIGATING | What mechanics/recovery rule owns persistent exact-zero-reference rotations? | YES |
| DEC-003 | decision | P0 | ACCEPTED | Do not modify Type 2.6 mechanically without topology/analysis-node authority | YES |
| DEC-004 | decision | P1 | ACCEPTED | Do not apply the reducer 60%-length Alpha rule to structural stiffness interpolation | YES |
| IMP-001 | improvement | P1 | DEFERRED | Add explicit reducer source auxiliary evidence to runtime ledger once authority extraction is productized | YES |

## Engineering Decisions and Invariants

### DEC-001 — Tee thermal free state

What must remain true:

- `g_thermal = epsilon * r_surface` only on an actual tee-modified analysis carrier with non-null rigid offset.
- Added initial-load contribution follows the production convention `-K_local g_local`, then existing local-to-global and rigid-offset load transforms.
- K is unchanged.
- W/P-only cases remain unchanged.

Validation:

- exact-head offline six-case replay gives 31/37/40/43/22/37;
- opposite sign was previously falsified;
- equilibrium and superposition remain clean.

### DEC-002 — Run authority

The fictitious rigid inherits the common run temperature/material state. If the two run legs disagree, block instead of silently taking the branch or one run leg.

### DEC-004 — Reducer 60% rule boundary

CAESAR public documentation states both that:

1. the structural concentric reducer is constructed from ten successive pipe cylinders over the element length; and
2. when reducer Alpha is blank, the transition slope used by reducer code/SIF logic is estimated using 60% of entered element length.

BM4_L provenance proves all four reducers have `R1=R2=L1=L2=0.0`. This does not authorize shrinking the structural stiffness transition to 60% of element length. Exact cylinder property sampling remains QST-002.

### Permanent recovery identity

`q = K u - f_fixed - f_initial`

Do not alter recovery sign, benchmark reference values, row identities or tolerance semantics to improve counts.

## Stage Roadmap

- Stage 1 — report initialization + technical findings — COMPLETE
- Stage 2 — PR allocation + report synchronization — COMPLETE
- Stage 3 — changed-file / repository-state verification — COMPLETE
- Stage 4 — tee thermal free-growth implementation preparation — COMPLETE/PARTIAL branch delivery
- Stage 5 — exact-head accuracy replay and fine-tuning gate — COMPLETE
- Stage 6 — authority-first continuation and zero-reference diagnostics — IN_PROGRESS
- Stage 7 — next single-mechanism implementation only if independently authorized — NOT_STARTED

## Stage 5 Completion Record

### Current truth

Baseline 435. Tee free-growth candidate 210. Exact-head qualification artifact already exists for `7488ba76126f8240bb61c80fad243cf096c5fe08` and was used read-only.

### Implementation performed

A local v3 patch adds generic tee rigid thermal free growth on the actual analysis carrier, carries common run temperature/material state, fails closed on missing/inconsistent run authority, and exposes evidence without altering K.

### Validation performed

- PASS — local helper syntax.
- PASS — I/J transform/sign identity.
- PASS — exact-head system reconstruction to approximately `1e-11 m/rad` versus stored raw displacement field.
- PASS — six-case candidate count reproduction: total 210.
- PASS — thermal selectivity: L2/L4/L6 unchanged; L3/L5/L14 improve.
- PASS — common K / superposition identities.
- PASS — recovered equilibrium approximately `4.1e-5 N / 7.5e-6 N.m`.
- PASS — reducer pressure boundary free-elongation is algebraically consistent with segment-wise pressure free strain.
- PASS — mirrored reducer pressure orientation/sign check.
- NOT_RUN — no intentional GitHub Actions rerun.

### Fine-tuning disposition

A diagnostic alpha sweep constrained to the printed `0.0012 mm/mm` rounding interval reaches about 150 failures near total strain `0.001208-0.001210`. This result is REJECTED for promotion because selecting the coefficient from benchmark performance is fitting. At that plateau, 105 of 150 failures are exact-zero-reference rows.

Finite fictitious-rigid stiffness and fictitious-rigid Bourdon pressure were bounded as separate mechanisms; neither justifies bundling with the accepted tee thermal free state.

### Stage decision

COMPLETE — tee free-growth mechanics are qualified; further production tuning is authority-blocked.

## Stage 6 Investigation Record

### Current truth

The best promotable result remains 210 failures. No new coefficient, stiffness or reducer-sampling change is authorized.

### Objective

Find independent primary authority for the next accuracy-changing mechanism while decomposing the exact-zero-reference families without weakening gates.

### Authority search performed

- Inspected pinned Common tree at `179c4831cf521cf797c13699cfbbd118315c9244` for Print Alphas / material-property exports: none found.
- Inspected pinned `Output_BM4.xml`: result reports are present, but no material/alpha table is embedded.
- Confirmed CAESAR public documentation describes Thermal Expansion as material-database-derived thermal strain and identifies material-library mean expansion coefficients as the source.
- Confirmed CAESAR public reducer documentation: ten successively changing pipe cylinders; Diameter2/Thickness2 at the To node; Alpha fallback uses 60% of entered reducer length; neutral/export documentation defines L2 as the B31J small-end cylindrical length.
- Confirmed public documentation does not state the internal representative section station used for each structural cylinder.

### Exact-zero oracle classification

The exact-head provenance identifies `OUTPUT_DISPLACEMENTS` as an Access table using ADO type 5/double with precision 15 for DX/DY/DZ/RX/RY/RZ. Although CAESAR XML reports visibly print rotations to six decimal degrees, the governed benchmark oracle is not that display precision. Therefore exact-zero references are retained literally.

After the qualified tee candidate, all 105 exact-zero-reference failures are rotations:

| Case | exact-zero rotation failures |
|---|---:|
| L2 | 26 |
| L3 | 17 |
| L4 | 33 |
| L5 | 5 |
| L6 | 7 |
| L14 | 17 |
| **Total** | **105** |

`L3` and `L14` have the same exact-zero row set, consistent with their exact thermal identity.

Replay error is approximately `1e-11 m/rad`; failing zero-reference rotations are typically about `1e-7` to `2e-6 rad`, so solver precision is not the owner.

### Signed load-family decomposition

Using the common exact-head global K and reconstructed load families, exact-zero rotations were decomposed by analysis kind without changing production mechanics.

Dominant-family counts:

| Case | Dominant families | Interpretation |
|---|---|---|
| L2 | FRAME 19, RIGID 5, BEND_ARC 1, BEND_INCOMING_STRAIGHT 1 | gravity residuals are not one reducer-only defect |
| L3 | FRAME 12, RIGID 3, BEND_INCOMING_STRAIGHT 2 | thermal zeros are strong cross-kind cancellations |
| L4 | REDUCER 26, BEND_ARC 4, BEND_INCOMING_STRAIGHT 2, FRAME 1 | reducer mechanics are high leverage for pressure-only zero rotations |
| L5 | FRAME 4, RIGID 1 | mixed-load cancellation |
| L6 | FRAME 5, BEND_INCOMING_STRAIGHT 1, BEND_ARC 1 | W+P cancellation |
| L14 | same as L3 | exact thermal identity |

Example L4 node 22130 RX:

- total: about `-5.95e-7 rad` versus CAESAR exact zero;
- BEND_ARC: about `+6.70e-7`;
- BEND_INCOMING_STRAIGHT: about `+4.36e-8`;
- FRAME: about `+3.62e-7`;
- REDUCER: about `-1.67e-6`;
- RIGID: about `+2.3e-9`.

This localizes QST-002 as high leverage but does not authorize a sample station.

Thermal zero families exhibit even stronger cancellation. At representative nodes, large cross-kind terms on the order of `1e-3 rad` cancel to residuals around `1e-7 rad`, so a small systematic free-state/recovery mismatch can matter. No authoritative missing thermal mechanism has yet been identified beyond the already-qualified tee free growth and unresolved exact alpha.

### Reducer auxiliary-field proof

`INPUT_REDUCERS` contains four rows. Its provenance script canonicalizes each ADO value with compact JSON, sorts the four values, joins them with newline, and SHA-256 hashes that multiset. The recorded hash for each of `R1`, `R2`, `L1`, and `L2` is:

`614bebfb3f644dd465d66f2e458c6a5fa3da8a7a9d08050c36a09cc3dfb8429d`

The canonical multiset text for four ADO double zeros is exactly:

`0.0\n0.0\n0.0\n0.0`

and hashes to that same value. Therefore all four BM4_L reducers carry `R1=R2=L1=L2=0.0`.

Engineering consequence: there is no hidden nonzero B31J L2 cylindrical-end length available to correct the structural reducer geometry. QST-002 is narrowed to internal cylinder property sampling, not omitted source geometry.

### Stage-6 validation

- PASS — pinned Common tree contains no separate Print-Alphas/material-table export.
- PASS — `Output_BM4.xml` contains result output but no alpha/material table.
- PASS — Access oracle precision evidence rules out treating exact-zero benchmark rotations as XML display rounding.
- PASS — all 105 exact-zero candidate failures classified as rotations.
- PASS — L3/L14 exact-zero set identity.
- PASS — signed load-family decomposition reproduces full candidate displacement when summed.
- PASS — L4 reducer dominance localized in 26/33 zero-reference rotations.
- PASS — reducer `R1/R2/L1/L2 = 0.0` proof from repository provenance hash algorithm and exact-head provenance.
- PASS — public 60%-length Alpha rule bounded to reducer slope/SIF authority; not promoted into stiffness interpolation.
- NOT_RUN — no intentional GitHub Actions rerun.

### New findings

- QST-001 is externally blocked: exact T1 material strain is not present in the pinned source/report/output bundle.
- QST-002 is high leverage for L4 but remains externally blocked on cylinder sampling; hidden L2 geometry is ruled out.
- QST-003 is not a numerical-precision problem and is not a report-display-rounding problem.
- Exact alpha alone cannot eliminate the 105 exact-zero floor; another authoritative mechanics/recovery reconciliation is required for literal closure.

### Stage decision

PARTIAL — investigation materially narrows the remaining problem, but no second production mechanism is authorized.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---|---|---|---|---|
| `src/core/fea-benchmarks/caesar-accdb-linear-solve.js` | prior | 5 | governed ACCDB linear mechanics; local tee free-growth patch staged | YES | offline exact-head replay PASS; branch patch not yet committed |
| `agents/PR1001_workreport.md` | 1 | 6 | canonical durable mission control / handover | YES | updated with Stage-6 evidence |
| `PE_1001workreport.md` | 6 | 6 | requested compatibility pointer to canonical report; no duplicate authority | NO | pointer-only |
| `benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json` | prior | prior | governed validation profile / provisional alpha declaration | YES | unchanged in Stage 6 |
| `src/core/linear-fea-reducer-condensation/reducer-condensation.js` | prior | 6 read-only | reducer authority investigation | YES | no change |
| `src/core/linear-fea-rigid-element/rigid-element.js` | prior | 6 read-only | rigid authority investigation | YES | no change |
| `scripts/lfea-m047-bm4l-accdb-provenance.ps1` | prior | 6 read-only | canonical ACCDB field multiset hash rule | YES | no change |

Before closure, reconcile this ledger with GitHub's actual changed-file list. Any unexplained changed file blocks closure.

## Software Validation

| Validation | Status | Last HEAD / basis | Evidence |
|---|---|---|---|
| Exact-head artifact reconstruction | PASS | `7488ba76126f8240bb61c80fad243cf096c5fe08` | raw displacement reproduction ~1e-11 |
| Tee v3 helper syntax | PASS | local patch | node syntax check |
| Six-case candidate replay | PASS | exact-head artifact + local patch algebra | 31/37/40/43/22/37 |
| Reducer auxiliary hash proof | PASS | exact-head provenance | R1/R2/L1/L2 all 0.0 |
| GitHub Actions rerun | NOT_RUN | current | intentionally not rerun |

## Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Tee carrier coverage | PASS | E12 and E36.STRAIGHT |
| K unchanged by tee free growth | PASS | same stiffness state / transform construction |
| Thermal selectivity | PASS | only L3/L5/L14 move |
| `L14=L3` | PASS | exact |
| six-case superposition | PASS | numerical roundoff |
| equilibrium | PASS | ~4.1e-5 N / 7.5e-6 N.m |
| benchmark zero-reference oracle classification | PASS | Access OUTPUT_DISPLACEMENTS, precision-15 double fields |
| zero-reference failure class | PASS | 105/105 are rotations |
| exact alpha authority | FAIL/BLOCKED | no exact material-library strain in pinned bundle |
| reducer hidden end-length hypothesis | REJECTED | all R1/R2/L1/L2 = 0.0 |
| exact reducer sampling authority | FAIL/BLOCKED | public docs do not publish cylinder property station |

## Explicitly Not Validated

- Exact CAESAR material-library total T1 strain from 21 C to 120 C.
- Exact CAESAR reducer-cylinder representative section sampling.
- An authoritative correction for the remaining exact-zero rotation families.
- A structural interpretation for Type 2.6 report rows.
- Any additional mechanism that reduces the 210 result without new authority.

## Known / Deferred Work and Forward Sequence

### Open defects / questions

- QST-001 exact T1 strain — BLOCKED externally.
- QST-002 reducer sampling — BLOCKED externally, but high-leverage for L4.
- QST-003 zero-reference rotation ownership — INVESTIGATING; numerical/display explanations rejected.

### Recommended Forward Sequence

1. Obtain exact CAESAR Print Alphas/material-library strain. It can resolve the remaining nonzero thermal-scale error without fitting, but cannot by itself remove the 105 exact-zero floor.
2. Replay tee free growth with that exact strain; keep it isolated from every other mechanics change.
3. Continue QST-003 by comparing CAESAR documented load/free-state treatment for ordinary pipe, rigid, bend and reducer elements in the cancellation bands.
4. Seek direct CAESAR reducer sampling authority; only then test a different ten-cylinder property station.
5. Do not use the 60%-length Alpha fallback as structural taper authority.
6. Keep Type 2.6 structural mechanics deferred until independent topology evidence exists.
7. When Actions are explicitly authorized for production delivery, push the single-factor tee patch and qualify it independently before any later alpha-authority commit.

## Process Notes / Lessons Learned

- A source element that is also a bend may have a separate incoming-straight analysis carrier; source-ID-only modifier replay is incomplete.
- Exact-head artifacts can provide high-fidelity read-only solver evidence without rerunning CI.
- Benchmark-optimal values inside a rounded authority interval are diagnostics, not authority.
- Access result-table precision must be distinguished from formatted XML/report display precision before classifying a zero reference.
- Persistent zero-reference rotations that are orders of magnitude above solver replay error are not fixed legitimately by tightening numerical tolerances.
- Reducer pressure free elongation at the condensed boundary is equivalent to segment-wise axial free strain for the collinear ten-cylinder chain; that path does not explain the L4 residual by itself.
- A field-multiset hash can recover a uniform source value exactly when the hashing/canonicalization rule is itself pinned; here it proves all four reducer R1/R2/L1/L2 fields are zero without inventing row values.
- CAESAR's 60%-length reducer Alpha fallback is a slope/SIF rule and must not be silently reused as a structural stiffness rule.

## Next-Agent Handover

- Current stopping point: Stage 6 authority-first continuation, after zero-reference and reducer-source narrowing.
- PR / branch / HEAD before this report commit: PR 1001 / `agent/m047-bm4l-clean-qualified` / `d58c665b374bf0813067e7657e52e045baab6859`.
- Governed implementation head for numerical replay: `7488ba76126f8240bb61c80fad243cf096c5fe08`.
- Last completed stage: Stage 5 accuracy gate.
- Current active stage: Stage 6, PARTIAL.
- Start here: QST-003 signed load/free-state reconciliation; keep QST-001/QST-002 authority searches open.
- Do not redo: bend-shear/MEC-21 rejected paths, gravity scaling, fitted axial shape, source-ID-only tee replay, reducer pressure sign/orientation checks, XML-rounding hypothesis, hidden reducer L2 hypothesis.
- Do not assume: alpha `1.17e-5/K` is exact; midpoint reducer sampling matches CAESAR; 60% Alpha length is structural taper length; Type 2.6 rows are structural branches.
- Files currently involved: `src/core/fea-benchmarks/caesar-accdb-linear-solve.js`, `benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json`, reducer/rigid authorities, provenance script, this work report.
- Known failing checks: candidate remains at 210 literal comparison failures under current provisional alpha; 105 are exact-zero rotations.
- Validation still required: branch-level production validation when tee patch is committed; exact-alpha replay if authority is obtained; next-mechanism validation only after independent authority.
- Open QST-* items: QST-001, QST-002, QST-003.
- Important deferred items: Type 2.6 topology; any sampling refinement without authority.
- Highest-risk remaining item: benchmark fitting disguised as material/reducer/recovery authority.
- Exact next recommended action: trace documented CAESAR free-state/load representation across ordinary pipe, rigid, bend and reducer elements in the zero-rotation cancellation bands; implement only a source-backed discrepancy.
- Required reading: this report; pinned Common `CodingRules.md`; Common `Miscdata_BM4_L.txt`; Common `Loadcasereport_BM4_L.txt`; governed validation profile; tee/reducer/rigid production source; `scripts/lfea-m047-bm4l-accdb-provenance.ps1`.
