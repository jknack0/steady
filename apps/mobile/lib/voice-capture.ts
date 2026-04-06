/**
 * Voice capture wrapper. Uses expo-speech-recognition when available.
 * Currently stubbed — expo-speech-recognition is not yet installed.
 *
 * COND-1: When implemented, MUST use on-device speech recognition only.
 * No audio data may be transmitted to external servers.
 */

export interface VoiceCaptureResult {
  text: string;
  confidence: number;
}

export interface VoiceCaptureCallbacks {
  onStart: () => void;
  onResult: (result: VoiceCaptureResult) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}

let isRecording = false;

export async function isVoiceCaptureAvailable(): Promise<boolean> {
  // expo-speech-recognition not installed yet
  return false;
}

export async function requestMicrophonePermission(): Promise<boolean> {
  return false;
}

export function startVoiceCapture(callbacks: VoiceCaptureCallbacks): void {
  callbacks.onError("Voice input isn't available on this device.");
}

export function stopVoiceCapture(): void {
  isRecording = false;
}

export function getIsRecording(): boolean {
  return isRecording;
}
