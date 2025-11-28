#!/usr/bin/env tsx
/**
 * SDK Documentation Generator
 *
 * Extracts TSDoc comments from TypeScript source files and generates
 * MDX documentation compatible with Nextra.
 *
 * Usage:
 *   pnpm tsx scripts/generate-sdk-docs.ts
 */

import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

// Configuration
const PACKAGES_TO_DOCUMENT = [
  {
    name: "vibex",
    path: "packages/vibex/src",
    outputPath: "docs/content/sdk/vibex",
    description: "Core VibeX framework for building AI agent workspaces",
    github: "https://github.com/tiwater/vibex/blob/main",
  },
  {
    name: "@vibex/react",
    path: "packages/react/src",
    outputPath: "docs/content/sdk/react",
    description: "React hooks and components for VibeX integration",
    github: "https://github.com/tiwater/vibex/blob/main",
  },
  {
    name: "@vibex/core",
    path: "packages/core/src",
    outputPath: "docs/content/sdk/core",
    description: "Core types and interfaces shared across VibeX packages",
    github: "https://github.com/tiwater/vibex/blob/main",
  },
];

// Types for documentation
interface DocEntry {
  name: string;
  kind: "function" | "class" | "interface" | "type" | "variable" | "enum";
  description: string;
  params?: DocParam[];
  returns?: string;
  example?: string;
  deprecated?: string;
  signature?: string;
  members?: DocEntry[];
  filePath: string;
  line: number;
  exported: boolean;
}

interface DocParam {
  name: string;
  type: string;
  description: string;
  optional?: boolean;
  defaultValue?: string;
}

/**
 * Sanitize text for MDX - escape patterns that might be parsed as JSX
 */
