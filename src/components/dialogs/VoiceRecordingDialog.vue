<!--
  VoiceRecordingDialog.vue
 
  Purpose: Display a dialog while voice recording is in progress, showing
           elapsed time and providing a stop button.
 
  Responsibilities:
  - Display recording status with animated icon
  - Show elapsed recording time
  - Provide stop button to end recording
  - Handle cleanup when stopped
 
  Props:
  - modelValue: Boolean to control dialog visibility
  - recorder: MediaRecorder instance for the active recording
  - stream: MediaStream instance to stop tracks when done
  - mimeType: The MIME type of the recording (default: 'audio/webm')

  Emits:
  - update:modelValue: Emitted when dialog visibility changes
  - stopped: Emitted when recording is stopped with the resulting Blob
  - error: Emitted when recording fails to stop properly
 
  Dependencies:
  - Dialog component for base dialog functionality
  - voiceRecording utility service for time formatting
-->

<template>
  <Dialog
    v-model="show"
    :title="localize('dialogs.voiceRecording.title')"
    :width="350"
    :buttons="[
      {
        label: localize('dialogs.voiceRecording.stop'),
        default: true,
        close: false,
        icon: 'fa-stop',
        callback: onStopClick
      }
    ]"
    @cancel="onStopClick"
  >
    <div class="voice-recording-dialog">
      <i class="fas fa-microphone recording-icon"></i>
      <p class="recording-text">{{ localize('dialogs.voiceRecording.recording') }}</p>
      <div class="recording-time">{{ formattedTime }}</div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
  // library imports
  import { ref, computed, watch, onUnmounted } from 'vue';

  // local imports
  import { localize } from '@/utils/game';
  import VoiceRecordingService from '@/utils/voiceRecording';

  // library components
  // None

  // local components
  import Dialog from '@/components/Dialog.vue';

  // types
  // None

  ////////////////////////////////
  // props
  const props = defineProps({
    modelValue: {
      type: Boolean,
      required: true,
    },
    recorder: {
      type: Object as () => MediaRecorder | null,
      required: false,
      default: null,
    },
    stream: {
      type: Object as () => MediaStream | null,
      required: false,
      default: null,
    },
    mimeType: {
      type: String,
      required: false,
      default: 'audio/webm',
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'stopped', blob: Blob): void;
    (e: 'error'): void;
    (e: 'cancel'): void;
  }>();

  ////////////////////////////////
  // store
  // None

  ////////////////////////////////
  // data
  const show = ref(props.modelValue);
  const elapsedSeconds = ref(0);
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  ////////////////////////////////
  // computed
  const formattedTime = computed(() => {
    return VoiceRecordingService.formatTime(elapsedSeconds.value);
  });

  ////////////////////////////////
  // methods
  /**
   * Start the timer to track recording duration.
   */
  const startTimer = (): void => {
    elapsedSeconds.value = 0;
    timerInterval = setInterval(() => {
      elapsedSeconds.value++;
    }, 1000);
  };

  /**
   * Stop the timer.
   */
  const stopTimer = (): void => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  };


  const cleanup = (): void => {
    stopTimer();
    if (props.recorder && props.recorder.state !== 'inactive') {
      VoiceRecordingService.cancelRecording(props.recorder, props.stream);
      emit('cancel');
    }
  };

  ////////////////////////////////
  // event handlers
  /**
   * Handle stop button click - stop recording and emit result.
   */
  const onStopClick = async (): Promise<void> => {
    if (!props.recorder || !props.stream) {
      return;
    }

    stopTimer();

    try {
      const blob = await VoiceRecordingService.stopRecording(props.recorder, props.stream, props.mimeType);
      emit('stopped', blob);
      show.value = false;
      emit('update:modelValue', false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      cleanup();
      show.value = false;
      emit('update:modelValue', false);
      emit('error');
    }
  };

  ////////////////////////////////
  // watchers
  watch(() => props.modelValue, (newVal) => {
    show.value = newVal;
    if (newVal) {
      startTimer();
    } else {
      cleanup();
    }
  });

  ////////////////////////////////
  // lifecycle hooks
  onUnmounted(() => {
      cleanup();
  });
</script>

<style scoped>
.voice-recording-dialog {
  text-align: center;
  padding: 1rem;
}

.voice-recording-dialog .recording-icon {
  font-size: 3rem;
  color: var(--fcb-danger, #e74c3c);
  animation: pulse 1s infinite;
}

.voice-recording-dialog .recording-text {
  margin-top: 0.75rem;
  font-size: 1rem;
}

.voice-recording-dialog .recording-time {
  font-size: 1.5rem;
  font-weight: bold;
  margin-top: 0.5rem;
  font-family: monospace;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
