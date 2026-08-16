# PR1159 work report

## Mission and scope

Expose the complete Load Calc process as:

`Import JSON -> Topology Fix -> Project Data -> Import Masters -> Validate Input -> Run Calc -> View Loads`

The UI must remain fail-closed and must not create Project Data, master-data
authority, authorization, calculation results, or substitute source hashes.
Topology status must come from the same canonical checker used by 3D Edit.
Automatic repair is limited to source-backed, certified high-confidence
`SNAP_GAP` merges; no branch connection may be invented.

Current extension: group repeated canonical findings, expose a bounded and
configurable strict `< configured threshold` TopoFix policy with a maximum
configuration of `6 mm`, and retain explicit reviewed
skip receipts for non-auto-fix blockers so later reports preserve the raw
finding and its disposition.

Current audit extension: count only canonical topology findings as Issues;
retain visual-geometry derivation messages under a separate non-blocking
Rendering evidence section; classify source-described floor/fence penetrations
as `PENETRATION_ATTACHMENT`; and populate the owner-approved 1885S load basis
and density fallback policy without replacing exact master authority.

## Live ground truth

- Worktree: `F:/CODE-6/Advanced_Analysis`
- Active branch: `feat/master-data-persistence-and-load-calc-fixes`
- Current implementation commit: `05c0379c9535ecf5ec84e43b27f40fea55a946d7`.
- Current local `main`: `e553c0438402` (stale local reference; not mutated).
- Current `origin/main`: `58de0540` after a live fetch on 2026-08-16.
- Relative to current `origin/main`, this branch was 37 commits behind and two
  commits ahead before the Load Calc implementation commit. The remote branch
  was advanced by a non-forced push from `85c9b2ac` to `05c0379c`; prior PR
  #1136 remains merged and is not reused as evidence of review.
- Current delivery: draft PR #1159,
  `https://github.com/reallaksh19/Advanced_Analysis/pull/1159`, targeting `main`.
  GitHub currently reports the draft as `UNSTABLE`; base reconciliation and
  required checks remain pre-merge work.
- Local Vite server on port 5173 is launched from this worktree.
- PR #1157 is present on `origin/main`; this local branch predates its merge and
  contained unsafe calculation shortcuts in the files touched by this mission.
- Owner explicitly authorized proceeding without a backup.
- Existing unrelated dirty files, including `agents/WIP-HP-01_workreport.md`,
  were preserved.

## Decision and protected invariants

Decision: `SALVAGE_PARTIAL`. Apply the clean-main guided UI implementation to
the live worktree and remove conflicting unsafe shortcuts only in the same
execution path.

Workflow audit decision: remove the former `Error Check` step. It rendered the
same checker snapshot, finding list, blocker counts, and review actions already
owned by `Topology Fix`; it executed no independent validator and created no
additional evidence or gate. Topology Fix now owns the full checker readiness
gate and must not display `Done` while that gate remains blocked.

Protected invariants:

- Run Calc requires governed calculation eligibility.
- AnalysisCoordinator remains the calculation publication path.
- No fabricated master hashes or direct store calculation fallback.
- No solver, load-assembly, tolerance, recovery, or result-publication change.
- Raw checker findings remain immutable evidence. A skip is a dataset/check-
  bound review disposition and never deletes or rewrites the source finding.
- A skipped blocker changes the effective workflow state to `REVIEW_REQUIRED`,
  not `READY`; its reason and append-only receipt remain reportable.
- Automatic node merges continue through preview, certification, journal
  acceptance, and explicit workspace commit in 3D Edit.
- Only positive endpoint gaps strictly below the configured tolerance can be
  proposed. Coincident endpoints (`0.00 mm`) are not automatic merge requests.
- Visual derivation diagnostics remain immutable review evidence but never
  count as topology findings, TopoFix blockers, or automatic-fix candidates.
- Density resolution is exact scoped value first, then an explicitly declared
  and approved `DEFAULT`. Every fallback use must carry selector, authority,
  value, and configured-default usage-ledger evidence.

## Current failure isolation

- The former `CENTERLINE_CLASH` rule compared every non-shared-node edge pair
  at a default `0.5 mm` distance tolerance without distinguishing an interior
  crossing from endpoint contact.
