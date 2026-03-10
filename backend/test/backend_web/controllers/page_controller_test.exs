defmodule BackendWeb.PageControllerTest do
  use BackendWeb.ConnCase

  test "GET / returns the SPA shell or dev fallback", %{conn: conn} do
    conn = get(conn, ~p"/")
    assert html_response(conn, 200) =~ "Cookbook backend is running"
  end
end
