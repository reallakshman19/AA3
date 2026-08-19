import { EMP1_COMPONENTS } from './emp1-identity.js';

export const EMP1_CHANGE_CLASSES = Object.freeze({
  SOURCE_IDENTITY: 'SOURCE_IDENTITY',
  GEOMETRY: 'GEOMETRY',
  LOAD_REFERENCE: 'LOAD_REFERENCE',
  LOADS: 'LOADS',
  SECTION: 'SECTION',
  LOAD_COMBINATION: 'LOAD_COMBINATION',
  LOCAL_METHOD: 'LOCAL_METHOD',
});

const ALL_DOWNSTREAM = Object.freeze([
  EMP1_COMPONENTS.LOAD_TRANSFER,
  EMP1_COMPONENTS.SECTION_SCREENING,
  EMP1_COMPONENTS.LOCAL_CORRELATION,
  EMP1_COMPONENTS.ASSESSMENT,
  'EMP.1.BENCHMARK',
]);

const INVALIDATION = Object.freeze({
  SOURCE_IDENTITY: ALL_DOWNSTREAM,
  GEOMETRY: ALL_DOWNSTREAM,
  LOAD_REFERENCE: ALL_DOWNSTREAM,
  LOADS: ALL_DOWNSTREAM,
  SECTION: Object.freeze([
    EMP1_COMPONENTS.SECTION_SCREENING,
    EMP1_COMPONENTS.LOCAL_CORRELATION,
    EMP1_COMPONENTS.ASSESSMENT,
    'EMP.1.BENCHMARK',
  ]),
  LOAD_COMBINATION: Object.freeze([
    EMP1_COMPONENTS.SECTION_SCREENING,
    EMP1_COMPONENTS.LOCAL_CORRELATION,
    EMP1_COMPONENTS.ASSESSMENT,
    'EMP.1.BENCHMARK',
  ]),
  LOCAL_METHOD: Object.freeze([
    EMP1_COMPONENTS.LOCAL_CORRELATION,
    EMP1_COMPONENTS.ASSESSMENT,
    'EMP.1.BENCHMARK',
  ]),
});

export function emp1InvalidationSet(changeClasses) {
  if (!Array.isArray(changeClasses)) {
    throw new TypeError('EMP1_CHANGE_CLASSES_ARRAY_REQUIRED');
  }
  const affected = new Set();
  changeClasses.forEach((changeClass) => {
    if (!Object.hasOwn(INVALIDATION, changeClass)) {
      throw new TypeError(`EMP1_CHANGE_CLASS_UNSUPPORTED:${changeClass}`);
    }
    INVALIDATION[changeClass].forEach((component) => affected.add(component));
  });
  return Object.freeze([...affected]);
}

export function emp1ComponentIsInvalidated(componentId, changeClasses) {
  return emp1InvalidationSet(changeClasses).includes(componentId);
}
