defmodule BackendWeb.Router do
  use BackendWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :protect_from_forgery

    plug :put_secure_browser_headers, %{
      "content-security-policy" =>
        "default-src 'self'; connect-src 'self' http://127.0.0.1:5173 ws://127.0.0.1:5173; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data:"
    }
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api", BackendWeb do
    pipe_through :api

    get "/health", HealthController, :show
    get "/recipes", RecipeController, :index
    get "/recipes/:id", RecipeController, :show
    get "/config", ConfigController, :show
    put "/config", ConfigController, :update
    get "/meal-plan", MealPlanController, :show
    put "/meal-plan", MealPlanController, :update
    get "/shopping-plan", ShoppingPlanController, :show
  end

  scope "/", BackendWeb do
    pipe_through :browser

    get "/*path", SpaController, :index
  end
end
