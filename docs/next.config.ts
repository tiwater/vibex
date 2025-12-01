import nextra from "nextra";

const withNextra = nextra({
  latex: true,
  defaultShowCopyCode: true,
  search: {
    codeblocks: false,
  },
  contentDirBasePath: "/",
});

export default withNextra({
  reactStrictMode: true,
  // Note: Removed "export" output to enable API routes for the playground
  // For static docs hosting, you can add back: output: "export"
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Note: eslint.ignoreDuringBuilds moved to next lint CLI options
  webpack(config, { isServer }) {
    // rule.exclude doesn't work starting from Next.js 15
    const imageRule = config.module.rules.find((rule) =>
      rule.test?.test?.(".svg")
    );
    const { test: _test, ...imageLoaderOptions } = imageRule || {};
    config.module.rules.push({
      test: /\.svg$/,
      oneOf: [
        {
          resourceQuery: /svgr/,
          use: ["@svgr/webpack"],
        },
        imageLoaderOptions,
      ],
    });

    return config;
  },
  // serverExternalPackages works with both webpack and Turbopack
  // These packages should not be bundled - they're server-only dependencies
  serverExternalPackages: ["vibex", "@vibex/local", "shiki", "better-sqlite3"],
  experimental: {
    optimizePackageImports: ["nextra-theme-docs"],
  },
});
