import React, { useEffect, useState } from 'react';
import { Crown, Plus } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import {
  activateSubscription,
  cancelSubscription,
  extendSubscription,
  loadSubscriptions,
  saveSubscriptionPlan,
  subscribe,
} from '../../services/adminData';

const blankPlan = { id: '', name: '', price: 0, duration_days: 30, is_active: true };

export default function Subscriptions() {
  const [data, setData] = useState({ plans: [], subscriptions: [], workers: [] });
  const [plan, setPlan] = useState(null);
  const [activation, setActivation] = useState(null);
  const refresh = async () => setData(await loadSubscriptions());
  useEffect(() => {
    void refresh();
    const stops = [
      subscribe('worker_recommendation_plans', refresh),
      subscribe('worker_recommendation_subscriptions', refresh),
    ];
    return () => stops.forEach((stop) => stop());
  }, []);
  const savePlan = async () => {
    if (!plan?.name.trim() || Number(plan.duration_days) < 1) return;
    try {
      await saveSubscriptionPlan(plan);
      setPlan(null);
      await refresh();
    } catch (error) {
      alert(error.message);
    }
  };
  const activate = async () => {
    if (!activation?.workerId || !activation?.planId) return;
    if (!window.confirm('Activate this worker recommendation subscription?')) return;
    try {
      await activateSubscription(activation.workerId, activation.planId);
      setActivation(null);
      await refresh();
    } catch (error) {
      alert(error.message);
    }
  };
  const extend = async (row) => {
    const days = Number(window.prompt('Number of days to extend', '30'));
    if (!Number.isInteger(days) || days < 1) return;
    if (!window.confirm(`Extend this subscription by ${days} days?`)) return;
    try {
      await extendSubscription(row.id, days);
      await refresh();
    } catch (error) {
      alert(error.message);
    }
  };
  const cancel = async (row) => {
    if (!window.confirm('Cancel this subscription now?')) return;
    try {
      await cancelSubscription(row.id);
      await refresh();
    } catch (error) {
      alert(error.message);
    }
  };
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recommendation Subscriptions</h1>
          <p className="text-gray-500">
            Manage priority recommendation plans and worker subscriptions.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() =>
              setActivation({
                workerId: '',
                planId: data.plans.find((item) => item.is_active)?.id ?? '',
              })
            }
            className="rounded-lg border px-4 py-2 font-medium"
          >
            Activate subscription
          </button>
          <button
            onClick={() => setPlan({ ...blankPlan })}
            className="flex items-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white"
          >
            <Plus size={17} className="mr-2" />
            New plan
          </button>
        </div>
      </div>
      <section className="rounded-xl border bg-white">
        <div className="border-b p-4">
          <h2 className="font-semibold">Plans</h2>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-3">
          {data.plans.map((item) => (
            <button
              key={item.id}
              onClick={() => setPlan({ ...item, price: Number(item.amount) / 100 })}
              className="rounded-xl border p-4 text-left hover:border-blue-400"
            >
              <Crown className="mb-2 text-amber-500" />
              <p className="font-semibold">{item.name}</p>
              <p className="text-sm text-gray-500">
                ₱{(Number(item.amount) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}{' '}
                · {item.duration_days} days
              </p>
              <p className="mt-2 text-xs">{item.is_active ? 'Active' : 'Inactive'}</p>
            </button>
          ))}
        </div>
      </section>
      <section className="overflow-x-auto rounded-xl border bg-white">
        <div className="border-b p-4">
          <h2 className="font-semibold">Subscriptions</h2>
        </div>
        <table className="min-w-full divide-y">
          <thead className="bg-gray-50">
            <tr>
              {['Worker', 'Plan', 'Start', 'Expiry', 'Status', 'Actions'].map((label) => (
                <th key={label} className="px-4 py-3 text-left text-xs uppercase text-gray-500">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.subscriptions.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-medium">
                  {row.worker_profiles?.display_name ?? row.worker_id}
                </td>
                <td className="px-4 py-3">{row.plan_name}</td>
                <td className="px-4 py-3">{new Date(row.starts_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">{new Date(row.expires_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 capitalize">{row.status}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button onClick={() => void extend(row)} className="text-blue-600">
                      Extend
                    </button>
                    {row.status === 'active' && (
                      <button onClick={() => void cancel(row)} className="text-red-600">
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <Modal
        isOpen={Boolean(plan)}
        onClose={() => setPlan(null)}
        title={plan?.id ? 'Edit Plan' : 'Create Plan'}
      >
        {plan && (
          <div className="space-y-4">
            <label className="block text-sm">
              Name
              <input
                value={plan.name}
                onChange={(event) =>
                  setPlan((current) => ({ ...current, name: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>
            <label className="block text-sm">
              Price (₱)
              <input
                type="number"
                min="0"
                step="0.01"
                value={plan.price}
                onChange={(event) =>
                  setPlan((current) => ({ ...current, price: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>
            <label className="block text-sm">
              Duration (days)
              <input
                type="number"
                min="1"
                value={plan.duration_days}
                onChange={(event) =>
                  setPlan((current) => ({ ...current, duration_days: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={plan.is_active}
                onChange={(event) =>
                  setPlan((current) => ({ ...current, is_active: event.target.checked }))
                }
              />
              Active
            </label>
            <button
              onClick={() => void savePlan()}
              className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white"
            >
              Save plan
            </button>
          </div>
        )}
      </Modal>
      <Modal
        isOpen={Boolean(activation)}
        onClose={() => setActivation(null)}
        title="Activate Subscription"
      >
        {activation && (
          <div className="space-y-4">
            <select
              value={activation.workerId}
              onChange={(event) =>
                setActivation((current) => ({ ...current, workerId: event.target.value }))
              }
              className="w-full rounded-lg border p-2"
            >
              <option value="">Select worker</option>
              {data.workers.map((worker) => (
                <option key={worker.account_id} value={worker.account_id}>
                  {worker.display_name}
                </option>
              ))}
            </select>
            <select
              value={activation.planId}
              onChange={(event) =>
                setActivation((current) => ({ ...current, planId: event.target.value }))
              }
              className="w-full rounded-lg border p-2"
            >
              <option value="">Select plan</option>
              {data.plans
                .filter((item) => item.is_active)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
            <button
              onClick={() => void activate()}
              className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white"
            >
              Activate
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
