# Qualification Questions — QS-ADV-EMP1-HUMAN-UI-1651-0002

QUALIFICATION_PROTOCOL_VERSION: 3
QUALIFICATION_PROFILE: WRC_LOCAL_STRESS
QUALIFICATION_PROFILE_VERSION: 2
QUALIFICATION_SCOPE_ID: QSCOPE-1651-EMP-PRESSURE-MATRIX
QUESTION_SET_ID: QS-ADV-EMP1-HUMAN-UI-1651-0002
QUALIFICATION_BASIS_HEAD: 6346ca4d05820f629cf9b54bf94408faf098da29
QUESTION_SET_STATUS: CURRENT
OWNER_QUALIFICATION_BASELINE_DISCOVERY: COMPLETE
OWNER_QUALIFICATION_BASELINE_SOURCE: NONE
OWNER_QUALIFICATION_BASELINE_STATUS: NOT_APPLICABLE

## Q1 — Production Trace

Domain challenge: trace the five retained pressure-definition identities through the governed descriptor/edit renderer and prove that a 5-row × 2-value-column presentation can preserve the exact same underlying edit authority.

Exact repository data required: `src/workspace/lafea-stage-input-descriptors.js`, `src/workspace/lafea-document-table-form.js`, `src/workspace/lafea-document-table-support.js`, `scripts/lafea.1-fixtures.mjs`, and `e2e/lafea-empirical-grouped-edit.spec.js` at the qualification basis.

Concrete payload: `LAFEA.1.pressure.internal` and `LAFEA.1.pressure.external` both address `pressureDefinitions` by `identity`. The retained fixture has P-CLOSED, P-OPEN, P-EXPLICIT and P-UNSPECIFIED at internal/external = 2/0 MPa, while the added P-EXTERNAL case is 0/1 MPa. Their source refs are distinct per identity and per Internal/External cell.

Required derivation: reconstruct how one visible cell must resolve to exactly `(descriptorId, entityId)`, e.g. P-EXTERNAL/Internal → (`LAFEA.1.pressure.internal`, `P-EXTERNAL`) and P-EXTERNAL/External → (`LAFEA.1.pressure.external`, `P-EXTERNAL`). Identify the mutation owner and explain why row/column position must never become authority.

First authority/ownership boundaries: descriptor definitions own editable field authorization; exact engineering identity owns collection selection; the renderer owns layout only; edit command/application owns mutation.

Fail if: the proposed matrix infers authority from array index, merges Internal/External into one synthetic scalar, or drops the descriptor/entity IDs used by governed edits.

## Q2 — Current Unresolved Problem / Failure Isolation

Domain challenge: isolate why complete X/Y/Z vector families group today while Pressure remains ten scalar rows, and identify the smallest reusable grouping contract that does not guess unrelated scalar pairs.

Exact repository data required: `collectVectorTriples()` and `renderScalarTable()` in `src/workspace/lafea-document-table-form.js`; StageInputDescriptor/v2 definitions for PRESSURE, REFERENCE_POINTS and LOAD_CASES; `scripts/emp1-governed-vector-table-check.mjs`.

Concrete payload: five Pressure identities × two descriptors = 10 editable scalar cells. The desired presentation is five identity rows with columns Internal and External. For P-EXTERNAL the retained values are Internal = 0 MPa and External = 1 MPa, so the row is deliberately asymmetric and exposes any accidental column swap. For P-CLOSED the retained values are 2 MPa and 0 MPa.

Required derivation: show why suffix-based X/Y/Z detection is safe only for complete agreeing vectors, then define an explicit/declared matrix-family contract for scalar columns. Predict the rendered row/cell cardinality before and after: 10 scalar rows → 5 identity rows, while editable scalar count remains 10.

Predicted intermediate values: P-EXTERNAL must remain `[Internal=0, External=1]`; P-CLOSED must remain `[Internal=2, External=0]`.

First wrong boundary: presentation grouping, not pressure data or pressure-stress mechanics.

Falsifier: a matrix implementation that displays P-EXTERNAL as 1/0, emits fewer than 10 governed inputs, or groups a partial/mismatched descriptor family.

Fail if: the answer proposes a `groupId === 'PRESSURE'` one-off branch without a reusable declared contract, or changes pressure definitions to simplify rendering.

## Q3 — Authority / Invariant

Domain challenge: preserve pressure engineering meaning, source custody and transactional edit behavior while changing only table shape.

Exact repository data required: Pressure descriptors in `src/workspace/lafea-stage-input-descriptors.js`; `buildGovernedInput`, source-ref resolution and batch-edit handling in `src/workspace/lafea-document-table-form.js`; fixture source refs in `scripts/lafea.1-fixtures.mjs` and `scripts/lafea.2-fixtures.mjs`.

Concrete payload: P-CLOSED/Internal source ref resolves to `SOURCE-PIPE-MODEL@7#pressure.P-CLOSED.internal`; P-CLOSED/External resolves to `SOURCE-PIPE-MODEL@7#pressure.P-CLOSED.external`. P-EXTERNAL is created with separate refs `pressure.P-EXTERNAL.internal` and `pressure.P-EXTERNAL.external`. All values remain pressure-dimension governed scalars.

