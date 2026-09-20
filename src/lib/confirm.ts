import { Alert, Platform } from 'react-native';

/**
 * Platformlar arası onay kutusu. `Alert.alert` web derlemesinde sessizce
 * hiçbir şey yapmadığı için orada `window.confirm` kullanılır.
 */
export function confirm(options: {
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  const { title, message, confirmLabel = 'Tamam', destructive, onConfirm } = options;

  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(text)) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}
