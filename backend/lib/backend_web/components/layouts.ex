defmodule BackendWeb.Layouts do
  @moduledoc """
  Minimal HTML wrappers shared by backend-rendered responses.
  """
  use BackendWeb, :html

  embed_templates "layouts/*"

  @doc """
  Renders a simple backend layout shell.
  """
  attr :flash, :map, required: true, doc: "the map of flash messages"
  slot :inner_block, required: true

  def app(assigns) do
    ~H"""
    <main class="px-4 py-12 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-2xl space-y-6">
        <header class="space-y-2">
          <p class="text-sm uppercase tracking-[0.2em] text-base-content/60">Cookbook</p>
          <h1 class="text-3xl font-semibold">Backend</h1>
        </header>
        {render_slot(@inner_block)}
      </div>
    </main>

    <.flash_group flash={@flash} />
    """
  end

  @doc """
  Shows backend flash messages when present.
  """
  attr :flash, :map, required: true, doc: "the map of flash messages"
  attr :id, :string, default: "flash-group", doc: "the optional id of flash container"

  def flash_group(assigns) do
    ~H"""
    <div id={@id} aria-live="polite">
      <.flash kind={:info} flash={@flash} />
      <.flash kind={:error} flash={@flash} />
    </div>
    """
  end
end
