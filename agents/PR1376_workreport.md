# PR1376 Work Report — EMP1-32 WRC Shell Thickness Basis

## Classification
- IMPLEMENT / NEW_PR_REQUIRED / WRITE_ALLOWED / ENGINEERING_CRITICAL
- Issue: #1375
- PR: #1376
- Starting main: `cd7457aba853c49294cac32f3f3508c5770d817c`
- Owner merge authorization: active from chat (`merge, proceed next`), subject to final exact-head/live-main verification.

## Objective
Freeze the distinction between the repository's existing deterministic assessment-thickness policy and the unresolved primary-source definition of WRC 537 shell thickness `T`.

## Grounded production/source trace

### Foundation thickness policy
`src/core/local-stress/constants.js` defines:

- `NOMINAL_MINUS_CORROSION`
- `EXPLICIT_ASSESSMENT`

`src/core/local-stress/canonical-model.js` implements:

- nominal-minus-corrosion: `assessmentPipeThickness = nominalPipeThickness - corrosionAllowance`;
- explicit assessment: positive caller-supplied assessment thickness;
- conflict check if a supplied assessment value disagrees with the derived value under nominal-minus-corrosion.

### LAFEA.2 custody
`src/core/local-attachment-screening/section-properties.js` consumes:

`foundationModel.thicknessBasis.assessmentPipeThickness.value`

and retains its source reference as `sourceReferences.assessmentPipeThickness`.

### EMP.1 WRC custody
`src/core/local-attachment-correlation/geometry-evidence.js` carries that value as `pipeThickness`.

`src/core/emp1/emp1-wrc537-source-custody.js` then derives:

- `shellThickness = geometryEvidence.pipeThickness`;
- derivation label `LAFEA2_ASSESSMENT_PIPE_THICKNESS`;
- `meanRadius = pipeOutsideDiameter/2 - shellThickness/2`;
- `gamma = Rm/T`.

This chain is internally deterministic and radius/thickness coherent. It does not prove that WRC 537 itself authorizes either LAFEA thickness policy.

## Primary-source state

Pinned WRC source:
- path: `docs/emp1/WRC537_2013.pdf`
- Git blob: `ce861233928154145a9257efbbf8dbef3f5a17d1`
- raw SHA-256: `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`
- direct page inspection through current connected interface: `NOT_RUN_EXECUTION_ENVIRONMENT`

Legacy `docs/01_WRC537_METHOD_DEFINITION.md` is explicitly `NOT_READY_FOR_IMPLEMENTATION` and cannot establish the thickness basis.

## Engineering decision

Disposition:

`BLOCKED_WRC_SHELL_THICKNESS_BASIS_PRIMARY_SOURCE_UNRESOLVED`

The following remain unqualified as WRC source rules:
- nominal minus corrosion allowance;
- arbitrary explicit assessment thickness;
- automatic CA subtraction;
- measured local minimum thickness;
- mill/undertolerance or forming-thinning deduction;
- locally thickened-shell / insert / reinforcement-pad substitution.

Existing current-path `Rm`/`T` coherence is retained as a software fact, not promoted to source authority.

## Changed-file ledger
1. `validation/emp1/wrc537-2013/shell-thickness-basis-source-qualification-v1.json`
2. `docs/emp1/WRC537_2013_Shell_Thickness_Basis_Authority.md`
3. `scripts/emp1-wrc537-shell-thickness-basis-source-check.mjs`
4. `agents/PR1376_workreport.md`

No production adapter, thickness conversion/default, source-custody implementation, route registry, coefficient dataset, oracle, tolerance, UI or workflow file is intentionally changed.

## Validation ledger
- live main at branch creation: PASS (`cd7457ab...`)
- EMP1-32 PR collision search: PASS (no relevant PR)
- foundation/LAFEA.2/WRC thickness custody trace: PASS (repository inspection)
- current `Rm`/`T` software coherence: PASS (same assessment thickness used in mean-radius derivation and WRC `T`)
- primary WRC page re-observation: NOT_RUN_EXECUTION_ENVIRONMENT
- fail-closed checker execution: NOT_RUN
- production numerical regression: NOT_RUN / NOT_APPLICABLE_TO_SOURCE-ONLY_DIFF
- no runtime PASS claimed.

## Authority invariants
- existing LAFEA thickness policies unchanged;
- existing WRC numerical adapter unchanged;
- gamma/beta authority unchanged;
- nonzero differential pressure remains blocked;
- non-unity SCF remains blocked;
- off-axis/global maximum remains blocked;
- spherical/non-round/oblique/neighbor-interaction authority remains blocked or source-gated;
- host-shell/nozzle-stress boundary unchanged;
- global EMP1.C/code/release authority false.

## Appendix A

### A1 Production trace — 20/20
Exact source path traced from foundation thickness policy through LAFEA.2 section properties, correlation geometry evidence and WRC source custody. Falsifier: find any current WRC production path that bypasses `assessmentPipeThickness` or computes `Rm` from a different thickness basis.

### A2 Failure isolation — 19/20
The defect risk is authority leakage, not arithmetic inconsistency: a future production promotion could interpret the inherited LAFEA assessment policy as a WRC source rule. This PR fences that semantic boundary without mutating mechanics.

### A3 Authority / invariant — 20/20
Primary PDF identity is pinned, page-level thickness definition unavailable. Secondary guidance remains quarantined. Value/source/basis are treated as separate custody dimensions.

### A4 Independent validation — 18/20
This source-governance increment uses static falsifiers: changing any ledger flag to authorize nominal-minus-corrosion, explicit assessment, automatic CA subtraction, measured-minimum substitution or radius/thickness mixing must fail the checker. Runtime is NOT_RUN.

### A5 Minimal patch — 19/20
Four governance files only. Abandon/rework if live main introduces overlapping WRC thickness authority or directly verified primary evidence contradicts this fail-closed boundary.

**Score: 96/100; all questions >=18/20.**

## Next action
Before merge:
1. re-fetch live `main`;
2. audit any drift for EMP.1/WRC/thickness/source-custody overlap;
3. verify exactly four changed files;
4. verify PR mergeability and exact head;
5. merge with `expected_head_sha` only;
6. record result on #1375;
7. proceed to the next independent geometry/source-custody seam.
