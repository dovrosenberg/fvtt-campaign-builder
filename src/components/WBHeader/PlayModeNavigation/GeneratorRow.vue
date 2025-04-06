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

  <GenerateOptionDialog
    v-model="showGenerateDialog"
    :generator-type="currentGeneratorType"
    @use="onOptionUse"
    @add-to-world="onOptionAddToWorld"
  />
</template>

<script setup lang="ts">
  // library imports
  import { computed, ref } from 'vue';

  // local imports
  import { ModuleSettings, SettingKey } from '@/settings';

  // local components
  import GenerateOptionDialog from '@/components/AIGeneration/GenerateOptionDialog.vue';

  // types
  import { GeneratorType } from '@/types';

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const generators = computed(() => [
    { id: GeneratorType.NPC, label: 'NPC Name', icon: 'fa-user', tooltip: 'Generate a random NPC name' },
    { id: GeneratorType.Town, label: 'Town Name', icon: 'fa-city', tooltip: 'Generate a random town name' },
    { id: GeneratorType.Store, label: 'Store Name', icon: 'fa-shop', tooltip: 'Generate a random store name' },
    { id: GeneratorType.Tavern, label: 'Tavern Name', icon: 'fa-beer-mug-empty', tooltip: 'Generate a random tavern name' },
  ]);

  const showGenerateDialog = ref<boolean>(false);
  const currentGeneratorType = ref<GeneratorType>(GeneratorType.NPC);

  ////////////////////////////////
  // methods
  const onGeneratorClick = (type: GeneratorType) => {
    currentGeneratorType.value = type;
    showGenerateDialog.value = true;
  };

  const onOptionUse = (value: string) => {
    // Display the result
    ui?.notifications?.info(`Generated: ${value}`);

    // Copy to clipboard
    navigator.clipboard.writeText(value).then(() => {
      ui?.notifications?.info('Copied to clipboard!');
    });
  };

  const onOptionAddToWorld = (value: string) => {
    // Display the result
    ui?.notifications?.info(`Generated and added to world: ${value}`);

    // Copy to clipboard
    navigator.clipboard.writeText(value).then(() => {
      ui?.notifications?.info('Copied to clipboard!');
    });

    // TODO: Implement adding to world based on generator type
    // This would involve creating a new entry in the appropriate topic folder
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