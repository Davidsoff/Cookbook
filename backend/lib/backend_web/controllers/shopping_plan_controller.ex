defmodule BackendWeb.ShoppingPlanController do
  use BackendWeb, :controller

  alias Backend.Cookbook

  def show(conn, _params) do
    json(conn, Cookbook.get_shopping_plan())
  end
end
