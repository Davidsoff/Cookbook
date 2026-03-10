defmodule Backend.Cookbook.AppSetting do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset

  schema "app_settings" do
    field :mode, :string, default: "backend-api"
    field :github_owner, :string, default: ""
    field :github_repo, :string, default: ""
    field :github_ref, :string, default: "main"
    field :recipes_path, :string, default: "recipes/"
    field :aisle_path, :string, default: "config/aisle.conf"
    field :pantry_path, :string, default: "config/pantry.conf"
    field :default_unit_system, :string, default: "metric"

    timestamps(type: :utc_datetime)
  end

  def changeset(setting, attrs) do
    setting
    |> cast(attrs, [
      :mode,
      :github_owner,
      :github_repo,
      :github_ref,
      :recipes_path,
      :aisle_path,
      :pantry_path,
      :default_unit_system
    ])
    |> validate_required([:mode, :recipes_path, :aisle_path, :pantry_path, :default_unit_system])
  end
end
