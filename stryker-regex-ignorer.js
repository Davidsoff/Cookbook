import { PluginKind, declareValuePlugin } from "@stryker-mutator/api/plugin";

export const strykerPlugins = [
  declareValuePlugin(PluginKind.Ignore, "parser-regex-literals", {
    shouldIgnore(path) {
      const filename = path.hub?.file?.opts?.filename || "";
      const inParserFile =
        filename.endsWith("/src/lib/cooklang.ts") ||
        filename.endsWith("/src/lib/units.ts") ||
        filename.endsWith("/src/lib/shopping.ts");

      if (inParserFile && path.isRegExpLiteral()) {
        return "Regex grammar variants in parser/config parsing are intentionally broad; mutating these literals is low-signal for this project.";
      }
    },
  }),
];
