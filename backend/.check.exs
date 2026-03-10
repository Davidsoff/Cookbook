[
  tools: [
    {:compiler, [command: "mix compile --warnings-as-errors", order: -10]},
    {:unused_deps, true},
    {:formatter, [command: "mix format --check-formatted", order: -9]},
    {:ex_unit, [order: -8]},
    {:credo, [order: -7]},
    {:sobelow,
     [command: "mix sobelow --exit --threshold high", env: %{"HOME" => File.cwd!()}, order: -6]},
    {:mix_audit, [env: %{"HOME" => File.cwd!()}, order: -5]},
    {:dialyzer, false},
    {:doctor, false},
    {:ex_doc, false},
    {:gettext, false},
    {:npm_test, false}
  ]
]
