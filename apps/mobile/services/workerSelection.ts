export type WorkerSelectionUiState = {
  workerId: string | null;
  error: string;
};

type StateListener = (state: WorkerSelectionUiState) => void;
type ErrorMessage = (reason: unknown) => string;

export function createWorkerSelectionGate() {
  let pending = false;

  return {
    async run<T>(
      workerId: string,
      operation: () => Promise<T>,
      onStateChange: StateListener,
      getErrorMessage: ErrorMessage,
    ): Promise<T | null> {
      if (pending) return null;

      pending = true;
      let error = '';
      onStateChange({ workerId, error });
      try {
        return await operation();
      } catch (reason) {
        error = `Unable to accept this worker. ${getErrorMessage(reason)}`;
        return null;
      } finally {
        pending = false;
        onStateChange({ workerId: null, error });
      }
    },
  };
}
