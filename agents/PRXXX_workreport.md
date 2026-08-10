# PR1016 Work Report — LAFEA Appendix A Expert Review and Implementation

## Status

- **Repository:** `reallaksh19/Advanced_Analysis`
- **Source issue:** #1015 — `LAFEA UI update`
- **Pull request:** #1016 — draft
- **Branch:** `agent/lafea-appendix-a-workreport`
- **Current stage:** Stage 8 — viewport lifecycle/performance in progress
- **Last updated:** 2026-08-10
- **CI constraint:** Do not add GitHub Actions workflows or workflow-based CI gates. Use existing repository/local checks where available.

## Purpose

Persistent engineering log for the Appendix A review and authorized implementation. It records tasks, FEA/governance concepts, examples, validation, risks, and roadmap.

## Review baseline

Five Appendix answer-key areas required correction before coding:

- **Q1:** release was hardcoded at view, orchestration, and readiness layers.
- **Q2:** `-0 -> 0` is a useful canonical contract rule, but current `JSON.stringify(-0)` does not create a distinct JSON numeric representation.
- **Q6:** stable `sceneRevision` preserves identity/selection semantics; it does not prove viewport primitive caching.
- **Q9:** `executionHash()` is used only in the `QUALIFIED` execution branch, so timeout/failure is not a valid fallback example.
- **Q10:** 5-point Gauss-Legendre integrates curved-edge perimeter; boundary deviation uses separate explicit samples.

## Engineering concepts retained

### Release authority is not solver success

`source -> model -> preparation -> mesh -> authorization -> execution -> results -> release`

A successful solve cannot imply release if mesh/source/evidence lineage is stale or qualification evidence is incomplete.

### Warnings can remain usable

`Preparation: WARNING` can coexist with `Authorization: READY` when `usableForAuthorization === true` after governed review.

### Relative GCI near zero

`GCI_fine = Fs * abs((fine - medium) / fine) / (r^p - 1)` is ill-conditioned as the physical response approaches zero; an absolute or alternative normalization is required.

### Mesh evidence is custody evidence

A qualified mesh cannot be silently replaced without invalidating/rebuilding dependent analysis evidence.

### Canonical hashes require deterministic semantics

Locale-dependent ordering is unsuitable for cryptographic identity. Explicit zero normalization remains useful contract discipline.

### T6 checks use different parameter spaces

T6 area uses 2D triangular quadrature; curved-edge perimeter uses 1D Gauss-Legendre; maximum boundary deviation is sampled separately.

## Stage log

### Stage 1 — Report initialized — COMPLETE

- Created branch and persistent report.
- Reviewed all 10 Appendix A questions.
- Recorded corrections, concepts, examples, and roadmap.

### Stage 2 — PR allocated — COMPLETE

- Opened draft PR #1016 against `main`.
- Bound report to actual PR/branch.

### Stage 3 — Documentation baseline verified — COMPLETE

- Verified report was the only changed file at that stage.
- Confirmed no workflow/CI-gate file was added.

### Stage 4 — Release/diagnostic UI plumbing — COMPLETE

- Guided release badge consumes `workflow.releaseQualified` rather than hardcoded text.
- Orchestration `RELEASE` consumes readiness rather than a hardcoded blocked section.
- Machine reason codes remain canonical while UI presentation is human-readable.
- Solver/result/report completion alone still cannot create release authority.

### Stage 5 — Guided workflow truthfulness — COMPLETE

- Analysis Profile requires lifecycle/profile/current binding rather than document presence alone.
- Materials/Sections, Restraints/BCs, and Loads/Cases use stage-specific governed collection checks.
- Non-applicable generic workflow steps are explicit N/A instead of falsely READY.
- Added `scripts/lafea-ui-workflow-truthfulness-check.mjs` as a local, non-Actions regression check.

### Stage 6 — Analysis profile/settings UX — COMPLETE

**Source-contract correction**

The closed LAFEA.1 source contract does not currently declare the governing code/allowable/load-combination fields implied by the issue audit. The UI therefore exposes only real retained settings and explicitly reports missing code/allowable authority.

**Implemented**

- Added read-only `Analysis profile and settings` card.
- Guided Analysis Profile navigation targets the card.
- Shows lifecycle profile/binding, source identity/schema/version, formulation, qualification profile, thickness policy, requested analyses/cases, units, qualification details, and limitations when present.
- Added `scripts/lafea-ui-analysis-settings-check.mjs` as a local, non-Actions check.

