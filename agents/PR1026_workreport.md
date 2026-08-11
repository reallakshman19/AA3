# PR #1026 Work Report — M047 Type 2.1 Tee Rigid Thermal Free Growth

## PR Mission Control

```text
Mission: Implement and statically qualify the CAESAR/B31J Type 2.1 fictitious rigid-offset thermal free-growth state without changing stiffness K.
Source task / issue: Owner continuation from PR #1001 handover; Issue #991 is reference-only and was not modified.
PR number: 1026
Branch: agent/m047-tee-rigid-thermal-growth
Base commit: 7488ba76126f8240bb61c80fad243cf096c5fe08
Current HEAD before this report sync: edb787e6160d80ce311418fd5e6bb2afaeb1ab40
Primary mechanics commit: 5ecd4a6b75fc9cf1a644ef0234e78282afa130ca
Authority-hardening commit: edb787e6160d80ce311418fd5e6bb2afaeb1ab40
PR status: open draft, stacked on agent/m047-bm4l-clean-qualified
Current stage: Stage 8 — Reconciliation + handover after no-workflow static qualification
Last completed stage: Stage 7 — Thermal-authority hardening and independent magnitude/sign audit
Engineering status: IMPLEMENTED + AUTHORITY_HARDENED
Validation status: PARTIAL — static source/authority/magnitude/sign/carrier audit PASS; governed six-case parity replay NOT_RUN on the current head
Current blockers: (1) no authorized executable checkout/ACE path in this session; (2) exact CAESAR material-library thermal expansion remains unresolved, so alpha stays provisional.
Exact next action: Continue no-workflow qualification from source/evidence, or execute the six governed BM4_L cases only when an independently authorized non-workflow executable environment becomes available. Do not promote the predecessor 435 -> 210 result as fresh PR runtime evidence.
```

## Handover in 60 Seconds

