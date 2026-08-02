import { useDashboardPageController } from '../hooks/useDashboardPageController';
import { DashboardView } from './DashboardPage.view';

const Dashboard = () => <DashboardView model={useDashboardPageController()} />;
export default Dashboard;
