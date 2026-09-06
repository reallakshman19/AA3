# Manual validation protocol — EP-0023 qualification-sample sequencing recovery

This protocol records exact-head human-observed localhost evidence for issue #1651 / recovery #1664 after LEG-011 repairs the clean-tab complete qualification sample sequence. It does **not** convert blocked or unexecuted Playwright into PASS.

## Validation target

Use the fixed LEG-011 material head recorded in `agents/chains/ADV-EMP1-HUMAN-UI-1651/material-legs/LEG-011.md` after the receipt is frozen. Do not validate the old merged head, the control-plane relay head, or an arbitrary moving branch head.

From PowerShell:

```powershell
Set-Location C:\Users\reall\Advanced_Analysis
git fetch origin agent/emp1-1651-qualification-sample-leg011
git checkout <LEG-011 fixed material head>
git rev-parse HEAD

node scripts/emp1-qualification-sample-orchestration-check.mjs
node scripts/emp1-analytical-layout-check.mjs
node scripts/emp1-manual-browser-audit-check.mjs
node scripts/emp1-issue1651-acceptance-check.mjs

npm run dev
```

Open the Vite localhost application and navigate through the rendered UI to **EMPIRICAL → EMP.1**. Confirm EMP.1 is active.

## Qualification-sample prerequisite

Click exactly:

```text
[SIMULATED] Load complete EMP.1 qualification sample
```

The action must no longer fail with `EMP1_A_CURRENT_QUALIFIED_RESULT_REQUIRED`.

Before running the structured audit, verify all of the following in the rendered application:

- EMP.1.A / LAFEA.1 is populated, not `EMPTY`;
- step A has a current qualified/accepted execution;
- EMP.1.B source is present only after A qualification;
- the complete sample transaction has not surfaced `EMP1_A_CURRENT_QUALIFIED_RESULT_REQUIRED`;
- the workflow reaches a current prepared/calculated EMP.1 state appropriate to the live route authority;
- code compliance and release remain unclaimed.

If the sample action fails or A is not visibly established, **STOP** and return the exact failure. Do not continue with desktop/narrow audits against an invalid prerequisite state.

`seedQualificationPressure: true` is not a sample loader. It may supplement the already-loaded LAFEA.1 document only after the complete qualification sample succeeds.

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

1. The selected professional workflow step is the presentation source of truth.
2. Select **5 Section Screening**, then **7 Review & Evidence**. Review must remain selected while the backing stage may remain LAFEA.2.
3. A backing calculator may be labeled only as supporting context (`Backing calculation stage`), never as a contradictory active professional task.
4. Basis/Loads must not foreground EMP.1.C route authority; Local Correlation may.
5. Inspector navigation remains fully visible/unclipped while content scrolls independently.
6. Deep route details are closed by default after task selection.
7. Opening Readiness/review/technical custody must not displace the primary console.
8. The analytical shell and Results & evidence affordance remain inside the viewport.
9. Loads still shows **Pressure + Load Cases only** and Pressure remains exactly 5 identities × Internal/External = 10 governed value cells.

Capture a desktop default screenshot and a desktop Readiness-open screenshot.

## Narrow observation (recommended 720 × 900)

Resize the **same prepared browser session without reloading**, then run:

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

Verify **Work / Basis / Evidence** exposes one major pane at a time. Do **not** accept Work → Basis → Evidence vertical stacking. Confirm no horizontal overflow and capture the narrow screenshot.

## EMP.1.C route-detail observation

Select **6 Local Correlation** and confirm Authority / Availability / Settings are contextual, two registered route capability tabs remain available, exactly one capability body is visible, and Route authority details = CLOSED initially. Deep limitation/axis/technical detail remains on demand.

## CAUx keyboard observation

Open **Review & Evidence → Benchmark evidence**. Focus the CAUx retained-audit disclosure summary:

1. Press **Enter** — retained eight-point table opens.
2. Press **Space** — disclosure closes.
3. Confirm `Engineering use not authorized` and the non-WRC-method-authority warning remain visible.

Report `keyboard PASS` only if the real keyboard observations succeed.

## Return evidence

Return:

- `git rev-parse HEAD`;
- complete output of all four Node/static commands;
- `emp1DesktopAudit` JSON;
- `emp1NarrowAudit` JSON;
- `keyboard PASS` or exact failure;
- desktop default screenshot;
- desktop Readiness-open screenshot;
- narrow screenshot.

Manual evidence may satisfy the human-factor observation boundary when it passes, but it **must not promote the blocked Playwright suite to PASS**. Playwright remains separately `BLOCKED_ENVIRONMENT / NOT_RUN` until a compatible browser executes it.
