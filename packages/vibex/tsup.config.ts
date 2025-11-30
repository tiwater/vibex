import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  external: ["@vibex/core", "@vibex/local", "@vibex/tools", "@vibex/defaults"],
  noExternal: [], // Don't bundle any workspace packages
  splitting: true,
  clean: true,
  // Skip type resolution for workspace packages
  skipNodeModulesBundle: true,
});
