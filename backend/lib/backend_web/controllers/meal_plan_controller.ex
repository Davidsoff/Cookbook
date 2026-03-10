defmodule BackendWeb.MealPlanController do
  use BackendWeb, :controller

  alias Backend.Cookbook

  def show(conn, _params) do
    json(conn, Cookbook.get_meal_plan())
  end

  def update(conn, params) do
    case Cookbook.update_meal_plan(params) do
      {:ok, meal_plan} ->
        json(conn, meal_plan)

      {:error, changeset} ->
        conn |> put_status(:unprocessable_entity) |> json(%{errors: changeset_errors(changeset)})
    end
  end

  defp changeset_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {message, _opts} -> message end)
  end
end
