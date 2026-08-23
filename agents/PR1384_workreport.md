# PR1384 Work Report — EMP1-36 WRC stress-intensity source boundary

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `PR: #1384`
- `ISSUE: #1383`
- `BRANCH: agent/emp1-36-stress-intensity-source-boundary`
- `BASE_MAIN_AT_BRANCH: 54f8ff0df5731ccfa0f984896e31d89228242db5`
- `MERGE_AUTHORITY: OWNER_GRANTED_IN_CHAT_SUBJECT_TO_FINAL_EXACT_HEAD_AND_MAIN_CHECK`
- `PRODUCTION_ROUTE_AUTHORIZED: false`
- `PRIMARY_STRESS_INTENSITY_SOURCE_AUTHORITY: false`
- `CODE_COMPLIANCE_AUTHORIZED: false`
- `RELEASE_QUALIFIED: false`

## Mission

Freeze source custody around the current cylindrical WRC stress-intensity reconstruction without modifying its numerical implementation.

## Current implementation truth

`src/core/emp1/emp1-wrc537-cylindrical-table5.js` currently:

1. algebraically superposes circumferential, longitudinal and shear shell-stress components at each of the eight retained Table-5 locations;
2. computes in-plane principal stresses using `sigma_phi`, `sigma_x`, `tau`;
3. sets `sigma_3 = 0`;
4. computes the maximum principal-stress difference, i.e. a standard plane-stress Tresca / twice-maximum-shear quantity;
5. forms only an eight-point envelope;
6. explicitly retains `globalAbsoluteMaximumClaim = false`.

This PR does not change those bytes.

## Source state

Pinned WRC PDF raw SHA-256:

`698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`

Legacy extraction:

`docs/01_WRC537_METHOD_DEFINITION.md`

Extraction status:

`NOT_READY_FOR_IMPLEMENTATION`

Retained secondary/OCR source meaning:

`S = stress intensity = twice maximum shear stress`.

The same extraction contains detailed formula text derived from secondary/OCR material. Because direct primary-page re-observation is unavailable, that formula text is not allowed to overwrite the mathematically coherent current implementation.

## Authority separation

```text
A. mathematical correctness of current plane-stress Tresca calculation
B. direct WRC primary-source reconstruction authority
C. downstream code acceptance
```

Frozen rule:

`A_DOES_NOT_ESTABLISH_B_AND_B_DOES_NOT_ESTABLISH_C`

Current status:

```text
primaryStressIntensityReconstructionAuthority = false
vonMisesAlternativeAuthority = false
globalMaximumAuthority = false
codeComplianceAuthority = false
releaseAuthority = false
```

## Changed-file ledger

1. `agents/PR1384_workreport.md`
2. `docs/emp1/WRC537_2013_Stress_Intensity_Authority.md`
3. `scripts/emp1-wrc537-stress-intensity-source-check.mjs`
4. `validation/emp1/wrc537-2013/stress-intensity-source-qualification-v1.json`

No production evaluator, Table-5 code, route registry, WRC dataset, UI, workflow, package, tolerance, pressure, SCF, gamma/beta, material, code or release file is changed.

## Validation ledger

| Check | Status | Evidence type |
|---|---|---|
| Current Table-5 equation source inspection | `PASS_SOURCE_REVIEW` | repository source inspection |
| New authority ledger/doc/checker consistency | `PASS_SOURCE_REVIEW` | source-only review |
| Local Node checker | `NOT_RUN_EXECUTION_ENVIRONMENT` | no matching local checkout in connected environment |
| Numerical validation | `NOT_APPLICABLE_NO_NUMERICAL_CHANGE` | production equation unchanged |
| Full repository regression | `NOT_RUN` | not claimed |

No runtime or engineering numerical PASS is fabricated.

## Protected invariants

- `planeStressTresca()` unchanged.
- Third principal stress remains zero in current implementation.
- Algebraic component superposition unchanged.
- Eight-point-only envelope unchanged.
- Global absolute maximum remains false.
- WRC host-shell-only scope unchanged.
- EMP1-35 code/release separation unchanged.
- No von Mises alternative introduced.
- No workflow changes.

## Exact next action

After merge, continue to the next independent EMP.1 source boundary. Do not alter stress-intensity numerics until direct primary-source reconstruction semantics are available and independently checked.

## Appendix A — takeover qualification

1. What exact equation does `planeStressTresca()` currently implement?
2. Why is `sigma_3 = 0` a material source-semantics question even if it is mathematically conventional for plane stress?
3. Why does mathematical correctness not establish WRC source authority?
4. What does the retained extraction say `S` means, and why is that not enough to alter production code?
5. Why must OCR-derived detailed formulas be treated as non-authoritative?
6. At what point are Vc/Vl/Mt shear contributions currently superposed?
7. Why is the eight-point envelope not a global maximum?
8. Why is von Mises not an authorized replacement?
9. Why does source authority for `S` still not imply code compliance?
10. Which validation states are `NOT_RUN`, and why must they not be reported as PASS?