- Real `benchmarks/Sjson.json` trace shows B2 fitting and generated `PIPE AUTO`
  edges with different canonical node IDs but identical engineering endpoint
  coordinates. The detector therefore mislabeled ordinary endpoint contact as
  a HIGH clash and rendered `0.00 mm`.
- The corrected invariant excludes endpoint-to-endpoint contact from both
  centerline and physical-clearance clash rules. Only a positive endpoint gap
  may become `SNAP_GAP`; true interior crossings/overlaps remain HIGH
  `CENTERLINE_CLASH` blockers.

### Real-Sjson false-finding audit (2026-08-16)

- Input/oracle: the imported `benchmarks/Sjson.json` (279 entities), the
  canonical topology adapter, the shared Wave 3A checker, and the approved
  branch-scoped route partition model. No simulated engineering data was used.
- `BRANCH_DISCONNECTED` 41/41 are false: the approved route model reports 13
  READY routes and zero blockers; every extra canonical fragment within a
  route is separated only by duplicate node identity at exactly `0 mm`.
- `SHORT_ELEMENT` 22/22 are false: every flagged element is an authoritative
  3.2 mm gasket, not a short pipe span.
- `OVERLAPPING_ELEMENTS` 3/3 are false: every pair is an intentional
  source component plus a fully coincident `AUTO_GENERATED_PIPE` topology
  carrier in the same branch.
- `UNDEFINED_KINK` 10/10 are false: every flagged turn is carried by reducer
  or tee geometry; eight also contain an AUTO carrier. The pipe-turn rule was
  being applied inside fitting geometry.
- `UNRESOLVED_RESTRAINT_DIRECTION` 108/108 are false: governed support
  geometry resolves all 108 directions from type-classified REST, GUIDE, or
  LINE_STOP evidence and the current host frame.
- `UNKNOWN_RESTRAINT_FAMILY` follow-on audit: 25/31 were non-restraint source
  reference points (`/SREF`) inside already grouped support assemblies. They
  carry no family/capability evidence and must not be presented as physical
  restraints. Two additional records explicitly describe floor openings/fence
  penetrations and are now source-classified as `PENETRATION_ATTACHMENT`, not
  restraints. Four physical attachment records remain genuine review findings:
  their source `SUPPORT_TYPE` evidence is empty and no approved capability
  mapping exists (`PIPE SUPPORT TYPE-103`, two `ATTY=SSSS` records, and one
  contractor bracing attachment).

### Project Data stage audit (2026-08-16)

- The Step 3 surface incorrectly aggregated three different scopes into one
  blocked total: 3 missing Project Data policy decisions, 4 fields owned by
  source/master resolution in Step 4, and 17 advanced method-policy fields
  that are not applicable until a consuming method is selected.
- Protected correction: Step 3 will gate only gravity, load factor,
  equilibrium tolerances, and active load cases. It will continue to show the
  master-supplied and method-scoped fields, but it will not call them current
  Project Data errors. Full calculation and common-input validation remain
  fail-closed on their existing exact authority checks.
- Bundled 1885S revision 4 now approves gravity `9.80665 m/s²`, load factor
  `1`, force/moment closure tolerances, and the existing `EMPTY/OPE/HYD` cases.
  It declares hydro density `DEFAULT=1000 kg/m³` and insulation density
  `DEFAULT=210 kg/m³` with two governed configured-default definitions.
  Material density and pipe section properties remain the only Step 4 load
  gaps; they were not guessed. Sixteen unrelated advanced-method fields remain
  deferred until a consuming method is selected.

## Validation ledger

- Live 5173 module source: `PASS` — the seven distinct process labels served;
  `Error Check` is absent.
- Guided Playwright acceptance: `PASS` — 4/4 on port 5173.
- Parallel Playwright timing: `FAIL` once at 4 workers — the certified TopoFix
  status assertion timed out while the draft remained unapplied. The same test
  passed immediately in isolation and the full 4-test spec passed with one
  worker. Preserve as a concurrency/timing risk; no engineering assertion was
  weakened.
