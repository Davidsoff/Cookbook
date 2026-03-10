defmodule Backend.Cookbook.Shopping do
  @moduledoc false

  alias Backend.Cookbook.RecipeStore

  @unit_defs %{
    "g" => %{dimension: :weight, to_base: 1.0},
    "kg" => %{dimension: :weight, to_base: 1000.0},
    "oz" => %{dimension: :weight, to_base: 28.349523125},
    "lb" => %{dimension: :weight, to_base: 453.59237},
    "ml" => %{dimension: :volume, to_base: 1.0},
    "l" => %{dimension: :volume, to_base: 1000.0},
    "tsp_us" => %{dimension: :volume, to_base: 4.92892159375},
    "tbsp_us" => %{dimension: :volume, to_base: 14.78676478125},
    "floz_us" => %{dimension: :volume, to_base: 29.5735295625},
    "cup_us" => %{dimension: :volume, to_base: 236.5882365}
  }

  @unit_aliases %{
    "g" => "g",
    "gram" => "g",
    "grams" => "g",
    "kg" => "kg",
    "kilogram" => "kg",
    "kilograms" => "kg",
    "oz" => "oz",
    "ounce" => "oz",
    "ounces" => "oz",
    "lb" => "lb",
    "lbs" => "lb",
    "pound" => "lb",
    "pounds" => "lb",
    "ml" => "ml",
    "milliliter" => "ml",
    "milliliters" => "ml",
    "millilitre" => "ml",
    "millilitres" => "ml",
    "l" => "l",
    "liter" => "l",
    "liters" => "l",
    "litre" => "l",
    "litres" => "l",
    "tsp" => "tsp_us",
    "teaspoon" => "tsp_us",
    "teaspoons" => "tsp_us",
    "tbsp" => "tbsp_us",
    "tablespoon" => "tbsp_us",
    "tablespoons" => "tbsp_us",
    "fl oz" => "floz_us",
    "floz" => "floz_us",
    "cup" => "cup_us",
    "cups" => "cup_us",
    "c" => "cup_us"
  }

  def build(categories_source, meal_plan, settings) do
    shopping_config = RecipeStore.read_shopping_config(settings)
    recipes_by_path = Map.new(categories_source, fn recipe -> {recipe.path, recipe} end)

    buckets =
      Enum.reduce(meal_plan.days, %{}, fn day, acc ->
        recipe = if day.recipePath, do: Map.get(recipes_by_path, day.recipePath)

        if recipe do
          scale_factor = (day.servings || 1) / max(recipe.servings_base || 1, 1)

          recipe.content
          |> parse_ingredients()
          |> Enum.reduce(acc, fn ingredient, inner_acc ->
            add_ingredient(inner_acc, ingredient, scale_factor)
          end)
        else
          acc
        end
      end)
      |> subtract_pantry(shopping_config.pantryByIngredient)

    buckets
    |> Enum.reduce(%{}, fn {_key, bucket}, grouped ->
      parts = []
      unit_system = settings_value(settings, :default_unit_system, :defaultUnitSystem, "metric")

      parts =
        if bucket.weight_base > 0,
          do: [format_base(bucket.weight_base, :weight, unit_system) | parts],
          else: parts

      parts =
        if bucket.volume_base > 0,
          do: [format_base(bucket.volume_base, :volume, unit_system) | parts],
          else: parts

      parts =
        Enum.reduce(bucket.unknown, parts, fn {unit, amount}, list ->
          if amount > 0, do: [format_amount(amount, unit) | list], else: list
        end)

      if parts == [] do
        grouped
      else
        category =
          Map.get(shopping_config.aisleByIngredient, String.downcase(bucket.name), "Other")

        item = %{name: bucket.name, quantityText: parts |> Enum.reverse() |> Enum.join(" + ")}
        Map.update(grouped, category, [item], &[item | &1])
      end
    end)
    |> Enum.map(fn {category, items} ->
      %{category: category, items: Enum.sort_by(items, & &1.name)}
    end)
    |> Enum.sort_by(& &1.category)
  end

  defp add_ingredient(acc, ingredient, scale_factor) do
    key = String.downcase(ingredient.name)

    bucket =
      Map.get(acc, key, %{name: ingredient.name, weight_base: 0.0, volume_base: 0.0, unknown: %{}})

    if is_nil(ingredient.numeric) do
      acc
    else
      scaled_amount = ingredient.numeric * if(ingredient.fixed, do: 1, else: scale_factor)

      case to_base_quantity(scaled_amount, ingredient.unit) do
        %{dimension: :weight, amount: amount} ->
          put_in(acc[key], %{bucket | weight_base: bucket.weight_base + amount})

        %{dimension: :volume, amount: amount} ->
          put_in(acc[key], %{bucket | volume_base: bucket.volume_base + amount})

        nil ->
          unit_key = normalize_unit_key(ingredient.unit)
          unknown = Map.update(bucket.unknown, unit_key, scaled_amount, &(&1 + scaled_amount))
          put_in(acc[key], %{bucket | unknown: unknown})
      end
    end
  end

  defp subtract_pantry(buckets, pantry_by_ingredient) do
    Enum.reduce(buckets, %{}, fn {key, bucket}, acc ->
      pantry = Map.get(pantry_by_ingredient, key)

      next_bucket =
        case pantry do
          %{"amount" => amount, "unit" => unit} -> subtract_bucket(bucket, amount, unit)
          %{amount: amount, unit: unit} -> subtract_bucket(bucket, amount, unit)
          _ -> bucket
        end

      Map.put(acc, key, next_bucket)
    end)
  end

  defp subtract_bucket(bucket, nil, _unit), do: bucket

  defp subtract_bucket(bucket, amount, unit) do
    case to_base_quantity(amount, unit) do
      %{dimension: :weight, amount: pantry_amount} ->
        %{bucket | weight_base: max(bucket.weight_base - pantry_amount, 0.0)}

      %{dimension: :volume, amount: pantry_amount} ->
        %{bucket | volume_base: max(bucket.volume_base - pantry_amount, 0.0)}

      nil ->
        bucket
    end
  end

  defp parse_ingredients(content) do
    body = Regex.replace(~r/^---\s*\n[\s\S]*?\n---\s*(?:\n|$)/, content, "")
    body = Regex.replace(~r/\[-[\s\S]*?-]/, body, " ")
    body = Regex.replace(~r/--.*$/m, body, "")

    Regex.scan(
      ~r/@([^@#~{}\n]+?)\{([^}]*)\}(?:\(([^)]*)\))?|@([^\s{}.,;:!?()[\]]+)(?:\(([^)]*)\))?/,
      body
    )
    |> Enum.map(fn match ->
      name = normalize_token_name(Enum.at(match, 1) || Enum.at(match, 4) || "")
      quantity = parse_quantity(Enum.at(match, 2) || "")
      %{name: name, numeric: quantity.numeric, unit: quantity.unit, fixed: quantity.fixed}
    end)
    |> Enum.filter(&(&1.name != ""))
  end

  defp parse_quantity(raw) do
    trimmed = String.trim(raw || "")

    cond do
      trimmed == "" ->
        %{numeric: nil, unit: "", fixed: false}

      String.contains?(trimmed, "%") ->
        [amount | unit_parts] = String.split(trimmed, "%")
        parse_amount(amount, Enum.join(unit_parts, "%"))

      true ->
        case Regex.run(~r/^(=?-?\d+(?:\.\d+)?(?:\s+\d+\/\d+|\/\d+)?)\s+(.+)$/, trimmed,
               capture: :all_but_first
             ) do
          [amount, unit] ->
            parse_amount(amount, unit)

          _ ->
            %{
              numeric: parse_number(String.trim_leading(trimmed, "=")),
              unit: "",
              fixed: String.starts_with?(trimmed, "=")
            }
        end
    end
  end

  defp parse_amount(amount, unit) do
    amount_raw = String.trim(amount)
    fixed = String.starts_with?(amount_raw, "=")
    normalized_amount = if fixed, do: String.trim_leading(amount_raw, "="), else: amount_raw

    %{
      numeric: parse_number(String.trim(normalized_amount)),
      unit: String.trim(unit),
      fixed: fixed
    }
  end

  defp parse_number(value) do
    cond do
      value == "" ->
        nil

      Regex.match?(~r/^-?\d+$/, value) ->
        String.to_integer(value) * 1.0

      Regex.match?(~r/^-?\d+\.\d+$/, value) ->
        String.to_float(value)

      Regex.match?(~r/^-?\d+\/\d+$/, value) ->
        [n, d] = String.split(value, "/")
        if String.to_integer(d) == 0, do: nil, else: String.to_integer(n) / String.to_integer(d)

      Regex.match?(~r/^-?\d+\s+\d+\/\d+$/, value) ->
        [whole, fraction] = String.split(value)
        [n, d] = String.split(fraction, "/")

        if String.to_integer(d) == 0,
          do: nil,
          else: String.to_integer(whole) + String.to_integer(n) / String.to_integer(d)

      true ->
        nil
    end
  end

  defp normalize_token_name(name) do
    name
    |> String.replace(~r/\s+/, " ")
    |> String.replace(~r/^[,.;:]+|[,.;:]+$/, "")
    |> String.trim()
  end

  defp normalize_unit_key(unit) do
    normalized =
      unit
      |> to_string()
      |> String.trim()
      |> String.downcase()
      |> String.replace(".", "")
      |> String.replace(~r/\s+/, " ")
      |> String.replace(~r/^us\s+/, "")
      |> String.replace(~r/\s+us$/, "")
      |> String.trim()

    cond do
      Map.has_key?(@unit_defs, normalized) -> normalized
      Map.has_key?(@unit_aliases, normalized) -> @unit_aliases[normalized]
      true -> Map.get(@unit_aliases, String.replace(normalized, " ", ""), "")
    end
  end

  defp to_base_quantity(amount, _unit) when is_nil(amount), do: nil

  defp to_base_quantity(amount, unit) do
    key = normalize_unit_key(unit)

    case @unit_defs[key] do
      nil ->
        nil

      %{dimension: dimension, to_base: to_base} ->
        %{dimension: dimension, amount: amount * to_base}
    end
  end

  defp format_base(base_amount, dimension, unit_system) do
    {amount, label} =
      case {unit_system, dimension} do
        {"us", :weight} when base_amount >= 453.59237 -> {base_amount / 453.59237, "lb"}
        {"us", :weight} -> {base_amount / 28.349523125, "oz"}
        {"us", :volume} when base_amount >= 236.5882365 -> {base_amount / 236.5882365, "cup"}
        {"us", :volume} -> {base_amount / 29.5735295625, "fl oz"}
        {_, :weight} when base_amount >= 1000 -> {base_amount / 1000, "kg"}
        {_, :weight} -> {base_amount, "g"}
        {_, :volume} when base_amount >= 1000 -> {base_amount / 1000, "l"}
        {_, :volume} -> {base_amount, "ml"}
      end

    format_amount(amount, label)
  end

  defp format_amount(amount, unit) do
    rounded =
      if abs(amount - Float.round(amount)) < 1.0e-9,
        do: trunc(Float.round(amount)),
        else: Float.round(amount, 2)

    "#{rounded}#{if unit == "", do: "", else: " #{unit}"}"
  end

  defp settings_value(settings, snake_key, camel_key, default) do
    cond do
      is_map(settings) and Map.has_key?(settings, snake_key) -> Map.get(settings, snake_key)
      is_map(settings) and Map.has_key?(settings, camel_key) -> Map.get(settings, camel_key)
      true -> default
    end
  end
end
