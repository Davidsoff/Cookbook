user_home = System.user_home!()
mix_home = Path.join(user_home, ".mix")
hex_home = Path.join(user_home, ".hex")

[
  tools: [
    {:compiler, [command: "mix compile --warnings-as-errors", order: -10]},
    {:unused_deps, true},
    {:formatter, [command: "mix format --check-formatted", order: -9]},
    {:ex_unit, [order: -8]},
    {:credo, [order: -7]},
    {:sobelow,
     [
       command: "mix sobelow --exit --threshold high",
       env: %{"HOME" => File.cwd!(), "MIX_HOME" => mix_home, "HEX_HOME" => hex_home},
       order: -6
     ]},
    {:mix_audit,
     [env: %{"HOME" => File.cwd!(), "MIX_HOME" => mix_home, "HEX_HOME" => hex_home}, order: -5]},
    {:dialyzer, false},
    {:doctor, false},
    {:ex_doc, false},
    {:gettext, false},
    {:npm_test, false}
  ]
]