- Real `benchmarks/Sjson.json`: `PASS` — 279 entities; Import JSON,
  reports Import JSON `Done`, Topology Fix `Fix needed`, and all downstream
  steps `Next`; Run Calc remains disabled.
- Workflow duplication audit: `PASS` — before removal, captured Topology Fix
  and Error Check both rendered the same 215 findings, 111 open blockers, six
  groups, Skip controls, and shared topology snapshot. After removal, the UI
  renders seven numbered steps and keeps the checker gate in Topology Fix.
- Visual audit evidence: `PASS` — accepted screenshots are stored in
  `test-results/load-calc-error-check-audit/`.
- Real topology-check handoff: `PASS` — Load Calc now reports 4 genuine
  `UNKNOWN_RESTRAINT_FAMILY` review findings in one grouped category, zero HIGH
  findings, and zero open blockers. The 209 false/inapplicable findings isolated above are
  absent. The real dataset has zero positive `SNAP_GAP` candidates and zero
  certified auto-fixes; changing the gap tolerance cannot invent an eligible
  source-backed fix.
- Certified auto-fix integration: `PASS` — browser case with a source-backed
  3 mm `SNAP_GAP` is excluded at a configured 3 mm threshold, included at a
  configured 4 mm threshold, prepares one certified and undoable gap-merge
  draft through the 3D Edit controller API, and leaves workspace commit as a
  separate explicit action.
- Auto-fix control clarity: `PASS` — setting the limit now produces inline
  success/failure feedback and is visually separate from execution. A stable
  `Prepare auto-fix (N)` button is disabled at zero candidates and enabled only
  when the shared checker certifies an eligible positive endpoint gap. Real
  `Sjson.json` reports the zero-candidate reason beside the controls.
- Skip/report integration: `PASS` — a grouped true interior crossing remains a
  blocker, requires a reason before Skip, produces a schema-bound SKIP receipt,
  downloads a JSON review record, persists across reload, and can be reopened
  with a RESTORE receipt.
- Endpoint-contact regression: `PASS` — distinct canonical endpoint IDs at the
  same coordinates do not produce `CENTERLINE_CLASH` or
  `PHYSICAL_CLEARANCE_CLASH`; disconnected topology is still reported by the
  connectivity rule.
- Step 2 containment: `PASS` — selecting Topology Fix renders the focused
  topology pane inside Load Calc. The global 3D editor opens only through the
  explicit advanced action when a corrective edit is required.
- Targeted syntax: `PASS`.
- Targeted ESLint: `PASS`.
- Diff whitespace check: `PASS`.
- Project Data validation: `PASS` for normalization, topology, editing, WebGL,
  benchmark, and the 4/4 Load Calc project basis. Full load validation remains
  correctly `FAIL` on only material density and pipe section properties.
- Focused Node engineering checks: `PASS` — 19/19 on the pre-push rerun across the Sjson restraint
  projection, canonical checker, visual fidelity, density precedence, and
  configured-default reporting ledger.
- Live browser acceptance: `PASS` — real `benchmarks/Sjson.json` shows four
  canonical findings, four spatial markers, an Issues badge of four, and 260
  collapsed Rendering evidence notes. Project Data revision 4 shows READY,
  4/4 basis, two Step 4 fields, 16 deferred method fields, and two default
  definitions with zero uses before calculation.
- Repository Playwright runner: `NOT_RUN` — all four workers failed before page
  creation because the pinned Chromium executable is absent from
  `node_modules/playwright-core/.local-browsers`; no product assertion ran.
- Vite production transform: `PASS` — 1,747 modules transformed on 2026-08-16.
- Repository bundle-size gate: `FAIL` — main chunk is 1,190,476 bytes
  against the existing 1,048,576-byte cap. The immediately preceding UI
  baseline was already failing. The heavy topology checker remains a separate
  approximately 40.34 kB lazy chunk and the finding-review store a separate
  approximately 6.49 kB lazy chunk; this extension adds approximately 6.9 kB
  to the main bundle and does not resolve the repository-wide cap breach.
- Existing public-dataset TopoFix oracle: `FAIL` —
  `tests/topology-edit-production-sjson-topofix.test.mjs` expects the current
  public `Sjson.json` to contain an approximately 3 mm gap, but the real file
  contains no such positive gap. Production data and expected values were not
  modified to force this stale assertion green.
