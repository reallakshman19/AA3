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
ENGINEERING_CODE_HEAD: b62bfce16bf32e23e26560c68959ee03924377da
CURRENT_STAGE: source-state custody + mechanism-isolated protocol + scoped parity intake + raw-artifact SHA256 verification + fail-closed package scaffolds
CURRENT_BLOCKER: controlled CAESAR Bourdon/pressure-stiffening observations absent; BM4_NL L19/L20 Elbow Stiffening Pressure remains unresolved; external execution tracked by Issue #1402
HIGHEST_RISK: guessing P1, collapsing DEFAULT, accepting self-declared hashes, coupling mechanisms, or relabeling Bourdon strain as thrust
EXACT_NEXT_ACTION: generate a package for the intended S5 scope, execute the controlled protocol, retain raw CAESAR files, complete evidence.json and run the file-level checker
```

## 60-second handover

S5 production mechanics remain **BLOCKED**.

Current production truth:

```text
pressureStiffening = false
pressureAxialThrust = false
pressureBourdon = false
pressureCodeStress = true
```

Three mechanisms remain separate:

1. **Bourdon pressure displacement** — closed-end axial strain plus optional bend opening/rotation;
2. **bend pressure stiffening** — pressure-dependent B31/B31J factor behavior;
3. **pressure/end thrust** — separate effective-area/force mechanics and outside the current S5 promotion.

BM4_NL source custody establishes an individual-file Bourdon mode of `TRANSLATION_AND_ROTATION` and a global `USE_PRESSURE_STIFFENING=DEFAULT` normalized as `DEFAULT_CODE` under B31.3-2022. The per-load-case `Elbow Stiffening Pressure` selector remains unresolved for L19/L20. Provisional P1 is not source authority.

The prerequisite now has five independent layers:

- CAESAR setting/source-state custody;
- mechanism-isolated controlled parity protocol;
- machine-checkable mechanism-scoped parity contract;
- file-level raw-artifact verifier that recomputes SHA-256 against retained CAESAR job/input/output bytes;
- scope-aware scaffold generation for Bourdon-only, stiffening-only, or combined evidence packages, deliberately emitted as `DRAFT_NOT_QUALIFIED`.

Even accepted evidence cannot flip a production capability.

## Governing engineering decisions

### DEC-S5-001 — global stiffening configuration and per-case pressure selector are distinct
`Use Pressure Stiffening on Bends` and `Elbow Stiffening Pressure` are separate CAESAR records. `DEFAULT_CODE` must not be silently rewritten to INCLUDE/EXCLUDE, and unresolved L19/L20 cannot be guessed as P1.

### DEC-S5-002 — Bourdon and pressure stiffening qualify independently
Allowed evidence scopes are:

```text
BOURDON_ONLY
PRESSURE_STIFFENING_ONLY
BOURDON_AND_PRESSURE_STIFFENING
```

One mechanism's parity cannot stand in for another.

### DEC-S5-003 — paired controlled cases must differ only in the intended switch
Q1/Q2/Q4/Q5 groups retain identical non-switched material, section, pressure fields, restraints, mechanical loads and relevant settings. Any control-state drift invalidates the comparison.

### DEC-S5-004 — Q3 owns one physical bend initial basis
Subdivision evidence must use `[4,6,8]` chords, `samePhysicalInitialBasis=true`, and terminal free-state normalized delta within the predeclared tolerance. Reinitializing MEC-21 per chord is prohibited.

### DEC-S5-005 — Q4 requires real selector discrimination and single ownership
P1/P2 must be distinct; selector errors must be within tolerance; P1/P2 response must differ; the pressure-corrected factor must be applied exactly once; curved S2 centerline remains.

### DEC-S5-006 — Q6 is a positive Bourdon / negative-thrust control
Q6 requires Bourdon `TRANSLATION_ONLY` while `genericPressureThrustApplied=false` and `effectiveAreaForceApplied=false`. Bourdon elongation cannot authorize `pressureAxialThrust`.

### DEC-S5-007 — claimed hashes are not evidence custody
Each run carries relative `rawArtifacts` paths. The file intake rejects absolute/traversal paths, missing files, symlinks and files resolving outside the evidence package and recomputes SHA-256 before accepting the package.

### DEC-S5-008 — accepted parity evidence still cannot authorize production
Accepted file intake returns:

```text
status = QUALIFIED_PARITY_EVIDENCE_ONLY
rawArtifactHashesVerified = true
productionUseAuthorized = false
pressureBourdonAuthorized = false
pressureStiffeningAuthorized = false
pressureAxialThrustAuthorized = false
```

Production integration remains a separate future stage.

### DEC-S5-009 — generated scaffolds are intentionally non-evidence
`scripts/lfea-s5-pressure-parity-evidence-template.mjs` creates only the run families required by the selected scope and pre-populates the expected switch states, but leaves tolerance, hashes, observations, factors/comparisons and independent review unresolved. It emits `DRAFT_NOT_QUALIFIED`, refuses to overwrite an existing package directory, and the workflow is designed to fail if any generated draft passes the real intake.

## Source-state authority established

### Existing-job Bourdon

```text
BOURDON_PRESSURE = TRANSLATION_AND_ROTATION
winning level = INDIVIDUAL_FILE_SETTING
source = USER_VERIFIED_BM4_NL_EXISTING_JOB_SETTINGS_2026-08-09
```

### Global pressure stiffening

```text
USE_PRESSURE_STIFFENING = DEFAULT
normalized = DEFAULT_CODE
active code = B31.3_2022
```

### Per-load-case elbow stiffening pressure

```text
L19 = UNRESOLVED
L20 = UNRESOLVED
```

This blocks BM4_NL pressure-stiffening production authority before numerical parity is considered.

## Required real CAESAR evidence

### Bourdon-only scope

```text
Q1_STRAIGHT_BOURDON_NONE
Q1_STRAIGHT_BOURDON_TRANSLATION
Q1_STRAIGHT_BOURDON_TRANSLATION_ROTATION
Q2_BEND_BOURDON_NONE
Q2_BEND_BOURDON_TRANSLATION
Q2_BEND_BOURDON_TRANSLATION_ROTATION
Q6_PRESSURE_THRUST_NEGATIVE_CONTROL
```

Plus Q3 LFEA subdivision evidence `[4,6,8]` from one physical initial bend basis.

### Pressure-stiffening-only scope

```text
Q4_SELECTOR_NONE
Q4_SELECTOR_P1
Q4_SELECTOR_P2
Q4_SELECTOR_PMAX
Q5_GLOBAL_DEFAULT_B313
Q5_GLOBAL_INCLUDE_B313
Q5_GLOBAL_EXCLUDE_B313
```

Q4 keeps Bourdon NONE. Q5 uses the controlled B31.3-2022 source and exact global mode correspondence.

Every CAESAR run retains:

- one common version/build within the evidence package;
- exact setting states;
- pressure fields/material/section/restraints/mechanical loads;
- required bend geometry, rotations and bend factors where applicable;
- reported displacement/reaction records;
- job/input/output SHA-256 values;
- `rawArtifacts.jobFile`, `rawArtifacts.inputSource`, `rawArtifacts.outputFile` relative paths;
- report/artifact locators;
- observer/date.

Independent review is mandatory and the reviewer may not be any recorded CAESAR observer.

## Operator package

External execution tracker: Issue #1402.

Documentation:

- `docs/lfea/S5_Pressure_Effect_Source_Authority_20260824.md`
- `docs/lfea/S5_Pressure_Effect_Parity_Protocol_20260824.md`
- `docs/lfea/S5_Pressure_Parity_Evidence_Package_20260824.md`

Create a scope-specific fail-closed scaffold:

```text
node scripts/lfea-s5-pressure-parity-evidence-template.mjs BOURDON_ONLY /path/to/new-bourdon-package
node scripts/lfea-s5-pressure-parity-evidence-template.mjs PRESSURE_STIFFENING_ONLY /path/to/new-stiffening-package
node scripts/lfea-s5-pressure-parity-evidence-template.mjs BOURDON_AND_PRESSURE_STIFFENING /path/to/new-combined-package
```

Validate only after controlled observations and independent review are complete:

```text
node scripts/lfea-s5-pressure-parity-evidence-file-check.mjs /path/to/package/evidence.json
```

Raw CAESAR files must remain beneath the evidence JSON package root. JSON results are derivative evidence; the referenced bytes, report locators and recomputed hashes are retained source custody.

## Existing MEC-21 boundary

`src/core/linear-fea-piping-components/bourdon-pressure-expansion.js` preserves the intended ownership split:

- cumulative bend opening/rotation uses one physical bend initial a-b-c basis;
- uniform closed-end axial pressure strain remains separate;
- the bend-opening field does not silently add the same uniform translation twice.

The retained M047 review supports this architecture but is not an isolated production Bourdon oracle because other unresolved sensitivities are simultaneous.

## Validation ledger

| Check | Status | Evidence |
|---|---|---|
| Stack base #1348 | PASS — GROUNDED | `25543a9e...` |
| Current repository grounding | PASS — SOURCE_INSPECTION | `main=e6908671...`; observed drift remains EMP.1-only |
| BM4_NL Bourdon source state | PASS — SOURCE_INSPECTION | individual-file `TRANSLATION_AND_ROTATION` |
| Global stiffening source state | PASS — SOURCE_INSPECTION | raw DEFAULT → DEFAULT_CODE under B31.3-2022 |
| L19/L20 selector | UNRESOLVED — SOURCE AUTHORITY | provisional P1 rejected as authority |
| v2 production source-state contract | PASS — SOURCE_INSPECTION | raw + normalized + authority layer retained |
| Mechanism-isolated protocol | PASS — SOURCE_INSPECTION | Q1-Q6 defined |
| Engineering parity intake | PASS_AFTER_HARDENING — SOURCE_INSPECTION | independent scopes, controlled pairs, one-basis Q3, selector discrimination, single factor ownership, thrust exclusion |
| Raw-artifact binding | PASS_AFTER_HARDENING — SOURCE_INSPECTION | relative paths + SHA-256 recomputation; symlink/path escape rejected |
| Fail-closed scaffold design | PASS — SOURCE_INSPECTION | scope-specific run inventory; unresolved values; `DRAFT_NOT_QUALIFIED`; no overwrite |
| Exact scaffold-head S5 workflow | NOT_RUN — CI_PRE_STEP_INFRASTRUCTURE_FAILURE | head `b62bfce1...`; run `32705925512`; job `97366915507`; `steps=null` |
| Controlled numerical Bourdon parity | UNRESOLVED | raw CAESAR runs absent; Issue #1402 |
| Controlled pressure-stiffening parity | UNRESOLVED | raw runs absent; L19/L20 selector unresolved; Issue #1402 |
| Production numerical promotion | BLOCKED | all three S5 mechanics flags false |

No checkout or assertion executed in run `32705925512`; its GitHub conclusion `failure` is not an engineering FAIL and not a PASS.

No expected value was re-baselined, no tolerance fitted/widened to CAESAR, and no guard was disabled.

## Changed-file ledger — 11 files

| File | Purpose |
|---|---|
| `.github/workflows/lfea-s5-pressure-authority-gate.yml` | S5 source/parity/file-intake/scaffold workflow |
| `agents/PR1391_workreport.md` | sole living recovery authority |
| `docs/lfea/S5_Pressure_Effect_Source_Authority_20260824.md` | CAESAR setting/source custody |
| `docs/lfea/S5_Pressure_Effect_Parity_Protocol_20260824.md` | mechanism-isolated controlled protocol |
| `docs/lfea/S5_Pressure_Parity_Evidence_Package_20260824.md` | operator package layout/raw custody/scaffold usage |
| `scripts/lfea-s5-pressure-authority-gate-check.mjs` | BM4_NL configuration/source falsifier gate |
| `src/core/linear-piping-analysis-consumer/production-pressure-effect-authority.js` | source-state authority v2 |
| `scripts/lfea-s5-pressure-parity-evidence-contract.mjs` | mechanism-scoped external parity validator |
| `scripts/lfea-s5-pressure-parity-evidence-contract-check.mjs` | contract falsifier fixture |
| `scripts/lfea-s5-pressure-parity-evidence-file-check.mjs` | real evidence JSON + raw-byte/hash verifier |
| `scripts/lfea-s5-pressure-parity-evidence-template.mjs` | scope-aware fail-closed package scaffold generator |

## Engineering item register

| ID | Type | Severity | Status | Summary |
|---|---|---:|---|---|
| ISS-001 | ISS | high | OPEN_BLOCKS_STIFFENING | BM4_NL L19/L20 elbow stiffening pressure selector unresolved. |
| ISS-002 | ISS | high | OPEN_BLOCKS_BOURDON | Controlled CAESAR Bourdon parity absent. |
| ISS-003 | ISS | high | OPEN_BLOCKS_STIFFENING | Controlled selector/global arbitration parity absent. |
| IMP-001 | IMP | high | IMPLEMENTED | CAESAR source-setting custody corrected. |
| IMP-002 | IMP | high | IMPLEMENTED | Mechanism-isolated protocol committed. |
| IMP-003 | IMP | high | IMPLEMENTED | Bourdon/stiffening parity scopes separated. |
| IMP-004 | IMP | high | IMPLEMENTED | Raw CAESAR files are path-bound and SHA-256 verified at intake. |
| IMP-005 | IMP | medium | DECLARED_CI_NOT_EXECUTED | Workflow covers source, contract, file intake and scaffold rejection; runner fails pre-step. |
| IMP-006 | IMP | medium | IMPLEMENTED_SOURCE_INSPECTED | Scope-aware scaffold eliminates manual run-inventory construction while remaining non-authoritative. |
| RISK-001 | RISK | high | MITIGATED_BY_GATE | DEFAULT cannot silently become INCLUDE/EXCLUDE. |
| RISK-002 | RISK | high | MITIGATED_BY_GATE | Provisional P1 cannot become source authority. |
| RISK-003 | RISK | high | MITIGATED_BY_CONTRACT | Bourdon cannot authorize pressure thrust. |
| RISK-004 | RISK | high | MITIGATED_BY_CONTRACT | Pressure factor cannot be applied twice or erase curved geometry. |
| RISK-005 | RISK | high | MITIGATED_BY_FILE_INTAKE | Invented hash strings cannot substitute for retained raw CAESAR bytes. |
| RISK-006 | RISK | medium | MITIGATED_BY_SCAFFOLD | Operator cannot accidentally omit required scope-specific run families when starting a package. |

## Appendix A — expert takeover questionnaire

1. Why is global `Use Pressure Stiffening on Bends=Default` different from `Elbow Stiffening Pressure`?
2. Which BM4_NL layer establishes the existing-job Bourdon mode?
3. Why can provisional P1 not authorize L19/L20 pressure stiffening?
4. Which non-switched states must remain identical in Q1, Q2, Q4 and Q5 controlled groups?
5. What exactly does Q3 prove, and why does it not replace Q2 CAESAR parity?
6. How does Q4 prove P1/P2/Pmax selector behavior and exactly-once factor ownership?
7. Why must curved S2 centerline geometry remain when pressure modifies `k`?
8. How does Q6 positively exercise Bourdon while excluding generic pressure thrust/effective-area force?
9. Why must every generated scaffold fail the real evidence intake before observations/review are supplied?
10. Why does accepted parity evidence still leave all three production pressure-mechanics flags false?

Takeover threshold: all ten answers must be source- and contract-grounded without guessing CAESAR behavior.

## Historical record

- S5 was corrected from a bundled pressure flag concept into three distinct mechanisms.
- BM4_NL source custody established Bourdon mode and global DEFAULT_CODE while keeping L19/L20 selector unresolved.
- A mechanism-isolated Q1-Q6 protocol and scoped evidence contract were added.
- Contract hardening enforced controlled non-switched state, one physical bend basis, selector discrimination, exactly-once factor ownership and pressure-thrust exclusion.
- 2026-08-24 continuation added byte-level raw-artifact binding, SHA-256 recomputation and operator package documentation.
- Issue #1402 now owns controlled external CAESAR execution.
- Scope-aware fail-closed scaffold generation now creates the exact S5 run inventory without manufacturing evidence.
- Hosted Actions continues to fail before step 1 under repository Issue #54.
- No S5 numerical production capability has been enabled.
