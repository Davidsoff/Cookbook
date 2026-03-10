defmodule BackendWeb.FallbackController do
  use BackendWeb, :controller

  def not_found(conn, _params) do
    BackendWeb.SpaController.index(conn, %{})
  end
end
