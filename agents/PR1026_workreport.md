# PR #1026 Work Report — M047 Type 2.1 Tee Rigid Thermal Free Growth

## PR Mission Control

```text
Mission: Implement the qualified CAESAR/B31J Type 2.1 fictitious rigid-offset thermal free-growth state without changing stiffness K.
Source task / issue: Owner continuation from PR #1001 handover; Issue #991 is reference-only and was not modified.
PR number: 1026
Branch: agent/m047-tee-rigid-thermal-growth
Base commit: 7488ba76126f8240bb61c80fad243cf096c5fe08
Implementation HEAD: 5ecd4a6b75fc9cf1a644ef0234e78282afa130ca
PR status: open draft, stacked on agent/m047-bm4l-clean-qualified
Current stage: Stage 6 — Reconciliation + handover
Last completed stage: Stage 5 — Focused static/repository validation
Engineering status: IMPLEMENTED
Validation status: PARTIAL — exact-head syntax/import/build PASS; governed six-case parity replay NOT_RUN on PR #1026
Current blocker: Exact CAESAR thermal expansion remains unresolved; current alpha stays provisional and is not changed by this PR.
Exact next action: Run the governed six-case BM4_L replay on the PR #1026 implementation head when an authorized executable environment is available, then compare the observed signature against the predeclared 435 -> 210 expectation before promoting repository-level parity claims.
```

## Handover in 60 Seconds

```text
What is now true: PR #1026 contains exactly one production mechanics change plus this report. The solver now gives the existing Type 2.1 branch-surface fictitious rigid a thermal free translation g = epsilon_run * r_surface through f_initial while leaving K untouched.
What was changed: Common run temperature/material-number authority is carried into the tee modifier; the actual analysis carrier converts the free translation through the existing frame transform and adds -K_eff*g to the condensed initial-load vector; evidence fields expose authority, strain and free translation.
What remains unfinished: The current PR head has not been run through the governed six-case BM4_L parity replay or post-patch equilibrium/superposition fixture in this execution environment.
What must not be assumed: The predecessor's local 435 -> 210 replay is not fresh PR #1026 runtime evidence. CAESAR's printed 0.0012 mm/mm is not exact thermal authority.
Highest-risk remaining item: Runtime confirmation that the implemented sign/carrier path reproduces the predeclared thermal-selective signature, especially source 36 -> ACCDB.E36.STRAIGHT.
Exact next action: Execute L2/L3/L4/L5/L6/L14 on this implementation and verify K identity, carrier evidence, equilibrium and superposition before calling the mechanics repository-qualified.
```

---

## 1. Mission and Engineering Intent

### Mission

Implement the missing free state for the already-qualified CAESAR/B31J Type 2.1 branch-surface fictitious rigid:

```text
g_thermal = epsilon_run * r_surface
q = K u - f_fixed - f_initial
```

The mechanism is a free-state correction only. Structural stiffness K must not change.

### Engineering consequence

PR #1001 already models the branch at the CAESAR run surface through a rigid offset and applies directional B31J flexibility/Kb there. Its local independent qualification identified one missing physical state: thermal expansion of the centerline-to-surface fictitious rigid. Omitting that free movement over-restrains thermal response while leaving weight/pressure-only mechanics unaffected.

### Scope

- `src/core/fea-benchmarks/caesar-accdb-linear-solve.js`
- `agents/PR1026_workreport.md`

### Explicit non-goals

- no thermal-alpha change or fitting;
- no Kb/flexibility-factor tuning;
- no Type 2.6 structural topology invention;
- no finite-rigid stiffness change;
- no Bourdon/pressure change;
- no bend mechanics change;
- no gravity/density/reducer change;
- no tolerance/reference/sign/row-set mutation;
- no `.github/workflows/*` edits;
- no Issue #991 edits.

### Governing authorities

- exact predecessor base: PR #1001 head `7488ba76126f8240bb61c80fad243cf096c5fe08`;
- coding protocol: `reallaksh19/Common` `CodingRules.md` at `43eccc27967ecec7d67513c08255398b496be5ce`;
- CAESAR reports: Common commit `179c4831cf521cf797c13699cfbbd118315c9244`;
- CAESAR II report version: `14.00.00.0910 (Build 231113)`;
- governed cases: L2=W, L3=T1, L4=P1, L5=W+T1+P1, L6=W+P1, L14=ALG(L5-L6).

---

## 2. Mission Status

