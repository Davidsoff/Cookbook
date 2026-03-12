defmodule BackendWeb.ApiControllerTest do
  use BackendWeb.ConnCase

  setup do
    tmp_root =
      Path.join(System.tmp_dir!(), "cookbook-backend-api-#{System.unique_integer([:positive])}")

    recipes_dir = Path.join(tmp_root, "recipes")
    config_dir = Path.join(tmp_root, "config")
    File.mkdir_p!(recipes_dir)
    File.mkdir_p!(config_dir)

    File.write!(
      Path.join(recipes_dir, "toast.cook"),
      "---\ntitle: Toast\nservings: 1\n---\n@bread{2 slice}\n"
    )

    File.write!(Path.join(config_dir, "aisle.conf"), "[Bakery]\nbread\n")
    File.write!(Path.join(config_dir, "pantry.conf"), "")

    previous_root = Application.get_env(:backend, :cookbook_root)
    Application.put_env(:backend, :cookbook_root, tmp_root)

    on_exit(fn ->
      Application.put_env(:backend, :cookbook_root, previous_root)
      File.rm_rf(tmp_root)
    end)

    :ok
  end

  test "GET /api/health", %{conn: conn} do
    conn = get(conn, ~p"/api/health")
    assert json_response(conn, 200) == %{"status" => "ok"}
  end

  test "config endpoints return shared settings", %{conn: conn} do
    conn = get(conn, ~p"/api/config")
    assert json_response(conn, 200)["sourceSettings"]["mode"] == "backend-api"

    conn =
      put(conn, ~p"/api/config", %{
        sourceSettings: %{defaultUnitSystem: "us", recipesPath: "recipes/"}
      })

    assert json_response(conn, 200)["sourceSettings"]["defaultUnitSystem"] == "us"
  end

  test "recipe and meal plan endpoints return json", %{conn: conn} do
    today_iso = Date.utc_today() |> Date.to_iso8601()

    conn = get(conn, ~p"/api/recipes")
    response = json_response(conn, 200)
    [recipe | _] = response["recipes"]
    assert recipe["path"] == "recipes/toast.cook"

    conn =
      put(conn, ~p"/api/meal-plan", %{
        days: [%{dateIso: today_iso, recipePath: "recipes/toast.cook", servings: 2}]
      })

    assert Enum.any?(
             json_response(conn, 200)["days"],
             &(&1["recipePath"] == "recipes/toast.cook")
           )

    conn = get(recycle(conn), ~p"/api/shopping-plan")
    assert Enum.any?(json_response(conn, 200)["categories"], &(&1["category"] == "Bakery"))
  end
end
