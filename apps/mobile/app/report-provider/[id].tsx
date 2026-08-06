import React from 'react';
import { useReportProviderController } from '@/features/report-provider/useReportProviderController';
import { ReportProviderView } from '@/features/report-provider/ReportProviderView';

export default function ReportProviderScreen() {
  const controller = useReportProviderController();
  return <ReportProviderView {...controller} />;
}
