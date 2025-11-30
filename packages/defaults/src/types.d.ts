/**
 * Type declarations for non-TypeScript imports
 */

declare module "*.yaml" {
  const content: Record<string, unknown>;
  export default content;
}

declare module "*.md" {
  const content: string;
  export default content;
}
