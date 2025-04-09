<template>
  <div class="fcb-play-generators flexrow">
    <div class="fcb-generate-label">Generate</div>
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
  />

  <GenerateDialog
    v-model="showGenerateDialog"
    :topic="generateTopic"
    :initial-name="initialName || ''"
    :initial-type="initialType || ''"
    :valid-parents="validGenerateParents"
    @generation-complete="onFullGenerationComplete"
  />
</template>

<script setup lang="ts">
  // library imports
  import { computed, ref } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, } from '@/applications/stores';
  import { handleGeneratedEntry, GeneratedDetails } from '@/utils/generation';
  import { hasHierarchy, } from '@/utils/hierarchy';
  import { SettingKey, ModuleSettings } from '@/settings/ModuleSettings';
  
  // local components
  import GenerateNameDialog from '@/components/AIGeneration/GenerateNameDialog.vue';
  import GenerateDialog from '@/components/AIGeneration/GenerateDialog.vue';

  // types
  import { GeneratorType, Topics, ValidTopic} from '@/types';
  import { Entry} from '@/classes';

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const { currentWorld } = storeToRefs(mainStore);


  ////////////////////////////////
  // data
  const generators = computed(() => [
    { id: GeneratorType.NPC, label: 'NPC', icon: 'fa-user', tooltip: 'Generate a random NPC name' },
    { id: GeneratorType.Town, label: 'Town', icon: 'fa-city', tooltip: 'Generate a random town name' },
    { id: GeneratorType.Store, label: 'Store', icon: 'fa-shop', tooltip: 'Generate a random store name' },
    { id: GeneratorType.Tavern, label: 'Tavern', icon: 'fa-beer-mug-empty', tooltip: 'Generate a random tavern name' },
  ]);

  const showGenerateNameDialog = ref<boolean>(false);
  const currentGeneratorType = ref<GeneratorType>(GeneratorType.NPC);

  // used to do a full generation
  const showGenerateDialog = ref<boolean>(false);
  const generateTopic = ref<ValidTopic>(Topics.Character);
  const initialName = ref<string>('');
  const initialType = ref<string>('');
  const validGenerateParents = ref<{id: string; label: string}[]>([]);

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

    // Map generator type to topic and do prep
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

    // load up valid parents
    if (hasHierarchy(generateTopic.value)) {
      const topicFolder = currentWorld.value.topicFolders[generateTopic.value];
      validGenerateParents.value = topicFolder.allEntries()
        .map((e: Entry)=>({ label: e.name, id: e.uuid}));
    }

    const config = ModuleSettings.get(SettingKey.generatorConfig);
    initialName.value = value;
    initialType.value = config?.defaultTypes[currentGeneratorType.value] || '';
    showGenerateDialog.value = true;
  };

  const onFullGenerationComplete = async (details: GeneratedDetails) => {
    if (!currentWorld.value)
      return;
    
    await handleGeneratedEntry(details, currentWorld.value.topicFolders[generateTopic.value]);
  }
</script>

<style lang="scss">
.fcb-play-generators {
  background-color: var(--fcb-header-background);
  border-bottom: 1px solid var(--fcb-header-border-color);
  gap: 2px;

  .fcb-generate-label {
    margin: 0px;
    padding: 5px 8px;
    font-size: 12px;
    font-weight: 500;
    flex: 0 1;
  }

  .fcb-generator-button {
    margin: 0px;
    padding: 5px 8px;
    border-radius: 4px;
    background-color: var(--color-light-6);
    color: white;
    border: 1px solid transparent;
    font-size: 12px;
    align-items: center;
    justify-content: center;
    max-width: 100px;

    i {
      margin-right: 5px;
    }

    &:hover {
      color: var(--fcb-header-nav-btn-color-hover);
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