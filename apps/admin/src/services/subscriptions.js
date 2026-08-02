import { supabase } from './adminShared';

export async function loadSubscriptions() {
  const [
    { data: plans, error: planError },
    { data: subscriptions, error: subscriptionError },
    { data: workers, error: workerError },
  ] = await Promise.all([
    supabase.from('worker_recommendation_plans').select('*').order('created_at'),
    supabase
      .from('worker_recommendation_subscriptions')
      .select('*,worker_profiles:worker_id(display_name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('worker_profiles')
      .select('account_id,display_name')
      .eq('approval_status', 'APPROVED')
      .order('display_name'),
  ]);
  if (planError) throw planError;
  if (subscriptionError) throw subscriptionError;
  if (workerError) throw workerError;
  return { plans: plans ?? [], subscriptions: subscriptions ?? [], workers: workers ?? [] };
}

export async function saveSubscriptionPlan(input) {
  const { data, error } = await supabase.rpc('admin_upsert_subscription_plan', {
    p_id: input.id || null,
    p_name: input.name,
    p_amount: Math.round(Number(input.price) * 100),
    p_duration_days: Number(input.duration_days),
    p_is_active: Boolean(input.is_active),
  });
  if (error) throw error;
  return data;
}

export async function activateSubscription(workerId, planId) {
  const { data, error } = await supabase.rpc('admin_activate_subscription', {
    p_worker_id: workerId,
    p_plan_id: planId,
  });
  if (error) throw error;
  return data;
}

export async function extendSubscription(id, days) {
  const { data, error } = await supabase.rpc('admin_extend_subscription', {
    p_subscription_id: id,
    p_days: Number(days),
  });
  if (error) throw error;
  return data;
}

export async function cancelSubscription(id) {
  const { data, error } = await supabase.rpc('admin_cancel_subscription', {
    p_subscription_id: id,
  });
  if (error) throw error;
  return data;
}
