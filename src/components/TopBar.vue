<script setup lang="ts">
defineProps<{
  sourceSummary: string;
}>();
</script>

<template>
  <header class="topbar">
    <div class="title-group">
      <h1>Cooklang Cook Mode</h1>
      <p>{{ sourceSummary }}</p>
    </div>
  </header>
</template>
