defmodule Backend.Cookbook.SourceSettings do
  @moduledoc false

  @default %{
    mode: "backend-api",
    github_owner: "",
    github_repo: "",
    github_ref: "main",
    recipes_path: "recipes/",
    aisle_path: "config/aisle.conf",
    pantry_path: "config/pantry.conf",
    default_unit_system: "metric"
  }

  def default, do: @default

  def normalize(attrs) when is_map(attrs) do
    attrs
    |> stringify_keys()
    |> remap_api_keys()
    |> Map.merge(stringify_keys(@default), fn _k, incoming, default ->
      if blank?(incoming), do: default, else: incoming
    end)
    |> Map.update!("mode", &normalize_mode/1)
    |> Map.update!("github_owner", &String.trim/1)
    |> Map.update!("github_repo", &String.trim/1)
    |> Map.update!("github_ref", fn value ->
      value |> String.trim() |> default_if_blank("main")
    end)
    |> Map.update!("recipes_path", &normalize_recipes_path/1)
    |> Map.update!("aisle_path", &normalize_path(&1, "config/aisle.conf"))
    |> Map.update!("pantry_path", &normalize_path(&1, "config/pantry.conf"))
    |> Map.update!("default_unit_system", &normalize_unit_system/1)
  end

  def to_api(setting) do
    %{
      mode: setting.mode,
      githubOwner: setting.github_owner,
      githubRepo: setting.github_repo,
      githubRef: setting.github_ref,
      recipesPath: setting.recipes_path,
      aislePath: setting.aisle_path,
      pantryPath: setting.pantry_path,
      defaultUnitSystem: setting.default_unit_system
    }
  end

  defp normalize_mode(value) do
    mode = value |> to_string() |> String.trim()
    if mode in ["backend-api", "local-http", "github-public"], do: mode, else: "backend-api"
  end

  defp normalize_unit_system(value) do
    case value |> to_string() |> String.trim() do
      "us" -> "us"
      _ -> "metric"
    end
  end

  defp normalize_recipes_path(value) do
    value
    |> normalize_path("recipes/")
    |> ensure_trailing_slash()
  end

  defp normalize_path(value, fallback) do
    value
    |> to_string()
    |> String.trim()
    |> String.trim_leading("/")
    |> default_if_blank(fallback)
  end

  defp ensure_trailing_slash(value) do
    if String.ends_with?(value, "/"), do: value, else: value <> "/"
  end

  defp blank?(nil), do: true
  defp blank?(value), do: String.trim(to_string(value)) == ""

  defp default_if_blank(value, fallback) do
    if blank?(value), do: fallback, else: value
  end

  defp stringify_keys(map) do
    Map.new(map, fn {key, value} -> {to_string(key), value} end)
  end

  defp remap_api_keys(map) do
    key_map = %{
      "githubOwner" => "github_owner",
      "githubRepo" => "github_repo",
      "githubRef" => "github_ref",
      "recipesPath" => "recipes_path",
      "aislePath" => "aisle_path",
      "pantryPath" => "pantry_path",
      "defaultUnitSystem" => "default_unit_system"
    }

    Enum.reduce(map, %{}, fn {key, value}, acc ->
      Map.put(acc, Map.get(key_map, key, key), value)
    end)
  end
end
