#!/usr/bin/env node
import fs from 'node:fs';

const file = 'src/workspace/lafea-selected-pilot-evidence-handoff.js';
let source = fs.readFileSync(file, 'utf8');
const before = `  if (!loadCase || loadCase.solverEvidence?.method !== 'DETERMINISTIC_CHOLESKY'\n    || loadCase.solverEvidence?.accepted !== true\n    || !Array.isArray(loadCase.freeDofIdentities)\n    || loadCase.freeDofIdentities.length === 0\n    || loadCase.equilibrium?.accepted !== true) {\n    throw handoffError('LAFEA_NB_T6E_FREE_DOF_EVIDENCE_INVALID');\n  }\n  const reactionResultant = loadCase.reactions.reduce((sum, row) => {\n    sum[row.dofIdentity.endsWith(':UX') ? 0 : 1] += row.value;\n    return sum;\n  }, [0, 0]);`;
const after = `  const freeDofIdentities = loadCase?.solverEvidence?.freeDofIdentities;\n  const constrainedDofIdentities = loadCase?.solverEvidence?.constrainedDofIdentities;\n  const supportReactions = loadCase?.supportReactions;\n  const supportedSolverMethods = new Set([\n    'DETERMINISTIC_CHOLESKY',\n    'DETERMINISTIC_PCG_IC0',\n  ]);\n  if (!loadCase || !supportedSolverMethods.has(loadCase.solverEvidence?.method)\n    || loadCase.solverEvidence?.accepted !== true\n    || !Array.isArray(freeDofIdentities)\n    || freeDofIdentities.length === 0\n    || !Array.isArray(constrainedDofIdentities)\n    || !Array.isArray(supportReactions)\n    || loadCase.equilibrium?.accepted !== true) {\n    throw handoffError('LAFEA_NB_T6E_FREE_DOF_EVIDENCE_INVALID');\n  }\n  const reactionResultant = supportReactions.reduce((sum, row) => {\n    sum[row.dofIdentity.endsWith(':UX') ? 0 : 1] += row.value;\n    return sum;\n  }, [0, 0]);`;
if (!source.includes(before)) throw new Error('selected-pilot handoff schema block not found');
source = source.replace(before, after);
source = source.replace(
  `    [loadCase.freeDofIdentities.length, qualificationLevel.freeDofCount],\n    [loadCase.constrainedDofIdentities.length,\n      qualificationLevel.constrainedDofCount],`,
  `    [freeDofIdentities.length, qualificationLevel.freeDofCount],\n    [constrainedDofIdentities.length, qualificationLevel.constrainedDofCount],`,
);
fs.writeFileSync(file, source);
fs.writeFileSync('patched-selected-pilot-evidence-handoff.js', source);
console.log(JSON.stringify({ status: 'PATCHED_FOR_PROBE', file }));
