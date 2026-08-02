import { useAuthOtpScreenController } from '../hooks/useAuthOtpScreenController';
import { OTPView } from './AuthOtpScreen.view';

export default function OTPScreen() {
  const model = useAuthOtpScreenController();
  return <OTPView model={model} />;
}
