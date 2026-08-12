# PR 1053 Work Report — Engineering Table NODE_POSITION Production Browser Qualification

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1053 — `test(3d-edit): qualify NODE_POSITION production browser path` |
| Branch | `agent/node-position-browser-qualification` |
| Base | `main@271d04fa2674ab68367808d05f2429ec5e236a6e` |
| Bootstrap | `904b23c63e96ac5d80c50276f87592b79000f813` — empty tree-equivalent commit |
| Rules | `reallaksh19/Common@43eccc27967ecec7d67513c08255398b496be5ce/CodingRules.md` |
| Mission | Qualify production-browser Table NODE_POSITION for NODE_ONLY, CONNECTED_RUN, support fail-closed behavior, stale concurrency, Preview/Validate non-mutation, and exact Apply/Undo/Redo custody. |
| Status | DRAFT / existing-contract audit complete / test-only implementation authorized |
| Production changes | NONE authorized; a failing browser contract must be registered before any production-source edit |
| Empirical execution | NOT_RUN unless a current execution mechanism becomes available; `.github/workflows` was retired by #1043 and this agent has no network checkout path |

## Architecture Invariant

`Table coordinate draft -> governed NODE_POSITION intent -> operation plan -> candidate Preview -> validation worker -> certified transaction -> canonical topology -> existing journal Undo/Redo`

No direct node writes, Table-owned history, Preview/Validate mutation, support-follow semantics, guessed run membership, or stale-guard weakening.

## Existing Contract Audit

Pure `tests/topology-edit-table-node-position.test.mjs` already proves:

- exact endpoint capability;
- NODE_ONLY -> one governed MOVE_NODE;
- CONNECTED_RUN -> complete selected-side component translation;
- stale expected-position rejection;
- dependent-record fail closed;
- overlapping move closure rejection;
- Preview/Validate non-mutation;
- atomic Apply and exact journal Undo/Redo.

`deriveTopologyEditTableNodePositionCapability()` already fails support-dependent endpoints with `SUPPORT_GEOMETRY_POLICY_REQUIRED` and other junction/boundary/rigid/bend dependencies with `NODE_DEPENDANT_POLICY_REQUIRED`.

`compileTopologyEditTableNodePosition()` computes CONNECTED_RUN by removing the selected source edge, translating the entire endpoint-side component, rejecting cycles and dependent records, then routing through `planMoveConnectedRun()`; support dependencies are checked across all moved nodes/affected edges.

`validateTopologyEditTableRuntime()` already verifies the Preview hash and current canonical hash after the async validation result returns; stale validation throws `validation completed against a stale Preview` before Apply authorization.

## Browser Target Decisions

| Case | Fixture / target | Reason |
|---|---|---|
| NODE_ONLY success | 20-element production demo, P-003 TO | already verified by #1036 browser qualification as unrestrained successful MOVE_NODE positive control |
| support negative | 20-element production demo, P-001 endpoint | intentionally support-dependent; must remain `SUPPORT_GEOMETRY_POLICY_REQUIRED` / disabled with no mutation |
| CONNECTED_RUN success | Q3 fixture, P-M04 TO | removing P-M04 leaves downstream valve + tail as a plain multi-node component with no support/junction dependency; verifies identical multi-node translation and unchanged internal lengths |
| unrelated rebase | Q3 fixture, stage P-R42 FROM then Canvas-move P-TAIL terminal | disjoint canonical component |
| target stale | Q3 fixture, stage P-R42 FROM then Canvas-move that exact FROM node | target revision/coordinate changed |
| dependency-edge stale | Q3 fixture, stage P-R42 FROM then Canvas-move P-R42 TO | target node unchanged but source edge dependency revision changes |
| stale validation | Q3 fixture with controlled validation-client delay | test-only timing control; canonical change still performed through certified Canvas path, and production workflow stale-result check remains unmodified |

## Engineering Register

| ID | Type | Status | Finding / decision |
|---|---|---|---|
| DEC-1053-01 | Scope | ACCEPTED | Test-only qualification; no production behavior change absent a proven defect. |
| DEC-1053-02 | NODE_ONLY control | ACCEPTED | P-003 TO positive, P-001 support negative. |
| DEC-1053-03 | CONNECTED_RUN control | ACCEPTED | Q3 P-M04 TO exercises a multi-node downstream run, not merely a terminal single node. |
| DEC-1053-04 | Concurrency | ACCEPTED | Use certified Canvas move operations for unrelated/target/dependency changes; no direct canonical mutation. |
| DEC-1053-05 | Validation timing | ACCEPTED | A deferred wrapper around the production validation client may control arrival timing, but the canonical change must still use certified UI/Canvas authority and production stale-check code is not replaced. |
| RISK-1053-01 | Execution infrastructure | OPEN | No current CI workflows/statuses; local clone unavailable. Authored Playwright source is not executed evidence. |

## Authorized Changed-File Ledger

Registering these paths **before modification**:

1. `agents/PR1053_workreport.md`
2. `e2e/helpers/topology-edit-table-node-position-fixture.js` — new shared production/Q3 helper
3. `e2e/topology-edit-table-node-position-lifecycle.spec.js` — new NODE_ONLY, CONNECTED_RUN, support negative lifecycle qualification
4. `e2e/topology-edit-table-node-position-concurrency.spec.js` — new rebase/stale/validation-arrival qualification

No production source file is authorized at this stage.

## Required Browser Evidence

### NODE_ONLY

Typing, Stage, Preview and Validate must preserve canonical/journal/source authority; Preview must render ghost; Apply must put exact endpoint at requested XYZ; source remains unchanged; renderer singular; Undo restores exact baseline canonical + ledger/command IDs; Redo restores exact applied canonical + ledger state.

### CONNECTED_RUN

All nodes in the selected-side component translate by the same delta; anchor-side node remains fixed; internal moving-side edge lengths remain unchanged; lifecycle custody matches NODE_ONLY.

### Support negative

Support-dependent endpoint editor must be `UNREPRESENTABLE`/disabled with reason `SUPPORT_GEOMETRY_POLICY_REQUIRED`; no canonical/journal mutation and no support relocation.

### Concurrency

- unrelated Canvas edit -> staged Table plan safely rebases and Preview is cleared;
- exact target node edit -> `STALE_CONFLICT`;
- opposite endpoint edit on same source edge -> dependency revision `STALE_CONFLICT`;
- delayed validation returning after certified canonical change -> no READY_TO_APPLY and stale Preview error recorded.

## Validation Ledger

| Candidate | Evidence |
|---|---|
| `main@271d04fa2674ab68367808d05f2429ec5e236a6e` | architecture/pure-test audit |
| `904b23c63e96ac5d80c50276f87592b79000f813` | empty bootstrap, zero changed files |
| report-only heads | no production/test behavior yet |
| test-source head | pending |

## Explicitly Not Validated

All browser cases are currently `NOT_RUN`; source tests are not yet authored. No production behavior changes exist in this PR.

## Next

1. Add the registered helper and lifecycle spec.
2. Add the registered concurrency spec using certified UI mutations only.
3. Static-audit selectors, file ledger, PR reviews/mergeability/statuses.
4. If no execution path exists, keep PR draft/unmerged with `NOT_RUN` evidence stated explicitly.
