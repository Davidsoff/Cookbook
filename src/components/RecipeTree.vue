<script setup lang="ts">
import type { TreeFolderNode } from "../types/tree";
import RecipeTreeNode from "./RecipeTreeNode.vue";
import RecipeTreeRecipeItem from "./RecipeTreeRecipeItem.vue";

defineProps<{
  root: TreeFolderNode;
  expandedFolders: Set<string>;
  activePath: string;
}>();

const emit = defineEmits<{
  (e: "toggle-folder", path: string): void;
  (e: "select-recipe", path: string): void;
}>();
</script>

<template>
  <ul class="tree-list">
    <RecipeTreeNode
      v-for="folder in root.folders"
      :key="folder.path"
      :node="folder"
      :depth="0"
      :expanded-folders="expandedFolders"
      :active-path="activePath"
      @toggle-folder="emit('toggle-folder', $event)"
      @select-recipe="emit('select-recipe', $event)"
    />
    <RecipeTreeRecipeItem
      v-for="recipe in root.recipes"
      :key="recipe.path"
      :name="recipe.name"
      :path="recipe.path"
      :depth="0"
      :active-path="activePath"
      @select-recipe="emit('select-recipe', $event)"
    />
  </ul>
</template>
