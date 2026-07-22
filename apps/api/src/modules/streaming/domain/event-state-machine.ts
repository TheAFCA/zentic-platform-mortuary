import { EventStatus } from '@prisma/client';

export type StateTransition = {
  from: EventStatus;
  to: EventStatus;
  trigger: string;
};

export const ALLOWED_TRANSITIONS: StateTransition[] = [
  { from: 'SCHEDULED', to: 'PROVISIONING', trigger: 'provision_start' },
  { from: 'PROVISIONING', to: 'SCHEDULED', trigger: 'provision_success' },
  {
    from: 'PROVISIONING',
    to: 'PROVISION_FAILED',
    trigger: 'provision_failure',
  },
  { from: 'SCHEDULED', to: 'LIVE', trigger: 'start_stream' },
  { from: 'LIVE', to: 'PAUSED', trigger: 'pause_stream' },
  { from: 'PAUSED', to: 'LIVE', trigger: 'resume_stream' },
  { from: 'LIVE', to: 'FINISHED', trigger: 'stop_stream' },
  { from: 'PAUSED', to: 'FINISHED', trigger: 'stop_stream' },
  { from: 'LIVE', to: 'INTERRUPTED', trigger: 'signal_lost' },
  { from: 'PAUSED', to: 'INTERRUPTED', trigger: 'signal_lost' },
  { from: 'INTERRUPTED', to: 'LIVE', trigger: 'signal_recovered' },
  { from: 'INTERRUPTED', to: 'PAUSED', trigger: 'signal_recovered' },
  { from: 'SCHEDULED', to: 'CANCELLED', trigger: 'cancel_event' },
  { from: 'PROVISION_FAILED', to: 'SCHEDULED', trigger: 'retry_provision' },
  { from: 'SCHEDULED', to: 'FINISHED', trigger: 'auto_finish' },
  { from: 'INTERRUPTED', to: 'FINISHED', trigger: 'auto_finish' },
];

export const isValidTransition = (
  from: EventStatus,
  to: EventStatus,
  trigger: string,
): boolean => {
  return ALLOWED_TRANSITIONS.some(
    (t) => t.from === from && t.to === to && t.trigger === trigger,
  );
};

export const getValidTransitions = (from: EventStatus): StateTransition[] => {
  return ALLOWED_TRANSITIONS.filter((t) => t.from === from);
};

export const isTerminalState = (status: EventStatus): boolean => {
  return ['FINISHED', 'CANCELLED'].includes(status);
};

export const isActiveState = (status: EventStatus): boolean => {
  return ['LIVE', 'PAUSED', 'INTERRUPTED'].includes(status);
};

export const canTransitionTo = (
  from: EventStatus,
  to: EventStatus,
): boolean => {
  return ALLOWED_TRANSITIONS.some((t) => t.from === from && t.to === to);
};

export const isProvisioningState = (status: EventStatus): boolean => {
  return ['PROVISIONING', 'PROVISION_FAILED'].includes(status);
};

export const canBeInterrupted = (status: EventStatus): boolean => {
  return ['LIVE', 'PAUSED'].includes(status);
};
