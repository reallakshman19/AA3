# Manual validation protocol — EP-0014 split-console recovery

This protocol records human-observed localhost evidence for issue #1651 / recovery #1664 after the split-console recovery leg. It does **not** convert blocked or unexecuted Playwright into PASS.

## Validation target

Use the fixed LEG-009 material head recorded in `agents/chains/ADV-EMP1-HUMAN-UI-1651/material-legs/LEG-009.md` once that receipt is frozen. Do not validate an arbitrary moving branch head.

From PowerShell:

```powershell
Set-Location C:\Users\reall\Advanced_Analysis
git fetch origin agent/emp1-1651-split-console-leg009
git checkout <LEG-009 fixed material head>

node scripts/emp1-analytical-layout-check.mjs
node scripts/emp1-manual-browser-audit-check.mjs
node scripts/emp1-issue1651-acceptance-check.mjs

npm run dev
```

Open the Vite localhost application, switch to **EMPIRICAL → EMP.1**, and load the normal sample used for the prior manual review.

## Desktop observation (>1050 px)

In DevTools:

```js
await import('/scripts/emp1-manual-browser-audit.js?manual-audit=3');
const emp1DesktopAudit = await runEmp1ManualBrowserAudit({ seedQualificationPressure: true });
emp1DesktopAudit;
```

Required automated-observation result:

```text
status = PASS_CURRENT_VIEWPORT_DOM_OBSERVATION
failures = []
```

Required visible behavior:

- workflow remains seven compact professional steps;
- Work and Engineering Inspector are side-by-side inside one bounded console;
- only one Inspector tab body is visible at a time;
- Evidence console is collapsed by default on ordinary tasks and opens to one selected evidence view;
- outer analytical shell is bounded (`scrollHeight <= clientHeight + 1 px`); long Work/Inspector/Evidence content scrolls inside its pane instead of lengthening the page;
- Loads shows **Pressure + Load Cases only**;
- Load Transfer shows **Reference Points only**;
- Local Correlation defaults to the Authority inspector;
- the Authority inspector retains exactly two registered EMP.1.C capability tabs, with only one capability panel visible at a time;
- the exact γ=5 capability remains engineering-use authorized inside its bounded domain;
- the interpolated-γ capability remains comparison-only / engineering-use not authorized;
- full route limitations, technical identifiers and shell-parameter/curve policy remain available through disclosures rather than permanent page height;
- CAUx/PV Elite benchmark truth remains unchanged.

Capture one full-page desktop screenshot. The page must visually read as an engineering console rather than a long report.

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

Verify the narrow console exposes **Work / Basis / Evidence** mode tabs and that selecting each mode shows only that pane:

```text
Work      -> Work visible; Basis hidden; Evidence hidden
Basis     -> Basis visible; Work hidden; Evidence hidden
Evidence  -> Evidence visible; desktop split lanes hidden
```

Do **not** accept Work → Basis → Evidence vertical stacking as responsive behavior. Confirm no horizontal overflow and capture one full-page narrow screenshot.

## CAUx keyboard observation

Open Evidence → Benchmark Evidence. Focus the CAUx retained-audit disclosure summary:

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

- `emp1DesktopAudit` JSON;
- `emp1NarrowAudit` JSON;
- `keyboard PASS` or exact keyboard failure;
- desktop and narrow full-page screenshots.

Manual evidence may satisfy the human-factor observation boundary when it passes, but it **must not promote the blocked Playwright suite to PASS**. Playwright remains separately `BLOCKED_ENVIRONMENT / NOT_RUN` until a compatible browser actually executes the suite.
