# PR1016 Work Report — LAFEA Appendix A Expert Review

## Status

- **Repository:** `reallaksh19/Advanced_Analysis`
- **Source issue:** #1015 — `LAFEA UI update`
- **Pull request:** #1016 — `Document LAFEA Appendix A expert review and roadmap`
- **Branch:** `agent/lafea-appendix-a-workreport`
- **Report path:** `agents/PRXXX_workreport.md`
- **Current stage:** Stage 3 — documentation stage verified
- **Last updated:** 2026-08-10
- **CI constraint:** Do not add GitHub Actions workflows or new workflow-based CI gates. Use existing repository/local checks when code implementation begins.

---

## 1. Purpose

This is the persistent engineering work report for the review of **Appendix A — Expert Screening Questions** in issue #1015.

The Appendix is implementation-specific and touches more than UI behavior. The review covers FEA governance, canonical engineering identity, mesh chain of custody, convergence, release qualification, viewport lifecycle, and T6 geometric verification.

The purpose of this report is to preserve four things throughout the work:

1. tasks actually completed;
2. the engineering concept behind each decision;
3. concrete examples showing why the decision matters; and
4. the future implementation roadmap.

This report must be updated as work progresses through later stages.

---

## 2. Tasks Completed

### 2.1 Appendix A recovered and reviewed

All ten expert-screening questions from issue #1015 were recovered and evaluated against current repository code rather than accepting the supplied answer key verbatim.

### 2.2 Implementation paths inspected

Primary files checked:

- `src/workspace/lafea-guided-workflow-view.js`
- `src/workspace/lafea-guided-workflow.js`
- `src/workspace/lafea-workbench-orchestration-projection.js`
- `src/workspace/lafea-workbench-readiness.js`
- `src/workspace/lafea-canonical-sha256.js`
- `src/workspace/lafea-bucket-01-convergence.js`
- `src/workspace/lafea-analysis-mesh-custody-controller.js`
- `src/workspace/lafea-workbench-view.js`
- `src/workspace/lafea-live-workbench-viewport.js`
- `src/workspace/lafea-source-workbench-viewport.js`
- `src/workspace/lafea-workbench-content.js`
- `src/workspace/lafea-bucket-01-mesh-qualification.js`

### 2.3 Key review findings

Five Appendix answer areas need correction or qualification before they should be used as a strict expert-screening key:

- **Q1 — Release state:** the problem is not only a hardcoded UI label. The orchestration `RELEASE` section is hardcoded blocked and `lafea-workbench-readiness.js` also hardcodes `releaseState: 'RELEASE_NOT_QUALIFIED'`.
- **Q2 — Negative zero:** explicit `-0 -> 0` normalization is a good canonical-data rule, but current `JSON.stringify(-0)` does not create a distinct JSON numeric representation. The supplied hash-divergence example is therefore not valid for the current serializer.
- **Q6 — Viewport recreation:** stable `sceneRevision` protects scene identity/selection semantics, but it is not evidence that source primitives are cached. The current viewport/model path is recreated during render. Lack of visible flicker mainly follows from synchronous destroy/remount before browser paint.
- **Q9 — Execution hash fallback:** `executionHash()` is only used in the `QUALIFIED` execution branch. A timeout/failure is not a valid example for the `canonicalInput.semanticHash` fallback in this function.
- **Q10 — T6 boundary checks:** 5-point Gauss-Legendre is used for curved-edge perimeter integration. Maximum boundary deviation is sampled separately with `BOUNDARY_SAMPLES = 16`.

---

## 3. Engineering Concepts and Examples

### 3.1 Release qualification is a separate engineering authority

**Concept**

Solver success and release authority are different states. A trustworthy FEA system should preserve a chain similar to:

`source -> model -> preparation -> mesh -> authorization -> execution -> results -> release`

Each downstream state must remain tied to current upstream evidence.

**Example**

A solve may complete successfully and produce stresses below allowable, yet release should still remain blocked if the source changed after execution, the retained mesh became stale, convergence evidence is absent, or required approval evidence is missing.

Therefore a view must never infer `Release = QUALIFIED` directly from `execution.status === 'QUALIFIED'`.

### 3.2 Canonical identity must encode engineering sameness deterministically

**Concept**

Hashes are useful for custody only if semantically identical engineering records produce the same canonical byte stream.

The canonicalizer explicitly normalizes `-0` to `0` and sorts keys using deterministic code-unit comparison.

**Example**

A node coordinate produced as IEEE-754 negative zero is physically the same location as positive zero. The canonical data contract should explicitly treat them the same. In current JavaScript JSON serialization they already serialize numerically as `0`, so the explicit normalization is best understood as contract clarity and future-proofing rather than a currently observable JSON hash fix.

