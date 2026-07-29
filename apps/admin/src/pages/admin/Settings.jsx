import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Globe,
  Shield,
  CreditCard,
  Bell,
  Database,
  Save,
  CheckCircle,
  Calendar,
  Bot,
} from 'lucide-react';
import { loadSettings, saveSetting, subscribe } from '../../services/adminData';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states (simplified for demo)
  const [general, setGeneral] = useState({
    siteName: 'A-yos Platform',
    supportEmail: '',
    currency: 'PHP',
    timezone: 'Asia/Manila',
  });
  const [settings, setSettings] = useState({});
  const [commissionRate, setCommissionRate] = useState(10);
  const [homeownerCharge, setHomeownerCharge] = useState(0);
  const [matchingWeights, setMatchingWeights] = useState({
    distance: 0.3,
    availability: 0.2,
    rating: 0.2,
    completedJobs: 0.1,
    responseHistory: 0.1,
    cancellationHistory: 0.05,
    recommendationPriority: 0.05,
  });
  useEffect(() => {
    const refresh = async () => {
      const value = await loadSettings();
      setSettings(value);
      setGeneral((current) => ({
        ...current,
        siteName: value['general.site_name'] ?? current.siteName,
        supportEmail: value['general.support_email'] ?? current.supportEmail,
        currency: value['general.currency'] ?? current.currency,
        timezone: value['general.timezone'] ?? current.timezone,
      }));
      setCommissionRate(Number(value['platform_settings.commission_rate'] ?? 10));
      setHomeownerCharge(Number(value['platform_settings.homeowner_charge'] ?? 0));
      if (value['matching.weights']) {
        const configured = value['matching.weights'];
        setMatchingWeights({
          distance: Number(configured.distance ?? 0.3),
          availability: Number(configured.availability ?? 0.2),
          rating: Number(configured.rating ?? 0.2),
          completedJobs: Number(configured.completedJobs ?? configured.completed_jobs ?? 0.1),
          responseHistory: Number(configured.responseHistory ?? configured.response_history ?? 0.1),
          cancellationHistory: Number(
            configured.cancellationHistory ?? configured.cancellation_history ?? 0.05,
          ),
          recommendationPriority: Number(
            configured.recommendationPriority ?? configured.priority ?? 0.05,
          ),
        });
      }
    };
    void refresh();
    return subscribe('system_settings', refresh);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 50)
        throw new Error('Commission rate must be between 0 and 50.');
      if (!Number.isFinite(homeownerCharge) || homeownerCharge < 0)
        throw new Error('Homeowner charge cannot be negative.');
      const weightTotal = Object.values(matchingWeights).reduce(
        (sum, value) => sum + Number(value),
        0,
      );
      if (Math.abs(weightTotal - 1) > 0.001) throw new Error('Matching weights must total 100%.');
      await Promise.all([
        saveSetting('general.site_name', general.siteName),
        saveSetting('general.support_email', general.supportEmail),
        saveSetting('general.currency', general.currency),
        saveSetting('general.timezone', general.timezone),
        saveSetting('ai.enabled', Boolean(settings['ai.enabled'])),
        saveSetting('ai.cost_estimation_enabled', Boolean(settings['ai.cost_estimation_enabled'])),
        saveSetting('platform_settings.commission_rate', commissionRate),
        saveSetting('platform_settings.homeowner_charge', homeownerCharge),
        saveSetting('matching.weights', matchingWeights),
      ]);
      setIsSaving(false);
      setSaveSuccess(true);
    } catch (error) {
      alert(error.message);
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: <Globe size={18} /> },
    { id: 'booking', label: 'Booking Rules', icon: <Calendar size={18} /> },
    { id: 'ai', label: 'AI Assistant', icon: <Bot size={18} /> },
    { id: 'security', label: 'Security & Auth', icon: <Shield size={18} /> },
    { id: 'payments', label: 'Payments & Fees', icon: <CreditCard size={18} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    { id: 'integrations', label: 'Integrations', icon: <Database size={18} /> },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-gray-500 mt-1">Configure global application settings and integrations</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span
                  className={`mr-3 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`}
                >
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">
              {tabs.find((t) => t.id === activeTab)?.label} Configuration
            </h2>
            {saveSuccess && (
              <span className="text-sm text-green-600 flex items-center font-medium transition-opacity duration-300">
                <CheckCircle size={16} className="mr-1" /> Settings saved successfully
              </span>
            )}
          </div>

          <form onSubmit={handleSave} className="p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Platform Name
                    </label>
                    <input
                      type="text"
                      value={general.siteName}
                      onChange={(e) => setGeneral({ ...general, siteName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Support Email
                    </label>
                    <input
                      type="email"
                      value={general.supportEmail}
                      onChange={(e) => setGeneral({ ...general, supportEmail: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Currency
                    </label>
                    <select
                      value={general.currency}
                      onChange={(e) => setGeneral({ ...general, currency: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option>USD ($)</option>
                      <option>EUR (€)</option>
                      <option>GBP (£)</option>
                      <option>PHP (₱)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      System Timezone
                    </label>
                    <select
                      value={general.timezone}
                      onChange={(e) => setGeneral({ ...general, timezone: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option>UTC-08:00 Pacific Time</option>
                      <option>UTC-05:00 Eastern Time</option>
                      <option>UTC+00:00 GMT</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6 mt-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Maintenance Mode</h3>
                  <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div>
                      <p className="font-medium text-gray-900">Enable Maintenance Mode</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Disables customer and worker apps for updates.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'booking' && (
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Booking Policies</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Auto-cancel unassigned bookings after
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-blue-500">
                      <option>1 Hour</option>
                      <option>12 Hours</option>
                      <option>24 Hours</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Advance Booking Limit
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-blue-500">
                      <option>Up to 7 days</option>
                      <option>Up to 30 days</option>
                      <option>Up to 3 months</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-gray-900 mb-2">AI Assistant Settings</h3>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900">Enable AI Request Analysis</p>
                    <p className="text-sm text-gray-500">
                      Analyze consented requests; deterministic matching remains authoritative.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={Boolean(settings['ai.enabled'])}
                      onChange={(event) =>
                        setSettings({ ...settings, 'ai.enabled': event.target.checked })
                      }
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900">AI Cost Estimation</p>
                    <p className="text-sm text-gray-500">
                      Display AI-generated estimated cost for user requests.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={Boolean(settings['ai.cost_estimation_enabled'])}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          'ai.cost_estimation_enabled': event.target.checked,
                        })
                      }
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Admin Authentication</h3>

                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900">Require Two-Factor Auth (2FA)</p>
                    <p className="text-sm text-gray-500">
                      Force all admins to use 2FA via authenticator app.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900">Session Timeout</p>
                    <p className="text-sm text-gray-500">Automatically logout inactive admins.</p>
                  </div>
                  <select className="border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-blue-500 text-sm">
                    <option>15 Minutes</option>
                    <option>30 Minutes</option>
                    <option>1 Hour</option>
                    <option>Never</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-gray-900 mb-2">Platform Fees</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Global Commission Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.1"
                      value={commissionRate}
                      onChange={(event) => setCommissionRate(Number(event.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Percentage deducted from worker payouts.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Homeowner Service Charge (₱)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={homeownerCharge}
                      onChange={(event) => setHomeownerCharge(Number(event.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Flat charge added to the homeowner total.
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Worker Matching Weights</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(matchingWeights).map(([key, value]) => (
                      <label key={key} className="text-sm text-gray-700">
                        <span className="mb-1 block">
                          {key
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, (letter) => letter.toUpperCase())}{' '}
                          (%)
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={Math.round(Number(value) * 100)}
                          onChange={(event) =>
                            setMatchingWeights((current) => ({
                              ...current,
                              [key]: Number(event.target.value) / 100,
                            }))
                          }
                          className="w-full rounded-lg border border-gray-300 px-4 py-2"
                        />
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Total:{' '}
                    {Math.round(
                      Object.values(matchingWeights).reduce(
                        (sum, value) => sum + Number(value),
                        0,
                      ) * 100,
                    )}
                    %
                  </p>
                </div>

                <div className="border-t border-gray-100 pt-6 mt-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Payout Schedule</h3>
                  <select className="w-full md:w-1/2 border border-gray-300 rounded-lg px-4 py-2 focus:ring-blue-500 focus:border-blue-500">
                    <option>Daily</option>
                    <option>Weekly (Every Monday)</option>
                    <option>Bi-weekly</option>
                    <option>Manual Only</option>
                  </select>
                </div>
              </div>
            )}

            {/* Other tabs would go here, omitting for brevity in demo */}
            {(activeTab === 'notifications' || activeTab === 'integrations') && (
              <div className="py-12 text-center text-gray-500">
                <SettingsIcon size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Configuration options for {activeTab} will appear here.</p>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center disabled:opacity-70"
              >
                {isSaving ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>{' '}
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Save size={18} className="mr-2" /> Save Changes
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
