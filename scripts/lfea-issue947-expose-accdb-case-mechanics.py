#!/usr/bin/env python3
from pathlib import Path
import hashlib
import json

path = Path('src/core/fea-benchmarks/caesar-accdb-linear-solve.js')
text = path.read_text()
before = hashlib.sha256(text.encode()).hexdigest()

return_old = "  return {\n    execution,\n    rows: resultRows({ benchmarkPackage, execution, recovered, analysis }),"
return_new = "  return {\n    analysis,\n    execution,\n    rows: resultRows({ benchmarkPackage, execution, recovered, analysis }),"
count = text.count(return_old)
if count != 1:
    raise SystemExit(f'Expected exactly one solveCase return patch site; found {count}.')
text = text.replace(return_old, return_new)

anchor = "\nfunction solveCase(benchmarkPackage, caseRecord, solveProfile) {"
count = text.count(anchor)
if count != 1:
    raise SystemExit(f'Expected exactly one solveCase anchor; found {count}.')
helper_lines = [
    '', '',
    '/** Diagnostic-only read access to the exact production case construction. */',
    'export function inspectCaesarAccdbLinearCaseMechanics(benchmarkPackage, caseId) {',
    '  requireBenchmarkPackage(benchmarkPackage);',
    '  const solveProfile = benchmarkPackage.profile.linearSolve;',
    "  if (solveProfile === null) throw new TypeError('The ACCDB profile does not declare linearSolve authorities.');",
    '  const caseRecord = benchmarkPackage.cases.find((entry) => entry.caseId === caseId);',
    "  if (!caseRecord) throw new TypeError(`ACCDB benchmark package lacks case ${String(caseId)}.`);",
    '  const solved = solveCase(benchmarkPackage, caseRecord, solveProfile);',
    '  return deepFreeze({',
    "    schema: 'lfea-accdb-linear-case-mechanics-inspection/v1',",
    '    sourceAccdbSha256: benchmarkPackage.source.sha256,',
    '    caseId: caseRecord.caseId,',
    '    formula: caseRecord.formula,',
    '    executionStatus: solved.execution.status,',
    '    rows: solved.rows.map((row) => ({ ...row })),',
    '    elements: solved.analysis.elements.map((entry) => ({',
    '      elementId: entry.elementId,',
    '      sourceElementId: entry.sourceElementId,',
    '      nodeI: entry.nodeI,',
    '      nodeJ: entry.nodeJ,',
    '      kind: entry.kind,',
    '      teeJunctionNodeId: entry.teeJunctionNodeId,',
    '      globalStiffness: [...entry.contribution.globalStiffness],',
    '      equivalentLoadGlobal: [...entry.contribution.equivalentLoadGlobal],',
    '      initialStrainLoadGlobal: [...entry.contribution.initialStrainLoadGlobal],',
    '      pressureAxialStrain: entry.pressureAxialStrain,',
    '      bourdonRotationRadians: entry.bourdonRotationRadians,',
    '      bourdonFreeEndTranslationM: [...entry.bourdonFreeEndTranslationM],',
    '      gravityWeightN: entry.gravityWeightN,',
    '    })),',
    '  });',
    '}',
]
text = text.replace(anchor, '\n'.join(helper_lines) + anchor)
path.write_text(text)
after = hashlib.sha256(text.encode()).hexdigest()

Path('.work').mkdir(exist_ok=True)
Path('.work/issue947-accdb-case-mechanics-inspection-patch.json').write_text(json.dumps({
    'schema': 'lfea-issue947-diagnostic-patch/v1',
    'scope': 'DIAGNOSTIC_ONLY_READ_ONLY_PRODUCTION_MECHANICS_INSPECTION',
    'productionSourceChanged': False,
    'reason': 'Expose exact already-built analysis descendant K, equivalent load and initial-strain vectors plus solved action rows for source-component condensation without copying component mechanics.',
    'beforeSha256': before,
    'afterSha256': after,
}, indent=2) + '\n')
