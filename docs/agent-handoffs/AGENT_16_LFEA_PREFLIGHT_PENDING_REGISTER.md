# AGENT 16 — LFEA pre-flight and enrichment: pending activity register

**Type:** issue / work package
**Status:** OPEN — unassigned, pending agent qualification
**Raised:** 2026-08-09
**Branch context:** `codex/accdb-benchmark-template` @ `2b757bab` (merge-base with `main`: `5e2db18f`)

## Baseline

Three surfaces now live in the **LFEA (F)** view, in this DOM order:

```text
[data-application-view="LFEA"]
  ├─ [data-role="linear-piping-consumer-root"]   Linear Piping FEA — pre-run check / run / results / exports
  ├─ [data-role="lfea-preflight-root"]           Source Enrichment Pre-Flight (read-only)
  └─ [data-role="lfea-consumer-root"]            LFEA mesh-package workbench (T3/Q4)
```

Delivered and verified in the running app: governed pre-FEA diagnostics per case
(`checkLinearPipingRunRequest`), the sealed-package import/run/export chain, and the
remediated enrichment pre-flight grid (duplicate-preserving key buckets, complete
candidate sets, blocked empty model, bounded DOM, no markup injection).

Everything below is what remains. Severity follows the repository convention:
**S1** wrong engineering number reaches the user · **S2** correct number, misleading
presentation or absent capability · **S3** usability / maintainability.

---

## A — Debt created by the remediation (close these first)

Removing the `RETIRE`/`RELOCATE` behaviours from `lfea-preflight-ui.js` left loose ends.
They are named here rather than left for someone to trip over.

### P-01 · S3 · `topology-autofix-log.js` is orphaned

`src/workspace/topology-autofix-log.js` (96 lines) exports `mountAutofixLog`. Its only
importer was the pre-flight screen. It now has **zero importers anywhere in `src/`**.

Decide: build the governed topology-preflight surface that owns it (`RELOCATE` per
`docs/enrichment-ui-phase0-inventory.md`), or retire the module. Do not leave a third
orphan behind — that is the condition this whole work package exists to end.

### P-02 · S2 · The topology autofix capability is absent from the application

The inventory classified it `RELOCATE` to "a separate topology-preflight authority
boundary". That authority does not exist, so the capability is simply gone.

**Scope it against what actually ran, not what the old UI implied.** The removed flow
dispatched `viewport:render-autofix-overlays`, `viewport:fly-to`,
`viewport:clear-autofix-overlays` and `topology:rebuild-requested`. A repository-wide
search finds **no listener for any of them**. The 3D-visualisation half of that feature
never worked; only `analyzeTopologyOverlaps` + the log ledger did. Rebuilding the
implied feature rather than the real one is the trap here.

`analyzeTopologyOverlaps` itself survives and is still exercised by
`scripts/run_load_calc.mjs:71`.

### P-03 · S3 · `deriveWallThicknessFromDtxr` is exported and unreachable

Now in `src/workspace/lfea-preflight-resolution.js`. Inventory disposition is `RELOCATE`
into a review drawer; no drawer exists.

Note before scoping: the old call site invoked it as `deriveWallThicknessFromDtxr(bore, cls)`
— two arguments of three. `dtxrAttr` was `undefined`, so the guard returned `null` on
every call. The button had been dead for its whole life. The function's contract is sound
(explicit evidence or `null`); it has simply never had a caller that supplied evidence.

### P-04 · S3 · `renderProjectConfiguration` has zero importers

`src/workspace/lfea-preflight-ui.js:45`, wrapping `renderProjectDataView`. Pre-dates this
work. Either give it a call site or delete the indirection.

### P-05 · S2 · `docs/Prefetchandempericalloadconceptnote.md` describes UI that no longer exists

Sections describing the DTXR `BLOCKED` badge flow and the `analyzeTopologyOverlaps`
visualisation now document removed behaviour. The file also links source through a
backup path (`Advanced_Analysis-backups/20260801_161744/...`) rather than the repository.
Both are drift hazards of exactly the class `doc-drift-check.mjs` exists to prevent.

---

## B — Declared but not delivered

### P-06 · S2 · Phase 1 enrichment acceptance items

`docs/enrichment-ui-phase1-acceptance-checklist.md` is the contract. Outstanding:

- indexed bitset facets with visible AND/OR semantics and complete-dataset counts
- missing / ambiguous / conflicting / stale / proposed / deferred as first-class queues
- proposal flow and an immutable review-event ledger (accept, reject, override, defer, undo)
- true row **and** column virtualization over immutable indexed stores
- the closed, ordinal-addressed 40-column engineering schema
- keyboard selection, focus and expansion continuity across sorting, filtering and recycling

**Interim state:** live DOM is bounded by `PREFLIGHT_LINE_KEY_ROW_CAP = 500` and
`PREFLIGHT_COMPONENT_ROW_CAP = 200`, with surplus reported on screen. That is a bound,
not virtualization — see qualification question 3.

### P-07 · S1-adjacent · No raw InputXML file intake

`[data-role="dataset-file"]` accepts `.sjson,.json` only. The only executable path is a
hand-authored `linear-piping-workbench-run-request/v1` JSON embedding
`inputXmlAnalysisRequest.inputXmlSource`
(`src/core/linear-piping-analysis-consumer/inputxml-request-validation.js:31`).

This is blocked on engineering decisions, not UI work: unit resolution when
`<UNITS><LENGTH>` is absent, ingestion options, component origins, restraint type code
map, restraint type mutation, bend radius tolerance, and the conditioning profile.
Fixture generator for the shape: `scripts/m003-live-run-analysis-fixture.mjs`.

### P-08 · S2 · `analyze.html` is fail-closed and now discoverable

`src/analyze/analyze-controller.js:140` replaces the Resultants section with
`PREFEA_AUTHORIZATION_REQUIRED`, and `failClosedAnalyzeSolve()` throws. The page is
diagnostics-only until a prepared source, sealed authorization and explicit solver
executor are supplied through the governed gateway.

It is now linked from the piping toolbar ("Open InputXML Analyzer"), so users will reach
a page that cannot run. Either wire the gateway or make the limitation legible at the
link, not only on arrival.

### P-09 · S2 · Run Analysis is not gated on the pre-run check

`checkLinearPipingRunRequest` reports `PASS` / `WARN` / `BLOCK` and
`solveAuthorized`; nothing consumes them as a gate. Decide whether `BLOCK` should
hard-block the solve, warn, or stay advisory — and record the decision, because the
current silence reads as "not implemented" rather than "deliberately advisory".

### P-10 · S3 · `capabilityEffects` shape mismatch is absorbed, not resolved

`inputxml-linear-model-health.js` publishes `capabilityEffects` as a record keyed by
capability id carrying per-capability disposition and limitation code. The finding
contract (`makeFinding`) expects a list of capability ids. Before this session that
mismatch threw `(values ?? []).filter is not a function` for **every** genuine
model-health finding, which is why the entire pre-FEA diagnostics path was dead on
arrival for realistic InputXML.

`capabilityEffectIds()` in
`src/core/linear-piping-analysis-consumer/inputxml-linear-prefea-diagnostics.js:189`
now accepts both shapes. The producer/consumer disagreement upstream is untouched.

---

## C — Red gates (pre-existing; verified identical with this session's changes stashed)

### P-11 · `scripts/advanced-shell-contract-check.mjs` fails — **blocks `npm run build`**

Asserts `/Empirical scenario:/u` against `src/workspace/load-calc-consumer-view.js`.

### P-12 · `test/lfea-prefea-gateway.test.js:324` fails

Asserts the source text of `linear-piping-analysis-consumer/index.js` matches
`/solveInputXmlLinearAnalysis/u`. The symbol is re-exported through
`export * from './inputxml-linear-prefea.js'`, so the literal never appears in that file.

### P-13 · `scripts/linear-piping-analysis-consumer-anti-drift-check.mjs` fails

`inputxml-feature-inventory.js` is 433 physical lines against a `<300` limit. Note
`inputxml-linear-prefea-diagnostics.js` is now 363 (339 before the P-10 fix) and is also
over the limit; the check reports only the first failure.

### P-14 · `scripts/master-data-containment-check.mjs` reports `CONTAINMENT STATUS: FAILED`

F-001 … F-007. Master Data and JSON Trace are declared non-authoritative and
experimental. Relevant here because the enrichment pre-flight reads
`masterDataController.getMasterData()?.lineList?.normalizedRows` as its master source.

---

## D — Environment

### P-15 · Playwright browsers are not installed; the e2e spec has never been executed