| Work Item | Priority | Status | Evidence |
|---|---:|---|---|
| Mandatory living report before production edit | P0 | DONE | `PR_PENDING` report was committed before source change, then replaced by this permanent report after PR allocation. |
| Fresh stacked draft PR | P0 | DONE | PR #1026, base SHA exactly `7488ba...`. |
| Clean pre-edit branch state | P0 | DONE | Before source edit, changed-file list contained only the living report. |
| Tee rigid thermal free-state production implementation | P0 | DONE | Implementation commit `5ecd4a6b75fc9cf1a644ef0234e78282afa130ca`. |
| Common run thermal/material authority | P0 | DONE | `commonTeeRunThermalAuthority`; mismatch fails closed. |
| Actual-carrier integration | P0 | DONE | Modifier-driven `buildFrameElement`; no E12/E36 benchmark-specific branch. |
| K-preserving free-state sign/order | P0 | DONE_STATIC | Diff changes initial-load path only; no stiffness mutation introduced. |
| Exact-head syntax/import/build | P0 | PASS | Automatic `main-gate` run 31463231569 succeeded at implementation HEAD. |
| Governed six-case BM4_L replay | P0 | NOT_RUN | No executable local checkout/runtime available through this session. |
| Post-patch equilibrium/superposition replay | P0 | NOT_RUN | Same blocker. |
| Exact CAESAR thermal expansion authority | P1 | BLOCKED | Misc report prints only rounded `0.0012 mm/mm`. |

---

## 3. Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| ISS-001 | confirmed defect | P0 | IMPLEMENTED | Type 2.1 branch-surface fictitious rigid lacked thermal free translation. |
| RISK-001 | engineering risk | P0 | MITIGATED_STATIC | Source-ID lookup could miss bend source 36's real carrier; implementation follows the modifier into the actual analysis carrier. |
| RISK-002 | engineering risk | P0 | MITIGATED_STATIC | Wrong free-state sign/transform order; implementation derives and applies `-K_eff*g` before normal local/global/offset load transformations. |
| DEC-001 | engineering decision | P0 | ACCEPTED | New mechanism changes `f_initial` only; K remains unchanged. |
| DEC-002 | engineering decision | P0 | ACCEPTED | Fictitious rigid inherits common run temperature/material-number authority rather than branch-row authority. |
| QST-001 | authority blocker | P1 | BLOCKED | Exact CAESAR A106 Grade B T1 expansion over 21 C -> 120 C is unavailable beyond rounded report output. |
| RISK-003 | validation risk | P1 | OPEN | Local `gh`/networked checkout is unavailable, so six-case runtime replay was not executed in this session. |
| RISK-004 | applicability risk | P2 | OPEN_NONBLOCKING | Common run T1/material agreement is resolved fail-closed during tee discovery even for nonthermal selected cases; BM4_L has common run data so this does not change the governed W/P cases, but broader-model applicability should be revisited if a future fixture intentionally carries differing unused run T1 declarations. |

---

## 4. Root Cause and Sign Derivation

The existing rigid-offset kinematics are homogeneous:

```text
u_physical = H u_joint
K_joint = H^T K_physical H
q_joint = H^T q_physical
```

For a fictitious-rigid free thermal translation `g` at the physical branch-surface end:

```text
u_physical = H u_joint + g
q_physical = K_physical (H u_joint + g) - f_existing
q_joint = H^T q_physical
        = H^T K_physical H u_joint
          - [H^T f_existing - H^T K_physical g]
```

Under the repository recovery convention:

```text
q = K u - f_fixed - f_initial
```

the additional initial-load contribution is therefore:

```text
f_extra = -H^T K_physical g
```

The implemented source-order equivalent is:

```text
g_global = epsilon_run * r_surface

g_local = T * g_global

f_extra_local = -K_effective_local * g_local

f_initial_local = f_initial_condensed + f_extra_local

f_initial_global = H^T * T^T * f_initial_local
```

The directional tee end-spring condensation occurs before the new free-state multiplication, so `K_effective_local` is the stiffness actually assembled for the tee-modified physical-end DOFs. The subsequent frame and rigid-offset transformations remain unchanged.

---

## 5. Implementation Details

### 5.1 Common run authority

`buildTeeJunctions` already resolves two run legs and one branch leg from topology. PR #1026 now derives a frozen `runThermalAuthority` from the two run rows and requires:

- exactly one `TEMP_EXP_C1` value across both run legs;
- exactly one `MATERIAL_NUM` across both run legs.

