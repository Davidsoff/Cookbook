defmodule BackendWeb.ConfigController do
  use BackendWeb, :controller

  alias Backend.Cookbook

  def show(conn, _params) do
    json(conn, Cookbook.get_config())
  end

  def update(conn, params) do
    attrs = Map.get(params, "sourceSettings", params)

    case Cookbook.update_config(attrs) do
      {:ok, config} ->
        json(conn, config)

      {:error, changeset} ->
        conn |> put_status(:unprocessable_entity) |> json(%{errors: changeset_errors(changeset)})
    end
  end

  defp changeset_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {message, _opts} -> message end)
  end
end
