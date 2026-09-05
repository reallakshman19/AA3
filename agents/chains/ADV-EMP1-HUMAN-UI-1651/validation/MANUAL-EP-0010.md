# Manual browser validation protocol — EP-0010

This protocol converts the remaining issue-#1651 browser closure into reproducible human-observed evidence while Playwright is `BLOCKED_ENVIRONMENT` by the missing project-local Chromium executable.

It does **not** convert Playwright to PASS. Automated browser status remains `BLOCKED_ENVIRONMENT` until the focused suite actually launches and reaches product assertions.

## Validation target

Run against the fixed LEG-007 material head recorded in the current endpoint/receipt after this leg is frozen.

Start the app:

```powershell
Set-Location C:\Users\reall\Advanced_Analysis
npm run dev
```

Open the Vite localhost URL, select **EMPIRICAL**, and load the normal demonstration/complete sample so the EMP.1 workbench is rendered.

## Load the manual audit helper

Open browser DevTools -> Console and run:

```js
await import('/scripts/emp1-manual-browser-audit.js?manual-audit=1');
```

The helper does not alter production files or engineering authority. The optional qualification seed below mirrors the existing Playwright pressure setup and adds `P-EXTERNAL` only to the in-memory LAFEA.1 document through `AnalysisWorkspace.importEmpiricalDocument(...)`.

## Desktop observation

Use a viewport wider than 1050 px (for example 1440 x 900), then run:

```js
const emp1DesktopAudit = await runEmp1ManualBrowserAudit({ seedQualificationPressure: true });
emp1DesktopAudit;
```

Required result:

```text
status = PASS_CURRENT_VIEWPORT_DOM_OBSERVATION
failures = []
```

The JSON must demonstrate:

- EMPIRICAL active and EMP.1 analytical surface present;
- no visible raw machine-state token leaks outside designated raw/technical boundaries;
- Pressure has `Internal` / `External` headers, 5 rows, 10 governed cells, and `P-EXTERNAL = 0 / 1` with independent retained source refs;
- Primary work and Engineering basis are side-by-side with no analytical horizontal overflow;
- one Benchmark Evidence panel, outside workflow, in `FULL_WIDTH_DETAIL`;
- exactly two comparators;
- CAUx comparison qualified **and** engineering use not authorized;
- CAUx overview retains 8/8, Cu worst-relative and Du/Du governing agreement;
- eight retained CAUx rows remain in the DOM;
- PV Elite remains reference unavailable with zero rows and no inferred values/tolerance.

## Narrow observation

Use responsive mode or resize the browser to 720 x 900 (or any width <=1050 px), then run:

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

The JSON must show Primary work and Engineering basis stacked at the same left/width and no analytical horizontal overflow.

## Keyboard disclosure observation

Return to either viewport. Focus the CAUx retained-audit `<summary>` using Tab/Shift+Tab.

1. Press **Enter**: retained CAUx audit detail must open and the comparison table must remain eight rows.
2. Press **Space**: the detail must close.
3. After closing, **Engineering use not authorized** and the independent-reference/non-WRC-method-authority warning must still be visible.

This human keyboard observation is intentionally separate from the DOM helper because synthetic JavaScript keyboard events are not equivalent to trusted browser input.

## Evidence to return

Return:

1. the desktop audit JSON;
2. the narrow audit JSON;
3. `keyboard PASS` or the exact keyboard failure observed;
4. any screenshot if a visual/layout discrepancy is easier to show than describe.

The custodian may record manual browser evidence as PASS only for observations actually returned. It must not promote the blocked Playwright suite to PASS.
