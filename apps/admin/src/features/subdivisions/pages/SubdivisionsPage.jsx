import { useSubdivisionsPageController } from '../hooks/useSubdivisionsPageController';
import { SubdivisionsView } from './SubdivisionsPage.view';

const Subdivisions = () => <SubdivisionsView model={useSubdivisionsPageController()} />;
export default Subdivisions;
