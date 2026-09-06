# Manual validation protocol — EP-0024 qualification-sample recovery

This protocol records exact-head executable and human-observed evidence for issue #1651 / recovery #1664 after LEG-012 fixes the qualification-sample factory source-identity mismatch and carries forward the normal controller A -> B -> C sequencing repair. It does **not** convert unexecuted checks to PASS.

## Validation target

Use the fixed LEG-012 material head recorded in `agents/chains/ADV-EMP1-HUMAN-UI-1651/material-legs/LEG-012.md` after that receipt is frozen. Do not validate PR relay HEAD, LEG-011, or arbitrary moving `main`.

From Linux:

```bash
cd ~/Advanced_Analysis
git fetch origin agent/emp1-1651-qualification-sample-leg012
git checkout <LEG-012 fixed material head>
git rev-parse HEAD

npm ci
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

Required executable boundary before manual observation:

- all five Node checks exit 0;
- focused qualification-sample Playwright = 2 passed / 0 failed;
- Stage-17 carrier exits 0;
- no failed object or nonzero exit may be relabeled PASS.

If any executable gate fails, **STOP** and return the exact output. Do not proceed to human-factor acceptance.

## Application prerequisite

Start the exact-head application:

```bash
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
- complete output of the five Node checks;
- focused Playwright output;
- Stage-17 output;
- `emp1DesktopAudit` JSON;
- `emp1NarrowAudit` JSON;
- `keyboard PASS` or exact failure;
- desktop default screenshot;
- desktop Readiness-open screenshot;
- narrow screenshot.

Zero GitHub statuses/workflows, mergeability, screenshots alone, or static PASS do not substitute for the required executable/manual observations.
