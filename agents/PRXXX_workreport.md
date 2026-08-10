# PRXXX Work Report — LAFEA Appendix A Expert Review

## Status

- **Repository:** `reallaksh19/Advanced_Analysis`
- **Source issue:** #1015 — `LAFEA UI update`
- **Branch:** `agent/lafea-appendix-a-workreport`
- **PR:** pending allocation
- **Current stage:** Stage 1 — report initialized
- **Last updated:** 2026-08-10
- **CI policy for this work:** No GitHub Actions workflows or new CI gates are to be added. Validation should use existing local/repository checks only when implementation work begins.

---

## 1. Purpose

This report records the engineering review performed against **Appendix A — Expert Screening Questions** in issue #1015 and preserves the reasoning behind the conclusions.

The review is intentionally broader than UI wording. The Appendix touches FEA governance, canonical identity, mesh chain of custody, numerical convergence, release qualification, viewport lifecycle, and curved quadratic-element geometry checks. The objective is to distinguish:

1. what the current code actually does;
2. what the Appendix expected answer says it does;
3. what is numerically/architecturally correct for an engineering analysis system; and
4. what should be changed later without weakening auditability.

This report is a documentation/control artifact only. It does **not** itself alter solver equations, mesh qualification criteria, lifecycle authority, or release state.

---

## 2. Tasks Completed

### 2.1 Appendix A recovery and review

Recovered all ten expert-screening questions from issue #1015 and reviewed their stated expected answers against the current repository implementation.

### 2.2 Code paths inspected

The review checked the implementation paths relevant to the questions, including:

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

### 2.3 Main findings

The overall Appendix is useful and tests the right engineering themes, but several expected answers need correction or qualification:

- **Q1:** The release problem exists at more than the view layer. The orchestration `RELEASE` section is hardcoded blocked, and `lafea-workbench-readiness.js` also hardcodes `releaseState: 'RELEASE_NOT_QUALIFIED'`.
- **Q2:** Explicit `-0` normalization is good canonicalization practice, but the supplied example claiming `JSON.stringify(-0)` would produce a different JSON number is not correct for the current JavaScript serialization path.
- **Q6:** Stable `sceneRevision` preserves identity/selection semantics, but current code still recreates the viewport/model. The absence of visible flicker is principally because destroy and remount occur synchronously in one JavaScript task, not because primitive synthesis is proven to be cached.
- **Q9:** `executionHash()` is called only for `execution.status === 'QUALIFIED'`. A timeout/failure is therefore not a valid example of the `canonicalInput.semanticHash` fallback path in this function.
- **Q10:** The 5-point Gauss rule is used for curved-edge **perimeter integration**. Maximum boundary deviation is sampled separately using `BOUNDARY_SAMPLES = 16` (17 sample positions per edge). The Appendix currently conflates those two operations.

---

## 3. Engineering Concepts and Examples

### 3.1 Release qualification is not solver success

**Concept:** A numerically successful FEA result is not automatically an engineering release.

A robust analysis workflow separates at least these states:

`source accepted -> model current -> preparation acceptable -> mesh qualified -> solve authorized -> execution retained -> results current -> release qualified`

The current guided UI computes `releaseQualified` from the orchestration `RELEASE` state, which is the right dependency direction. The problem is that the upstream release state is currently hardcoded as blocked.

**Example:**

A nonlinear or linear solve may converge and produce stress values, but release should remain blocked if any of the following is unresolved:

- source/model identity changed after the run;
- retained mesh no longer matches the authorized mesh;
- required convergence evidence is absent;
- code assessment or allowable basis is not current;
- review/approval evidence required by the lifecycle is missing.

Therefore the UI must not infer `QUALIFIED` from `execution.status === 'QUALIFIED'` alone.

### 3.2 Canonical identity must represent engineering sameness

**Concept:** Cryptographic hashes are useful only when the serialization contract is deterministic and aligned with engineering identity.

The repository canonicalizer sorts keys deterministically and normalizes negative zero before serialization. This makes the intended canonical data model explicit.

**Example:**

Two node records representing the same physical origin should not be treated as different custody evidence merely because one coordinate was generated from an operation resulting in IEEE-754 `-0`.

However, in the current implementation, `JSON.stringify(-0)` already serializes numerically as `0`. The explicit normalization is still valuable as a contract and future-proofing measure, but the current Appendix example should not claim a presently observable hash split from JSON serialization alone.

### 3.3 Warnings can be usable without being invisible

**Concept:** A preparation state can be `WARNING` while still being explicitly approved for authorization.

`authorizationSection()` correctly checks `preparation.usableForAuthorization` rather than requiring the preparation display state to be `COMPLETE`.

