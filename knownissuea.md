# Known issues — PR #1159

This register records unresolved qualification findings without weakening their
oracles. A known-issue entry is evidence for follow-up; it is not a PASS or a
merge waiver.

## KI-1159-001 — GitHub Actions budget blocks hosted execution

- **Status:** OPEN / external infrastructure blocker
- **Affected checks:** `browser-authority` and `engineering-table`
- **Observation:** GitHub created both jobs but did not start any step. The job
  annotation states that an Actions budget is preventing further use.
- **Validation status:** `NOT_RUN` on GitHub. Local execution is recorded
  separately and must not be presented as a hosted-check PASS.
- **Resolution:** restore Actions capacity and rerun both checks on the exact PR
  head.

## KI-1159-002 — Fresh Windows/F-drive Vite transform exceeds test navigation timeout

- **Status:** OPEN / local qualification environment
- **Observation:** with a newly started development server and empty in-memory
  transform cache, the first `DOMContentLoaded` took 116,408 ms. On the same
  server after that transform completed, the page reached `DOMContentLoaded`
  with `globalThis.AnalysisWorkspace` available in about 1,187 ms.
- **Impact:** a 30-second Playwright navigation abort can repeatedly cancel the
  cold transform before any product assertion executes.
- **Protected invariant:** no test timeout, retry policy, or product assertion
  was increased or weakened. Local browser evidence uses one explicitly
  prewarmed persistent server and remains distinct from GitHub evidence.
- **Resolution:** reproduce on the GitHub Linux runner after KI-1159-001 is
  cleared; separately profile the Windows development transform if that local
  environment must qualify from a completely cold cache.

## KI-1159-003 — 3D support host drag misses the requested station

- **Status:** OPEN / product qualification blocker
- **Test:** `e2e/topology-edit-support-host-drag.spec.js`
- **Input basis:** repository XYZ branch demo, support `support:S-007` hosted by
  `edge:P-011`, current station 400 mm, requested station 520 mm.
- **Observed result:** the pointer journey produced 500.436281198874 mm, an
  absolute error of 19.563718801126 mm against the existing maximum of 10 mm.
  The same result repeated on both retries.
- **Isolation evidence:** calling the runtime's ray/segment projection directly
  at the calculated endpoint recovered 520.000000000001 mm. The first wrong
  value therefore occurs in the pointer-event drag journey or its final event
  handoff, not in the canonical station projection or coordinate transform.
- **Suite impact:** 8 of 9 Engineering Table browser journeys passed on the
  prewarmed local server; this one journey failed. The 94 Engineering Table Node
  contracts still pass.
- **Protected invariant:** retain the 10 mm oracle and the governed
  `SUPPORT_PLACEMENT` path. Do not round, clamp, or rewrite expected evidence to
  hide the discrepancy.
- **Resolution:** capture the pointerdown/move/up coordinates at the runtime
  boundary, identify why the final 520 mm client point yields the 500.436 mm
  draft, implement the smallest mapping fix, and rerun the full nine-test
  browser set.

## KI-1159-004 — W10.9 browser spec still asserts the retired navigation model

- **Status:** OPEN / stale acceptance test
- **Test:** `e2e/w10.9-load-calc-consumer.spec.js` (3/3 cases fail before their
  intended Load Calc assertions)
- **Observation:** the spec expects the legacy 12-button navigation beginning
  with Home and ending with Debug. The current intentionally simplified shell
  exposes five buttons: Workspace; Edit, Topo fix and Load Calc; LAFEA; LFEA;
  and Empirical. Its other two failures use globally ambiguous entity and Clear
  locators that now match multiple valid surfaces.
- **Impact:** the suite cannot qualify current Load Calc behavior until its
  navigation and scoped-locator basis is reconciled with the approved shell.
- **Resolution:** update the test to the current five-button contract and scope
  entity/Clear actions to their owning Workspace surfaces; retain the existing
  state-preservation and teardown assertions.

## KI-1159-005 — Real-Sjson visual-evidence assertion uses an unscoped summary locator

- **Status:** OPEN / stale acceptance-test locator
- **Test:** `e2e/non-fea-input-check-load-calc.spec.js`, real-Sjson case
- **Observation:** the intended text `Rendering evidence notes` is present, but
  the strict locator resolves the parent summary plus six grouped child
  summaries introduced by similar-finding grouping. Playwright rejects the
  seven-element locator before evaluating the text assertion.
- **Impact:** 3/4 focused Load Calc cases pass; the real-Sjson case reaches the
  expected grouped UI and then fails only at this selector.
- **Resolution:** select the direct parent summary (for example,
  `:scope > summary`) and retain all existing issue-count and evidence-text
  assertions.
