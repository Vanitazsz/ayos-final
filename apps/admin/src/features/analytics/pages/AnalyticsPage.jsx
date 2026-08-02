import { useAnalyticsPageController } from '../hooks/useAnalyticsPageController';
import { AnalyticsView } from './AnalyticsPage.view';

const Analytics = () => <AnalyticsView model={useAnalyticsPageController()} />;
export default Analytics;
