# EMP (Empirical) Tab — UI Analysis and Recommendations

**Scope:** the `Empirical` top-level tab (`data-application-nav="EMPIRICAL"`, nav icon "E"), i.e. the
EMP.1 "Local Attachment Analytical Assessment" workbench.

**Method:** read the rendering/controller code, then ran the app (`npm run dev`, Vite) and drove the
tab in a real headless-Chromium session via Playwright — clicking through the toolbar, loading the
bundled demo/qualification sample data, and capturing screenshots of every scroll region — rather than
inferring behavior from markup alone. File:line references below point at the code backing each
observation.

---

## 1. What the tab actually is

`EMPIRICAL` is not a separate feature — it's the existing `LafeaWorkbenchController` mounted a second
time in a restricted presentation mode:

```js
// src/workspace/bootstrap.js:178
const empiricalWorkbenchController = new LafeaWorkbenchController(empiricalRoot, {
  presentationMode: 'ANALYTICAL_CALC',
  analyticalOnly: true,
  initialStage: 'LAFEA.1',
  ...
});
```

In this mode the workbench hides the FEA stage picker and shows only the "EMP.1" analytical route,
whose three backing engines are:

- **EMP.1.A** (`LAFEA.1`) — load/reference transfer & elastic pressure baseline (closed-form).
- **EMP.1.B** (`LAFEA.2`) — nominal pipe-section screening (closed-form).
- **EMP.1.C** — governed WRC 107/537 local-attachment correlation, bounded to a specific
  gamma/beta/edition/curve-variant combination.

No FE mesh is created anywhere in this tab — that's a repeated, deliberate statement in the UI copy
itself (`src/workspace/lafea-workbench-view.js:249`), and it's the tab's core value proposition: a fast,
mesh-free screening path that still carries full source-traceability and governed-authority bookkeeping.

## 2. What the current UI does well (keep these)

- **Per-field provenance.** Every input row carries its source pointer (`SOURCE-PIPE-MODEL@7#...`) and a
  `RETAINED_SOURCE` badge. For a calculation an engineer has to sign off on, this is exactly right and
  should not be diluted in the name of "cleaning up" the tab.
- **Explicit authority boundaries.** Recurring boxed notices ("Readiness is a read-only projection...",
  "Workflow status is presentation-only...") repeatedly tell the user what the dashboard does *not*
  establish. In a tool whose whole purpose is preventing a screening result from being mistaken for a
  qualified one, that's a feature, not clutter — but see §4.5 on how it currently reads.
- **The 7-step "Assessment workflow" list is genuinely interactive**, not decorative: each step button
  calls `scrollToRole`/`onSelectRoute` and jumps the page to the right card
  (`src/workspace/emp1-professional-workflow-view.js:181-213`). This is the one piece of in-page
  navigation the tab has, and it works. It should be the model for fixing §4.7, not something to
  replace.
- **"[SIMULATED]" is explicitly labelled** on every button that injects demo data, so a user can't
  mistake a demonstration run for a real one.
