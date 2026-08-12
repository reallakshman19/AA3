# LFEA Workflow & UI Review — CAESAR II / AutoPIPE / CAEPIPE Comparison and Wiring Plan

Reviewed head: `4482dcc481939c3af1068aea2e2db47baec63984` (branch
`claude/lfea-workflow-ui-review-z14rvn`, forked from `main`).

Scope: the requested review is UI/workflow only — canvas-based
authoring/3D editing is explicitly excluded per the request ("Other than
canvas..."). The numerical kernels (Stack C: `src/core/linear-fea-solver`,
`linear-fea-frame-element`, `linear-fea-b31-code-engine`, etc.) are not
re-audited here; their status is read from `docs/OWNER_ROADMAP.md`, which
this document treats as authoritative for engineering-core state, per that
document's own standing rule ("This is the single source of truth for phase
status... before citing any of those documents [older plans] to scope new
work, re-verify the specific claim against current source"). Every UI/wiring
claim below was independently re-verified against current source in this
review, not copied from prior docs — file:line citations follow every claim.

---

## 1. Executive summary

The engineering core is far ahead of the UI. Twenty-six Work Packs (M001–M026,
`docs/OWNER_ROADMAP.md`) have made the piping solver chain (Stack C) real,
sparse, and independently cross-checked against a real CAESAR II run
(`benchmarks/LFEA/BM1`) to single-digit-percent accuracy on most quantities.
None of that is in question here.

The UI is where the gap actually is, and it is not one gap — it is **three
separate browser entry points that each implement a different slice of the
same workflow**, none of which currently spans the full pipeline the request
describes:

| Entry | File → bootstrap | What it is |
|---|---|---|
| `index.html` | `src/main.js` → `src/workspace/bootstrap.js` | The large legacy "Engineering Workbench" — canvas/3D viewport, Settings, and **two disconnected LFEA islands** (an Import/Validate surface and a separate Run/Results/Export surface that do not talk to each other without a manual out-of-browser step) |
| `lfea.html` | `src/lfea/main.js` → `src/lfea/bootstrap.js` | The standalone "LFEA" app — a genuinely **single connected controller** (Import → Validate → Run → Results → Publish → History), no canvas, but missing several stages your request names |
| `analyze.html` | `src/analyze/main.js` | A deliberate developer-diagnostics-only tool; its own UI text tells the user to go to LFEA instead (`src/analyze/analyze-controller.js:24`) — not a competing production surface, out of scope for this plan |

`lfea.html` is architecturally the right foundation to build on (§6), and it
is closer to your requested pipeline than either audit document currently on
file suggests — but it is missing exactly the pieces your request calls out
by name: restraint mutation is invisible, load case is not user-authored, and
there is no export. §7 is the phased plan to close those gaps and the
adjacent ones needed to reach CAEPIPE-static parity (§4).

---

## 2. Current state, verified

### 2.1 `lfea.html` — the standalone LFEA app (target for this plan)

Entry: `lfea.html:13` loads `/src/lfea/main.js`. `bootstrap.js:7-28` builds a
`STANDALONE` identity and constructs `createLfeaStandaloneRuntime`
(`standalone-runtime.js:19-21`). One controller instance
(`LfeaStandaloneRuntime`, `standalone-runtime.js:23`) owns the whole session;
its 8-tab nav (`source, review, model, analysis, results, verification,
history, compare`) is wired at `standalone-layout.js:116`.

Stage-by-stage, verified by tracing actual calls (not filenames):

- **Import.** Real and wired. `LfeaStandaloneInputXmlSourceController`
  (`inputxml-source-controller.js:11-29`) subclasses
  `LinearPipingInputXmlSourceWorkflowController`
  (`src/workspace/linear-piping-inputxml-source-workflow.js`) — a real file
  input (`fileInput.addEventListener('change', ...)`, line 63) driving
  `createLinearPipingInputXmlIntake` (`linear-piping-inputxml-intake.js:77`).
- **Restraint mutation.** Real, but **invisible**. Applied inside
  ingestion — `inputxml-restraint-type-mutation.js`'s seven-row correction
  table (`DEFAULT_RESTRAINT_TYPE_MUTATION_ROWS`, lines 81–89) is consumed by
  `applyRestraints()` in `inputXmlToCanonicalGeometry.js:557`, reached from
  `inputxml-model-health-source.js:49` on every import. There is no UI
  anywhere that shows the user which restraints were reclassified, why, or
  lets them override a row. (A settings *shape* for exactly this —
  `inputXmlRestraintTypeMutation: { enabled, rows }` — already exists at
  `src/calc-workspace/cii-standalone-port/ui-adapted/xml-cii-adapted-config.js`,
  but it belongs to a different, older ingestion path and is not reachable
  from `lfea.html`.)
