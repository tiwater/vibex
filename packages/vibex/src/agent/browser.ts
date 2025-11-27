/**
 * BrowserAgent - Playwright-based browser automation agent
 */

import { Agent, AgentContext } from "./agent";
import { AgentConfig } from "../config";
import { chromium, Browser, BrowserContext, Page } from "playwright";
import { z } from "zod";

export interface BrowserAgentConfig extends AgentConfig {
  headless?: boolean;
  viewport?: { width: number; height: number };
}

// Tool definition type for browser tools
interface BrowserTool {
  description: string;
  parameters: z.ZodSchema;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export class BrowserAgent extends Agent {
  private browser?: Browser;
  private browserContext?: BrowserContext;
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
    this.headless = config.headless ?? false;
    this.viewport = config.viewport || { width: 1280, height: 800 };

    this.registerBrowserTools();
  }

  private registerBrowserTools() {
    const navigateTool: BrowserTool = {
      description: "Navigate to a URL",
      parameters: z.object({ url: z.string().url() }),
      execute: async (args) => {
        const { url } = args as { url: string };
        await this.ensurePage();
        await this.page!.goto(url);
        return `Navigated to ${url}`;
      },
    };
    this.registerTool("navigate", navigateTool);

    const clickTool: BrowserTool = {
      description: "Click an element specified by a selector",
      parameters: z.object({ selector: z.string() }),
      execute: async (args) => {
        const { selector } = args as { selector: string };
        await this.ensurePage();
        await this.page!.click(selector);
        return `Clicked element: ${selector}`;
      },
    };
    this.registerTool("click", clickTool);

    const typeTool: BrowserTool = {
      description: "Type text into an element",
      parameters: z.object({ selector: z.string(), text: z.string() }),
      execute: async (args) => {
        const { selector, text } = args as { selector: string; text: string };
        await this.ensurePage();
        await this.page!.fill(selector, text);
        return `Typed "${text}" into ${selector}`;
      },
    };
    this.registerTool("type", typeTool);

    const screenshotTool: BrowserTool = {
      description: "Take a screenshot of the current page",
      parameters: z.object({ fullPage: z.boolean().optional() }),
      execute: async (args) => {
        const { fullPage } = args as { fullPage?: boolean };
        await this.ensurePage();
        const buffer = await this.page!.screenshot({ fullPage });
        return {
          type: "image",
          image: buffer.toString("base64"),
        };
      },
    };
    this.registerTool("screenshot", screenshotTool);

    const getContentTool: BrowserTool = {
      description: "Get the text content of the page",
      parameters: z.object({}),
      execute: async () => {
        await this.ensurePage();
        const content = await this.page!.content();
        return content.slice(0, 10000) + "... (truncated)";
      },
    };
    this.registerTool("get_content", getContentTool);

    const evaluateTool: BrowserTool = {
      description: "Evaluate JavaScript on the page",
      parameters: z.object({ script: z.string() }),
      execute: async (args) => {
        const { script } = args as { script: string };
        await this.ensurePage();
        const result = await this.page!.evaluate(script);
        return JSON.stringify(result);
      },
    };
    this.registerTool("evaluate", evaluateTool);
  }

  private async ensurePage() {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: this.headless });
    }
    if (!this.browserContext) {
      this.browserContext = await this.browser.newContext({ viewport: this.viewport });
    }
    if (!this.page) {
      this.page = await this.browserContext.newPage();
    }
  }

  public async cleanup() {
    if (this.page) await this.page.close();
    if (this.browserContext) await this.browserContext.close();
    if (this.browser) await this.browser.close();

    this.page = undefined;
    this.browserContext = undefined;
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
