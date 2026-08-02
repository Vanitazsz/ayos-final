import { loadSubdivisions, saveSubdivision } from '../logic/SubdivisionsPageLogic';
import { useState } from 'react';
import { useDataFetch } from '../../../hooks/useDataFetch';
import { useRealtime } from '../../../hooks/useRealtime';
const emptyForm = {
  id: null,
  name: '',
  center_lat: 14.5547,
  center_lng: 121.0244,
  radius_meters: 2000,
  boundary: null,
  is_active: true,
};
export function useSubdivisionsPageController() {
  const { data: rows, isLoading, error, refresh } = useDataFetch(loadSubdivisions, []);
  useRealtime('subdivisions', refresh);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const closeConfirm = () => setConfirm((s) => ({ ...s, isOpen: false }));
  const edit = (row = emptyForm) => {
    setForm({ ...emptyForm, ...row });
    setFormError('');
    setOpen(true);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || Number(form.radius_meters) < 100) {
      setFormError('Enter a name and a radius of at least 100 meters.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await saveSubdivision(form);
      await refresh();
      setOpen(false);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'Unable to save subdivision');
    } finally {
      setSaving(false);
    }
  };
  const toggle = async (row) => {
    setConfirm({
      isOpen: true,
      title: row.is_active ? 'Deactivate Subdivision' : 'Activate Subdivision',
      message: `${row.is_active ? 'Deactivate' : 'Activate'} ${row.name}?`,
      onConfirm: async () => {
        await saveSubdivision({ ...row, is_active: !row.is_active });
        await refresh();
      },
    });
  };
  return {
    rows,
    isLoading,
    error,
    form,
    setForm,
    open,
    setOpen,
    saving,
    formError,
    confirm,
    closeConfirm,
    edit,
    submit,
    toggle,
  };
}
