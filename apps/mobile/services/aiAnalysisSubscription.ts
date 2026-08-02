import { supabase } from '@/lib/supabase';

interface AiAnalysisRow {
  status?: string;
  result?: Record<string, unknown> | null;
  error_message?: string | null;
}

export function subscribeToAiAnalysisJob(
  jobId: string,
  callbacks: {
    onSucceeded: (result: Record<string, unknown> | null) => void;
    onFailed: (message: string) => void;
  },
): () => void {
  const channel = supabase
    .channel(`ai-job-${jobId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'ai_analysis_jobs',
        filter: `id=eq.${jobId}`,
      },
      (payload) => {
        const row = payload.new as AiAnalysisRow;
        if (row.status === 'SUCCEEDED') {
          callbacks.onSucceeded(row.result ?? null);
          void supabase.removeChannel(channel);
        } else if (row.status === 'FAILED') {
          callbacks.onFailed(row.error_message ?? 'AI processing failed.');
          void supabase.removeChannel(channel);
        }
      },
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