The authority records the common run temperature, material number and resolved cold material-state identity. It is copied into the modifier instead of deriving the fictitious-rigid temperature from the branch source row.

### 5.2 Actual analysis carrier

No benchmark-specific source IDs appear in the production mechanic. The existing carrier logic remains authoritative:

- ordinary branch source -> its frame analysis element;
- bend source with tee at source I -> finite incoming straight carries the modifier;
- bend arcs explicitly receive `teeModifier: null`;
- `requireTeeModifierCoverage` still requires exactly one carrier and rejects a bend-arc leak.

Therefore BM4_L should naturally resolve the already-qualified carriers:

```text
ACCDB.E12
ACCDB.E36.STRAIGHT
```

without hard-coded IDs.

### 5.3 Free-state construction

`buildTeeRigidThermalInitialLoad` returns zero for:

- nonthermal physical cases;
- no tee modifier;
- no rigid offset.

For an active thermal tee rigid offset it:

1. validates I/J end ownership;
2. validates matching common-run material-state authority;
3. calculates `epsilon_run = alpha * DeltaT_run`;
4. calculates `g_global = epsilon_run * rigidOffset`;
5. places that translation at only the tee junction end in a 12-DOF physical-end vector;
6. transforms that free vector to frame-local coordinates;
7. calculates `f_extra_local = -K_effective_local * g_local`;
8. adds the term to the already-condensed initial-load vector.

### 5.4 Evidence

The mechanics ledger now exposes:

- tee `runThermalAuthority`;
- per-analysis-element `teeRigidThermalStrain`;
- per-analysis-element `teeRigidThermalFreeTranslationM`.

This is intended to make carrier coverage and W/P-vs-T selectivity auditable without inferring it from final stresses.

---

## 6. Stage Execution Log

### Stage 1 — Report initialization

**Before:** fresh branch created directly from `7488ba...`; no production edits.

**Action:** created `agents/PR_PENDING_workreport.md` before any `src/**` change, recording mission, authority, defect, risks, decisions, scope and planned validation.

**Result:** PASS. Coding protocol initialization completed before implementation.

### Stage 2 — PR allocation and permanent report

**Action:** opened draft PR #1026 with base `agent/m047-bm4l-clean-qualified`, then created `agents/PR1026_workreport.md` and removed the temporary pending report.

**Result:** PASS. PR base SHA verified as exact predecessor head `7488ba...`.

### Stage 3 — Pre-edit repository verification

**Checks:**

- fresh PR changed-file list contained only the living report;
- target production blob before edit was `f6517ec9bdf719f62260d74597b418a25fff2fe3`;
- existing `appendBendElements` gives tee modifier only to the incoming straight for a bend source;
- existing `frameOffsetMatrix` semantics are `u_end = u_joint + theta x r`, `K_joint=H^T K H`, `q_joint=H^T q`.

**Result:** PASS.

### Stage 4 — Production implementation

**Commit:** `5ecd4a6b75fc9cf1a644ef0234e78282afa130ca`

**Changed production file:** `src/core/fea-benchmarks/caesar-accdb-linear-solve.js`

**Actual diff:** 79 additions, 3 deletions relative to exact PR base; no full-file churn or unrelated production deletion.

**Implementation:** ISS-001, DEC-001 and DEC-002 only.

**Deviation:** The common run authority check is conservatively performed during tee discovery for all selected cases rather than only after `caseMode.thermal` becomes relevant. This is recorded as RISK-004; it is nonblocking for BM4_L because the run declarations agree.

### Stage 5 — Focused static/repository validation

**Changed-file reconciliation:** PASS. Final PR production scope contains only:

```text
agents/PR1026_workreport.md
src/core/fea-benchmarks/caesar-accdb-linear-solve.js
```

**Diff review:** PASS.

- no `ACCDB.E12` or `ACCDB.E36.STRAIGHT` special-case code;
- no thermal coefficient/value change;
- no Kb/flexibility change;
- no stiffness assignment introduced by the new mechanic;
- no workflow edit;
- no Type 2.6 logic;
- no pressure/bend/gravity/reducer change.

**Automatic exact-head checks on implementation HEAD:**

- `main-gate` workflow run `31463231569`: SUCCESS;
- job `main-gate` id `93690807758`: SUCCESS;
- `Checkout exact head`: SUCCESS;
- `Syntax and import graph`: SUCCESS;
- `Governed pre-FEA solve authorization`: SUCCESS;
- `Production build`: SUCCESS;
- `non-fea-input-check-load-calc` run `31463231550`: SUCCESS;
- `3D Edit SJSON Interaction Authority` run `31463231546`: SUCCESS;
- `3D Edit Sjson Render Authority` run `31463231545`: still IN_PROGRESS when inspected.

