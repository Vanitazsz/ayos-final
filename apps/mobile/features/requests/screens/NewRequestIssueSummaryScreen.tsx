import { useNewRequestIssueSummaryScreenController } from '../hooks/useNewRequestIssueSummaryScreenController';
import { IssueSummaryView } from './NewRequestIssueSummaryScreen.view';

export default function IssueSummaryScreen() {
  const model = useNewRequestIssueSummaryScreenController();
  return <IssueSummaryView model={model} />;
}
