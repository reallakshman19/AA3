# WIP-1371C — Issue #1371 PR-C LAFEA.4 Model → Mesh → Analyse → Output closure

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY_FOR_IMPLEMENTATION
PR_RECOVERY_STATE: NEW_PR_REQUIRED
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
PHASE_PROGRESSION: AUTO
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_TASK: Issue #1371
PR_OR_WIP: WIP-1371C
BRANCH: agent/issue-1371-pr-c-lafea4-closure-20260824
REPORT_BASIS_HEAD: 1176f66eb94686f99d4f302930d46f17ff876083
MAIN_HEAD_LAST_CHECKED: 1176f66eb94686f99d4f302930d46f17ff876083
MERGE_BASE: 1176f66eb94686f99d4f302930d46f17ff876083
APPENDIX_A_STATUS: PASS 96/100 from #1371; phase re-grounded
GROUNDING_EPOCH: GE-1371C-01
CURRENT_STAGE: PR-C implementation
CURRENT_BLOCKER: none
HIGHEST_RISK: presenting derived/smoothed shell values as engineering authority or widening current remesh constraint authority
EXACT_NEXT_ACTION: make the current LAFEA.4 Sample itself own the existing qualified uniform pressure case and add a concise retained-result shell summary using only surface/integration-point result evidence, reactions/equilibrium and retained custody hashes.
```

## Ground truth

Current Sample is `CYLINDRICAL_PIPE_SHELL_BENCHMARK`, 26 source nodes / 24 source triangles, analytic cylinder R=100 mm, L=50 mm, 60° span. The Sample currently inherits an empty `LC`; the existing compiled-execution qualification mutates a cloned Sample to a uniform `PRESSURE` case at 1.2 MPa over every source element. Therefore product Sample and qualified shell-load regression are unnecessarily different.

The current LAFEA.4 compiler only qualifies whole-surface identical global translation constraints, whole-surface zero local rotations, no remeshed nodal-force transfer, and whole-surface uniform pressure/sense. Partial edge clamps are explicitly `NO_PARTIAL_BOUNDARY_CONSTRAINT_TRANSFER`; this PR will not widen that authority. The current Sample remains fully restrained, so the product proof is a nonzero pressure/reaction/equilibrium case while independent B4-1/B4-2 response accuracy remains PR-A authority.

`lafea-results-view.js` currently builds primary engineering highlights for LAFEA.1/.2/.3 only. LAFEA.4 therefore ends at the general result presentation/plot/raw evidence without the concise shell engineering summary required by #1371.

## Approved PR-C scope

- add a reusable cylindrical uniform-pressure fixture helper and make the current LAFEA.4 Sample use it;
- preserve source node coordinates/connectivity and current source-vs-canonical winding custody;
- add LAFEA.4 engineering highlights from retained `LOCAL_SHELL_RESULT` only:
  - max translational displacement;
  - max authoritative surface/IP von Mises;
  - max |combined surface sigmaX|;
  - max translational reaction force and tangent reaction moment;
  - applied force/moment resultant magnitudes;
  - force/moment equilibrium residuals and per-case PASS/FAIL disclosure;
  - retained mesh, execution/result/recovery custody hashes;
- explicitly state surface/IP authority and no nodal stress/smoothing substitution;
- strengthen existing focused shell Sample/compiled-execution checks.

Non-goals:
- no partial-boundary constraint transfer;
- no solver/formulation/mesh-quality/recovery change;
- no MITC/drilling/thick-shell/contact/weld/code authority;
- no benchmark target/tolerance changes;
- no workflow YAML changes;
- no new browser contract per owner instruction; existing Chromium lane remains the browser carrier;
- no release authority.

## Overlap

Open PR1388 owns new B4 freeze definitions and `scripts/lafea-shell-response-acceptance-check.mjs`; PR-C will not touch those paths or expected values. Search found no active open PR claiming the planned Sample/result-view paths. Classification: SAFE.

## Hypothesis / falsifier

```text
Hypothesis: moving the already-qualified 1.2 MPa whole-surface pressure case into the current Sample and extracting only retained shell result fields closes the product gap without changing numerical authority.
Falsifier: source normalization/topology changes, solver binding becomes BLOCKED, pressure does not compile losslessly to every retained element, force/moment equilibrium fails, or summary requires nodal smoothing/display interpolation/unsupported derived stress authority.
```

## Validation truth at grounding

All new exact-head checks are NOT_RUN. The existing Chromium Actions lane has recently failed before checkout/steps due runner allocation; that condition is infrastructure NOT_RUN, not engineering FAIL.
