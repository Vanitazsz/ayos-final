import { styles } from './SettingsAddressesScreen.styles';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import {
  ArrowLeft,
  Check,
  Edit3,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { LegacyButton as Button } from '@/components/AppButton';
import { LegacyTextInput as TextInput } from '@/components/AppInput';
import { LocationPicker } from '@/components/LocationPicker';
import { theme } from '@/constants/theme';
import type { useSettingsAddressesScreenController } from '../hooks/useSettingsAddressesScreenController';

export function SavedAddressesView({
  model,
}: {
  model: ReturnType<typeof useSettingsAddressesScreenController>;
}) {
  const {
    router,
    locationPickerRef,
    addresses,
    loading,
    saving,
    showForm,
    form,
    setForm,
    coords,
    setCoords,
    error,
    locationWarning,
    setLocationWarning,
    confirmRemoveId,
    setConfirmRemoveId,
    openNew,
    openEdit,
    closeForm,
    updateField,
    save,
    makeDefault,
    remove,
    formatSavedAddress,
  } = model;
  return (
    <Screen safeArea scrollable>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={theme.typography.h4}>Saved Addresses</Text>
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
                  <View style={styles.cardActions}>
                    {!address.isDefault ? (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Make ${address.label} default`}
                        onPress={() => void makeDefault(address)}
                        disabled={saving}
                      >
                        <Text style={styles.actionText}>Make default</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${address.label}`}
                      onPress={() => openEdit(address)}
                      style={styles.iconAction}
                    >
                      <Edit3 color={theme.colors.primary} size={18} />
                      <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${address.label}`}
                      onPress={() => setConfirmRemoveId(address.id)}
                      style={styles.iconAction}
                    >
                      <Trash2 color={theme.colors.error} size={18} />
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                  {confirmRemoveId === address.id ? (
                    <View style={styles.confirmCard}>
                      <Text style={theme.typography.body2}>
                        Remove this saved address?
                      </Text>
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
            <Button
              title="Add Address"
              icon={Plus}
              onPress={openNew}
              fullWidth
            />
          </>
        ) : null}

        {showForm ? (
          <View style={styles.formCard}>
            <Text style={theme.typography.h3}>
              {form.id ? 'Edit Address' : 'Add Address'}
            </Text>
            <TextInput
              accessibilityLabel="Address label"
              placeholder="Label (e.g. Home)"
              value={form.label}
              onChangeText={(value) => updateField('label', value)}
            />
            <TextInput
              accessibilityLabel="Street address"
              placeholder="House number and street"
              value={form.line1}
              onChangeText={(value) => updateField('line1', value)}
            />
            <TextInput
              accessibilityLabel="Address details"
              placeholder="Subdivision, building, or unit (optional)"
              value={form.line2}
              onChangeText={(value) => updateField('line2', value)}
            />
            <TextInput
              accessibilityLabel="Barangay"
              placeholder="Barangay"
              value={form.barangay}
              onChangeText={(value) => updateField('barangay', value)}
            />
            <TextInput
              accessibilityLabel="City or municipality"
              placeholder="City or municipality"
              value={form.city}
              onChangeText={(value) => updateField('city', value)}
            />
            <TextInput
              accessibilityLabel="Province"
              placeholder="Province"
              value={form.province}
              onChangeText={(value) => updateField('province', value)}
            />
            <TextInput
              accessibilityLabel="Postal code"
              placeholder="Postal code (optional)"
              value={form.postalCode}
              onChangeText={(value) => updateField('postalCode', value)}
              keyboardType="number-pad"
            />
            <LocationPicker
              ref={locationPickerRef}
              coords={coords}
              error={
                !coords && error ? 'Confirm the address location.' : undefined
              }
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
            <TouchableOpacity
              accessibilityRole="checkbox"
              accessibilityState={{ checked: form.isDefault }}
              accessibilityLabel="Use as default address"
              style={styles.defaultRow}
              onPress={() => updateField('isDefault', !form.isDefault)}
            >
              <View
                style={[
                  styles.checkbox,
                  form.isDefault && styles.checkboxChecked,
                ]}
              >
                {form.isDefault ? (
                  <Check color={theme.colors.surface} size={14} />
                ) : null}
              </View>
              <Text style={theme.typography.body2}>
                Use as my default address
              </Text>
            </TouchableOpacity>
            <View style={styles.formActions}>
              <Button
                title="Cancel"
                variant="outlined"
                onPress={closeForm}
                style={styles.flexButton}
              />
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
