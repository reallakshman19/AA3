# PR1391 — LFEA S5 pressure/Bourdon authority prerequisite

# CURRENT RECOVERY STATE — READ FIRST

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
MAIN_LAST_CHECKED: e985b50d81d0d241db27313562c8cc12cd7cc27d
CODE_HEAD_PRE_REPORT: 6df85ec82e6a608a75159ea94d6049953a6a5cc2
CURRENT_STAGE: CAESAR source-state custody + mechanism-isolated parity protocol + machine-checkable external parity intake
CURRENT_BLOCKER: controlled CAESAR Bourdon/pressure-stiffening observations absent; BM4_NL L19/L20 elbow stiffening pressure selector remains unresolved
HIGHEST_RISK: collapsing DEFAULT to a boolean, guessing P1, coupling Bourdon and pressure-stiffening qualification, or relabeling Bourdon strain as pressure thrust
EXACT_NEXT_ACTION: execute docs/lfea/S5_Pressure_Effect_Parity_Protocol_20260824.md and create external evidence satisfying scripts/lfea-s5-pressure-parity-evidence-contract.mjs for the mechanism scope being promoted
```

## 60-second handover

S5 production mechanics remain **blocked**.

Production capability stays:

```text
pressureStiffening = false
pressureAxialThrust = false
pressureBourdon = false
pressureCodeStress = true
```

Three mechanisms remain distinct:

1. **Bourdon pressure displacement** — closed-end axial strain plus optional bend opening/rotation.
2. **Bend pressure stiffening** — pressure-dependent B31/B31J flexibility/SIF behavior.
3. **Pressure/end thrust** — separate force/effective-area mechanics, still outside this qualification.

The PR now has four deliberately separate layers:

- source-setting custody;
- mechanism-isolated CAESAR protocol;
- machine-checkable external parity intake;
- production flags still false and production solve/recovery still unmodified.

## Source authority established

### Bourdon existing-job mode

BM4_NL retains:

```text
BOURDON_PRESSURE = TRANSLATION_AND_ROTATION
winning authority = INDIVIDUAL_FILE_SETTING
source = USER_VERIFIED_BM4_NL_EXISTING_JOB_SETTINGS_2026-08-09
```

This is source custody, not numerical parity.

### Global bend pressure-stiffening configuration

BM4_NL retains:

```text
USE_PRESSURE_STIFFENING = DEFAULT
normalized = DEFAULT_CODE
active code = B31.3_2022
```

`DEFAULT_CODE` is a real state and is not silently rewritten as INCLUDE or EXCLUDE.

### Per-load-case Elbow Stiffening Pressure

This is a separate setting from the global configuration. BM4_NL L19/L20 remain:

```text
ELBOW_STIFFENING_PRESSURE = UNRESOLVED
```

The provisional benchmark `pressureSource=P1` is not source authority and is not promoted.

## Governing engineering decisions

### DEC-S5-001 — global pressure-stiffening configuration and per-case selector are independent records
No invented conflict is created between `Use Pressure Stiffening on Bends` and `Elbow Stiffening Pressure`. Both must be retained and resolved at their real CAESAR scopes.

### DEC-S5-002 — Bourdon and pressure stiffening may qualify independently
The new evidence contract supports:

```text
BOURDON_ONLY
PRESSURE_STIFFENING_ONLY
BOURDON_AND_PRESSURE_STIFFENING
```

Bourdon qualification does not wait for pressure-stiffening parity if Q1–Q3 and Q6 are independently complete. Pressure-stiffening qualification does not imply Bourdon parity.

### DEC-S5-003 — pressure axial thrust remains outside every S5 parity scope
Even a fully accepted parity record returns:

```text
pressureAxialThrustQualified = false
pressureAxialThrustAuthorized = false
```

Any future axial-thrust capability needs separate effective-area/reference/sign/source and numerical qualification.

### DEC-S5-004 — parity intake cannot authorize production
Accepted evidence returns `QUALIFIED_PARITY_EVIDENCE_ONLY`; all production authorization outputs remain false. A separate production-integration stage is required.

## Implemented source-state contract

`src/core/linear-piping-analysis-consumer/production-pressure-effect-authority.js` uses schema:

```text
lfea-production-pressure-effect-authority/v2
```

It separately retains:

- active piping code;
- Bourdon mode;
- global pressure-stiffening configuration `DEFAULT_CODE | INCLUDE | EXCLUDE`;
- per-load-case elbow pressure selector, including `UNRESOLVED`;
- resolution status;
- authority layer;
- raw CAESAR value;
- normalized engineering value;
- unresolved reason.

Raw `DEFAULT` → normalized `DEFAULT_CODE` is explicit translation, not source rewriting.

## Existing BM4_NL prerequisite gate

`scripts/lfea-s5-pressure-authority-gate-check.mjs` reuses the repository configuration precedence:

```text
OVERALL_GLOBAL_DEFAULT
  < INDIVIDUAL_FILE_SETTING
  < LOAD_CASE_SETTING
  < MODEL_INPUT
