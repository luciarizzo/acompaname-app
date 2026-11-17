import type { FlowKind } from '../types';

/**
 * Solo necesitamos confirmar al abandonar una gestión si hay un borrador recuperable.
 * Las sugerencias de «Otra cosa» tienen su propia persistencia, no usan flowDraft.
 */
export function shouldConfirmLeavingFlow(flow: FlowKind | null, hasSavedDraft: boolean): boolean {
  return flow !== null && flow !== 'other' && hasSavedDraft;
}
