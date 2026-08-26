import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { deepFreeze } from '../../core/shared-piping-model/immutable.js';
import {
  requireAuthorizedEmpiricalRuntimePackage,
} from '../engineering-loads/authorized-empirical-runtime-package.js';
import { NonFeaMethodExecutionCoordinator } from '../non-fea-method-execution-coordinator.js';
import {
  requireAuthorizedStagedJsonSidecar,
} from './authorized-staged-json-sidecar.js';

export const AUTHORIZED_EMPIRICAL_CONSUMER_REQUEST_SCHEMA =
  'authorized-empirical-consumer-request/v2';
export const AUTHORIZED_STAGED_JSON_CONSUMER_REQUEST_SCHEMA =
  'authorized-staged-json-consumer-request/v1';
export const AUTHORIZED_STAGED_JSON_CONSUMER_RESULT_SCHEMA =
  'authorized-staged-json-consumer-result/v1';

const AUTHORIZED_EMPIRICAL_METHOD_ID = 'AUTHORIZED_EMPIRICAL_SUPPORT_LOADS_V1';
const EMPIRICAL_KEYS = Object.freeze(['schema', 'runtimePackage']);
const STAGED_JSON_KEYS = Object.freeze([
  'schema', 'operationId', 'sidecar', 'source', 'mapping', 'formatting',
  'outputFileName', 'writeId', 'writtenAt', 'downloadId', 'triggeredAt',
]);
const RESULT_KEYS = Object.freeze([
  'schema', 'operationId', 'projectId', 'sidecarSemanticHash',
  'writeArtifactSemanticHash', 'writeReceiptSemanticHash',
  'downloadArtifactSemanticHash', 'downloadReceiptSemanticHash',
  'fileName', 'sha256', 'byteLength', 'status', 'semanticHash',
]);

export function authorizedStagedJsonConsumerResultSemanticProjection(value) {
  return Object.fromEntries(RESULT_KEYS
    .filter((key) => key !== 'semanticHash')
    .map((key) => [key, value[key]]));
}

export function computeAuthorizedStagedJsonConsumerResultSemanticHash(value) {
  return semanticHash(authorizedStagedJsonConsumerResultSemanticProjection(value));
}

export class AuthorizedEnrichmentConsumerController {
  constructor({
    engineeringModelStore,
    masterDataController,
    commonInputStore = null,
    governedEmpiricalController = null,
    governedProjectionProvider = null,
  }) {
    if (!engineeringModelStore
        || typeof engineeringModelStore.configureAuthorizedEmpiricalPackage !== 'function'
        || typeof engineeringModelStore.executeConfiguredAuthorized !== 'function'
        || typeof engineeringModelStore.refreshAuthorizedEmpiricalPackage !== 'function'
        || typeof engineeringModelStore.markEmpiricalStale !== 'function'
        || typeof engineeringModelStore.getEmpiricalAuthorizationState !== 'function') {
      fail('An authorized engineering-model store is required.',
        'AUTHORIZED_ENRICHMENT_EMPIRICAL_STORE_INVALID');
    }
    if (!masterDataController
        || typeof masterDataController.getMasterData !== 'function') {
      fail('A master-data controller is required.',
        'AUTHORIZED_ENRICHMENT_MASTER_DATA_INVALID');
    }
    if (commonInputStore !== null && (
      typeof commonInputStore.requireReadyMethods !== 'function'
      || typeof commonInputStore.recordConsumptionAuthorization !== 'function'
      || typeof commonInputStore.recordConsumptionExecution !== 'function'
      || typeof commonInputStore.getSnapshot !== 'function'
      || typeof engineeringModelStore.getAuthorizedEmpiricalPackage !== 'function'
    )) {
      fail('Common-input-bound production execution requires a compatible common-input store.',
        'AUTHORIZED_ENRICHMENT_COMMON_INPUT_STORE_INVALID');
    }
    const governedSupplied = governedEmpiricalController !== null
      || governedProjectionProvider !== null;
    if (governedSupplied && !validGovernedDependencies(
      governedEmpiricalController,
      governedProjectionProvider,
    )) {
      fail('Governed V2 production execution requires compatible controller and projection dependencies.',
        'AUTHORIZED_ENRICHMENT_GOVERNED_EMPIRICAL_DEPENDENCY_INVALID');
    }
    this.engineeringModelStore = engineeringModelStore;
    this.masterDataController = masterDataController;
    this.commonInputStore = commonInputStore;
    this.governedEmpiricalController = governedEmpiricalController;
    this.governedProjectionProvider = governedProjectionProvider;
    // Deliberately retain NonFeaMethodExecutionCoordinator's default
    // requireCurrentNonFeaMethods provider. It re-evaluates the live common
    // input before authorization freshness checks, so changes to ephemeral
    // Product defaults, configured defaults, resolution ledgers or effective
    // Project Data cannot leave an old empirical authorization current.
    this.executionCoordinator = commonInputStore
      ? new NonFeaMethodExecutionCoordinator({ commonInputStore })
      : null;
  }