No workflow was manually rerun.

**Governed BM4_L runtime parity:** NOT_RUN on PR #1026.

### Stage 6 — Reconciliation and handover

This report is the synchronization step after implementation and static/CI inspection. The implementation SHA above is the exact source head whose diff and successful `main-gate` were inspected. The report-sync commit follows that implementation commit and must not be confused with a new mechanics change.

---

## 7. Changed-File Ledger

| File | Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---|---|---|
| `agents/PR1026_workreport.md` | 1-6 | Living mission control, evidence and handover. | No | SYNCHRONIZED |
| `src/core/fea-benchmarks/caesar-accdb-linear-solve.js` | 4 | Type 2.1 fictitious-rigid thermal free-state integration and evidence. | Yes | STATIC/BUILD PASS; six-case runtime NOT_RUN |

Temporary `agents/PR_PENDING_workreport.md` was used before PR allocation and deleted after the permanent PR number was assigned; it is not present in the final PR diff.

---

## 8. Validation and Evidence Ledger

### Software validation

| Validation | Status | Evidence |
|---|---|---|
| Exact base custody | PASS | PR #1026 base SHA `7488ba76126f8240bb61c80fad243cf096c5fe08`. |
| Production target pre-write blob custody | PASS | `f6517ec9bdf719f62260d74597b418a25fff2fe3`. |
| Source diff containment | PASS | Solver diff 79 additions / 3 deletions. |
| Final changed-file containment | PASS | Only report + solver source. |
| Exact-head syntax/import graph | PASS | `main-gate` run 31463231569. |
| Exact-head production build | PASS | `main-gate` run 31463231569. |
| Local executable unit/static suite | NOT_RUN | Local checkout/network unavailable. |
| Governed six-case BM4_L replay | NOT_RUN | No current-head execution path in this session. |
| Post-patch equilibrium audit | NOT_RUN | Requires six-case execution. |
| Post-patch superposition audit | NOT_RUN | Requires six-case execution. |

### Engineering validation

| Property | Status | Evidence |
|---|---|---|
| Mechanism has independent physical/source rationale | PASS | PR #1001 handover + pinned CAESAR Type 2.1 surface-node evidence. |
| Actual carrier ownership is generic | PASS_STATIC | Existing modifier coverage plus no benchmark-ID branch in new diff. |
| K remains untouched by new code path | PASS_STATIC | New term only reads `effectiveLocalStiffness` to form a load; stiffness transformations/assignments are unchanged. |
| Extra initial-load sign | PASS_DERIVATION | `q=K(Hu+g)-f` gives `f_extra=-Kg` before existing T/H transforms. |
| Common run authority fails closed | PASS_STATIC | Two run temperatures/material numbers must each collapse to one value. |
| W/P mechanical free-state term is zero | PASS_STATIC | Helper returns zero when `caseMode.thermal` is false. |
| Exact CAESAR thermal alpha | FAIL/BLOCKED | Only rounded `0.0012 mm/mm` is available from pinned Misc report. |

### Predecessor evidence — not fresh PR runtime evidence

PR #1001's independent local qualification, at the unchanged provisional strain `0.0011583`, predicted this exact selective signature for the implemented mechanism:

| Case | PR #1001 baseline | Qualified local candidate |
|---|---:|---:|
| L2 | 31 | 31 |
| L3 | 121 | 37 |
| L4 | 40 | 40 |
| L5 | 100 | 43 |
| L6 | 22 | 22 |
| L14 | 121 | 37 |
| **Total** | **435** | **210** |

It also predicted approximately:

```text
tee 20160 |g| = 0.15810795 mm
tee 20295 |g| = 0.09745646 mm
```

and retained equilibrium around `4e-5 N` / `8e-6 N.m`, with L3=L14 and linear superposition roundoff clean.

Those numbers are the **predeclared falsification signature** for the current implementation; they must be reproduced by a fresh PR #1026 executable replay before repository-level qualification is claimed.

---

## 9. Explicitly Not Validated / Not Claimed

- No claim that PR #1026 itself has reproduced 435 -> 210 yet.
- No claim that the exact CAESAR material-library thermal expansion is known.
- No claim that `~1.22e-5/K` is promotable; benchmark-minimizing alpha remains forbidden.
- No claim that Type 2.6 intersection/SIF rows are structural tee modifiers.
- No claim that automatic CI exercises the governed six-case FEA parity objective; `main-gate` proves syntax/import/build and repository gates, not CAESAR parity.
- No manual GitHub Actions rerun was requested or performed.

