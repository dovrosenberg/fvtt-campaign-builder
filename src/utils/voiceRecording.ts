import { ModuleSettings, SettingKey, VoiceRecordingFolderConfig } from '@/settings';
import { localize } from '@/utils/game';

const FilePicker = foundry.applications.apps.FilePicker;

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
  stopRecording: async (recorder: MediaRecorder, stream: MediaStream): Promise<Blob> => {
    const chunks: Blob[] = [];
    
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    
    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
        
        resolve(new Blob(chunks, { type: 'audio/webm' }));
      };
      
      recorder.stop();
    });
    
    return blob;
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
   * Check if a voice recording folder has been configured.
   * @returns true if a folder path has been set, false otherwise
   */
  hasFolderConfigured: (): boolean => {
    const config = ModuleSettings.get(SettingKey.voiceRecordingFolder);
    return !!(config?.path);
  },

  /**
   * Open a directory picker to select the voice recording folder.
   * @returns Promise resolving to true if a folder was selected, false otherwise
   */
  selectFolder: async (): Promise<boolean> => {
    const result = await new Promise<{ path: string; source: FilePicker.SourceType } | null>((resolve) => {
      const currentConfig = ModuleSettings.get(SettingKey.voiceRecordingFolder);
      const fp = new FilePicker.implementation({
        window: {
          title: localize('dialogs.voiceRecording.selectFolderTitle'),
        }
      });

      fp.type = 'folder';
      fp.activeSource = currentConfig?.source || 'data';
      fp.callback = (path: string, picker: FilePicker) => {
        // picker.source is the selected source
        resolve({ path, source: picker.activeSource });
      };
      fp.browse(currentConfig?.path);
    });

    if (result) {
      await ModuleSettings.set(SettingKey.voiceRecordingFolder, result);
      return true;
    } else {
      return false;
    }
  },

  /**
   * Ensure a folder is configured before uploading. Prompts user if not set.
   * @returns Promise resolving to the folder config, or null if cancelled
   */
  ensureFolderConfigured: async (): Promise<VoiceRecordingFolderConfig | null> => {
    let config = ModuleSettings.get(SettingKey.voiceRecordingFolder);
    
    if (!config?.path) {
      // Prompt user to select a folder
      const selected = await VoiceRecordingService.selectFolder();
      if (!selected) {
        return null;
      }
      config = ModuleSettings.get(SettingKey.voiceRecordingFolder);
    }
    
    return config;
  },

  /**
   * Upload an audio blob to Foundry's file system.
   * @param blob - The audio data to upload
   * @param entryName - The name of the character entry (for filename generation)
   * @returns Promise resolving to the file path of the uploaded recording, or null if cancelled or failed
   */
  uploadRecording: async (blob: Blob, entryName: string): Promise<string | null> => {
    // Ensure folder is configured
    const config = await VoiceRecordingService.ensureFolderConfigured();
    if (!config) {
      return null;
    }
    
    const filename = VoiceRecordingService.generateFilename(entryName);
    
    // Create a File object from the Blob
    const file = new File([blob], filename, { type: 'audio/webm' });
    
    // Upload using Foundry's FilePicker upload functionality
    const result = await FilePicker.upload(config.source, config.path, file, {}, { notify: false });
    
    // Check if upload was successful and return the path
    // Foundry returns false on failure, or a SuccessResponse object with status, path, and message
    if (result && result.status==='success') {
      return result.path;
    }
    
    return null;
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
