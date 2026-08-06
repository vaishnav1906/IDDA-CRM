export type SLAPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type WorkflowUpdateSlaActionInput = {
  recordId: string;
  objectSingularName: string;
  slaFieldName: string;
  useBusinessCalendar: boolean;
  priority?: SLAPriority;
  customSlaHours?: number;
};
