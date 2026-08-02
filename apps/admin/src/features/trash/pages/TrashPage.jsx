import { useTrashPageController } from '../hooks/useTrashPageController';
import { TrashView } from './TrashPage.view';

const Trash = () => <TrashView model={useTrashPageController()} />;
export default Trash;
