import { useNewRequestMatchingScreenController } from '../hooks/useNewRequestMatchingScreenController';
import { MatchingView } from './NewRequestMatchingScreen.view';

export default function MatchingScreen() {
  const model = useNewRequestMatchingScreenController();
  return <MatchingView model={model} />;
}
