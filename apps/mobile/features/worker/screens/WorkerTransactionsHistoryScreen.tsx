import { useWorkerTransactionsHistoryScreenController } from '../hooks/useWorkerTransactionsHistoryScreenController';
import { TransactionsHistoryView } from './WorkerTransactionsHistoryScreen.view';

export default function TransactionsHistoryScreen() {
  const model = useWorkerTransactionsHistoryScreenController();
  return <TransactionsHistoryView model={model} />;
}