  configureEmpirical(input) {
    exact(input, EMPIRICAL_KEYS, 'authorizedEmpiricalConsumerRequest');
    if (input.schema !== AUTHORIZED_EMPIRICAL_CONSUMER_REQUEST_SCHEMA) {
      fail('Unsupported authorized empirical consumer request.',
        'AUTHORIZED_ENRICHMENT_SCHEMA_INVALID');
    }
    const runtimePackage = requireAuthorizedEmpiricalRuntimePackage(input.runtimePackage);
    const masterData = this.masterDataController.getMasterData();
    const governedProjection = this.#governedEnabled()
      ? this.governedProjectionProvider.createFromLegacy(runtimePackage, masterData)
      : null;
    const methodRequestSemanticHash = governedProjection?.semanticHash
      || runtimePackage.authorizedInput.semanticHash;
    const prepared = this.executionCoordinator?.prepareAuthorization({
      authorizationId: runtimePackage.packageId,
      authorizedAt: runtimePackage.configuredAt,
      implementationId: AUTHORIZED_EMPIRICAL_METHOD_ID,
      scenarioId: runtimePackage.packageId,
      methodRequestSemanticHash,
    }) || null;
    const configured = governedProjection
      ? this.governedEmpiricalController.configureGoverned(governedProjection, masterData)
      : this.engineeringModelStore.configureAuthorizedEmpiricalPackage(runtimePackage, masterData);
    if (prepared) this.executionCoordinator.recordAuthorization(prepared.receipt);
    return configured;
  }

  executeEmpirical(input = undefined) {
    if (input !== undefined) this.configureEmpirical(input);
    const masterData = this.masterDataController.getMasterData();
    const active = this.#activeAuthorization(masterData, true);
    if (this.#governedEnabled() && !active.governedProjection) {
      fail(
        'Governed V2 production execution requires an explicit current governed authorization.',
        'AUTHORIZED_ENRICHMENT_GOVERNED_AUTHORIZATION_REQUIRED',
      );
    }
    if (this.executionCoordinator) {
      if (!active.runtimePackage) {
        fail('An authorized empirical runtime package is required.',
          'AUTHORIZED_ENRICHMENT_RUNTIME_PACKAGE_REQUIRED');
      }
      this.executionCoordinator.requireCurrentAuthorization({
        authorizationId: active.runtimePackage.packageId,
        implementationId: AUTHORIZED_EMPIRICAL_METHOD_ID,
      });
    }
    const execution = this.#governedEnabled()
      ? this.governedEmpiricalController.executeGoverned(
        active.governedProjection,
        masterData,
      )
      : this.engineeringModelStore.executeConfiguredAuthorized(masterData);
    if (this.executionCoordinator) {
      this.executionCoordinator.recordExecution({
        executionId: execution.executionId || active.runtimePackage.executionId,
        executedAt: execution.executedAt || active.runtimePackage.executedAt,
        authorizationId: active.runtimePackage.packageId,
        implementationId: AUTHORIZED_EMPIRICAL_METHOD_ID,
        engineExecutionSemanticHash: execution.semanticHash,
        resultSemanticHash: execution.distribution?.semanticHash || null,
        status: execution.distribution?.status || execution.status || 'UNKNOWN',
      });
    }
    return execution;
  }

  refreshEmpirical() {
    const masterData = this.masterDataController.getMasterData();
    if (this.commonInputStore) {
      const commonState = this.commonInputStore.getSnapshot();
      if (!commonState.commonInput || commonState.staleness?.stale !== false) {
        return this.#markActiveStale('COMMON_INPUT_STALE');
      }
      const runtimePackage = this.#configuredRuntimePackage();
      if (runtimePackage) {
        try {
          this.executionCoordinator.requireCurrentAuthorization({
            authorizationId: runtimePackage.packageId,
            implementationId: AUTHORIZED_EMPIRICAL_METHOD_ID,
          });
        } catch {
          return this.#markActiveStale('COMMON_INPUT_AUTHORIZATION_STALE');
        }
      }
    }
    if (this.#governedEnabled()) {
      const configuredProjection = this.governedEmpiricalController.getGovernedProjection();
      if (!configuredProjection) {
        return this.governedEmpiricalController.refreshGoverned(null, masterData);
      }
      try {
        const currentProjection = this.governedProjectionProvider.rebuild(
          configuredProjection,
          masterData,
        );
        return this.governedEmpiricalController.refreshGoverned(
          currentProjection,
          masterData,
        );
      } catch (error) {
        return this.governedEmpiricalController.markStale(
          error?.code || 'GOVERNED_PROJECTION_REBUILD_FAILED',
        );
      }
    }
    return this.engineeringModelStore.refreshAuthorizedEmpiricalPackage(masterData);
  }

