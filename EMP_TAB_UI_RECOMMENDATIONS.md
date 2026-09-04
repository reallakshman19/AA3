# EMP (Empirical) Tab — UI Analysis and Recommendations

> **Implementation status (2026-09-02).** Sections 4 and 6 are implemented on
> `claude/emp-tab-ui-recommendations-7n8cug`. What landed, and where it differs from
> what section 4 originally proposed:
>
> | Finding | Status |
> |---|---|
> | §4.1 silent run failure | Done — reported under the toolbar at 354px in its own red treatment, not the teal used for disclaimers, with the raw code kept for traceability |
> | §4.2 raw enum constants | Done — `emp1-plain-language-labels.js`, the EMP.1 counterpart of `lafea-workbench-reason-labels.js`; composed step labels mapped half by half |
> | §4.3 30-row point table | Done — one row per identity with X/Y/Z columns; the EMP page fell from ~9,400px to 7,839px |
> | §4.4 JSON path weight | Done — demoted to a muted truncated line, full value on hover; kept in the DOM as custody information |
> | §4.5 layout consistency | Not done — lowest urgency, deliberately deferred |
> | §4.6 toolbar | Done — grouped Source / Run / Evidence with a state-tracking primary action; FE stages keep the flat toolbar |
> | §4.7 collapsed disclosure | Done — opens once any step has data |
> | §4.8 no fixed orientation | Not done — the page shortened enough that this became less pressing |
> | §6.4 WRC surface | Partly done — the shell-parameter domain and curve-selection panel landed. The wider two-column relayout did not, and would now be a larger change than the value it adds |
>
> **One correction to section 6.3.** The "governing result" concern applied to the
> *proposed* layout, not to the code. The existing result scope panel already says
> "Governing among eight evaluated WRC points", "Continuous/global shell maximum:
> NOT CLAIMED", "Nozzle / attachment-wall stress: NOT CALCULATED" and "Code
> compliance: NOT ESTABLISHED BY THIS WRC RESULT". It was right already and was left
> alone. The `Allowable`/`Utilization` removal in 6.3 still stands.
>
> **Calculation work this depended on.** Non-tabulated gamma is now evaluable
> (`emp1-wrc537-cylindrical-gamma-interpolation.js` and the interpolated domain and
> adapter), validated against the CAUx 2017 benchmark to within 2.0% at all eight
> points. The qualified gamma=5 route is untouched. Interpolated results are stamped
> non-source-qualified; whether they get an engineering-use route registration
> remains an owner decision.

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

---

## 6. Reviewed layout proposal

A conceptual desktop layout was proposed for the WRC/C surface of this tab. Reviewed against the
kernels below, most of it holds up and is adopted; three items are corrected because they claim
authority the code explicitly refuses to assert.

### 6.1 Adopted as proposed

| Proposed element | Why it holds up |
|---|---|
| Status strip + four readiness tiles | Condenses the 7-dimension dashboard into a glanceable header; fixes §4.8 orientation. |
| Two-column inputs \| authority split | Directly replaces the ~9,400px single column. |
| Grouped fieldsets, side-by-side pairs | Fixes §4.3 (30 rows for 10 points) and §4.4 (path sub-label dominance). |
| `DERIVED BASIS` as read-only | Matches the code: `Rm, T, WRC axes, γ, β, Kn/Kb` and nearest-end distance are explicitly *not* editable calculation authority (`emp1-workbench-run-view.js:33`). |
| `VALIDATE INPUTS` → `RUN` gating | Proper primary-action hierarchy; fixes §4.6's ten undifferentiated buttons. |
| `Au/Al/Bu/Bl/Cu/Cl/Du/Dl` points table | Exactly the kernel's own `LOCATIONS` (`src/core/emp1/emp1-wrc537-cylindrical-table5.js:1`). |
| Circumferential / Longitudinal / Shear / Stress intensity columns | Exactly the kernel's returned `stresses: { circumferential, longitudinal, shear, stressIntensity }` (line 95). |
| Plain-language statuses ("Awaiting validation", "Not calculated") | This *is* the §4.2 fix, demonstrated. |
| Provenance + authority-boundary panels | Preserves the custody/hash traceability flagged as a keep in §2. |

