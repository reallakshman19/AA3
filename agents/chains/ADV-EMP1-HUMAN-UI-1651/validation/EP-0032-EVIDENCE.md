# EP-0032 returned validation evidence — merged head f98d56d4

Evidence source: external Linux verifier return on 2026-09-07.

VALIDATION_TARGET: f98d56d4c644b7bb6b79d2302739d12dac720248
HEAD_MATCH: PASS
BROWSER_PREFLIGHT: PASS_BROWSER_ENVIRONMENT_PREFLIGHT
NODE_GATES: PASS_5_OF_5
FOCUSED_PLAYWRIGHT: FAIL
RUNNER_STATUS: FAIL_EXECUTABLE_GATE_SEQUENCE
RUNNER_EXIT_CODE: 1
HUMAN_FACTOR_MAY_PROCEED: FALSE
STAGE17: NOT_RUN_DUE_FAIL_FAST
HUMAN_FACTOR: NOT_RUN_GATED_BY_EXECUTABLE_FAIL

Focused failure:
- file: e2e/emp1-qualification-sample-orchestration.spec.js
- test: clean complete sample executes and retains A before B/C
- A document loaded: true
- A execution: QUALIFIED
- A qualification: ACCEPTED
- B document loaded: true
- run input loaded: true
- observed getEmp1Execution()?.status: null
- expected: CALCULATED or PREPARED_C_BLOCKED

Diagnosis custody:
- Fixed-head qualification sample contains typed applicabilityGeometry.
- Focused test waits for A/B/run-input prerequisites but not completion of async runEmp1Product().
- The DOM action helper does not await the async click handler's Promise.
- runEmp1Product() assigns this.emp1Execution only after async product execution resolves.
- Therefore first wrong boundary is provisionally the focused test's completion synchronization.
- A readiness-BLOCKED root cause is not admitted without concrete readiness.reasons from a settled execution.

Falsifier:
Wait/poll on the same exact head for an execution completion observable. Settling CALCULATED/PREPARED_C_BLOCKED confirms a test race. Settling null/FAILED/BLOCKED with concrete failure/reasons reclassifies the defect to controller/product execution.

No engineering/source/route/benchmark/code/release authority is changed by this evidence record.