**Example:**

A mesh/preparation review may contain a documented warning that is acceptable under the governing analysis procedure. The user should see:

- Preparation: `WARNING`
- Authorization: `READY`

when the warning has been explicitly judged usable. Converting every warning to a hard block would destroy the distinction between review-required and invalid analysis states.

### 3.4 Relative GCI is ill-conditioned near a zero response

**Concept:** The fine-grid GCI formula divides by the fine-grid response. Relative error is therefore unsuitable when the physically correct response is close to zero.

For a typical three-grid GCI expression:

`GCI_fine = Fs * abs((fine - medium) / fine) / (r^p - 1)`

`fine -> 0` causes the relative measure to become unbounded or undefined even if the absolute solution is legitimately converging toward zero.

**Example:**

A symmetry-constrained displacement component may converge toward exactly zero. Such a quantity should use an absolute convergence measure or an independently selected physical normalization scale rather than failing solely because the denominator approaches zero.

The current implementation also guards the medium observation because coarse-grid GCI divides by the medium response.

### 3.5 Mesh evidence is a custody-controlled artifact

**Concept:** A qualified mesh cannot be silently replaced while remaining under the same apparent analysis lineage.

`registerAnalysisMeshEvidence()` applies conflict protection before replacing retained evidence. `recoverAnalysisMeshEvidence()` is intended as a recovery/replay mechanism, not a second unguarded mesh-replacement API.

**Example:**

If Mesh A was qualified and authorized, importing Mesh B after authorization must not simply overwrite Mesh A while leaving the lifecycle appearing current. The new mesh must establish a new valid custody state and invalidate/rebuild dependent evidence as required.

This is analogous to specimen/evidence chain-of-custody practice: identity replacement is an engineering event, not merely a UI update.

### 3.6 Scene revision is an identity contract, not proven caching

**Concept:** Stable scene revision tells downstream components that engineering scene identity has not changed. It does not by itself prove that rendering primitives were memoized.

The current `LafeaWorkbenchView.render()` destroys the active viewport and mounts a replacement synchronously. That normally avoids a visible blank frame because the browser does not paint between those synchronous operations.

**Example future failure:**

If destruction and remount are later split across `requestAnimationFrame`, asynchronous rendering, a worker boundary, or a heavier WebGL initialization path, a blank frame or repeated expensive initialization may become visible. A persistent viewport with an update/refresh contract would then be preferable.

### 3.7 Canonical key sorting must be locale-independent

**Concept:** A hash identity contract cannot depend on locale-sensitive collation.

The current plain code-unit comparison is deterministic. Replacing it with `localeCompare()` would make ordering semantics dependent on collation behavior for classes of non-ASCII keys.

**Example:**

Accented Latin characters such as `é`, Greek characters, case-sensitive names, or other Unicode keys can have linguistic ordering that differs from code-unit ordering. If such a key appears in a hashed engineering record, changing comparator semantics can alter the canonical byte stream without changing the underlying engineering values.

### 3.8 Analysis profile is currently coupled to source/lifecycle binding

**Concept:** The guided workflow sends `ANALYSIS_PROFILE` to the source card because there is currently no independent analysis-profile authoring surface.

**Example future design:**

A proper profile card should show or govern:

- profile identifier/revision;
- code/standard basis;
- solver assumptions;
- stress quantity/classification method;
- allowable basis;
- load-combination policy;
- mesh/preparation requirements;
- binding hash and lifecycle status.

If profile edits are allowed, they must be governed commands that invalidate dependent artifacts where appropriate. A simple UI scalar mutation is insufficient.

### 3.9 Input identity is weaker than retained-result identity

**Concept:** `result.semanticHash` is preferable to an artifact hash because it identifies engineering result content independent of incidental serialization. `artifactHash` identifies the retained blob. `canonicalInput.semanticHash` identifies what was requested to be solved, not necessarily the output.

**Example:**

For a qualified execution whose result object unexpectedly has neither semantic nor artifact hash, the canonical input hash provides traceability to the requested analysis but cannot prove the identity of the retained numerical result. Such a degraded state should not by itself be treated as release-quality evidence.

### 3.10 T6 area integration and curved-edge integration are different numerical problems

**Concept:** A T6 triangular element has a 2D parent domain, while each boundary edge is a 1D quadratic parametric curve.

The area calculation correctly uses triangular quadrature in `(xi, eta)`. Arc length uses a 1D Gauss-Legendre rule along the edge parameter.

For a quadratic edge:

`x(t) = N1(t)x1 + N2(t)xm + N3(t)x2`

and

`L = integral sqrt((dx/dt)^2 + (dy/dt)^2) dt`.

