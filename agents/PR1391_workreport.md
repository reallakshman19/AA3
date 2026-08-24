# PR1391 — LFEA S5 pressure/Bourdon authority prerequisite

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_DRAFT_EXTERNAL_EVIDENCE_BLOCKED
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: AUTO
AUTO_STATE: ACTIVE
SCOPE_AUTHORITY: S5_PREREQUISITE_ONLY_STACKED_ON_PR1348
MERGE_AUTHORITY: OWNER_ONLY

REPOSITORY: reallaksh19/Advanced_Analysis
PR: 1391
PR_URL: https://github.com/reallaksh19/Advanced_Analysis/pull/1391
STACK_BASE_PR: 1348
STACK_BASE_HEAD: 25543a9e6c0e796d63e89841f63e41a4fd3292cc
BRANCH: agent/lfea-piping-promotion-s5-bourdon-pressure-20260823
MAIN_LAST_CHECKED: e6908671f25df784312b9e3392bc6ab83863c9c8
ENGINEERING_CODE_HEAD: a062068797b1a33b2cbae9fdd390cb0e18ece0df
REPORT_BASIS_HEAD: a062068797b1a33b2cbae9fdd390cb0e18ece0df
CURRENT_STAGE: source-state custody + mechanism-isolated protocol + scoped parity intake + raw SHA256 custody + fail-closed package scaffolds + discriminating Q5 global arbitration
CURRENT_BLOCKER: controlled CAESAR Bourdon/pressure-stiffening observations absent; BM4_NL L19/L20 Elbow Stiffening Pressure unresolved; external execution tracked by Issue #1402
HIGHEST_RISK: guessing BM4_NL P1, collapsing DEFAULT, running non-discriminating Q5 with selector NONE, coupling mechanisms, or accepting derivative evidence without raw custody
EXACT_NEXT_ACTION: use Issue #1402; generate the intended S5 package, execute controlled CAESAR cases, retain raw files, complete evidence.json, run the file-level checker, and obtain independent review
```

## 60-second handover

S5 production mechanics remain **BLOCKED**.

```text
pressureStiffening = false
pressureAxialThrust = false
pressureBourdon = false
pressureCodeStress = true
```

The three authorities remain separate:

1. Bourdon pressure displacement;
2. bend pressure stiffening;
3. pressure/end thrust.

BM4_NL source custody establishes:

```text
BOURDON_PRESSURE = TRANSLATION_AND_ROTATION
winning level = INDIVIDUAL_FILE_SETTING
USE_PRESSURE_STIFFENING = DEFAULT
normalized = DEFAULT_CODE
active code = B31.3_2022
L19 Elbow Stiffening Pressure = UNRESOLVED
L20 Elbow Stiffening Pressure = UNRESOLVED
```

Provisional P1 is **not** BM4_NL authority.

The prerequisite contains five fail-closed layers: source-setting custody, mechanism-isolated Q1-Q6 protocol, machine-checkable parity contract, raw-file SHA-256 intake, and scope-aware package scaffolds emitted as `DRAFT_NOT_QUALIFIED`.

## Governing engineering decisions

### DEC-S5-001 — global and per-load-case stiffening settings are distinct
`Use Pressure Stiffening on Bends` is a global/code-arbitration setting. `Elbow Stiffening Pressure` supplies the pressure basis per load case. `DEFAULT_CODE` cannot be silently rewritten to INCLUDE/EXCLUDE and BM4_NL L19/L20 cannot be guessed as P1.

### DEC-S5-002 — Bourdon and pressure stiffening qualify independently
Allowed evidence scopes:

```text
BOURDON_ONLY
PRESSURE_STIFFENING_ONLY
BOURDON_AND_PRESSURE_STIFFENING
```

One mechanism's parity cannot stand in for another. `pressureAxialThrust` is outside all current S5 scopes.

### DEC-S5-003 — controlled groups differ only in the intended switch
Q1/Q2/Q4/Q5 preserve all non-switched material, section, pressure, bend geometry, restraint, mechanical load and relevant setting state.

### DEC-S5-004 — Q3 owns one physical bend initial basis
Required subdivision evidence is `[4,6,8]`, `samePhysicalInitialBasis=true`, with terminal free-state delta inside the predeclared tolerance. Reinitializing MEC-21 per chord is prohibited.

### DEC-S5-005 — Q4 qualifies the pressure selector
Q4 keeps Bourdon NONE and uses `None / P1 / P2 / Pmax` with deliberately distinct positive P1/P2. It must prove selector discrimination, retained curved geometry and exactly-once pressure-factor ownership.

### DEC-S5-006 — Q6 is a positive Bourdon / negative-thrust control
Q6 requires Bourdon `TRANSLATION_ONLY` while both generic pressure thrust and effective-area force are explicitly false.

### DEC-S5-007 — raw bytes are source custody
Every run carries safe relative paths to job/input/output files. Intake rejects traversal, symlinks, missing files and package escape, then recomputes SHA-256 before acceptance.

### DEC-S5-008 — parity evidence cannot authorize production
Even successful intake returns:

```text
status = QUALIFIED_PARITY_EVIDENCE_ONLY
rawArtifactHashesVerified = true
productionUseAuthorized = false
pressureBourdonAuthorized = false
pressureStiffeningAuthorized = false
pressureAxialThrustAuthorized = false
```

### DEC-S5-009 — generated scaffolds are intentionally non-evidence
`scripts/lfea-s5-pressure-parity-evidence-template.mjs` creates only the selected scope's run inventory and raw-artifact paths, leaves tolerance/results/hashes/review unresolved, emits `DRAFT_NOT_QUALIFIED`, and refuses overwrite. The workflow must fail if a generated draft ever passes real intake.

### DEC-S5-010 — Q5 must retain an active, fixed pressure selector
Source audit found the original Q5 scaffold/contract defaulted `Elbow Stiffening Pressure` to `NONE`. Hexagon defines `None` as no pressure stiffening for the elbow, so that state cannot discriminate the global `Default / Include / Exclude` switch.

Q5 is now qualified only when the triplet holds:

```text
activePipingCode = B31.3_2022
activateBourdonEffects = NONE
elbowStiffeningPressureSelector = P1
pressureFields.P1 = same positive controlled value
material / section / bend geometry / restraints / mechanical loads = identical
```

Only `usePressureStiffeningOnBends` varies as `DEFAULT / INCLUDE / EXCLUDE`.

This P1 is a **controlled experiment setting only**. It does not resolve, infer or authorize BM4_NL L19/L20.

## Required real CAESAR evidence

### Bourdon scope

```text
Q1_STRAIGHT_BOURDON_NONE
Q1_STRAIGHT_BOURDON_TRANSLATION
Q1_STRAIGHT_BOURDON_TRANSLATION_ROTATION
Q2_BEND_BOURDON_NONE
Q2_BEND_BOURDON_TRANSLATION
Q2_BEND_BOURDON_TRANSLATION_ROTATION
Q6_PRESSURE_THRUST_NEGATIVE_CONTROL
```

Plus Q3 LFEA subdivision evidence from one physical bend basis.

### Pressure-stiffening scope

```text
Q4_SELECTOR_NONE
Q4_SELECTOR_P1
Q4_SELECTOR_P2
Q4_SELECTOR_PMAX
Q5_GLOBAL_DEFAULT_B313
Q5_GLOBAL_INCLUDE_B313
Q5_GLOBAL_EXCLUDE_B313
```

Q5 uses fixed controlled P1 across all three runs; selector `NONE` is rejected.

## Operator package

External execution tracker: Issue #1402.

```text
node scripts/lfea-s5-pressure-parity-evidence-template.mjs BOURDON_ONLY /path/to/new-bourdon-package
node scripts/lfea-s5-pressure-parity-evidence-template.mjs PRESSURE_STIFFENING_ONLY /path/to/new-stiffening-package
node scripts/lfea-s5-pressure-parity-evidence-template.mjs BOURDON_AND_PRESSURE_STIFFENING /path/to/new-combined-package
node scripts/lfea-s5-pressure-parity-evidence-file-check.mjs /path/to/package/evidence.json
```

The first command creates draft scaffolds only. Controlled observations/raw files and independent review remain mandatory.

## Existing MEC-21 boundary

`src/core/linear-fea-piping-components/bourdon-pressure-expansion.js` retains the intended ownership split: cumulative bend opening/rotation uses one physical bend initial basis while uniform closed-end axial pressure strain remains separate. The retained M047 review supports this architecture but is not an isolated Bourdon oracle.

## Validation ledger

| Check | Status | Evidence |
|---|---|---|
| Stack base #1348 | PASS — GROUNDED | `25543a9e...` |
| Current main | PASS — SOURCE_INSPECTION | `e6908671...`; observed drift EMP.1-only |
| BM4_NL Bourdon source state | PASS — SOURCE_INSPECTION | individual-file `TRANSLATION_AND_ROTATION` |
| Global stiffening source state | PASS — SOURCE_INSPECTION | raw DEFAULT → DEFAULT_CODE under B31.3-2022 |
| BM4_NL L19/L20 selector | UNRESOLVED — SOURCE AUTHORITY | provisional P1 rejected |
| Mechanism-scoped parity contract | PASS_AFTER_HARDENING — SOURCE_INSPECTION | independent scopes, controlled state, Q3, Q4, Q6 |
| Q5 discriminator | PASS_AFTER_FIX — SOURCE_INSPECTION | fixed positive P1 required across Default/Include/Exclude; NONE rejected |
| Raw artifact binding | PASS_AFTER_HARDENING — SOURCE_INSPECTION | SHA-256 recomputation + path/symlink checks |
| Fail-closed scaffold | PASS_AFTER_FIX — SOURCE_INSPECTION | Q5 scaffold fixed to P1; package still `DRAFT_NOT_QUALIFIED` |
| Exact S5 engineering-head workflow | NOT_RUN — CI_PRE_STEP_INFRASTRUCTURE_FAILURE | head `a0620687...`; run `32709000763`; job `97376193863`; `steps=null` |
| Controlled Bourdon parity | UNRESOLVED | Issue #1402 raw CAESAR observations absent |
| Controlled pressure-stiffening parity | UNRESOLVED | Issue #1402 raw observations absent |
| Production numerical promotion | BLOCKED | all three S5 mechanics flags false |

No checkout or assertion executed in run `32709000763`; GitHub's `failure` is neither engineering FAIL nor PASS.

No expected value was re-baselined, no tolerance fitted/widened, no guard disabled, and no production pressure capability enabled.

## Changed-file ledger — 11 files

| File | Purpose |
|---|---|
| `.github/workflows/lfea-s5-pressure-authority-gate.yml` | S5 source/parity/file-intake/scaffold workflow |
| `agents/PR1391_workreport.md` | sole living recovery authority |
| `docs/lfea/S5_Pressure_Effect_Source_Authority_20260824.md` | CAESAR source-setting custody |
| `docs/lfea/S5_Pressure_Effect_Parity_Protocol_20260824.md` | Q1-Q6 controlled protocol; fixed-P1 Q5 rule |
| `docs/lfea/S5_Pressure_Parity_Evidence_Package_20260824.md` | operator package/raw custody/Q5 rule |
| `scripts/lfea-s5-pressure-authority-gate-check.mjs` | BM4_NL source-setting falsifier gate |
| `src/core/linear-piping-analysis-consumer/production-pressure-effect-authority.js` | source-state authority v2 |
| `scripts/lfea-s5-pressure-parity-evidence-contract.mjs` | mechanism-scoped evidence validator; Q5 P1 required |
| `scripts/lfea-s5-pressure-parity-evidence-contract-check.mjs` | contract fixture/falsifiers including Q5 NONE rejection |
| `scripts/lfea-s5-pressure-parity-evidence-file-check.mjs` | real evidence + raw-byte verifier |
| `scripts/lfea-s5-pressure-parity-evidence-template.mjs` | scope-aware fail-closed scaffold; Q5 fixed P1 |

## Engineering item register

| ID | Type | Severity | Status | Summary |
|---|---|---:|---|---|
| ISS-001 | ISS | high | OPEN_BLOCKS_STIFFENING | BM4_NL L19/L20 selector unresolved. |
| ISS-002 | ISS | high | OPEN_BLOCKS_BOURDON | Controlled CAESAR Bourdon parity absent. |
| ISS-003 | ISS | high | OPEN_BLOCKS_STIFFENING | Controlled selector/global arbitration parity absent. |
| IMP-001 | IMP | high | IMPLEMENTED | CAESAR source-setting custody corrected. |
| IMP-002 | IMP | high | IMPLEMENTED | Mechanism-isolated protocol + scoped evidence intake. |
| IMP-003 | IMP | high | IMPLEMENTED | Raw CAESAR bytes path-bound and SHA-256 verified. |
| IMP-004 | IMP | medium | IMPLEMENTED | Fail-closed scope-aware package scaffolds. |
| IMP-005 | IMP | high | IMPLEMENTED_SOURCE_INSPECTED | Q5 fixed-P1 discriminator; NONE is fail-closed. |
| RISK-001 | RISK | high | MITIGATED_BY_GATE | DEFAULT cannot silently become INCLUDE/EXCLUDE. |
| RISK-002 | RISK | high | MITIGATED_BY_GATE | Controlled Q5 P1 cannot become BM4_NL source authority. |
| RISK-003 | RISK | high | MITIGATED_BY_CONTRACT | Bourdon cannot authorize pressure thrust. |
| RISK-004 | RISK | high | MITIGATED_BY_CONTRACT | Pressure factor cannot be applied twice or erase curved geometry. |
| RISK-005 | RISK | high | MITIGATED_BY_FILE_INTAKE | Invented hashes cannot replace retained raw bytes. |
| RISK-006 | RISK | high | MITIGATED_BY_Q5_FIX | Non-discriminating Q5 selector NONE cannot produce accepted parity evidence. |

## Appendix A — expert takeover questionnaire

1. Why are global bend-pressure configuration and per-load-case Elbow Stiffening Pressure separate authorities?
2. Which BM4_NL source layer establishes Bourdon mode, and what selector remains unresolved?
3. Why is controlled Q5 P1 legitimate for the experiment but not authority for BM4_NL L19/L20?
4. Why would Q5 with selector NONE be non-discriminating?
5. Which fields must remain invariant across Q5 Default/Include/Exclude?
6. What does Q3 prove and why does it not replace Q2 CAESAR parity?
7. How does Q4 prove selector behavior and exactly-once factor ownership?
8. How does Q6 separate Bourdon elongation from pressure thrust?
9. How are raw CAESAR files bound to derivative JSON evidence?
10. Why does accepted parity evidence still leave all three production pressure flags false?

Takeover threshold: answers must be source/contract grounded without guessing CAESAR behavior.

## Historical record

- S5 was split from one bundled pressure concept into three mechanism authorities.
- BM4_NL source custody established Bourdon and global DEFAULT_CODE while leaving L19/L20 selector unresolved.
- Q1-Q6 controlled protocols, raw-file intake and fail-closed scaffolds were added.
- 2026-08-24 source audit found Q5 selector NONE would defeat global-arbitration discrimination; contract, fixture, scaffold and docs were corrected to fixed controlled P1 at engineering head `a0620687...`.
- Issue #1402 owns external CAESAR execution; Issue #54 still blocks hosted runtime qualification.
- No S5 numerical production capability has been enabled.
