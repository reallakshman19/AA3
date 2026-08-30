# EMP.1 / WRC professional UI walkthrough — human acceptance record

Status: **EXECUTION REQUIRED**

Issue: #1559  
Governing product workflow: issue #1389 §14  
Automation support: `e2e/emp1-professional-walkthrough-evidence.spec.js`

## Acceptance principle

A passing Playwright run is **not** UI acceptance. The Playwright evidence journey exists to make the same deterministic WRC workflow reproducible and to attach, for each of 12 checkpoints, one viewport PNG, one full-page context PNG, one workbench ARIA snapshot, and a machine-readable manifest.

Final **PASS** requires a qualified human reviewer to observe the actual walkthrough live or to review a recording that captures the actual interactions and transitions. Static checkpoint artifacts remain mandatory per-stage evidence, but static artifact-only review cannot establish final #1559 PASS because it cannot prove dynamic transition behavior between checkpoints.

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
- Live-observation session or screen-recording artifact:
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

For icons and controls specifically, artifact evidence requires either:

- a self-evident visible label in the viewport/full-page evidence; or
- a stable accessible name in the retained `*-aria` snapshot that is consistent with the same control/icon elsewhere.

If a control's meaning depends only on a hover-only visual tooltip that is not represented by the accessibility snapshot, that interaction must be observed live or in the recording. Without that observation, the affected checkpoint remains **PARTIAL** rather than being inferred PASS from screenshots.

Subjective visual preference alone is not a failure; ambiguity in engineering action or state is.

## Twelve evidence checkpoints

The evidence spec attaches three artifacts per checkpoint:

- `*-viewport` — authoritative evidence for the actual user-visible landing and scroll position;
- `*-full-page` — supporting context for hierarchy, duplicate controls, terminology and surrounding evidence;
- `*-aria` — supporting accessibility-tree evidence for roles, accessible names and control-state review.

The manifest records `scrollX`, `scrollY`, viewport width and viewport height for each checkpoint and declares a 12 viewport / 12 full-page / 12 ARIA evidence policy. Review the corresponding evidence together with the live-observed or recorded walkthrough. A full-page screenshot by itself is insufficient to pass the scroll-position criterion, and a PNG by itself is insufficient to pass a non-visible accessible-name criterion.

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

For every transition also record from the live session or recording:

- viewport landing reaches the intended target card without confusing intermediate movement;
- the active engineer task remains obvious through backing-stage changes;
- no unexpected duplicate Run / Apply / Continue action becomes the apparent primary action;
- disabled controls retain an understandable reason where engineering progress is blocked;
- labels continue to use Basis & Source, Geometry, Loads, Load Transfer, Section Screening, Local Correlation, and Review & Evidence as the primary workflow vocabulary;
- A/B/C and LAFEA.1/LAFEA.2 remain secondary technical custody where needed;
- stale/current badges and required-action text agree with the visible evidence before and after transitions;
- icon/control accessible names remain stable in corresponding ARIA snapshots where the visible label alone is insufficient;
- any hover-only meaning not represented in ARIA evidence is actually exercised and observed.

Use the viewport screenshots and manifest scroll coordinates to corroborate the observed landing; use full-page and ARIA artifacts to corroborate hierarchy/context/accessibility. Static artifacts do not replace live or recorded transition observation.

## Execution command

From a faithful repository checkout with the project-local Chromium installed:

```bash
node scripts/run-playwright.mjs e2e/emp1-professional-walkthrough-evidence.spec.js --workers=1
```

The HTML report should contain 12 named viewport PNG attachments, 12 corresponding full-page context PNG attachments, 12 corresponding ARIA snapshot attachments, and `walkthrough-manifest` JSON attachment content. If execution cannot start because Chromium, dependencies, or the dev server are unavailable, record **NOT_RUN**; do not convert the authored test into a PASS claim.

The reviewer must additionally either observe this walkthrough while it executes or review a recording of the actual walkthrough. A complete static attachment set without live/recorded human observation is **PARTIAL**, not PASS.

## Review disposition

### PASS

Use only when:

- all 12 checkpoints and transition checks were actually reviewed;
- the actual walkthrough was observed live by the qualified reviewer or reviewed from a recording;
- the 12 viewport + 12 full-page + 12 ARIA attachments corroborate the observed states;
- no confusing/broken engineering flow remains.

Record reviewer, environment, commit and live-session/recording artifact reference above. Static artifact-only review cannot establish final PASS.

### FAIL

For every concrete defect, record:

- checkpoint number;
- observed behavior;
- expected behavior;
- viewport screenshot locator and supporting full-page locator;
- ARIA attachment locator when accessible meaning/control state is involved;
- live-session/recording locator for transition or interaction defects;
- first suspected presentation/controller boundary;
- whether engineering authority is affected or presentation-only.

Create a PRE_MUTATION chain endpoint before changing production code.

### PARTIAL

Use when only part of the walkthrough was executed/reviewed, when the static evidence is complete but the walkthrough was not live-observed or recorded/reviewed by a qualified human, or when an icon/control depends on hover-only meaning that was not actually observed. List exactly which checkpoints or transition criteria remain NOT_RUN or only partially evidenced. PARTIAL must never be described as “UI complete.”

## Current authority boundary

Until this record is completed by an actual qualified reviewer with live or recorded walkthrough observation:

- issue #1559 remains open;
- Chromium walkthrough is NOT_RUN unless separately evidenced;
- human-observed/recorded acceptance is NOT_RUN;
- static artifact completeness is not final UI acceptance;
- merge of implementation/evidence-support PRs does not equal UI acceptance;
- WRC code compliance and release qualification remain outside this walkthrough's authority.
