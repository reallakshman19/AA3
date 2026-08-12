import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  convertCaesarTranslationalStiffnessToSi,
  normalizeDisplayedCaesarFrictionStiffnessFromInputXml,
  parseCaesarInputXmlTranslationalStiffnessUnit,
} from '../src/core/nonlinear-restraint-friction/caesar-friction-unit-normalization.js';
import {
  FRICTION_EXECUTION_READINESS_STATUS,
  assessFrictionExecutionReadiness,
} from '../src/core/nonlinear-restraint-friction/friction-execution-readiness.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const authorityPath = path.resolve(here, '../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-friction-unit-authority.json');
const authority = JSON.parse(fs.readFileSync(authorityPath, 'utf8'));

assert.equal(authority.schema, 'm047-bm4l-friction-unit-authority/v1');
assert.equal(authority.benchmarkId, 'BM4_L');
assert.equal(authority.configurationAuthority.displayedValue, 1_000_000);
assert.equal(authority.inputXmlAuthority.translationalStiffnessUnit.normalized, 'n/cm');
assert.equal(authority.normalization.conversionFactorToNPerM, 100);
assert.equal(authority.normalization.valueNPerM, 100_000_000);
assert.equal(authority.decision.frictionStiffnessSiNPerM, 100_000_000);
assert.equal(authority.decision.l13ProductionSolveAuthorized, false);
assert.equal(authority.decision.l7ProductionSolveAuthorized, false);

const syntheticUnitsXml = '<UNITS><TRANS_STIFF LABEL="N. / cm." FACTOR="1.751270"/></UNITS>';
const parsed = parseCaesarInputXmlTranslationalStiffnessUnit(syntheticUnitsXml);
assert.deepEqual(parsed, { label: 'N. / cm.', normalizedUnit: 'n/cm', factor: 1.75127 });

const bm4 = normalizeDisplayedCaesarFrictionStiffnessFromInputXml({
  displayedValue: authority.configurationAuthority.displayedValue,
  xmlText: syntheticUnitsXml,
});
assert.equal(bm4.valueNPerM, 100_000_000);
assert.equal(bm4.conversionFactorToNPerM, 100);

assert.equal(convertCaesarTranslationalStiffnessToSi(1_000_000, 'N/m').valueNPerM, 1_000_000);
assert.equal(convertCaesarTranslationalStiffnessToSi(1_000_000, 'N/mm').valueNPerM, 1_000_000_000);
assert.notEqual(bm4.valueNPerM, 1_000_000);
assert.notEqual(bm4.valueNPerM, 1_000_000_000);
assert.throws(() => convertCaesarTranslationalStiffnessToSi(1, 'kg/mm'));

const bypass = assessFrictionExecutionReadiness({
  caseId: 'L6',
  frictionMultiplier: 0,
  sourceMap: null,
  authority: {
    frictionStiffness: { status: 'INVALID', value: Number.NaN },
  },
});
assert.equal(bypass.status, FRICTION_EXECUTION_READINESS_STATUS.READY_LINEAR_BYPASS);
assert.equal(bypass.route, 'QUALIFIED_LINEAR_SOLVER');
assert.equal(bypass.evidence.nonlinearAuthorityInspected, false);
assert.equal(bypass.evidence.sourceMapInspected, false);

const inputXmlArg = process.argv.find((arg) => arg.startsWith('--inputxml='));
if (inputXmlArg) {
  const inputXmlPath = inputXmlArg.slice('--inputxml='.length);
  const bytes = fs.readFileSync(inputXmlPath);
  const header = Buffer.from(`blob ${bytes.length}\0`);
  const gitBlobSha1 = crypto.createHash('sha1').update(header).update(bytes).digest('hex');
  assert.equal(gitBlobSha1, authority.inputXmlAuthority.gitBlobSha1, 'exact Common InputXML Git blob SHA');

  const xmlText = bytes.toString('utf8');
  const exactUnit = parseCaesarInputXmlTranslationalStiffnessUnit(xmlText);
  assert.equal(exactUnit.label, authority.inputXmlAuthority.translationalStiffnessUnit.label);
  assert.equal(exactUnit.normalizedUnit, authority.inputXmlAuthority.translationalStiffnessUnit.normalized);
  assert.equal(exactUnit.factor, authority.inputXmlAuthority.translationalStiffnessUnit.factorField);

  const exact = normalizeDisplayedCaesarFrictionStiffnessFromInputXml({
    displayedValue: authority.configurationAuthority.displayedValue,
    xmlText,
  });
  assert.equal(exact.valueNPerM, authority.normalization.valueNPerM);
}

console.log('PASS M047 BM4_L friction stiffness unit normalization');
