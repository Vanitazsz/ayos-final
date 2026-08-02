import { useServicesPageController } from '../hooks/useServicesPageController';
import { ServicesView } from './ServicesPage.view';

const Services = () => <ServicesView model={useServicesPageController()} />;
export default Services;
