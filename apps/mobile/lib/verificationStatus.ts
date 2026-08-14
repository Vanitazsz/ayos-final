export function getVerificationPendingNotice() {
  return {
    title: 'Verification pending',
    message:
      'Verification may take 2–3 days after complete documents are submitted.',
    actionLabel: 'Continue',
  };
}

export function isVerificationPendingStatus(status?: string | null) {
  return status === 'PENDING' || status === 'NEEDS_DOCUMENTS';
}

export function getVerificationPendingAlert(onContinue: () => void) {
  const notice = getVerificationPendingNotice();
  return {
    buttons: [{ text: notice.actionLabel, onPress: onContinue }],
    options: { cancelable: false },
  };
}
