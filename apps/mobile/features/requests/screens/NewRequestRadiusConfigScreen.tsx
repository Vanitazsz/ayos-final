import { useNewRequestRadiusConfigScreenController } from '../hooks/useNewRequestRadiusConfigScreenController';
import { RadiusConfigView } from './NewRequestRadiusConfigScreen.view';

export default function RadiusConfigScreen() {
  const model = useNewRequestRadiusConfigScreenController();
  return <RadiusConfigView model={model} />;
}
