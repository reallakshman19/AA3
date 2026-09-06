# Manual validation protocol — EP-0025 cross-platform executable recovery

This protocol supersedes MANUAL-EP-0024 for new LEG-013 evidence while preserving LEG-012 and EP-0024 as immutable historical validation custody. LEG-013 changes validation-carrier behavior only; it does **not** create WRC/Pressure, benchmark, route, code, production or release authority.

## Validation target

Use the fixed LEG-013 material head recorded in `agents/chains/ADV-EMP1-HUMAN-UI-1651/material-legs/LEG-013.md` after that receipt is frozen. Do not validate the mutable PR relay head or arbitrary moving `main`.

Always return:

```text
git rev-parse HEAD
```

before executable evidence.

## Project-local Chromium prerequisite

The visible-workbench qualification intentionally uses the project-local Playwright browser store:

```text
PLAYWRIGHT_BROWSERS_PATH=0
```

The validation runner preflights that exact browser before any Node/browser gates. If Chromium is absent it exits nonzero with:

```text
status = BLOCKED_ENVIRONMENT
code = PLAYWRIGHT_LOCAL_CHROMIUM_MISSING
```

and prints the expected executable plus platform-specific remediation. A missing browser is not an EMP.1 product failure and must not be relabeled PASS.

### Windows PowerShell

```powershell
cd C:\Users\reall\Advanced_Analysis
git fetch origin agent/emp1-1651-qualification-sample-leg012
git checkout <LEG-013 fixed material head>
git rev-parse HEAD

npm ci
$env:PLAYWRIGHT_BROWSERS_PATH = "0"
npx playwright install chromium
node scripts/emp1-issue1651-executable-validation.mjs
```

Do not paste Bash `\` line continuations into PowerShell. The executable runner exists specifically so the focused browser gate is invoked identically on Windows and POSIX shells.

### Linux / macOS shell

```bash
cd ~/Advanced_Analysis
git fetch origin agent/emp1-1651-qualification-sample-leg012
git checkout <LEG-013 fixed material head>
git rev-parse HEAD

npm ci
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
node scripts/emp1-issue1651-executable-validation.mjs
```

### Browser preflight only

To verify the environment without running engineering/browser gates:

```text
node scripts/emp1-issue1651-executable-validation.mjs --preflight-only
```

Required:

```text
status = PASS_BROWSER_ENVIRONMENT_PREFLIGHT
code = PLAYWRIGHT_LOCAL_CHROMIUM_AVAILABLE
```

`--plan` is source/command inspection only and is not executable PASS:

```text
node scripts/emp1-issue1651-executable-validation.mjs --plan
```

## Executable gate sequence

The single runner executes, in fail-fast order:

1. `node scripts/emp1-qualification-sample-orchestration-check.mjs`
2. `node scripts/emp1-analytical-layout-check.mjs`
3. `node scripts/emp1-manual-browser-audit-check.mjs`
4. `node scripts/emp1-issue1651-acceptance-check.mjs`
5. `node scripts/emp1-public-product-check.mjs`
6. focused qualification-sample Playwright using `playwright.lafea-visible.config.js`
7. `node scripts/lafea-stage17-browser-run.mjs`

Required executable boundary before manual observation:

- all five Node checks exit 0;
- focused qualification-sample Playwright = **2 passed / 0 failed**;
- Stage-17 carrier exits 0;
- final runner object = `PASS_EXECUTABLE_EXACT_HEAD_GATE_SEQUENCE`;
- no failed object, missing browser, parser error, skipped executable gate or nonzero exit may be relabeled PASS.

If any executable gate fails, **STOP** and return its exact output. Do not proceed to human-factor acceptance.

## Individual-command fallback

Use this only for diagnosis or if the wrapper itself is under investigation. Preserve the same order.

### PowerShell

```powershell
node scripts/emp1-qualification-sample-orchestration-check.mjs
node scripts/emp1-analytical-layout-check.mjs
node scripts/emp1-manual-browser-audit-check.mjs
node scripts/emp1-issue1651-acceptance-check.mjs
node scripts/emp1-public-product-check.mjs
npx playwright test --config=playwright.lafea-visible.config.js e2e/emp1-qualification-sample-orchestration.spec.js
node scripts/lafea-stage17-browser-run.mjs
```

### POSIX shell

```bash
node scripts/emp1-qualification-sample-orchestration-check.mjs
node scripts/emp1-analytical-layout-check.mjs
node scripts/emp1-manual-browser-audit-check.mjs
node scripts/emp1-issue1651-acceptance-check.mjs
node scripts/emp1-public-product-check.mjs
npx playwright test \
  --config=playwright.lafea-visible.config.js \
  e2e/emp1-qualification-sample-orchestration.spec.js
