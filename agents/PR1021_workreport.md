# PR1021 Work Report — LFEA Workbench Integrity (#1018)

Maintained throughout PR #1021. This file is the single source of truth for scope, engineering decisions, changed files, validation evidence, risks, and handover. All work remains stacked on PR #1021; no CI workflow gates are added.

## 0. PR Mission Control

| Item | Current state |
|---|---|
| Source issue | #1018 — LFEA update |
| PR | #1021 |
| Branch | `agent/lfea-workbench-integrity-1018` |
| Base | `751756e9140527b8dc121aa179dc76b7039fb7ad` |
| PR state | Draft |
| Current stage | Stage 20 — cumulative reconciliation after M04 |
| Last completed stage | Stage 19 — mesh-quality gate ownership clarity |
| Engineering status | Critical + selected High/Medium integrity/presentation defects implemented/source-guarded; architecture authority/handoff audit is next priority |
| Validation status | Source/patch evidence complete through S19; S20 GitHub reconciliation pending; full repository/browser execution NOT_RUN |
| Workflow constraint | No `.github/workflows/*` additions or modifications |
| Exact next action | Reconcile current head/changed-file ledger/ancestry, refresh PR metadata for M04, then open architecture audit stage before any further production change |

### Handover in 60 seconds

Implemented and guarded:
- C01 destructive mock scope: collection-local controls that actually replaced the whole package were removed; explicit global mock remains.
- Package/record unsaved drafts survive benign renders and invalidate on committed `${modelVersion}:${semanticHash}` change.
- Delete selection is made safe before synchronous mutation; failed identity-preserving delete restores context.
- C02 no-Worker run: RUNNING/QUEUED publishes before a real frame/task yield; deferred synchronous execution is accepted only for exact active run identity, uses current pipeline options, and can be cancelled during the queued interval.
- C03 failure handling: diagnostic codes survive wrapping; file import/document edit fallbacks are classified separately; code-driven guidance retains original technical detail.
- C04 evidence export: strict current `QUALIFIED_EXPORT` gate remains; controller failures become `LFEA_EVIDENCE_EXPORT_REJECTED` rather than uncaught/stale success.
- H01–H03: read-only analysis authority/settings plus human authority/preflight labels while raw codes remain metadata/title authority.
- H05/H06: inline JSON-object screening for record edits and warning before Undo/Redo discards a current qualified execution/review/evidence.
- M01/M06/M08: distinct EMPTY/READY/RUNNING/QUALIFIED/FAILED presentation; dimensionless deformation display multiplier (`1× = true displacement`) with displacement unit separate; human progress labels with raw-stage retention.
- M04: mesh-quality wording now distinguishes upstream geometry validity qualification from descriptive shape-quality metrics.

Still required before merge:
- Execute `npm run check:lfea-workbench` on an actual checkout of the exact final PR head.
- Execute targeted browser scenarios for draft persistence/invalidation, no-Worker paint/cancel behavior, failure/evidence messages, Undo/Redo warning, and presentation semantics.
- Treat NOT_RUN as missing evidence, never PASS.

## 1. Engineering Intent and Invariants

- External package authority remains fail-closed; imports are validated, not silently repaired.
- UI draft/preview state is not solver authority until an existing explicit commit action succeeds.
- Run completion/failure is accepted only for exact run ID + input semantic hash + model version identity.
- Worker and no-Worker paths must consume equivalent current analysis options.
- Human labels improve comprehension without replacing raw status/policy/stage codes.
- Local continuum stress is not piping-code/CAESAR stress authority.
- Deformation multiplier is dimensionless/display-only; solved displacement remains in the solver-profile length unit.
- Quality presentation must not invent acceptance criteria, and must not hide qualification gates that already exist upstream.
- No solver numerical/formulation changes and no new GitHub Actions workflow gates.

## 2. Engineering Item Register