- **A live benchmark suite is one click away** inside the same page ("Verify EMP.1.A" / "FEA benchmark
  suite: Run Benchmark"), instead of being hidden in a separate QA tool.

## 3. How the tab actually looks (as rendered, not as assumed)

A clean load: header, a single "EMP.1 · Analytical" pill (no distracting FEA stage list), a 10-button
toolbar, then a 7-step workflow card with a 7-dimension readiness dashboard, all above the fold.
Loading the bundled demo source (`[SIMULATED] Load EMP.1.A demonstration source`) then reveals the real
size of the page: it renders **~9,400px tall** in a 1600×1058 viewport — over 8.5 screens of scrolling —
almost entirely governed input tables, one row per scalar value.

## 4. Findings and recommendations

Ordered by estimated impact on a working engineer's ability to enter data correctly and trust the
result, not by how easy each is to fix.

### 4.1 The most inviting button on the page fails silently on first use

`[SIMULATED] Load complete EMP.1 qualification sample` is the second button in the toolbar — the
natural "show me a working example" affordance for a new user. Clicked from a clean tab, it:

1. Loads the A and B source documents (visibly succeeds — the input tables populate).
2. Then attempts to run EMP.1's governed C transaction, which **fails**
   (`EMP1_A_CURRENT_QUALIFIED_RESULT_REQUIRED` — the sample doesn't run A first before B/C).
3. Records the failure in `this.emp1RunFailure` and re-renders
   (`src/workspace/lafea-workbench-controller.js:225-251`).

The only visible trace of that failure is a single line of text, **`Last EMP.1 transaction failed: ...`**,
inside the "EMP.1.C source binding and run setup" card
(`src/workspace/emp1-workbench-run-view.js:43-48`) — roughly 5,000px below the button that triggered it,
and styled identically (`.lafea-workbench__authority`: `border-left:4px solid #2dd4bf` — teal, not
red — `src/workspace/lafea-workbench-styles.js:19`) to the page's routine informational disclaimers.
Nothing near the toolbar changes: no toast, no inline error, no red state on the button itself. A user
who clicks this button and doesn't scroll ~5 screens down has no way to learn that "the complete
qualification sample" did not, in fact, complete.

**Recommend:**
- Fix the underlying sequencing bug (run/accept A before attempting C) so the sample genuinely loads a
  complete, currently-valid example.
- Independently of that: give transaction failures a distinct, alarming visual treatment (red/amber,
  not the same teal used for "this is read-only" notices), and surface them adjacent to the control that
  triggered them (inline under the toolbar), not only deep in the card that owns the failed state.

### 4.2 Raw enum constants are shown to the user, in a codebase that already solved this elsewhere

Throughout the EMP tab's readiness dashboard, blocking-evidence list, and bounded-route table, values
come from a helper that only replaces underscores with spaces:

```js
// src/workspace/emp1-professional-workflow-view.js:215-217
function human(value) {
  return String(value ?? 'UNRESOLVED').replaceAll('_', ' ');
}
```

That turns `CANONICAL_MODEL_NOT_CURRENT_AND_QUALIFIED` into "CANONICAL MODEL NOT CURRENT AND QUALIFIED"
— still shouting, still a code, not a sentence. The same is true of the "Still blocked outside this
bounded route" list (`NONZERO DIFFERENTIAL PRESSURE`, `GAMMA OTHER THAN 5`, `BETA OUTSIDE 0P05 TO 0P5`)
and of the artifact/status table further down (`ABSENT` / `NOT_EVALUATED` / `NOT APPLICABLE`).

This is notable because **the rest of the LAFEA/LFEA workbench already has the right pattern**, one hop
away in the same directory:

```js
// src/workspace/lafea-workbench-reason-labels.js:1-6
const REASON_LABELS = Object.freeze({
  CANONICAL_AUTHORIZATION_NOT_READY: 'Canonical analysis authorization is not ready.',
  CANONICAL_MODEL_NOT_CURRENT: 'The canonical analysis model is not current.',
  ...
```

Full sentences, sentence case, and (where useful) an instruction, not just a restated code. The EMP tab
is the one surface in this app that regressed on a bar the rest of the codebase already clears.

**Recommend:** extend `REASON_LABELS` (or an equivalent registry scoped to EMP.1's own blocker/state
codes) and route the readiness dashboard, bounded-route table, and artifact-status table through it
instead of through `human()`. `human()` is a reasonable *fallback* for genuinely unmapped codes, not a
substitute for the label registry.

### 4.3 A 10-row point table is rendered as 30 single-value rows

Under "Reference points," EMP.1.A has ten identities (`LUG-BASE-NE/NW/SE/SW`, `PLATE-NE/NW/SE/SW`,
`SOURCE`, `TARGET`), each needing an X, Y, and Z coordinate. The table renders **one full-width row per
scalar** — "Reference point X / LUG-BASE-NE", "Reference point Y / LUG-BASE-NE", "Reference point Z /
LUG-BASE-NE", then the next identity — i.e. 30 rows to express what is conceptually 10 points. On a
1600-wide screen each row is mostly empty space either side of a single number field.

This isn't just a length complaint: grouping by axis instead of by point actively works against the
engineer's actual QA task, which is "does this point's XYZ look right", not "does this axis look right
across all ten unrelated points."

**Recommend:** one row per identity, three columns (X / Y / Z), consistent with how a piping engineer
would tabulate a coordinate list by hand. This alone would cut that section from ~30 rows to ~10 and
make cross-axis transcription errors far easier to spot.

### 4.4 Every field carries its full JSON path at equal visual weight to its label

Each input row shows three stacked lines: the human label ("Pipe outside diameter"), the owning stage
(`LAFEA.1`), and the exact document path (`document.pipeGeometry.outsideDiameter.value`) — all in the
same size, in the "Engineering identity" column, ahead of the actual input box. For an evidence/QA
reviewer that path is valuable; for the much more common task of "type in 47 numbers from a datasheet"
it roughly triples the vertical space and reading effort per field.

**Recommend:** keep the path (it's legitimately useful custody information) but demote it — smaller,
muted color, or collapsed behind a hover/title — so the label is the dominant text and the path is
available without being read on every single row by default.

### 4.5 Key/value blocks and tables coexist on the same page with different layouts

"Model-declared analysis settings" and "Solver readiness" render as label-on-one-line,
value-indented-on-the-next, repeated down the page as plain text (see the "Source metadata" / "Solver
contract metadata" / "Technical identifiers and lifecycle custody" blocks). A few screens later, the
same kind of data ("Reference points," the WRC bounded-route datum table) renders as an actual table
with a header row. Both are legitimate patterns, but having both on one page, for structurally identical
label→value data, makes the page harder to skim — the eye has to re-learn "where's the value" every time
the pattern switches.

**Recommend:** pick one (a compact two-column `<dl>`/grid styled as a real table would read better at
this density) and apply it consistently across the metadata/custody sections.

### 4.6 Toolbar is ten unranked, undifferentiated buttons

```
[SIMULATED] Load EMP.1.A demonstration source | [SIMULATED] Load complete EMP.1 qualification sample |
Import EMP.1.A source JSON | Prepare EMP.1 · A → B → governed C | Complete C source binding |
Validate and run EMP.1.A | Verify EMP.1.A | Export EMP.1.A source | Undo | Redo
```
(`src/workspace/lafea-workbench-view.js:374-482`)

These aren't equally relevant at any given moment — several are sequential (import → validate/run →
export) and several are mutually exclusive with each other (you wouldn't load the demo source and then
also load the qualification sample). Today they're all the same size, same default button styling, and
disabled/enabled state is communicated only by a slightly duller color plus a `title` tooltip that isn't
visible until hover.

**Recommend:** group by intent (Source / Run / Evidence) with a visual separator, and give whichever
action is next in the current EMP.1 step (already computed — that's exactly what the readiness
dashboard tracks) a primary/filled button style, demoting the rest to secondary/outline. The demo-data
buttons already get an amber outline distinguishing them as non-production actions — extend that same
"distinct treatment for a distinct category" idea to the rest of the toolbar instead of leaving eight
buttons visually identical.

### 4.7 The one collapsed section is the one with the actual editable inputs

"Technical backing calculators and custody (A/B/C)" — the `<details>` that contains every input table
described in §4.3–4.5 — is collapsed by default (`src/workspace/emp1-professional-workflow-view.js:157-179`).
A first-time user sees the readiness dashboard and the 7-step list, and has to know to expand a
disclosure labelled "Technical backing calculators and custody" to find where to actually type in pipe
geometry. The 7-step chips do auto-expand/scroll to it when clicked (§2), so this only bites a user who
scrolls manually instead of using the step buttons — but that's still the more common way people read a
long page.

**Recommend:** default it open once a step has been selected or data exists on the active stage/backing
document (i.e. keep it collapsed only in the genuinely-empty state), or promote the A/B/C selector to
be visible top-level navigation instead of a disclosure children have to know to open.

### 4.8 No fixed orientation on a ~9,400px page

Once scrolled a few screens down, there's no persistent indicator of which EMP.1 step you're in, and no
"back to top"/re-access to the toolbar without scrolling all the way back. The 7-step chips (§2) are a
good navigation primitive but they themselves scroll out of view.

**Recommend:** make the toolbar (or a condensed version: current step + primary action) sticky, and/or
add a lightweight persistent step indicator, so the page's own good navigation feature stays reachable
while working through a long form.

## 5. Suggested sequencing

If tackled in order of engineer-facing value per unit of change:

1. **§4.1** — fix the qualification-sample sequencing bug and give failures a distinct visual treatment.
   Small, high-value: a broken "try it" button actively teaches new users the tool doesn't work.
2. **§4.2** — route EMP.1's own state/blocker codes through a `REASON_LABELS`-style registry. Mechanical,
   low-risk, and the pattern to copy already exists and is proven in this codebase.
3. **§4.3 / §4.4** — restructure the reference-points table and demote the JSON-path sub-label. Pure
   presentation change over existing data; no calculation logic touched.
4. **§4.6 / §4.7 / §4.8** — toolbar grouping, default-open backing custody, sticky navigation. Larger,
   more subjective changes; do these once the data-entry surface itself (above) is no longer the
   dominant complaint.
5. **§4.5** — layout consistency pass across metadata blocks. Lowest urgency; a cosmetic normalization
   once everything it would touch has settled from the changes above.

None of the above requires touching the EMP.1.A/B/C calculation kernels, the governed-authority state
machine, or the source/custody model — every recommendation here is a presentation-layer change over
data the tab already computes correctly.