Although `dx/dt` and `dy/dt` are linear, the square-root norm is generally not a polynomial; therefore a 2-point rule is not generally exact for curved T6 edge length. A 5-point rule gives a more accurate perimeter estimate.

**Important distinction:** The implementation uses this 5-point Gauss rule for **edge length/perimeter**, while boundary-deviation maxima are estimated separately through uniformly spaced boundary samples.

---

## 4. Recommended Corrections to Appendix A

1. **Q1:** Extend the expected answer to mention the hardcoded `releaseState` in `lafea-workbench-readiness.js`, not only the orchestration projection.
2. **Q2:** Reword the rationale around `-0` as canonical-model normalization/future-proofing. Remove the claim that current `JSON.stringify(-0)` alone creates a distinct canonical JSON representation.
3. **Q6:** Remove the unsupported claim that unchanged `sceneRevision` proves primitive re-synthesis is skipped. State that synchronous destroy/remount prevents intermediate paint, while stable revision preserves identity/selection semantics.
4. **Q9:** Replace the timeout example. The fallback applies only inside the `QUALIFIED` execution branch when result hashes are absent but canonical-input semantic identity remains present.
5. **Q10:** Separate perimeter quadrature from boundary-deviation sampling. Keep the 1D-vs-2D quadrature explanation, but state that the 5-point rule integrates arc length while the maximum deviation check uses explicit samples.

---

## 5. Future Roadmap

### Phase A — Correct the screening rubric

- Update Appendix A expected answers for Q1, Q2, Q6, Q9, and Q10.
- Preserve the questions as implementation-specific screening questions.
- Add a note that engineering correctness overrides memorization of an answer key.

### Phase B — Release authority architecture

- Identify the authoritative release record/state already available in lifecycle/application-template layers.
- Project that state into `projectLafeaWorkbenchReadiness()`.
- Drive orchestration `RELEASE` from readiness rather than a constant blocked section.
- Only then make the guided-workflow release badge dynamic.
- Add existing-style unit/check-script coverage; do not create a GitHub Actions workflow.

### Phase C — Guided workflow truthfulness

- Replace `ANALYSIS_PROFILE = COMPLETE if document exists` with an actual profile-binding readiness test.
- Replace unconditional `READY` states for materials/restraints/loads with collection/content checks appropriate to each stage contract.
- Surface warnings separately from blockers.

### Phase D — Analysis settings/profile UX

- Add a dedicated analysis-profile/settings card.
- Initially make it read-only to expose code basis, allowables, stress measure, load combination and solver assumptions safely.
- Add governed mutation only after lifecycle invalidation rules are explicit.

### Phase E — Viewport lifecycle/performance

- Measure render/reconstruction cost with current SVG path.
- Introduce persistent viewport update/refresh semantics if repeated teardown becomes material.
- Preserve `sceneRevision` as an engineering identity boundary rather than overloading it as an implicit cache guarantee.

### Phase F — Numerical verification presentation

- Add a convergence evidence view showing the three mesh levels, observed order, Richardson extrapolation, GCI and reason codes in engineering terms.
- Clearly distinguish relative-GCI-inapplicable near-zero responses from genuinely unconverged responses.
- Add mesh-qualification evidence presentation separating area error, perimeter error, boundary deviation, midside placement and Jacobian/topology checks.

---

## 6. Validation Strategy Under Low Action-Credit Constraint

No new `.github/workflows/*` files or GitHub Actions gates are required or planned.

For later code changes, validation should prefer:

1. the repository's existing targeted `check:lafea-*` scripts;
2. direct module-level checks for the modified projection/controller;
3. existing aggregate local checks when practical;
4. manual review of lifecycle/evidence transitions for governance-sensitive paths.

A new check script may be added only if the existing repository convention requires one for the implementation, but it should remain a normal package/local check and **must not be wired into a new GitHub Actions workflow** under this work authorization.

---

## 7. Stage Log

### Stage 1 — 2026-08-10 — Report initialized

**Completed**

- Established branch `agent/lafea-appendix-a-workreport` from `main`.
- Created `agents/PRXXX_workreport.md` as the persistent work-report artifact.
- Recorded the ten-question Appendix A expert review.
- Documented the five answer-key corrections/qualifications identified during code inspection.
- Added FEA/governance concepts and concrete examples.
- Added a phased future roadmap.
- Recorded the explicit constraint that no GitHub Actions/CI workflow gates are to be added.

**Next stage**

- Open the documentation PR.
- Record the allocated PR number/link and branch metadata in this file.
- Re-read the committed report from the PR branch and update the stage log with the final documentation state.
