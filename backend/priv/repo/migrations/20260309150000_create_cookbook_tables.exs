defmodule Backend.Repo.Migrations.CreateCookbookTables do
  use Ecto.Migration

  def change do
    create table(:app_settings) do
      add :mode, :string, null: false, default: "backend-api"
      add :github_owner, :string, null: false, default: ""
      add :github_repo, :string, null: false, default: ""
      add :github_ref, :string, null: false, default: "main"
      add :recipes_path, :string, null: false, default: "recipes/"
      add :aisle_path, :string, null: false, default: "config/aisle.conf"
      add :pantry_path, :string, null: false, default: "config/pantry.conf"
      add :default_unit_system, :string, null: false, default: "metric"

      timestamps(type: :utc_datetime)
    end

    create table(:meal_plan_days) do
      add :date_iso, :string, null: false
      add :recipe_path, :string
      add :servings, :integer, null: false, default: 1

      timestamps(type: :utc_datetime)
    end

    create unique_index(:meal_plan_days, [:date_iso])
  end
end
