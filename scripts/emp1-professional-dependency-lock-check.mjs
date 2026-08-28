#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const options = parseArgs(process.argv.slice(2));
const result = await evaluateDependencyLockCustody({
  packagePath: resolve(root, options.packagePath),
  lockPath: resolve(root, options.lockPath),
});
console.log(JSON.stringify(result, null, 2));
process.exit(result.status === 'PASS' ? 0 : 1);

export async function evaluateDependencyLockCustody({ packagePath, lockPath }) {
  const violations = [];
  let packageBytes;
  let lockBytes;
  let manifest;
  let lock;
  try {
    packageBytes = await readFile(packagePath);
  } catch {
    return failure('DEPENDENCY_PACKAGE_MANIFEST_UNREADABLE');
  }
  try {
    lockBytes = await readFile(lockPath);
  } catch {
    return failure('DEPENDENCY_LOCKFILE_UNREADABLE');
  }
  try {
    manifest = JSON.parse(packageBytes.toString('utf8'));
  } catch {
    return failure('DEPENDENCY_PACKAGE_MANIFEST_JSON_INVALID');
  }
  try {
    lock = JSON.parse(lockBytes.toString('utf8'));
  } catch {
    return failure('DEPENDENCY_LOCKFILE_JSON_INVALID');
  }

  if (!record(manifest)) violations.push(row('DEPENDENCY_PACKAGE_MANIFEST_OBJECT_REQUIRED', 'package.json'));
  if (!record(lock)) violations.push(row('DEPENDENCY_LOCKFILE_OBJECT_REQUIRED', 'package-lock.json'));
  if (!record(manifest) || !record(lock)) return finalize();

  if (lock.lockfileVersion !== 3) {
    violations.push(row('DEPENDENCY_LOCKFILE_VERSION_3_REQUIRED', 'package-lock.json'));
  }
  if (!record(lock.packages) || !record(lock.packages[''])) {
    violations.push(row('DEPENDENCY_LOCKFILE_ROOT_PACKAGE_REQUIRED', 'package-lock.json'));
    return finalize();
  }

  const lockRoot = lock.packages[''];
  if (lock.name !== manifest.name || lockRoot.name !== manifest.name) {
    violations.push(row('DEPENDENCY_PACKAGE_NAME_LOCK_MISMATCH', 'package-lock.json'));
  }
  if (lock.version !== manifest.version || lockRoot.version !== manifest.version) {
    violations.push(row('DEPENDENCY_PACKAGE_VERSION_LOCK_MISMATCH', 'package-lock.json'));
  }

  const dependencyKinds = ['dependencies', 'devDependencies', 'optionalDependencies'];
  for (const kind of dependencyKinds) {
    const manifestMap = normalizedMap(manifest[kind]);
    const lockMap = normalizedMap(lockRoot[kind]);
    if (JSON.stringify(manifestMap) !== JSON.stringify(lockMap)) {
      violations.push(row(`DEPENDENCY_ROOT_MAP_MISMATCH_${kind.toUpperCase()}`, 'package-lock.json'));
    }
    for (const [name, specifier] of Object.entries(manifestMap)) {
      if (unqualifiedDirectSpecifier(specifier)) {
        violations.push(row('DEPENDENCY_DIRECT_SPECIFIER_UNQUALIFIED', `package.json:${kind}:${name}`));
      }
      const packageKey = `node_modules/${name}`;
      const retained = lock.packages[packageKey];
      if (!record(retained)) {
        violations.push(row('DEPENDENCY_DIRECT_LOCK_ENTRY_MISSING', packageKey));
      }
    }
  }

  let retainedPackageCount = 0;
  let resolvedPackageCount = 0;
  let integrityBoundResolvedPackageCount = 0;
  for (const [packagePathKey, entry] of Object.entries(lock.packages)) {
    if (packagePathKey === '') continue;
    retainedPackageCount += 1;
    if (!record(entry)) {
      violations.push(row('DEPENDENCY_LOCK_ENTRY_OBJECT_REQUIRED', packagePathKey));
      continue;
    }
    if (entry.link === true) {
      violations.push(row('DEPENDENCY_LOCK_LINK_ENTRY_PROHIBITED', packagePathKey));
      continue;
    }
    if (typeof entry.version !== 'string' || entry.version.trim() === '') {
      violations.push(row('DEPENDENCY_LOCK_ENTRY_VERSION_REQUIRED', packagePathKey));
    }
    if (entry.resolved == null) continue;
    resolvedPackageCount += 1;
    if (!secureResolvedSource(entry.resolved)) {
      violations.push(row('DEPENDENCY_RESOLVED_SOURCE_HTTPS_REQUIRED', packagePathKey));
      continue;
    }
    if (typeof entry.integrity !== 'string' || !/^sha(?:256|384|512)-[A-Za-z0-9+/=]+$/u.test(entry.integrity)) {
      violations.push(row('DEPENDENCY_RESOLVED_INTEGRITY_REQUIRED', packagePathKey));
      continue;
    }
    integrityBoundResolvedPackageCount += 1;
  }

  return finalize({
    retainedPackageCount,
    resolvedPackageCount,
    integrityBoundResolvedPackageCount,
  });

  function finalize(counts = {}) {
    const orderedViolations = [...violations].sort((a, b) =>
      `${a.code}:${a.path}`.localeCompare(`${b.code}:${b.path}`));
    return Object.freeze({
      schema: 'emp1-professional-dependency-lock-custody/v1',
      status: orderedViolations.length ? 'FAIL' : 'PASS',
      packageJsonSha256: sha256(packageBytes),
      packageLockSha256: sha256(lockBytes),
      lockfileVersion: lock?.lockfileVersion ?? null,
      directDependencyCount: directCount(manifest),
      retainedPackageCount: counts.retainedPackageCount ?? null,
      resolvedPackageCount: counts.resolvedPackageCount ?? null,
      integrityBoundResolvedPackageCount: counts.integrityBoundResolvedPackageCount ?? null,
      violations: orderedViolations,
      authorityBoundary: Object.freeze({
        exactDependencyCustodyEstablished: orderedViolations.length === 0,
        vulnerabilityStatusEstablished: false,
        engineeringAuthorityGranted: false,
        releaseAuthorityGranted: false,
      }),
    });
  }

  function failure(code) {
    return Object.freeze({
      schema: 'emp1-professional-dependency-lock-custody/v1',
      status: 'FAIL',
      packageJsonSha256: packageBytes ? sha256(packageBytes) : null,
      packageLockSha256: lockBytes ? sha256(lockBytes) : null,
      lockfileVersion: null,
      directDependencyCount: null,
      retainedPackageCount: null,
      resolvedPackageCount: null,
      integrityBoundResolvedPackageCount: null,
      violations: [row(code, code.includes('LOCKFILE') ? 'package-lock.json' : 'package.json')],
      authorityBoundary: Object.freeze({
        exactDependencyCustodyEstablished: false,
        vulnerabilityStatusEstablished: false,
        engineeringAuthorityGranted: false,
        releaseAuthorityGranted: false,
      }),
    });
  }
}

