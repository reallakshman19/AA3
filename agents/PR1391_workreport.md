# PR1391 — LFEA S5 pressure/Bourdon authority prerequisite

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_DRAFT
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
CODE_HEAD_OBSERVED: dd7059ace7806cb3fbdf25f01df4e1119beb58a7
REPORT_SYNC: CURRENT_REPORT_ONLY_DELTA
CURRENT_STAGE: CAESAR source-setting custody corrected; mechanism-isolated parity protocol committed
CURRENT_BLOCKER: production numerical Bourdon parity remains unqualified; BM4_NL L19/L20 elbow stiffening pressure selector remains unresolved
HIGHEST_RISK: collapsing CAESAR DEFAULT to include/exclude, guessing P1, or double-counting closed-end pressure deformation as both Bourdon and thrust
EXACT_NEXT_ACTION: execute docs/lfea/S5_Pressure_Effect_Parity_Protocol_20260824.md against retained CAESAR outputs before any pressure-mechanics capability flag is enabled
```

## Governing engineering state

S5 contains three distinct mechanism families:

1. **Bourdon pressure displacement** — straight-pipe axial elongation plus optional bend translation/opening/rotation.
2. **Bend pressure stiffening** — pressure-dependent B31/B31J SIF/flexibility-factor mechanics.
3. **Pressure/end thrust** — separate force/effective-area mechanics; not another name for Bourdon strain.

Production capability remains:

```text
pressureStiffening = false
pressureAxialThrust = false
pressureBourdon = false
pressureCodeStress = true
```

Pressure fields alone authorize none of the first three mechanisms.

## Source authority established

### Bourdon existing-job mode

Hexagon `Activate Bourdon Effects` distinguishes `None`, `Translation only`, and `Translational & Rotational`. It is the existing-job authority; a new-job default does not alter an existing job.

BM4_NL configuration authority resolves:

```text
setting: BOURDON_PRESSURE
value: TRANSLATION_AND_ROTATION
winning level: INDIVIDUAL_FILE_SETTING
source: USER_VERIFIED_BM4_NL_EXISTING_JOB_SETTINGS_2026-08-09
```

This is source custody, not numerical production qualification.

### Global bend-pressure-stiffening configuration

Hexagon `Use Pressure Stiffening on Bends` has a real `Default` state which delegates to the active piping code. `Default` is not equivalent to unconditional include or exclude.

BM4_NL resolves:

```text
USE_PRESSURE_STIFFENING = DEFAULT
normalized state = DEFAULT_CODE
DEFAULT_CODE = B31.3_2022
winning level = OVERALL_GLOBAL_DEFAULT
```

### Per-load-case Elbow Stiffening Pressure

This is a separate CAESAR setting with `None`, `Pmax`, `P1..P9`, and `Phydro` options.

BM4_NL retains `ELBOW_STIFFENING_PRESSURE` as **UNRESOLVED** for L19 and L20. The existing provisional `linearSolve.bendPressureStiffening.pressureSource=P1` is not promoted into source authority. The reusable configuration resolver throws on the unresolved setting.

Current BM4_NL pressure-stiffening state is therefore:

```text
global configuration: DEFAULT_CODE
active code: B31.3_2022
L19 selector: UNRESOLVED
L20 selector: UNRESOLVED
production pressure stiffening: BLOCKED
```

## Implemented

### `production-pressure-effect-authority.js`

Schema is now `lfea-production-pressure-effect-authority/v2`.

It retains separately:

- active piping code;
- Bourdon mode;
- global pressure-stiffening configuration: `DEFAULT_CODE | INCLUDE | EXCLUDE`;
- per-load-case elbow pressure selector, including `UNRESOLVED`;
- per-setting evidence containing resolution status, authority layer, source, case id, raw CAESAR value, normalized engineering value, and unresolved reason.

Raw and normalized values are both retained so raw `DEFAULT` → normalized `DEFAULT_CODE` is an explicit translation rather than silent source rewriting.

No invented conflict is imposed between the global configuration and per-load-case selector. They are separate CAESAR settings.

`sourcePressureEffectDisposition()` reports source state without collapsing code-controlled or unresolved pressure stiffening into a boolean authorization.

### Real BM4_NL configuration gate

`scripts/lfea-s5-pressure-authority-gate-check.mjs` reads the checked-in BM4_NL profile and reuses `caesar-configuration-authority.js` precedence:

```text
OVERALL_GLOBAL_DEFAULT
  < INDIVIDUAL_FILE_SETTING
  < LOAD_CASE_SETTING
  < MODEL_INPUT
