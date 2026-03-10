<script setup lang="ts">
import { reactive, watch } from "vue";
import type { SourceMode, SourceSettings } from "../types/source-settings";

const props = defineProps<{
  settings: SourceSettings;
}>();

const emit = defineEmits<{
  (e: "save", settings: SourceSettings): void;
  (e: "reset"): void;
}>();

const form = reactive<SourceSettings>({ ...props.settings });

watch(
  () => props.settings,
  (next) => {
    Object.assign(form, next);
  },
  { deep: true },
);

function submit() {
  emit("save", { ...form });
}

function setMode(mode: SourceMode) {
  form.mode = mode;
}
</script>

<template>
  <section class="settings-panel">
    <h3>Source Configuration</h3>
    <p class="settings-help">Choose where recipes and shopping config are loaded from.</p>

    <div class="settings-grid">
      <label>
        <span>Source Mode</span>
        <div class="segmented-control">
          <button class="unit-segment" :class="{ active: form.mode === 'backend-api' }" type="button" @click="setMode('backend-api')">
            Shared Backend
          </button>
          <button class="unit-segment" :class="{ active: form.mode === 'local-http' }" type="button" @click="setMode('local-http')">
            Local HTTP
          </button>
          <button
            class="unit-segment"
            :class="{ active: form.mode === 'github-public' }"
            type="button"
            @click="setMode('github-public')"
          >
            GitHub Public Repo
          </button>
        </div>
      </label>

      <label>
        <span>Default Unit System</span>
        <select v-model="form.defaultUnitSystem">
          <option value="metric">Metric</option>
          <option value="us">US Customary</option>
        </select>
      </label>

      <label>
        <span>Recipes Path</span>
        <input v-model="form.recipesPath" type="text" placeholder="recipes/" />
      </label>

      <label>
        <span>Aisle Config Path</span>
        <input v-model="form.aislePath" type="text" placeholder="config/aisle.conf" />
      </label>

      <label>
        <span>Pantry Config Path</span>
        <input v-model="form.pantryPath" type="text" placeholder="config/pantry.conf" />
      </label>

      <template v-if="form.mode === 'github-public'">
        <label>
          <span>GitHub Owner</span>
          <input v-model="form.githubOwner" type="text" placeholder="octocat" />
        </label>

        <label>
          <span>GitHub Repository</span>
          <input v-model="form.githubRepo" type="text" placeholder="cookbook-recipes" />
        </label>

        <label>
          <span>GitHub Ref (branch/tag/sha)</span>
          <input v-model="form.githubRef" type="text" placeholder="main" />
        </label>
      </template>
    </div>

    <p v-if="form.mode === 'backend-api'" class="settings-help">
      Shared backend mode stores settings and meal plans in Phoenix/SQLite and loads recipes from files on the backend host.
    </p>

    <div class="settings-actions">
      <button type="button" @click="submit">Save Settings</button>
      <button type="button" @click="emit('reset')">Reset Defaults</button>
    </div>
  </section>
</template>