Required derivation: define the invariant that each matrix cell independently retains descriptor ID, entity ID, unit, current value state, dirty state and source reference. Explain when a shared row-level Source/status cell is permissible and when per-cell provenance must be exposed.

Authority/source trace: UI matrix metadata may declare presentation family/column labels; it may not define pressure values, end-condition physics, differential-pressure mechanics, pressure thrust, WRC applicability, or route authorization.

Protected invariant: `ONE_VISIBLE_MATRIX_CELL == ONE_EXISTING_GOVERNED_DESCRIPTOR_INSTANCE`.

Falsifier: changing one External cell causes its paired Internal descriptor, another pressure identity, or downstream source reference to change without an explicit governed edit.

Invalid shortcut: use the Internal descriptor's source/status as the row source for both cells when source refs differ.

Fail if: provenance is lost, batch edits cease to be exact, or the matrix creates new engineering data/authority.

## Q4 — Independent Validation

Domain challenge: prove the matrix refactor is value-preserving independently of the new renderer.

Exact repository data required: `scripts/lafea.1-fixtures.mjs`, `scripts/lafea.2-fixtures.mjs`, descriptor definitions, and browser DOM attributes `data-descriptor-id` / `data-entity-id`.

Concrete payload A: base fixture pressure vectors are P-CLOSED = (2,0), P-OPEN = (2,0), P-EXPLICIT = (2,0), P-UNSPECIFIED = (2,0) MPa. Required derivation: independent differential pressures are 2, 2, 2, 2 MPa respectively; matrix grouping must not alter any stored value or source ref.

Concrete payload B: extended fixture P-EXTERNAL = (0,1) MPa. Required derivation: `Pi - Po = -1 MPa`; this negative differential-pressure arithmetic is an independent transposition oracle—if the UI accidentally swaps columns it becomes +1 MPa.

Independent oracle: direct fixture/descriptors and arithmetic above, not DOM formatting or production pressure-stress output.

Required numerical/technical evidence: exactly 5 identity rows, exactly 10 governed input elements, exact Internal/External values above, and exact descriptor/entity pairs for every cell. Reference-point and load-case X/Y/Z grouping cardinality must remain unchanged.

Units/sign/tolerance: MPa; Internal minus External sign only for the independent validation arithmetic, not a new application formula or WRC authorization rule. Equality should be exact for these integer fixture values.

Falsifier: any value/source-ref mismatch, loss of one governed input, X/Y/Z regression, or P-EXTERNAL differential sign reversal.

Fail if: production output is used as its own oracle or a tolerance masks a column/identity mismatch.

## Q5 — Next Contribution / Minimal Patch

Domain challenge: define the smallest legitimate LEG-002 patch that makes Pressure consistent with existing grouped engineering inputs without creating a second renderer architecture.

Exact repository data required: `src/workspace/lafea-stage-input-descriptors.js`, `src/workspace/lafea-document-table-form.js`, `scripts/emp1-governed-vector-table-check.mjs`, `e2e/lafea-empirical-grouped-edit.spec.js`, and current issue #1651 acceptance.

Concrete payload: target Pressure presentation is rows P-CLOSED, P-OPEN, P-EXPLICIT, P-EXTERNAL, P-UNSPECIFIED × columns Internal/External; retained governed scalar count remains 10. Existing Reference points and Load force/moment retain X/Y/Z grouping.

Required derivation: propose explicit presentation metadata (or an equivalently conservative declared contract) that generalizes the current grouped renderer, prove incomplete/mismatched families fall back safely, and identify the exact test seams for grouping detection plus browser edit/undo/redo behavior.

Safe patch boundary: descriptor presentation metadata + shared governed table renderer + focused grouping/browser tests only.

Expected before/after evidence: Pressure 10 one-value rows → 5 rows × 2 value columns; same values, units, source refs, descriptors, entity IDs, edit transactions and undo/redo semantics.

Protected unchanged domains: pressure calculation/end-condition/thrust mechanics; WRC equations/tables/sign/axis/applicability; route authority; CAUx/PV Elite evidence; code/release authority; generic LAFEA.3+/FEA/Load Calc behavior; `.github/workflows/**`.

Validation required: generalized matrix unit/static check with negative controls; existing vector grouping check or migrated equivalent; focused empirical grouped-edit browser proof including Pressure; EMP UI/import/build/diff checks when execution is available.

Negative test: omit External or give it a different collectionPath/identityKey/family and prove the renderer refuses to matrix-group rather than guessing.

Rollback/falsifier boundary: if generalization requires changing governed target paths, value contracts, invalidation classes, pressure model data, or edit-command authority, stop and redesign.

No-patch condition: if the two Pressure descriptors cannot be proven to share the same identity collection and compatible unit/edit semantics, do not combine them visually.
