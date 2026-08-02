import { useWorkerWalletScreenController } from '../hooks/useWorkerWalletScreenController';
import { WalletView } from './WorkerWalletScreen.view';

export default function WalletScreen() {
  const model = useWorkerWalletScreenController();
  return <WalletView model={model} />;
}
