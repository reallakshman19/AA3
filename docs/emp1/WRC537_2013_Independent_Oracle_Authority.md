# WRC 537 independent-oracle interpretation authority

## Purpose

This ledger closes the validation common-mode defect in which an “independent” EMP.1 hand calculation could reproduce the same Table-5 figure interpretation and sign matrix as production. Separate files are not independent evidence when the engineering semantics can be copied on both sides.

EMP1-10 therefore separates four identities:

```text
retained WRC transcription
        ↓
reviewed source interpretation
        ↓
independent numerical oracle
        ↓
production comparison / falsification
```

CAUx/Hexagon is retained only as secondary historical worked-case evidence. It does not define WRC method authority.

## Source split

| Datum | Independent validation authority | Use |
|---|---|---|
| Allowed Table-5 figure/reference cells | `docs/emp1/WRC537_2013_Tables_and_Charts.md`, WRC 537 Table 5, pp.41–42 | Strictly checked against the retained source. Alternatives such as `1B or 1B-1` and `2B or 2B-1` remain alternatives until separate method authority selects one. |
| Table-5 algebraic sign placement at Au/Al/Bu/Bl/Cu/Cl/Du/Dl | same retained WRC Table 5 | Parsed independently and checked against the reviewed interpretation artifact. |
| Reviewed OCR/engineering binding | `validation/emp1/wrc537-2013/table5-reviewed-interpretation-v1.json` | Explicit reviewed binding between retained source cells and calculation meanings; semantic hash is independent of production code. |
| Historical gamma5 worked-case location/alternative selection | `docs/emp1/CAUx_2017_WRC01f_pages_24-31.md`, pp.24–27 | Secondary validation only for the historical frozen comparison vector. |
| Curve coefficients | retained WRC individual figure coefficient tables | Parsed independently by the gamma5 hand calculation. |
| Production 1B/1B-1 and 2B/2B-1 selection | EMP1-06 governed selector | Not granted by CAUx or EMP1-10. |
| Production load-axis/sign convention | separate primary-source authority closure | Not granted by EMP1-10. |

## Reviewed interpretation identity

The reviewed interpretation artifact records:

- exact source document/edition/table/pages;
- eight recovery locations;
- required source anchors;
- WRC-allowed figure alternatives;
- historical gamma5 worked-case selection separately from production selection authority;
- reviewed sign arrays;
- `productionMethodAuthority=false`;
- semantic hash `654e33f7fa7124c78e827bffeae06570d7feb401624291c823a6218b6bd012d2`.

The independent source parser refuses semantic-hash drift and refuses a reviewed figure that is not present in the corresponding WRC Table-5 source cell.

## Independent oracle firewall

The isolated oracle lives under:

```text
scripts/oracles/emp1-wrc537/**
```

The mechanical firewall rejects:

- imports from `src/core/**`;
- imports from `src/workspace/**`;
- production bounded adapter imports;
- production Table-5 evaluator imports;
- production longitudinal-moment selector imports;
- copied `FIGURE_BASE` constants;
- copied production-style `SIGN` constant matrices.

The dedicated exact-head workflow reported:

```text
PASS_ZERO_PRODUCTION_SEMANTIC_IMPORTS
productionSemanticImports = 0
copiedProductionConstantPatterns = 0
```

## Numerical falsification matrix

The isolated numerical kernel independently reconstructs dimensional scale factors, Table-5 signed stress contributions, algebraic superposition and plane-stress Tresca intensity.

The EMP1-10 falsifier suite requires:

- 6 single-component positive-load cases;
- 6 corresponding load-reversal cases;
- 6 zero-isolation checks;
- production-vs-independent component comparison for 12 single-load cases plus the combined case;
- independent and production superposition checks;
- 2 deliberate figure-selection corruptions detected;
- 2 deliberate sign/axis corruptions detected.

Observed exact-head result:

```text
PASS_COMMON_MODE_FALSIFIERS
singleLoadCases = 6
loadReversalCases = 6
zeroIsolationCases = 6
superpositionCases = 2
deliberateFigureCorruptionsDetected = 2
deliberateSignCorruptionsDetected = 2
```

This demonstrates that the oracle can reject intentionally wrong semantics rather than merely reproducing a nominal combined-load vector.

## Semantic identities observed

Exact-head validation produced distinct evidence hashes:

```text
sourceSemanticHash        ccc3715aeefe71cbca4fffbee36c24d037e45a531636d65d24bf475312518890
table5InterpretationHash  654e33f7fa7124c78e827bffeae06570d7feb401624291c823a6218b6bd012d2
signAuthorityHash         be95253de1fb7d07a3662b92b29364da4b29e4251e2c8af2383618d99c82e985
historicalFigureMapHash   1343b2febc9895345d93749f31fb756f18543442cc415ce3d2a5e09f5cd5c920
overallAuthorityHash      e1a56de01be61ea04fedc0de4eabd8fced3f141ddb9fce43be6b365cf6feaaf5
```

Changing a reviewed sign, figure interpretation, or retained source changes evidence identity.

## Historical vectors

The existing gamma5 vector is deliberately reclassified as:

```text
HISTORICAL_GAMMA5_COMPARISON_VECTOR
```

Its frozen semantic hash remains unchanged:

`5daeb3a84828cf19017e6d1d0a70bd3478929713973948f875f21cec463a80aa`.

It reproduces the eight historical stress intensities while explicitly retaining:

```text
fullWrcSemanticAuthority = false
productionAuthority = false
```

The gamma15 historical baseline is also replayed through the isolated numerical kernel and remains governed at `Du = 19.492158999951467 MPa`.

## Authority boundary

EMP1-10 changes validation quality, not production authority.

It does **not**:

- resolve WRC cylindrical positive load-axis/sign convention;
- reauthorize 1B-1/2B-1 production selection;
- qualify caller-declared attachment outside diameter as authoritative geometry;
- provide missing §4.5 cylinder length/end-distance source evidence;
- authorize nonzero differential pressure/pressure thrust;
- authorize general non-unity `Kn/Kb`;
- authorize WRC297/nozzle-neck assessment;
- grant global EMP.1.C, code-compliance, or release authority.

Production remains fail-closed for the four current independent source-authority blockers plus the EMP1-09 eight-point/global-maximum limitation.
