# PR1479 — B01 B-bar element translation-nullspace representation repair

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY_FOR_CONTINUATION
PR_RECOVERY_STATE: CLEAN_CURRENT_MAIN_SUCCESSOR
TAKEOVER_AUTHORITY: WRITE_ALLOWED_WITHIN_ELEMENT_NULLSPACE_SCOPE
EXECUTION_MODE: OWNER_DIRECTED
CRITICALITY: ENGINEERING_CRITICAL
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_ISSUE: #1100
SOURCE_PREDECESSOR: PR #1258
PR: #1479
BRANCH: agent/lafea-b01-nullspace-current-main-20260826
BASE_BRANCH: main
BASE_HEAD_LAST_CHECKED: bd51eb25875702322b60c706f6b6c7af507c1665
CURRENT_STAGE: ELEMENT_TRANSLATION_NULLSPACE_REPAIR_IMPLEMENTED_EXECUTION_NOT_RUN
ENGINEERING_FAILURE_PROVEN_ON_CURRENT_HEAD: false
EXACT_NEXT_ACTION: from an exact clean checkout run `node scripts/lafea-b01-bbar-translation-nullspace-check.mjs`; if PASS continue existing B-bar kernel and frozen Lamé governing-case gates without changing solver mechanics.
```

## Handover in 60 seconds

PR #1479 is the clean current-main successor for the **first demonstrated numerical boundary only** from stale PR #1258.

PR #1258 is 691 commits behind current main and mixed two separate numerical mechanisms:

1. B-bar element-level binary64 planar-translation nullspace loss;
2. a later sparse fixed-cap residual-floor / special solver mechanism.

Issue #1100 requires sequential repair of one owning engineering boundary at a time. This PR therefore salvages only mechanism 1. The special equilibrated CG, compensated/DD sparse residual machinery, solver dispatch, mesh-quality policy edit and B02 work are deliberately excluded.

## Historical falsifier / first wrong boundary

For the frozen `T6/L4/nu=0.4999/REGULAR` case, the retained predecessor decomposition recorded:

```text
reaction imbalance UX                     -7.357309073086071e-8
reaction imbalance UY                     -4.7548454062962264e-8
summed free residual UX                    +8.688617895272798e-10
summed free residual UY                    +6.175070082734687e-10
stored full-K translation action UX        -7.270422894133344e-8
stored full-K translation action UY        -4.693094705468879e-8
reaction acceptance limit                   2.427520890326532e-8
```

The dominant discrepancy was therefore the stored B-bar element/global stiffness translation action, not the later sparse residual floor and not an acceptance tolerance.

These values are historical provenance from #1258, not current-head execution PASS.

## Mechanics of the bounded repair

For local displacement ordering:

```text
[UX1, UY1 | UX2, UY2, ...]
```

partition the symmetric element stiffness as:

```text
K = [ A   B^T ]
    [ B    H  ]
```

For either planar rigid translation, retained nodal DOFs repeat the dependent translation through `R`. Exact translation nullspace requires:

```text
B + H R = 0        => B = -H R
A + B^T R = 0      => A = R^T H R
```

The production helper therefore retains the independent/deformational block `H` up to symmetric binary64 roundoff normalization and reconstructs only the dependent translation block/couplings:

```text
K = [ R^T H R   -R^T H ]
    [   -H R        H   ]
