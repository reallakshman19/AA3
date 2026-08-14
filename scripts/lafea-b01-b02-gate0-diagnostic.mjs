#!/usr/bin/env node
// Executed by the existing B01 diagnostic capture step. This intentionally binds
// B02 Gate 0 architecture contracts into the pre-mechanics qualification gate
// without changing any workflow definition or FEM production code.
import './lafea-b02-gate0-contract-check.mjs';
