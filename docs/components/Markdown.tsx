"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vscDarkPlus,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface MarkdownProps {
  children: string;
  className?: string;
}

const CodeBlock = ({
  language,
  children,
}: {
  language?: string;
  children: string;
}) => {
  const [copied, setCopied] = React.useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3">
      {language && (
        <div className="absolute top-0 left-0 px-2 py-0.5 text-xs text-muted-foreground bg-muted/80 rounded-tl-md rounded-br-md font-mono">
          {language}
        </div>
      )}
      <SyntaxHighlighter
        language={language || "text"}
        style={isDark ? vscDarkPlus : oneLight}
        wrapLongLines
        customStyle={{
          margin: 0,
          borderRadius: "0.5rem",
          fontSize: "0.8125rem",
          background: isDark ? "#1e1e1e" : "#fafafa",
          paddingTop: language ? "1.75rem" : "1rem",
        }}
      >
        {children}
      </SyntaxHighlighter>
      <button
        onClick={handleCopy}
        className={cn(
          "absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity",
          isDark
            ? "bg-zinc-700 hover:bg-zinc-600"
            : "bg-zinc-200 hover:bg-zinc-300"
        )}
        aria-label="Copy code"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy
            className={cn(
              "h-3.5 w-3.5",
              isDark ? "text-zinc-300" : "text-zinc-600"
            )}
          />
        )}
      </button>
    </div>
  );
};

const InlineCode = ({ children }: { children: React.ReactNode }) => (
  <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-violet-600 dark:text-violet-400">
    {children}
  </code>
);

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      components={{
        code({ inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || "");
          const language = match?.[1];
          const codeContent = String(children).replace(/\n$/, "");

          if (inline) {
            return <InlineCode>{children}</InlineCode>;
          }

          return <CodeBlock language={language}>{codeContent}</CodeBlock>;
        },
        a({ children, ...props }: any) {
          return (
            <a
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 dark:text-violet-400 hover:underline"
              {...props}
            >
              {children}
            </a>
          );
        },
        img({ ...props }: any) {
          return (
            <img
              className="max-w-full h-auto rounded-lg my-4"
              alt={props.alt || "image"}
              {...props}
            />
          );
        },
        table({ children, ...props }: any) {
          return (
            <div className="my-4 overflow-x-auto rounded-lg border border-border">
              <table
                className="min-w-full divide-y divide-border"
                {...props}
              >
                {children}
              </table>
            </div>
          );
        },
        thead({ children, ...props }: any) {
          return (
            <thead className="bg-muted/50" {...props}>
              {children}
            </thead>
          );
        },
        th({ children, ...props }: any) {
          return (
            <th
              className="px-3 py-2 text-left text-xs font-semibold text-foreground"
              {...props}
            >
              {children}
            </th>
          );
        },
        td({ children, ...props }: any) {
          return (
            <td
              className="px-3 py-2 text-sm border-t border-border"
              {...props}
            >
              {children}
            </td>
          );
        },
        blockquote({ children, ...props }: any) {
          return (
            <blockquote
              className="border-l-3 border-violet-500/50 pl-4 italic my-4 text-muted-foreground"
              {...props}
            >
              {children}
            </blockquote>
          );
        },
        ul({ children, ...props }: any) {
          return (
            <ul className="list-disc list-outside ml-4 my-2 space-y-1" {...props}>
              {children}
            </ul>
          );
        },
        ol({ children, ...props }: any) {
          return (
            <ol
              className="list-decimal list-outside ml-4 my-2 space-y-1"
              {...props}
            >
              {children}
            </ol>
          );
        },
        li({ children, ...props }: any) {
          return (
            <li className="text-sm leading-relaxed" {...props}>
              {children}
            </li>
          );
        },
        p({ children, ...props }: any) {
          // Use div to avoid hydration errors when code blocks are inside
          return (
            <div className="my-2 leading-relaxed" {...props}>
              {children}
            </div>
          );
        },
        h1({ children, ...props }: any) {
          return (
            <h1 className="text-xl font-bold mt-6 mb-3 text-foreground" {...props}>
              {children}
            </h1>
          );
        },
        h2({ children, ...props }: any) {
          return (
            <h2 className="text-lg font-bold mt-5 mb-2 text-foreground" {...props}>
              {children}
            </h2>
          );
        },
        h3({ children, ...props }: any) {
          return (
            <h3 className="text-base font-semibold mt-4 mb-2 text-foreground" {...props}>
              {children}
            </h3>
          );
        },
        h4({ children, ...props }: any) {
          return (
            <h4 className="text-sm font-semibold mt-3 mb-1 text-foreground" {...props}>
              {children}
            </h4>
          );
        },
        hr({ ...props }: any) {
          return <hr className="my-4 border-border" {...props} />;
        },
        strong({ children, ...props }: any) {
          return (
            <strong className="font-semibold text-foreground" {...props}>
              {children}
            </strong>
          );
        },
        em({ children, ...props }: any) {
          return (
            <em className="italic" {...props}>
              {children}
            </em>
          );
        },
      }}
      className={cn(
        "text-sm text-foreground/90 leading-relaxed",
        className
      )}
    >
      {children}
    </ReactMarkdown>
  );
}

