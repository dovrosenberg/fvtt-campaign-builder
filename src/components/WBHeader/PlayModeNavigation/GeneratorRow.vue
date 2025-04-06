<template>
  <div class="fcb-play-generators flexrow">
    <button
      v-for="generator in generators"
      :key="generator.id"
      class="fcb-generator-button"
      @click="onGeneratorClick(generator.id)"
      :title="generator.tooltip"
    >
      <i v-if="generator.icon" :class="`fas ${generator.icon}`"></i>
      <span class="generator-label">{{ generator.label }}</span>
    </button>
  </div>

  <GenerateNameDialog
    v-model="showGenerateNameDialog"
    :generator-type="currentGeneratorType"
    @use="onOptionUse"
    @add-to-world="onOptionAddToWorld"
    @generate="onOptionGenerate"
  />

  <GenerateDialog
    v-model="showGenerateDialog"
    :topic="generateTopic"
    :initial-name="initialName || ''"
    :initial-type="''"
    @generation-complete="onFulLGenerationComplete"
  />
</template>

<script setup lang="ts">
  // library imports
  import { computed, ref } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, useTopicDirectoryStore, } from '@/applications/stores';
  import { Entry } from '@/classes';

  // local components
  import GenerateNameDialog from '@/components/AIGeneration/GenerateNameDialog.vue';
  import GenerateDialog from '@/components/AIGeneration/GenerateDialog.vue';

  // types
  import { GeneratorType, Topics, ValidTopic } from '@/types';

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const topicDirectoryStore = useTopicDirectoryStore();
  const { currentWorld } = storeToRefs(mainStore);


  ////////////////////////////////
  // data
  const generators = computed(() => [
    { id: GeneratorType.NPC, label: 'NPC Name', icon: 'fa-user', tooltip: 'Generate a random NPC name' },
    { id: GeneratorType.Town, label: 'Town Name', icon: 'fa-city', tooltip: 'Generate a random town name' },
    { id: GeneratorType.Store, label: 'Store Name', icon: 'fa-shop', tooltip: 'Generate a random store name' },
    { id: GeneratorType.Tavern, label: 'Tavern Name', icon: 'fa-beer-mug-empty', tooltip: 'Generate a random tavern name' },
  ]);

  const showGenerateNameDialog = ref<boolean>(false);
  const currentGeneratorType = ref<GeneratorType>(GeneratorType.NPC);
  
  const showGenerateDialog = ref<boolean>(false);
  const generateTopic = ref<ValidTopic>(Topics.Character);
  const initialName = ref<string>('');

  ////////////////////////////////
  // methods
  const onGeneratorClick = (type: GeneratorType) => {
    currentGeneratorType.value = type;
    showGenerateNameDialog.value = true;
  };

  const onOptionUse = (value: string) => {
    // Display the result
    ui?.notifications?.info(`Name: ${value}`);

    // Copy to clipboard
    navigator.clipboard.writeText(value).then(() => {
      ui?.notifications?.info('Copied to clipboard!');
    });
  };

  const onOptionAddToWorld = async (value: string) => {
    if (!currentWorld.value) {
      return;
    }

    switch (currentGeneratorType.value) {
      case GeneratorType.NPC:
        // For NPCs, create a character entry
        await topicDirectoryStore.createEntry(currentWorld.value.topicFolders[Topics.Character], { name: value });
        break;

      case GeneratorType.Town:
      case GeneratorType.Store:
      case GeneratorType.Tavern:
        // For all other types, create a location entry
        await topicDirectoryStore.createEntry(currentWorld.value.topicFolders[Topics.Location], { name: value });
        break;

      default:
        throw new Error('Invalid generator type in GeneratorRow.onOptionAddToWorld()');
    }

    // Display the result
    ui?.notifications?.info(`Added to world: ${value}`);

    // Copy to clipboard
    navigator.clipboard.writeText(value).then(() => {
      ui?.notifications?.info('Copied to clipboard!');
    });
  };

  const onOptionGenerate = async (value: string) => {
    if (!currentWorld) {
      return;
    }

    // Map generator type to topic
    switch (currentGeneratorType.value) {
      case GeneratorType.NPC:
        generateTopic.value = Topics.Character;
        break;
      case GeneratorType.Town:
        generateTopic.value = Topics.Location;
        break;
      case GeneratorType.Store:
        generateTopic.value = Topics.Location;
        break;
      case GeneratorType.Tavern:
        generateTopic.value = Topics.Location;
        break;
      default:
        return;
    }

    initialName.value = value;
    showGenerateDialog.value = true;
  };
</script>

<style lang="scss">
.fcb-play-generators {
  background-color: var(--fcb-header-background);
  border-bottom: 1px solid var(--fcb-header-border-color);

  .fcb-generator-button {
    margin: 0px;
    padding: 5px 8px;
    border-radius: 4px;
    background-color: var(--fcb-header-nav-btn-background);
    color: var(--fcb-header-nav-btn-color);
    border: 1px solid var(--fcb-header-nav-btn-border);
    font-size: 12px;
    align-items: center;
    justify-content: center;

    i {
      margin-right: 5px;
    }

    &:hover {
      background-color: var(--fcb-header-nav-btn-background-hover);
      box-shadow: 0 0 5px rgba(255, 0, 0, 0.5);
    }
  }

  @container (max-width: 660px) {
    .fcb-generator-button {
      i {
        margin-right: 0;
      }

      .generator-label {
        display: none;
      }
    }
  }
}
</style>