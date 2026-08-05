import React from 'react';
import { useReportProviderController } from './useReportProviderController';
import { ReportProviderView } from './ReportProviderView';

export default function ReportProviderScreen() {
  const controller = useReportProviderController();
  return <ReportProviderView {...controller} />;
}
