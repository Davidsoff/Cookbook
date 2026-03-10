defmodule BackendWeb.RecipeController do
  use BackendWeb, :controller

  alias Backend.Cookbook

  def index(conn, _params) do
    json(conn, %{recipes: Cookbook.list_recipes()})
  end

  def show(conn, %{"id" => id}) do
    case Cookbook.get_recipe(id) do
      {:ok, recipe} -> json(conn, recipe)
      {:error, :not_found} -> send_resp(conn, :not_found, "")
    end
  end
end