function normalizedMap(value) {
  if (!record(value)) return {};
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
}
function directCount(manifest) {
  return ['dependencies', 'devDependencies', 'optionalDependencies']
    .reduce((sum, key) => sum + Object.keys(normalizedMap(manifest?.[key])).length, 0);
}
function unqualifiedDirectSpecifier(value) {
  if (typeof value !== 'string' || value.trim() === '') return true;
  const match = /^([A-Za-z][A-Za-z0-9+.-]*):/u.exec(value.trim());
  return Boolean(match && match[1].toLowerCase() !== 'npm');
}
function secureResolvedSource(value) {
  if (typeof value !== 'string' || value.trim() === '') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.username === '' && url.password === '';
  } catch {
    return false;
  }
}
function row(code, path) { return Object.freeze({ code, path }); }
function record(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function parseArgs(args) {
  const out = { packagePath: 'package.json', lockPath: 'package-lock.json' };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--package') out.packagePath = requireValue(args, ++index, arg);
    else if (arg === '--lock') out.lockPath = requireValue(args, ++index, arg);
    else throw new TypeError(`EMP1_DEPENDENCY_LOCK_ARGUMENT_UNSUPPORTED:${arg}`);
  }
  return out;
}
function requireValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith('--')) throw new TypeError(`EMP1_DEPENDENCY_LOCK_ARGUMENT_VALUE_REQUIRED:${flag}`);
  return value;
}
