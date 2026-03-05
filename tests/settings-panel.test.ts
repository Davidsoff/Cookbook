/** @vitest-environment jsdom */
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SettingsPanel from "../src/components/SettingsPanel.vue";
import type { SourceSettings } from "../src/types/source-settings";

const baseSettings: SourceSettings = {
  mode: "local-http",
  githubOwner: "",
  githubRepo: "",
  githubRef: "main",
  recipesPath: "recipes/",
  aislePath: "config/aisle.conf",
  pantryPath: "config/pantry.conf",
  defaultUnitSystem: "metric",
};

describe("SettingsPanel", () => {
  it("emits saved settings", async () => {
    const wrapper = mount(SettingsPanel, { props: { settings: baseSettings } });

    const inputs = wrapper.findAll("input");
    await inputs[0].setValue("alt-recipes/");
    await wrapper.find("select").setValue("us");
    await wrapper.find(".settings-actions button").trigger("click");

    const payload = wrapper.emitted("save")?.[0]?.[0] as SourceSettings;
    expect(payload.recipesPath).toBe("alt-recipes/");
    expect(payload.defaultUnitSystem).toBe("us");
  });

  it("shows github fields when github source is selected", async () => {
    const wrapper = mount(SettingsPanel, { props: { settings: baseSettings } });

    const modeButtons = wrapper.findAll(".segmented-control button");
    await modeButtons[1].trigger("click");

    expect(wrapper.text()).toContain("GitHub Owner");
    expect(wrapper.text()).toContain("GitHub Repository");
  });
});
