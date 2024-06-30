<template>
  <h1>{{ props.title }}</h1>
  {{ props.content }}
  {{ calculateNumber(4) }}
</template> 

<script setup lang="ts">
  const props = defineProps({
    title: {
      type: String,
      default: 'Hello Vue 3',
    },
    content: {
      type: String,
      default: '',
    }
  })

  const calculateNumber = (x:Number): Number => (n+3);

</script>