### 3.3 Warning does not necessarily mean unusable

**Concept**

Preparation can be `WARNING` while still being approved for authorization through `usableForAuthorization === true`.

**Example**

An engineering review may retain a documented warning that is acceptable under the analysis procedure. The correct UI can legitimately show:

- `Preparation: WARNING`
- `Authorization: READY`

Turning all warnings into blockers would erase the distinction between "requires review" and "invalid for solve".

### 3.4 Relative GCI becomes ill-conditioned near a zero response

**Concept**

The fine-grid relative GCI contains division by the fine-grid response:

`GCI_fine = Fs * abs((fine - medium) / fine) / (r^p - 1)`

When `fine` approaches zero, the relative measure can become arbitrarily large or undefined even when the absolute solution is converging correctly.

**Example**

A symmetry-constrained displacement component may physically converge to zero. That quantity should use an absolute tolerance or another physically meaningful normalization instead of being classified as unconverged only because the relative denominator vanishes.

The current code also guards the medium observation because coarse-grid GCI divides by `medium`.

### 3.5 Mesh evidence is chain-of-custody evidence

**Concept**

A mesh is not merely a display object. Once it participates in qualification and authorization, its identity is part of the engineering evidence chain.

`registerAnalysisMeshEvidence()` protects current evidence from conflicting replacement. `recoverAnalysisMeshEvidence()` is a same-evidence recovery/replay path rather than an unrestricted overwrite path.

**Example**

If Mesh A was authorized for solve, importing Mesh B must not silently overwrite A while preserving the appearance of continuous analysis lineage. Dependent evidence must be invalidated or regenerated under the new mesh identity.

### 3.6 Scene revision is an identity boundary, not a cache guarantee

**Concept**

An unchanged `sceneRevision` says the engineering scene identity is unchanged. It does not automatically mean the renderer skipped reconstruction.

**Example**

Current `render()` destroys the active viewport and synchronously remounts a replacement. The browser normally paints after the task completes, so there is no intermediate blank frame. If future code splits destroy/remount across animation frames, asynchronous tasks, workers, or heavier rendering initialization, visible flicker or avoidable rebuild cost may appear.

A persistent viewport update/refresh contract would be more robust if rendering cost becomes significant.

### 3.7 Cryptographic canonical ordering must be locale-independent

**Concept**

Canonical hashes cannot depend on linguistic collation rules.

Using code-unit ordering gives a deterministic byte ordering. `localeCompare()` may sort non-ASCII keys differently depending on collation semantics.

**Example**

Keys containing accented Latin, Greek, case variants, or other Unicode text can have linguistic order different from simple code-unit order. A comparator change could alter the canonical JSON and hash without any engineering value changing.

### 3.8 Analysis profile is currently coupled to source/lifecycle state

**Concept**

`ANALYSIS_PROFILE` currently focuses the source card because there is no separate governed profile-authoring surface.

**Example future card**

A standalone profile/settings card should expose at least:

- profile ID/revision;
- governing code/standard basis;
- solver assumptions;
- stress quantity/classification method;
- allowable basis;
- load-combination policy;
- mesh/preparation requirements;
- lifecycle/binding identity.

If these fields become editable, changes must use governed actions with defined invalidation effects rather than direct UI scalar writes.

### 3.9 Input identity is weaker evidence than retained-result identity

**Concept**

The current priority is:

`result.semanticHash -> result.artifactHash -> canonicalInput.semanticHash -> null`

A result semantic hash best identifies engineering content; an artifact hash identifies the retained serialized artifact; the canonical-input hash proves what was requested to be solved but not the actual retained result.

**Example**

If a `QUALIFIED` execution unexpectedly has no result semantic/artifact hash but does retain the canonical-input hash, traceability to the requested analysis survives, but output identity is degraded. That fallback alone should not be treated as sufficient release-quality evidence.

### 3.10 T6 area and boundary integration use different parameter spaces

**Concept**

A T6 triangle has a two-dimensional parent domain for area integration, while each quadratic boundary edge has a one-dimensional parameter.

For a curved edge:

`x(t) = N1(t)x1 + N2(t)xm + N3(t)x2`

and arc length is:

`L = integral sqrt((dx/dt)^2 + (dy/dt)^2) dt`

Although coordinate derivatives are linear in `t`, their Euclidean norm is generally not polynomial, so a 2-point Gauss rule is not generally exact for curved T6 arc length. A 5-point rule improves perimeter accuracy.

**Important implementation distinction**

- triangular quadrature -> T6 area;
- 5-point 1D Gauss-Legendre -> curved-edge perimeter;
- explicit boundary samples -> maximum boundary deviation and related geometric checks.

---

