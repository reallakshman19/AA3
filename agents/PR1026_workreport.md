# PR #1026 Work Report — M047 Type 2.1 Tee Rigid Thermal Free Growth

## PR Mission Control

```text
Mission: Implement and qualify the CAESAR/B31J Type 2.1 centerline-to-run-surface fictitious-rigid thermal free state without changing structural K.
Source task / issue: Owner continuation from PR #1001; Issue #991 is reference-only and remains untouched.
PR number: 1026
Branch: agent/m047-tee-rigid-thermal-growth
Base commit: 7488ba76126f8240bb61c80fad243cf096c5fe08
Current HEAD before Stage 11 source edits: 72c89608bb11397367e413781f8cf01fa0cd3da1
Primary mechanics commit: 5ecd4a6b75fc9cf1a644ef0234e78282afa130ca
Authority-hardening commit: edb787e6160d80ce311418fd5e6bb2afaeb1ab40
PR status: open draft, stacked on agent/m047-bm4l-clean-qualified
Current stage: Stage 11 — focused regression authority-custody hardening
Last completed stage: Stage 10 — pinned authority fixture / focused-regression reconciliation
Engineering status: IMPLEMENTED; Stage 11 test-authority hardening IN_PROGRESS
Validation status: PARTIAL — static mechanics/source evidence PASS; focused Node check and full ACCDB parity remain NOT_RUN
Current blockers: no independent executable checkout/ACE path; exact CAESAR thermal expansion remains authority-blocked.
Exact next action: pin Common InputXML material identity into the focused authority fixture, remove the unexplained material-106 test constant, reconcile the diff, then keep execution evidence NOT_RUN unless actually executed outside workflows.
```

## Handover in 60 Seconds

```text
What is now true: Type 2.1 fictitious-rigid thermal free translation g=epsilon_run*r_surface is implemented through f_initial as -Keff*g; structural K is unchanged. Run thermal authority is thermal-only and bound to the resolved run material. Pinned Misc and Load Case authority plus a no-ACE regression are committed.
What is being worked on: Stage 11 closes a focused-test custody gap: the regression hard-codes MATERIAL_NUMBER=106 even though the pinned BM4 InputXML directly identifies MATERIAL_NUM=106 / A106 Grade B. This is a test-authority fix, not a production-mechanics change.
What remains unfinished: focused Node check NOT_RUN; six-case L2/L3/L4/L5/L6/L14 ACCDB replay NOT_RUN; equilibrium/superposition NOT_RUN; exact CAESAR alpha BLOCKED.
What must not be assumed: committed tests are not executed tests; predecessor 435->210 is not current-head runtime evidence; rounded 0.0012 mm/mm is not exact alpha; L14 remains CAESAR ALG L5-L6.
Highest-risk remaining item: executable confirmation of the focused check, then full ACE-backed parity.
Exact next action: complete Stage 11 fixture/script custody hardening without workflows or production solver changes.
```

---

## 1. Mission and Engineering Intent

### Mission
Add the missing Type 2.1 branch-surface fictitious-rigid thermal free state:

```text
g_thermal = epsilon_run * r_surface
q = K u - f_fixed - f_initial
f_extra = -K_eff * g
```

### Engineering consequence
The existing model already places the Type 2.1 branch at the CAESAR run surface and applies directional B31J flexibility there. Omitting the fictitious rigid's thermal free growth over-restrains T1 response while W/P-only response should remain unchanged.

### Current scope
- `src/core/fea-benchmarks/caesar-accdb-linear-solve.js`
- `benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-tee-rigid-thermal-authority.json`
- `scripts/lfea-m047-tee-rigid-thermal-check.mjs`
- `agents/PR1026_workreport.md`

### Governing authorities
- PR #1001 exact base/head: `7488ba76126f8240bb61c80fad243cf096c5fe08`
- Common CodingRules: `43eccc27967ecec7d67513c08255398b496be5ce`
- BM4 source commit: `179c4831cf521cf797c13699cfbbd118315c9244`
- Misc blob: `ef23d224925e4568185a360ecbe1ee62503f15ff`
- Load Case blob: `be62eeb08af26dddcd59146e21188c108c4600dd`
- InputXML blob: `3423d220374a17f67addd3c8c0c44300ffa46251`
- CAESAR II: `14.00.00.0910 (Build 231113)`
- Governed cases: L2=W, L3=T1, L4=P1, L5=W+T1+P1, L6=W+P1, L14=ALG(L5-L6)

