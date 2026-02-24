import { ModuleSettings, SettingKey } from '@/settings';

/**
 * Service for managing voice recordings for character entries.
 * Provides methods to record, upload, play, and manage audio recordings
 * using the MediaRecorder API and Foundry's file system.
 */
const VoiceRecordingService = {
  /**
   * Check if the browser supports audio recording.
   * @returns true if MediaRecorder API is available, false otherwise
   */
  isRecordingSupported: (): boolean => {
    return typeof navigator !== 'undefined' && 
           typeof navigator.mediaDevices !== 'undefined' && 
           typeof MediaRecorder !== 'undefined';
  },

  /**
   * Start recording audio from the microphone.
   * @returns Promise resolving to an object containing the MediaRecorder and MediaStream
   * @throws Error if microphone access is denied or recording is not supported
   */
  startRecording: async (): Promise<{ recorder: MediaRecorder; stream: MediaStream }> => {
    if (!VoiceRecordingService.isRecordingSupported()) {
      throw new Error('Voice recording is not supported in this browser');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    
    return { recorder, stream };
  },

  /**
   * Stop recording and get the audio blob.
   * @param recorder - The active MediaRecorder instance
   * @param stream - The active MediaStream to stop tracks on
   * @returns Promise resolving to the audio Blob
   */
  stopRecording: (recorder: MediaRecorder, stream: MediaStream): Promise<Blob> => {
    return new Promise((resolve) => {
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
        
        const blob = new Blob(chunks, { type: 'audio/webm' });
        resolve(blob);
      };
      
      recorder.stop();
    });
  },

  /**
   * Generate a filename for a voice recording.
   * Format: entryname_timestamp.webm (sanitized for file system)
   * @param entryName - The name of the character entry
   * @returns Filename with sanitized entry name and timestamp
   */
  generateFilename: (entryName: string): string => {
    // Sanitize the entry name for use in a filename
    const sanitizedName = entryName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    // Generate timestamp in ISO format (sortable)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    return `${sanitizedName}_${timestamp}.webm`;
  },

  /**
   * Upload an audio blob to Foundry's file system.
   * @param blob - The audio data to upload
   * @param entryName - The name of the character entry (for filename generation)
   * @returns Promise resolving to the file path of the uploaded recording
   * @throws Error if upload fails
   */
  uploadRecording: async (blob: Blob, entryName: string): Promise<string> => {
    const folder = ModuleSettings.get(SettingKey.voiceRecordingFolder) || 'voice-recordings';
    const filename = VoiceRecordingService.generateFilename(entryName);
    
    // Create a File object from the Blob
    const file = new File([blob], filename, { type: 'audio/webm' });
    
    // Upload using Foundry's FilePicker upload functionality
    const result = await FilePicker.upload('data', folder, file, {}, { notify: false });
    
    return result.path;
  },

  /**
   * Play an audio recording from a file path.
   * @param path - The file path to the audio recording
   * @returns The HTMLAudioElement that is playing
   */
  playRecording: (path: string): HTMLAudioElement => {
    const audio = new Audio(path);
    audio.play();
    return audio;
  },

  /**
   * Format elapsed seconds into a display string (MM:SS).
   * @param seconds - The number of seconds elapsed
   * @returns Formatted time string
   */
  formatTime: (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },
};

export default VoiceRecordingService;
