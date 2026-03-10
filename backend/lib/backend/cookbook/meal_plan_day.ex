defmodule Backend.Cookbook.MealPlanDay do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset

  schema "meal_plan_days" do
    field :date_iso, :string
    field :recipe_path, :string
    field :servings, :integer, default: 1

    timestamps(type: :utc_datetime)
  end

  def changeset(day, attrs) do
    day
    |> cast(attrs, [:date_iso, :recipe_path, :servings])
    |> validate_required([:date_iso, :servings])
    |> validate_number(:servings, greater_than: 0, less_than_or_equal_to: 64)
    |> unique_constraint(:date_iso)
  end
end
