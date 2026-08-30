# EMP.1 / WRC professional UI walkthrough — human acceptance record

Status: **EXECUTION REQUIRED**

Issue: #1559  
Governing product workflow: issue #1389 §14  
Automation support: `e2e/emp1-professional-walkthrough-evidence.spec.js`

## Acceptance principle

A passing Playwright run is **not** UI acceptance. The Playwright evidence journey exists to make the same deterministic WRC workflow reproducible and to attach 12 passing-run screenshots plus a machine-readable manifest. A qualified human reviewer must inspect those artifacts or observe the run live and record PASS / FAIL / PARTIAL below.

No automated result may create WRC numerical authority, code-compliance authority, global EMP.1.C authority, or release/deployment authority.

## Reviewer and environment record

Complete these fields for every acceptance run.

- Reviewer:
- Engineering persona: pressure-vessel / local-stress engineer familiar with WRC 537 and load-transfer custody
- Repository commit:
- Branch / deployment:
- Environment: local dev server / staging / other
- Browser and exact version:
- Operating system:
- Display / viewport:
- Date and local time:
- Screen recording artifact, if used:
- Playwright HTML report / attachment location:
- Overall result: **NOT_RUN / PASS / FAIL / PARTIAL**

## Human-review rubric

A checkpoint fails if any of the following is true:

- the engineer cannot tell what source/currentness state the step is in;
- an icon or control lacks a clear accessible meaning or changes meaning between screens;
- a disabled control gives no understandable reason for being disabled;
- two controls appear to be competing primary actions for the same engineering task;
- terminology exposes implementation names where the engineer-facing WRC task should be primary;
- navigation lands on the wrong stage, wrong card, or an unexpected scroll position;
- a transition loses the selected engineering task or silently changes backing stage;
- current and stale evidence are visually indistinguishable;
- a stale local result remains presented as current/reportable;
- the WRC eight-point result is presented as a continuous/global shell maximum;
- code compliance or release qualification is implied by the bounded WRC result;
- the reviewer cannot identify what must be rerun after an upstream edit.

For icons specifically, PASS requires either a self-evident labeled control or an accessible name/tooltip that is consistent with the same icon elsewhere. Subjective visual preference alone is not a failure; ambiguity in engineering action or state is.

## Twelve evidence checkpoints

The evidence spec attaches one full-page PNG for each checkpoint. Review every attachment; do not infer PASS from the test result alone.

| # | Checkpoint | Required engineering observation | Human result | Evidence / notes |
|---:|---|---|---|---|
| 1 | Cold start / fail closed | Source, transfer and screening require input; local method is blocked; no current C evidence is shown. | NOT_RUN | |
| 2 | Qualification source bundle current | Source, transfer and screening become current; local method/result are current; release and code compliance remain unqualified/not assessed. | NOT_RUN | |
| 3 | Basis & Source | The engineer can identify source custody and understands what was loaded without needing A/B/C implementation knowledge as the primary mental model. | NOT_RUN | |
| 4 | Geometry | The WRC attachment/applicability geometry task is understandable and the navigation lands on the intended C configuration surface. | NOT_RUN | |
| 5 | Loads | Load/reference inputs are identifiable, units/source status are understandable, and the task lands on the A source surface. | NOT_RUN | |
| 6 | Load Transfer | Navigation lands on current A results and the result is clearly load/reference transfer evidence rather than WRC local stress. | NOT_RUN | |
| 7 | Section Screening | Navigation lands on current B results and screening is clearly distinguished from local-correlation stress. | NOT_RUN | |
| 8 | Local Correlation configuration | The qualified bounded method, selected load/pressure identities, geometry/source bindings and run action are understandable. | NOT_RUN | |
| 9 | Current WRC result / governing scope | Current C evidence is visible; governing value is explicitly limited to the eight evaluated WRC points; continuous/global maximum and code compliance are not claimed. | NOT_RUN | |
| 10 | Review & Evidence | The transaction/evidence summary is understandable, retained lineage is discoverable, and the engineer knows what evidence has actually been produced. | NOT_RUN | |
| 11 | Upstream A geometry edited | `Pipe outside diameter` is changed through the governed user editor and applied through the visible PIPE_GEOMETRY action; no private state mutation is used. | NOT_RUN | |
| 12 | Downstream C stale | Local result changes to STALE, current C numerical evidence disappears, and the notice explains why and what must be rerun. | NOT_RUN | |

## Required transition checks across the journey

For every transition also record:

- scroll position is intentional and the target card is visible;
- the active engineer task is still obvious after backing-stage changes;
- there is no unexpected duplicate Run / Apply / Continue action;
- disabled controls have a visible reason where engineering progress is blocked;
- labels use Basis & Source, Geometry, Loads, Load Transfer, Section Screening, Local Correlation, and Review & Evidence as the primary workflow vocabulary;
- A/B/C and LAFEA.1/LAFEA.2 appear only as secondary technical custody where needed;
- stale/current badges and required-action text agree with the visible evidence.

## Execution command

From a faithful repository checkout with the project-local Chromium installed:

```bash
node scripts/run-playwright.mjs e2e/emp1-professional-walkthrough-evidence.spec.js --workers=1
```

The HTML report should contain 12 named PNG attachments and `walkthrough-manifest.json`-equivalent attachment content. If execution cannot start because Chromium, dependencies, or the dev server are unavailable, record **NOT_RUN**; do not convert the authored test into a PASS claim.

## Review disposition

### PASS

Use only when all 12 checkpoints and transition checks were actually reviewed and no confusing/broken engineering flow remains. Record reviewer, environment, commit and artifact references above.

### FAIL

For every concrete defect, record:

- checkpoint number;
- observed behavior;
- expected behavior;
- screenshot/recording locator;
- first suspected presentation/controller boundary;
- whether engineering authority is affected or presentation-only.

Create a PRE_MUTATION chain endpoint before changing production code.

### PARTIAL

Use when only part of the walkthrough was executed/reviewed. List exactly which checkpoints remain NOT_RUN. PARTIAL must never be described as “UI complete.”

## Current authority boundary

Until this record is completed by an actual reviewer:

- issue #1559 remains open;
- Chromium walkthrough is NOT_RUN unless separately evidenced;
- human-observed/recorded acceptance is NOT_RUN;
- merge of implementation PRs does not equal UI acceptance;
- WRC code compliance and release qualification remain outside this walkthrough's authority.
