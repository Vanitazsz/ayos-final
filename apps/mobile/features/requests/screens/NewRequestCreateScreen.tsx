import { useNewRequestCreateScreenController } from '../hooks/useNewRequestCreateScreenController';
import { CreateRequestView } from './NewRequestCreateScreen.view';

export default function CreateRequestScreen() {
  const model = useNewRequestCreateScreenController();
  return <CreateRequestView model={model} />;
}
