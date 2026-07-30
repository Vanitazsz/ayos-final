import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import { deleteAccount, previewAccountPurge } from '../../services/adminData';

const errorMessage = (error) =>
  error instanceof Error
    ? error.message
    : [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(' | ') ||
      'Unable to permanently delete account.';

const AccountDeleteModal = ({ account, onClose, onDeleted }) => {
  const [preview, setPreview] = useState(null);
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const matches = useMemo(
    () => confirmation.trim().toLowerCase() === account?.email?.trim().toLowerCase(),
    [account?.email, confirmation],
  );

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    setPreview(null);
    setConfirmation('');
    setError('');
    setIsLoading(true);
    void previewAccountPurge(account.id)
      .then((value) => {
        if (!cancelled) setPreview(value);
      })
      .catch((loadError) => {
        if (!cancelled) setError(errorMessage(loadError));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [account]);

  const confirmDelete = async () => {
    if (!account || !matches || !preview) return;
    setIsDeleting(true);
    setError('');
    try {
      await deleteAccount(account.id, confirmation);
      await onDeleted(account);
      onClose();
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={Boolean(account)} onClose={isDeleting ? () => {} : onClose} title="Permanently delete account">
      <div className="space-y-4">
        <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 shrink-0 text-red-600" size={22} />
          <div>
            <p className="font-semibold text-red-900">This action cannot be undone.</p>
            <p className="mt-1 text-sm text-red-800">
              Deleting {account?.name ?? account?.email} also removes all related marketplace
              history, including records shared with other users.
            </p>
          </div>
        </div>

        {isLoading && <p className="text-sm text-gray-500">Calculating deletion impact…</p>}
        {preview && (
          <div className="rounded-lg border border-gray-200 p-4 text-sm">
            <p className="font-semibold text-gray-900">
              {preview.totalRows.toLocaleString()} database rows and{' '}
              {preview.storageFiles.toLocaleString()} files will be removed.
            </p>
            <div className="mt-3 grid max-h-36 grid-cols-2 gap-x-4 gap-y-1 overflow-y-auto text-gray-600">
              {preview.tables.map((entry) => (
                <div key={entry.table} className="flex justify-between gap-2">
                  <span className="truncate">{entry.table}</span>
                  <span>{entry.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <label className="block text-sm font-medium text-gray-700">
          Type <span className="font-semibold text-gray-900">{account?.email}</span> to confirm
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            disabled={isDeleting}
            autoComplete="off"
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
          />
        </label>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void confirmDelete()}
            disabled={!matches || !preview || isDeleting}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AccountDeleteModal;