- Newer standalone governance scripts: `NOT_RUN` in this worktree because the
  branch does not contain them. The same target implementation passed those
  checks in the clean `origin/main` worktree.

## Changed-file ledger

- `src/workspace/load-calc-consumer-view.js` — seven-step primary workflow,
  progression-aware statuses, in-workflow Topology Fix, advanced-tools
  disclosure, grouped canonical findings, configurable strict gap policy,
  per-finding Skip/Restore controls, report download, certified-fix
  availability, inline policy feedback, an explicit enabled/disabled Prepare
  auto-fix action, and the consolidated checker gate; duplicate Error Check UI
  removed. Non-gap findings now state the required evidence action and do not
  refer to the unrelated gap tolerance.
- `src/workspace/load-calc-consumer-controller.js` — guided navigation and
  presentation-only progression tracking and read-only readiness projection;
  routes certified auto-fix requests into the governed 3D draft API, applies
  policy configuration, persists Skip/Restore receipts, and exports review
  evidence; duplicate Error Check routing removed; unsafe automatic authority
  removed.
- `src/workspace/non-fea-input-check-view.js` — Validate Input step label
  renumbered from 6 to 5.
- `src/workspace/topology-edit/topology-edit-gap-autofix-policy.js` — shared
  strict bounded policy with a 6 mm maximum.
- `src/workspace/topology-edit/topology-edit-finding-review-store.js` — durable,
  integrity-checked append-only review receipts and dataset/finding-basis-bound
  blocker projection/reporting.
- `src/workspace/topology-edit/topology-edit-check-runtime.js` — immutable,
  dataset/hash-bound checker snapshot shared by Load Calc and 3D Edit, with
  configured tolerance and review projection included in its cache basis;
  resolves support findings to their exact source entity, branch, and line.
- `src/workspace/topology-edit/topology-edit-check-runtime-contract.js` and
  `topology-edit-check-snapshot-store.js` — lightweight fail-closed handoff
  that keeps the heavy checker out of the initial application bundle.
- `src/workspace/topology-edit-3d-view-controller-core.js` — consumes the
  shared canonical checker result with the current configured gap tolerance;
  separates visual-derivation evidence from canonical topology findings.
- `src/workspace/topology-edit-3d-issue-controller.js` — grouped issue display
  and explicit configured-tolerance certified gap-fix API; the issue headline,
  spatial marker total, and clean-shell badge now exclude visual evidence.
- `src/workspace/topology-edit-3d-productivity-controller.js` and
  `src/workspace/viewport-productivity/topology-edit-clean-shell-runtime.js` —
  project canonical finding counts only into the Issues accordion badge.
- `src/workspace/topology-edit/topology-edit-checker.js` — distinguishes
  endpoint contacts from true interior centerline/clearance clashes; scopes
  connectivity by certified branch, analytically joins duplicate 0 mm node
  identities, limits short-span rules to pipe/tube elements, excludes certified
  fitting/carrier geometry from pipe-only rules, and consumes the governed
  restraint-direction derivation.
- `src/workspace/topology-edit/topology-edit-source-adapter.js` — retains source
  branch, line, and auto-generated carrier metadata required by the checker;
  marks evidence-empty `/SREF` assembly members as source reference points and
  source-described floor/fence openings as penetration attachments.
- `src/workspace/topology-edit/topology-edit-sjson-support-classification.js` —
  shared source-evidence classifier used by both canonical checking and visual
  projection; explicit restraint evidence takes precedence over descriptions.
- `src/workspace/topology-edit/topology-edit-sjson-restraint-projection.js` —
  reuses the shared Sjson attachment classification policy.
- `src/workspace/topology-edit/topology-edit-high-confidence-autofix.js` —
  validates the bounded configured threshold and preserves strict comparison.
- `src/workspace/routes/route-partition-model.js` — aggregates blocked child
  route findings into parent readiness.
- `src/workspace/engineering-model-store.js` — includes shared HIGH topology
  findings in fail-closed calculation readiness.
