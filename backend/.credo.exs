%{
  configs: [
    %{
      name: "default",
      files: %{
        included: ["lib/", "test/", "mix.exs"],
        excluded: [~r"/deps/", ~r"/_build/"]
      },
      plugins: [],
      requires: [],
      strict: false,
      color: true,
      checks: [
        {Credo.Check.Refactor.Nesting, false},
        {Credo.Check.Design.AliasUsage, false},
        {Credo.Check.Readability.AliasOrder, false},
        {Credo.Check.Readability.ParenthesesOnZeroArityDefs, false}
      ]
    }
  ]
}
