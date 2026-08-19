import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  Alert as RNAlert,
  AlertButton,
  AlertOptions,
} from 'react-native';
import { Colors, Radius, Spacing, Elevation, Layout } from '@/constants/theme';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';

interface DialogState {
  title?: string;
  message?: string;
  buttons?: AlertButton[];
  options?: AlertOptions;
}

interface HostHandle {
  show: (dialog: DialogState) => void;
}

let registeredHost: HostHandle | null = null;

function registerHost(handle: HostHandle | null) {
  registeredHost = handle;
}

export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions,
) {
  if (Platform.OS !== 'web') {
    RNAlert.alert(title, message, buttons, options);
    return;
  }
  if (registeredHost) {
    registeredHost.show({ title, message, buttons, options });
    return;
  }
  const fallback = globalThis as any;
  if (typeof fallback.alert === 'function') {
    fallback.alert(message || title);
  }
}

function dismissIfCancelable(
  dialog: DialogState,
  setDialog: React.Dispatch<React.SetStateAction<DialogState | null>>,
) {
  const cancelable = dialog.options?.cancelable ?? true;
  if (cancelable) {
    setDialog(null);
    dialog.options?.onDismiss?.();
  }
}

export const AppAlertHost = React.memo(function AppAlertHost() {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const handle = useMemo<HostHandle>(
    () => ({
      show: (next: DialogState) => {
        setDialog(next);
      },
    }),
    [],
  );

  useEffect(() => {
    registerHost(handle);
    return () => registerHost(null);
  }, [handle]);

  const pressButton = useCallback(
    (button: AlertButton) => {
      const { onPress } = button;
      setDialog(null);
      dialog?.options?.onDismiss?.();
      onPress?.();
    },
    [dialog],
  );

  const buttons = dialog?.buttons?.length ? dialog.buttons : [{ text: 'OK' }];

  return (
    <Modal
      visible={!!dialog}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (dialog) dismissIfCancelable(dialog, setDialog);
      }}
    >
      <Pressable
        style={styles.overlay}
        onPress={() => {
          if (dialog) dismissIfCancelable(dialog, setDialog);
        }}
      >
        <Pressable
          style={styles.content}
          onPress={(e) => e.stopPropagation()}
        >
          {!!dialog?.title && (
            <AppText variant="h3" weight="bold" align="center" style={styles.title}>
              {dialog.title}
            </AppText>
          )}
          {!!dialog?.message && (
            <AppText
              variant="body"
              color={Colors.textSecondary}
              align="center"
              style={styles.message}
            >
              {dialog.message}
            </AppText>
          )}
          <View style={styles.actions}>
            {buttons.map((button, index) => (
              <AppButton
                key={button.text ?? `button-${index}`}
                label={button.text}
                variant={
                  button.style === 'destructive'
                    ? 'danger'
                    : button.style === 'cancel'
                      ? 'ghost'
                      : 'primary'
                }
                size="md"
                fullWidth
                onPress={() => pressButton(button)}
              />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.screenPadding,
  },
  content: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    padding: Spacing['6'],
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: Spacing['4'],
    ...Elevation.lg,
  },
  title: {
    marginTop: Spacing['1'],
  },
  message: {
    marginBottom: Spacing['1'],
  },
  actions: {
    width: '100%',
    gap: Spacing['3'],
    marginTop: Spacing['2'],
  },
});
