import { useReportsPageController } from '../hooks/useReportsPageController';
import { ReportsView } from './ReportsPage.view';

const Reports = () => <ReportsView model={useReportsPageController()} />;
export default Reports;