### 6.2 Adapted — restored what the layout dropped

1. **Per-field source provenance.** The proposed fields are bare input boxes. Today every value carries
   `SOURCE-PIPE-MODEL@7#geometry.outsideDiameter` + `RETAINED_SOURCE`. That is the tab's strongest
   feature (§2) and the thing an engineer signing the calculation needs. Restored as a compact `src A@7`
   chip per field, expanding to the full path on demand, with a `source: [ chip ▾ ]` mode toggle — this
   is the §4.4 fix (demote, don't delete).
2. **Source intake and `[SIMULATED]` quarantine.** The proposal has no import or demo-data controls.
   Restored as a dedicated source row, with demonstration actions visually quarantined below a rule.
3. **Export / Undo / Redo / Verify.** Absent from the proposal; the live benchmark suite in particular
   is a genuine strength (§2). Restored as a secondary cluster in the same row.
4. **The A → B → C step rail.** The proposal is a C-only screen, but C is gated on A's *result* and B's
   *document* — that is precisely the §4.1 failure (`EMP1_A_CURRENT_QUALIFIED_RESULT_REQUIRED`). A
   C-only screen shows a disabled Run button with no explanation and no path to fix it. The rail makes
   the prerequisite chain visible and navigable, and lets the blocked-run message point at the step
   that is actually blocking.
5. **Bounded-route domain limits, live.** "Attachment → shell junction" under-represents the route.
   The real route is `WRC537_2013_CYLINDRICAL_ORIGINAL_GAMMA5_TABLE5_ZERO_DP`: γ = 5 exactly,
   0.05 ≤ β ≤ 0.5, Δp = 0, Kn/Kb = 1/1, interpolation and cross-variant fallback both PROHIBITED.
   Running outside that domain is the single most dangerous misuse of this tab, so the limits belong
   on-screen beside the inputs that can violate them, with live in/out-of-domain marks.

### 6.3 Corrected — three claims the code refuses to make

1. **`Allowable` and `Utilization` — removed.** `grep -rni "allowable|utilization|codeCheck"` over
   `src/core/emp1` and `src/core/local-stress` returns **zero hits**. This tab has no allowable
   authority and no code-check authority; code compliance is separately tracked as `NOT ASSESSED`. A
   utilization ratio reads as a pass/fail code check — exactly the false confidence the whole
   governed-authority architecture exists to prevent. The panel now states plainly that no allowable,
   utilization or code check is produced here.
2. **`GOVERNING RESULT` → `EIGHT-POINT ENVELOPE`.** The kernel's own scope object says
   `absoluteShellMaximumAssured: false`, `arbitraryLoadingGlobalMaximumAuthority: false`,
   `continuousJunctureSearchPerformed: false`, `intermediatePointSearchPerformed: false`, with
   `limitationCode: 'WRC_TABLE5_EIGHT_POINTS_NOT_GLOBAL_ABSOLUTE_MAXIMUM'` (lines 23-32). The code
   calls the value `eightPointEnvelope` and deliberately avoids the word "governing". Calling the worst
   of eight tabulated points "governing" asserts the controlling design stress — which the kernel
   states it cannot assure. The limitation is now carried on the panel.
3. **"Evaluate attachment stresses" → shell stresses.** `EMP1_WRC537_CYL_TABLE5_STRESS_SCOPE` is
   `shellStressesCalculated: true`, `attachmentStressesCalculated: false`,
   `nozzleStressesCalculated: false`, domain `HOST_CYLINDRICAL_SHELL_AT_ATTACHMENT_SHELL_JUNCTURE`
   (lines 15-22). The step computes stresses *in the host shell at the juncture* — not in the
   attachment. The heading is corrected accordingly.

### 6.4 Adapted layout

Sample values are internally consistent with the bounded route: shell OD 1100, T 100 → Rm 500,
γ = Rm/T = 5 ✓; attachment OD 170 → r₀ = 85, β = r₀/Rm = 0.17 ✓ (within 0.05–0.50).

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ EMP.1 · LOCAL ATTACHMENT ANALYTICAL ASSESSMENT           ● A,B BOUND   ○ C NOT RUN         │
│ Shell stresses at the attachment–shell juncture (WRC 537 §4.5.3). No FE mesh is created.   │
└────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┬──────────────────────┬─────────────────────┬────────────────────────┐
│ METHOD AUTHORITY     │ SOURCE BINDING       │ APPLICABILITY       │ CURRENT RESULT         │
│ WRC 537 · 2013       │ ✓ A bound · rev @7   │ ⚠ Not confirmed     │ Not calculated         │
│ Bounded route only   │ ✓ B bound · rev @7   │ β, Δp not checked   │ Review/Code/Release    │
│ Interp. prohibited   │ ⚠ C incomplete       │ until validation    │ all pending            │
└──────────────────────┴──────────────────────┴─────────────────────┴────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ A · LOAD & REFERENCE ───●─── B · SECTION SCREENING ───○─── C · WRC LOCAL CORRELATION       │
│ ✓ source bound            ✓ source bound              ⚠ blocked · A has no current result  │
│ Open A →                  Open B →                    ← fix here first                     │
└────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ SOURCE  [ Import C source JSON ]  [ Export ]  [ Undo ] [ Redo ]     [ Verify · run suite ] │
│ - - demonstration data only - -  [ ⚠ SIMULATED · demo source ]  [ ⚠ SIMULATED · sample ]   │
└────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐  ┌──────────────────────────────────────┐
│ SOURCE-BOUND INPUTS        source: [ chip ▾ ]    │  │ BOUNDED ROUTE · IN-DOMAIN CHECK      │
├──────────────────────────────────────────────────┤  ├──────────────────────────────────────┤
│ Load reference                                   │  │ WRC537 · 2013 · CYLINDRICAL / ROUND  │
│   Load case         [ LC-A         ▾]   src A@7  │  │ Curve ORIGINAL · Table 5 · Δp = 0    │
│   Pressure result   [ P-CLOSED     ▾]   src A@7  │  │                                      │
│   Δp                  0 MPa   ✓ zero required    │  │   γ     5.000  ✓ tabulated γ=5 only  │
│                                                  │  │   β     0.170  ✓ within 0.05–0.50    │
│ Attachment geometry                              │  │   Δp    0 MPa  ✓ zero Δp required    │
│   Geometry identity [ LUG-BASE-NE  ▾]   src A@7  │  │   Kn/Kb 1 / 1  ✓ unity required      │
│   Outside diameter  [    170.0 ] mm     src A@7  │  │                                      │
│     ╭─ source ───────────────────────────────╮   │  │ Interpolation ......... PROHIBITED   │
│     │ SOURCE-PIPE-MODEL@7#geometry.outsideDia │  │  │ Cross-variant fallback  PROHIBITED   │
│     │ RETAINED_SOURCE · bound at A · rev @7   │  │  │                                      │
│     ╰─────────────────────────────────────────╯  │  │ Outside this route → blocked (8) ▾   │
│                                                  │  └──────────────────────────────────────┘
│ Cylinder geometry                                │
│   Cylinder diameter [   1100.0 ] mm     src A@7  │  ┌──────────────────────────────────────┐
│   Shell thickness   [    100.0 ] mm     src A@7  │  │ ACTIONS                              │
│   Cylinder length   [   3000.0 ] mm     src A@7  │  ├──────────────────────────────────────┤
│   WRC station  x    [   1500.0 ] mm     src A@7  │  │ ┌──────────────────────────────────┐ │
├──────────────────────────────────────────────────┤  │ │ VALIDATE INPUTS                  │ │
│ DERIVED — not editable calculation authority     │  │ └──────────────────────────────────┘ │
│   r₀  outside radius at juncture ...    85.00 mm │  │ ┌──────────────────────────────────┐ │
│   Rm  mean shell radius ............   500.00 mm │  │ │ RUN C · WRC EVALUATION        →  │ │
│   β   = r₀ / Rm ....................     0.170   │  │ └──────────────────────────────────┘ │
│   γ   = Rm / T .....................     5.000   │  │ ⚠ Blocked — A has no current result. │
│   Nearest-end = min(x, L−x) ........  1500.00 mm │  │   Run step A, then return here.      │
└──────────────────────────────────────────────────┘  └──────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ EIGHT-POINT ENVELOPE (WRC Table 5)                                     STATUS: NOT RUN     │
│                                                                                            │
│ Max stress intensity   —        at point   —      Invariant: Tresca (plane stress)         │
│                                                                                            │
│ ⚠ Not a global maximum. Eight tabulated juncture points only — no continuous juncture      │
│   or intermediate-point search is performed (WRC 537 §4.3.6). Shell stresses only;         │
│   attachment and nozzle stresses are not calculated. No allowable, utilization or code     │
│   check is produced by this step.                                                          │
└────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ WRC EVALUATION POINTS — shell stress at juncture, σ in MPa                                 │
├───────────┬──────────────────┬─────────────────┬──────────────┬──────────────────┬─────────┤
│ Location  │ Circumferential  │ Longitudinal    │ Shear        │ Stress intensity │ Status  │
├───────────┼──────────────────┼─────────────────┼──────────────┼──────────────────┼─────────┤
│ Au        │ —                │ —               │ —            │ —                │ NOT RUN │
│ Al        │ —                │ —               │ —            │ —                │ NOT RUN │
│ Bu        │ —                │ —               │ —            │ —                │ NOT RUN │
│ Bl        │ —                │ —               │ —            │ —                │ NOT RUN │
│ Cu        │ —                │ —               │ —            │ —                │ NOT RUN │
│ Cl        │ —                │ —               │ —            │ —                │ NOT RUN │
│ Du        │ —                │ —               │ —            │ —                │ NOT RUN │
│ Dl        │ —                │ —               │ —            │ —                │ NOT RUN │
└───────────┴──────────────────┴─────────────────┴──────────────┴──────────────────┴─────────┘

┌──────────────────────────────────────────────────┐  ┌──────────────────────────────────────┐
│ CALCULATION PROVENANCE                           │  │ AUTHORITY BOUNDARY                   │
├──────────────────────────────────────────────────┤  ├──────────────────────────────────────┤
│ Transaction ID ................... —             │  │ Result publication   NOT AUTHORIZED  │
│ Input semantic hash .............. —             │  │ Engineering review   REQUIRED        │
│ Axis source SHA-256 .............. —             │  │ Code compliance      NOT ASSESSED    │
│ Route / method revision .......... —             │  │ Release state        DRAFT           │
│ Completed at ..................... —             │  │ Evidence completeness  PENDING       │
└──────────────────────────────────────────────────┘  └──────────────────────────────────────┘
```

Global application navigation is intentionally excluded; this layout begins and ends inside the tab.

---

## 7. Appraisal of the PV Elite C101 report as UI reference and benchmark

Source: `Nozzle_Flange_MAWP_ResultsC101.pdf` — PV Elite 28 output, Southern Oil Refinery 2,
SOR2-MEC-CAL-C101 Rev A, fractionation column C101. 20 pages: nozzle flange MAWP derating per
ASME UG-44(b), plus a full WRC 297 local-stress run for nozzle "A".

### 7.1 Not usable as a numerical validation benchmark for EMP.1.C

Four independent disqualifiers, each fatal on its own:

| # | Report | EMP.1.C bounded route | Verdict |
|---|---|---|---|
| 1 | Method is **WRC 297** (flexible hollow nozzle, λ/`T/t` curve access) | `WRC537_2013_CYLINDRICAL_ORIGINAL_GAMMA5_TABLE5_ZERO_DP`, rigid attachment | different method |
| 2 | γ = Rm/T = **42.7** (pad edge) / **43.2** (nozzle edge) | γ = 5 exactly; `docs/04_WRC537_NUMERICAL_TABLES.csv` tabulates only **5, 15, 50**; interpolation PROHIBITED | `NON_TABULATED_GAMMA` |
| 3 | Δp = **523.70 kPa**, and ~28 MPa of the reported `Circ. Pm` is pressure membrane | Δp = 0 required; WRC 537 `pressureStress: NOT_SUPPORTED (explicitly excluded)`, EXCL_002 | `NONZERO_DIFFERENTIAL_PRESSURE` |
| 4 | Headline output is *"Nozzle Stress Summation at Vessel-Nozzle Junction"* | `nozzleStress: NOT_SUPPORTED`; EXCL_001 "Stresses in nozzle not calculated" → `METHOD_NOT_APPLICABLE` | out of scope |

Note β = **0.42** (nozzle edge) and **0.50** (pad edge) both sit legitimately inside the route's
0.05–0.50 window. The case therefore *passes* a naive β-only applicability check and is rejected only
on γ, Δp and method — which makes it unusually valuable as a gate test (§7.2a).

### 7.2 Genuinely usable in three other ways

a. **Guard / negative benchmark (high value).** A real, third-party, signed case the applicability gate
   *must* reject, with predictable codes (`NON_TABULATED_GAMMA`, `NONZERO_DIFFERENTIAL_PRESSURE`,
   nozzle-stress scope). Because β passes, it exercises the gate against a genuinely seductive input
   rather than an obviously-invalid synthetic one.
b. **Load-convention conformance fixture.** The report states its loads are in *"WRC 107/537
   Convention"* and gives all six components — `P −25926.99 N`, `Vc 22115.01 N`, `Vl 69592.96 N`,
   `Mc −45209.96 N·m`, `Ml 78037.98 N·m`, `Mt 101000.95 N·m` — which is verbatim the field set of
   `normalizeLoads` in `emp1-wrc537-cylindrical-table5.js:110`, with real signed values (P inward
   negative, Mc negative). Good for testing intake and sign handling independently of the stress maths.
c. **UI / report reference (strongest yes).** See §7.3.

### 7.3 UI lessons worth adopting

1. **Transpose the results table.** PV Elite puts the eight points as *columns* and stress types as
   *rows*. That is better than the row-per-point form in §6.4: the engineering read is "compare this
   stress category across the eight points", and eight columns fit one screen width without scroll.
2. **Report identity on every page** — project, document number, equipment, software + version,
   licensee, filename, step, timestamp. This is what makes an output signable, and it is what the
   `CALCULATION PROVENANCE` panel should carry.
3. **State the basis in prose beside the number** — e.g. *"Because only sustained loads were specified,
   the Pm+Pl+Q allowable was 3 × Smh."* One line, next to the value it justifies.
4. **Distinguish not-evaluated from zero.** The flange table uses `...` for nozzles not evaluated, never
   a blank or a `0.0`. The `—` convention in §6.4 does the same job; keep it rigorous.
5. **Governing-case rollup.** The flange table closes with `Min Rating | 420.4 | 1960.0` across all 37
   nozzles — a single controlling value after a long per-item table.

**One thing not to copy directly.** PV Elite's stress block ends with
`Max. S.I. | S.I. Allowable | Result → Passed`. It can legitimately show that because it holds material
allowable authority (Smh) and code-compliance authority. This app holds neither — hence the §6.3
removal of `Allowable`/`Utilization`. Adopt the *shape* of that comparison block, but leave it visibly
unpopulated ("Code compliance — NOT ASSESSED") until allowable-stress authority actually exists in the
data model. The difference is authority, not layout taste.

### 7.4 What a valid numerical benchmark would need

A WRC 537 (not 297) case: rigid/solid attachment on a cylindrical shell, γ ∈ {5, 15, 50} **exactly**,
Δp = 0, Kn = Kb = 1, radial attachment, single isolated attachment, with the eight-point stress
intensities published. PV Elite can produce this — it supports the WRC 107/537 method; this particular
nozzle simply ran under 297. Re-running one nozzle with 107/537 selected, a rigid attachment, a
tabulated γ, and pressure excluded would yield a directly comparable case from the same tool.
