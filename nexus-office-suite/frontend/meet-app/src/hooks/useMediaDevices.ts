import { useState, useEffect, useCallback } from 'react';
import type { MediaDevice } from '@/types/meeting';
import { enumerateDevices, isMediaSupported } from '@/utils/media';

export function useMediaDevices() {
  const [audioInputs, setAudioInputs] = useState<MediaDevice[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDevice[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDevice[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('');
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    try {
      if (!isMediaSupported()) {
        setIsSupported(false);
        setError('Media devices are not supported in this browser');
        return;
      }

      setIsSupported(true);
      const devices = await enumerateDevices();

      const audioIns = devices.filter((d) => d.kind === 'audioinput');
      const videoIns = devices.filter((d) => d.kind === 'videoinput');
      const audioOuts = devices.filter((d) => d.kind === 'audiooutput');

      setAudioInputs(audioIns);
      setVideoInputs(videoIns);
      setAudioOutputs(audioOuts);

      // Set default devices
      if (audioIns.length > 0 && !selectedAudioInput) {
        setSelectedAudioInput(audioIns[0].deviceId);
      }
      if (videoIns.length > 0 && !selectedVideoInput) {
        setSelectedVideoInput(videoIns[0].deviceId);
      }
      if (audioOuts.length > 0 && !selectedAudioOutput) {
        setSelectedAudioOutput(audioOuts[0].deviceId);
      }

      setError(null);
    } catch (err) {
      console.error('Error loading media devices:', err);
      setError('Failed to load media devices');
    }
  }, [selectedAudioInput, selectedVideoInput, selectedAudioOutput]);

  useEffect(() => {
    loadDevices();

    // Listen for device changes
    const handleDeviceChange = () => {
      loadDevices();
    };

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [loadDevices]);

  const refreshDevices = useCallback(() => {
    loadDevices();
  }, [loadDevices]);

  return {
    audioInputs,
    videoInputs,
    audioOutputs,
    selectedAudioInput,
    selectedVideoInput,
    selectedAudioOutput,
    setSelectedAudioInput,
    setSelectedVideoInput,
    setSelectedAudioOutput,
    isSupported,
    error,
    refreshDevices,
  };
}