### Stage 7 — Authoritative release-record binding — COMPLETE

**Governance result**

Workbench release state can now consume `lafea-template-release-record/v2`, but a release record is deliberately insufficient by itself. Release qualification requires an integrity-valid record plus independent runtime trust and current engineering identity.

**Four independent gates**

1. **Trusted evidence origin** — host allow-list via `authorizedReleaseEvidenceHashes`.
2. **Exact build identity** — host `currentCandidateHeadSha` must equal record `candidateHeadSha`.
3. **Current target authority** — rerun `evaluateTemplateTargetCompatibility()` against the current target-authority snapshot.
4. **Current analysis-source authority** — lifecycle/source/profile/authority hash/document revision must remain current and equal.

Only after those gates pass does the binding honor:

`authorityState === RELEASE_QUALIFIED && validity === CURRENT && releaseQualified === true`

**Trust-anchor concept**

A SHA-256 inside a release record proves integrity, not provenance. The host evidence-hash allow-list separates:

`record integrity -> trusted provenance -> exact build -> current target -> current source -> release projection`

**Public integration**

Host/controller configuration accepts `currentCandidateHeadSha` and `authorizedReleaseEvidenceHashes`; controller/store methods register/select/project release records, and lifecycle export carries the retained record and current binding projection.

**Validation**

- Final release-binding module is 292 lines.
- Local Stage 7 script covers trust anchor, exact head, target compatibility, source staleness and tamper rejection.
- Local scripts are committed but unexecuted in this environment because no checkout/network clone is available.
- No workflow file added.

### Stage 8 — Viewport lifecycle/performance — IN PROGRESS

**Problem confirmed**

`LafeaWorkbenchView.render()` currently destroys `activeViewport` before every render, while `renderLafeaWorkbenchContent()` always creates a fresh viewport host and calls `mountLafeaLiveWorkbenchViewport()`. `sceneRevision` preserves scene identity and selection validity but does not prevent reconstruction.

**Planned implementation**

1. Compute a viewport dependency signature from the exact inputs that affect the mounted renderer: active stage, scene revision, render-packet object, effective retained mesh evidence, and mesh custody state.
2. Reuse the existing viewport instance and DOM host only when that complete dependency signature is unchanged.
3. Reparent the existing viewport host into freshly rendered workbench content so workflow/results/lifecycle panels may update without destroying the renderer.
4. When dependencies change, build the replacement viewport first and destroy the old viewport only after the replacement mount succeeds. This makes replacement atomic at the composition boundary and avoids deliberately creating an empty viewport interval.
5. Preserve source selection and retained-mesh focus because the reused viewport keeps its own interaction state and the workbench scene maps remain unchanged.
6. Continue rebuilding for engineering-scene changes, result packet changes, mesh-evidence changes, custody-state changes, and stage changes.
7. Do not introduce asynchronous rendering, caching of engineering primitives, or a mutable scene-update authority in this stage.

**Examples**

- Registering a preparation approval or release record without changing scene/render evidence -> reuse the existing viewport.
- Editing source geometry -> `sceneRevision` changes -> rebuild viewport.
- Binding a new qualified result render packet -> render-packet identity changes -> rebuild viewport.
- Revalidating mesh custody from WARNING to PASS -> custody dependency changes -> rebuild overlay/viewport.
- Clicking within the viewport and causing local selection state -> no workbench rebuild is required; if an unrelated workbench render occurs, same-input reuse preserves that selection.

**Validation planned**

- Add a repository-local Stage 8 regression/static contract check; do not wire it into GitHub Actions.
- Inspect changed paths and ensure no workflow file appears.
- Keep existing public renderer authority unchanged: source authoring remains SVG-only and qualified results still use the existing hybrid result route.

## Future roadmap

### Stage 9 — Numerical verification UX

- Present convergence: mesh sizes, observed order, Richardson extrapolation, GCI, and blocking reasons.
- Present mesh qualification separately: area, perimeter, boundary deviation, midside placement, topology, and Jacobian evidence.
- Distinguish near-zero relative-GCI inapplicability from genuine non-convergence.

## Validation policy

No new GitHub Actions workflows or workflow CI gates will be added. Prefer existing `check:lafea-*` scripts and direct module-level checks. Repository-local checks may be added only when needed by existing project convention and will not be wired to a new workflow under this authorization.
