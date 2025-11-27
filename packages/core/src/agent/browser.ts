import { Agent, AgentContext } from "./agent";
import { AgentConfig } from "../config";
import { chromium, Browser, BrowserContext, Page } from "playwright";
import { z } from "zod";
import { tool } from "ai";

export interface BrowserAgentConfig extends AgentConfig {
  headless?: boolean;
  viewport?: { width: number; height: number };
}

export class BrowserAgent extends Agent {
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;
  private headless: boolean;
  private viewport: { width: number; height: number };

  constructor(config: BrowserAgentConfig) {
    super({
      ...config,
      name: config.name || "Browser",
      description:
        config.description ||
        "I can browse the web, interact with pages, and extract information.",
    });
    this.headless = config.headless ?? false; // Default to visible for "computer use" feel
    this.viewport = config.viewport || { width: 1280, height: 800 };

    // Register browser tools
    this.registerBrowserTools();
  }

  private registerBrowserTools() {
    this.registerTool(
      "navigate",
      tool({
        description: "Navigate to a URL",
        parameters: z.object({ url: z.string().url() }),
        execute: (async ({ url }: { url: string }) => {
          await this.ensurePage();
          await this.page!.goto(url);
          return `Navigated to ${url}`;
        }) as any,
      } as any)
    );

    this.registerTool(
      "click",
      tool({
        description: "Click an element specified by a selector",
        parameters: z.object({ selector: z.string() }),
        execute: (async ({ selector }: { selector: string }) => {
          await this.ensurePage();
          await this.page!.click(selector);
          return `Clicked element: ${selector}`;
        }) as any,
      } as any)
    );

    this.registerTool(
      "type",
      tool({
        description: "Type text into an element",
        parameters: z.object({ selector: z.string(), text: z.string() }),
        execute: (async ({ selector, text }: { selector: string; text: string }) => {
          await this.ensurePage();
          await this.page!.fill(selector, text);
          return `Typed "${text}" into ${selector}`;
        }) as any,
      } as any)
    );

    this.registerTool(
      "screenshot",
      tool({
        description: "Take a screenshot of the current page",
        parameters: z.object({ fullPage: z.boolean().optional() }),
        execute: (async ({ fullPage }: { fullPage?: boolean }) => {
          await this.ensurePage();
          const buffer = await this.page!.screenshot({ fullPage });
          return {
            type: "image",
            image: buffer.toString("base64"),
          };
        }) as any,
      } as any)
    );

    this.registerTool(
      "get_content",
      tool({
        description: "Get the text content of the page",
        parameters: z.object({}),
        execute: (async () => {
          await this.ensurePage();
          const content = await this.page!.content();
          // Basic cleanup could go here
          return content.slice(0, 10000) + "... (truncated)";
        }) as any,
      } as any)
    );

    this.registerTool(
      "evaluate",
      tool({
        description: "Evaluate JavaScript on the page",
        parameters: z.object({ script: z.string() }),
        execute: (async ({ script }: { script: string }) => {
          await this.ensurePage();
          const result = await this.page!.evaluate(script);
          return JSON.stringify(result);
        }) as any,
      } as any)
    );
  }

  private async ensurePage() {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: this.headless });
    }
    if (!this.context) {
      this.context = await this.browser.newContext({ viewport: this.viewport });
    }
    if (!this.page) {
      this.page = await this.context.newPage();
    }
  }

  public async cleanup() {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();

    this.page = undefined;
    this.context = undefined;
    this.browser = undefined;
  }

  public getSystemPrompt(context?: AgentContext): string {
    const base = super.getSystemPrompt(context);
    return `${base}
You are a browser automation agent. You can control a real web browser to browse the internet, interact with web pages, and extract data.
Always verify your actions by checking the page content or taking screenshots if necessary.
`;
  }
}
