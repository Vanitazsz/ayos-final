import { useSupportPageController } from '../hooks/useSupportPageController';
import { SupportView } from './SupportPage.view';

const Support = () => <SupportView model={useSupportPageController()} />;
export default Support;