### Non-goals / stop conditions
- no fitted or guessed alpha promotion;
- no Kb/flexibility tuning;
- no Type 2.6 structural topology invention;
- no finite-rigid/Bourdon/bend/gravity/reducer mechanics change;
- no benchmark tolerance/reference/sign mutation;
- no `.github/workflows/*` edits or workflow execution;
- no Issue #991 edits.

---

## 2. Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---:|---|
| Living report / exact stacked PR | P0 | DONE | 1-3 | PR #1026 on exact base `7488ba...`. |
| Tee rigid thermal free-state implementation | P0 | IMPLEMENTED | 4 | `5ecd4a6...`. |
| Run authority thermal selectivity + material binding | P0 | VALIDATED | 7 | `edb787e...`; static source audit. |
| K-preserving sign / transform order | P0 | VALIDATED | 7 | `-Keff*g` after tee condensation, before existing T/H transforms. |
| Pinned Misc / Load Case authority fixture | P0 | DONE | 9 | Exact Common commit and report blob SHAs. |
| Focused no-ACE regression | P0 | IMPLEMENTED | 9 | 256-line Node script; execution NOT_RUN. |
| InputXML material custody in focused regression | P0 | IN_PROGRESS | 11 | Replace hard-coded material 106 with pinned InputXML authority. |
| Governed six-case BM4_L replay | P0 | BLOCKED | future | Requires non-workflow ACCDB/ACE execution. |
| Exact CAESAR alpha | P1 | BLOCKED | future | No Print-Alphas/full-precision authority. |

---

## 3. Engineering Item Register

| ID | Type | Priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| ISS-001 | defect | P0 | IMPLEMENTED | Type 2.1 fictitious rigid lacked thermal free translation. | Yes |
| RISK-001 | risk | P0 | VALIDATED | Source IDs must not be assumed to equal analysis carriers. | Yes |
| RISK-002 | risk | P0 | VALIDATED | Free-state sign/order must follow `q=Ku-f_fixed-f_initial`. | Yes |
| RISK-003 | validation risk | P1 | BLOCKED | No independent checkout/ACE execution path in this session. | Yes |
| RISK-004 | applicability risk | P2 | DONE | W/P-only cases no longer validate unused T1 authority. | Yes |
| RISK-005 | authority defect | P0 | DONE | Run `MATERIAL_NUM` now binds to resolved material state. | Yes |
| IMP-001 | improvement | P0 | IMPLEMENTED | Focused no-ACE regression consumes pinned benchmark evidence. | Yes |
| ISS-002 | test-authority defect | P1 | IN_PROGRESS | Focused regression embeds material number 106 outside the pinned fixture; Common InputXML is the direct authority. | Yes |
| DEC-001 | decision | P0 | ACCEPTED | Thermal free state changes `f_initial`, not K. | Yes |
| DEC-002 | decision | P0 | ACCEPTED | Fictitious rigid inherits common run thermal/material state. | Yes |
| DEC-003 | decision | P0 | ACCEPTED | Thermal authority is required only when effective primitive content contains T1. | Yes |
| DEC-004 | decision | P0 | ACCEPTED | L14 remains recorded as CAESAR ALG `L5-L6`. | Yes |
| QST-001 | question | P1 | BLOCKED | Exact CAESAR A106 Grade B expansion 21C->120C unavailable beyond rounded output. | Yes |

### ISS-002 current evidence
Common InputXML at the pinned commit directly declares `MATERIAL_NUM="106.000000"` and `MATERIAL_NAME="A106 Grade B"`; the same identity is present in the Type 2.1 tee region. The focused test currently declares `const MATERIAL_NUMBER = 106` independently. That weakens source custody even though it does not change production mechanics.

---

## 4. Decisions and Invariants

