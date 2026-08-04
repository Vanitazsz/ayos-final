import { loadAnalytics, loadWorkerEarnings, subscribe } from '../logic/AnalyticsPageLogic';
import { useEffect, useState } from 'react';
import { money } from '../../../services/adminShared';

export function useAnalyticsPageController() {
  const [kpis, setKpis] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [mau, setMau] = useState(null);
  const [avgWorkerEarnings, setAvgWorkerEarnings] = useState(null);
  useEffect(() => {
    const refresh = async () => {
      const [value, earnings] = await Promise.all([loadAnalytics(), loadWorkerEarnings()]);
      const revenue = value.payments.reduce((sum, row) => sum + Number(row.service_amount), 0);
      setTotalRevenue(revenue);
      const months = new Map();
      value.payments.forEach((row) => {
        const month = new Date(row.successful_at).toLocaleString('en', { month: 'short' });
        months.set(month, (months.get(month) ?? 0) + Number(row.service_amount) / 1000);
      });
      setMonthlyRevenue([...months].map(([month, amount]) => ({ month, value: amount })));
      const categories = new Map();
      value.requests.forEach((row) => {
        const name = row.service_categories?.name ?? 'Uncategorized';
        categories.set(name, (categories.get(name) ?? 0) + 1);
      });
      const max = Math.max(...categories.values(), 1);
      setTopServices(
        [...categories]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, percentage: Math.round((count / max) * 100) })),
      );
      const completed = value.bookings.filter((row) => row.status === 'COMPLETED');
      const customers = new Set(completed.map((row) => row.user_account_id));
      const repeat = new Set(
        completed
          .map((row) => row.user_account_id)
          .filter((id, index, array) => array.indexOf(id) !== index),
      );
      setKpis([
        {
          label: 'Completed Booking Rate',
          value: value.bookings.length
            ? `${Math.round((completed.length / value.bookings.length) * 100)}%`
            : '0%',
          trend: 'Live',
          positive: true,
        },
        {
          label: 'Customer LTV',
          value: money(value.accounts.length ? Math.round(revenue / value.accounts.length) : 0),
          trend: 'Live',
          positive: true,
        },
        {
          label: 'Avg Booking Value',
          value: money(
            completed.length
              ? Math.round(
                  completed.reduce((sum, row) => sum + Number(row.agreed_service_amount ?? 0), 0) /
                    completed.length,
                )
              : 0,
          ),
          trend: 'Live',
          positive: true,
        },
        {
          label: 'Repeat Customers',
          value: customers.size ? `${Math.round((repeat.size / customers.size) * 100)}%` : '0%',
          trend: 'Live',
          positive: true,
        },
      ]);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
      setMau(value.accounts.filter((a) => new Date(a.created_at) >= thirtyDaysAgo).length);
      setAvgWorkerEarnings(
        earnings.workerCount > 0
          ? Math.round(earnings.totalEarnings / earnings.workerCount / 12)
          : 0,
      );
    };
    void refresh();
    return subscribe('payments', refresh);
  }, []);
  return { kpis, monthlyRevenue, topServices, totalRevenue, mau, avgWorkerEarnings };
}
