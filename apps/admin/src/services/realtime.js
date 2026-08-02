import { supabase } from './adminShared';

export const subscribe = (table, refresh) => {
  const channel = supabase
    .channel(`admin:${table}:${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, refresh)
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
};
