# PR1382 Work Report — EMP1-35 WRC stress-classification/code boundary

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `PR: #1382`
- `ISSUE: #1381`
- `BRANCH: agent/emp1-35-stress-classification-code-boundary`
- `BASE_MAIN_AT_BRANCH: a5aa16af7b4298427ea6b4aac0ced05ff801ed1c`
- `ENGINEERING_HEAD_AFTER_REPORT: this commit`
- `MERGE_AUTHORITY: OWNER_GRANTED_IN_CHAT_SUBJECT_TO_FINAL_EXACT_HEAD_AND_MAIN_CHECK`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `CODE_COMPLIANCE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`

## Mission

Freeze the authority boundary between WRC 537 calculated host-shell stresses and any downstream governing-code stress classification, allowable/compliance decision or release approval.

This is a source-governance increment only. It does not implement a code evaluator.

## Grounded engineering state

Current Table-5 implementation:

- domain: `HOST_CYLINDRICAL_SHELL_AT_ATTACHMENT_SHELL_JUNCTURE`;
- recovery points: `Au, Al, Bu, Bl, Cu, Cl, Du, Dl`;
- shell circumferential, longitudinal and shear stress outputs;
- plane-stress Tresca stress intensity at each evaluated point;
- eight-point envelope only;
- `absoluteShellMaximumAssured = false`;
- `arbitraryLoadingGlobalMaximumAuthority = false`;
- attachment/nozzle stresses are not calculated.

The implementation does **not** assign code stress categories, compare allowables or authorize release.

The retained legacy method extraction states that WRC supplies shell-stress calculation while acceptability remains the responsibility of the designer/governing code, but that extraction is explicitly `NOT_READY_FOR_IMPLEMENTATION`. Direct primary-page re-observation is unavailable in the connected GitHub environment.

## Authority decision

Keep four authorities separate:

```text
A. WRC elastic host-shell stress calculation
B. governing-code stress classification
C. allowable/compliance assessment
D. release/approval
```

Frozen rule:

`AUTHORITY_FOR_A_DOES_NOT_IMPLY_B_C_OR_D`

Current source-phase state:

```text
codeStressClassificationAuthority = false
allowableComparisonAuthority = false
codeComplianceAuthority = false
releaseAuthority = false
```

## Critical engineering distinctions

1. WRC `membrane` and `bending` are mathematical response components; they are not automatically ASME primary/secondary/peak stress categories.
2. WRC `stressIntensity` is a calculated stress quantity, not an allowable ratio or code PASS result.
3. Downstream classification can depend on load origin, self-limiting behavior, structural discontinuity, pressure contribution, service condition and governing code.
4. B31.3 piping stress allowables must not be applied to vessel-shell WRC stress by default.
5. Code compliance, even if later qualified, must remain separate from release approval.

## Source custody

Pinned WRC source raw PDF SHA-256:

`698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`

Retained secondary extraction:

`docs/01_WRC537_METHOD_DEFINITION.md`

Authority state:

`NOT_READY_FOR_IMPLEMENTATION`

Direct primary-page read in connected environment:

`NOT_RUN_EXECUTION_ENVIRONMENT`

## Changed-file ledger

1. `agents/PR1382_workreport.md` — living recovery/evidence record.
2. `docs/emp1/WRC537_2013_Stress_Classification_Code_Authority.md` — engineering authority boundary.
3. `scripts/emp1-wrc537-stress-classification-code-boundary-check.mjs` — fail-closed static checker.
4. `validation/emp1/wrc537-2013/stress-classification-code-boundary-v1.json` — machine-readable source boundary.

No production evaluator, route registry, coefficient dataset, UI, package, workflow, tolerance, oracle, pressure, SCF, gamma/beta, material or release file is changed.

## Validation ledger

| Check | Status | Oracle / observation |
|---|---|---|
| Existing Table-5 source inspection | `PASS_SOURCE_REVIEW` | repository source, not numerical execution |
| Authority-boundary consistency review | `PASS_SOURCE_REVIEW` | independent reading of new ledger/doc/checker |
| Local Node checker execution | `NOT_RUN_EXECUTION_ENVIRONMENT` | connected GitHub environment has no matching local checkout |
| Engineering numerical validation | `NOT_APPLICABLE_SOURCE_ONLY_INCREMENT` | no numerical mechanics changed |
| Full repository regression | `NOT_RUN` | not claimed |

No runtime PASS is fabricated.

## Protected invariants

- Table-5 numerical equations unchanged.
- Plane-stress Tresca implementation unchanged.
- Eight-point extrema limitation unchanged.
- Host-shell-only stress scope unchanged.
- Gamma/beta/domain selection unchanged.
- Pressure-thrust and pressure-stress authority unchanged.
- Appendix-B `Kn/Kb` authority unchanged.
- Off-axis/global-maximum authority unchanged.
- Material/theory authority unchanged.
- Global EMP.1.C, code compliance and release authority remain false.
- No `.github/workflows/*` changes.

## Open source questions

Before a code-assessment implementation exists, primary/source-qualified work must resolve:

1. exact WRC statement delimiting calculation from acceptability;
2. whether WRC itself assigns any result to a governing-code category;
3. pressure-stress combination prerequisites;
4. effect of Appendix-B factors on downstream classification;
5. governing code and edition;
6. service/load condition;
7. exact stress-classification/combination rule;
8. allowable/design-stress basis;
9. evidence binding WRC result to code-assessment result;
10. release authority as a separate final decision.

## Exact next action

After this PR is merged, continue to the next independent EMP.1 source boundary. Do not implement a code allowable evaluator until #1381 source/code questions are closed with primary authority.

## Appendix A — takeover qualification

1. What exactly does the current Table-5 result calculate, and at which physical locations?
2. Why is a WRC `membrane` response term not automatically an ASME primary membrane stress category?
3. Why is WRC `stressIntensity` not a compliance ratio?
4. Which governing-code facts must be pinned before an allowable comparison is meaningful?
5. Why must pressure-stress combination authority remain separate from the WRC external-load calculation?
6. Why can B31.3 piping allowables not be imported as the default vessel-shell criterion?
7. What evidence must bind one WRC result to one future code-assessment result?
8. Why must code compliance and release approval remain distinct?
9. Which files in this PR are allowed to carry engineering authority, and which production files are deliberately untouched?
10. What evidence state is `NOT_RUN`, and why must it not be reported as PASS or FAIL?

Takeover readiness target: another qualified engineer can continue from these repository artifacts without relying on chat history.