```

It guards:

- individual-file Bourdon precedence;
- retained `DEFAULT_CODE`;
- active B31.3-2022 code;
- unresolved L19/L20 selector;
- no P1 spoofing;
- independence of global config vs selector;
- all numerical S5 production flags false.

## Controlled parity protocol

`docs/lfea/S5_Pressure_Effect_Parity_Protocol_20260824.md` defines:

- Q1 straight-pipe Bourdon None / Translation only / Translation+Rotation;
- Q2 single-bend Bourdon mode separation;
- Q3 4/6/8-chord LFEA subdivision invariance from one physical initial bend basis;
- Q4 elbow stiffening selector None/P1/P2/Pmax with Bourdon disabled;
- Q5 global Default/Include/Exclude active-code arbitration;
- Q6 negative control proving Bourdon strain is not generic pressure thrust.

Raw CAESAR inputs/outputs and hashes are mandatory; tolerances and expected values cannot be fitted to CAESAR.

## Machine-checkable external parity intake

`scripts/lfea-s5-pressure-parity-evidence-contract.mjs` adds schema:

```text
lfea-s5-pressure-parity-evidence/v1
```

Every run must retain non-empty source/result records plus:

- one CAESAR version/build across the evidence package;
- 64-hex job/input/output hashes;
- active piping code;
- exact Bourdon mode;
- exact global pressure-stiffening mode;
- exact per-case elbow selector;
- pressure fields;
- material and section;
- restraints and mechanical-load declaration;
- reported displacements/reactions;
- bend geometry/rotations where applicable;
- bend factors where applicable;
- raw report and artifact locators;
- observer and date.

### Bourdon-only qualification requirements

Exactly one case each:

```text
Q1_STRAIGHT_BOURDON_NONE
Q1_STRAIGHT_BOURDON_TRANSLATION
Q1_STRAIGHT_BOURDON_TRANSLATION_ROTATION
Q2_BEND_BOURDON_NONE
Q2_BEND_BOURDON_TRANSLATION
Q2_BEND_BOURDON_TRANSLATION_ROTATION
Q6_PRESSURE_THRUST_NEGATIVE_CONTROL
```

The contract additionally requires all Q1/Q2 LFEA comparison errors within the **predeclared** observation tolerance, `pressureThrustForceAdded=false`, and Q3:

```text
chordCounts = [4,6,8]
samePhysicalInitialBasis = true
terminalFreeStateNormalizedDelta <= observationTolerance
```

### Pressure-stiffening-only qualification requirements

Exactly one case each:

```text
Q4_SELECTOR_NONE
Q4_SELECTOR_P1
Q4_SELECTOR_P2
Q4_SELECTOR_PMAX
Q5_GLOBAL_DEFAULT_B313
Q5_GLOBAL_INCLUDE_B313
Q5_GLOBAL_EXCLUDE_B313
```

Q4 enforces:

- Bourdon mode NONE;
- selector value matches the case family;
- P1/P2/Pmax comparison errors within tolerance;
- P1 and P2 response discrimination observed;
- factor applied exactly once;
- curved S2 centerline retained.

Q5 enforces B31.3-2022 for the controlled current source and exact `DEFAULT / INCLUDE / EXCLUDE` mode correspondence, with default matching active-code method and both overrides observed.

### Independent review and anti-gaming

Every accepted package requires an APPROVED independent reviewer who is not any recorded CAESAR observer.

The contract rejects:

```text
tolerancePolicy.fittedToCaesar != false
expectedValuesRebaselined != false
tolerancesWidenedToFitCaesar != false
any production/capability request != false
```

## Contract falsifier check

`scripts/lfea-s5-pressure-parity-evidence-contract-check.mjs` is an in-memory contract fixture only. It is designed to prove:

- BOTH scope accepts complete Bourdon + stiffening structure but authorizes nothing;
- BOURDON_ONLY and PRESSURE_STIFFENING_ONLY validate independently;
- missing required families block;
- Q1/Q2 parity outside tolerance blocks;
- Q3 per-chord basis reset blocks;
- wrong Q4 selector blocks;
- missing P1/P2 discrimination blocks;
- duplicate factor ownership blocks;
- axial-thrust authorization request blocks;
- fitted tolerance blocks;
- non-independent reviewer blocks.

The fixture is not CAESAR evidence.

## Existing MEC-21 evidence — bounded interpretation

`src/core/linear-fea-piping-components/bourdon-pressure-expansion.js` already implements MEC-21 equation (2.25) with the intended ownership split:

- cumulative bend opening/rotation uses one physical bend initial a-b-c basis;
- uniform closed-end axial pressure strain remains separate;
- bend opening does not silently add the uniform translation again.

The retained M047 technical review supports that architecture but does not qualify full BM4_NL production response because multiple unrelated sensitivities were simultaneous. BM4_NL full-system response therefore remains ineligible as an isolated Bourdon oracle.

## Numerical authority boundary

This prerequisite does not:

- integrate MEC-21 into governed production InputXML/ACCDB solve/recovery;
- flip `pressureBourdon`;
- pressure-correct production B31/B31J bend factors;
- flip `pressureStiffening`;
- create generic pressure/end thrust;
- flip `pressureAxialThrust`;
- change S1-S3 bend geometry/flexibility;
- rebaseline benchmark values;
- widen engineering tolerances.

Any numerical result movement attributable to this prerequisite is a falsifier.

## Required real evidence before production promotion

### Bourdon

Requires source existing-job mode, Q1/Q2 controlled CAESAR parity, Q3 same-initial-basis subdivision invariance, Q6 thrust exclusion, retained raw hashes/artifacts, independent review, then a separate production solve/recovery integration with common currentness authority.

### Pressure stiffening

Requires explicit source selector, active-code method authority, Q4 pressure selection response, Q5 global arbitration, exactly-one pressure-corrected factor ownership on the S3 component, retained raw hashes/artifacts, independent review, then a separate production integration.

### Axial thrust

Still outside scope; requires a separate authority package.

## Repository grounding

```text
main = e985b50d81d0d241db27313562c8cc12cd7cc27d
stack base #1348 = 25543a9e6c0e796d63e89841f63e41a4fd3292cc
PR code head before this report = 6df85ec82e6a608a75159ea94d6049953a6a5cc2
PR state = open / draft / mergeable
```

No merge/rebase is performed without owner instruction.

## Engineering item register

| ID | Type | Severity | Status | Summary |
|---|---|---:|---|---|
| ISS-001 | ISS | high | OPEN_BLOCKS_STIFFENING | BM4_NL L19/L20 Elbow Stiffening Pressure source selector unresolved. |
| ISS-002 | ISS | high | OPEN_BLOCKS_BOURDON | Controlled CAESAR Bourdon parity absent. |
| ISS-003 | ISS | high | OPEN_BLOCKS_STIFFENING | Controlled selector/global-arbitration response parity absent. |
| IMP-001 | IMP | high | IMPLEMENTED | CAESAR pressure-setting custody corrected and raw/normalized states retained. |
| IMP-002 | IMP | high | IMPLEMENTED | Mechanism-isolated parity protocol committed. |
| IMP-003 | IMP | high | IMPLEMENTED | Mechanism-scoped external parity intake added. |
| IMP-004 | IMP | high | IMPLEMENTED | Bourdon and stiffening qualification scopes decoupled. |
| IMP-005 | IMP | high | IMPLEMENTED | Axial thrust explicitly excluded from every parity scope. |
| IMP-006 | IMP | medium | DECLARED_CI_NOT_EXECUTED | Workflow includes new contract check; hosted CI remains blocked by #54. |
| RISK-001 | RISK | high | MITIGATED_BY_GATE | DEFAULT cannot silently become INCLUDE/EXCLUDE. |
| RISK-002 | RISK | high | MITIGATED_BY_GATE | Provisional P1 cannot become L19/L20 source authority. |
| RISK-003 | RISK | high | MITIGATED_BY_CONTRACT | Bourdon evidence cannot silently authorize pressure thrust. |
| RISK-004 | RISK | high | MITIGATED_BY_CONTRACT | Pressure-stiffening evidence cannot remove curved centerline or apply factor more than once. |

## Validation ledger

| Check | Status | Evidence |
|---|---|---|
| Stack base #1348 | PASS — GROUNDED | `25543a9e...` |
| BM4_NL existing-job Bourdon state | PASS — SOURCE_INSPECTION | `TRANSLATION_AND_ROTATION` individual-file setting |
| Global pressure stiffening | PASS — SOURCE_INSPECTION | raw DEFAULT → DEFAULT_CODE, active B31.3-2022 |
| L19/L20 elbow selector | UNRESOLVED — SOURCE AUTHORITY | no P1 promotion |
| v2 source-state contract | PASS — SOURCE_INSPECTION | raw + normalized + authority layer retained |
| S5 parity protocol | PASS — SOURCE_INSPECTION | Q1-Q6 mechanism isolation defined |
| S5 external parity intake | PASS_AFTER_FIX — SOURCE_INSPECTION | independent scopes, non-empty observations, anti-gaming, single ownership and thrust exclusion |
| Contract fixture execution | NOT_RUN in repository CI | workflow declared; hosted execution unavailable |
| Numerical Bourdon parity | UNRESOLVED | controlled CAESAR runs absent |
| Numerical pressure-stiffening parity | UNRESOLVED | controlled CAESAR runs and L19/L20 source selector absent |
| Production numerical promotion | BLOCKED | all S5 mechanics flags false |

Historical hosted run `32678959386` / job `97292100341` had `steps=[]` and 404 `BlobNotFound`; classify as `CI_PRE_STEP_INFRASTRUCTURE_FAILURE`, not software PASS/engineering FAIL.

## Changed-file ledger — 8 files

| File | Purpose |
|---|---|
| `.github/workflows/lfea-s5-pressure-authority-gate.yml` | S5 source/prerequisite/parity-contract workflow |
| `agents/PR1391_workreport.md` | sole living recovery authority |
| `docs/lfea/S5_Pressure_Effect_Source_Authority_20260824.md` | Hexagon/source-setting authority ledger |
| `docs/lfea/S5_Pressure_Effect_Parity_Protocol_20260824.md` | mechanism-isolated CAESAR protocol |
| `scripts/lfea-s5-pressure-authority-gate-check.mjs` | BM4_NL source/config falsifier gate |
| `src/core/linear-piping-analysis-consumer/production-pressure-effect-authority.js` | source-state authority v2 |
| `scripts/lfea-s5-pressure-parity-evidence-contract.mjs` | external CAESAR parity evidence intake |
| `scripts/lfea-s5-pressure-parity-evidence-contract-check.mjs` | contract-only falsifier fixture/check |

## Appendix A — expert takeover questionnaire

1. Why is `Use Pressure Stiffening on Bends=Default` not equivalent to INCLUDE?
2. What is the authority difference between global pressure stiffening and per-load-case Elbow Stiffening Pressure?
3. Which BM4_NL authority layer proves the existing-job Bourdon mode?
4. Why is provisional P1 not authority for L19/L20?
5. What exactly does MEC-21 bend opening own, and where is uniform closed-end axial pressure strain owned?
6. Why must 4/6/8-chord Q3 evaluations share one physical initial bend basis?
7. Why can Bourdon qualify independently of pressure stiffening in the new contract?
8. Which Q4 conditions prove P1/P2/Pmax selection rather than incidental case ordering?
9. Why must pressure-stiffening factor ownership be exactly once on the curved S3 bend component?
10. Why does successful Bourdon parity still leave `pressureAxialThrust=false`?
11. Why does an accepted parity package still authorize no production capability?
12. Why are in-memory contract fixtures not CAESAR evidence?

Takeover threshold: all twelve must be answerable without guessing undocumented CAESAR behavior.

## Historical record

- S5 audit separated Bourdon displacement, bend pressure stiffening and pressure/end thrust.
- BM4_NL source custody established existing-job Bourdon Translation+Rotation, global DEFAULT_CODE/B31.3-2022, and unresolved L19/L20 elbow selector.
- A controlled Q1-Q6 parity protocol was committed; full BM4_NL response was rejected as an isolated oracle.
- 2026-08-24 continuation added a machine-checkable external evidence contract that supports independent Bourdon and pressure-stiffening qualification while hard-locking axial thrust and all production flags false.
- No numerical S5 production promotion has occurred.
