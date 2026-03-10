defmodule Backend.Cookbook do
  @moduledoc false

  import Ecto.Query

  alias Backend.Cookbook.{
    AppSetting,
    MealPlan,
    MealPlanDay,
    RecipeStore,
    Shopping,
    SourceSettings
  }

  alias Backend.Repo

  def get_config do
    setting = get_or_create_setting()
    shopping_config = RecipeStore.read_shopping_config(setting)

    %{
      sourceSettings: SourceSettings.to_api(setting),
      shoppingConfig: shopping_config
    }
  end

  def update_config(attrs) do
    normalized = SourceSettings.normalize(attrs)
    setting = get_or_create_setting()

    setting
    |> AppSetting.changeset(%{
      mode: normalized["mode"],
      github_owner: normalized["github_owner"],
      github_repo: normalized["github_repo"],
      github_ref: normalized["github_ref"],
      recipes_path: normalized["recipes_path"],
      aisle_path: normalized["aisle_path"],
      pantry_path: normalized["pantry_path"],
      default_unit_system: normalized["default_unit_system"]
    })
    |> Repo.insert_or_update()
    |> case do
      {:ok, _setting} -> {:ok, get_config()}
      {:error, changeset} -> {:error, changeset}
    end
  end

  def list_recipes do
    get_or_create_setting()
    |> RecipeStore.list_raw()
    |> Enum.map(&RecipeStore.recipe_to_api/1)
  end

  def get_recipe(id) do
    get_or_create_setting()
    |> RecipeStore.get_by_id(id)
    |> case do
      nil -> {:error, :not_found}
      recipe -> {:ok, RecipeStore.recipe_to_api(recipe)}
    end
  end

  def get_meal_plan(today \\ Date.utc_today()) do
    rows = Repo.all(from day in MealPlanDay, order_by: day.date_iso)
    MealPlan.rebase_week(rows, today)
  end

  def update_meal_plan(attrs, today \\ Date.utc_today()) do
    with {:ok, days} <- MealPlan.normalize_payload(attrs),
         :ok <- persist_meal_plan_days(days) do
      {:ok, get_meal_plan(today)}
    end
  end

  def get_shopping_plan(today \\ Date.utc_today()) do
    config = get_or_create_setting()
    recipes = RecipeStore.list_raw(config)
    meal_plan = get_meal_plan(today)

    %{
      categories: Shopping.build(recipes, meal_plan, config)
    }
  end

  defp persist_meal_plan_days(days) do
    Repo.transaction(fn ->
      Enum.each(days, fn day ->
        existing = Repo.get_by(MealPlanDay, date_iso: day.date_iso)

        changeset =
          (existing || %MealPlanDay{})
          |> MealPlanDay.changeset(day)

        case Repo.insert_or_update(changeset) do
          {:ok, _} -> :ok
          {:error, changeset} -> Repo.rollback(changeset)
        end
      end)
    end)
    |> case do
      {:ok, _} -> :ok
      {:error, changeset} -> {:error, changeset}
    end
  end

  defp get_or_create_setting do
    Repo.one(AppSetting) ||
      %AppSetting{}
      |> AppSetting.changeset(SourceSettings.default())
      |> Repo.insert!()
  end
end
