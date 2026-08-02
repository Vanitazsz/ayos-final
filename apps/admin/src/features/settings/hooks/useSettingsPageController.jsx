import { loadSettings, saveSetting, subscribe } from '../logic/SettingsPageLogic';
import { useEffect, useState } from 'react';
import { Globe, Shield, CreditCard, Bell, Database, Calendar, Bot } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';

export function useSettingsPageController() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
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
  const [autoCancel, setAutoCancel] = useState('1 Hour');
  const [advanceBooking, setAdvanceBooking] = useState('Up to 7 days');
  const [require2fa, setRequire2fa] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('30 Minutes');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [integrationApiKey, setIntegrationApiKey] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
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
      setAutoCancel(String(value['booking.auto_cancel'] ?? '1 Hour'));
      setAdvanceBooking(String(value['booking.advance_limit'] ?? 'Up to 7 days'));
      setRequire2fa(Boolean(value['security.require_2fa'] ?? true));
      setSessionTimeout(String(value['security.session_timeout'] ?? '30 Minutes'));
      setPushEnabled(Boolean(value['notifications.push_enabled'] ?? false));
      setEmailEnabled(Boolean(value['notifications.email_enabled'] ?? false));
      setSmsEnabled(Boolean(value['notifications.sms_enabled'] ?? false));
      setIntegrationApiKey(String(value['integrations.api_key'] ?? ''));
      setWebhookUrl(String(value['integrations.webhook_url'] ?? ''));
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
        saveSetting('booking.auto_cancel', autoCancel),
        saveSetting('booking.advance_limit', advanceBooking),
        saveSetting('security.require_2fa', require2fa),
        saveSetting('security.session_timeout', sessionTimeout),
        saveSetting('notifications.push_enabled', pushEnabled),
        saveSetting('notifications.email_enabled', emailEnabled),
        saveSetting('notifications.sms_enabled', smsEnabled),
        saveSetting('integrations.api_key', integrationApiKey),
        saveSetting('integrations.webhook_url', webhookUrl),
      ]);
      setIsSaving(false);
      setSaveSuccess(true);
    } catch (error) {
      toast.error('Save failed', error.message);
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
  return {
    activeTab,
    setActiveTab,
    isSaving,
    saveSuccess,
    general,
    setGeneral,
    settings,
    setSettings,
    commissionRate,
    setCommissionRate,
    homeownerCharge,
    setHomeownerCharge,
    matchingWeights,
    setMatchingWeights,
    autoCancel,
    setAutoCancel,
    advanceBooking,
    setAdvanceBooking,
    require2fa,
    setRequire2fa,
    sessionTimeout,
    setSessionTimeout,
    pushEnabled,
    setPushEnabled,
    emailEnabled,
    setEmailEnabled,
    smsEnabled,
    setSmsEnabled,
    integrationApiKey,
    setIntegrationApiKey,
    webhookUrl,
    setWebhookUrl,
    handleSave,
    tabs,
  };
}
