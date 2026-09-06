# Manual validation protocol — EP-0015 robust split-console recovery

This protocol records human-observed localhost evidence for issue #1651 / recovery #1664 after the screenshot-derived LEG-010 correction. It does **not** convert blocked or unexecuted Playwright into PASS.

## Validation target

Use the fixed LEG-010 material head recorded in `agents/chains/ADV-EMP1-HUMAN-UI-1651/material-legs/LEG-010.md` once that receipt is frozen. Do not validate LEG-009 or an arbitrary moving branch head.

From PowerShell:

```powershell
Set-Location C:\Users\reall\Advanced_Analysis
git fetch origin agent/emp1-1651-split-console-leg009
git checkout <LEG-010 fixed material head>

node scripts/emp1-analytical-layout-check.mjs
node scripts/emp1-manual-browser-audit-check.mjs
node scripts/emp1-issue1651-acceptance-check.mjs

npm run dev
```

Open the Vite localhost application, switch to **EMPIRICAL → EMP.1**, and load the same normal qualification sample used in the screenshots.

## Desktop observation (>1050 px)

In DevTools:

```js
await import('/scripts/emp1-manual-browser-audit.js?manual-audit=4');
const emp1DesktopAudit = await runEmp1ManualBrowserAudit({ seedQualificationPressure: true });
emp1DesktopAudit;
```

Required automated-observation result:

```text
status = PASS_CURRENT_VIEWPORT_DOM_OBSERVATION
failures = []
```

### Screenshot-derived hard falsifiers

The following are mandatory. A structural two-column grid is **not** sufficient.

1. The selected professional workflow step is the presentation source of truth.
2. Select **5 Section Screening**, then select **7 Review & Evidence**. Review must remain selected even though the retained backing calculation stage is EMP.1.B / LAFEA.2.
3. While Review & Evidence is selected, the Work/Inspector lanes must not show `EMP1.B — nominal section screening` as the active presentation task. Review is an evidence-focused presentation view.
4. A backing calculator may be labeled only as supporting/backing context (`Backing calculation stage`), never as a contradictory active professional task.
5. **Basis & Source / Loads** must not foreground EMP.1.C bounded-route Authority. Their Inspector is task-contextual.
6. **Local Correlation** may foreground the bounded-route Authority Inspector. It must expose only the task-relevant Authority / Availability / Settings tabs.
7. Inspector navigation must remain fully visible and unclipped while Inspector content scrolls independently.
8. `Route authority details`, `Route limitations`, and shell-parameter/curve-selection deep detail must be closed by default after task selection.
9. Open **Readiness, review and technical custody**. It must appear as bounded overlay/on-demand detail and must not move, shrink or push the primary Work/Inspector console downward.
10. The analytical shell and **Results & evidence** affordance must both remain inside the current viewport. The shell itself may not pass a bounded-scroll check while its bottom is below the visible viewport.
11. Workflow step buttons must remain compact; detailed source/result status belongs in the compact status/readiness surfaces, not repeated inside every navigation button.
12. Loads still shows **Pressure + Load Cases only** and Pressure remains exactly 5 identities × Internal/External = 10 governed value cells.

Capture one full-page desktop screenshot in the normal default state and one with Readiness detail open.

## Narrow observation (width <=1050 px; recommended 720 × 900)

Resize the browser, then run:

```js
const emp1NarrowAudit = await runEmp1ManualBrowserAudit();
emp1NarrowAudit;
```

Required result:

```text
status = PASS_CURRENT_VIEWPORT_DOM_OBSERVATION
failures = []
observations.layout.viewport.mode = NARROW
```

Verify **Work / Basis / Evidence** mode tabs expose only one major pane at a time:

```text
Work      -> Work visible; Basis hidden; Evidence hidden
Basis     -> Basis visible; Work hidden; Evidence hidden
Evidence  -> Evidence visible; Work/Inspector lanes hidden
```

Do **not** accept Work → Basis → Evidence vertical stacking as responsive behavior. Confirm no horizontal overflow and capture one full-page narrow screenshot.

## EMP.1.C route-detail observation

Select **6 Local Correlation** and confirm:

```text
Inspector tabs visible = Authority / Availability / Settings
registered capability tabs = 2
visible capability body = 1
Route authority details = CLOSED initially
Route limitations = CLOSED initially
Shell parameter / curve-selection policy = CLOSED initially
```

Open the route details manually and confirm the retained technical identifiers remain reachable. Closing/reselecting a professional task must restore the compact default.

## CAUx keyboard observation

Open **Review & Evidence → Benchmark evidence**. Focus the CAUx retained-audit disclosure summary:

1. Press **Enter** — retained eight-point table opens.
2. Press **Space** — disclosure closes.
3. Confirm `Engineering use not authorized` and the non-WRC-method-authority warning remain visible after closing.

Report either:

```text
keyboard PASS
```

or the exact observed failure.

## Return evidence

Return:

- output of the three Node/static commands;
- `emp1DesktopAudit` JSON;
- `emp1NarrowAudit` JSON;
- `keyboard PASS` or exact keyboard failure;
- desktop default screenshot;
- desktop Readiness-open screenshot;
- narrow full-page screenshot.

Manual evidence may satisfy the human-factor observation boundary when it passes, but it **must not promote the blocked Playwright suite to PASS**. Playwright remains separately `BLOCKED_ENVIRONMENT / NOT_RUN` until a compatible browser actually executes the suite.
