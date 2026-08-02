import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

export function useRequestAudioRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  return { recorder, recorderState };
}

export async function prepareRequestAudioRecording(): Promise<boolean> {
  const permission = await requestRecordingPermissionsAsync();
  if (!permission.granted) return false;
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
  });
  return true;
}
