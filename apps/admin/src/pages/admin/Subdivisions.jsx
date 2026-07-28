import { useEffect, useState } from 'react';
import { Edit, MapPin, Plus, Power } from 'lucide-react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import SubdivisionMapPicker from '../../components/SubdivisionMapPicker';
import { loadSubdivisions, saveSubdivision, subscribe } from '../../services/adminData';

const emptyForm = {
  id: null,
  name: '',
  center_lat: 14.5547,
  center_lng: 121.0244,
  radius_meters: 2000,
  boundary: null,
  is_active: true,
};

export default function Subdivisions() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => setRows(await loadSubdivisions());
  useEffect(() => {
    void refresh();
    return subscribe('subdivisions', refresh);
  }, []);

  const edit = (row = emptyForm) => {
    setForm({ ...emptyForm, ...row });
    setError('');
    setOpen(true);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || Number(form.radius_meters) < 100) {
      setError('Enter a name and a radius of at least 100 meters.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await saveSubdivision(form);
      await refresh();
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save subdivision');
    } finally {
      setSaving(false);
    }
  };
  const toggle = async (row) => {
    if (!window.confirm(`${row.is_active ? 'Deactivate' : 'Activate'} ${row.name}?`)) return;
    await saveSubdivision({ ...row, is_active: !row.is_active });
    await refresh();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subdivisions</h1>
          <p className="mt-1 text-gray-500">
            Manage the service areas used for customer and worker matching.
          </p>
        </div>
        <Button onClick={() => edit()}>
          <Plus className="mr-2 h-4 w-4" /> Add Subdivision
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Name', 'Center', 'Radius', 'Status', 'Actions'].map((label) => (
                <th
                  key={label}
                  className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-6 py-4 font-medium text-gray-900">{row.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <MapPin className="mr-1 inline h-4 w-4" />
                  {Number(row.center_lat).toFixed(6)}, {Number(row.center_lng).toFixed(6)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {Number(row.radius_meters).toLocaleString()} m
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${row.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {row.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => edit(row)}
                      className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                      aria-label={`Edit ${row.name}`}
                    >
                      <Edit size={17} />
                    </button>
                    <button
                      onClick={() => void toggle(row)}
                      className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                      aria-label={`${row.is_active ? 'Deactivate' : 'Activate'} ${row.name}`}
                    >
                      <Power size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                  No subdivisions configured.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={form.id ? 'Edit Subdivision' : 'Create Subdivision'}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Latitude</label>
              <input
                type="number"
                step="any"
                value={form.center_lat}
                onChange={(event) => setForm({ ...form, center_lat: event.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Longitude</label>
              <input
                type="number"
                step="any"
                value={form.center_lng}
                onChange={(event) => setForm({ ...form, center_lng: event.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Radius (meters)</label>
              <input
                type="number"
                min="100"
                max="50000"
                value={form.radius_meters}
                onChange={(event) => setForm({ ...form, radius_meters: event.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </div>
          </div>
          <SubdivisionMapPicker
            latitude={form.center_lat}
            longitude={form.center_lng}
            onChange={({ latitude, longitude }) =>
              setForm((current) => ({ ...current, center_lat: latitude, center_lng: longitude }))
            }
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save Subdivision'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
