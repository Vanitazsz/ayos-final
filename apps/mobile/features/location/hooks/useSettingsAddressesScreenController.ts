import {
  archiveSavedAddress,
  fetchSavedAddresses,
  formatSavedAddress,
  saveSavedAddress,
  type SavedAddress,
} from '../logic/SettingsAddressesScreenLogic';
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  type LocationCoordinates,
  type LocationPickerHandle,
} from '@/components/LocationPicker';
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
export function useSettingsAddressesScreenController() {
  const router = useRouter();
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
      setError(
        reason instanceof Error
          ? reason.message
          : 'Unable to load saved addresses.',
      );
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
    const required = [
      form.label,
      form.line1,
      form.barangay,
      form.city,
      form.province,
    ];
    if (required.some((value) => !value.trim())) {
      setError(
        'Complete the label, street address, barangay, city, and province.',
      );
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
      setError(
        reason instanceof Error
          ? reason.message
          : 'Unable to save this address.',
      );
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
      setError(
        reason instanceof Error
          ? reason.message
          : 'Unable to update the default address.',
      );
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
      setError(
        reason instanceof Error
          ? reason.message
          : 'Unable to remove this address.',
      );
    } finally {
      setSaving(false);
    }
  };
  return {
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
  };
}