- **Ground-truth model review.** Real and (per `docs/OWNER_ROADMAP.md`'s
  2026-08-09 Phase 0.1 note) reachable — `src/workspace/lfea-preflight-ui.js`
  is now mounted via `mountLfeaPreflightUi` from `src/main.js`. Every
  material/section/process field is tagged `DECLARED`/`INHERITED`/`MISSING`
  with provenance (M021, PR #564) — this is the "structured table shown to
  the user" the Owner asked for on 2026-08-04 and it already exists for
  InputXML source. Confirm at the review stage of the journey.
- **Validate / pre-flight.** Real and wired. `governed-journey-view.js`'s
  `review`/`model` facets render `preFlight.preparation` state
  (`governed-journey-projection.js:9-13`), driven by
  `prepareLinearPipingInputXmlPreFlight`
  (`src/workspace/linear-piping-inputxml-prefea.js:41-56`), which the source
  controller calls on every file load.
- **Error / diagnostics display.** Real and wired. `appendFindings`
  (`governed-journey-view.js:135-155`) renders
  `preFlight.preparation.findings` — this is pre-solve ingestion diagnostics
  (missing data, unresolved restraints, inheritance flags), not post-solve
  code-stress checking (see below).
- **Load case.** Exists only as a **hidden default**, not an authored stage.
  `requestedCaseIds` defaults to a single constant
  (`LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID = 'IXP-W'`, weight-only —
  `linear-piping-inputxml-intake.js:32,226`); a separate module
  (`inputxml-linear-physical-cases.js:196-213`) auto-derives `W`/`WP`/`WT`/
  `WPT` token combinations from source data, but nothing in `lfea.html`
  presents these to the user or lets them pick, add, or combine cases before
  running.
- **Analyse ("Run Analysis").** Real, and genuinely wired to the *same*
  source object as Import — this is the one place where `lfea.html` is
  materially better than the legacy surface (§2.2). The button
  (`governed-journey-view.js:109-114`) calls `onRunNativeAnalysis` →
  `executeNativeAnalysis()` (`standalone-runtime.js:238-252`) →
  `this.executionAuthority.run(this.sourceController.getPreFlight(), ...)`
  (`standalone-runtime.js:241`) → `native-execution-authority.js:21` →
  `solveInputXmlLinearAnalysis`
  (`src/core/linear-piping-analysis-consumer/inputxml-linear-governed-solve.js`).
  **The same `sourceController` instance produced by Import feeds Run
  Analysis directly** — no file re-upload, no hand-authored bridge JSON.
- **Output.** Real, tabular, not raw JSON. `mountLfeaNativeResultsCompositeView`
  (`native-results-composite-view.js:5-42`) composes native results +
  `native-b31-results-view.js`, refreshed at `standalone-runtime.js:123-128`.
  Code-compliance percentages (B31.3 SUSTAINED/DISPLACEMENT_STRESS_RANGE
  utilization) render here — this is where "error check" in the CAESAR/
  AutoPIPE/CAEPIPE sense (overstressed-node list) actually belongs, because
  it is a function of the *solved* member forces, not the raw input.
- **Export.** **Does not exist** for this pipeline. Grep for
  `csv|Blob(|createObjectURL|download=` across `src/lfea` returns nothing.
  The only export-shaped calls (`exportDocument/exportPackage/exportEvidence`,
  `standalone-runtime-api.js:64-66`) delegate to `LfeaWorkbenchController`
  (`../workspace/lfea-workbench-controller.js`) — the *older*, separate
  "Verification" tab, not the native Import→Run pipeline's own results.
- **Settings / units / code edition.** **Does not exist** in `lfea.html`.
  `src/core/settings-authority/` is real (profile, validation, review-model,
  report-export-policy) but its only UI (`SettingsController`/`SettingsView`)
  is mounted from `src/workspace/bootstrap.js:22` — the `index.html` app.
  `lfea.html`'s `bootstrap.js` and `main.js` contain no reference to it.

### 2.2 `index.html` — the legacy workspace app

`src/main.js:16-17,49-55` mounts two *separate* controllers on the same page:

- **Surface 1 (Import → Restraint Mutation → Validate):**
  `mountLinearPipingInputXmlSourceWorkflow` — real, wired, same restraint-
  mutation/validate chain described above. It deliberately stops here: the
  controller literally renders *"Execution custody: NOT CONNECTED... This
  source/pre-flight surface never fabricates a legacy run-request JSON or
  downstream load authority"* and hardcodes `nativeExecutionReady: false`
  (`linear-piping-inputxml-source-workflow.js:508,158`).
- **Surface 2 (Run → Output → Export):**
  `mountLinearPipingResultsWorkbench` (`linear-piping-results-workbench.js:36`).
  Its `runButton` is real and wired
  (`linear-piping-run-analysis.js:33` → `solveInputXmlLinearAnalysis`,
  confirming the `docs/OWNER_ROADMAP.md` M003/#417 claim is accurate for
  *this* surface) — but it is fed by a **separately, manually uploaded**
  "workbench run request" JSON file (`runFileInput`,
  `linear-piping-results-workbench.js:633-637`;
  `linear-piping-run-request.js:12-15`), authored today only by Node scripts
  such as `scripts/m003-live-run-analysis-fixture.mjs`, not produced by
  Surface 1's own sealed intake. `src/main.js:46-48` documents this as a
  deliberate present-state ordering choice ("the legacy governed request
  Run/Results surface"), not an oversight.
- **Output and export are real here.** `linear-piping-results-view.js:10-31`
  renders real tables with units (`numberWithUnit()`). Export is real:
  `auditButton`/`engineeringButton`
  (`linear-piping-results-workbench.js:649-652`) call
  `createLinearPipingAuditJsonExport`/`createQualifiedLinearPipingEngineeringExports`
  (`src/workspace/linear-piping-presentation/index.js:29-30`), downloaded via
  real `Blob`/`URL.createObjectURL` (lines 729-750), CSV export additionally
  gated on `presentation.exportEligibility === 'ENGINEERING_EXPORT_ALLOWED'`.
- **Settings, canvas, and 3D authoring live only here.**
  `SettingsController` (`workspace/bootstrap.js:22`) and the topology-edit/
  3D viewport are mounted in this app, out of scope per your "other than
  canvas" instruction.

**Net finding, corrected from the 2026-08-02 P0 audit's phrasing:** Stack C is
*not* "unreachable from the browser" — that changed with M003. But its claim
that the pipeline pieces exist "somewhere... not in the same pipeline" is
still true today for `index.html`'s two islands, and separately, `lfea.html`
*is* one connected pipeline but stops three stages short of what you asked
for (restraint-mutation visibility, load-case authoring, export).

### 2.3 What the engineering core already supports underneath (Stack C, from `docs/OWNER_ROADMAP.md`)

Summarized, not re-verified here — treat `docs/OWNER_ROADMAP.md` as ground
truth and re-check any specific line before relying on it for implementation:

- Frame element (12×12 3D Timoshenko, end releases, rigid offsets), sparse
  Cholesky/LDLᵀ solve, gravity (pipe wall/contents/insulation), thermal
  expansion, pressure-stress term, B31.3 SUSTAINED/DISPLACEMENT_STRESS_RANGE/
  EXPANSION_RANGE_ENVELOPE code categories, ASME B31.3/B31J bend flexibility
  and SIF calculator, CAESAR rigid-element modeling rules, reducer
  condensation (candidate, unverified against CAESAR stiffness), sealed
  restraint-type mutation — all real, closed-form or CAESAR-cross-checked.
- **`linear-fea-variable-spring-hanger/`** (catalog, design, recover) is
  real but has **zero callers anywhere in `src/`** — confirmed by direct
  grep in this review. Spring/rigid hanger *design* (as opposed to a
  caller-supplied rate) is implemented and completely disconnected, the same
  "real but orphaned" pattern the sparse solver was in before M002.
- **`EQUIVALENT_STATIC` (wind/seismic)** is a declared load-case class
  (`linear-fea-load-case/load-case-contract.js:139`) with **no load-expansion
  consumer anywhere** — confirmed by grep; same disconnected-primitive
  pattern gravity was in before M007. No hydrotest category exists either.
- **Genuine nonlinear/pseudo-nonlinear support behavior** is partial:
  one-way lift-off (the CAESAR/AutoPIPE/CAEPIPE technique of solving a case
  with the restraint simply omitted, then checking it should have lifted) is
  proven at M016 (Appendix S Example 2). A true iterative Coulomb-friction
  solver (M025, PR #594) is **held, not merged** — real non-convergence was
  found at the near-limit friction state, and the friction-affected DOFs are
  the dominant remaining source of BM1's CAESAR-comparison deviation.

---

## 3. Feature comparison: LFEA vs. CAESAR II / AutoPIPE / CAEPIPE (static)

CAEPIPE's own published feature set: linear and non-linear static and dynamic
analysis of 3D piping, restraints including anchors, guides, one-way/two-way
restraints, spring/constant-effort/clevis/rod hangers with real *design*
(not just rate lookup), U-bolts/clamps, anchor/nozzle movements, and code
compliance against the ASME B31 series with support-reaction, nozzle-load,
stress, and displacement reporting ([CAEPIPE Analysis Features](https://www.sstusa.com/caepipe-analysis-features.php),
[CAEPIPE Modeling Features](https://www.sstusa.com/caepipe-modeling-features.php)).
CAESAR II and AutoPIPE both add load-case combination machinery (CAESAR:
vector superposition with intermediate L-cases; AutoPIPE: load sequencing)
and iterative nonlinear-restraint solving as baseline capabilities
([AutoPIPE vs CAESAR II](https://whatispiping.com/autopipe-vs-caesar-ii/)).

| Capability | CAEPIPE static (minimum bar) | This repo today | Verdict |
|---|---|---|---|
| Import CAESAR InputXML | Yes (native) | Real, production-wired, cross-checked against a real CAESAR II run (M020, §2.3) | **At/above bar** |
| Import staged-JSON (non-CAESAR source) | N/A (not a CAESAR concept) | Unification work started (M021/M022-A) but not yet reaching canonical geometry/solver (§2.3, `docs/OWNER_ROADMAP.md` "Phase 2... M022-B/C remain") | **Below bar for this source** |
| Restraint type correction, visible to user | Implicit (CAESAR-native, no correction needed) | Real correction table, but silently applied — no review/override UI (§2.1) | **Below bar** |
| Structured, gap-flagged model review before solving | Yes (model listing) | Real (M021), reachable via preflight UI | **At bar** |
| Settings: units, code edition, allowables | Yes | Real core (`settings-authority`), but zero UI in `lfea.html` (§2.1) | **Below bar in target UI** |
| Load case authoring (pick/combine W/T/P/wind/seismic/hydrotest) | Yes, first-class UI | Auto-derived cases exist; **no authoring UI anywhere** (§2.1, §2.2) | **Below bar** |
| Run static analysis | Yes | Real, wired, sparse solver, cross-checked | **At bar** |
| Sustained/Expansion/Occasional code check | Yes | SUSTAINED and DISPLACEMENT_STRESS_RANGE/EXPANSION_RANGE_ENVELOPE real; OCCASIONAL has no wind/seismic load source to check against yet (§2.3) | **Partial** |
| Hydrotest case | Yes | Not implemented (§2.3) | **Below bar** |
| Overstressed-node / error list after solve | Yes (red-line list) | Percentages render (`linear-piping-results-view.js`) but not surfaced as a dedicated pass/fail error list in `lfea.html` | **Partial** |
| Hanger design (select spring/constant/rigid, size, %variation) | Yes, real design algorithm | Real design module, zero UI/solve callers (§2.3) | **Below bar** |
| One-way/lift-off nonlinear supports | Yes | Proven technique (M016), not a general authoring feature yet | **Partial** |
| Friction (nonlinear, iterative) | Yes | Held PR, real non-convergence unresolved (§2.3) | **Below bar** |
| Support-load / restraint summary report | Yes | Real (`native-support-*` in `lfea.html`) | **At bar** |
| Results export (CSV/JSON/report) | Yes | Real in `index.html`'s legacy surface; **absent** in `lfea.html` (§2.1, §2.2) | **Below bar in target UI, at bar elsewhere** |
| Run history / comparison across runs | Not typically first-class in CAEPIPE | Real, and arguably *ahead* of CAEPIPE (`native-history-view.js`, `native-comparison-controller.js`) | **Above bar** |
| Deflected-shape/animation, 3D canvas | Yes | Explicitly out of scope per your instruction | **Excluded by request** |

**Bottom line on your stated minimum bar:** the *engine* underneath already
meets or exceeds CAEPIPE-static on several axes (cross-checked accuracy,
run history/provenance, structured gap-flagged model review — none of which
CAEPIPE itself provides). The *UI* does not yet expose that engine as one
usable static-analysis workflow, and three specific capabilities (load-case
authoring, hanger design, wind/seismic/hydrotest load generation) are real
gaps against the bar, not UI-only gaps.

---

## 4. Your proposed pipeline — reviewed and refined

You proposed:

```
import staged-json/inputxml (apply restraint mutation for inputxml)
  -> validate inputs -> error check -> load case -> analyse -> output -> export
```

This is the right shape and matches what the Owner has already been steering
toward directly (`docs/OWNER_ROADMAP.md`, 2026-08-04: *"let our FEA has its
own input format. Inputxml uploaded... should be resolved to this format...
shown to user"* — M021 is exactly that). Two refinements, both because
"error check" conflates two genuinely different things in every professional
tool (CAEPIPE, CAESAR II, AutoPIPE all separate them the same way):

1. **Pre-solve diagnostics** (missing data, unresolved restraint codes,
   inherited-vs-declared fields, disconnected topology) are a property of the
   *input*, checked before you can even attempt a solve. This is what
   `lfea.html`'s findings table already does (§2.1).
2. **Code-compliance error checking** (stress ratio vs. allowable,
   overstressed-node list) is a property of the *solved result* — you cannot
   compute B31.3 `S_L`/`S_E` without member forces, which requires a solve.
   In CAEPIPE/CAESAR/AutoPIPE this always happens *after* analysis, per load
   case, not before.

Placing a single "error check" stage between "validate" and "load case"
would either duplicate the pre-solve diagnostics or require code-checking
without a solve, which is not physically possible. The refined pipeline
keeps your stage names and ordering everywhere else:

```
 0. Project settings          units, B31 edition/year, allowable-stress table,
    (once per project)        corrosion allowance, hanger design criteria

 1. Import                    InputXML upload, or staged-JSON import
                               (existing LFEA source controller, §2.1)

 2. Restraint mutation        InputXML only. Show the seven-row correction
    review                    table pre-applied with defaults; let the user
                               inspect/override before it's sealed. (staged-
                               JSON needs no CAESAR TYPE-code correction step)

 3. Ground-truth model        DECLARED / INHERITED / MISSING per field,
    review                    already real (M021) — make it a mandatory
                               checkpoint in the journey, not an optional tab

 4. Validate / pre-flight     structural completeness, unit resolution,
                               material/section authority — existing

 5. Pre-solve error check     the existing findings table (missing data,
    (diagnostics)             unresolved restraints, topology gaps) — blocks
                               or warns before load case entry

 6. Load case                 NEW: author/select physical cases (W/T/P/wind/
                               seismic/hydrotest) and assemble them into code
                               categories (SUSTAINED/OPERATING/EXPANSION/
                               OCCASIONAL) — currently only a hidden default

 7. Analyse                   Run Analysis — existing, real solver (§2.1)

 8. Output +                  results tables (existing) plus a first-class
    post-solve error check    overstressed-node/error list per load case,
                               derived from the same numbers already computed

 9. Export                    NEW for lfea.html: JSON/CSV/report, reusing the
                               already-proven export functions from the
                               legacy workbench (§2.2) rather than rebuilding
```

Stage 0 and stages 2, 6, 9 are the net-new work. Stages 1, 3, 4, 5, 7, 8
(tables) already exist and are wired — the plan in §7 is scoped accordingly.

---

## 5. Architecture decision: build on `lfea.html`, not `index.html`

Building the missing stages on top of `lfea.html` rather than trying to
connect `index.html`'s two islands, for three concrete reasons found in this
review, not a style preference:

1. **It is already one controller, not two.** §2.1 shows `executeNativeAnalysis()`
   reads `this.sourceController.getPreFlight()` directly — the same object
   Import produced. `index.html`'s Surface 2 requires a hand-authored JSON
   file with no producer anywhere in the browser (§2.2). Wiring load case
   and export onto `lfea.html` extends a real connection; wiring them onto
   `index.html` would require first building the missing bridge `index.html`
   was deliberately never given (`linear-piping-inputxml-source-workflow.js:508`
   documents that as intentional, not an oversight to "just fix").
2. **It already satisfies "other than canvas."** `lfea.html` has zero
   viewport/3D code — it is a pure data/table workbench today, matching what
   you're asking for directly. `index.html` would require excluding its
   canvas rather than simply not having one.
3. **It already has governance machinery your comparison bar doesn't even
   require** — run history, run comparison, and a sealed publication/
   authorization chain (`native-support-publication-authority.js`,
   `native-b31-publication-authority.js`) that gates results behind an
   explicit approval step. That's real infrastructure a from-scratch build
   would have to redo.

The Settings UI currently only exists on `index.html` (§2.1). Rather than
duplicate `SettingsView`/`SettingsController`, Phase 4 below extracts (or
thinly re-mounts) the existing `settings-authority`-backed view into
`lfea.html` — the core module has no `index.html`-specific dependency
(confirmed: `src/core/settings-authority/` has no import from `src/workspace`
or DOM code), so this should be a real re-mount, not a rewrite.

---

## 6. Detailed wiring plan

Phased as Work Packs, matching this repo's own M0xx convention and gate
discipline (`npm run gate`, exact-head review, no claim accepted without a
command actually run against real source). Each phase lists: what it adds,
what it reuses (no new engineering math — every phase below is UI/wiring
work over already-real core modules, consistent with `ARCHITECTURE_TRUTH.md`'s
"the workbench layer selects and presents kernel evidence; it must not
rederive" rule), and its acceptance criteria.

### Phase 0 — Owner decisions needed before dispatch (see §8)

Three concrete open questions block precise scoping of Phases 2 and 7; do
not dispatch those two phases until §8 is answered.

### Phase 1 — Restraint mutation review stage (new journey facet)

**Adds:** a `mutation` facet between `source` and `review` in
`governed-journey-projection.js`'s stage list (currently `{schema, source,
review, model, analysis}`), and a view rendering
`DEFAULT_RESTRAINT_TYPE_MUTATION_ROWS` pre-applied per node, each row showing
`from → to`, the CAESAR label, and which real element/node it fired on
(`resolveRestraintTypeMutation` already returns this — confirm its exact
return shape before building the view rather than assuming).
**Reuses:** `inputxml-restraint-type-mutation.js` unchanged; the settings
*shape* precedent at `xml-cii-adapted-config.js`'s
`inputXmlRestraintTypeMutation: { enabled, rows }` for the override control,
adapted (not copied — that module belongs to a different app) to seal
through the same source-controller intake object `lfea.html` already uses.
**Acceptance:** a real InputXML file with at least one `TYPE=17`/`TYPE=7`
restraint shows both the raw and corrected classification before the user
proceeds; overriding a row changes the sealed `preFlight.preparation` hash
(provenance, not silent); the default (no override) path is byte-identical
to today's silent behavior, so no regression to already-passing
`check:lfea-*` benchmarks (BM1, BM2, Appendix S examples) is possible.

### Phase 2 — Load case authoring stage

**Adds:** a UI between "model review" and "Run Analysis" listing the
auto-derived physical cases (`inputxml-linear-physical-cases.js`) with
checkboxes/toggles, plus an assembly control mapping selected physical cases
to code categories (`SUSTAINED`, `OPERATING`, `DISPLACEMENT_STRESS_RANGE`,
`EXPANSION_RANGE_ENVELOPE` — the four `IMPLEMENTED_STRESS_CATEGORIES`
confirmed real in §2.3/§2.1). `requestedCaseIds` becomes user-selected
instead of the hardcoded `IXP-W` default.
**Reuses:** `linear-fea-load-case/load-case-combination.js` and
`linear-piping-multicase-application/orchestrator.js` (multi-case
orchestration already exists at the core level — confirm its exact call
contract before building the UI against it, since this review did not trace
that orchestrator's callers directly).
**Explicitly deferred to Phase 5, not built here:** wind/seismic/hydrotest
selection — those categories have no load-expansion consumer yet (§2.3), so
offering them in the UI before Phase 5 would be a control that silently
produces nothing, which `ARCHITECTURE_TRUTH.md`'s "no hidden values" /
fail-closed discipline forbids. Gray them out with an explicit "not yet
implemented" state instead of hiding them.
**Acceptance:** BM1's real thermal/pressure-bearing cases can be assembled
into a `SUSTAINED` and `EXPANSION_RANGE_ENVELOPE` run entirely from the UI,
reproducing the same `check:lfea-b3.17`/`b3.19` numbers already proven from
the Node-script fixtures.

### Phase 3 — Export

**Adds:** JSON/CSV/audit export buttons on the native results view
(`native-results-composite-view.js`), wired to `this.resultsAuthority.getState()`
and `this.executionAuthority.getState()`.
**Reuses:** `createLinearPipingAuditJsonExport`/
`createQualifiedLinearPipingEngineeringExports`
(`src/workspace/linear-piping-presentation/index.js:29-30`) — the exact,
already-proven functions from `index.html`'s Surface 2 (§2.2) — plus the same
`ENGINEERING_EXPORT_ALLOWED` eligibility gate, so export authorization
semantics stay identical across both surfaces rather than diverging.
**Acceptance:** exporting a run through `lfea.html` produces a file
byte-identical in schema to what the same run would produce through
`index.html`'s existing export (same producer function, different caller).

### Phase 4 — Settings / units / code-edition surface

**Adds:** a `settings` facet mounted in `lfea.html`'s layout, re-using
`SettingsView`/`SettingsController` (`src/workspace/settings-*.js`) against
the same `src/core/settings-authority/` backend `index.html` already uses.
**Acceptance:** a unit-system or B31 edition change made in `lfea.html`
marks any current result stale through the *same* `executionAuthority.reconcile`
mechanism already used for source/preflight changes (`standalone-runtime.js:34-68`
already has the reconciliation machinery — this phase only needs to add
`PROFILE_CHANGED`-style comparison for settings fields, not build new staleness
tracking).

### Phase 5 — Wind/seismic and hydrotest load generation

**Adds:** a real load-expansion consumer for `EQUIVALENT_STATIC` (wind,
seismic — likely as an equivalent-static coefficient applied per node/span,
the same category CAEPIPE/CAESAR/AutoPIPE all use for static seismic) and a
hydrotest physical-case generator (test pressure substituted for design
pressure, weight-only thermal state), mirroring the exact pattern M007/M012
used to wire `GRAVITY`/`DISTRIBUTED_WEIGHT` from a declared-but-unconsumed
primitive into a real consumer.
**This is the one phase in this plan that is genuine new engineering-core
work, not UI wiring** — scope it as its own core Work Pack (M0xx numbering,
not a UI PR) before attempting the Phase 2 authoring control for it.
**Acceptance:** `OCCASIONAL` category code-checks become computable against
a real wind or seismic case, closing the "partial" verdict in §3; a
closed-form or published benchmark (matching this repo's existing
Appendix-S/BM1 discipline) verifies the equivalent-static formula before any
UI exposes it.

### Phase 6 — Hanger design UI

**Adds:** a hanger design step, surfaced either as part of load case (Phase
2) or as its own facet, wiring the real, currently-orphaned
`linear-fea-variable-spring-hanger/` (catalog, design, recover) into the
solve chain for the first time, then into the UI.
**Sequencing note:** per `docs/OWNER_ROADMAP.md`'s own BM1 triage, hanger
design was deliberately deferred ("after further benchmarks") because BM1's
own `HANGER` records have no pre-computed spring rate — a faithful
implementation needs real design logic, which is exactly what this module
already has but has never been exercised against real data. Do not dispatch
this phase until an Owner-selected real-hanger fixture exists (mirroring how
BM1 grounded every other phase); do not build the UI against synthetic
fixtures alone.

### Phase 7 — Nonlinear support authoring (pseudo-nonlinear FEA)

Two independent tracks, sequenced by what's already real:

- **7a. One-way/lift-off, general authoring.** M016 already proves the
  underlying technique (omit a restraint from a case's constraint set,
  re-solve, check the reaction sign). This phase turns that from a
  hand-built fixture technique into a UI control: a restraint marked
  "one-way" in the load-case stage (Phase 2) generates the lift-off-checked
  variant automatically. No new core math — this is real UI/orchestration
  work over an already-proven technique.
- **7b. Friction.** Blocked on M025 (PR #594, held) resolving its real
  non-convergence at near-limit friction states. Do not build UI for this
  until that PR (or a successor) merges with a genuinely converging solver —
  exposing a control for a solve path known to fail on real data would
  violate the same fail-closed discipline noted in Phase 2.

### Phase 8 — Consolidation decision on `index.html`'s Surface 2

Once Phases 1–4 land, `lfea.html` will be strictly more capable than
`index.html`'s disconnected Run/Results/Export surface for the InputXML
pipeline. Recommend (Owner decision, not made here): either (a) retire
Surface 2's standalone run-request-JSON entry path once `lfea.html` covers
its use cases, or (b) keep it deliberately as a scripted/batch-run interface
for automation — CAESAR II and AutoPIPE both offer a batch mode alongside
their interactive UI, so this may be worth keeping intentionally rather than
retiring. Either way, this should be a deliberate decision recorded like
every other disposition in `docs/OWNER_ROADMAP.md`, not left ambiguous.

---

## 7. Explicit non-goals

- **Canvas / 3D authoring / topology editing** — excluded per your
  instruction; `lfea.html` has none today and this plan adds none.
- **True nonlinear FEA** (large-displacement, plasticity, general contact) —
  out of scope; "pseudo non-linear FEA" here means exactly what CAEPIPE/
  CAESAR/AutoPIPE mean by it: iterative-linear solves for nonlinear
  *boundary conditions* (gap/one-way supports, friction), which is Phase 7.
- **Dynamic analysis** (modal, harmonic, response spectrum, time-history) —
  not requested ("Linear FEA and pseudo Non linear FEA" only) and not
  addressed here.
- **Rewriting any already-real Stack C kernel math** — every phase above is
  additive UI/orchestration wiring over existing, tested core modules, per
  `ARCHITECTURE_TRUTH.md`'s rule that the workbench layer must not rederive
  kernel results. Phase 5 is the sole exception and is explicitly scoped as
  new core work, flagged as such.

---

## 8. Open decisions needed before Phases 2, 5, and 7 can be dispatched precisely

1. **Load case UI granularity (blocks Phase 2 precise scoping).** Should the
   assembly control expose CAESAR-style raw case combination (pick physical
   cases + operator, build your own L-string) or a guided, code-category-first
   flow (pick "Sustained", the tool assembles the right physical cases)?
   AutoPIPE and CAESAR II differ on exactly this axis
   ([AutoPIPE vs CAESAR II](https://whatispiping.com/autopipe-vs-caesar-ii/)) —
   worth a deliberate choice rather than defaulting to either vendor's
   convention.
2. **Wind/seismic formulation (blocks Phase 5 dispatch).** Equivalent-static
   coefficient method (simple, matches most piping-code static practice) vs.
   a more complete site-spectrum-driven approach — the former is almost
   certainly right for a first pass given "pseudo non-linear FEA... not
   dynamic" is the stated scope, but should be confirmed before scoping the
   Work Pack, the same way every other core-math phase in
   `docs/OWNER_ROADMAP.md` was confirmed before dispatch.
3. **Friction (Phase 7b) priority relative to everything else.** M025 is
   already held pending a real fix from its implementing agent; this plan
   treats it as blocked-not-abandoned. Confirm whether closing it is a
   near-term priority (worth a dedicated Work Pack now) or should wait, the
   same triage the Owner already applied once in the BM1 (A)/(B)/(C) split.

---

## 9. Suggested sequencing

```
Phase 1 (restraint mutation UI) ──┐
Phase 3 (export)                  ├── independent, can run in parallel,
Phase 4 (settings re-mount)       │   no shared files with each other
                                   ┘
Phase 2 (load case UI) ── depends on Phase 1 landing first (shares the
                            journey-stage list in governed-journey-projection.js)

Phase 5 (wind/seismic/hydrotest load generation, core Work Pack)
     └── unblocks the wind/seismic/hydrotest options inside Phase 2's UI

Phase 6 (hanger design UI) ── independent, gated on an Owner-selected real
                                hanger fixture existing first

Phase 7a (one-way authoring) ── depends on Phase 2 (needs the load-case UI
                                  to attach a "one-way" flag to)
Phase 7b (friction) ── blocked on PR #594 (or successor) merging first

Phase 8 (index.html Surface 2 disposition) ── after Phases 1-4 land, revisit
```

Phases 1, 3, 4 are the highest-leverage, lowest-risk starting point: each is
additive UI wiring over already-real, already-tested core modules, touches no
shared engineering math, and directly closes the three gaps your original
request named explicitly (restraint mutation visibility, and — once Phase 2
follows — load case and export).