---

## 10. Known / Deferred Work

### QST-001 — exact thermal expansion authority

Still blocked. Acceptable future authority remains, in descending preference:

1. CAESAR Print Alphas/material-library output for the exact job/version;
2. another direct CAESAR export exposing full-precision T1 total expansion;
3. primary material-library documentation demonstrably identical to CAESAR II 14's material implementation.

Do not use a benchmark sweep, generic handbook CTE, or rounded `0.0012` as exact authority.

### RISK-003 — runtime validation access

This session has GitHub connector write/read access but no functioning local GitHub checkout path (`gh` unavailable and direct container GitHub DNS unavailable). Therefore no local six-case benchmark was run.

### RISK-004 — conservative authority timing

The new run temperature/material agreement check executes while discovering qualified Type 2.1 tees, even for a selected W/P-only case. This is fail-closed and harmless for BM4_L because run declarations agree. If future general-purpose fixtures intentionally carry differing unused T1 declarations while solving nonthermal cases, decide from source authority whether the validation should be gated by thermal-case presence before broadening applicability.

---

## 11. Rejected / Forbidden Paths Retained from PR #1001

Do not reopen without new independent authority:

- generic bend softness;
- MEC-21 bend transverse shear in the tested form;
- derived Bend Axial Shape TRUE residual fit;
- flexible-centerline tee replacement;
- Kb fitting/scaling;
- Type 2.6 structural invention from stress/SIF rows;
- fitted thermal alpha;
- global gravity/density scaling;
- reducer endpoint line-weight substitution;
- reducer reversal/condensation asymmetry;
- bend midpoint/chord weight shortcuts;
- bend subdivision tuning;
- ordinary-pipe pressure strain applied to the fictitious rigid.

---

## 12. Next-Agent Handover

```text
Current stopping point: Production implementation is committed and exact-head main-gate syntax/import/build passed; governed six-case CAESAR parity replay remains NOT_RUN on PR #1026.
PR / branch: #1026 / agent/m047-tee-rigid-thermal-growth
Base: 7488ba76126f8240bb61c80fad243cf096c5fe08
Implementation HEAD under validated diff/build: 5ecd4a6b75fc9cf1a644ef0234e78282afa130ca
Last completed stage: Stage 5 focused static/repository validation.
Current active stage: Stage 6 handover pending fresh six-case runtime evidence.
Start here: Run scripts/tests that generate the governed L2/L3/L4/L5/L6/L14 BM4_L comparison for the current PR source.
Expected falsification signature at current provisional alpha: L2 31, L3 37, L4 40, L5 43, L6 22, L14 37; total 210.
Must also verify: K common/unchanged, q=Ku-f_fixed-f_initial, carrier evidence E12 and E36.STRAIGHT, no bend-arc carrier, six-DOF equilibrium, L3=L14, L6=L2+L4, L5=L2+L3+L4.
Do not redo: bend/MEC-21, gravity scaling, reducer reversal/weight, bend subdivision, Kb fitting, fitted-alpha investigations.
Do not assume: predecessor 210 is fresh PR evidence; rounded 0.0012 is exact; source IDs equal analysis carriers.
Open QST-* items: QST-001 exact CAESAR thermal expansion.
Open risks: RISK-003 executable validation access; RISK-004 conservative authority timing for broader nonthermal models.
Exact next recommended action: Execute and archive the six-case current-head evidence; if any case does not show the thermal-selective signature, investigate sign/carrier/authority wiring before reconsidering the physics.
Required reading: this report; agents/PR1001_workreport.md at 7488ba...; pinned Miscdata_BM4_L.txt and Loadcasereport_BM4_L.txt; Common CodingRules.md at 43eccc...
```

---

## 13. Process Notes / Lessons Learned

- Stacking the new PR directly on the exact predecessor head isolates the single mechanics change from PR #1001's already-qualified work.
- The correct free-state sign cannot be copied from ordinary pipe eigenstrain; it follows from where the free motion enters the rigid-offset kinematic equation.
- Analysis-carrier ownership is a structural concern: source 36 proves why source-ID naming cannot be the implementation key.
- A successful repository build is necessary but not sufficient evidence for FEA parity; benchmark/equilibrium claims remain explicitly NOT_RUN until the governed solver is executed on the new head.