`npx playwright install` is required. `e2e/linear-piping-results-workspace.spec.js` was
edited to click into the LFEA view before driving the section (the surface moved out of
the properties panel), and **that edit has not been run**. Its assertions were reproduced
by hand against the live app, which is weaker evidence than a green spec. Treat running
it as the first acceptance step, not the last.

---

## Assignment rules

1. One register item per branch, one per PR. Branch `agent16-<item-id>-<slug>`.
2. State the merge-base SHA in the PR body and list every file read in full before editing.
3. No new runtime dependencies. The repository has exactly one (`three`).
4. No physics changes. If a diff alters a numeric output from any `src/core/**` solver,
   stop and escalate.
5. **Never weaken a guard to make a check pass.** If a guard must change, the PR must
   argue why the guard was measuring the wrong thing, and must leave the invariant
   asserted at least as strongly as before. See qualification question 2.
6. Every PR runs, and reports output for: `npm run syntax:strict`, `node scripts/import-check.mjs`,
   `node scripts/run-enrichment-ui-phase0-checks.mjs`, `node scripts/linear-piping-workspace-integration-check.mjs`,
   `node scripts/ui-invariant-check.mjs`, and `npx vite build`.
7. Red gates P-11 … P-14 are pre-existing. Do not claim them as regressions, and do not
   claim a PR is green while they are red — state them explicitly as carried.

---

## Agent qualification test

Five questions. All five must be answered before assignment. These are judgement
questions with wrong answers, not comprehension questions.

**1 — Scoping a relocation against a feature that never worked.**
P-02 asks you to relocate topology autofix into a governed authority. The removed
implementation dispatched four custom events for 3D overlay rendering and fly-to
navigation, and no listener for any of them exists in `src/`. State what the feature
actually did versus what its UI implied, explain how you would establish that from the
repository alone without trusting either the code comments or
`docs/Prefetchandempericalloadconceptnote.md`, and say what you would build — including
what you would deliberately not rebuild, and why removing a control that dispatched into
the void is or is not a capability regression.

**2 — When is changing a guard legitimate?**
`scripts/check-enrichment-ui-phase0-antidrift.mjs` previously asserted seven risk probes
were `true` (freezing known defects in an orphaned screen). It now asserts they are
`false`, and two probe regexes were widened: `singleValueMapOverwriteRisk` no longer
fires on a Map whose values are array literals, and `sharedModelMutationRisk` no longer
fires on `const sharedModel = ...`. Give the strongest argument that this is an agent
editing the exam to pass it. Then state the specific evidence that distinguishes a
legitimate probe correction from a self-serving one, and describe the mechanism you would
add so the next agent cannot widen a probe without that evidence being visible in review.

**3 — A cap is not virtualization.**
The pre-flight screen bounds live DOM with a fixed `PREFLIGHT_LINE_KEY_ROW_CAP = 500`.
Go through `docs/enrichment-ui-phase1-acceptance-checklist.md` under "Indexed model and
virtualization" and classify each item as: genuinely satisfied by the cap, superficially
satisfied but not really, or not addressed. Then answer the engineering question: for a
100,000-line model, what does a reviewer lose with a 500-row cap that they would not lose
with viewport-plus-overscan virtualization, and is "surplus is reported on screen"
sufficient mitigation for an engineering review surface? Justify either answer.

**4 — Normalize at the adapter, or fix the contract?**
P-10 describes a producer emitting `capabilityEffects` as a keyed record while the
consumer contract expects a list, absorbed by a tolerant adapter function. Argue when
adapter-level normalization is the correct permanent answer and when it is a bug being
hidden. State precisely what evidence in this repository would decide which case applies
here, what you would change if the contract is wrong, and what regression risk that
carries for `foldReadiness`, the sealed diagnostics record's semantic hash, and any
committed evidence artifact that embeds it.

**5 — Three kinds of red.**
P-11 … P-14 are all failing. For each, distinguish between (a) a stale assertion that was
true once and no longer describes the code, (b) a real defect the assertion is correctly
catching, and (c) an assertion that was aspirational and never passed. Describe how you
would determine which applies using only this repository — noting that `git log` history
is available but that `docs/OWNER_ROADMAP.md` records the CI that once ran these was
removed as non-functional scaffolding. Then state which of the four you would fix first
and why, given that P-11 blocks `npm run build` and therefore blocks every other item in
this register.