function sanitizeForMDX(text: string): string {
  return (
    text
      // Escape arrow patterns that look like JSX tags
      .replace(/<--/g, "‹--")
      .replace(/<-/g, "‹-")
      // Replace curly braces in non-code contexts with HTML entities
      // This handles things like "return createGoogleGenerativeAI({...})"
      .replace(/\{\.\.\.}/g, "{…}")
      // Escape standalone < that might start JSX
      .replace(/<(?![a-zA-Z\/`])/g, "‹")
      // Replace -> { with plain text arrow
      .replace(/->\s*\{/g, "→ \\{")
  );
}

/**
 * Escape a type string for use in markdown tables
 * - Replace | with \| to prevent table column splitting
 * - Collapse multiline types to single line
 * - Truncate very long types
 */
function escapeTypeForMarkdown(type: string): string {
  // Collapse multiline types to single line
  let escaped = type.replace(/\s+/g, " ").trim();

  // If type is very long (complex object types), simplify it
  if (escaped.length > 80 && escaped.includes("{")) {
    // For complex object types, just show a simplified version
    const match = escaped.match(/^\{[^}]*\}/);
    if (match) {
      escaped = "object";
    }
  }

  // Escape special markdown characters
  if (escaped.includes("|") || escaped.includes("{") || escaped.includes("<")) {
    escaped = escaped
      .replace(/\|/g, "\\|")
      .replace(/\{/g, "\\{")
      .replace(/\}/g, "\\}");
  }

  return escaped;
}

interface DocModule {
  name: string;
  description: string;
  exports: DocEntry[];
  filePath: string;
}

// Get the text content from JSDoc comment nodes
function getCommentText(
  comment: string | ts.NodeArray<ts.JSDocComment> | undefined
): string {
  if (!comment) return "";
  if (typeof comment === "string") return comment;
  return comment.map((c) => c.getText()).join("");
}

// Extract JSDoc comment from a node
function getJSDocComment(node: ts.Node, sourceFile: ts.SourceFile): string {
  const fullText = sourceFile.getFullText();
  const nodeStart = node.getFullStart();
  const leadingComments = ts.getLeadingCommentRanges(fullText, nodeStart);

  if (!leadingComments) return "";

  for (const range of leadingComments) {
    const comment = fullText.substring(range.pos, range.end);
    if (comment.startsWith("/**")) {
      // Extract content between /** and */
      const content = comment
        .replace(/^\/\*\*\s*/, "")
        .replace(/\s*\*\/$/, "")
        .split("\n")
        .map((line) => line.replace(/^\s*\*\s?/, ""))
        .filter((line) => !line.startsWith("@"))
        .join("\n")
        .trim();
      // Sanitize for MDX
      return sanitizeForMDX(content);
    }
  }

  return "";
}

// Extract JSDoc tags from a node
function getJSDocTags(
  node: ts.Node,
  sourceFile: ts.SourceFile
): Map<string, string[]> {
  const tags = new Map<string, string[]>();
  const fullText = sourceFile.getFullText();
  const nodeStart = node.getFullStart();
  const leadingComments = ts.getLeadingCommentRanges(fullText, nodeStart);

  if (!leadingComments) return tags;

  for (const range of leadingComments) {
    const comment = fullText.substring(range.pos, range.end);
    if (comment.startsWith("/**")) {
      const lines = comment.split("\n");
      for (const line of lines) {
        const match = line.match(/@(\w+)\s*(.*)/);
        if (match) {
          const [, tagName, tagValue] = match;
          if (!tags.has(tagName)) {
            tags.set(tagName, []);
          }
          tags.get(tagName)!.push(tagValue.replace(/\*\/$/, "").trim());
        }
      }
    }
  }

  return tags;
}

// Get function/method signature as string
function getSignature(
  node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction,
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile
): string {
  const name =
    ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)
      ? node.name?.getText(sourceFile) || "anonymous"
      : "anonymous";

  const params = (node.parameters || [])
    .map((p) => {
      const paramName = p.name.getText(sourceFile);
      const paramType = p.type?.getText(sourceFile) || "any";
      const optional = p.questionToken ? "?" : "";
      const initializer = p.initializer
        ? ` = ${p.initializer.getText(sourceFile)}`
        : "";
      return `${paramName}${optional}: ${paramType}${initializer}`;
    })
    .join(", ");

  const returnType = node.type?.getText(sourceFile) || "void";
  const typeParams = node.typeParameters
    ? `<${node.typeParameters.map((t) => t.getText(sourceFile)).join(", ")}>`
    : "";

  return `function ${name}${typeParams}(${params}): ${returnType}`;
}

// Check if node has export modifier
function isExported(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  const modifiers = ts.getModifiers(node);
  return (
    modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) || false
  );
}

// Process a source file
function processSourceFile(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker
): DocModule {
  const exports: DocEntry[] = [];
  const fileName = path.basename(sourceFile.fileName, ".ts");
  let moduleDescription = "";

  function visit(node: ts.Node) {
    const exported = isExported(node);

    // Function declarations
    if (ts.isFunctionDeclaration(node) && node.name && exported) {
      const comment = getJSDocComment(node, sourceFile);
      const tags = getJSDocTags(node, sourceFile);

      exports.push({
        name: node.name.getText(sourceFile),
        kind: "function",
        description: comment,
        signature: getSignature(node, checker, sourceFile),
        params: extractParams(node, tags, sourceFile),
        returns: tags.get("returns")?.[0] || tags.get("return")?.[0],
        example: tags.get("example")?.[0],
        deprecated: tags.get("deprecated")?.[0],
        filePath: sourceFile.fileName,
        line:
          sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        exported: true,
      });
    }

    // Variable declarations (for exported arrow functions and constants)
    if (ts.isVariableStatement(node) && exported) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const comment = getJSDocComment(node, sourceFile);
          const tags = getJSDocTags(node, sourceFile);

          // Check if it's an arrow function
          if (decl.initializer && ts.isArrowFunction(decl.initializer)) {
            exports.push({
              name: decl.name.getText(sourceFile),
              kind: "function",
              description: comment,
              signature: getSignature(
                decl.initializer,
                checker,
                sourceFile
              ).replace("anonymous", decl.name.getText(sourceFile)),
              params: extractParams(decl.initializer as any, tags, sourceFile),
              returns: tags.get("returns")?.[0] || tags.get("return")?.[0],
              example: tags.get("example")?.[0],
              filePath: sourceFile.fileName,
              line:
                sourceFile.getLineAndCharacterOfPosition(node.getStart()).line +
                1,
              exported: true,
            });
          } else {
            // Regular constant
            const type =
              decl.type?.getText(sourceFile) ||
              (decl.initializer
                ? checker.typeToString(
                    checker.getTypeAtLocation(decl.initializer)
                  )
                : "unknown");
            exports.push({
              name: decl.name.getText(sourceFile),
              kind: "variable",
              description: comment,
              signature: `const ${decl.name.getText(sourceFile)}: ${type}`,
              filePath: sourceFile.fileName,
              line:
                sourceFile.getLineAndCharacterOfPosition(node.getStart()).line +
                1,
              exported: true,
            });
          }
        }
      }
    }

    // Class declarations
    if (ts.isClassDeclaration(node) && node.name && exported) {
      const members: DocEntry[] = [];
      const comment = getJSDocComment(node, sourceFile);

      for (const member of node.members) {
        // Methods
        if (ts.isMethodDeclaration(member) && member.name) {
          const isPublic = !member.modifiers?.some(
            (m) =>
              m.kind === ts.SyntaxKind.PrivateKeyword ||
              m.kind === ts.SyntaxKind.ProtectedKeyword
          );

          if (isPublic) {
            const memberComment = getJSDocComment(member, sourceFile);
            const memberTags = getJSDocTags(member, sourceFile);

            members.push({
              name: member.name.getText(sourceFile),
              kind: "function",
              description: memberComment,
              signature: getSignature(member, checker, sourceFile),
              params: extractParams(member, memberTags, sourceFile),
              returns: memberTags.get("returns")?.[0],
              example: memberTags.get("example")?.[0],
              filePath: sourceFile.fileName,
              line:
                sourceFile.getLineAndCharacterOfPosition(member.getStart())
                  .line + 1,
              exported: true,
            });
          }
        }

        // Properties
        if (ts.isPropertyDeclaration(member) && member.name) {
          const isPublic = !member.modifiers?.some(
            (m) =>
              m.kind === ts.SyntaxKind.PrivateKeyword ||
              m.kind === ts.SyntaxKind.ProtectedKeyword
          );

          if (isPublic) {
            const memberComment = getJSDocComment(member, sourceFile);
            const type = member.type?.getText(sourceFile) || "unknown";

            members.push({
              name: member.name.getText(sourceFile),
              kind: "variable",
              description: memberComment,
              signature: `${member.name.getText(sourceFile)}: ${type}`,
              filePath: sourceFile.fileName,
              line:
                sourceFile.getLineAndCharacterOfPosition(member.getStart())
                  .line + 1,
              exported: true,
            });
          }
        }
      }

      exports.push({
        name: node.name.getText(sourceFile),
        kind: "class",
        description: comment,
        members,
        filePath: sourceFile.fileName,
        line:
          sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        exported: true,
      });
    }

    // Interface declarations
    if (ts.isInterfaceDeclaration(node) && exported) {
      const members: DocEntry[] = [];
      const comment = getJSDocComment(node, sourceFile);

      for (const member of node.members) {
        if (ts.isPropertySignature(member) && member.name) {
          const memberComment = getJSDocComment(member, sourceFile);
          const type = member.type?.getText(sourceFile) || "unknown";
          const optional = member.questionToken ? " (optional)" : "";

          members.push({
            name: member.name.getText(sourceFile),
            kind: "variable",
            description: memberComment + (optional ? ` ${optional}` : ""),
            signature: `${member.name.getText(sourceFile)}${member.questionToken ? "?" : ""}: ${type}`,
            filePath: sourceFile.fileName,
            line:
              sourceFile.getLineAndCharacterOfPosition(member.getStart()).line +
              1,
            exported: true,
          });
        }

        if (ts.isMethodSignature(member) && member.name) {
          const memberComment = getJSDocComment(member, sourceFile);
          const params = member.parameters
            .map(
              (p) =>
                `${p.name.getText(sourceFile)}: ${p.type?.getText(sourceFile) || "any"}`
            )
            .join(", ");
          const returnType = member.type?.getText(sourceFile) || "void";

          members.push({
            name: member.name.getText(sourceFile),
            kind: "function",
            description: memberComment,
            signature: `${member.name.getText(sourceFile)}(${params}): ${returnType}`,
            filePath: sourceFile.fileName,
            line:
              sourceFile.getLineAndCharacterOfPosition(member.getStart()).line +
              1,
            exported: true,
          });
        }
      }

      exports.push({
        name: node.name.getText(sourceFile),
        kind: "interface",
        description: comment,
        members,
        filePath: sourceFile.fileName,
        line:
          sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        exported: true,
      });
    }

    // Type aliases
    if (ts.isTypeAliasDeclaration(node) && exported) {
      const comment = getJSDocComment(node, sourceFile);

      exports.push({
        name: node.name.getText(sourceFile),
        kind: "type",
        description: comment,
        signature: `type ${node.name.getText(sourceFile)} = ${node.type.getText(sourceFile)}`,
        filePath: sourceFile.fileName,
        line:
          sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        exported: true,
      });
    }

    // Enum declarations
    if (ts.isEnumDeclaration(node) && exported) {
      const comment = getJSDocComment(node, sourceFile);
      const members: DocEntry[] = [];

      for (const member of node.members) {
        members.push({
          name: member.name.getText(sourceFile),
          kind: "variable",
          description: "",
          signature: member.initializer?.getText(sourceFile) || "",
          filePath: sourceFile.fileName,
          line:
            sourceFile.getLineAndCharacterOfPosition(member.getStart()).line +
            1,
          exported: true,
        });
      }

      exports.push({
        name: node.name.getText(sourceFile),
        kind: "enum",
        description: comment,
        members,
        filePath: sourceFile.fileName,
        line:
          sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        exported: true,
      });
    }

    ts.forEachChild(node, visit);
  }

  // Get module-level comment from first statement
  if (sourceFile.statements.length > 0) {
    moduleDescription = getJSDocComment(sourceFile.statements[0], sourceFile);
  }

  visit(sourceFile);

  return {
    name: fileName,
    description: moduleDescription,
    exports,
    filePath: sourceFile.fileName,
  };
}

// Extract function parameters
function extractParams(
  node: { parameters?: ts.NodeArray<ts.ParameterDeclaration> },
  tags: Map<string, string[]>,
  sourceFile: ts.SourceFile
): DocParam[] {
  if (!node.parameters) return [];

  const params: DocParam[] = [];
  const paramTags = tags.get("param") || [];

  for (const p of node.parameters) {
    let name = p.name.getText(sourceFile);
    const type = p.type?.getText(sourceFile) || "any";
    const optional = !!p.questionToken;
    const defaultValue = p.initializer?.getText(sourceFile);

    // Handle destructured parameters - simplify to just "options" or the type name
    if (name.includes("{") || name.includes("[")) {
      // For destructured params, use a simplified name
      if (type && type !== "any") {
        // Use type name if available (e.g., "options: UseVibexChatOptions")
        name = "options";
      } else {
        name = "params";
      }
    }

    // Collapse any remaining multiline names
    name = name.replace(/\s+/g, " ").trim();

    // Try to find matching @param tag
    const tagDescription =
      paramTags
        .find((t) => t.startsWith(name) || t.includes(` ${name} `))
        ?.replace(new RegExp(`^${name}\\s*`), "")
        .trim() || "";

    params.push({
      name,
      type,
      description: tagDescription,
      optional,
      defaultValue,
    });
  }

  return params;
}

// Generate MDX content for a module
function generateModuleMDX(
  module: DocModule,
  pkg: (typeof PACKAGES_TO_DOCUMENT)[0]
): string {
  const lines: string[] = [];
  const relativePath = module.filePath.replace(process.cwd() + "/", "");

  // Title
  lines.push(`# ${module.name}`);
  lines.push("");

  // Source link
  lines.push(
    `*Module: [\`${pkg.name}/${module.name}\`](${pkg.github}/${relativePath})*`
  );
  lines.push("");

  if (module.description) {
    lines.push(module.description);
    lines.push("");
  }

  // Group by kind
  const classes = module.exports.filter((e) => e.kind === "class");
  const interfaces = module.exports.filter((e) => e.kind === "interface");
  const types = module.exports.filter((e) => e.kind === "type");
  const functions = module.exports.filter((e) => e.kind === "function");
  const variables = module.exports.filter((e) => e.kind === "variable");
  const enums = module.exports.filter((e) => e.kind === "enum");

  // Classes
  if (classes.length > 0) {
    lines.push("## Classes");
    lines.push("");
    for (const cls of classes) {
      lines.push(...generateEntryMDX(cls, relativePath, pkg.github, 3));
    }
  }

  // Interfaces
  if (interfaces.length > 0) {
    lines.push("## Interfaces");
    lines.push("");
    for (const iface of interfaces) {
      lines.push(...generateEntryMDX(iface, relativePath, pkg.github, 3));
    }
  }

  // Types
  if (types.length > 0) {
    lines.push("## Types");
    lines.push("");
    for (const type of types) {
      lines.push(...generateEntryMDX(type, relativePath, pkg.github, 3));
    }
  }

  // Enums
  if (enums.length > 0) {
    lines.push("## Enums");
    lines.push("");
    for (const e of enums) {
      lines.push(...generateEntryMDX(e, relativePath, pkg.github, 3));
    }
  }

  // Functions
  if (functions.length > 0) {
    lines.push("## Functions");
    lines.push("");
    for (const fn of functions) {
      lines.push(...generateEntryMDX(fn, relativePath, pkg.github, 3));
    }
  }

  // Variables/Constants
  if (variables.length > 0) {
    lines.push("## Constants");
    lines.push("");
    for (const v of variables) {
      lines.push(...generateEntryMDX(v, relativePath, pkg.github, 3));
    }
  }

  return lines.join("\n");
}

// Generate MDX for a single entry
function generateEntryMDX(
  entry: DocEntry,
  relativePath: string,
  github: string,
  level: number
): string[] {
  const lines: string[] = [];
  const heading = "#".repeat(level);
  const sourceLink = `${github}/${relativePath}#L${entry.line}`;

  lines.push(`${heading} ${entry.name}`);
  lines.push("");
  lines.push(
    `<a href="${sourceLink}" className="text-xs text-muted-foreground hover:text-primary">View source</a>`
  );
  lines.push("");

  if (entry.deprecated) {
    lines.push(`> ⚠️ **Deprecated:** ${entry.deprecated}`);
    lines.push("");
  }

  if (entry.description) {
    lines.push(entry.description);
    lines.push("");
  }

  if (entry.signature) {
    lines.push("```typescript");
    lines.push(entry.signature);
    lines.push("```");
    lines.push("");
  }

  // Parameters
  if (entry.params && entry.params.length > 0) {
    lines.push("**Parameters:**");
    lines.push("");
    lines.push("| Name | Type | Description |");
    lines.push("|------|------|-------------|");
    for (const param of entry.params) {
      const optional = param.optional ? " (optional)" : "";
      const defaultVal = param.defaultValue
        ? ` (default: \`${param.defaultValue}\`)`
        : "";
      lines.push(
        `| \`${param.name}\` | \`${escapeTypeForMarkdown(param.type)}\`${optional} | ${param.description}${defaultVal} |`
      );
    }
    lines.push("");
  }

  // Returns
  if (entry.returns) {
    lines.push(`**Returns:** ${entry.returns}`);
    lines.push("");
  }

  // Example
  if (entry.example) {
    lines.push("**Example:**");
    lines.push("");
    lines.push("```typescript");
    lines.push(entry.example);
    lines.push("```");
    lines.push("");
  }

  // Members (for classes, interfaces, enums)
  if (entry.members && entry.members.length > 0) {
    if (entry.kind === "interface") {
      lines.push("**Properties:**");
      lines.push("");
      lines.push("| Name | Type | Description |");
      lines.push("|------|------|-------------|");
      for (const member of entry.members) {
        if (member.kind === "variable") {
          const typeStr =
            member.signature?.split(": ").slice(1).join(": ") || "unknown";
          lines.push(
            `| \`${member.name}\` | \`${escapeTypeForMarkdown(typeStr)}\` | ${member.description} |`
          );
        }
      }
      lines.push("");

      const methods = entry.members.filter((m) => m.kind === "function");
      if (methods.length > 0) {
        lines.push("**Methods:**");
        lines.push("");
        for (const method of methods) {
          lines.push(
            ...generateEntryMDX(method, relativePath, github, level + 1)
          );
        }
      }
    } else if (entry.kind === "enum") {
      lines.push("**Values:**");
      lines.push("");
      for (const member of entry.members) {
        lines.push(
          `- \`${member.name}\`${member.signature ? ` = \`${member.signature}\`` : ""}`
        );
      }
      lines.push("");
    } else {
      // Class methods and properties
      const props = entry.members.filter((m) => m.kind === "variable");
      const methods = entry.members.filter((m) => m.kind === "function");

      if (props.length > 0) {
        lines.push("**Properties:**");
        lines.push("");
        lines.push("| Name | Type | Description |");
        lines.push("|------|------|-------------|");
        for (const prop of props) {
          const typeStr =
            prop.signature?.split(": ").slice(1).join(": ") || "unknown";
          lines.push(
            `| \`${prop.name}\` | \`${escapeTypeForMarkdown(typeStr)}\` | ${prop.description} |`
          );
        }
        lines.push("");
      }

      if (methods.length > 0) {
        lines.push("**Methods:**");
        lines.push("");
        for (const method of methods) {
          lines.push(
            ...generateEntryMDX(method, relativePath, github, level + 1)
          );
        }
      }
    }
  }

  lines.push("---");
  lines.push("");

  return lines;
}

// Generate index page for a package
function generateIndexMDX(
  pkg: (typeof PACKAGES_TO_DOCUMENT)[0],
  modules: DocModule[]
): string {
  const lines: string[] = [];

  lines.push(`# ${pkg.name}`);
  lines.push("");
  lines.push(pkg.description);
  lines.push("");
  lines.push("## Installation");
  lines.push("");
  lines.push("```bash");
  lines.push(`pnpm add ${pkg.name}`);
  lines.push("```");
  lines.push("");
  lines.push("## Modules");
  lines.push("");

  for (const module of modules.sort((a, b) => a.name.localeCompare(b.name))) {
    const types = module.exports.filter(
      (e) => e.kind === "interface" || e.kind === "type"
    ).length;
    const functions = module.exports.filter(
      (e) => e.kind === "function"
    ).length;
    const classes = module.exports.filter((e) => e.kind === "class").length;

    lines.push(`### [${module.name}](./${module.name})`);
    lines.push("");
    if (module.description) {
      lines.push(module.description.split("\n")[0]);
      lines.push("");
    }

    const parts: string[] = [];
    if (classes > 0) parts.push(`${classes} class${classes > 1 ? "es" : ""}`);
    if (functions > 0)
      parts.push(`${functions} function${functions > 1 ? "s" : ""}`);
    if (types > 0) parts.push(`${types} type${types > 1 ? "s" : ""}`);

    if (parts.length > 0) {
      lines.push(`*${parts.join(", ")}*`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

// Generate _meta.js for Nextra navigation
function generateMeta(modules: DocModule[]): string {
  const meta: Record<string, string> = {
    index: "Overview",
  };

  for (const module of modules.sort((a, b) => a.name.localeCompare(b.name))) {
    // Rename "index" to "exports" to avoid conflict with overview
    const key = module.name === "index" ? "exports" : module.name;
    // Capitalize first letter for display
    const displayName =
      module.name === "index"
        ? "Exports"
        : module.name.charAt(0).toUpperCase() + module.name.slice(1);
    meta[key] = displayName;
  }

  return `export default ${JSON.stringify(meta, null, 2)};`;
}

// Remove directory recursively
function rmdir(dir: string): void {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      rmdir(fullPath);
    } else {
      fs.unlinkSync(fullPath);
    }
  }
  fs.rmdirSync(dir);
}

// Main function
async function main() {
  console.log("🔍 Generating SDK documentation from TypeScript sources...\n");

  // Clear old SDK docs
  const sdkPath = path.resolve(process.cwd(), "docs/content/sdk");
  if (fs.existsSync(sdkPath)) {
    console.log("🗑️  Removing old SDK documentation...");
    rmdir(sdkPath);
  }
  fs.mkdirSync(sdkPath, { recursive: true });

  const allPackages: { name: string; description: string; path: string }[] = [];

  for (const pkg of PACKAGES_TO_DOCUMENT) {
    console.log(`📦 Processing ${pkg.name}...`);

    const srcPath = path.resolve(process.cwd(), pkg.path);
    const outputPath = path.resolve(process.cwd(), pkg.outputPath);

    // Find all TypeScript files
    const files: string[] = [];
    function findTsFiles(dir: string) {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (
          entry.isDirectory() &&
          !entry.name.startsWith("_") &&
          entry.name !== "node_modules"
        ) {
          findTsFiles(fullPath);
        } else if (
          entry.isFile() &&
          entry.name.endsWith(".ts") &&
          !entry.name.endsWith(".d.ts") &&
          !entry.name.endsWith(".test.ts") &&
          !entry.name.endsWith(".spec.ts")
        ) {
          files.push(fullPath);
        }
      }
    }
    findTsFiles(srcPath);

    if (files.length === 0) {
      console.log(`  ⚠️  No TypeScript files found in ${srcPath}`);
      continue;
    }

    // Create TypeScript program
    const program = ts.createProgram(files, {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      strict: true,
      skipLibCheck: true,
      noEmit: true,
    });

    const checker = program.getTypeChecker();
    const modules: DocModule[] = [];

    // Process each file
    for (const file of files) {
      const sourceFile = program.getSourceFile(file);
      if (!sourceFile) continue;

      const module = processSourceFile(sourceFile, checker);
      if (module.exports.length > 0) {
        modules.push(module);
        console.log(`  ✓ ${module.name}: ${module.exports.length} exports`);
      }
    }

    if (modules.length === 0) {
      console.log(`  ⚠️  No exports found in ${pkg.name}`);
      continue;
    }

    // Create output directory
    fs.mkdirSync(outputPath, { recursive: true });

    // Generate MDX files
    for (const module of modules) {
      const mdxContent = generateModuleMDX(module, pkg);
      // Rename "index" modules to "exports" to avoid conflict with overview index.mdx
      const fileName = module.name === "index" ? "exports" : module.name;
      const outputFile = path.join(outputPath, `${fileName}.mdx`);
      fs.writeFileSync(outputFile, mdxContent);
    }

    // Generate index and meta files
    fs.writeFileSync(
      path.join(outputPath, "index.mdx"),
      generateIndexMDX(pkg, modules)
    );
    fs.writeFileSync(path.join(outputPath, "_meta.js"), generateMeta(modules));

    allPackages.push({
      name: pkg.name,
      description: pkg.description,
      path: pkg.outputPath.replace("docs/content/sdk/", ""),
    });

    console.log(`  📝 Generated ${modules.length + 2} files\n`);
  }

  // Generate top-level SDK index
  const sdkIndex = `# SDK Reference

This section contains auto-generated API documentation for the VibeX framework packages.

## Packages

${allPackages
  .map(
    (pkg) => `### [${pkg.name}](./${pkg.path}/)

${pkg.description}
`
  )
  .join("\n")}

---

*Documentation auto-generated from TypeScript source code with TSDoc comments.*
`;

  fs.writeFileSync(path.join(sdkPath, "index.mdx"), sdkIndex);

  // Generate SDK meta
  const sdkMeta: Record<string, string> = {
    index: "Overview",
  };
  for (const pkg of allPackages) {
    sdkMeta[pkg.path] = pkg.name;
  }
  fs.writeFileSync(
    path.join(sdkPath, "_meta.js"),
    `export default ${JSON.stringify(sdkMeta, null, 2)};`
  );

  console.log("✅ SDK documentation generated successfully!");
}

main().catch(console.error);
