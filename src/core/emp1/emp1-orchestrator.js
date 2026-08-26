import { EMP1_COMPONENTS } from './emp1-identity.js';
import { emp1InvalidationSet } from './emp1-dependency-graph.js';
import { evaluateEmp1LocalCorrelationGate } from './emp1-local-correlation-gate.js';
import { createEmp1Assessment } from './emp1-assessment.js';

export async function runEmp1(options = {}) {
  const source = options.source;
  const adapters = requireAdapters(options.adapters);
  const previous = options.previous ?? {};
  const invalidated = new Set(emp1InvalidationSet(options.changeClasses ?? ['SOURCE_IDENTITY']));

  const loadTransfer = await resolveLayer({
    componentId: EMP1_COMPONENTS.LOAD_TRANSFER,
    invalidated,
    previous: previous.loadTransfer,
    execute: () => adapters.runLoadTransfer(source),
  });

  const sectionScreening = await resolveLayer({
    componentId: EMP1_COMPONENTS.SECTION_SCREENING,
    invalidated,
    previous: previous.sectionScreening,
    execute: () => adapters.runSectionScreening({ source, loadTransfer }),
  });

  const needsLocal = sectionScreening?.decision === 'ESCALATE' || source?.localMethod?.requested === true;
  const localSource = needsLocal
    ? await prepareLocalSource(adapters, { source, loadTransfer, sectionScreening })
    : source;
  const localGate = evaluateEmp1LocalCorrelationGate({
    methodQualification: options.methodQualification,
    benchmarkQualification: options.benchmarkQualification,
    source: localSource,
  });

  let localCorrelation = localGate;
  if (needsLocal && localGate.state === 'METHOD_QUALIFIED') {
    localCorrelation = await resolveLayer({
      componentId: EMP1_COMPONENTS.LOCAL_CORRELATION,
      invalidated,
      previous: previous.localCorrelation,
      execute: () => adapters.runLocalCorrelation({
        source: localSource,
        originalSource: source,
        loadTransfer,
        sectionScreening,
        gate: localGate,
      }),
    });
  }

  const assessment = createEmp1Assessment({
    sourceHash: options.sourceHash ?? null,
    loadTransfer,
    sectionScreening,
    localCorrelation,
  });

  return Object.freeze({
    productId: 'EMP.1',
    invalidated: Object.freeze([...invalidated]),
    loadTransfer,
    sectionScreening,
    localCorrelation,
    assessment,
  });
}

async function prepareLocalSource(adapters, context) {
  if (typeof adapters.prepareLocalCorrelationSource !== 'function') return context.source;
  const prepared = await adapters.prepareLocalCorrelationSource(context);
  if (!prepared || typeof prepared !== 'object' || Array.isArray(prepared)) {
    throw new TypeError('EMP1_ADAPTER_RESULT_INVALID:EMP.1.C.SOURCE_PREPARATION');
  }
  return prepared;
}

async function resolveLayer({ componentId, invalidated, previous, execute }) {
  if (!invalidated.has(componentId) && previous) return previous;
  const result = await execute();
  if (!result || typeof result !== 'object') {
    throw new TypeError(`EMP1_ADAPTER_RESULT_INVALID:${componentId}`);
  }
  return result;
}

function requireAdapters(value) {
  if (!value || typeof value !== 'object') throw new TypeError('EMP1_ADAPTERS_REQUIRED');
  ['runLoadTransfer', 'runSectionScreening', 'runLocalCorrelation'].forEach((name) => {
    if (typeof value[name] !== 'function') throw new TypeError(`EMP1_ADAPTER_REQUIRED:${name}`);
  });
  if (value.prepareLocalCorrelationSource != null
    && typeof value.prepareLocalCorrelationSource !== 'function') {
    throw new TypeError('EMP1_ADAPTER_INVALID:prepareLocalCorrelationSource');
  }
  return value;
}
