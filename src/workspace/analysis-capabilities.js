import { AnalysisCapabilityRegistry } from './analysis-capability-registry.js';
import {
  empiricalV3AnalysisCapability,
} from './engineering-loads/adapters/empirical-v3-analysis-capability.js';
import { supportLoadCapability } from './support-load-capability.js';

export function createDefaultAnalysisCapabilityRegistry() {
  return new AnalysisCapabilityRegistry()
    .register(supportLoadCapability)
    .register(empiricalV3AnalysisCapability);
}
