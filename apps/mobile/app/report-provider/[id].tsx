import React from 'react';
import { useReportProviderController } from './_useReportProviderController';
import { ReportProviderView } from './_ReportProviderView';

export default function ReportProviderScreen() {
  const controller = useReportProviderController();
  return <ReportProviderView {...controller} />;
}
