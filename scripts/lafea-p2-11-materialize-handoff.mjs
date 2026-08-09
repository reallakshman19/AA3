#!/usr/bin/env node
import fs from 'node:fs';

const target = 'src/workspace/lafea-selected-pilot-evidence-handoff.js';
let source = fs.readFileSync(target, 'utf8');
const before = `  if (!loadCase || loadCase.solverEvidence?.method !== 'DETERMINISTIC_CHOLESKY'\n    || loadCase.solverEvidence?.accepted !== true\n    || !Array.isArray(loadCase.freeDofIdentities)\n    || loadCase.freeDofIdentities.length === 0\n    || loadCase.equilibrium?.accepted !== true) {\n    throw handoffError('LAFEA_NB_T6E_FREE_DOF_EVIDENCE_INVALID');\n  }\n  const reactionResultant = loadCase.reactions.reduce((sum, row) => {\n    sum[row.dofIdentity.endsWith(':UX') ? 0 : 1] += row.value;\n    return sum;\n  }, [0, 0]);`;
const after = `  const freeDofIdentities = loadCase?.solverEvidence?.freeDofIdentities;\n  const constrainedDofIdentities = loadCase?.solverEvidence?.constrainedDofIdentities;\n  const supportReactions = loadCase?.supportReactions;\n  const supportedSolverMethods = new Set([\n    'DETERMINISTIC_CHOLESKY',\n    'DETERMINISTIC_PCG_IC0',\n  ]);\n  if (!loadCase || !supportedSolverMethods.has(loadCase.solverEvidence?.method)\n    || loadCase.solverEvidence?.accepted !== true\n    || !Array.isArray(freeDofIdentities)\n    || freeDofIdentities.length === 0\n    || !Array.isArray(constrainedDofIdentities)\n    || !Array.isArray(supportReactions)\n    || loadCase.equilibrium?.accepted !== true) {\n    throw handoffError('LAFEA_NB_T6E_FREE_DOF_EVIDENCE_INVALID');\n  }\n  const reactionResultant = supportReactions.reduce((sum, row) => {\n    sum[row.dofIdentity.endsWith(':UX') ? 0 : 1] += row.value;\n    return sum;\n  }, [0, 0]);`;
if (!source.includes(before)) throw new Error('selected-pilot handoff schema block not found');
source = source.replace(before, after);
const countsBefore = `    [loadCase.freeDofIdentities.length, qualificationLevel.freeDofCount],\n    [loadCase.constrainedDofIdentities.length,\n      qualificationLevel.constrainedDofCount],`;
const countsAfter = `    [freeDofIdentities.length, qualificationLevel.freeDofCount],\n    [constrainedDofIdentities.length, qualificationLevel.constrainedDofCount],`;
if (!source.includes(countsBefore)) throw new Error('selected-pilot handoff DOF count block not found');
source = source.replace(countsBefore, countsAfter);
fs.writeFileSync(target, source);
console.log(JSON.stringify({ status: 'MATERIALIZED', target }));
