import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { ArrowLeft, Check, Edit3, MapPin, Plus, Trash2, AlertCircle } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/buttons/Button';
import { TextInput } from '@/components/inputs/TextInput';
import {
  LocationPicker,
  type LocationCoordinates,
  type LocationPickerHandle,
} from '@/components/LocationPicker';
import { theme } from '@/constants/theme';
import {
  archiveSavedAddress,
  fetchSavedAddresses,
  formatSavedAddress,
  saveSavedAddress,
  type SavedAddress,
} from '@/services/addresses';

type AddressForm = {
  id: string | null;
  label: string;
  line1: string;
  line2: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
};

const emptyForm: AddressForm = {
  id: null,
  label: 'Home',
  line1: '',
  line2: '',
  barangay: '',
  city: '',
  province: '',
  postalCode: '',
  isDefault: false,
};

export default function SavedAddressesScreen() {
  const goBack = useGoBack('/(tabs)/home');
  const locationPickerRef = useRef<LocationPickerHandle>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddressForm>(emptyForm);
  const [coords, setCoords] = useState<LocationCoordinates | null>(null);
  const [error, setError] = useState('');
  const [locationWarning, setLocationWarning] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setAddresses(await fetchSavedAddresses());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load saved addresses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openNew = () => {
    setForm({ ...emptyForm, isDefault: addresses.length === 0 });
    setCoords(null);
    setError('');
    setLocationWarning('');
    setShowForm(true);
  };

  const openEdit = (address: SavedAddress) => {
    setForm({
      id: address.id,
      label: address.label,
      line1: address.line1,
      line2: address.line2,
      barangay: address.barangay,
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      isDefault: address.isDefault,
    });
    setCoords({ latitude: address.latitude, longitude: address.longitude });
    setError('');
    setLocationWarning('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(emptyForm);
    setCoords(null);
    setError('');
    setLocationWarning('');
  };

  const updateField = (field: keyof AddressForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const save = async () => {
    const required = [form.label, form.line1, form.barangay, form.city, form.province];
    if (required.some((value) => !value.trim())) {
      setError('Complete the label, street address, barangay, city, and province.');
      return;
    }
    if (!coords) {
      setError('Confirm the address location before saving.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await saveSavedAddress({
        ...form,
        latitude: coords.latitude,
        longitude: coords.longitude,
        isDefault: form.isDefault || addresses.length === 0,
      });
      closeForm();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save this address.');
    } finally {
      setSaving(false);
    }
  };

  const makeDefault = async (address: SavedAddress) => {
    setSaving(true);
    setError('');
    try {
      await saveSavedAddress({ ...address, isDefault: true });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update the default address.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setSaving(true);
    setError('');
    try {
      await archiveSavedAddress(id);
      setConfirmRemoveId(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to remove this address.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen safeArea scrollable>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={goBack}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={[theme.typography.h2, { flex: 1, textAlign: 'center' }]}>Saved Addresses</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        <Text style={[theme.typography.body2, styles.helpText]}>
          Save an address once, then select it when booking a service.
        </Text>

        {error ? (
          <View style={styles.errorCard}>
            <Text accessibilityRole="alert" style={styles.errorText}>
              {error}
            </Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.helpText}>Loading addresses…</Text>
          </View>
        ) : null}

        {!loading && !showForm ? (
          <>
            {addresses.length === 0 ? (
              <View style={styles.emptyState}>
                <MapPin color={theme.colors.primary} size={36} />
                <Text style={theme.typography.h4}>No saved addresses</Text>
                <Text style={[theme.typography.body2, styles.emptyText]}>
                  Add your home or another service location.
                </Text>
              </View>
            ) : (
              addresses.map((address) => (
                <View key={address.id} style={styles.addressCard}>
                  <View style={styles.addressHeader}>
                    <View style={styles.addressTitleRow}>
                      <MapPin color={theme.colors.primary} size={20} />
                      <Text style={theme.typography.h4}>{address.label}</Text>
                    </View>
                    {address.isDefault ? (
                      <View style={styles.defaultBadge}>
                        <Check color={theme.colors.success} size={13} />
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[theme.typography.body2, styles.addressText]}>
                    {formatSavedAddress(address)}
                  </Text>
                  <View style={styles.divider} />
                  <View style={styles.cardActions}>
                    {!address.isDefault ? (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Make ${address.label} default`}
                        onPress={() => void makeDefault(address)}
                        disabled={saving}
                        style={styles.iconAction}
                      >
                        <Check color={theme.colors.primary} size={14} />
                        <Text style={styles.actionText}>Make default</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${address.label}`}
                      onPress={() => openEdit(address)}
                      style={styles.iconAction}
                    >
                      <Edit3 color={theme.colors.primary} size={14} />
                      <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${address.label}`}
                      onPress={() => setConfirmRemoveId(address.id)}
                      style={styles.removeAction}
                    >
                      <Trash2 color={theme.colors.error} size={14} />
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                  {confirmRemoveId === address.id ? (
                    <View style={styles.confirmCard}>
                      <View style={styles.confirmTextRow}>
                        <AlertCircle color={theme.colors.error} size={20} />
                        <Text style={[theme.typography.body2, { flex: 1, color: theme.colors.textPrimary }]}>
                          Are you sure you want to remove this address?
                        </Text>
                      </View>
                      <View style={styles.confirmActions}>
                        <Button
                          title="Cancel"
                          variant="outlined"
                          size="sm"
                          onPress={() => setConfirmRemoveId(null)}
                        />
                        <Button
                          title="Remove"
                          variant="danger"
                          size="sm"
                          loading={saving}
                          onPress={() => void remove(address.id)}
                        />
                      </View>
                    </View>
                  ) : null}
                </View>
              ))
            )}
            <Button title="Add Address" icon={Plus} onPress={openNew} fullWidth />
          </>
        ) : null}

        {showForm ? (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={theme.typography.h3}>
                {form.id ? 'Edit Address' : 'Add Address'}
              </Text>
              <Text style={styles.helpText}>
                {form.id ? 'Update the details of your saved address.' : 'Provide details for your new address.'}
              </Text>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>Address Label</Text>
              <TextInput
                accessibilityLabel="Address label"
                placeholder="e.g. Home, Office"
                value={form.label}
                onChangeText={(value) => updateField('label', value)}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>Street & Building</Text>
              <TextInput
                accessibilityLabel="Street address"
                placeholder="House number and street"
                value={form.line1}
                onChangeText={(value) => updateField('line1', value)}
              />
              <View style={{ height: theme.spacing.xs }} />
              <TextInput
                accessibilityLabel="Address details"
                placeholder="Subdivision, building, or unit (optional)"
                value={form.line2}
                onChangeText={(value) => updateField('line2', value)}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>Location Details</Text>
              <TextInput
                accessibilityLabel="Barangay"
                placeholder="Barangay"
                value={form.barangay}
                onChangeText={(value) => updateField('barangay', value)}
              />
              <View style={{ height: theme.spacing.xs }} />
              <TextInput
                accessibilityLabel="City or municipality"
                placeholder="City or municipality"
                value={form.city}
                onChangeText={(value) => updateField('city', value)}
              />
              <View style={{ height: theme.spacing.xs }} />
              <View style={styles.rowInputs}>
                <View style={styles.flex1}>
                  <TextInput
                    accessibilityLabel="Province"
                    placeholder="Province"
                    value={form.province}
                    onChangeText={(value) => updateField('province', value)}
                  />
                </View>
                <View style={{ width: theme.spacing.sm }} />
                <View style={styles.flex1}>
                  <TextInput
                    accessibilityLabel="Postal code"
                    placeholder="Postal code (optional)"
                    value={form.postalCode}
                    onChangeText={(value) => updateField('postalCode', value)}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>Pin Location</Text>
              <LocationPicker
                ref={locationPickerRef}
                coords={coords}
                error={!coords && error ? 'Confirm the address location.' : undefined}
                onWarning={(message) => setLocationWarning(message ?? '')}
                onCoordinatesDetected={setCoords}
                onLocationDetected={(details, nextCoords) => {
                  setCoords(nextCoords);
                  setForm((current) => ({
                    ...current,
                    line1: current.line1 || details.street,
                    barangay: current.barangay || details.district,
                    city: current.city || details.city,
                    province: current.province || details.region,
                    postalCode: current.postalCode || details.postalCode,
                  }));
                  setLocationWarning('');
                }}
              />
              {locationWarning ? (
                <Text style={styles.warningText}>{locationWarning}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              accessibilityRole="checkbox"
              accessibilityState={{ checked: form.isDefault }}
              accessibilityLabel="Use as default address"
              style={styles.defaultRow}
              onPress={() => updateField('isDefault', !form.isDefault)}
            >
              <View style={[styles.checkbox, form.isDefault && styles.checkboxChecked]}>
                {form.isDefault ? <Check color={theme.colors.surface} size={14} /> : null}
              </View>
              <Text style={theme.typography.body2}>Use as my default address</Text>
            </TouchableOpacity>
            <View style={styles.formActions}>
              <Button title="Cancel" variant="outlined" onPress={closeForm} style={styles.flexButton} />
              <Button
                title="Save Address"
                onPress={() => void save()}
                loading={saving}
                style={styles.flexButton}
              />
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  content: { paddingVertical: theme.spacing.lg, gap: theme.spacing.md },
  helpText: { color: theme.colors.textSecondary },
  loadingState: { alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.xl },
  errorCard: {
    backgroundColor: theme.colors.errorBackground,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  errorText: { ...theme.typography.body2, color: theme.colors.error },
  emptyState: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xxxl,
  },
  emptyText: { color: theme.colors.textSecondary, textAlign: 'center' },
  addressCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.colors.border + '60',
  },
  addressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addressTitleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  addressText: { color: theme.colors.textSecondary, lineHeight: 22 },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    backgroundColor: `${theme.colors.success}15`,
    borderRadius: theme.radius.full,
  },
  defaultBadgeText: { ...theme.typography.caption, color: theme.colors.success, fontWeight: '700' },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm },
  iconAction: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.radius.full },
  removeAction: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.errorBackground, paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.radius.full },
  actionText: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '700' },
  removeText: { ...theme.typography.caption, color: theme.colors.error, fontWeight: '700' },
  divider: { height: 1, backgroundColor: theme.colors.borderLight, marginVertical: theme.spacing.xs },
  confirmCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.error + '40',
    borderRadius: theme.radius.lg,
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  confirmTextRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing.sm },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.colors.border + '50',
  },
  formHeader: { marginBottom: theme.spacing.xs },
  formSection: { gap: theme.spacing.xs },
  inputLabel: { ...theme.typography.caption, fontWeight: '600', color: theme.colors.textPrimary, marginLeft: 4 },
  rowInputs: { flexDirection: 'row', alignItems: 'center' },
  flex1: { flex: 1 },
  warningText: { ...theme.typography.caption, color: theme.colors.warning },
  defaultRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: theme.colors.primary },
  formActions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  flexButton: { flex: 1 },
});
