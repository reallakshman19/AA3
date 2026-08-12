import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requestedEntry = argumentValue('--entry');
const ENTRY = path.resolve(ROOT, requestedEntry ?? 'src/lafea-app/main.js');
const HTML = path.join(ROOT, 'lafea.html');
const CONFIG = path.join(ROOT, 'vite.lafea.config.js');
const SHARED = path.join(ROOT, 'src/core/shared-primitives');

const FORBIDDEN_EXACT = new Set([
  'src/main.js',
  'src/workspace/bootstrap.js',
  'src/workspace/application-shell-controller.js',
  'src/workspace/event-bus.js',
  'src/workspace/event-topics.js',
  'src/workspace/lafea-workbench.js',
  'src/workspace/fea-benchmark-panel.js',
  'src/workspace/advanced-mock-data.js',
  'src/workspace/lafea-simulated-source-provider.js',
]);
const FORBIDDEN_PREFIXES = [
  'src/lfea/',
  'src/core/linear-fea-',
  'src/core/linear-piping-',
  'src/core/shared-piping-model/',
  'src/core/piping-topology/',
];
const IMPORT_RE = /(?:import|export)\s+(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/gu;
const URL_RE = /new\s+URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/gu;
const STORAGE_RE = /(?:localStorage|sessionStorage)\s*\.\s*(?:getItem|setItem|removeItem)\s*\(\s*['"]([^'"]+)['"]/gu;
const SCRIPT_EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);

if (!requestedEntry) {
  assertStandaloneHtml();
  assertStandaloneConfig();
  assertNeutralSharedLeaf();
}
assert(fs.existsSync(ENTRY), `Standalone boundary entry is missing: ${repoRelative(ENTRY)}.`);

const visited = new Set();
walk(ENTRY, []);

if (!requestedEntry) {
  const entrySource = fs.readFileSync(ENTRY, 'utf8');
  assert(entrySource.includes("../workspace/lafea-workbench-controller.js"),
    'Standalone LAFEA entry must construct the LAFEA-owned controller directly.');
  assert(!entrySource.includes('../workspace/lafea-workbench.js'),
    'Standalone LAFEA entry must not load the compatibility workbench facade.');
  assert(!entrySource.includes('bootstrapAnalysisWorkspace'),
    'Standalone LAFEA entry must not call the combined workspace bootstrap.');
  assert(!entrySource.includes('AnalysisWorkspace'),
    'Standalone LAFEA entry must not publish the combined AnalysisWorkspace global.');
}

console.log(JSON.stringify({
  schema: 'lafea-standalone-boundary-check/v1',
  status: 'PASS',
  roadmap: 'A16',
  entry: repoRelative(ENTRY),
  localModulesInspected: visited.size,
  combinedWorkspaceRequired: false,
  combinedBuildConfigRequired: false,
  compatibilityFacadeRequired: false,
  lfeaRuntimeDependency: false,
  sharedPrimitiveProductDependency: false,
  sharedEventBusDependency: false,
  crossProductStorageKeyDependency: false,
}));

function walk(filePath, ancestry) {
  const absolute = path.resolve(filePath);
  const relative = repoRelative(absolute);
  if (visited.has(relative)) return;

  assertAllowedPath(relative, ancestry);
  visited.add(relative);

  const source = fs.readFileSync(absolute, 'utf8');
  assertAllowedSource(source, relative);
  for (const specifier of [...importSpecifiers(source), ...urlSpecifiers(source)]) {
    if (!specifier.startsWith('.')) continue;
    const resolved = resolveLocalModule(absolute, specifier);
    if (resolved) walk(resolved, [...ancestry, relative]);
  }
}

function assertAllowedPath(relativePath, ancestry) {
  const normalized = relativePath.replaceAll('\\', '/');
  const forbiddenPrefix = FORBIDDEN_PREFIXES.find((prefix) => normalized.startsWith(prefix));
  const lfeaNamedPath = normalized.split('/').some((segment) => /^lfea(?:[-.]|$)/u.test(segment));
  if (FORBIDDEN_EXACT.has(normalized) || forbiddenPrefix || lfeaNamedPath) {
    const chain = [...ancestry, normalized].join(' -> ');
    fail('FORBIDDEN_PRODUCT_OR_COMBINED_DEPENDENCY',
      `Forbidden LFEA/combined dependency in standalone LAFEA closure: ${chain}`);
  }
}

function assertAllowedSource(source, relativePath) {
  if (/\bbootstrapAnalysisWorkspace\b|\bAnalysisWorkspace\b/u.test(source)) {
    fail('COMBINED_WORKSPACE_AUTHORITY_REFERENCE',
      `Combined workspace authority referenced by ${relativePath}.`);
  }
  STORAGE_RE.lastIndex = 0;
  let storageMatch;
  while ((storageMatch = STORAGE_RE.exec(source)) !== null) {
    const key = storageMatch[1];
    if (!/^lafea(?:[.:/_-]|$)/iu.test(key)) {
      fail('CROSS_PRODUCT_STORAGE_KEY',
        `Standalone LAFEA closure uses non-LAFEA storage key ${JSON.stringify(key)} in ${relativePath}.`);
    }
  }
  if (/\bLFEA(?:_|\.|:)/u.test(source) || /['"]lfea[:./_-]/iu.test(source)) {
    fail('LFEA_RUNTIME_OR_TOPIC_REFERENCE',
      `LFEA runtime/topic identifier referenced by ${relativePath}.`);
  }
}

function assertNeutralSharedLeaf() {
  assert(fs.existsSync(SHARED), 'Neutral shared-primitives directory is missing.');
  for (const filePath of listScripts(SHARED)) {
    const source = fs.readFileSync(filePath, 'utf8');
    const relative = repoRelative(filePath);
    assert(!/\bLAFEA\b|\bLFEA\b/u.test(source),
      `Neutral shared primitive ${relative} must not contain product identifiers.`);
    for (const specifier of importSpecifiers(source)) {
      assert(specifier.startsWith('./'),
        `Neutral shared primitive ${relative} may import sibling neutral modules only.`);
    }
  }
}

function assertStandaloneHtml() {
  const source = fs.readFileSync(HTML, 'utf8');
  assert(source.includes('/src/lafea-app/main.js'),
    'lafea.html must load /src/lafea-app/main.js.');
  assert(!source.includes('/src/main.js'),
    'lafea.html must not load the combined application entry.');
  assert(!source.includes('/src/lfea/'),
    'lafea.html must not load the LFEA application entry.');
}

function assertStandaloneConfig() {
  const source = fs.readFileSync(CONFIG, 'utf8');
  assert(source.includes("outDir: 'dist-lafea'"),
    'Standalone LAFEA build must use isolated dist-lafea output.');
  assert(source.includes("new URL('./lafea.html'"),
    'Standalone LAFEA build must use lafea.html as its input.');
  assert(!source.includes("from './vite.config.js'"),
    'Standalone LAFEA build config must not import the combined Vite config.');
  for (const forbidden of ['./index.html', './analyze.html', './lfea.html']) {
    assert(!source.includes(`new URL('${forbidden}'`),
      `Standalone LAFEA build must not include ${forbidden}.`);
  }
}

function* importSpecifiers(source) {
  IMPORT_RE.lastIndex = 0;
  let match;
  while ((match = IMPORT_RE.exec(source)) !== null) yield match[1] ?? match[2];
}

function* urlSpecifiers(source) {
  URL_RE.lastIndex = 0;
  let match;
  while ((match = URL_RE.exec(source)) !== null) yield match[1];
}

function resolveLocalModule(importer, specifier) {
  const candidate = path.resolve(path.dirname(importer), stripQuery(specifier));
  assertAllowedPath(repoRelative(candidate), [repoRelative(importer)]);
  const extension = path.extname(candidate);
  if (extension) {
    if (!SCRIPT_EXTENSIONS.has(extension)) return null;
    assert(fs.existsSync(candidate),
      `Missing local module ${repoRelative(candidate)} imported by ${repoRelative(importer)}.`);
    return candidate;
  }
  for (const suffix of ['.js', '.mjs', '.cjs']) {
    if (fs.existsSync(`${candidate}${suffix}`)) return `${candidate}${suffix}`;
  }
  for (const fileName of ['index.js', 'index.mjs', 'index.cjs']) {
    const indexFile = path.join(candidate, fileName);
    if (fs.existsSync(indexFile)) return indexFile;
  }
  throw new Error(`Unable to resolve ${specifier} from ${repoRelative(importer)}.`);
}

function listScripts(directory) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...listScripts(filePath));
    else if (SCRIPT_EXTENSIONS.has(path.extname(entry.name))) result.push(filePath);
  }
  return result;
}

function stripQuery(specifier) {
  const index = specifier.search(/[?#]/u);
  return index === -1 ? specifier : specifier.slice(0, index);
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new TypeError(`${name} requires a repository-relative path.`);
  return value;
}

function repoRelative(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function fail(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  throw error;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
