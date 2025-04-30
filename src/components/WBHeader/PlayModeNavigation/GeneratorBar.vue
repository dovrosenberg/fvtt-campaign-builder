<template>
  <div 
    v-if="Backend.available"
    class="fcb-play-generators flexrow"
  >
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

</template>

<script setup lang="ts">
  // library imports
  import { computed, ref } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, useNavigationStore } from '@/applications/stores';
  import { SettingKey, ModuleSettings } from '@/settings/ModuleSettings';
  import { Backend } from '@/classes'
  import { createEntryDialog } from '@/dialogs/createEntry';
  
  // local components
  import GenerateNameDialog from '@/components/AIGeneration/GenerateNameDialog.vue';
  
  // types
  import { GeneratorType, Topics, ValidTopic} from '@/types';

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
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
  const initialName = ref<string>('');
  const initialType = ref<string>('');
  
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
    let topic: ValidTopic;
    switch (currentGeneratorType.value) {
      case GeneratorType.NPC:
        topic = Topics.Character;
        break;
      case GeneratorType.Town:
        topic = Topics.Location;
        break;
      case GeneratorType.Store:
        topic = Topics.Location;
        break;
      case GeneratorType.Tavern:
        topic = Topics.Location;
        break;
      default:
        return;
    }

    const config = ModuleSettings.get(SettingKey.generatorConfig);
    initialName.value = value;
    initialType.value = config?.defaultTypes[currentGeneratorType.value] || '';
    
    const entry = await createEntryDialog(topic, { 
      name: initialName || '',
      type: initialType || '',
    });

    if (entry) {
      await navigationStore.openEntry(entry.uuid, { newTab: true, activate: false });
    }
  };

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