node scripts/lafea-stage17-browser-run.mjs
```

## Application prerequisite

Only after the executable sequence passes, start the exact-head application:

```text
npm run dev -- --host 0.0.0.0
```

Navigate through the rendered UI to **EMPIRICAL -> EMP.1** and confirm EMP.1 is active. Click exactly:

```text
[SIMULATED] Load complete EMP.1 qualification sample
```

The action must establish a current qualified/accepted EMP.1.A / LAFEA.1 source and execution before B/C. It must not surface `EMP1_A_CURRENT_QUALIFIED_RESULT_REQUIRED`.

Verify before structured audit:

- EMP.1.A / LAFEA.1 is populated;
- A execution status = QUALIFIED;
- A result qualification state = ACCEPTED;
- B source is present only after A qualification;
- C typed source binding is present;
- global/full-domain C authority remains unclaimed;
- code compliance and release remain unclaimed.

`seedQualificationPressure: true` is not a sample loader; it only supplements an already-prepared LAFEA.1 document.

## Desktop observation (>1050 px)

In DevTools:

```js
await import('/scripts/emp1-manual-browser-audit.js?manual-audit=4');
const emp1DesktopAudit = await runEmp1ManualBrowserAudit({ seedQualificationPressure: true });
emp1DesktopAudit;
```

Required result:

```text
status = PASS_CURRENT_VIEWPORT_DOM_OBSERVATION
failures = []
```

Hard falsifiers:

1. selected professional workflow step is the presentation source of truth;
2. select **5 Section Screening**, then **7 Review & Evidence**; Review remains selected while backing may remain LAFEA.2;
3. backing calculator is labeled only `Backing calculation stage`, never as contradictory active workflow;
4. Basis/Loads do not foreground EMP.1.C route authority; Local Correlation may;
5. Inspector navigation remains visible/unclipped while content scrolls independently;
6. deep route details are closed by default after task selection;
7. Readiness/review/technical custody does not displace the primary console;
8. analytical shell and Results & evidence affordance remain inside viewport;
9. Loads shows **Pressure + Load Cases only** and Pressure remains 5 identities x Internal/External = 10 governed cells.

Capture desktop default and desktop Readiness-open screenshots.

## Narrow observation (recommended 720 x 900)

Resize the **same prepared session without reload**, then run:

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

Verify **Work / Basis / Evidence** exposes only one major pane at a time. Do **not** accept Work -> Basis -> Evidence vertical stacking. Confirm no horizontal overflow and capture the narrow screenshot.

## EMP.1.C route-detail observation

Select **6 Local Correlation** and confirm Authority / Availability / Settings are contextual, two registered route capability tabs remain described, exactly one capability body is visible, and `Route authority details = CLOSED initially`. This observation does not grant new route authority.

## CAUx keyboard observation

Open **Review & Evidence -> Benchmark evidence**. Focus the CAUx retained-audit disclosure summary:

1. Press **Enter** — retained eight-point table opens.
2. Press **Space** — disclosure closes.
3. Confirm `Engineering use not authorized` and the non-WRC-method-authority warning remain visible.

Report `keyboard PASS` only when physical keyboard observations succeed.

## Return evidence

Return:

- `git rev-parse HEAD`;
- browser-preflight JSON;
- complete output of the five Node checks;
- focused Playwright output;
- Stage-17 output;
- final executable-runner JSON;
- `emp1DesktopAudit` JSON;
- `emp1NarrowAudit` JSON;
- `keyboard PASS` or exact failure;
- desktop default screenshot;
- desktop Readiness-open screenshot;
- narrow screenshot.

Zero GitHub statuses/workflows, mergeability, screenshots alone, static PASS, `--plan`, or a browser installation message do not substitute for the required executable/manual observations. Do not proceed to human-factor acceptance until the executable runner passes completely.