```

It proves:

- individual-file Bourdon overrides global Bourdon default;
- global pressure stiffening remains `DEFAULT_CODE`;
- active code is B31.3-2022;
- L19 elbow selector remains unresolved and resolution throws;
- unresolved evidence cannot be spoofed as P1;
- a resolved selector under `DEFAULT_CODE` remains code-controlled;
- global config and selector remain independent source records;
- all production S5 numerical flags remain false.

### Source-authority document

`docs/lfea/S5_Pressure_Effect_Source_Authority_20260824.md` records the Hexagon setting semantics, BM4_NL resolved/unresolved custody, configuration precedence, MEC-21 ownership boundary, and pressure-thrust exclusion.

### Mechanism-isolated parity protocol

`docs/lfea/S5_Pressure_Effect_Parity_Protocol_20260824.md` requires controlled CAESAR qualification for:

1. straight-pipe Bourdon translation (`None` vs `Translation only` vs `Trans+Rot`);
2. bend Translation-only vs Translation+Rotation;
3. subdivision invariance using one physical bend initial basis;
4. elbow stiffening selector `None/P1/P2/Pmax`;
5. global `Default/Include/Exclude` with active-code arbitration;
6. negative control proving Bourdon is not generic pressure thrust.

Raw CAESAR inputs/outputs and hashes are mandatory. Expected values/tolerances may not be fitted to CAESAR.

## Existing numerical evidence — bounded interpretation

`src/core/linear-fea-piping-components/bourdon-pressure-expansion.js` already implements MEC-21 equation (2.25) and preserves a useful ownership boundary:

- cumulative bend opening/rotation uses one physical bend initial a-b-c basis;
- uniform closed-end axial pressure strain is retained separately;
- the bend opening field does not silently add the same uniform translation twice.

The retained M047 technical review selectively accepted this cumulative MEC-21 architecture. It did **not** establish full production parity: BM4_NL still had simultaneous unresolved smooth-90, metallic-pipe shear, elbow-pressure-selector, and restraint sensitivities, with multiple response quantities outside the existing 10% comparison threshold.

Accordingly BM4_NL full-system response is not used as an isolated Bourdon oracle.

## Numerical authority boundary

This PR does **not**:

- integrate MEC-21 into the governed production InputXML/ACCDB solve/recovery chain;
- flip `pressureBourdon`;
- pressure-correct production B31/B31J bend factors;
- flip `pressureStiffening`;
- introduce generic pressure/end thrust;
- flip `pressureAxialThrust`;
- change S1-S3 bend geometry/flexibility;
- alter benchmark expected values or tolerances.

Any result movement attributable to this prerequisite is a falsifier.

## Required evidence before numerical promotion

### `pressureBourdon=true`

Requires source existing-job mode plus independent straight-span and bend parity, one physical initial bend basis across S2 chords, one-owner axial pressure deformation, and common preflight/solve/recovery authority/currentness.

### `pressureStiffening=true`

Requires resolved active-code methodology and per-load-case pressure selector, source-pressure mapping, qualified B31/B31J factor correction, exactly-one factor ownership on the S3 bend component, and independent factor/response parity.

### `pressureAxialThrust`

Remains false. A separate effective-area/reference/sign/source and numerical qualification package is required.

## Validation ledger

| Check | State | Evidence |
|---|---|---|
| Stack base #1348 | PASS — GROUNDED | `25543a9e...` |
| Branch ancestry before latest report | PASS — GROUNDED | 11 commits ahead / 0 behind #1348 at earlier reconciliation; subsequent changes remain branch-local |
| BM4_NL Bourdon setting | PASS — SOURCE_INSPECTION | individual-file `TRANSLATION_AND_ROTATION` |
| BM4_NL global stiffening config | PASS — SOURCE_INSPECTION | raw `DEFAULT` → `DEFAULT_CODE` |
| Active code | PASS — SOURCE_INSPECTION | `B31.3_2022` |
| L19/L20 elbow selector | UNRESOLVED — SOURCE AUTHORITY | explicit `unresolvedSettings`; P1 remains provisional only |
| v2 raw/normalized evidence custody | PASS — SOURCE_INSPECTION | production source-state file is 210 added lines, below guarded package `<300` ceiling |
| Numerical S5 promotion | BLOCKED | all S5 mechanics flags false |
| Exact code-head S5 workflow | NOT_RUN — CI_PRE_STEP_INFRASTRUCTURE_FAILURE | run `32678959386`, job `97292100341`, `steps=[]`, logs 404 `BlobNotFound` |
| S5 assertion failure observed | NO | no checkout or test step executed |
| Full numerical pressure parity | NOT_RUN / UNRESOLVED | controlled protocol not yet executed |

## Changed-file ledger

| File | Purpose |
|---|---|
| `.github/workflows/lfea-s5-pressure-authority-gate.yml` | source/config/prerequisite + anti-drift workflow |
| `agents/PR1391_workreport.md` | sole living recovery authority |
| `docs/lfea/S5_Pressure_Effect_Source_Authority_20260824.md` | vendor/source-setting authority ledger |
| `docs/lfea/S5_Pressure_Effect_Parity_Protocol_20260824.md` | mechanism-isolated CAESAR qualification protocol |
| `scripts/lfea-s5-pressure-authority-gate-check.mjs` | real BM4_NL configuration custody/falsifier gate |
| `src/core/linear-piping-analysis-consumer/production-pressure-effect-authority.js` | sealed pressure source-state contract v2 |

## Appendix A — expert takeover questionnaire

1. Why is `Use Pressure Stiffening on Bends=Default` not equivalent to INCLUDE?
2. What is the authority difference between that global configuration and `Elbow Stiffening Pressure`?
3. Which BM4_NL layer proves existing-job Bourdon mode?
4. Why is provisional P1 not source authority for L19/L20?
5. What does MEC-21 bend opening own, and where is uniform closed-end pressure strain owned?
6. Why must every S2 chord reference one physical bend initial basis?
7. Why does BM4_NL full-system comparison not isolate Bourdon sufficiently for production promotion?
8. Which controlled cases separate Translation-only from Translation+Rotation?
9. Which controlled cases qualify `P1/P2/Pmax/None` pressure-stiffening behavior?
10. Why must `pressureAxialThrust` remain false after Bourdon qualification?

A takeover engineer must answer all ten without guessing undocumented CAESAR behavior.