```text
What is now true: PR #1026 adds the missing Type 2.1 branch-surface fictitious-rigid thermal free translation g = epsilon_run * r_surface through f_initial, leaves structural K unchanged, follows the actual analysis carrier, and now binds thermal authority to the resolved run material only in cases that actually contain T1.
What was changed most recently: run thermal authority is no longer evaluated for W/P-only cases; for thermal cases the two run rows must agree on TEMP_EXP_C1 and MATERIAL_NUM, and that MATERIAL_NUM must match materialState.materialId before its temperature is used.
Independent static proof: with the unchanged provisional epsilon = 1.17e-5*(120-21) = 0.0011583 and the production run-surface rule r = Do/2, BM4_L gives |g| = 0.15810795 mm at tee 20160 and 0.09745646625 mm at tee 20295, matching the predeclared PR #1001 candidate without fitting.
What remains unfinished: no fresh current-head six-case L2/L3/L4/L5/L6/L14 solve, equilibrium replay, or superposition replay has been executed in this environment.
What must not be assumed: the predecessor 435 -> 210 counts are not current-head runtime evidence; CAESAR's printed 0.0012 mm/mm is not exact alpha; prior workflow/build success applied to the earlier source head and is historical only.
Highest-risk remaining item: runtime confirmation that the statically verified sign/carrier/authority path produces the predeclared thermal-selective response while preserving equilibrium and K identity.
Exact next action: stay off workflows per owner instruction; continue static/fixture-quality qualification and preserve all runtime claims as NOT_RUN until an authorized non-workflow execution path exists.
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

PR #1001 already models the branch at the CAESAR run surface through a rigid offset and applies directional B31J flexibility/Kb there. Its independent qualification identified one missing physical state: thermal expansion of the centerline-to-surface fictitious rigid. Omitting that movement over-restrains thermal response while weight/pressure-only mechanics should remain unaffected.

### Scope

- `src/core/fea-benchmarks/caesar-accdb-linear-solve.js`
- `agents/PR1026_workreport.md`

### Governing principles

- distinguish physical free state from structural stiffness;
- attach mechanics to the actual analysis carrier, not a source-ID assumption;
- bind thermal state to run authority for the fictitious centerline-to-run-surface rigid;
- fail closed when thermal authority is inconsistent;
- do not make nonthermal cases depend on unused thermal declarations;
- preserve the repository recovery convention `q = K u - f_fixed - f_initial`;
- separate static proof from fresh solver-runtime evidence.

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
- no workflow dispatch/rerun for this continuation;
- no Issue #991 edits.

### Governing authorities

- exact predecessor base: PR #1001 head `7488ba76126f8240bb61c80fad243cf096c5fe08`;
- coding protocol: `reallaksh19/Common` `CodingRules.md` at `43eccc27967ecec7d67513c08255398b496be5ce`;
- CAESAR reports: Common commit `179c4831cf521cf797c13699cfbbd118315c9244`;
- CAESAR II report version: `14.00.00.0910 (Build 231113)`;
- governed cases: L2=W, L3=T1, L4=P1, L5=W+T1+P1, L6=W+P1, L14=ALG(L5-L6);
- current benchmark profile: installation 21 C and provisional alpha `1.17e-5 /K`, explicitly unresolved pending direct CAESAR alpha authority.

---

## 2. Mission Status

| Work Item | Priority | Status | Evidence |
|---|---:|---|---|
| Mandatory living report before production edit | P0 | DONE | `PR_PENDING` report preceded production edits and was replaced by this PR-numbered report. |
| Fresh stacked draft PR | P0 | DONE | PR #1026, exact base SHA `7488ba...`. |
| Tee rigid thermal free-state implementation | P0 | DONE | Primary mechanics commit `5ecd4a6...`. |
| Actual-carrier integration | P0 | DONE | Modifier-driven frame build; bend source modifier remains on incoming straight only. |
| K-preserving free-state sign/order | P0 | PASS_STATIC | New mechanism reads condensed K only to form an initial-load vector; no K mutation. |
| Common run T1/material agreement | P0 | PASS_STATIC | Two run values must each collapse to one value in thermal cases. |
| Run material binding | P0 | PASS_STATIC | `MATERIAL_NUM` is converted to `ACCDB-MATERIAL-<n>` and must equal resolved `materialState.materialId`. |
| Nonthermal authority selectivity | P0 | PASS_STATIC | Run thermal authority is `null` unless `caseMode.thermal`; W/P-only cases do not validate unused T1 state. |
| Independent BM4_L free-growth magnitude | P0 | PASS_STATIC | 20160: 0.15810795 mm; 20295: 0.09745646625 mm using unchanged provisional strain. |
| Governed six-case BM4_L replay | P0 | NOT_RUN | Owner requested no workflow; no independent executable checkout/ACE path is available in this session. |
| Post-patch equilibrium/superposition replay | P0 | NOT_RUN | Requires a solver execution path. |
| Exact CAESAR thermal expansion authority | P1 | BLOCKED | Pinned Misc report exposes only rounded `0.0012 mm/mm`; no Print-Alphas artifact exists in the pinned BM4 directory. |

---

## 3. Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| ISS-001 | confirmed defect | P0 | IMPLEMENTED | Type 2.1 branch-surface fictitious rigid lacked thermal free translation. |
| RISK-001 | engineering risk | P0 | MITIGATED_STATIC | Source-ID lookup could miss bend source 36's real carrier; production follows the modifier into the actual carrier. |
| RISK-002 | engineering risk | P0 | MITIGATED_STATIC | Wrong free-state sign/transform order; derivation and source order agree on `-K_eff*g` before standard transforms. |
| RISK-003 | validation risk | P1 | OPEN | No independent executable checkout/ACE environment is available here; runtime replay remains NOT_RUN. |
| RISK-004 | applicability risk | P2 | RESOLVED | Thermal authority discovery is now gated by `caseMode.thermal`; W/P-only cases no longer depend on unused T1 declarations. |
| RISK-005 | authority-custody defect | P0 | RESOLVED | Common run `MATERIAL_NUM` was previously internally consistent but not bound to resolved material state; commit `edb787e...` adds explicit binding. |
| DEC-001 | engineering decision | P0 | ACCEPTED | New mechanism changes `f_initial` only; K remains unchanged. |
| DEC-002 | engineering decision | P0 | ACCEPTED | Fictitious rigid inherits common run thermal/material authority rather than branch-row authority. |
| DEC-003 | engineering decision | P0 | ACCEPTED | Thermal authority is required only when T1 participates in the physical case. |
| QST-001 | authority blocker | P1 | BLOCKED | Exact CAESAR A106 Grade B expansion from 21 C to 120 C remains unavailable beyond rounded report output. |

---

## 4. Root Cause, Sign, and Transform Derivation

Existing rigid-offset kinematics are homogeneous:

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

Under repository recovery:

```text
q = K u - f_fixed - f_initial
```

the additional initial-load contribution is:

```text
f_extra = -H^T K_physical g
```

The implemented source order is:

```text
g_global = epsilon_run * r_surface

