# PR1391 — LFEA S5 pressure/Bourdon authority prerequisite

## Current recovery state

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
EXACT_HEAD_BEFORE_REPORT_UPDATE: e83c98451139d6a9920eb61a935f1fb4dac0a638
CURRENT_STAGE: S5 source-setting authority corrected and mechanism-isolated parity protocol committed
CURRENT_BLOCKER: production numerical Bourdon parity remains unqualified; BM4_NL L19/L20 elbow stiffening pressure selector remains unresolved
HIGHEST_RISK: collapsing CAESAR DEFAULT to INCLUDE/EXCLUDE, guessing P1 from a provisional benchmark field, or double-counting closed-end pressure deformation as thrust plus Bourdon
EXACT_NEXT_ACTION: obtain mechanism-isolated CAESAR observations per docs/lfea/S5_Pressure_Effect_Parity_Protocol_20260824.md; keep all S5 numerical capability flags false
```

## 60-second handover

S5 contains three different mechanism families that must not be merged conceptually:

1. **Bourdon pressure displacement** — straight-pipe axial elongation plus optional bend translation/rotation/opening;
2. **bend pressure stiffening** — pressure-dependent B31/B31J flexibility/SIF factor mechanics;
3. **pressure/end thrust** — a separate force/effective-area mechanism, not another name for Bourdon strain.

Current production capability remains:

```text
pressureStiffening = false
pressureAxialThrust = false
pressureBourdon = false
pressureCodeStress = true
```

Pressure values in the imported model do not authorize the first three effects.

## Source authority findings

### Bourdon existing-job setting

Hexagon `Activate Bourdon Effects` is an existing-job setting. For steel piping, default behavior is no Bourdon displacement. The supported modes distinguish:

```text
NONE
TRANSLATION_ONLY
TRANSLATION_AND_ROTATION
```

BM4_NL retained configuration authority resolves:

```text
BOURDON_PRESSURE = TRANSLATION_AND_ROTATION
winning level = INDIVIDUAL_FILE_SETTING
source = USER_VERIFIED_BM4_NL_EXISTING_JOB_SETTINGS_2026-08-09
```

This is now source-state custody. It is **not** by itself production numerical qualification.

### Global bend pressure-stiffening configuration

Hexagon `Use Pressure Stiffening on Bends` has a `Default` state. `Default` delegates to the active piping code; it is not equivalent to unconditional include or exclude.

BM4_NL retained configuration authority resolves:

```text
USE_PRESSURE_STIFFENING = DEFAULT
normalized = DEFAULT_CODE
DEFAULT_CODE = B31.3_2022
winning level = OVERALL_GLOBAL_DEFAULT
```

### Per-load-case elbow pressure selector

Hexagon `Elbow Stiffening Pressure` is a separate per-load-case setting with source options:

```text
None
Pmax
P1..P9
Phydro
```

BM4_NL explicitly retains this setting as unresolved for both L19 and L20. The configuration resolver throws rather than using the provisional `linearSolve.bendPressureStiffening.pressureSource=P1` field as source authority.

Therefore BM4_NL pressure-stiffening source state is currently:

```text
global configuration: DEFAULT_CODE
active code: B31.3_2022
L19 selector: UNRESOLVED
L20 selector: UNRESOLVED
effective production pressure stiffening: BLOCKED
```

## Corrected production source-state contract

`src/core/linear-piping-analysis-consumer/production-pressure-effect-authority.js` is now schema v2.

It preserves:

- active piping code;
- Bourdon mode;
- global bend-pressure-stiffening configuration:
  - `DEFAULT_CODE`
  - `INCLUDE`
  - `EXCLUDE`;
- per-load-case elbow stiffening pressure selector, including explicit `UNRESOLVED`;
- per-setting evidence carrying:
  - resolution status;
  - authority level;
  - source;
  - case id;
  - raw CAESAR value;
  - normalized engineering value;
  - unresolved reason.

The contract deliberately does **not** invent a conflict rule between the global pressure-stiffening configuration and the per-load-case selector. They are separate CAESAR settings with different scopes.

`sourcePressureEffectDisposition()` reports source state without reducing code-controlled/unresolved pressure stiffening to a boolean.

## Reuse of existing configuration authority

S5 does not define new configuration precedence.

The existing reusable authority remains:

```text
OVERALL_GLOBAL_DEFAULT
  < INDIVIDUAL_FILE_SETTING
  < LOAD_CASE_SETTING
  < MODEL_INPUT