| ID | Priority | Status | Summary |
|---|---:|---|---|
| ISS-001 / C01 | Critical | IMPLEMENTED + GUARDED | Collection-context mock action had whole-package destructive scope |
| ISS-002 | High | IMPLEMENTED + GUARDED | Record draft lost on rerender |
| ISS-003 / N02 | Medium | IMPLEMENTED + GUARDED | Delete selection cleared after synchronous mutation/render |
| ISS-004 | High | IMPLEMENTED + GUARDED | Package draft lost on rerender |
| ISS-005 | Low | RESOLVED | Connector writes introduced missing trailing newlines |
| ISS-006 / C02 | Critical | IMPLEMENTED + GUARDED | No-Worker solve had no paintable RUNNING boundary |
| ISS-007 | High | IMPLEMENTED + GUARDED | No-Worker path could use stale construction-time pipeline options |
| ISS-008 / C03 | High | IMPLEMENTED + GUARDED | Wrapped edit errors could lose structured diagnostic code |
| ISS-009 / C04 | Critical | IMPLEMENTED + GUARDED | Evidence-export exception could escape controller path |
| ISS-010 / H01 | High | IMPLEMENTED + GUARDED | Analysis settings/authority invisible outside raw JSON |
| ISS-011 / H02 | High | IMPLEMENTED + GUARDED | Raw authority enum strings were primary user text |
| ISS-012 / H03 | High | IMPLEMENTED + GUARDED | Raw preflight codes were primary user text |
| ISS-013 / H04 | High (audit) | DEFERRED / RE-GROUND | Canonical result columns require explicit result-schema contract; original mechanism claim was inaccurate |
| ISS-014 / H05 | High | IMPLEMENTED + GUARDED | Invalid record JSON discovered only on submit |
| ISS-015 / H06 | High | IMPLEMENTED + GUARDED | Undo/Redo could discard qualified evidence without warning |
| ISS-016 / M01 | Medium | IMPLEMENTED + GUARDED | EMPTY/READY/RUNNING lacked distinct status presentation |
| ISS-017 / M06 | Medium | IMPLEMENTED + GUARDED | Deformation control obscured dimensionless display-multiplier meaning |
| ISS-018 / M08 | Medium | IMPLEMENTED + GUARDED | Progress exposed raw stage codes as primary text |
| ISS-019 / M04 | Medium | IMPLEMENTED + GUARDED | Quality title overclaimed absence of thresholds despite upstream geometry qualification |
| IMP-001 | High | DEFERRED | Shared engineering colour authority for true cross-run comparison |
| IMP-002 | High | NEXT ARCHITECTURE PRIORITY | Audit complete linear-piping → pre-FEA → mesh-workbench governed handoff |
| RISK-001 | High | OPEN | Continuum von Mises may be mistaken for piping-code stress |
| RISK-002 | High | OPEN | Support reaction sign convention may be overlooked downstream |
| QST-001 | Medium | OPEN | Authoritative vertical support-triad fallback-axis policy |
| M02/M03/M05/M07 | Medium | DEFERRED | Responsive SVG, convergence visibility, selection polish, non-blocking export provenance preview |

## 3. Decision Log

- **DEC-001:** remove collection mock entrypoints instead of relabelling the global destructive action.
- **DEC-002:** do not add CI workflow gates.
- **DEC-003:** view-owned drafts are invalidated by committed model identity, not by unrelated renders.
- **DEC-004:** delete selection becomes safe before synchronous mutation; identity-preserving failure may restore context.
- **DEC-005:** no-Worker execution uses begin → real render/task yield → execute by captured run identity.
- **DEC-006:** no-Worker started execution consumes explicit current controller pipeline options.
- **DEC-014:** deformation control is a dimensionless display multiplier; `1×` is true calculated displacement and result unit is separate.
- **DEC-015:** progress maps only known real stages; raw code remains metadata/title and unknown stages remain visible raw.
- **DEC-016:** Stage 17 source guards live in existing `lfea-workbench-check.mjs` after a large containment-file replacement timed out; no workflow/package-script change was introduced.
- **DEC-017:** M04 distinguishes upstream geometry validity qualification from the absence of any *additional panel-level* ratio/cosine threshold; no mesh-quality policy is invented.

## 4. Stage Roadmap

| Stage | Status | Purpose |
|---|---|---|
| S1 | DONE | Report initialization and technical findings |
| S2 | DONE | PR allocation and report synchronization |
| S3 | DONE | Changed-file bootstrap verification |
| S4 | DONE | C01 collection mock scope |
| S5 | DONE | Package/record draft persistence |
| S6 | DONE | Delete-selection sequencing |
| S7 | DONE | Source guards and hygiene |
| S8 | DONE | Initial-slice reconciliation/handover checkpoint |
| S9 | DONE | C02 no-Worker lifecycle/current-option parity |
| S10 | DONE | C03 structured failure guidance/provenance |
| S11 | DONE | C04 evidence-export exception containment |
| S12 | DONE | Critical-slice reconciliation |
| S13 | DONE | H01–H03 analysis authority/output labels |
| S14 | DONE | High-slice reconciliation/grounding |
| S15 | DONE | H05 inline validity + H06 qualified-evidence history warning |
| S16 | DONE | H05/H06 cumulative reconciliation |
| S17 | DONE | M01/M06/M08 run-state presentation clarity |
| S18 | DONE | Medium-slice reconciliation + PR metadata refresh |
| S19 | DONE | M04 mesh-quality gate ownership clarity |
| S20 | IN_PROGRESS | Reconcile M04/current PR head and refresh handover |
| S21 | PLANNED | Full three-surface authority/handoff audit grounding before any architecture code |

