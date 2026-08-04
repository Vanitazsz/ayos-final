import React from 'react';
import type { RequestDraft } from '@/store/useRequestStore';
import { JobSummaryCompact } from '@/components/JobSummaryCompact';
import { JobSummaryExpanded } from '@/components/JobSummaryExpanded';

interface JobSummaryProps {
  request: RequestDraft;
  showEditButtons?: boolean;
  compact?: boolean;
}

export const JobSummary = React.memo(function JobSummary({
  request,
  showEditButtons = false,
  compact = false,
}: JobSummaryProps) {
  if (compact) return <JobSummaryCompact request={request} />;
  return <JobSummaryExpanded request={request} showEditButtons={showEditButtons} />;
});
