defmodule Backend.Cookbook.RecipeStore do
  @moduledoc false

  def list_raw(settings) do
    root = recipes_root(settings)

    root
    |> walk_recipes(String.trim_trailing(settings.recipes_path, "/"))
    |> Enum.sort_by(& &1.path)
  end

  def get_by_id(settings, id) do
    decoded_path = decode_id(id)

    Enum.find(list_raw(settings), fn recipe -> recipe.path == decoded_path end)
  end

  def encode_id(path), do: Base.url_encode64(path, padding: false)

  def recipe_to_api(recipe) do
    %{
      id: encode_id(recipe.path),
      path: recipe.path,
      name: recipe.name,
      content: recipe.content,
      title: recipe.title,
      description: recipe.description,
      image: recipe.image,
      servingsBase: recipe.servings_base
    }
  end

  def read_shopping_config(settings) do
    %{
      aisleByIngredient:
        parse_aisle_config(
          read_optional(settings_value(settings, :aisle_path, :aislePath, "config/aisle.conf"))
        ),
      pantryByIngredient:
        parse_pantry_config(
          read_optional(settings_value(settings, :pantry_path, :pantryPath, "config/pantry.conf"))
        )
    }
  end

  defp recipes_root(settings) do
    root = Application.fetch_env!(:backend, :cookbook_root)
    Path.expand(settings.recipes_path, root)
  end

  defp read_optional(path) do
    root = Application.fetch_env!(:backend, :cookbook_root)
    file_path = Path.expand(path, root)

    case File.read(file_path) do
      {:ok, content} -> content
      _ -> ""
    end
  end

  defp walk_recipes(root, path_prefix) do
    if File.dir?(root) do
      root
      |> Path.join("**/*.cook")
      |> Path.wildcard()
      |> Enum.map(&build_recipe(root, path_prefix, &1))
    else
      []
    end
  end

  defp build_recipe(root, path_prefix, absolute_path) do
    {:ok, content} = File.read(absolute_path)
    relative_path = Path.relative_to(absolute_path, root) |> String.replace("\\", "/")
    path = Path.join(path_prefix, relative_path) |> String.replace("\\", "/")
    frontmatter = parse_frontmatter(content)

    %{
      path: path,
      name: path |> Path.basename() |> String.replace_suffix(".cook", ""),
      content: content,
      title: Map.get(frontmatter, "title", ""),
      description: Map.get(frontmatter, "description", ""),
      image: Map.get(frontmatter, "image", ""),
      servings_base: parse_servings(Map.get(frontmatter, "servings", "1"))
    }
  end

  defp parse_frontmatter(content) do
    case Regex.run(~r/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/, content, capture: :all_but_first) do
      [frontmatter] ->
        frontmatter
        |> String.split("\n", trim: true)
        |> Enum.reduce(%{}, fn line, acc ->
          case Regex.run(~r/^\s*([a-zA-Z0-9_-]+)\s*:\s*(.+?)\s*$/, line, capture: :all_but_first) do
            [key, value] -> Map.put(acc, String.downcase(key), String.trim(value))
            _ -> acc
          end
        end)

      _ ->
        %{}
    end
  end

  defp parse_servings(raw) do
    case Integer.parse(to_string(raw)) do
      {servings, _} when servings > 0 -> servings
      _ -> 1
    end
  end

  defp decode_id(id) do
    case Base.url_decode64(id, padding: false) do
      {:ok, value} -> value
      _ -> ""
    end
  end

  defp parse_aisle_config(raw) do
    raw
    |> String.split("\n")
    |> Enum.reduce({%{}, "Other"}, fn line, {acc, current_category} ->
      trimmed = String.trim(line)

      cond do
        trimmed == "" or String.starts_with?(trimmed, "#") ->
          {acc, current_category}

        Regex.match?(~r/^\[(.+)]$/, trimmed) ->
          [_, category] = Regex.run(~r/^\[(.+)]$/, trimmed)
          {acc, String.trim(category)}

        true ->
          next_acc =
            trimmed
            |> String.split("|")
            |> Enum.reduce(acc, fn part, inner_acc ->
              item = normalize_name(part)
              if item == "", do: inner_acc, else: Map.put(inner_acc, item, current_category)
            end)

          {next_acc, current_category}
      end
    end)
    |> elem(0)
  end

  defp parse_pantry_config(raw) do
    raw
    |> String.split("\n")
    |> Enum.reduce(%{}, fn line, acc ->
      trimmed = String.trim(line)

      cond do
        trimmed == "" or String.starts_with?(trimmed, "#") or String.starts_with?(trimmed, "[") ->
          acc

        Regex.match?(~r/^"?([^"=]+)"?\s*=\s*"([^"]+)"$/, trimmed) ->
          [_, ingredient, quantity] = Regex.run(~r/^"?([^"=]+)"?\s*=\s*"([^"]+)"$/, trimmed)
          Map.put(acc, normalize_name(ingredient), parse_pantry_quantity(quantity))

        Regex.match?(~r/^"?([^"=]+)"?\s*=\s*\{([^}]*)}$/, trimmed) ->
          [_, ingredient, fields] = Regex.run(~r/^"?([^"=]+)"?\s*=\s*\{([^}]*)}$/, trimmed)

          quantity =
            case Regex.run(~r/quantity\s*=\s*"([^"]+)"/, fields, capture: :all_but_first) do
              [value] -> value
              _ -> ""
            end

          Map.put(acc, normalize_name(ingredient), parse_pantry_quantity(quantity))

        true ->
          acc
      end
    end)
  end

  defp parse_pantry_quantity(quantity) do
    {amount, unit} = parse_quantity(quantity)
    %{amount: amount, unit: unit}
  end

  defp parse_quantity(raw) do
    trimmed = String.trim(raw)

    case Regex.run(~r/^(=?-?\d+(?:\.\d+)?(?:\s+\d+\/\d+|\/\d+)?)\s*(.*)$/, trimmed,
           capture: :all_but_first
         ) do
      [amount_raw, unit] ->
        {parse_number(String.trim_leading(String.trim(amount_raw), "=")), String.trim(unit)}

      _ ->
        {nil, ""}
    end
  end

  defp parse_number(value) do
    cond do
      Regex.match?(~r/^-?\d+(?:\.\d+)?$/, value) ->
        case Float.parse(value) do
          {parsed, _} -> parsed
          :error -> nil
        end

      Regex.match?(~r/^-?\d+\/\d+$/, value) ->
        [n, d] = String.split(value, "/")
        String.to_integer(n) / String.to_integer(d)

      Regex.match?(~r/^-?\d+\s+\d+\/\d+$/, value) ->
        [whole, fraction] = String.split(value)
        [n, d] = String.split(fraction, "/")
        String.to_integer(whole) + String.to_integer(n) / String.to_integer(d)

      true ->
        nil
    end
  end

  defp normalize_name(value), do: value |> String.trim() |> String.downcase()

  defp settings_value(settings, snake_key, camel_key, default) do
    cond do
      is_map(settings) and Map.has_key?(settings, snake_key) -> Map.get(settings, snake_key)
      is_map(settings) and Map.has_key?(settings, camel_key) -> Map.get(settings, camel_key)
      true -> default
    end
  end
end
