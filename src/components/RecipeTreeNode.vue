<script setup lang="ts">
import type { TreeFolderNode } from "../types/tree";
import RecipeTreeRecipeItem from "./RecipeTreeRecipeItem.vue";

defineProps<{
  node: TreeFolderNode;
  depth: number;
  expandedFolders: Set<string>;
  activePath: string;
}>();

const emit = defineEmits<{
  (e: "toggle-folder", path: string): void;
  (e: "select-recipe", path: string): void;
}>();

function onFolderKey(event: KeyboardEvent, path: string) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    emit("toggle-folder", path);
  }
}

function onRecipeSelect(path: string) {
  emit("select-recipe", path);
}
</script>

<template>
  <li>
    <div
      class="tree-folder"
      tabindex="0"
      role="button"
      :aria-expanded="expandedFolders.has(node.path)"
      :style="{ paddingLeft: `${depth * 16 + 12}px` }"
      @click="emit('toggle-folder', node.path)"
      @keydown="onFolderKey($event, node.path)"
    >
      <span class="tree-chevron" :class="{ open: expandedFolders.has(node.path) }">▸</span>
      <span>{{ node.name }}</span>
    </div>
    <ul v-if="expandedFolders.has(node.path)" class="tree-list">
      <RecipeTreeNode
        v-for="folder in node.folders"
        :key="folder.path"
        :node="folder"
        :depth="depth + 1"
        :expanded-folders="expandedFolders"
        :active-path="activePath"
        @toggle-folder="emit('toggle-folder', $event)"
        @select-recipe="onRecipeSelect"
      />
      <RecipeTreeRecipeItem
        v-for="recipe in node.recipes"
        :key="recipe.path"
        :name="recipe.name"
        :path="recipe.path"
        :depth="depth + 1"
        :active-path="activePath"
        @select-recipe="onRecipeSelect"
      />
    </ul>
  </li>
</template>