- `src/workspace/non-fea-input-check-view.js` — simplified actionable validation.
- `src/workspace/project-data/project-data-fields.js` — declares the four-field
  `loadCalcProjectBasis` Step 3 authority gate.
- `src/workspace/project-data/non-fea-project-data-view-v2.js` — separates
  current Project Data decisions from Step 4 exact-master fields and later
  method-policy requirements without changing the underlying authority record.
- `src/workspace/workspace-shell-styles.js` — guided workflow styling.
- `src/workspace/topology-edit-clean.css` — compact workflow styling.
- `src/workspace/engineering-model-controller.js` — governed coordinator path
  restored; direct calculation fallback removed.
- `src/workspace/engineering-loads/support-load-distribution-v3.js` — unsafe
  branch-specific override removed; exact density resolution now precedes the
  two explicit Project Data defaults and every consumed fallback is included
  in the configured-default usage ledger.
- `project-data/1885s-project-data-profile.json` — revision 4 owner-approved
  gravity/load-factor/closure basis, hydro and insulation defaults, and the two
  configured-default policy definitions. Material/section authority remains
  missing and fail-closed.
- `e2e/non-fea-input-check-load-calc.spec.js` — seven-step acceptance, strict
  threshold/certified-draft coverage, grouped blocker Skip/Restore/report
  coverage, and real-Sjson false-clash regression.
- `tests/topology-edit-wave3a-checker.test.mjs` — endpoint-contact regression.
- `tests/topology-edit-sjson-restraint-projection.test.mjs` — verifies exactly
  two penetration attachments and excludes them from restraint-family issues.
- `tests/support-load-project-density-fallback.test.mjs` — verifies exact-first
  density precedence and reportable governed default usage.
- `playwright.config.js` — explicit local-server port support.

### Final unwanted-error audit checkpoint (2026-08-16)

- Real input: `benchmarks/Sjson.json`, 279 entities, 127 pipe edges, 139
  supports, 37 support locations, and 13 approved routes.
- Checker before/after: 215 findings / 111 blockers became 4 review-only
  findings / 0 blockers. Twenty-five `/SREF` assembly reference points were
  removed from restraint-family review and two explicit penetration records
  were reclassified. Remaining evidence is limited to four physical attachment
  records whose source omits a certified restraint-family classification; none
  was guessed or auto-filled.
- Project Data before/after: the misleading 24-item current-error total became
  a READY 4/4 Step 3 basis, 2 exact-master fields checked next in Step 4, and
  16 method-specific fields deferred until a consuming method is selected.
- Full input validation and calculation execution remain fail-closed on all
  exact authority requirements; only the guided stage presentation/readiness
  projection changed.
- Visual evidence: `PASS` — before/after screenshots are retained in
  `test-results/load-calc-unwanted-errors-audit/`.
- Browser acceptance: `PASS` — real Sjson imported through the live UI; Load
  Calc and 3D Edit counts, Project Data values, and configured-default
  definition counts were inspected directly. The repository-pinned standalone
  Chromium binary was absent, so the current Playwright scenarios are `NOT_RUN`.
- Checker regressions: `PASS` — 16/16, including reference-point exclusion.
- Demo repair pipeline: `PASS` for loader and certified repair behavior; suite
  total is 10/11 because the pre-existing public command-vocabulary assertion
  expects 7 commands while the runtime exposes 8. No production vocabulary or
  oracle was changed in this audit.
- Targeted ESLint: `PASS`.
- Diff whitespace check: `PASS`.
- Production transform: `PASS` — 1,747 modules.
- Repository bundle gate: `FAIL` — the latest compiled main chunk is
  1,190,476 bytes versus
  the existing 1,048,576-byte cap. This work does not weaken or bypass the cap.

## EXACT_NEXT_ACTION

PR owner/reviewer: reconcile draft PR #1159 with current `origin/main`, rerun
the focused and repository gates from the reconciled head, and resolve the
main-bundle cap and stale public TopoFix oracle without weakening either gate.
Owner/user: provide or import an approved restraint-family master for the four
remaining evidence-empty physical attachment records, plus exact material
density and pipe-section masters. The separately approved empirical
component-weight estimator must retain explicit estimated-result authority.
Do not merge without explicit owner authorization.