```

`scripts/lfea-s5-pressure-authority-gate-check.mjs` reads the real checked-in BM4_NL profile and uses `caesar-configuration-authority.js` to prove the actual winning source layer.

The gate verifies:

- global Bourdon NONE is superseded by individual-file TRANSLATION_AND_ROTATION;
- global `USE_PRESSURE_STIFFENING=DEFAULT` remains `DEFAULT_CODE`;
- active code is B31.3-2022;
- L19 elbow selector is unresolved and resolution throws;
- unresolved evidence cannot be spoofed as P1;
- a known selector under `DEFAULT_CODE` still remains code-controlled rather than silently INCLUDE;
- global config and per-case selector are not coupled by an invented contradiction;
- all three numerical S5 capability flags remain false.

## Existing MEC-21 implementation evidence

The repository already contains:

`src/core/linear-fea-piping-components/bourdon-pressure-expansion.js`

It implements MEC-21 equation (2.25) bend pressure free movement and retains an important ownership boundary:

- cumulative bend opening/rotation is resolved from one physical bend initial a-b-c basis;
- uniform closed-end axial pressure strain is retained separately;
- the bend-opening field does not silently add the same uniform translation a second time.

The retained M047 technical review selectively accepted the cumulative physical-bend MEC-21 deformation architecture, but explicitly did **not** close the full BM4_NL benchmark. The same system still had simultaneous unresolved smooth-90, shear, pressure-selector and restraint sensitivities and multiple response rows above 10%.

Therefore full BM4_NL system comparison is not used as an isolated Bourdon production oracle.

## Qualification protocols added

### Source semantics

`docs/lfea/S5_Pressure_Effect_Source_Authority_20260824.md`

Records vendor semantics, BM4_NL source settings, existing configuration precedence and the numerical authority boundary.

### Numerical parity

`docs/lfea/S5_Pressure_Effect_Parity_Protocol_20260824.md`

Defines controlled CAESAR qualification for:

1. straight-pipe Bourdon translation;
2. bend Translation-only vs Translation+Rotation;
3. S2 chord subdivision invariance from one physical bend basis;
4. per-load-case elbow stiffening pressure (`None`, `P1`, `P2`, `Pmax`);
5. global `Default/Include/Exclude` plus active-code arbitration;
6. negative-control separation from pressure/end thrust.

Raw CAESAR job/output hashes and report locators are required. The protocol prohibits fitting expected values/tolerances to CAESAR.

## Numerical authority boundary

PR1391 does **not**:

- integrate MEC-21 into the production InputXML/ACCDB solve path;
- flip `pressureBourdon`;
- apply pressure correction to production bend factor sets;
- flip `pressureStiffening`;
- apply generic pressure/end thrust;
- flip `pressureAxialThrust`;
- modify S1-S3 bend geometry/flexibility;
- change benchmark expected values or tolerances.

Any numerical result movement attributable to this prerequisite is a falsifier.

## Required evidence before actual numerical promotion

### To enable `pressureBourdon`

- source existing-job Bourdon mode resolved;
- straight-span closed-end pressure elongation parity;
- bend translation/opening parity for the selected mode;
- one physical bend initial basis across every S2 chord;
- proof axial pressure deformation is owned exactly once;
- shared preflight/solve/recovery authority and currentness.

### To enable `pressureStiffening`

- global configuration + active-code authority;
- resolved per-load-case elbow pressure selector;
- selected pressure source mapped to actual P1..P9/Pmax/Phydro state;
- B31/B31J pressure factor correction qualified;
- correction applied exactly once to the S3 component factor set;
- independent factor and response parity.

### `pressureAxialThrust`

Remains outside the Bourdon/stiffening authority. A separate effective-area/reference/sign/source package is required.

## Validation ledger

| Check | State | Evidence |
|---|---|---|
| Stack base #1348 | PASS — GROUNDED | exact base `25543a9e...` |
| Branch ancestry before report | PASS — GROUNDED | 11 commits ahead, 0 behind #1348 |
| BM4_NL Bourdon setting | PASS — SOURCE_INSPECTION | individual-file `TRANSLATION_AND_ROTATION` |
| BM4_NL global pressure stiffening | PASS — SOURCE_INSPECTION | raw `DEFAULT` → `DEFAULT_CODE` |
| BM4_NL active code | PASS — SOURCE_INSPECTION | `B31.3_2022` |
| L19/L20 elbow pressure selector | UNRESOLVED — SOURCE AUTHORITY | retained unresolved settings; no P1 promotion |
| v2 raw/normalized setting custody | PASS — SOURCE_INSPECTION | setting evidence retains both source token and normalized state |
| production file `<300` line guard | PASS — DIFF/SOURCE INSPECTION | current new production file is 210 added lines |
| numerical S5 production promotion | BLOCKED | all S5 mechanics flags false |
| deterministic exact-head S5 gate | NOT_RUN until hosted execution observed | workflow pending after current updates |
| global linear-piping anti-drift | NOT_RUN until hosted execution observed | workflow pending after current updates |

## Changed-file ledger

| File | Purpose |
|---|---|
| `.github/workflows/lfea-s5-pressure-authority-gate.yml` | focused source/config/anti-drift prerequisite workflow |
| `agents/PR1391_workreport.md` | sole living recovery authority |
| `docs/lfea/S5_Pressure_Effect_Source_Authority_20260824.md` | vendor/source-setting authority ledger |
| `docs/lfea/S5_Pressure_Effect_Parity_Protocol_20260824.md` | mechanism-isolated CAESAR qualification protocol |
| `scripts/lfea-s5-pressure-authority-gate-check.mjs` | actual BM4_NL configuration custody/falsifier gate |
| `src/core/linear-piping-analysis-consumer/production-pressure-effect-authority.js` | sealed pressure source-state contract v2 |

## Appendix A — expert takeover questionnaire

1. Why is CAESAR `Use Pressure Stiffening on Bends=Default` not equivalent to INCLUDE?
2. What is the authority difference between that global configuration and per-load-case `Elbow Stiffening Pressure`?
3. Which BM4_NL setting proves existing-job Bourdon mode, at what precedence layer?
4. Why is the provisional BM4_NL P1 field not source authority for L19/L20 elbow stiffening pressure?
5. What does MEC-21 bend opening own, and where is uniform closed-end axial pressure strain owned?
6. Why must every S2 chord sample a cumulative field referenced to one physical bend initial basis?
7. Why does existing BM4_NL system-level response evidence not isolate Bourdon strongly enough for production promotion?
8. What controlled CAESAR cases separate Translation-only from Translation+Rotation?
9. How do P1/P2/Pmax/None cases qualify pressure-stiffening selector behavior?
10. Why must `pressureAxialThrust` remain false after Bourdon qualification?

A takeover engineer must answer all ten without inferring undocumented CAESAR behavior.
