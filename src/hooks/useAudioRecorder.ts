import { useState, useRef } from 'react';

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Initialize audio context
      audioContextRef.current = new AudioContext();

      // Use a supported MIME type
      const options = { mimeType: 'audio/webm' };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw new Error('Failed to access microphone. Please make sure you have granted microphone permissions.');
    }
  };

  const stopRecording = async (): Promise<Blob | null> => {
    if (!mediaRecorderRef.current || !isRecording) {
      return null;
    }

    return new Promise(async (resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        const webmBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        try {
          // Convert WebM to WAV using the Web Audio API
          const arrayBuffer = await webmBlob.arrayBuffer();
          const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);

          // Create WAV file
          const wavBlob = await new Promise<Blob>((resolve) => {
            const wavLength = audioBuffer.length * 2 * 2;
            const buffer = new ArrayBuffer(44 + wavLength);
            const view = new DataView(buffer);

            // Write WAV header
            writeString(view, 0, 'RIFF');
            view.setUint32(4, 36 + wavLength, true);
            writeString(view, 8, 'WAVE');
            writeString(view, 12, 'fmt ');
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true);
            view.setUint16(22, 2, true);
            view.setUint32(24, audioContextRef.current!.sampleRate, true);
            view.setUint32(28, audioContextRef.current!.sampleRate * 2 * 2, true);
            view.setUint16(32, 2 * 2, true);
            view.setUint16(34, 16, true);
            writeString(view, 36, 'data');
            view.setUint32(40, wavLength, true);

            // Write audio data
            const channelData = audioBuffer.getChannelData(0);
            let offset = 44;
            for (let i = 0; i < channelData.length; i++) {
              const sample = Math.max(-1, Math.min(1, channelData[i]));
              view.setInt16(offset, sample * 0x7FFF, true);
              offset += 2;
            }

            resolve(new Blob([buffer], { type: 'audio/wav' }));
          });

          mediaRecorderRef.current = null;
          setIsRecording(false);
          resolve(wavBlob);
        } catch (error) {
          console.error('Error converting audio:', error);
          resolve(null);
        }
      };

      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    });
  };

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  return { isRecording, startRecording, stopRecording };
};