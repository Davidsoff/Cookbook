defmodule Backend.Cookbook.MealPlan do
  @moduledoc false

  alias Backend.Cookbook.MealPlanDay

  @days 7

  def create_rolling_week(today \\ Date.utc_today()) do
    days =
      0..(@days - 1)
      |> Enum.map(fn offset ->
        date = Date.add(today, offset)

        %{
          dateIso: Date.to_iso8601(date),
          recipePath: nil,
          servings: 1
        }
      end)

    %{
      startDateIso: Date.to_iso8601(today),
      days: days
    }
  end

  def rebase_week(existing_rows, today \\ Date.utc_today()) do
    base = create_rolling_week(today)
    row_by_date = Map.new(existing_rows, fn %MealPlanDay{} = row -> {row.date_iso, row} end)

    days =
      Enum.map(base.days, fn day ->
        case Map.get(row_by_date, day.dateIso) do
          nil ->
            day

          row ->
            %{
              dateIso: day.dateIso,
              recipePath: row.recipe_path,
              servings: normalize_servings(row.servings)
            }
        end
      end)

    %{base | days: days}
  end

  def normalize_payload(%{"days" => days}) when is_list(days) do
    normalized_days =
      Enum.map(days, fn day ->
        %{
          date_iso: Map.get(day, "dateIso") || Map.get(day, :dateIso) || Map.get(day, "date_iso"),
          recipe_path:
            normalize_recipe_path(
              Map.get(day, "recipePath") || Map.get(day, :recipePath) ||
                Map.get(day, "recipe_path")
            ),
          servings: normalize_servings(Map.get(day, "servings") || Map.get(day, :servings) || 1)
        }
      end)

    {:ok, normalized_days}
  rescue
    _ -> {:error, :invalid_payload}
  end

  def normalize_payload(_), do: {:error, :invalid_payload}

  defp normalize_recipe_path(nil), do: nil
  defp normalize_recipe_path(""), do: nil

  defp normalize_recipe_path(path),
    do: path |> to_string() |> String.trim() |> String.trim_leading("/")

  defp normalize_servings(value) when is_integer(value), do: clamp_servings(value)
  defp normalize_servings(value) when is_float(value), do: value |> round() |> clamp_servings()

  defp normalize_servings(value) do
    case Integer.parse(to_string(value)) do
      {parsed, _} -> clamp_servings(parsed)
      :error -> 1
    end
  end

  defp clamp_servings(value), do: value |> max(1) |> min(64)
end
