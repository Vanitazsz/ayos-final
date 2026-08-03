import { useWorkersPageController } from '../hooks/useWorkersPageController';
import { WorkersView } from './WorkersPage.view';

const Workers = () => <WorkersView model={useWorkersPageController()} />;
export default Workers;
