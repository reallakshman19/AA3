# PR1391 — LFEA S5 pressure/Bourdon authority prerequisite

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY_EXTERNAL_EVIDENCE_BLOCKED
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
MAIN_LAST_CHECKED: e985b50d81d0d241db27313562c8cc12cd7cc27d
CODE_HEAD_VALIDATION_BASIS: ef4acf8f187be5bcb2ed36e8beb1939640a30d33
REPORT_SYNC: CURRENT_REPORT_ONLY_DELTA
CURRENT_STAGE: source-setting custody + mechanism-isolated CAESAR protocol + controlled external parity-evidence intake complete
CURRENT_BLOCKER: no controlled CAESAR parity observations; BM4_NL L19/L20 Elbow Stiffening Pressure selector remains unresolved
HIGHEST_RISK: guessing P1, collapsing DEFAULT_CODE to a boolean, comparing non-identical controls, double-owning bend flexibility, or relabeling Bourdon strain as pressure thrust
EXACT_NEXT_ACTION: execute docs/lfea/S5_Pressure_Effect_Parity_Protocol_20260824.md and populate a real evidence record for BOURDON_ONLY, PRESSURE_STIFFENING_ONLY, or BOTH as justified
```

## 60-second handover

S5 numerical pressure mechanics are **not authorized**.

Current production truth remains:

```text
pressureStiffening = false
pressureAxialThrust = false
pressureBourdon = false
pressureCodeStress = true
```

Three different mechanics remain separated:

1. **Bourdon pressure displacement** — uniform closed-end axial strain plus optional bend translation/opening/rotation.
2. **Bend pressure stiffening** — pressure-dependent B31/B31J flexibility/SIF behavior.
3. **Pressure/end thrust** — force/effective-area mechanics requiring a separate future authority package.

This PR changes source/evidence governance only; governed production solve/recovery is not modified.

## Source-setting custody

### Existing-job Bourdon mode

BM4_NL source authority retains:

```text
BOURDON_PRESSURE = TRANSLATION_AND_ROTATION
winning authority = INDIVIDUAL_FILE_SETTING
```

This is source-state custody, not numerical qualification.

### Global bend pressure-stiffening configuration

BM4_NL retains:

```text
USE_PRESSURE_STIFFENING = DEFAULT
normalized = DEFAULT_CODE
active code = B31.3_2022
```

`DEFAULT_CODE` remains a first-class state and is not silently converted to INCLUDE or EXCLUDE.

### Per-load-case Elbow Stiffening Pressure

This is a separate setting from the global configuration. For BM4_NL:

```text
L19 selector = UNRESOLVED
L20 selector = UNRESOLVED
```

The provisional benchmark value `pressureSource=P1` is not promoted into source authority.

## Governing engineering decisions

### DEC-S5-001 — global configuration and per-case pressure selector are independent authorities
`Use Pressure Stiffening on Bends` and `Elbow Stiffening Pressure` are retained separately at their actual CAESAR scopes. No conflict or boolean simplification is invented.

### DEC-S5-002 — Bourdon and pressure stiffening may qualify independently
The external evidence schema supports:

```text
BOURDON_ONLY
PRESSURE_STIFFENING_ONLY
BOURDON_AND_PRESSURE_STIFFENING
```

Bourdon parity does not imply pressure-stiffening parity, and vice versa.

### DEC-S5-003 — controlled cases must differ only by the intended switch
The evidence contract now checks non-switched source state within each family:

- Q1: pressure/material/section/restraints/loads/code/global stiffening/selector constant; only Bourdon mode changes.
- Q2: same plus bend geometry constant; only Bourdon mode changes.
- Q4: pressure/material/section/bend/restraints/load/code/Bourdon/global stiffening constant; only selector changes.
- Q5: pressure/material/section/bend/restraints/load/code/Bourdon/selector constant; only global Default/Include/Exclude changes.

A parity claim cannot be manufactured by changing material, pressure, geometry, restraint or load state between cases.

### DEC-S5-004 — Q6 is positive Bourdon / negative thrust evidence
Q6 requires:

```text
activateBourdonEffects = TRANSLATION_ONLY
genericPressureThrustApplied = false
effectiveAreaForceApplied = false
```

This proves the intended mechanism boundary rather than merely asserting `pressureThrustForceAdded=false` at package level.

### DEC-S5-005 — accepted evidence cannot authorize any production pressure mechanism
Even accepted evidence returns:

```text
status = QUALIFIED_PARITY_EVIDENCE_ONLY
productionUseAuthorized = false
pressureBourdonAuthorized = false
pressureStiffeningAuthorized = false
pressureAxialThrustQualified = false
pressureAxialThrustAuthorized = false
```

A separate production-integration authority revision is mandatory.

## Implemented source-state contract

`src/core/linear-piping-analysis-consumer/production-pressure-effect-authority.js` uses:

```text
lfea-production-pressure-effect-authority/v2
```

It retains active code, Bourdon mode, global pressure-stiffening configuration, per-load-case selector, raw CAESAR value, normalized engineering value, resolution status, authority layer/source and unresolved reason.

## Controlled CAESAR protocol

`docs/lfea/S5_Pressure_Effect_Parity_Protocol_20260824.md` defines:

```text
Q1 straight pipe: None / Translation only / Translation+Rotation
Q2 bend: None / Translation only / Translation+Rotation
Q3 LFEA: 4 / 6 / 8 chords from one physical initial bend basis
Q4 selector: None / P1 / P2 / Pmax with Bourdon disabled
Q5 global: Default / Include / Exclude under active B31.3-2022
Q6 negative thrust control
```

Raw CAESAR job/input/output artifacts and hashes are mandatory. Expected values and tolerances cannot be fitted to CAESAR.

## Hardened external parity intake

`scripts/lfea-s5-pressure-parity-evidence-contract.mjs` requires each run to retain:

- one common CAESAR version/build across the package;
- 64-hex job/input/output hashes;
- active piping code;
- exact Bourdon mode;
- exact global pressure-stiffening setting;
- exact per-case selector;
- non-empty pressure/material/section/restraint/mechanical-load source state;
- non-empty displacement/reaction output;
- bend geometry/rotation output for bend cases;
- positive reported bend `k` and optional positive SIF values for Q4/Q5;
- report/raw-artifact locator;
- observer/date.

### Bourdon scope

Exactly one of each:

```text
Q1_STRAIGHT_BOURDON_NONE
Q1_STRAIGHT_BOURDON_TRANSLATION
Q1_STRAIGHT_BOURDON_TRANSLATION_ROTATION
Q2_BEND_BOURDON_NONE
Q2_BEND_BOURDON_TRANSLATION
Q2_BEND_BOURDON_TRANSLATION_ROTATION
Q6_PRESSURE_THRUST_NEGATIVE_CONTROL
```

Required quantitative comparisons within the **predeclared** tolerance:

- straight Translation-only versus Translation+Rotation translational equivalence;
- CAESAR straight elongation versus LFEA closed-end strain;
- bend Translation-only response;
- bend Translation+Rotation response;
- Q3 terminal free-state 4/6/8-chord invariance.

Q3 requires one physical initial bend basis for all chord counts.

### Pressure-stiffening scope

Exactly one of each:

```text
Q4_SELECTOR_NONE
Q4_SELECTOR_P1
Q4_SELECTOR_P2
Q4_SELECTOR_PMAX
Q5_GLOBAL_DEFAULT_B313
Q5_GLOBAL_INCLUDE_B313
Q5_GLOBAL_EXCLUDE_B313
```

Q4 requires:

- Bourdon mode NONE;
- positive, distinct P1/P2 controlled pressure fields;
- selector exactly matches None/P1/P2/Pmax case;
- P1/P2/Pmax selected-pressure comparison residuals within tolerance;
- P1/P2 response discrimination;
- pressure factor owned exactly once;
- curved S2 centerline retained.

Q5 requires:

- Bourdon mode NONE;
- active B31.3-2022 controlled case;
- exact Default/Include/Exclude state;
- identical selector and other non-switched source state across the three cases;
- Default observed to follow active-code method;
- Include and Exclude override effects observed.

## Anti-gaming and independent review

Rejected automatically if any of these are true:

```text
tolerancePolicy.fittedToCaesar != false
expectedValuesRebaselined != false
tolerancesWidenedToFitCaesar != false
productionAuthorizationRequested != false
pressureBourdonRequested != false
pressureStiffeningRequested != false
pressureAxialThrustRequested != false
```

An APPROVED independent reviewer is required and cannot be any recorded CAESAR observer.

## Contract falsifier fixture

`scripts/lfea-s5-pressure-parity-evidence-contract-check.mjs` is not CAESAR evidence. It is designed to reject:

- missing required families;
- changed Q1 material/control state;
- Q1/Q2 residual outside tolerance;
- Q3 reset of the physical bend initial basis;
- Q6 effective-area/generic thrust activation;
- wrong Q4 selector;
- changed Q4 section/control state;
- non-discriminating P1/P2 pressures;
- missing P1/P2 response discrimination;
- duplicate factor ownership;
- changed Q5 selector/control state;
- axial-thrust authorization request;
- fitted tolerance;
- non-independent review.

## MEC-21 boundary — bounded interpretation

`src/core/linear-fea-piping-components/bourdon-pressure-expansion.js` already retains the intended architecture:

- cumulative bend opening/rotation references one physical initial bend a-b-c basis;
- uniform closed-end axial pressure strain remains separately owned;
- bend opening does not silently add uniform translation again.

The retained M047 review supports that architecture but does not isolate full BM4_NL response sufficiently to serve as a production Bourdon oracle.

## Numerical authority boundary

Not changed or authorized:

- production MEC-21 solve/recovery integration;
- `pressureBourdon`;
- pressure-corrected production B31/B31J factor application;
- `pressureStiffening`;
- generic pressure/end thrust;
- `pressureAxialThrust`;
- S1-S3 bend geometry/flexibility;
- benchmark expected values;
- engineering tolerances.

Any S5 numerical result movement attributable to PR1391 is a falsifier.

## Required evidence before production integration

### Bourdon

1. Existing-job source mode retained.
2. Q1 controlled straight-pipe parity within tolerance.
3. Q2 controlled bend parity within tolerance.
4. Q3 4/6/8-chord same-initial-basis invariance within tolerance.
5. Q6 Bourdon-on/thrust-off negative control retained.
6. Raw artifacts/hashes and independent review retained.
7. Separate production solve/recovery currentness and single-owner integration designed.

### Pressure stiffening

1. Per-case pressure selector resolved from source.
2. Active-code method authority retained.
3. Q4 None/P1/P2/Pmax selection and response parity retained.
4. Q5 Default/Include/Exclude arbitration retained.
5. Pressure-corrected factor applied exactly once on the curved S3 bend component.
6. Raw artifacts/hashes and independent review retained.
7. Separate production integration designed.

### Pressure axial thrust

Still outside S5 parity. Requires a separate effective-area/reference-point/sign/source and numerical qualification package.

## Validation ledger

| Check | Status | Evidence |
|---|---|---|
| Stack base #1348 | PASS — GROUNDED | `25543a9e6c0e796d63e89841f63e41a4fd3292cc` |
| BM4_NL Bourdon setting | PASS — SOURCE_INSPECTION | individual-file Translation+Rotation |
| Global pressure stiffening | PASS — SOURCE_INSPECTION | raw DEFAULT -> DEFAULT_CODE, active B31.3-2022 |
| L19/L20 selector | UNRESOLVED — SOURCE AUTHORITY | P1 not promoted |
| v2 source-state contract | PASS — SOURCE_INSPECTION | raw/normalized setting custody retained |
| Q1-Q6 protocol | PASS — SOURCE_INSPECTION | mechanism isolation defined |
| External parity intake | PASS_AFTER_FIX — SOURCE_INSPECTION | mechanism scopes, controlled-state pairing, Q3 basis, Q4 ownership/selector, Q5 arbitration, Q6 thrust exclusion, anti-gaming enforced |
| Contract/source prerequisite execution | NOT_RUN — CI_PRE_STEP_INFRASTRUCTURE_FAILURE | run `32683986237`, job `97305562385`, steps null |
| Controlled Bourdon parity | UNRESOLVED | no real controlled CAESAR observations supplied |
| Controlled pressure-stiffening parity | UNRESOLVED | no real controlled CAESAR observations; L19/L20 selector unresolved |
| Production S5 promotion | BLOCKED | all numerical S5 flags false |

No GitHub test assertion executed on the exact code head; the workflow conclusion is not a software/engineering FAIL. Issue #54 remains the execution-environment blocker.

## Changed-file ledger — 8 files

| File | Purpose |
|---|---|
| `.github/workflows/lfea-s5-pressure-authority-gate.yml` | source/prerequisite/parity-contract workflow |
| `agents/PR1391_workreport.md` | sole living recovery authority |
| `docs/lfea/S5_Pressure_Effect_Source_Authority_20260824.md` | vendor/source-setting authority ledger |
| `docs/lfea/S5_Pressure_Effect_Parity_Protocol_20260824.md` | controlled Q1-Q6 CAESAR protocol |
| `scripts/lfea-s5-pressure-authority-gate-check.mjs` | BM4_NL setting custody/falsifier gate |
| `src/core/linear-piping-analysis-consumer/production-pressure-effect-authority.js` | source-state contract v2 |
| `scripts/lfea-s5-pressure-parity-evidence-contract.mjs` | external controlled parity intake |
| `scripts/lfea-s5-pressure-parity-evidence-contract-check.mjs` | contract falsifier fixture |

# APPENDIX A — expert takeover questionnaire

1. Why is global `Use Pressure Stiffening on Bends=Default` not equivalent to INCLUDE?
2. Why is `Elbow Stiffening Pressure` a separate authority from the global setting?
3. Which BM4_NL layer establishes existing-job Bourdon Translation+Rotation?
4. Why is provisional P1 ineligible as L19/L20 source authority?
5. What source state must remain constant across Q1, Q2, Q4 and Q5 respectively?
6. Why must Q4 use positive distinct P1/P2 values?
7. Why does Q3 require one physical bend initial basis for 4/6/8 chords?
8. What does the exactly-once pressure-factor requirement protect against on the S3 curved bend?
9. What does Q6 prove that a package-level boolean alone does not?
10. Why can Bourdon qualify without pressure-stiffening parity?
11. Why does successful Bourdon parity leave `pressureAxialThrust=false`?
12. Why does an accepted external parity record authorize no production flag?
13. Why are the in-memory contract fixtures not CAESAR evidence?
14. What separate production integration is required after real parity evidence exists?

Takeover threshold: all fourteen must be answerable without guessing undocumented CAESAR behavior.

## Historical record

- S5 audit separated Bourdon displacement, pressure stiffening and pressure/end thrust.
- BM4_NL established existing-job Bourdon Translation+Rotation, global DEFAULT_CODE/B31.3-2022, and unresolved L19/L20 selector custody.
- Full BM4_NL response was rejected as an isolated oracle because multiple unrelated sensitivities were simultaneous.
- A controlled Q1-Q6 protocol was committed.
- The external evidence contract was then hardened to allow independent Bourdon/stiffening scopes while requiring non-empty observations, controlled non-switched state, one physical Q3 basis, exact Q4 selector ownership, Q5 arbitration, explicit Q6 thrust exclusion, anti-gaming and independent review.
- No numerical S5 production promotion has occurred.