  markEmpiricalStale(reason, datasetVersion = null) {
    return this.#markActiveStale(reason, datasetVersion);
  }

  getEmpiricalAuthorizationState() {
    return this.#governedEnabled()
      ? this.governedEmpiricalController.getState()
      : this.engineeringModelStore.getEmpiricalAuthorizationState();
  }

  async downloadStagedJson(input, documentRef, runtime) {
    exact(input, STAGED_JSON_KEYS, 'authorizedStagedJsonConsumerRequest');
    if (input.schema !== AUTHORIZED_STAGED_JSON_CONSUMER_REQUEST_SCHEMA) {
      fail('Unsupported authorized stagedJson consumer request.',
        'AUTHORIZED_ENRICHMENT_SCHEMA_INVALID');
    }
    const [writer, downloader] = await Promise.all([
      import('./authorized-staged-json-writer.js'),
      import('./authorized-staged-json-download.js'),
    ]);
    const operationId = identity(input.operationId, 'operationId');
    const sidecar = requireAuthorizedStagedJsonSidecar(input.sidecar);
    const writeArtifact = await writer.writeAuthorizedStagedJson({
      schema: writer.AUTHORIZED_STAGED_JSON_WRITE_REQUEST_SCHEMA,
      writeId: identity(input.writeId, 'writeId'),
      writtenAt: timestamp(input.writtenAt, 'writtenAt'),
      source: input.source,
      sidecar,
      mapping: input.mapping,
      formatting: input.formatting,
      outputFileName: input.outputFileName,
    });
    const downloadArtifact = await downloader.createAuthorizedStagedJsonDownloadArtifact(writeArtifact);
    const downloadReceipt = await downloader.triggerAuthorizedStagedJsonDownload({
      schema: downloader.AUTHORIZED_STAGED_JSON_DOWNLOAD_REQUEST_SCHEMA,
      downloadId: identity(input.downloadId, 'downloadId'),
      triggeredAt: timestamp(input.triggeredAt, 'triggeredAt'),
      artifact: downloadArtifact,
    }, documentRef, runtime);

    const draft = {
      schema: AUTHORIZED_STAGED_JSON_CONSUMER_RESULT_SCHEMA,
      operationId,
      projectId: sidecar.projectId,
      sidecarSemanticHash: sidecar.semanticHash,
      writeArtifactSemanticHash: writeArtifact.semanticHash,
      writeReceiptSemanticHash: writeArtifact.receipt.semanticHash,
      downloadArtifactSemanticHash: downloadArtifact.semanticHash,
      downloadReceiptSemanticHash: downloadReceipt.semanticHash,
      fileName: downloadReceipt.fileName,
      sha256: downloadReceipt.sha256,
      byteLength: downloadReceipt.byteLength,
      status: downloadReceipt.status,
      semanticHash: 'fnv1a64:0000000000000000',
    };
    return requireAuthorizedStagedJsonConsumerResult({
      ...draft,
      semanticHash: computeAuthorizedStagedJsonConsumerResultSemanticHash(draft),
    });
  }

  #governedEnabled() {
    return Boolean(this.governedEmpiricalController && this.governedProjectionProvider);
  }

  #configuredRuntimePackage() {
    if (this.#governedEnabled()) {
      return this.governedEmpiricalController.getGovernedProjection()?.runtimePackage || null;
    }
    return this.engineeringModelStore.getAuthorizedEmpiricalPackage?.() || null;
  }

  #activeAuthorization(masterData, rebuildGoverned) {
    if (this.#governedEnabled()) {
      const configuredProjection = this.governedEmpiricalController.getGovernedProjection();
      if (!configuredProjection) {
        return { governedProjection: null, runtimePackage: null };
      }
      const governedProjection = rebuildGoverned
        ? this.governedProjectionProvider.rebuild(configuredProjection, masterData)
        : configuredProjection;
      return {
        governedProjection,
        runtimePackage: configuredProjection.runtimePackage,
      };
    }
    return {
      governedProjection: null,
      runtimePackage: this.engineeringModelStore.getAuthorizedEmpiricalPackage?.() || null,
    };
  }

  #markActiveStale(reason, datasetVersion = null) {
    return this.#governedEnabled()
      ? this.governedEmpiricalController.markStale(reason, datasetVersion)
      : this.engineeringModelStore.markEmpiricalStale(reason, datasetVersion);
  }
}

