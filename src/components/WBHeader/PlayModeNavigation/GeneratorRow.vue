<template>
  <div class="wcb-play-generators flexrow">
    <button 
      v-for="generator in generators" 
      :key="generator.id"
      class="wcb-generator-button"
      @click="onGeneratorClick(generator.id)"
      :title="generator.tooltip"
    >
      <i v-if="generator.icon" :class="`fas ${generator.icon}`"></i>
      {{ generator.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed } from 'vue';

  // local imports
  
  // types
  
  ////////////////////////////////
  // store
  
  ////////////////////////////////
  // data
  const generators = computed(() => [
    { id: 'npc', label: 'NPC', icon: 'fa-user', tooltip: 'Generate a random NPC name' },
    { id: 'town', label: 'Town', icon: 'fa-city', tooltip: 'Generate a random town name' },
    { id: 'store', label: 'Store', icon: 'fa-shop', tooltip: 'Generate a random store name' },
    { id: 'tavern', label: 'Tavern', icon: 'fa-beer-mug-empty', tooltip: 'Generate a random tavern name' },
    { id: 'treasure', label: 'Treasure', icon: 'fa-coins', tooltip: 'Generate random treasure' },
    { id: 'encounter', label: 'Encounter', icon: 'fa-skull', tooltip: 'Generate a random encounter' },
  ]);

  ////////////////////////////////
  // methods
  const generateRandomName = (type: string): string => {
    // Simple name generators - in a real implementation, these would be more sophisticated
    const npcFirstNames = ['Alaric', 'Brenna', 'Cedric', 'Daria', 'Elric', 'Fiona', 'Gareth', 'Hilda', 'Ivar', 'Jora'];
    const npcLastNames = ['Blackwood', 'Crestfall', 'Dawnbringer', 'Evenwood', 'Frostmantle', 'Grimhammer', 'Highwind'];
    const townPrefixes = ['North', 'South', 'East', 'West', 'Old', 'New', 'Great', 'Little', 'Upper', 'Lower'];
    const townSuffixes = ['haven', 'ford', 'bridge', 'shire', 'vale', 'wood', 'field', 'ton', 'wick', 'port'];
    const storePrefixes = ['Golden', 'Silver', 'Rusty', 'Shining', 'Mystic', 'Trusty', 'Reliable', 'Exotic'];
    const storeSuffixes = ['Goods', 'Wares', 'Supplies', 'Emporium', 'Market', 'Shop', 'Store', 'Trading Post'];
    const tavernPrefixes = ['Drunken', 'Laughing', 'Sleeping', 'Dancing', 'Prancing', 'Howling', 'Roaring'];
    const tavernSuffixes = ['Dragon', 'Goblin', 'Unicorn', 'Mermaid', 'Knight', 'Sailor', 'Bard', 'Wizard'];
    
    const randomElement = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    
    switch (type) {
      case 'npc':
        return `${randomElement(npcFirstNames)} ${randomElement(npcLastNames)}`;
      case 'town':
        return `${randomElement(townPrefixes)}${randomElement(townSuffixes)}`;
      case 'store':
        return `The ${randomElement(storePrefixes)} ${randomElement(storeSuffixes)}`;
      case 'tavern':
        return `The ${randomElement(tavernPrefixes)} ${randomElement(tavernSuffixes)}`;
      default:
        return 'Random Name';
    }
  };

  const generateTreasure = (): string => {
    const treasureTypes = [
      'A small pouch containing 2d6 gold pieces',
      'A silver ring worth 25 gold pieces',
      'A gemstone worth 50 gold pieces',
      'A small ornate box worth 75 gold pieces',
      'A golden amulet worth 100 gold pieces',
      'A set of fine silverware worth 150 gold pieces'
    ];
    
    return treasureTypes[Math.floor(Math.random() * treasureTypes.length)];
  };

  const generateEncounter = (): string => {
    const encounters = [
      '1d4 goblins searching for food',
      'A traveling merchant with unusual wares',
      'A wounded traveler seeking help',
      'A small group of bandits preparing an ambush',
      'A wild animal protecting its territory',
      'A patrol of local guards checking the area'
    ];
    
    return encounters[Math.floor(Math.random() * encounters.length)];
  };

  const onGeneratorClick = (generatorId: string) => {
    let result = '';
    
    switch (generatorId) {
      case 'npc':
      case 'town':
      case 'store':
      case 'tavern':
        result = generateRandomName(generatorId);
        break;
      case 'treasure':
        result = generateTreasure();
        break;
      case 'encounter':
        result = generateEncounter();
        break;
    }
    
    // Display the result
    if (result) {
      ui?.notifications?.info(`Generated: ${result}`);
      
      // Copy to clipboard
      navigator.clipboard.writeText(result).then(() => {
        ui?.notifications?.info('Copied to clipboard!');
      });
    }
  };
</script>

<style lang="scss">
.wcb-play-generators {
  display: flex;
  flex-wrap: wrap;
  padding: 5px;
  background-color: var(--wcb-header-background);
  border-bottom: 1px solid var(--wcb-header-border-color);

  .wcb-generator-button {
    margin: 2px;
    padding: 5px 10px;
    border-radius: 4px;
    background-color: var(--wcb-header-nav-btn-background);
    color: var(--wcb-header-nav-color);
    border: 1px solid var(--wcb-header-nav-btn-border);
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    
    i {
      margin-right: 5px;
    }

    &:hover {
      background-color: var(--wcb-header-nav-btn-background-hover);
      box-shadow: 0 0 5px rgba(255, 0, 0, 0.5);
    }
  }
}
</style>