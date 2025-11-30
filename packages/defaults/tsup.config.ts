import { defineConfig } from "tsup";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

/**
 * esbuild plugin to load YAML files as JavaScript modules
 */
const yamlPlugin = {
  name: "yaml",
  setup(build: any) {
    build.onLoad({ filter: /\.yaml$/ }, (args: { path: string }) => {
      const content = readFileSync(args.path, "utf8");
      const parsed = parse(content);
      return {
        contents: `export default ${JSON.stringify(parsed, null, 2)}`,
        loader: "js",
      };
    });

    build.onLoad({ filter: /\.md$/ }, (args: { path: string }) => {
      const content = readFileSync(args.path, "utf8");
      return {
        contents: `export default ${JSON.stringify(content)}`,
        loader: "js",
      };
    });
  },
};

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  esbuildPlugins: [yamlPlugin],
  // Include YAML and MD files in the bundle
  loader: {
    ".yaml": "copy",
    ".md": "copy",
  },
});