```

It does **not** project rotation and does not alter the B-bar constitutive split, mean dilatation, quadrature, material, thickness, mesh or load.

## Machine-roundoff guard, not engineering tolerance

The correction envelope is:

```text
4096 * Number.EPSILON * localDofCount
```

relative to local stiffness scale.

Two independent fail-closed guards are enforced:

1. maximum matrix correction / stiffness scale must remain inside the envelope;
2. the corrected `K*Tx` / `K*Ty` action / stiffness scale must remain inside the same envelope.

Failure codes:

```text
LAFEA_BBAR_TRANSLATION_NULLSPACE_CORRECTION_EXCEEDS_ROUNDOFF_ENVELOPE
LAFEA_BBAR_TRANSLATION_NULLSPACE_RESIDUAL_EXCEEDS_ROUNDOFF_ENVELOPE
```

This is a representation admissibility guard. It is not a benchmark acceptance tolerance and cannot make a physically non-translation-invariant matrix pass.

## Evidence custody correction relative to stale #1258

A defect was found while salvaging #1258: its helper computed `translationNullspace` evidence, but its T6/Q8 `bbarEvidence` construction did not publish that field. Thus the corrected stiffness could be used while the claimed before/after translation action and correction magnitude were dropped from production element evidence.

PR #1479 fixes that seam explicitly:

```text
bbarStiffnessMatrix()
→ translationNullspace evidence
→ t6ElementEvidence().bbarEvidence.translationNullspace
→ q8ElementEvidence().bbarEvidence.translationNullspace
→ retained production element evidence / execution custody
```

## Focused independent falsifier

`scripts/lafea-b01-bbar-translation-nullspace-check.mjs` covers T6 and Q8 at:

```text
nu = 0.30, 0.45, 0.49, 0.499, 0.4999
```

For each case it:

- obtains production B-bar element evidence;
- requires the retained nullspace schema/method and non-authorizing flags;
- independently recomputes `K*Tx` and `K*Ty` with a separately implemented compensated matrix-vector action;
- compares that independent action with the retained production evidence;
- requires the relative action and correction to remain inside the roundoff guard;
- proves ordinary plane stress receives no B-bar repair evidence.

Negative control:

```text
corrected T6 B-bar K
+ dependent K[0][0] perturbation = 1e-6 * stiffnessScale
→ production helper must reject as non-roundoff correction
```

The focused check does not call the sparse solver and cannot grant engineering/release authority.

## Exact changed-file ledger at source-complete stage

Production:

```text
src/core/local-continuum/planar-translation-nullspace.js
src/core/local-continuum/bbar-plane-strain.js
src/core/local-continuum/t6-element.js
src/core/local-continuum/q8-element.js
```

Focused qualification:

```text
scripts/lafea-b01-bbar-translation-nullspace-check.mjs
```

Recovery:

```text
agents/PR1479_workreport.md
agents/status/PR1479.yaml
agents/claims/PR1479.yaml
```

## Explicitly excluded paths / authority

```text
src/core/local-continuum/solver.js                         unchanged
src/core/local-continuum/jacobi-equilibrated-cg.js        not added
src/core/local-continuum/sparse-matrix.js                  unchanged
src/workspace/lafea-analysis-mesh-quality.js               unchanged
.github/workflows/**                                        unchanged
validation/** benchmark/oracle/tolerance definitions        unchanged
stage registry / release / trust authority                 unchanged
B02                                                         unchanged
```

No iteration cap, solver convergence target, engineering tolerance, benchmark expected value, probe, mesh definition, load or constitutive coefficient is changed.

## Validation truth

```text
live current-main grounding                     PASS_GITHUB_READBACK
predecessor staleness classification             PASS_SOURCE_INSPECTION
first-boundary RCA custody                       PASS_HISTORICAL_PROVENANCE
one-mechanism scope separation                    PASS_SOURCE_INSPECTION
T6/Q8 production evidence retention               PASS_SOURCE_INSPECTION
non-Bbar path unchanged by dispatch               PASS_SOURCE_INSPECTION
focused executable nullspace check                NOT_RUN
existing B-bar kernel check                       NOT_RUN
frozen Lamé governing-case diagnostic             NOT_RUN
integrated B01 qualification                      NOT_RUN
```

Agent-local checkout remains unavailable because direct GitHub materialization fails with:

```text
Could not resolve host: github.com
```

That is an execution-environment blocker, not an engineering FAIL. Historical #1258 workflow PASS observations are not promoted to current-head evidence.

## Required execution sequence

From an exact clean PR1479 checkout, stop at the first authoritative failure:

```bash
node scripts/lafea-b01-bbar-translation-nullspace-check.mjs
node scripts/lafea-plane-strain-bbar-kernel-check.mjs
node scripts/lafea-b01-bbar-lame-diagnostic.mjs
node scripts/lafea-plane-strain-bbar-qualification-check.mjs
```

If the frozen governing T6/L4/nu=0.4999 case still exposes the historical fixed-cap sparse residual floor **after** this element repair passes, that is evidence for a separate solver PR. Do not add solver mechanics to PR1479.

## Coordination

- #1258 — stale mixed-mechanism predecessor; superseded for implementation by #1479.
- #1259 — B02D V2 successor remains dependent on a qualified B01 prerequisite and must not be retargeted/promoted from this source-only state.
- #1432 — merged retained-refinement work; no exact path overlap with #1479.

## ISS / RISK / DEC

- `ISS-1479-01` ACTIVE_PENDING_EXECUTION — current-head nullspace and frozen Lamé cases have not executed.
- `ISS-1479-02` RESOLVED_BY_IMPLEMENTATION_PENDING_EXECUTION — B-bar translation repair is isolated from sparse solver mechanics.
- `ISS-1479-03` RESOLVED_BY_IMPLEMENTATION_PENDING_EXECUTION — stale #1258 nullspace evidence-retention seam is closed for T6/Q8.
- `RISK-1479-01` CONTROLLED — non-roundoff matrix changes fail closed.
- `RISK-1479-02` CONTROLLED — rotation is not projected.
- `RISK-1479-03` CONTROLLED — ordinary plane stress does not enter the B-bar repair path.
- `DEC-1479-01` — repair the first demonstrated element representation boundary before any solver mechanism.
- `DEC-1479-02` — use a binary64 roundoff envelope, never an engineering tolerance, as the representation guard.
- `DEC-1479-03` — retain nullspace evidence in production T6/Q8 element evidence.
- `DEC-1479-04` — final B01 receipt hardening waits for actual numerical PASS.

## Appendix A — takeover qualification

```text
A1 Production trace / first wrong boundary          20/20
A2 FEM nullspace derivation and falsifier           20/20
A3 Authority / tolerance boundary                   20/20
A4 Independent validation design                    19/20
A5 Minimal patch / successor sequencing             20/20
TOTAL                                                99/100
MINIMUM                                              19/20
```

Points are withheld because current-head execution is unavailable. This Appendix is handover qualification, not a numerical PASS.
