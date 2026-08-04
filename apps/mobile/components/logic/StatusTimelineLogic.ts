export interface TimelineStep {
  id: string;
  label: string;
  statuses: string[];
}

export const TIMELINE_STEPS: TimelineStep[] = [
  { id: 'draft', label: 'Request Created', statuses: ['Draft'] },
  {
    id: 'posted',
    label: 'Looking for Workers',
    statuses: ['Searching', 'Posted'],
  },
  {
    id: 'assigned',
    label: 'Worker Assigned',
    statuses: [
      'Accepted',
      'Scheduled',
      'En_Route',
      'Arrived',
      'In_Progress',
    ],
  },
  {
    id: 'completed',
    label: 'Completed',
    statuses: ['Pending_Confirmation', 'Completed'],
  },
];

export function getCurrentStepIndex(
  steps: TimelineStep[],
  status: string,
): number {
  return steps.findIndex((s) => s.statuses.includes(status));
}
