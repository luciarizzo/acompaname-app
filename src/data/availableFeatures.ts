import type { FlowKind } from '../types';

// Recorridos que la aplicación ofrece actualmente; no es un buscador general de Internet.
export const availableFeatures: Array<{ kind: Exclude<FlowKind, 'other'>; title: string; description: string }> = [
  { kind: 'event', title: 'Buscar una salida', description: 'Música, teatro o deportes' },
  { kind: 'cinema', title: 'Ir al cine', description: 'Elegir película, función y butacas' },
  { kind: 'appointment', title: 'Sacar un turno médico', description: 'Elegí día y horario' },
  { kind: 'trip', title: 'Pedir un viaje', description: 'Elegir adónde ir y desde dónde' },
];
