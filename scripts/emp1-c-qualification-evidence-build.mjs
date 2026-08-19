#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  deriveEmp1CQualificationEvidence,
  loadEmp1CRetainedArtifacts,
  renderEmp1CQualificationEvidenceModule,
} from './emp1-c-qualification-evidence-lib.mjs';

const root = process.cwd();
const target = path.join(root, 'src/core/emp1/emp1-c-qualification-evidence.generated.js');
const evidence = deriveEmp1CQualificationEvidence(loadEmp1CRetainedArtifacts(root));
const rendered = renderEmp1CQualificationEvidenceModule(evidence);
fs.writeFileSync(target, rendered, 'utf8');
console.log(JSON.stringify({
  schema: 'emp1-c-qualification-evidence-build/v1',
  status: 'PASS',
  target: path.relative(root, target).replaceAll('\\', '/'),
  currentWrcUnresolvedFields: evidence.wrcDataset.unresolvedJsonPathCount,
  currentCoefficientCoverage: `${evidence.wrcDataset.numericCoefficientRows}/${evidence.wrcDataset.coefficientInventoryRows}`,
  currentSignConflicts: evidence.signArbitration.openConflicts.length,
  currentCauxStatus: evidence.cauxBenchmark.status,
}, null, 2));