export function requireAuthorizedStagedJsonConsumerResult(value) {
  exact(value, RESULT_KEYS, 'authorizedStagedJsonConsumerResult');
  if (value.schema !== AUTHORIZED_STAGED_JSON_CONSUMER_RESULT_SCHEMA) {
    fail('Unsupported authorized stagedJson consumer result.',
      'AUTHORIZED_ENRICHMENT_SCHEMA_INVALID');
  }
  const result = {
    schema: value.schema,
    operationId: identity(value.operationId, 'result.operationId'),
    projectId: identity(value.projectId, 'result.projectId'),
    sidecarSemanticHash: hash(value.sidecarSemanticHash, 'result.sidecarSemanticHash'),
    writeArtifactSemanticHash: hash(value.writeArtifactSemanticHash, 'result.writeArtifactSemanticHash'),
    writeReceiptSemanticHash: hash(value.writeReceiptSemanticHash, 'result.writeReceiptSemanticHash'),
    downloadArtifactSemanticHash: hash(value.downloadArtifactSemanticHash, 'result.downloadArtifactSemanticHash'),
    downloadReceiptSemanticHash: hash(value.downloadReceiptSemanticHash, 'result.downloadReceiptSemanticHash'),
    fileName: fileName(value.fileName, 'result.fileName'),
    sha256: sha256(value.sha256, 'result.sha256'),
    byteLength: nonnegativeInteger(value.byteLength, 'result.byteLength'),
    status: value.status,
    semanticHash: hash(value.semanticHash, 'result.semanticHash'),
  };
  if (result.status !== 'TRIGGERED') {
    fail('StagedJson consumer result status is invalid.',
      'AUTHORIZED_ENRICHMENT_STATUS_INVALID');
  }
  if (result.semanticHash !== computeAuthorizedStagedJsonConsumerResultSemanticHash(result)) {
    fail('StagedJson consumer result hash is stale.',
      'AUTHORIZED_ENRICHMENT_HASH_MISMATCH');
  }
  return deepFreeze(result);
}

function validGovernedDependencies(controller, provider) {
  return Boolean(
    controller
    && typeof controller.configureGoverned === 'function'
    && typeof controller.refreshGoverned === 'function'
    && typeof controller.executeGoverned === 'function'
    && typeof controller.getGovernedProjection === 'function'
    && typeof controller.getState === 'function'
    && typeof controller.markStale === 'function'
    && provider
    && typeof provider.createFromLegacy === 'function'
    && typeof provider.rebuild === 'function'
  );
}

function exact(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object.`, 'AUTHORIZED_ENRICHMENT_TYPE_INVALID');
  }
  const actual = Object.keys(value).sort(ascii);
  const expected = [...keys].sort(ascii);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label} has unexpected keys.`, 'AUTHORIZED_ENRICHMENT_KEYS_INVALID',
      { actual, expected });
  }
}
function identity(value, label) {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0) {
    fail(`${label} must be a non-empty trimmed string.`,
      'AUTHORIZED_ENRICHMENT_IDENTITY_INVALID');
  }
  return value;
}
function timestamp(value, label) {
  const result = identity(value, label);
  if (new Date(result).toISOString() !== result) {
    fail(`${label} must be a canonical ISO-8601 timestamp.`,
      'AUTHORIZED_ENRICHMENT_TIMESTAMP_INVALID');
  }
  return result;
}
function fileName(value, label) {
  const result = identity(value, label);
  if (/[\\/]/u.test(result) || result === '.' || result === '..') {
    fail(`${label} must be a file name, not a path.`,
      'AUTHORIZED_ENRICHMENT_FILE_NAME_INVALID');
  }
  return result;
}
function hash(value, label) {
  const result = identity(value, label);
  if (!/^fnv1a64:[0-9a-f]{16}$/u.test(result)) {
    fail(`${label} must be a semantic hash.`, 'AUTHORIZED_ENRICHMENT_HASH_INVALID');
  }
  return result;
}
function sha256(value, label) {
  const result = identity(value, label).toLowerCase();
  if (!/^[0-9a-f]{64}$/u.test(result)) {
    fail(`${label} must be a SHA-256 hex digest.`, 'AUTHORIZED_ENRICHMENT_HASH_INVALID');
  }
  return result;
}
function nonnegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    fail(`${label} must be a non-negative integer.`,
      'AUTHORIZED_ENRICHMENT_NUMBER_INVALID');
  }
  return value;
}
function ascii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
function fail(message, code, details = null) {
  const error = new Error(message);
  error.code = code;
  error.details = details === null ? null : deepFreeze(details);
  throw error;
}
