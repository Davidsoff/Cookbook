export type SourceMode = "backend-api" | "local-http" | "github-public";

export interface SourceSettings {
  mode: SourceMode;
  githubOwner: string;
  githubRepo: string;
  githubRef: string;
  recipesPath: string;
  aislePath: string;
  pantryPath: string;
  defaultUnitSystem: "metric" | "us";
}
