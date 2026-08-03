import { useOnboardingScreenController } from '../hooks/useOnboardingScreenController';
import { OnboardingView } from './OnboardingScreen.view';

export default function OnboardingScreen() {
  const model = useOnboardingScreenController();
  return <OnboardingView model={model} />;
}
