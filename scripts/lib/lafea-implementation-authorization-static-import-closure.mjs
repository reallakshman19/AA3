#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const [rootArgument, ...entryArguments] = process.argv.slice(2);
assert.ok(rootArgument, 'repository root argument is required');
assert.ok(entryArguments.length > 0, 'at least one authorization entrypoint is required');
assert.equal(typeof vm.SourceTextModule, 'function', 'SourceTextModule unavailable; run with --experimental-vm-modules');

const ROOT = path.resolve(rootArgument);
const requireFromRepository = createRequire(path.join(ROOT, 'package.json'));
const visited = new Set();
const localFiles = [];
const nodeBuiltins = new Set();
const externalPackages = new Map();

for (const relativeEntry of entryArguments) {
  visitLocalModule(resolveInsideRoot(ROOT, relativeEntry));
}

const receipt = Object.freeze({
  schema: 'lafea-implementation-authorization-static-import-closure/v1',
  status: 'PASS',
  repositoryRoot: ROOT,
  entrypoints: Object.freeze([...entryArguments]),
  localModuleCount: localFiles.length,
  localModules: Object.freeze([...localFiles].sort()),
  nodeBuiltins: Object.freeze([...nodeBuiltins].sort()),
  externalPackages: Object.freeze([...externalPackages.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([specifier, resolvedPath]) => Object.freeze({ specifier, resolvedPath }))),
});

process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);

function visitLocalModule(absolutePath) {
  const normalized = path.resolve(absolutePath);
  assertInsideRoot(normalized);
  if (visited.has(normalized)) return;
  assert.equal(fs.existsSync(normalized), true, `static import target missing: ${relative(normalized)}`);
  assert.equal(fs.statSync(normalized).isFile(), true, `static import target is not a file: ${relative(normalized)}`);
  visited.add(normalized);
  localFiles.push(relative(normalized));

  if (path.extname(normalized) === '.json') return;
  const source = fs.readFileSync(normalized, 'utf8');
  const module = new vm.SourceTextModule(source, { identifier: pathToFileURL(normalized).href });
  for (const specifier of module.dependencySpecifiers) {
    resolveDependency(normalized, specifier);
  }
}

function resolveDependency(parentPath, specifier) {
  if (specifier.startsWith('node:')) {
    nodeBuiltins.add(specifier);
    return;
  }
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    visitLocalModule(path.resolve(path.dirname(parentPath), specifier));
    return;
  }
  if (specifier.startsWith('file:')) {
    const url = new URL(specifier);
    visitLocalModule(url.pathname);
    return;
  }
  assert.equal(
    path.isAbsolute(specifier),
    false,
    `absolute static import is not permitted in authorization closure: ${specifier}`,
  );
  let resolved;
  try {
    resolved = requireFromRepository.resolve(specifier);
  } catch (error) {
    throw new Error(`external static import cannot resolve from repository: ${specifier}`, { cause: error });
  }
  externalPackages.set(specifier, resolved);
}

function resolveInsideRoot(root, relativePath) {
  assert.equal(path.isAbsolute(relativePath), false, `entrypoint must be repository-relative: ${relativePath}`);
  const absolute = path.resolve(root, relativePath);
  assertInsideRoot(absolute);
  return absolute;
}

function assertInsideRoot(absolutePath) {
  const relation = path.relative(ROOT, absolutePath);
  assert.ok(
    relation === '' || (!relation.startsWith('..') && !path.isAbsolute(relation)),
    `authorization import closure escaped repository root: ${absolutePath}`,
  );
}

function relative(absolutePath) {
  return path.relative(ROOT, absolutePath).split(path.sep).join('/');
}
