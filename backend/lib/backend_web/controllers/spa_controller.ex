defmodule BackendWeb.SpaController do
  use BackendWeb, :controller

  def index(conn, _params) do
    index_path = Path.join(:code.priv_dir(:backend), "static/index.html")

    if File.exists?(index_path) do
      conn
      |> put_resp_content_type("text/html")
      |> send_file(200, index_path)
    else
      html(conn, """
      <html>
        <body>
          <h1>Cookbook backend is running</h1>
          <p>In development, open the Vite dev server URL.</p>
        </body>
      </html>
      """)
    end
  end
end