## 4. Recommended Appendix A Corrections

1. **Q1:** Extend the expected answer to include the hardcoded readiness-layer `releaseState`, not only the orchestration and view layers.
2. **Q2:** Describe `-0` normalization as explicit canonical-data normalization/future-proofing. Remove the claim that current `JSON.stringify(-0)` by itself creates a different canonical JSON number.
3. **Q6:** Replace the unsupported primitive-cache statement with the actual synchronous destroy/remount behavior and the identity role of `sceneRevision`.
4. **Q9:** Replace the timeout example with a qualified execution whose result hashes are absent but canonical-input semantic identity remains present.
5. **Q10:** Separate edge/perimeter quadrature from boundary-deviation sampling.

---

## 5. Future Roadmap

### Phase A — Correct the expert-screening rubric

- Update Appendix A expected answers for Q1, Q2, Q6, Q9, and Q10.
- Keep the questions implementation-specific.
- Explicitly allow technically correct answers that identify defects in the supplied answer key.

### Phase B — Release authority architecture

- Locate the authoritative release record/state already present in lifecycle/application-template layers.
- Project that authority into workbench readiness.
- Drive orchestration `RELEASE` from readiness rather than a constant blocked section.
- Make the guided release badge dynamic only after upstream authority is real.
- Validate using existing repository check conventions; do not add a GitHub Actions workflow.

### Phase C — Guided workflow truthfulness

- Replace `ANALYSIS_PROFILE = COMPLETE when document exists` with actual profile readiness.
- Replace unconditional material/restraint/load `READY` shortcuts with stage-appropriate content checks.
- Preserve warning-vs-block distinctions.

### Phase D — Analysis profile/settings UX

- Add a dedicated read-only analysis profile/settings card first.
- Show code basis, allowable, stress method, combinations, assumptions, identity and lifecycle status.
- Add governed editing only after invalidation/custody semantics are explicit.

### Phase E — Viewport lifecycle/performance

- Measure the cost of current destroy/recreate behavior.
- Introduce persistent viewport update/refresh semantics if reconstruction is material.
- Preserve `sceneRevision` as an engineering identity contract rather than treating it as an undocumented cache API.

### Phase F — Numerical verification UX

- Add convergence presentation for mesh sizes, observed order, Richardson extrapolation, GCI and blocking reasons.
- Distinguish near-zero relative-GCI inapplicability from true non-convergence.
- Present mesh qualification evidence separately for area, perimeter, boundary deviation, midside placement, topology and Jacobian checks.

---

## 6. Validation Strategy Under Low Action-Credit Constraint

No new `.github/workflows/*` files, GitHub Actions workflows, or workflow-based CI gates are planned under this authorization.

For implementation stages, validation should prefer:

1. existing targeted `check:lafea-*` scripts;
2. direct module-level checks for modified controllers/projections;
3. existing aggregate local checks where practical;
4. manual lifecycle/evidence transition review for governance-sensitive paths.

A repository-local check script can be added later only if needed by existing project conventions, but it must not be wired into a new GitHub Actions workflow as part of this work.

---

## 7. Stage Log

### Stage 1 — 2026-08-10 — Report initialized

**Completed**

- Created branch `agent/lafea-appendix-a-workreport` from `main`.
- Created `agents/PRXXX_workreport.md`.
- Recorded the Appendix A review and code paths inspected.
- Added engineering concepts and examples.
- Added corrections for Q1/Q2/Q6/Q9/Q10.
- Added the future roadmap.
- Recorded the no-new-workflow-CI constraint.

### Stage 2 — 2026-08-10 — PR allocated and report synchronized

**Completed**

- Opened draft PR **#1016** against `main`.
- Recorded the actual PR number and branch in this report.
- Reorganized the report so tasks, concepts/examples, corrections, roadmap, and validation constraints are explicit sections.
- Confirmed this PR remains documentation-only at this stage.

### Stage 3 — 2026-08-10 — Documentation stage verified

**Completed**

- Queried the PR changed-file set after the Stage 2 update.
- Verified PR #1016 contains exactly one changed path: `agents/PRXXX_workreport.md`.
- Verified no `.github/workflows/*` path or other CI/workflow file is present in the PR.
- Confirmed the branch currently contains documentation only; no solver, mesh, lifecycle, UI, or governance implementation has been modified yet.
- Marked the documentation/control stage complete while leaving the PR in draft for subsequent authorized implementation stages.

**Rule for future stages**

Before each logical implementation stage, add the planned scope and engineering rationale here. After the stage is committed, update this log with files changed, behavior changed, examples/edge cases covered, validation performed, and any remaining risks. Continue to avoid new GitHub Actions workflow gates unless the authorization is explicitly changed.
