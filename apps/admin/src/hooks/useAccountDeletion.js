import { useEffect, useMemo, useState } from 'react';

import { deleteAccount, previewAccountPurge } from '../services/accounts';

const errorMessage = (error) =>
  error instanceof Error
    ? error.message
    : [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(' | ') ||
      'Unable to permanently delete account.';

export function useAccountDeletion({ account, onClose, onDeleted }) {
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

  return {
    confirmation,
    confirmDelete,
    error,
    isDeleting,
    isLoading,
    matches,
    preview,
    setConfirmation,
  };
}
