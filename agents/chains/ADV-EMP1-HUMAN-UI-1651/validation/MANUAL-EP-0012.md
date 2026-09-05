# Manual browser validation — EP-0012 task-shell recovery

This protocol is the human-observed fallback for issue #1651 / recovery #1664 while the project-local Playwright Chromium remains unavailable in the current execution environment.

It does **not** promote blocked Playwright automation to PASS. It records a separate manual browser observation only.

## Preconditions

1. Check out the LEG-008 material head listed in EP-0012 once frozen.
2. Run the static task-shell checks first.
3. Start Vite with `npm run dev`.
4. Open the EMPIRICAL / EMP.1 workbench and load the complete qualification/demo sample.
5. Keep DevTools Console open.

## Desktop observation

Use a viewport wider than 1050 px, preferably about 1600 × 1058.

Load the audit helper:

```js
await import('/scripts/emp1-manual-browser-audit.js?manual-audit=2');
const emp1DesktopAudit = await runEmp1ManualBrowserAudit({ seedQualificationPressure: true });
emp1DesktopAudit;
```

Required result:

```text
status = PASS_CURRENT_VIEWPORT_DOM_OBSERVATION
failures = []
observations.layout.pageDepth.viewportRatio < 6
observations.layout.activeTask = LOADS
observations.layout.visibleInputGroups = [PRESSURE, LOAD_CASES]
observations.layout.visibleEvidence = [benchmarkEvidence]
```

The helper intentionally selects **Loads** and **Benchmark evidence** as presentation state so it can verify Pressure 5×2 and the CAUx/PV Elite evidence while also proving only one heavy evidence view contributes layout height.

Visually confirm:

- Assessment workflow is a compact seven-step navigation/status strip, not a large always-expanded dashboard.
- `Readiness, review and technical custody` is closed by default.
- The active work area and Engineering Basis/Authority rail are side-by-side.
- Only the Loads input groups are shown in the active source editor: Pressure and Load cases.
- The right basis rail is bounded to the viewport and scrolls internally if its content is longer.
- Results & Evidence shows tabs and only the selected Benchmark Evidence body occupies vertical space.
- The full page no longer resembles the prior giant waterfall/full-height strip.

## Task-focus walkthrough

Use the seven workflow buttons and confirm the active body changes rather than accumulating below the previous task:

```text
1 Basis & Source      -> compact source/basis state; no full input dump
2 Geometry            -> Pipe geometry + Thickness, plus governed correlation geometry/configuration
3 Loads               -> Pressure + Load cases only
4 Load Transfer       -> Reference points only; result available through evidence workspace
5 Section Screening   -> Screening cases + Evaluation locations only
6 Local Correlation   -> governed Local Correlation run configuration; source editor hidden
7 Review & Evidence   -> execution/evidence workspace selected; workflow detail remains closed unless explicitly opened
```

At each step, confirm inactive input groups and inactive heavy evidence panels do not remain stacked underneath.

## Benchmark / authority observation

Select `Benchmark evidence`.

Confirm:

- exactly one Benchmark Evidence panel;
- CAUx status reads `Comparison qualified` and `Engineering use not authorized`;
- `8 / 8 within frozen tolerance` remains visible;
- Cu remains the worst relative difference at about `2.0355862 %`;
- governing agreement remains `Du reference / Du EMP.1 · Agreement: Yes`;
- the independent-reference warning still says it is **not WRC method authority** and does not establish code compliance/production/release authority;
- PV Elite remains `Reference not available`, source not retained, zero comparison rows, with no inferred values/tolerance.

Focus the CAUx retained-audit `<summary>` using the keyboard:

1. Press **Enter** — detail must open.
2. Press **Space** — detail must close.
3. Confirm the authority warning remains visible after closing.

Record this as `keyboard PASS` only when all three observations are true.

## Narrow observation

Resize to width <=1050 px, preferably about 720 × 900, then run:

```js
const emp1NarrowAudit = await runEmp1ManualBrowserAudit();
emp1NarrowAudit;
```

Required result:

```text
status = PASS_CURRENT_VIEWPORT_DOM_OBSERVATION
failures = []
observations.layout.pageDepth.viewportRatio < 6
```

Visually confirm:

- Active Task and Engineering Basis stack into one column without horizontal overflow.
- The basis section remains height-bounded rather than expanding into a second waterfall.
- The evidence workspace remains height-bounded and only one heavy evidence view is visible.
- Workflow navigation remains horizontally usable.

## Evidence return

Return:

1. full `emp1DesktopAudit` JSON;
2. full `emp1NarrowAudit` JSON;
3. `keyboard PASS` or the exact keyboard failure;
4. ideally one desktop and one narrow full-page screenshot.

A manual PASS is human-observed evidence only. It must not promote the blocked Playwright suite to PASS, must not create engineering authority, and does not authorize merge of PR #1660.
