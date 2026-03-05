<script setup lang="ts">
defineProps<{
  name: string;
  path: string;
  activePath: string;
  depth: number;
}>();

const emit = defineEmits<{
  (e: "select-recipe", path: string): void;
}>();

function onKey(event: KeyboardEvent, path: string) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    emit("select-recipe", path);
  }
}
</script>

<template>
  <li>
    <button
      class="tree-recipe"
      :class="{ active: activePath === path }"
      :style="{ paddingLeft: `${depth * 16 + 12}px` }"
      type="button"
      @click="emit('select-recipe', path)"
      @keydown="onKey($event, path)"
    >
      {{ name }}
    </button>
  </li>
</template>