| Invariant | Enforcement | Validation | This PR |
|---|---|---|---|
| Structural K unchanged by tee free state | Existing condensed K only multiplies free displacement to form initial load. | Static source/sign audit PASS. | Preserved |
| `f_extra=-Keff*g` under repository recovery convention | Tee free-load helper + existing transforms. | Derivation/source order PASS. | Required change |
| Fictitious rigid inherits run state | `runThermalAuthority` follows tee modifier. | Static audit PASS. | Required change |
| W/P-only cases ignore unused thermal state | `caseMode.thermal` gate. | Static audit PASS. | Hardening |
| Material identity must be authoritative | Solver binds run material number to resolved material ID; Stage 11 makes focused test source-custody-complete. | Stage 11 pending. | Hardening |
| No benchmark fitting | Alpha/Kb/tolerances unchanged; fitted-alpha constants prohibited. | Static diff PASS. | Preserved |
| L14 remains ALG evidence | Fixture records `L14=L5-L6`, method ALG. | Pinned Load Case report PASS. | Preserved |
| Type 2.6 not promoted structurally | Welding-tee structural path remains bounded. | Static audit PASS. | Preserved |

---

## 5. Stage Roadmap / Execution Log

- **Stages 1-3 — report, PR allocation, repository-state verification:** COMPLETE / PASS.
- **Stage 4 — primary mechanics (`5ecd4a6...`):** PARTIAL; implementation complete, full runtime NOT_RUN.
- **Stages 5-6 — static validation/reconciliation:** COMPLETE / PASS for static scope.
- **Stage 7 — thermal-authority hardening (`edb787e...`):** COMPLETE / PASS static; RISK-004/RISK-005 closed.
- **Stage 8 — reconciliation:** COMPLETE.
- **Stage 9 — pinned Misc/Load Case fixture + focused no-ACE check:** PARTIAL; implementation complete, execution NOT_RUN. First 303-line script was reduced to 256 lines to satisfy CodingRules normal `<300` guidance.
- **Stage 10 — reconciliation:** COMPLETE.

### Stage 11 — focused regression authority-custody hardening — IN PROGRESS

**Current truth:** production mechanics are unchanged; focused regression uses an unexplained local `MATERIAL_NUMBER=106` constant although pinned Common InputXML is the direct material identity authority.

**Objective:** make the regression's material-custody claim source-backed end-to-end.

**Expected scope/files:** authority JSON, focused Node script, living report. No solver change expected.

**Engineering rationale:** test authority must not be weaker than production authority. A fixture-backed value is auditable; an embedded constant can silently drift.

**Planned implementation:** pin InputXML path/blob plus material number/name in the authority fixture; derive test material ID from that fixture; assert source custody; preserve provisional-alpha status and all existing Type 2.1/ALG assertions.

**Expected behavior:** no production result changes; focused test semantics become stricter.

**Edge cases:** do not infer full-precision alpha from InputXML; inherited XML thermal fields are not promoted into new authority; do not treat material identity as thermal-expansion authority.

**Planned validation:** exact source cross-check PASS/FAIL; diff containment PASS/FAIL; script `<300` physical lines PASS/FAIL; focused execution remains NOT_RUN unless an actual non-workflow checkout becomes available.

**Known risks:** fixture/test could accidentally broaden into a benchmark parser; avoid that. Full ACCDB parity remains separate.

---

## 6. Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR1026_workreport.md` | 1 | 11 | Mission control / evidence / handover. | No | current |
| `src/core/fea-benchmarks/caesar-accdb-linear-solve.js` | 4 | 7 | Type 2.1 free state + run authority hardening. | Yes | static PASS; runtime NOT_RUN |
| `benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-tee-rigid-thermal-authority.json` | 9 | 11 | Pinned CAESAR benchmark authority. | Yes | Stage 11 IN_PROGRESS |
| `scripts/lfea-m047-tee-rigid-thermal-check.mjs` | 9 | 11 | Focused no-ACE regression. | Yes | Stage 11 IN_PROGRESS; execution NOT_RUN |

No workflow or Issue #991 file is in scope.

---