g_local = T * g_global

f_extra_local = -K_effective_local * g_local

f_initial_local = f_initial_condensed + f_extra_local

f_initial_global = H^T * T^T * f_initial_local
```

The directional tee end-spring condensation happens before the free-state multiplication. Therefore `K_effective_local` is the same condensed tee stiffness used for the element contribution. The subsequent frame and rigid-offset transforms remain unchanged.

### Static sign/transform audit

Source inspection confirms:

- `frameOffsetMatrix` implements `u_end = u_joint + theta x r`;
- offset stiffness is transformed as `H^T K H`;
- offset load is transformed as `H^T q`;
- the tee free-load helper calculates `K_effective_local*g_local`, negates it, and adds it to the initial-load vector;
- the global/offset transforms are then applied through the existing path.

Result: **PASS_STATIC** for sign and transform ordering.

---

## 5. Implementation Details

### 5.1 Common run thermal authority

For an active thermal case, `buildTeeJunctions` resolves two run legs and one branch leg and creates `runThermalAuthority` only after requiring:

- exactly one `TEMP_EXP_C1` across the two run legs;
- exactly one `MATERIAL_NUM` across the two run legs;
- `ACCDB-MATERIAL-<MATERIAL_NUM>` equals `material.materialState.materialId`.

The authority records:

```text
temperatureC
materialNumber
materialId
materialStateId
```

For nonthermal cases, `runThermalAuthority` is `null` and no unused T1/material thermal-state validation is performed.

At free-state construction the authority must again match both resolved `materialId` and `materialStateId` before use.

### 5.2 Actual analysis carrier

No benchmark-specific source IDs appear in production mechanics. Existing ownership remains:

- ordinary source span -> its frame analysis element;
- bend source with tee at source I -> finite incoming straight carries the modifier;
- bend arcs explicitly receive `teeModifier: null`;
- `requireTeeModifierCoverage` requires exactly one tee-modified carrier and rejects bend-arc leakage.

The expected BM4_L carriers remain:

```text
ACCDB.E12
ACCDB.E36.STRAIGHT
```

These names are expected evidence, not implementation selectors.

### 5.3 Branch-surface geometry and independent magnitude proof

Production B31J directional branch geometry defines:

```text
branchSurfaceOffset = branchDirection * runOuterDiameter / 2
```

Pinned CAESAR Misc Type 2.1 rows give:

```text
Tee 20160: mean D = 254.737 mm, T = 18.263 mm -> Do = D + T = 273.000 mm
Tee 20295: mean D = 157.302 mm, T = 10.973 mm -> Do = D + T = 168.275 mm
```

So the production offset magnitudes are:

```text
r20160 = 136.500 mm
r20295 = 84.1375 mm
```

The unchanged provisional benchmark thermal state is:

```text
alpha = 1.17e-5 /K
DeltaT = 120 C - 21 C = 99 K
epsilon = alpha * DeltaT = 0.0011583
```

Therefore, independently of solver response:

```text
|g20160| = 0.0011583 * 136.500 mm = 0.15810795 mm
|g20295| = 0.0011583 * 84.1375 mm = 0.09745646625 mm
```

These values reproduce the PR #1001 predeclared candidate free-growth magnitudes without changing alpha or using benchmark residuals to select a parameter.

### 5.4 Free-state construction

`buildTeeRigidThermalInitialLoad` returns zero for:

- nonthermal physical cases;
- no tee modifier;
- no rigid offset.

For an active thermal branch rigid offset it:

1. validates I/J end ownership;
2. validates matching common-run `materialId` and `materialStateId`;
3. calculates `epsilon_run = alpha * DeltaT_run`;
4. calculates `g_global = epsilon_run * rigidOffset`;
5. places that translation only at the tee junction end in the 12-DOF physical-end vector;
6. transforms free displacement to frame-local coordinates;
7. calculates `f_extra_local = -K_effective_local * g_local`;
8. adds that term to the already-condensed initial-load vector.

### 5.5 Evidence fields

Mechanics evidence exposes:

- tee `runThermalAuthority` (null for nonthermal cases);
- per-analysis-element `teeRigidThermalStrain`;
- per-analysis-element `teeRigidThermalFreeTranslationM`.

This allows carrier ownership and thermal selectivity to be audited without inferring them from final stress comparisons.

---

## 6. Stage Execution Log

### Stage 1 — Report initialization

Created `agents/PR_PENDING_workreport.md` before production edits, then renamed/synchronized to this PR-numbered report after PR allocation.

**Result:** PASS.

### Stage 2 — PR allocation and base custody

Opened draft PR #1026 stacked on exact predecessor head `7488ba76126f8240bb61c80fad243cf096c5fe08`.

**Result:** PASS.

### Stage 3 — Pre-edit source verification

Verified carrier decomposition, rigid-offset kinematics, existing tee modifier ownership, and clean source blob custody before the primary implementation.

**Result:** PASS.

### Stage 4 — Primary mechanics implementation

**Commit:** `5ecd4a6b75fc9cf1a644ef0234e78282afa130ca`

Added the Type 2.1 rigid thermal free-state path, evidence, and run authority without changing K.

**Result:** IMPLEMENTED.

### Stage 5 — Initial static/repository validation

The primary mechanics diff was checked for scope containment, no benchmark-specific carrier IDs, no alpha/Kb/tolerance changes, and no workflow edits. Historical automatic repository gates on that earlier source head succeeded, but those results are not used as current-head runtime qualification.

**Result:** PASS for that source head; six-case parity NOT_RUN.

### Stage 6 — Initial reconciliation

Synchronized the report after the primary mechanics implementation.

**Result:** PASS.

### Stage 7 — No-workflow independent static qualification and authority hardening

Owner instruction: avoid workflow execution.

Actions:

1. inspected the production branch-surface rule (`runOuterDiameter/2`);
2. reconstructed the two BM4_L surface radii from pinned CAESAR Type 2.1 Misc data;
3. independently calculated the free-growth magnitudes using the unchanged provisional alpha;
4. rechecked the sign/order against the repository's `H`, `T`, and recovery conventions;
5. confirmed the bend source modifier remains on the incoming straight rather than arc elements;
6. identified that common run `MATERIAL_NUM` agreement was not explicitly tied to the resolved material state;
7. identified the broader-applicability issue that the authority check was running in W/P-only cases;
8. committed the narrow hardening fix.

**Authority-hardening commit:** `edb787e6160d80ce311418fd5e6bb2afaeb1ab40`

**Exact diff from prior report head `d4da214...` to hardening commit:**

```text
1 production file modified
15 additions
2 deletions
```

No other file changed in that commit.

**Result:** PASS_STATIC. RISK-004 and RISK-005 resolved.

### Stage 8 — Current reconciliation and handover

This report update records Stage 7 findings. It does not represent a solver replay and does not convert any NOT_RUN runtime item to PASS.

---

## 7. Changed-File Ledger

| File | Purpose | Engineering-sensitive? | Current validation |
|---|---|---|---|
| `agents/PR1026_workreport.md` | Living mission control, evidence, decisions and handover. | No | SYNCHRONIZED |
| `src/core/fea-benchmarks/caesar-accdb-linear-solve.js` | Type 2.1 thermal free state + run authority hardening. | Yes | STATIC SOURCE/AUTHORITY/MAGNITUDE/SIGN PASS; six-case runtime NOT_RUN |

No workflow file and no Issue #991 content was changed.

---

## 8. Validation and Evidence Ledger

### Software/static validation

| Validation | Status | Evidence |
|---|---|---|
| Exact base custody | PASS | PR #1026 base `7488ba76126f8240bb61c80fad243cf096c5fe08`. |
| Primary source diff containment | PASS | Initial mechanics source change was contained to the solver file. |
| Authority-hardening diff containment | PASS | `d4da214... -> edb787e...`: one file, +15/-2. |
| Current changed-file scope | PASS | Production solver + living report only. |
| No workflow modification | PASS | No `.github/workflows/*` changed by this PR continuation. |
| Current-head executable suite | NOT_RUN | No independent executable checkout/ACE path available; owner instructed to avoid workflows. |
| Governed six-case BM4_L replay | NOT_RUN | Same execution blocker. |
| Post-patch equilibrium audit | NOT_RUN | Requires current-head solver execution. |
| Post-patch superposition audit | NOT_RUN | Requires current-head solver execution. |

### Engineering validation

| Property | Status | Evidence |
|---|---|---|
| Mechanism independent physical/source rationale | PASS | PR #1001 handover + pinned CAESAR Type 2.1 surface-node data. |
| Surface offset rule | PASS_STATIC | Production rule is `branchDirection * runOd/2`. |
| BM4_L free-growth magnitudes | PASS_STATIC | 0.15810795 mm and 0.09745646625 mm at provisional epsilon 0.0011583. |
| Actual carrier ownership generic | PASS_STATIC | Modifier flows through actual frame carrier; bend arcs get null modifier. |
| K untouched | PASS_STATIC | New code reads `effectiveLocalStiffness` to form load only; no new stiffness assignment. |
| Free-state sign | PASS_DERIVATION | `q=K(Hu+g)-f` under repository convention requires `f_extra=-Kg`. |
| Transform order | PASS_STATIC | Condense -> local free-load -> T transform -> H/offset transform follows existing operators. |
| Common run temperature agreement | PASS_STATIC | Two run T1 values must collapse to one in thermal cases. |
| Common run material agreement | PASS_STATIC | Two run material numbers must collapse to one in thermal cases. |
| Resolved material binding | PASS_STATIC | `ACCDB-MATERIAL-<run material>` must equal `materialState.materialId`; helper later verifies materialId + materialStateId. |
| W/P authority selectivity | PASS_STATIC | Nonthermal tee discovery leaves `runThermalAuthority=null`; free-state helper exits before authority use. |
| Exact CAESAR thermal alpha | FAIL/BLOCKED | Only rounded `0.0012 mm/mm` is available from pinned CAESAR report artifacts. |

### Predecessor falsification target — not fresh PR runtime evidence

At the same unchanged provisional strain `0.0011583`, PR #1001's independent local candidate predicted:

| Case | Baseline | Candidate |
|---|---:|---:|
| L2 | 31 | 31 |
| L3 | 121 | 37 |
| L4 | 40 | 40 |
| L5 | 100 | 43 |
| L6 | 22 | 22 |
| L14 | 121 | 37 |
| **Total** | **435** | **210** |

This remains a falsification target only. It is not claimed as fresh PR #1026 execution evidence.

---

## 9. Explicitly Not Validated / Not Claimed

- No claim that the current PR head has reproduced 435 -> 210.
- No claim that current-head six-DOF equilibrium has been executed.
- No claim that current-head L3=L14, L6=L2+L4, or L5=L2+L3+L4 has been numerically replayed.
- No claim that exact CAESAR material-library thermal expansion is known.
- No promotion of `~1.22e-5/K`, rounded `0.0012`, or any benchmark-minimizing alpha.
- No claim that Type 2.6 rows provide structural tee flexibility.
- No workflow execution is part of this continuation.

---

## 10. Known / Deferred Work

### QST-001 — exact thermal expansion authority

Still blocked. The pinned BM4 Common directory contains the ACCDB archives, Misc report, load-case report, InputXML and Output XML, but no separate Print-Alphas/material-library report exposing full-precision T1 expansion.

Acceptable future authority remains, in descending preference:

1. CAESAR Print Alphas/material-library output for the exact job/version;
2. another direct CAESAR export exposing full-precision T1 total expansion;
3. primary material-library documentation demonstrably identical to CAESAR II 14's material implementation.

Do not use a benchmark sweep, generic handbook CTE, or rounded `0.0012` as exact authority.

### RISK-003 — runtime validation access

The connector can read/write repository state, but this session has no independent local checkout plus Microsoft ACE execution path. Per owner instruction, workflows are not used as a workaround. Runtime qualification therefore stays explicitly NOT_RUN.

### RISK-004 — resolved

Previously, unused T1/material declarations could block a W/P-only case because run authority was resolved during tee discovery unconditionally. `edb787e...` passes `caseMode` into tee discovery and resolves run thermal authority only when T1 is present.

### RISK-005 — resolved

Previously, the two run rows could agree on `MATERIAL_NUM` while the resolved material state used for alpha came from a different material identity. `edb787e...` now requires `ACCDB-MATERIAL-<MATERIAL_NUM> === materialState.materialId`, and the free-state helper verifies both material ID and state ID.

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
Current stopping point: Type 2.1 thermal free state is implemented; independent static magnitude/sign/transform/carrier audit passed; thermal run authority is now thermal-selective and explicitly bound to the resolved run material.
PR / branch: #1026 / agent/m047-tee-rigid-thermal-growth
Base: 7488ba76126f8240bb61c80fad243cf096c5fe08
Primary mechanics commit: 5ecd4a6b75fc9cf1a644ef0234e78282afa130ca
Authority-hardening commit: edb787e6160d80ce311418fd5e6bb2afaeb1ab40
Current active stage: Stage 8 reconciliation/handover.
Static BM4 target values: epsilon=0.0011583; tee 20160 |g|=0.15810795 mm; tee 20295 |g|=0.09745646625 mm.
Expected runtime falsification signature when a non-workflow execution path exists: L2 31, L3 37, L4 40, L5 43, L6 22, L14 37; total 210.
Must eventually verify at runtime: common/unchanged K, q=Ku-f_fixed-f_initial, carrier evidence E12 and E36.STRAIGHT, no bend-arc carrier, six-DOF equilibrium, L3=L14, L6=L2+L4, L5=L2+L3+L4.
Do not redo: bend/MEC-21, gravity scaling, reducer reversal/weight, bend subdivision, Kb fitting, fitted-alpha investigations.
Do not assume: predecessor 210 is current-head evidence; rounded 0.0012 is exact; source IDs equal analysis carriers; prior historical CI result validates the authority-hardening head.
Open QST-* items: QST-001 exact CAESAR thermal expansion.
Open risks: RISK-003 runtime execution access only. RISK-004 and RISK-005 are resolved.
Owner constraint: avoid workflow execution.
Exact next recommended action: continue source/fixture-quality static qualification or use an authorized non-workflow executable environment when available; do not weaken evidence standards to manufacture a runtime PASS.
Required reading: this report; agents/PR1001_workreport.md at 7488ba...; pinned Miscdata_BM4_L.txt and Loadcasereport_BM4_L.txt; Common CodingRules.md at 43eccc...
```

---

## 13. Process Notes / Lessons Learned

- Stacking directly on the exact predecessor head isolates the new physics from PR #1001's existing baseline.
- The correct free-state sign follows from the rigid-offset kinematic equation and repository recovery convention, not by analogy to ordinary pipe eigenstrain.
- Source 36 demonstrates why source IDs and analysis carriers must remain separate concepts.
- A run-state authority that merely agrees with itself is insufficient; it must be bound to the material state actually used by the solver.
- Unused thermal authority should not constrain W/P-only physical cases.
- The independent branch-surface magnitude reconstruction is valuable because it validates geometry and free-growth scaling without using benchmark residuals.
- Static/source proof and runtime benchmark proof remain separate evidence classes; neither should be mislabeled as the other.
