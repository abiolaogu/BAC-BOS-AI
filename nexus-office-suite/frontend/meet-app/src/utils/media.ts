import type { MediaDevice, MediaSettings } from '@/types/meeting';

export interface MediaConstraints {
  audio?: boolean | MediaTrackConstraints;
  video?: boolean | MediaTrackConstraints;
}

/**
 * Get user media stream with constraints
 */
export async function getUserMedia(constraints: MediaConstraints): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch (error) {
    console.error('Error accessing user media:', error);
    throw new Error('Failed to access camera/microphone. Please check permissions.');
  }
}

/**
 * Get display media for screen sharing
 */
export async function getDisplayMedia(): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: 'always',
      },
      audio: false,
    });
    return stream;
  } catch (error) {
    console.error('Error accessing display media:', error);
    throw new Error('Failed to start screen sharing.');
  }
}

/**
 * Enumerate available media devices
 */
export async function enumerateDevices(): Promise<MediaDevice[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((device) => device.kind !== 'audiooutput' || device.deviceId !== 'default')
      .map((device) => ({
        deviceId: device.deviceId,
        label: device.label || `${device.kind} ${device.deviceId.slice(0, 8)}`,
        kind: device.kind as 'audioinput' | 'videoinput' | 'audiooutput',
      }));
  } catch (error) {
    console.error('Error enumerating devices:', error);
    return [];
  }
}

/**
 * Get audio devices
 */
export async function getAudioDevices(): Promise<MediaDevice[]> {
  const devices = await enumerateDevices();
  return devices.filter((d) => d.kind === 'audioinput');
}

/**
 * Get video devices
 */
export async function getVideoDevices(): Promise<MediaDevice[]> {
  const devices = await enumerateDevices();
  return devices.filter((d) => d.kind === 'videoinput');
}

/**
 * Get audio output devices
 */
export async function getAudioOutputDevices(): Promise<MediaDevice[]> {
  const devices = await enumerateDevices();
  return devices.filter((d) => d.kind === 'audiooutput');
}

/**
 * Check if browser supports getUserMedia
 */
export function isMediaSupported(): boolean {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    navigator.mediaDevices.getDisplayMedia
  );
}

/**
 * Request media permissions
 */
export async function requestMediaPermissions(): Promise<boolean> {
  try {
    const stream = await getUserMedia({ audio: true, video: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

/**
 * Stop all tracks in a media stream
 */
export function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) return;
  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

/**
 * Create media constraints from settings
 */
export function createMediaConstraints(settings: Partial<MediaSettings>): MediaConstraints {
  const videoConstraints: MediaTrackConstraints = {
    deviceId: settings.videoDeviceId ? { exact: settings.videoDeviceId } : undefined,
  };

  // Set resolution
  if (settings.resolution === '1080p') {
    videoConstraints.width = { ideal: 1920 };
    videoConstraints.height = { ideal: 1080 };
  } else if (settings.resolution === '720p') {
    videoConstraints.width = { ideal: 1280 };
    videoConstraints.height = { ideal: 720 };
  } else if (settings.resolution === '480p') {
    videoConstraints.width = { ideal: 640 };
    videoConstraints.height = { ideal: 480 };
  }

  // Set frame rate
  if (settings.frameRate) {
    videoConstraints.frameRate = { ideal: settings.frameRate };
  }

  const audioConstraints: MediaTrackConstraints = {
    deviceId: settings.audioDeviceId ? { exact: settings.audioDeviceId } : undefined,
    echoCancellation: settings.echoCancellation ?? true,
    noiseSuppression: settings.noiseSuppression ?? true,
    autoGainControl: true,
  };

  return {
    audio: audioConstraints,
    video: videoConstraints,
  };
}

/**
 * Get optimal video constraints based on connection quality
 */
export function getOptimalVideoConstraints(quality: 'low' | 'medium' | 'high'): MediaTrackConstraints {
  const constraints: MediaTrackConstraints = {
    aspectRatio: { ideal: 16 / 9 },
  };

  switch (quality) {
    case 'low':
      constraints.width = { ideal: 640 };
      constraints.height = { ideal: 360 };
      constraints.frameRate = { ideal: 15 };
      break;
    case 'medium':
      constraints.width = { ideal: 1280 };
      constraints.height = { ideal: 720 };
      constraints.frameRate = { ideal: 24 };
      break;
    case 'high':
      constraints.width = { ideal: 1920 };
      constraints.height = { ideal: 1080 };
      constraints.frameRate = { ideal: 30 };
      break;
  }

  return constraints;
}

/**
 * Calculate audio level from stream
 */
export async function calculateAudioLevel(stream: MediaStream): Promise<number> {
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);

  source.connect(analyser);
  analyser.fftSize = 256;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  analyser.getByteFrequencyData(dataArray);
  const average = dataArray.reduce((a, b) => a + b) / bufferLength;

  source.disconnect();
  audioContext.close();

  return average;
}

/**
 * Check if track is still active
 */
export function isTrackActive(track: MediaStreamTrack | null): boolean {
  return track !== null && track.readyState === 'live';
}

/**
 * Replace track in stream
 */
export function replaceTrack(
  stream: MediaStream,
  oldTrack: MediaStreamTrack,
  newTrack: MediaStreamTrack
): MediaStream {
  stream.removeTrack(oldTrack);
  stream.addTrack(newTrack);
  oldTrack.stop();
  return stream;
}
