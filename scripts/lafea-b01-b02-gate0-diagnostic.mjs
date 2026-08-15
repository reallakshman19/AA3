#!/usr/bin/env node
// Executed by the existing visible-workbench qualification route. B02
// architecture/recovery/frozen-definition gates execute before any production
// observation; the production sequence then runs A->B->C->D->E in order.
// No workflow definition or frozen acceptance data is modified here.
import './lafea-b02-gate0-contract-check.mjs';
import './lafea-b02-g4-physical-probe-diagnostic.mjs';
import './lafea-b02-g4-probe-fail-closed-diagnostic.mjs';
import './lafea-b02-g4-convergence-diagnostic.mjs';
import './lafea-b02-definition-freeze-check.mjs';
import './lafea-b02b-saint-venant-oracle-check.mjs';
import './lafea-b02-production-source-guard.mjs';
import './lafea-b02-production-sequence-check.mjs';