## 7. Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD / evidence |
|---|---|---|
| Exact base custody | PASS | base `7488ba76126f8240bb61c80fad243cf096c5fe08` |
| Current four-file reconciliation before Stage 11 | PASS | head `72c89608...` |
| Misc source custody | PASS | Common blob `ef23d224...` |
| Load Case source custody | PASS | Common blob `be62eeb0...` |
| InputXML source/material identity read | PASS | Common blob `3423d220...`; material 106 / A106 Grade B observed |
| Stage 11 diff containment | NOT_RUN | pending implementation |
| Focused no-ACE command | NOT_RUN | no independent checkout; workflows prohibited by owner |
| Six-case ACCDB replay | NOT_RUN | no ACE path |
| Equilibrium/superposition replay | NOT_RUN | no full solve path |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Type 2.1 surface geometry | PASS | pinned Misc 20160/20161 and 20295/20296 |
| Provisional free-growth magnitudes | PASS | 0.15810795 mm / 0.09745646625 mm at epsilon 0.0011583 |
| Generic carrier ownership | PASS | no E12/E36 production selector |
| K unchanged | PASS | static source audit |
| Sign / transform order | PASS | derivation + source order |
| Run material binding | PASS | production source; focused fixture hardening IN_PROGRESS |
| W/P thermal selectivity | PASS | source gate |
| B31J FLEXb/Kb executable reproduction | NOT_RUN | focused command committed, not executed |
| Exact CAESAR alpha | FAIL | authority unavailable; QST-001 BLOCKED |

### Explicitly Not Validated
Focused Node execution; current-head 435->210; six-DOF equilibrium; L3=L14/L6=L2+L4/L5=L2+L3+L4 numerical replay; exact CAESAR alpha.

---

## 8. Known / Deferred Work and Recommended Forward Sequence

**QST-001 — exact alpha — BLOCKED.** Accept only direct CAESAR Print Alphas/full-precision export or demonstrably identical primary material-library authority. Do not use rounded `0.0012`, handbook CTE, or residual fitting.

**RISK-003 — executable access — BLOCKED.** Do not use workflows as a workaround.

**Forward sequence:**
1. Complete ISS-002 focused-test source custody in Stage 11.
2. Execute `node scripts/lfea-m047-tee-rigid-thermal-check.mjs` in a real non-workflow checkout when available.
3. Obtain exact alpha authority.
4. Execute full L2/L3/L4/L5/L6/L14 ACCDB replay with equilibrium and superposition.
5. Only then cluster remaining parity failures; do not reopen rejected mechanics from total-count fitting.

Rejected paths retained from PR #1001: generic bend softness, MEC-21 tested form, flexible-centerline tee replacement, Kb fitting/scaling, Type 2.6 structural invention, fitted alpha, gravity/density scaling, reducer reversal/weight substitutions, bend subdivision tuning, fictitious-rigid pressure strain.

---

## 9. Next-Agent Handover

```text
Current stopping point: Stage 11 IN_PROGRESS; mechanics complete, focused-test material custody being hardened.
PR / branch / pre-stage HEAD: #1026 / agent/m047-tee-rigid-thermal-growth / 72c89608bb11397367e413781f8cf01fa0cd3da1.
Last completed stage: Stage 10 reconciliation.
Current active stage: Stage 11 authority-custody hardening.
Start here: authority fixture and lfea-m047-tee-rigid-thermal-check.mjs; replace local material 106 constant with pinned InputXML authority.
Do not redo: rejected PR #1001 mechanics or fitted-alpha work.
Do not assume: test executed; predecessor 210 current; rounded 0.0012 exact; L14 physical T1 case.
Files involved: report, solver, authority fixture, focused script; Stage 11 should not modify solver.
Known failing checks: none; relevant executable checks are NOT_RUN.
Validation still required: focused Node command, full six-case replay, equilibrium, superposition, exact alpha.
Open QST: QST-001 exact alpha.
Highest-risk remaining item: executable proof after source custody is clean.
Exact next recommended action: finish Stage 11, reconcile exact changed files/head, keep workflows untouched.
Required reading: this report; PR1001 report at 7488ba...; pinned Misc, Load Case, InputXML; Common CodingRules.
```

---

## 10. Process Notes / Lessons Learned

- Source ID and analysis carrier are distinct; source 36 is the key example.
- Free-state sign must come from kinematics and the repository recovery convention, not analogy to ordinary member eigenstrain.
- A test oracle must carry the same authority custody it claims to validate; embedded engineering constants should be replaced by pinned source evidence when that authority exists.
- Static proof, focused executable proof, and full ACCDB parity are separate evidence classes and must remain separately labelled.