## 5. Stage Execution Log

### Stages 1–18
Completed at the documented evidence level. The initial integrity slice corrected destructive mock scope, editor draft loss and delete sequencing. Subsequent stages corrected no-Worker lifecycle/options parity, structured error/evidence handling, authority/settings presentation, record validity/history warnings, status/deformation/progress clarity, and kept all changes on PR #1021. S18 reconciled nine files at head `de139aca102c8b78ac5c861cfc7a9abfa2991e73`: 49 commits ahead / 0 behind the exact authorized base, merge base unchanged, no workflow file, PR still draft. Full command/browser execution remained NOT_RUN.

### Stage 19 — mesh-quality gate ownership clarity
**Status: COMPLETE at source/patch evidence level.**

**Before:** Results used the title `Mesh quality evidence — no acceptance threshold applied`. Source grounding showed this conflated two separate authorities.

**Engineering evidence:**
- `lfea-quality-adapter.js` explicitly does not invent a quality score or acceptance threshold; it exposes retained evidence.
- `model.js` requires T3 signed area > `solverProfile.tolerances.geometryArea`; Q4 geometry qualification receives the same tolerance; hanging-node/intersection geometry checks also use it.
- `element-quality.js` rejects invalid Q4 convexity/crossing and requires finite positive Jacobian determinants above the supplied tolerance.
- `solver.js` publishes `elementQualityEvidence` and applies numerical residual/equilibrium/energy qualification separately; it does not add a Jacobian-ratio/edge-ratio/corner-cosine acceptance gate.

**Changed behavior:**
- Table title is now simply `Mesh quality evidence`.
- An adjacent `data-role="lfea-quality-authority"` note states that geometry validity was qualified upstream using the declared `solverProfile.tolerances.geometryArea` value.
- The note states that displayed Jacobian ratio, edge-length ratio and corner-cosine metrics have no additional panel-level acceptance threshold and that signed-area/Jacobian validity remains governed upstream.
- Raw quality evidence rows remain unchanged.
- No new threshold, pass/fail classification, solver profile, solver numeric, or model qualification rule was added.

**Guard:** `scripts/lfea-workbench-check.mjs` now rejects restoration of the old over-broad title and requires the gate-source path, quality-authority role/metadata, upstream qualification wording, descriptive-metric distinction, and signed-area/Jacobian authority statement.

**Validation:** source grounding PASS; production/guard patch inspection PASS; full `npm run check:lfea-workbench` and browser presentation remain NOT_RUN.

### Stage 20 — cumulative reconciliation after M04
**Status: IN_PROGRESS — opened before reconciliation.**

Scope: verify exact changed-file ledger, base ancestry/merge base, no workflow changes, current draft PR status, then refresh PR body and this report with exact current-head evidence. No production code changes are planned in S20.

## 6. Changed-File Ledger

Expected cumulative files after S19:
1. `agents/PR1021_workreport.md` — living SSOT/handover.
2. `scripts/lfea-p0-ui-containment-check.mjs` — prior integrity/high source/store guards.
3. `scripts/lfea-workbench-check.mjs` — M01/M06/M08/M04 source guards in existing workbench command.
4. `src/workspace/lfea-workbench-controller.js` — lifecycle/errors/export/history warning.
5. `src/workspace/lfea-workbench-document-store.js` — diagnostic/evidence authority.
6. `src/workspace/lfea-workbench-panels.js` — authority/preflight/deformation/progress/quality presentation.
7. `src/workspace/lfea-workbench-run-store.js` — identity-safe synchronous execution.
8. `src/workspace/lfea-workbench-styles.js` — invalid-input/status presentation.
9. `src/workspace/lfea-workbench-view.js` — mock/draft/delete/failure/settings/record validity UI integrity.

S20 must prove the actual GitHub list equals this ledger exactly.

