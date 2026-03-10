defmodule Backend.CookbookTest do
  use Backend.DataCase

  alias Backend.Cookbook
  alias Backend.Repo

  setup do
    tmp_root =
      Path.join(System.tmp_dir!(), "cookbook-backend-#{System.unique_integer([:positive])}")

    recipes_dir = Path.join(tmp_root, "recipes/dinner")
    config_dir = Path.join(tmp_root, "config")
    File.mkdir_p!(recipes_dir)
    File.mkdir_p!(config_dir)

    File.write!(
      Path.join(recipes_dir, "pasta.cook"),
      "---\ntitle: Pasta\nservings: 2\n---\n@pasta{200 g}\n@salt{1 tsp}\n"
    )

    File.write!(Path.join(config_dir, "aisle.conf"), "[Dry]\npasta\n[Spices]\nsalt\n")
    File.write!(Path.join(config_dir, "pantry.conf"), ~s(salt = "2 g"\n))

    previous_root = Application.get_env(:backend, :cookbook_root)
    Application.put_env(:backend, :cookbook_root, tmp_root)

    on_exit(fn ->
      Application.put_env(:backend, :cookbook_root, previous_root)
      File.rm_rf(tmp_root)
    end)

    :ok
  end

  test "lists nested recipes from filesystem" do
    recipes = Cookbook.list_recipes()

    assert [%{path: "recipes/dinner/pasta.cook", title: "Pasta"}] = recipes
  end

  test "updates and reloads shared config" do
    assert {:ok, payload} =
             Cookbook.update_config(%{"defaultUnitSystem" => "us", "recipesPath" => "recipes/"})

    assert payload.sourceSettings.defaultUnitSystem == "us"
    assert payload.shoppingConfig.aisleByIngredient["pasta"] == "Dry"
  end

  test "stores meal plan days idempotently" do
    today = ~D[2026-03-09]

    assert {:ok, _} =
             Cookbook.update_meal_plan(
               %{
                 "days" => [
                   %{
                     "dateIso" => "2026-03-09",
                     "recipePath" => "recipes/dinner/pasta.cook",
                     "servings" => 3
                   }
                 ]
               },
               today
             )

    assert {:ok, week} =
             Cookbook.update_meal_plan(
               %{
                 "days" => [
                   %{
                     "dateIso" => "2026-03-09",
                     "recipePath" => "recipes/dinner/pasta.cook",
                     "servings" => 4
                   }
                 ]
               },
               today
             )

    assert Enum.find(week.days, &(&1.dateIso == "2026-03-09")).servings == 4
    assert Repo.aggregate(Backend.Cookbook.MealPlanDay, :count, :id) == 1
  end

  test "keeps missing planned recipe references in the shared meal plan" do
    today = ~D[2026-03-09]

    assert {:ok, week} =
             Cookbook.update_meal_plan(
               %{
                 "days" => [
                   %{
                     "dateIso" => "2026-03-09",
                     "recipePath" => "recipes/missing.cook",
                     "servings" => 2
                   }
                 ]
               },
               today
             )

    assert Enum.find(week.days, &(&1.dateIso == "2026-03-09")).recipePath ==
             "recipes/missing.cook"
  end

  test "builds a shopping plan from planned meals" do
    today = ~D[2026-03-09]

    {:ok, _} =
      Cookbook.update_meal_plan(
        %{
          "days" => [
            %{
              "dateIso" => "2026-03-09",
              "recipePath" => "recipes/dinner/pasta.cook",
              "servings" => 2
            }
          ]
        },
        today
      )

    shopping = Cookbook.get_shopping_plan(today)

    assert Enum.any?(shopping.categories, fn category ->
             category.category == "Dry" and Enum.any?(category.items, &(&1.name == "pasta"))
           end)
  end
end