## 7. Validation and Evidence Ledger

| Validation | Status |
|---|---|
| C01–C04 source/store guards | IMPLEMENTED / SOURCE-INSPECTED |
| H01–H03/H05/H06 guards | IMPLEMENTED / SOURCE-INSPECTED |
| M01/M06/M08 guards | IMPLEMENTED / PATCH-INSPECTED |
| M04 source grounding | PASS |
| M04 production/guard patch inspection | PASS |
| S18 changed-file/ancestry/workflow reconciliation | PASS |
| S20 cumulative reconciliation | IN_PROGRESS |
| Full `npm run check:lfea-workbench` | **NOT_RUN** |
| Browser interaction/presentation | **NOT_RUN** |

## 8. Examples and Edge Cases Retained

- No Worker: Run publishes RUNNING/QUEUED, yields, then executes only if the captured identity is still active; Cancel/model edit during the yield prevents stale deferred solve execution.
- Package/record text can remain dirty through progress/display renders but is cleared when a committed package identity changes.
- Imported stale semantic hash is rejected and is not automatically repaired.
- Evidence export from stale/unqualified execution is rejected and not downloaded.
- Mixed T3/Q4 settings report actual deterministic element families rather than assuming one type.
- Deformation `1×` is true displacement; 10× is visualization exaggeration and remains dimensionless.
- Unknown future pipeline stage remains visible as its raw code instead of receiving an incorrect friendly label.
- Quality ratios/cosines may be descriptive even after the mesh passed upstream signed-area/Jacobian geometry validity gates; the UI does not invent extra acceptance limits.

## 9. Known Risks / Deferred Roadmap

Highest-value continuation is now `IMP-002`: audit all three LFEA surfaces and governed handoffs, with focus on transforms, support/restraint semantics, reaction sign convention, physical load-case provenance, and authority boundaries among piping beam analysis, local continuum FEA and piping-code stress.

Also deferred:
- H04 canonical per-result columns pending explicit result schemas.
- Shared/user-fixed cross-run color authority.
- Responsive SVG and convergence visibility architecture.
- Non-blocking export provenance/hash preview.
- Vertical-pipe support triad fallback: use authoritative support/local axis or remain blocked; never choose an arbitrary convenience axis.
- CAESAR/reference correlation suite: straight anchor, guide/line-stop, vertical riser, elbow, branch, loop, directional support; compare displacement, global reactions, local support actions and governing physical case.

## 10. Recommended Forward Sequence

1. Complete S20 cumulative reconciliation and PR metadata refresh.
2. Open S21 in this report **before** any new production change.
3. Trace `diagnoseInputXmlLinearPreFea → prepareInputXmlLinearPreFea → authorizeInputXmlLinearSolve → runLinearPipingWorkbenchAnalysis` across the three surfaces.
4. Register concrete handoff defects before coding; prioritize engineering-authority/correctness defects over cosmetic UI polish.
5. Before merge, execute the missing workbench command and targeted browser scenarios at the exact final head.

## 11. Next-Agent Handover

Current stopping point: S19 implementation/guard complete; S20 reconciliation open. Do not redo C01–C04, N01/N02, H01–H06, M01/M04/M06/M08, or prior reconciliations. The next production work must begin with S21 audit grounding, not an unrecorded edit.

Known failing checks: none observed through source inspection. Full repository/browser validation is **NOT_RUN**, so there is no basis to claim it passes.

Highest remaining engineering risk: authority/handoff semantics—especially piping-code versus continuum stress, reaction sign convention, restraint/support fidelity and physical load-case provenance.

## 12. Process Notes

- Ground audit hints against actual schemas/enums before coding.
- Source guards, runtime tests and browser behavior are distinct evidence classes.
- Gate ownership belongs in presentation when upstream validity and downstream descriptive evidence coexist.
- A display adapter must never invent engineering thresholds.
- No workflow changes are needed for source guards in this PR.

## 13. PR Continuation Record

| Criterion | Current result |
|---|---|
| C01–C04 | IMPLEMENTED + GUARDED |
| H01–H03/H05/H06 | IMPLEMENTED + GUARDED |
| H04 | DEFERRED / RE-GROUND |
| M01/M04/M06/M08 | IMPLEMENTED + GUARDED |
| S20 reconciliation | IN_PROGRESS |
| Full runtime/browser validation | **NOT_RUN** |
| New CI workflows added | **NO** |
| PR status | DRAFT |
